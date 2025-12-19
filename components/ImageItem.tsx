import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowRight, Download, AlertCircle, Loader2, ScanEye, ZoomIn, MousePointer2 } from 'lucide-react';
import { ImageItem as ImageItemType } from '../types';
import { formatBytes } from '../utils/imageUtils';
import CompareModal from './CompareModal';

interface ImageItemProps {
  item: ImageItemType;
  onRemove: (id: string) => void;
}

const ImageItem: React.FC<ImageItemProps> = ({ item, onRemove }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [relPos, setRelPos] = useState({ x: 50, y: 50 });
  const thumbnailRef = useRef<HTMLDivElement>(null);

  // Use native event listener for wheel to properly prevent default scroll behavior
  useEffect(() => {
    const element = thumbnailRef.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Adjust sensitivity and limits
      const delta = -e.deltaY * 0.005;
      setZoom(z => Math.min(Math.max(1, z + delta), 8));
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, []);

  const handleMouseEnter = (e: React.MouseEvent) => {
    setShowPreview(true);
    setCursorPos({ x: e.clientX, y: e.clientY });
    updateRelPos(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
    updateRelPos(e);
  };

  const handleMouseLeave = () => {
    setShowPreview(false);
    setZoom(1);
  };

  const updateRelPos = (e: React.MouseEvent) => {
    if (thumbnailRef.current) {
        const rect = thumbnailRef.current.getBoundingClientRect();
        // Calculate percentage position within the thumbnail
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        setRelPos({ x, y });
    }
  };

  // Determine if preview should show on left or right to avoid clipping
  const isRightHalf = typeof window !== 'undefined' && cursorPos.x > window.innerWidth / 2;

  const getExtension = (format: string) => {
    if (format === 'image/png') return 'png';
    if (format === 'image/webp') return 'webp';
    return 'jpg';
  };

  const baseName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
  const downloadName = item.processedFormat 
    ? `${baseName}_optimized.${getExtension(item.processedFormat)}`
    : item.file.name;

  return (
    <>
      {showCompare && item.processedUrl && (
        <CompareModal
          originalUrl={item.previewUrl}
          processedUrl={item.processedUrl}
          fileName={item.file.name}
          onClose={() => setShowCompare(false)}
        />
      )}

      {showPreview && !showCompare && (
        <div 
          className="fixed z-[100] pointer-events-none p-2 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-sm transition-opacity duration-200"
          style={{
            top: cursorPos.y,
            left: isRightHalf ? cursorPos.x - 24 : cursorPos.x + 24,
            transform: `translate(${isRightHalf ? '-100%' : '0'}, -50%)`,
            width: '400px',
            maxWidth: '90vw',
          }}
        >
          {/* Preview Image Container */}
          <div className="relative w-full aspect-square bg-slate-950/50 rounded-lg overflow-hidden border border-slate-800">
             <img 
                src={item.previewUrl} 
                alt="Preview" 
                className="w-full h-full object-contain transition-transform duration-75 ease-out origin-center"
                style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: `${relPos.x}% ${relPos.y}%`
                }}
             />
             
             {/* Zoom Badge */}
             {zoom > 1 && (
                 <div className="absolute top-3 right-3 z-10 bg-black/70 backdrop-blur-md text-white text-[10px] font-mono px-2 py-1 rounded-full border border-white/10 flex items-center gap-1 shadow-lg">
                    <ZoomIn className="w-3 h-3 text-blue-400" />
                    {zoom.toFixed(1)}x
                 </div>
             )}
          </div>

          <div className="mt-2 flex justify-between items-center px-1 border-t border-slate-800 pt-2">
             <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Original</span>
                <span className="text-xs text-slate-300 font-mono">
                    {item.originalWidth} × {item.originalHeight}
                </span>
             </div>
             <div className="flex flex-col items-end">
                {zoom === 1 ? (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <MousePointer2 className="w-3 h-3" />
                        <span>Scroll to zoom</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Size</span>
                        <span className="text-xs text-slate-300 font-mono">{formatBytes(item.originalSize)}</span>
                    </div>
                )}
             </div>
          </div>
        </div>
      )}

      <div className="group flex items-center gap-4 bg-slate-900 border border-slate-800 p-3 rounded-xl hover:border-slate-700 transition-all">
        {/* Thumbnail */}
        <div 
          ref={thumbnailRef}
          className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 cursor-crosshair"
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <img
            src={item.previewUrl}
            alt="thumbnail"
            className="w-full h-full object-cover"
          />
          {item.status === 'processing' && (
             <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[1px]">
                 <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
             </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium text-slate-200 truncate pr-4" title={item.file.name}>
              {item.file.name}
              </h4>
              <div className="flex items-center gap-2">
                 {item.status === 'completed' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                        SAVED {Math.max(0, Math.round(((item.originalSize - (item.processedSize || 0)) / item.originalSize) * 100))}%
                    </span>
                 )}
              </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                {item.originalWidth}x{item.originalHeight}
              </span>
              <span className="font-mono">{formatBytes(item.originalSize)}</span>
            </div>

            {item.status === 'completed' && (
              <>
                <ArrowRight className="w-3 h-3 text-slate-600" />
                <div className="flex items-center gap-1.5 text-blue-400">
                  <span className="bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 font-mono">
                    {item.processedWidth}x{item.processedHeight}
                  </span>
                  <span className="font-mono font-semibold">{formatBytes(item.processedSize || 0)}</span>
                </div>
              </>
            )}

           {item.status === 'error' && (
                <span className="text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Failed
                </span>
           )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {item.status === 'completed' && item.processedUrl && (
            <>
            <button
                onClick={() => setShowCompare(true)}
                className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                title="Compare Original vs Processed"
            >
                <ScanEye className="w-5 h-5" />
            </button>
            <a
                href={item.processedUrl}
                download={downloadName}
                className="p-2 rounded-lg text-slate-400 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                title="Download"
            >
                <Download className="w-5 h-5" />
            </a>
            </>
        )}
        
        <button
          onClick={() => onRemove(item.id)}
          className="p-2 rounded-lg transition-colors focus:opacity-100 text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100"
          title="Remove"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
    </>
  );
};

export default ImageItem;