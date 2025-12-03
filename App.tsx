import React, { useState, useCallback, useEffect } from 'react';
import { Layers, Download, Trash2, Plus } from 'lucide-react';
import SettingsPanel from './components/SettingsPanel';
import Dropzone from './components/Dropzone';
import ImageItem from './components/ImageItem';
import { ProcessingOptions, ImageItem as ImageItemType } from './types';
import { DEFAULT_OPTIONS } from './constants';
import { generateId, processSingleImage } from './utils/imageUtils';

const App: React.FC = () => {
  const [files, setFiles] = useState<ImageItemType[]>([]);
  const [options, setOptions] = useState<ProcessingOptions>(DEFAULT_OPTIONS);
  const [isProcessing, setIsProcessing] = useState(false);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        URL.revokeObjectURL(file.previewUrl);
        if (file.processedUrl) URL.revokeObjectURL(file.processedUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on unmount for all, technically individual removal handles its own.

  const handleFilesDropped = useCallback(async (newFiles: File[]) => {
    const newItems: ImageItemType[] = [];
    
    for (const file of newFiles) {
      // Create preview immediately
      const previewUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = previewUrl;
      
      // Wait for load to get dims
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // Continue anyway, it will fail later gracefully
      });

      newItems.push({
        id: generateId(),
        file,
        previewUrl,
        originalSize: file.size,
        originalWidth: img.naturalWidth || 0,
        originalHeight: img.naturalHeight || 0,
        status: 'idle',
      });
    }

    setFiles((prev) => [...prev, ...newItems]);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
        if (fileToRemove.processedUrl) URL.revokeObjectURL(fileToRemove.processedUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleClearAll = useCallback(() => {
    files.forEach((f) => {
      URL.revokeObjectURL(f.previewUrl);
      if (f.processedUrl) URL.revokeObjectURL(f.processedUrl);
    });
    setFiles([]);
  }, [files]);

  const handleProcessAll = useCallback(async () => {
    setIsProcessing(true);
    
    // Process sequentially to avoid browser UI freeze on large queues
    // For even better perf, we could chunk this or use web workers, 
    // but for < 50 images sequential async is usually fine.
    
    // We update state for each image so the user sees progress
    const itemsToProcess = files.filter(f => f.status !== 'completed');

    for (const item of itemsToProcess) {
      // Update status to processing
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'processing' } : f));

      // Actual processing
      const result = await processSingleImage(item, options);
      
      // Update result
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, ...result } : f));
    }

    setIsProcessing(false);
  }, [files, options]);

  // Download logic for "Download All" (Not true zip, just loop click)
  const handleDownloadAll = useCallback(() => {
    files.forEach((file) => {
      if (file.status === 'completed' && file.processedUrl) {
        const link = document.createElement('a');
        link.href = file.processedUrl;
        
        // Determine extension
        let ext = 'jpg';
        if (options.format === 'image/png') ext = 'png';
        if (options.format === 'image/webp') ext = 'webp';
        
        // Remove old extension from name if possible
        const baseName = file.file.name.substring(0, file.file.name.lastIndexOf('.')) || file.file.name;
        link.download = `${baseName}_optimized.${ext}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  }, [files, options.format]);

  const stats = {
    total: files.length,
    completed: files.filter(f => f.status === 'completed').length,
    savedBytes: files.reduce((acc, curr) => {
        if (curr.status === 'completed' && curr.processedSize) {
            return acc + (curr.originalSize - curr.processedSize);
        }
        return acc;
    }, 0)
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      
      {/* Sidebar Options */}
      <SettingsPanel
        options={options}
        onOptionsChange={setOptions}
        disabled={isProcessing || files.length === 0}
        onProcess={handleProcessAll}
        isProcessing={isProcessing}
        hasFiles={files.length > 0}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-6 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                OptiBatch
              </h1>
              <p className="text-xs text-slate-500 font-medium">Bulk Image Processor</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {stats.completed > 0 && (
                <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-400 mr-4">
                    <span>Processed: <span className="text-white">{stats.completed}/{stats.total}</span></span>
                    {stats.savedBytes > 0 && (
                        <span>Saved: <span className="text-green-400">{(stats.savedBytes / 1024 / 1024).toFixed(2)} MB</span></span>
                    )}
                </div>
             )}
             
            {stats.completed > 0 && (
                <button
                onClick={handleDownloadAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 hover:border-slate-600 transition-all text-sm font-medium"
                >
                <Download className="w-4 h-4" />
                Download All
                </button>
            )}

            {files.length > 0 && (
                <button
                onClick={handleClearAll}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium disabled:opacity-50"
                >
                <Trash2 className="w-4 h-4" />
                Clear
                </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {files.length === 0 ? (
            <div className="h-full flex flex-col justify-center max-w-2xl mx-auto">
              <Dropzone onFilesDropped={handleFilesDropped} />
              
              <div className="mt-12 grid grid-cols-3 gap-6">
                 <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                        <span className="text-blue-400 font-bold text-lg">1</span>
                    </div>
                    <h3 className="font-medium text-slate-200 mb-1">Upload</h3>
                    <p className="text-xs text-slate-500">Drag & drop multiple images (JPG, PNG, WebP).</p>
                 </div>
                 <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
                        <span className="text-purple-400 font-bold text-lg">2</span>
                    </div>
                    <h3 className="font-medium text-slate-200 mb-1">Configure</h3>
                    <p className="text-xs text-slate-500">Set size, format, and quality options in the sidebar.</p>
                 </div>
                 <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
                        <span className="text-green-400 font-bold text-lg">3</span>
                    </div>
                    <h3 className="font-medium text-slate-200 mb-1">Process</h3>
                    <p className="text-xs text-slate-500">Click process and download your optimized images.</p>
                 </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4 pb-20">
               {/* Add more bar */}
               <div className="flex justify-end mb-4">
                  <Dropzone 
                    onFilesDropped={handleFilesDropped} 
                    isCompact 
                    className="w-full h-24"
                  />
               </div>

               <div className="space-y-3">
                {files.map((file) => (
                    <ImageItem
                    key={file.id}
                    item={file}
                    onRemove={handleRemoveFile}
                    />
                ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
