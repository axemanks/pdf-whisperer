// Context provider for chat

import { createContext, useRef, useState } from 'react';
import { useToast } from '../ui/use-toast';
import { useMutation } from '@tanstack/react-query';
import { trpc } from '@/app/_trpc/client';
import { INFINITE_QUERY_LIMIT } from '@/config/infinite-query';

type StreamResponse = {
  addMessage: () => void;
  message: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
};

export const ChatContext = createContext<StreamResponse>({
  // define fallback values
  addMessage: () => {},
  message: '',
  handleInputChange: () => {},
  isLoading: false,
});

interface Props {
  fileId: string;
  children: React.ReactNode;
}

export const ChatContextProvider = ({ fileId, children }: Props) => {
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const utils = trpc.useContext();
  const { toast } = useToast();
  const backupMessage = useRef<string>('');

  // stream
  const { mutate: sendMessage } = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      const response = await fetch('/api/message', {
        method: 'POST',
        body: JSON.stringify({
          fileId,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      return response.body;
    },

    onMutate: async ({ message }) => {
      // optimistic update
      backupMessage.current = message; // saves message in case of error
      setMessage(''); // clears message

      // 1 cancel outgoing request
      await utils.getFileMessages.cancel();

      // 2 snapshot previous value
      const previousMessages = utils.getFileMessages.getInfiniteData();

      // 3 optimistically update
      utils.getFileMessages.setInfiniteData(
        { fileId, limit: INFINITE_QUERY_LIMIT },
        (old) => {
          if (!old) {
            return {
              pages: [],
              pageParams: [],
            };
          }
          let newPages = [...old.pages];
          let latestPage = newPages[0]!;
          latestPage.messages = [
            {
              createdAt: new Date().toISOString(),
              id: crypto.randomUUID(),
              text: message,
              isUserMessage: true,
            },
            ...latestPage.messages,
          ];

          newPages[0] = latestPage;

          return {
            ...old,
            pages: newPages,
          };
        }
      );
      setIsLoading(true);
      return {
        previousMessages:
          previousMessages?.pages.flatMap((page) => page.messages) ?? [],
      };
    },
    // onSuccess
    onSuccess: async (stream) => {
      setIsLoading(false);
      // check for stream
      if (!stream) {
        return toast({
          title: 'There was a problem sending this message',
          description: 'Please refresh the page and try again.',
          variant: 'destructive',
        });
      }

      // read the stream
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let done = false;

      // accumulate the response
      let accResponse = '';

      // read the stream
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        // append chunk to accumulated response
        accResponse += chunkValue;
        // append chunk to acutal message
        utils.getFileMessages.setInfiniteData(
          { fileId, limit: INFINITE_QUERY_LIMIT },
          (old) => {
            if (!old) return { pages: [], pageParams: [] };
            let isAiResponseCreated = old.pages.some((page) =>
              // check for any messages that exist with 'ai-response'
              page.messages.some((message) => message.id === 'ai-response')
            );
            // Update the ai response message
            let updatedPages = old.pages.map((page) => {
              if (page === old.pages[0]) {
                // updatedMessages will hold either the current message or a new response
                let updatedMessages;
                // check if the first page has a message with 'ai-response'
                if (!isAiResponseCreated) {
                  // if not create a message with 'ai-response'
                  updatedMessages = [
                    {
                      createdAt: new Date().toISOString(),
                      id: 'ai-response',
                      text: accResponse,
                      isUserMessage: false,
                    },
                    ...page.messages,
                  ];
                } else {
                  // else add to existing message
                  updatedMessages = page.messages.map((message) => {
                    if(message.id === 'ai-response') {
                      return {
                        ...message,
                        text: accResponse
                      }
                    }
                    return message;
                  })
                }
                // only the first page will be updated
                return {
                  ...page,
                  messages: updatedMessages,
                }
              }
              // other pages will be the same
              return page;
            });
            return {...old, pages: updatedPages}
          }
        );
      }
    },
    // onError - remove optimistic update
    onError: (_, __, context) => {
      // rollback optimistic update
      setMessage(backupMessage.current);
      utils.getFileMessages.setData(
        {
          fileId,
        },
        { messages: context?.previousMessages ?? [] }
      );
    },
    // onSettled runs after error or success either, like finally
    onSettled: async () => {
      setIsLoading(false);
      // invalidate the query
      await utils.getFileMessages.invalidate({
        fileId,
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const addMessage = () => {
    sendMessage({ message });
  };

  return (
    <ChatContext.Provider
      value={{
        addMessage,
        message,
        handleInputChange,
        isLoading,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
