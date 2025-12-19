import React, { useState, useCallback, useEffect } from 'react';
import { Layers, Download, Trash2, Loader2, Image as ImageIcon, CheckCircle2, TrendingDown } from 'lucide-react';
import SettingsPanel from './components/SettingsPanel';
import Dropzone from './components/Dropzone';
import ImageItem from './components/ImageItem';
import { ProcessingOptions, ImageItem as ImageItemType } from './types';
import { DEFAULT_OPTIONS } from './constants';
import { generateId, processFile, isHeic, convertHeicToJpeg } from './utils/imageUtils';
// @ts-ignore
import JSZip from 'jszip';

const App: React.FC = () => {
  const [files, setFiles] = useState<ImageItemType[]>([]);
  const [options, setOptions] = useState<ProcessingOptions>(DEFAULT_OPTIONS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        URL.revokeObjectURL(file.previewUrl);
        if (file.processedUrl) URL.revokeObjectURL(file.processedUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleFilesDropped = useCallback(async (newFiles: File[]) => {
    setUploadProgress({ current: 0, total: newFiles.length });
    let processedCount = 0;

    // Process one by one to avoid blocking and update UI incrementally
    for (const file of newFiles) {
      try {
          let fileToProcess = file;
          let previewUrl = '';
          let width = 0;
          let height = 0;

          // Image Handling
          if (isHeic(file)) {
            try {
                fileToProcess = await convertHeicToJpeg(file);
                previewUrl = URL.createObjectURL(fileToProcess);
            } catch (e) {
                console.error(`Failed to convert HEIC file: ${file.name}`, e);
                continue; 
            }
          } else {
            previewUrl = URL.createObjectURL(fileToProcess);
          }

          // Get dimensions
          try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const i = new Image();
                i.onload = () => resolve(i);
                i.onerror = reject;
                i.src = previewUrl;
            });
            width = img.naturalWidth;
            height = img.naturalHeight;
          } catch (e) {
              // If image fails to load, we might still process it blindly, 
              // but previewUrl is likely bad.
              console.warn("Failed to load image for dimensions", e);
          }

          const newItem: ImageItemType = {
            id: generateId(),
            file: fileToProcess,
            previewUrl,
            originalSize: file.size,
            originalWidth: width,
            originalHeight: height,
            status: 'idle',
          };
          
          setFiles((prev) => [...prev, newItem]);

      } catch (err) {
          console.error("Error processing dropped file", err);
      } finally {
        processedCount++;
        setUploadProgress({ current: processedCount, total: newFiles.length });
      }
    }

    setTimeout(() => {
        setUploadProgress(null);
    }, 500);
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
    
    // Default: process only idle or error files
    let itemsToProcess = files.filter(f => f.status === 'idle' || f.status === 'error');

    // If there are no idle/error files but we have files, it means the user wants to Re-process everything
    // (e.g. they changed settings after a batch was completed)
    if (itemsToProcess.length === 0 && files.length > 0) {
        itemsToProcess = files;
    }

    for (const item of itemsToProcess) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'processing', error: undefined } : f));

      let result: Partial<ImageItemType>;

      try {
         result = await processFile(item, options);
      } catch (err: any) {
         result = { status: 'error', error: err.message || 'Processing failed' };
      }
      
      setFiles(prev => {
          const fileExists = prev.some(f => f.id === item.id);
          if (!fileExists) {
              if (result.processedUrl) URL.revokeObjectURL(result.processedUrl);
              return prev;
          }

          return prev.map(f => {
            if (f.id === item.id) {
                if (f.processedUrl && f.processedUrl !== result.processedUrl) {
                    URL.revokeObjectURL(f.processedUrl);
                }
                return { ...f, ...result };
            }
            return f;
          });
      });
    }

    setIsProcessing(false);
  }, [files, options]);

  const handleDownloadAll = useCallback(async () => {
    setIsZipping(true);
    try {
        const zip = new JSZip();
        
        const processedFiles = files.filter(f => f.status === 'completed' && f.processedUrl);
        
        if (processedFiles.length === 0) {
            setIsZipping(false);
            return;
        }

        const usedNames: Record<string, number> = {};

        for (const file of processedFiles) {
             if (!file.processedUrl) continue;
             
             try {
                const response = await fetch(file.processedUrl);
                const blob = await response.blob();
                
                let ext = 'jpg'; // default
                if (blob.type === 'image/png') {
                    ext = 'png';
                } else if (blob.type === 'image/webp') {
                    ext = 'webp';
                }

                let baseName = file.file.name.substring(0, file.file.name.lastIndexOf('.')) || file.file.name;
                // Add suffix
                let fileName = `${baseName}_optimized.${ext}`;
                
                if (usedNames[fileName]) {
                    usedNames[fileName]++;
                    fileName = `${baseName}_optimized_${usedNames[fileName]}.${ext}`;
                } else {
                    usedNames[fileName] = 1;
                }
                
                zip.file(fileName, blob);
             } catch (e) {
                 console.error(`Failed to add file ${file.file.name} to zip`, e);
             }
        }

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = "OptiBatch.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Zip failed", error);
        alert("Failed to create zip file.");
    } finally {
        setIsZipping(false);
    }
  }, [files]);

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

  const hasIdleOrError = files.some(f => f.status === 'idle' || f.status === 'error');
  const showReprocess = files.length > 0 && !hasIdleOrError;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      
      {/* Sidebar Options */}
      <SettingsPanel
        options={options}
        onOptionsChange={setOptions}
        disabled={isProcessing || files.length === 0}
        onProcess={handleProcessAll}
        isProcessing={isProcessing}
        hasFiles={files.length > 0}
        showReprocess={showReprocess}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                <Layers className="w-6 h-6 text-white" />
                </div>
                <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    OptiBatch
                </h1>
                <p className="text-xs text-slate-500 font-medium">Bulk Processor</p>
                </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Stats Indicators */}
             {files.length > 0 && (
                <div className="hidden md:flex items-center gap-3 text-xs font-medium text-slate-400 mr-2 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg shadow-sm backdrop-blur-sm">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                        <span>Files: <span className="text-white font-bold ml-0.5">{stats.total}</span></span>
                    </div>

                    {stats.completed > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg shadow-sm backdrop-blur-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            <span>Done: <span className="text-white font-bold ml-0.5">{stats.completed}</span></span>
                        </div>
                    )}

                    {stats.savedBytes > 0 && (
                         <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg shadow-sm backdrop-blur-sm">
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Saved: <span className="text-emerald-400 font-bold ml-0.5">{(stats.savedBytes / 1024 / 1024).toFixed(1)} MB</span></span>
                        </div>
                    )}
                </div>
             )}
             
            {stats.completed > 0 && (
                <button
                onClick={handleDownloadAll}
                disabled={isZipping || isProcessing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 hover:border-slate-600 transition-all text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                >
                {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isZipping ? 'Zipping...' : 'Download All'}
                </button>
            )}

            {files.length > 0 && (
                <button
                onClick={handleClearAll}
                disabled={isProcessing || isZipping}
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
                    <p className="text-xs text-slate-500">Drag & drop multiple images.</p>
                 </div>
                 <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
                        <span className="text-purple-400 font-bold text-lg">2</span>
                    </div>
                    <h3 className="font-medium text-slate-200 mb-1">Configure</h3>
                    <p className="text-xs text-slate-500">
                        Set size, format and quality.
                    </p>
                 </div>
                 <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
                        <span className="text-green-400 font-bold text-lg">3</span>
                    </div>
                    <h3 className="font-medium text-slate-200 mb-1">Process</h3>
                    <p className="text-xs text-slate-500">Click process and download your optimized files.</p>
                 </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4 pb-20">
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

      {uploadProgress && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-slate-700 p-4 rounded-xl shadow-2xl flex items-center gap-4 min-w-[320px] backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-slate-200">Processing inputs...</span>
                    <span className="text-slate-400 font-mono">{uploadProgress.current} / {uploadProgress.total}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;