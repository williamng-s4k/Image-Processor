
export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'original';

export type ResizeMode = 'original' | 'percentage' | 'fixed-width' | 'fixed-height';

export interface ProcessingOptions {
  format: ImageFormat;
  quality: number; // 0.1 to 1.0
  resizeMode: ResizeMode;
  resizeValue: number; // Percentage (1-100) or pixels
  maintainAspectRatio: boolean;
}

export type ProcessStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  status: ProcessStatus;
  processedUrl?: string;
  processedFormat?: ImageFormat;
  processedSize?: number;
  processedWidth?: number;
  processedHeight?: number;
  error?: string;
}

// Fix: Added PdfProcessingOptions which was missing and causing errors in utils/pdfUtils.ts
export interface PdfProcessingOptions {
  // Add placeholder for PDF specific options
}

// Fix: Added PdfItem which was missing and causing errors in utils/pdfUtils.ts and components/PdfItem.tsx
export interface PdfItem {
  id: string;
  file: File;
  originalSize: number;
  status: ProcessStatus;
  processedUrl?: string;
  processedSize?: number;
  error?: string;
}
