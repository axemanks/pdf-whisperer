// uploadthing - core.ts - middleware that runs before the file is uploaded

import { db } from '@/db';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import {PDFLoader} from 'langchain/document_loaders/fs/pdf'
import { getPineconeClient, } from '@/lib/pinecone';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';


const f = createUploadthing();

const auth = (req: Request) => ({ id: 'fakeId' }); // Fake auth function

export const ourFileRouter = {
  pdfUploader: f({ pdf: { maxFileSize: '4MB' } })
    .middleware(async ({ req }) => {
      // kinde auth
      const { getUser } = getKindeServerSession();
      const user = getUser();
      if (!user || !user.id) throw new Error('Unauthorized');

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const createdFile = await db.file.create({
        data: {
          key: file.key,
          name: file.name,
          userId: metadata.userId,
          url: `https://uploadthing-prod.s3.us-west-2.amazonaws.com/${file.key}`, // fix for file.url timing out
          uploadStatus: 'PROCESSING',
        },
      });

      // index the file
      try {
        // get the file
        const response = await fetch(`https://uploadthing-prod.s3.us-west-2.amazonaws.com/${file.key}`)
        // convert to blob
        const blob = await response.blob()
        // load pdf file into memory
        const loader = new PDFLoader(blob)
        // extract text
        const pageLevelDocs = await loader.load()
        // get number of pages
        const pageAmt = pageLevelDocs.length
        // vectorize and index the entire document
        const pinecone = await getPineconeClient()
        const pineconeIndex = pinecone.Index("pdf-whisperer")

        const embeddings = new OpenAIEmbeddings({
          openAIApiKey: process.env.OPENAI_API_KEY,
        })
        // upload to pinecone
        await PineconeStore.fromDocuments(
          pageLevelDocs, 
          embeddings, 
          {
            pineconeIndex,
            namespace: createdFile.id,
          }
        )
        // Call db to update to SUCCESS state  
        await db.file.update({
          data: {
            uploadStatus: 'SUCCESS',
          },
          where: {
            id: createdFile.id,
          }
        })
      } catch (err) {
        console.log("Error when uploading to pinecone:",err)
        // if error update to FAILED
        await db.file.update({
          data: {
            uploadStatus: 'FAILED',
          },
          where: {
            id: createdFile.id,
          }
        })
      }

    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
