// the pdf renderer component
'use client';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import { Document, Page, pdfjs } from 'react-pdf';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Divide,
  Loader2,
  RotateCw,
  Search,
} from 'lucide-react';
import { useToast } from './ui/use-toast';
import { useResizeDetector } from 'react-resize-detector';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Simplebar from 'simplebar-react';
import PdfFullScreen from './PdfFullScreen';


pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

interface PdfRendererProps {
  url: string;
}

const PdfRenderer = ({ url }: PdfRendererProps) => {
  const { toast } = useToast();
  const { width, ref } = useResizeDetector();
  const [numPages, setNumPages] = useState<number>();
  const [currPage, setCurrPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [renderedScale, setRenderedScale] = useState<number | null>(null); // track the currently rendered scale

  const isLoading = renderedScale !== scale; // if the rendered scale is not the same as the current scale, then we are loading

  // Checks that the page number is valid - between 1 and numPages
  const CustomPageValidator = z.object({
    page: z
      .string()
      .refine((num) => Number(num) > 0 && Number(num) <= numPages!),
  });

  // Infer the type of the schema
  type TCustomPageValidator = z.infer<typeof CustomPageValidator>;

  // Hook form resolver to zodresolver
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<TCustomPageValidator>({
    defaultValues: {
      page: '1',
    },
    resolver: zodResolver(CustomPageValidator),
  });

  // Handle Page Submit
  const handlePageSubmit = ({ page }: TCustomPageValidator) => {
    setCurrPage(Number(page));
    setValue('page', String(page));
  };

  return (
    <div className='w-full bg-white rounded-md shadow flex flex-col items-center'>
      {/* Top bar options */}
      <div className='h-14 w-full border-b border-zinc-200 flex items-center justify-between px-2'>
        <div className='flex items-center gap-1.5'>
          {/* Previous page button */}
          <Button
            disabled={currPage === 1}
            onClick={() => {
              setCurrPage((prev) => (prev - 1 > 1 ? prev - 1 : 1));
              setValue('page', String(currPage - 1));
            }}
            aria-label='previous page'
            variant={'ghost'}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>

          {/* Page input */}
          <div className='flex items-center gap-1.5'>
            <Input
              {...register('page')}
              className={cn(
                'w-12 h-8',
                errors.page && 'focus-visible:ring-red-500'
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit(handlePageSubmit)();
                }
              }}
            />
            <p className='text-zinc-700 text-sm space-x-1 '>
              <span>/</span>
              <span>{numPages ?? 'x'}</span>
            </p>
          </div>

          {/* Next page button */}
          <Button
            disabled={numPages === undefined || currPage === numPages}
            onClick={() => {
              setCurrPage((prev) =>
                prev + 1 > numPages! ? numPages! : prev + 1
              );
              setValue('page', String(currPage + 1));
            }}
            aria-label='next page'
            variant={'ghost'}
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
          
          {/* Scale and rotate buttons */}
        <div className='space-x-2'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button

                className='gap-1.5'
                aria-label='zoom'
                variant={'ghost'}
              >
                <Search className='h-4 w-4' />
                {scale * 100}%<ChevronDown className='h-4 w-4 opacity-50' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setScale(1)}>
                100%
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setScale(1.5)}>
                150%
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setScale(2)}>
                200%
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setScale(2.5)}>
                250%
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Rotate button */}
          <Button
            onClick={() => setRotation((prev) => prev + 90)}
            aria-label='rotate 90 degrees'
            variant={'ghost'}
          >
            <RotateCw className='h-4 w-4' />
          </Button>
          {/* FullScreen Button */}
          <PdfFullScreen fileUrl={url} />
        </div>
      </div>

      {/* pdf render */}
      <div className='flex-1 w-full max-h-screen'>
        <Simplebar
          autoHide={false}
          className='max-h-[calc(100vh-10rem)]'
        >
          <div ref={ref}>
            <Document
              // when doc loads, it will update the numPages state
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={
                <div className='flex justify-center'>
                  <Loader2 className='my-24 h-6 w-6 animate-spin' />
                </div>
              }
              onLoadError={() => {
                toast({
                  title: 'Error loading PDF',
                  description: 'Please try again',
                  variant: 'destructive',
                });
              }}
              className='max-h-full'
              file={url}
            >
              {/* Conditional Render - to keep the last page until new page with different scale is loaded*/}
              {isLoading && renderedScale ?<Page
                rotate={rotation}
                scale={scale}
                width={width ? width : 1}
                pageNumber={currPage}
                key={"@" + renderedScale}
              />:null}
              {/* Render  */}
              <Page
              className={cn(isLoading ? 'hidden':'')}
                rotate={rotation}
                scale={scale}
                width={width ? width : 1}
                pageNumber={currPage}
                key={"@" + scale}
                loading={
                 <div className='flex justify-center'>
                <Loader2 className='my-24 h-6 w-6 animate-spin' />
                 </div>
                }
                // when rendered set scale
                onRenderSuccess={() => {
                  setRenderedScale(scale);
                }}
              />
            </Document>
          </div>
        </Simplebar>
      </div>
    </div>
  );
};

export default PdfRenderer;
