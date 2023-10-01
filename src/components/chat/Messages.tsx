// This component wil display the chat messages

import { trpc } from '@/app/_trpc/client';
import { INFINITE_QUERY_LIMIT } from '@/config/infinite-query';
import { Loader2, MessageSquare } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import Message from './Message';
import { useContext } from 'react';
import { ChatContext } from './ChatContext';

interface MessagesProps {
  fileId: string;
}

const ChatMessages = ({ fileId }: MessagesProps) => {
  const { isLoading: isAiThinking } = useContext(ChatContext);
  // get the messages
  const { data, isLoading, fetchNextPage } =
    trpc.getFileMessages.useInfiniteQuery(
      {
        fileId,
        limit: INFINITE_QUERY_LIMIT,
      },
      {
        getNextPageParam: (lastPage) => lastPage?.nextCursor,
        keepPreviousData: true,
      }
    );

  const messages = data?.pages.flatMap((page) => page.messages);

  const loadingMessage = {
    createdAt: new Date().toISOString(),
    id: 'loading-message',
    isUserMessage: false,
    text: (
      <span className='flex h-full items-center justify-center'>
        <Loader2 className='w-4 h-4 text-blue-500 animate-spin' />
      </span>
    ),
  };

  // combined messages
  const combindedMessages = [
    ...(isAiThinking ? [loadingMessage] : []),
    ...(messages ?? []),
  ];

  return (
    <div className='flex m-h-[calc(100vh-3.5rem-7rem)] border-zinc-200 flex-1 flex-col-reverse gap-4 p-3 overflow-y-auto scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch'>
      {/* messages */}
      {combindedMessages && combindedMessages.length > 0 ? (
        combindedMessages.map((message, i) => {
          const isNextMessageSamePerson =
            combindedMessages[i - 1]?.isUserMessage ===
            combindedMessages[i]?.isUserMessage;

          if (i === combindedMessages.length - 1) {
            return (
              <Message
                message={message}
                key={message.id}
                isNextMessageSamePerson={isNextMessageSamePerson}
              />
            );
          } else
            return (
              <Message
                message={message}
                key={message.id}
                isNextMessageSamePerson={isNextMessageSamePerson}
              />
            );
        })
      ) : isLoading ? (
        // loading
        <div className='w-full flex flex-col gap-2'>
          <Skeleton className='h-16' />
          <Skeleton className='h-16' />
          <Skeleton className='h-16' />
          <Skeleton className='h-16' />
        </div>
      ) : (
        // No messages
        <div className='flex-1 flex flex-col items-center justify-center gap-2'>
          <MessageSquare className='w-8 h-8 text-blue-500' />
          <h3 className='font-semibold font-xl'>You&apos;re all set!</h3>
          <p className='text-zinc-500 text-sm'>
            Ask your first question to get started.
          </p>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
