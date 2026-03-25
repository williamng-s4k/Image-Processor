import { PDFDocument } from 'pdf-lib';
import { PdfProcessingOptions, PdfItem } from '../types';

export const processPdf = async (
  item: PdfItem,
  options: PdfProcessingOptions
): Promise<Partial<PdfItem>> => {
  try {
    const arrayBuffer = await item.file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    // In pure JS browser environment, true image re-compression inside PDF is complex.
    // However, pdf-lib's save() with optimizations can still reduce size by 
    // removing unused objects and compressing streams.
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const processedUrl = URL.createObjectURL(blob);

    return {
      status: 'completed',
      processedUrl,
      processedSize: blob.size,
      error: undefined,
    };
  } catch (err: any) {
    console.error("PDF Processing error:", err);
    return {
      status: 'error',
      error: err.message || 'PDF optimization failed',
    };
  }
};