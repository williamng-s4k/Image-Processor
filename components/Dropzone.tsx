import React, { useCallback, useState } from 'react';
import { Upload, FileImage } from 'lucide-react';

interface DropzoneProps {
  onFilesDropped: (files: File[]) => void;
  className?: string;
  isCompact?: boolean;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFilesDropped, className = '', isCompact = false }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const isValidFile = (file: File) => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    
    // Image mode
    return type.startsWith('image/') || 
           name.endsWith('.heic') || 
           name.endsWith('.heif');
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter(isValidFile);
      if (files.length > 0) {
        onFilesDropped(files);
      }
    },
    [onFilesDropped]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files).filter(isValidFile);
        onFilesDropped(files);
      }
      // Reset value so same files can be selected again
      e.target.value = '';
    },
    [onFilesDropped]
  );

  const acceptString = 'image/*,.heic,.heif';

  if (isCompact) {
     return (
        <div
            className={`relative flex items-center justify-center border-2 border-dashed rounded-lg transition-colors cursor-pointer p-4 ${
            isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
            } ${className}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                type="file"
                multiple
                accept={acceptString}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileInput}
            />
            <div className="flex flex-col items-center text-center space-y-2">
                <Upload className="w-6 h-6 text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">Add Images</span>
            </div>
        </div>
     )
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center w-full h-full min-h-[300px] border-2 border-dashed rounded-xl transition-all cursor-pointer ${
        isDragging
          ? 'border-blue-500 bg-blue-500/10 scale-[0.99]'
          : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/30'
      } ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept={acceptString}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileInput}
      />
      <div className="flex flex-col items-center text-center space-y-4 p-8 pointer-events-none">
        <div className={`p-4 rounded-full bg-slate-800/50 ${isDragging ? 'text-blue-400' : 'text-slate-400'}`}>
            {isDragging ? <Upload className="w-12 h-12" /> : (
              <div className="relative">
                 <FileImage className="w-12 h-12" />
              </div>
            )}
        </div>
        <div className="space-y-1">
          <p className="text-xl font-semibold text-slate-200">
            {isDragging ? 'Drop files here' : 'Drag & drop files'}
          </p>
          <p className="text-sm text-slate-400">
            Images (JPG, PNG, WebP, HEIC)
          </p>
        </div>
        <div className="pt-4 flex flex-wrap justify-center gap-2">
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-400">JPG</span>
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-400">PNG</span>
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-400">WebP</span>
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-400">HEIC</span>
        </div>
      </div>
    </div>
  );
};

export default Dropzone;