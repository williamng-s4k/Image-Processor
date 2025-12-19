import { ProcessingOptions, ImageItem } from '../types';
// @ts-ignore
import heic2any from 'heic2any';

export const formatBytes = (bytes: number, decimals = 1): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

export const isHeic = (file: File): boolean => {
  return file.type.toLowerCase() === 'image/heic' || 
         file.type.toLowerCase() === 'image/heif' ||
         file.name.toLowerCase().endsWith('.heic') ||
         file.name.toLowerCase().endsWith('.heif');
};

export const convertHeicToJpeg = async (file: File): Promise<File> => {
  try {
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9
    });
    
    // Handle case where it returns Blob[] (multiframe heic), just take first
    const finalBlob = Array.isArray(result) ? result[0] : result;
    
    // Create a new File object to keep the name but change extension
    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([finalBlob], newName, { type: 'image/jpeg' });
  } catch (error) {
    console.error("HEIC conversion failed", error);
    throw error;
  }
};

export const processFile = async (
  item: ImageItem,
  options: ProcessingOptions
): Promise<Partial<ImageItem>> => {
  try {
    // Standard Image Processing
    const img = await loadImage(item.previewUrl);
    
    let targetWidth = img.naturalWidth;
    let targetHeight = img.naturalHeight;

    // Calculate dimensions
    if (options.resizeMode === 'percentage') {
      const ratio = options.resizeValue / 100;
      targetWidth = Math.round(targetWidth * ratio);
      targetHeight = Math.round(targetHeight * ratio);
    } else if (options.resizeMode === 'fixed-width') {
      targetWidth = options.resizeValue;
      if (options.maintainAspectRatio) {
        const ratio = img.naturalHeight / img.naturalWidth;
        targetHeight = Math.round(targetWidth * ratio);
      }
    } else if (options.resizeMode === 'fixed-height') {
      targetHeight = options.resizeValue;
      if (options.maintainAspectRatio) {
        const ratio = img.naturalWidth / img.naturalHeight;
        targetWidth = Math.round(targetHeight * ratio);
      }
    }

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Better quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Convert to blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        options.format,
        options.quality
      );
    });

    if (!blob) {
      throw new Error('Image encoding failed');
    }

    const processedUrl = URL.createObjectURL(blob);

    return {
      status: 'completed',
      processedUrl,
      processedFormat: options.format,
      processedSize: blob.size,
      processedWidth: targetWidth,
      processedHeight: targetHeight,
      error: undefined,
    };
  } catch (err: any) {
    console.error("Processing error:", err);
    return {
      status: 'error',
      error: err.message || 'Processing failed',
    };
  }
};