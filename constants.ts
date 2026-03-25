import { ProcessingOptions } from './types';

export const DEFAULT_OPTIONS: ProcessingOptions = {
  format: 'original',
  quality: 0.8,
  resizeMode: 'original',
  resizeValue: 100,
  maintainAspectRatio: true,
};

export const SUPPORTED_FORMATS = {
  'original': 'Keep Original',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
};

export const MAX_FILE_SIZE_MB = 100;