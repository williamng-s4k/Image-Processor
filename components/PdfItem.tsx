import React from 'react';
import { X, ArrowRight, Download, AlertCircle, Loader2, FileText, CheckCircle } from 'lucide-react';
import { PdfItem as PdfItemType } from '../types';
import { formatBytes } from '../utils/imageUtils';

interface PdfItemProps {
  item: PdfItemType;
  onRemove: (id: string) => void;
}

const PdfItem: React.FC<PdfItemProps> = ({ item, onRemove }) => {
  const downloadName = item.file.name;

  return (
    <div className="group flex items-center gap-4 bg-slate-900 border border-slate-800 p-3 rounded-xl hover:border-slate-700 transition-all">
      {/* Icon/Thumbnail */}
      <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
        <FileText className="w-8 h-8 text-red-400/80" />
        {item.status === 'processing' && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[1px]">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        )}
        {item.status === 'completed' && (
            <div className="absolute top-1 right-1">
                <CheckCircle className="w-4 h-4 text-green-500 fill-slate-900" />
            </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-medium text-slate-200 truncate pr-4" title={item.file.name}>
            {item.file.name}
          </h4>
          {item.status === 'completed' && item.processedSize && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
              SAVED {Math.max(0, Math.round(((item.originalSize - item.processedSize) / item.originalSize) * 100))}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="font-mono">{formatBytes(item.originalSize)}</span>

          {item.status === 'completed' && item.processedSize && (
            <>
              <ArrowRight className="w-3 h-3 text-slate-600" />
              <div className="flex items-center gap-1.5 text-blue-400">
                <span className="font-mono font-semibold">{formatBytes(item.processedSize)}</span>
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
          <a
            href={item.processedUrl}
            download={downloadName}
            className="p-2 rounded-lg text-slate-400 hover:text-green-400 hover:bg-green-500/10 transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </a>
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
  );
};

export default PdfItem;