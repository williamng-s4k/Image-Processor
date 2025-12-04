import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ArrowLeftRight, ZoomIn, ZoomOut, RotateCcw, Hand, MousePointer2 } from 'lucide-react';

interface CompareModalProps {
  originalUrl: string;
  processedUrl: string;
  onClose: () => void;
  fileName: string;
}

type InteractionMode = 'slider' | 'pan';

const CompareModal: React.FC<CompareModalProps> = ({ originalUrl, processedUrl, onClose, fileName }) => {
  // View State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  // Interaction State
  const [mode, setMode] = useState<InteractionMode>('slider');
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [sliderPos, setSliderPos] = useState(50);
  
  // Refs for calculations
  const containerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 }); // Mouse pos at start of pan
  const panOriginRef = useRef({ x: 0, y: 0 }); // Pan val at start of pan

  const activeMode = isSpaceHeld ? 'pan' : mode;

  // --- Actions ---

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSliderPos(50);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      const factor = 1.2;
      const newZoom = direction === 'in' ? prev * factor : prev / factor;
      return Math.min(Math.max(1, newZoom), 16);
    });
  };

  // --- Interaction Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!containerRef.current) return;

    // Zoom Math
    const scaleFactor = 1.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.min(Math.max(1, zoom * (direction > 0 ? scaleFactor : 1 / scaleFactor)), 16);

    if (newZoom === zoom) return;

    // Calculate mouse offset from center of container to zoom towards cursor
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const mx = e.clientX - cx;
    const my = e.clientY - cy;

    // Adjust pan to keep the point under cursor stationary
    // Formula: NewPan = Pan + MouseOffset * (1 - GrowthFactor)
    // GrowthFactor = NewZoom / OldZoom
    const growth = newZoom / zoom;
    setPan(prev => ({
        x: prev.x + mx * (1 - growth),
        y: prev.y + my * (1 - growth)
    }));
    
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Determine action based on mode and button
    if (activeMode === 'pan' || e.button === 1 || e.button === 2) {
      e.preventDefault(); // Prevent default browser pan/scroll
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panOriginRef.current = { ...pan };
    } else {
      setIsDraggingSlider(true);
      // Immediately update slider on click
      updateSlider(e.clientX);
    }
  };

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Calculate position relative to the SCALED element
    // rect.left/width accounts for transform scale, so this logic remains correct!
    const position = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(100, Math.max(0, position)));
  }, []);

  // Global listeners for Dragging (Slider or Pan)
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider) {
        e.preventDefault();
        updateSlider(e.clientX);
      } else if (isPanning) {
        e.preventDefault();
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPan({
            x: panOriginRef.current.x + dx,
            y: panOriginRef.current.y + dy
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDraggingSlider(false);
      setIsPanning(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.code === 'Space' && !e.repeat) setIsSpaceHeld(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceHeld(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isDraggingSlider, isPanning, updateSlider, onClose]);

  // Prevent context menu on right click for panning
  useEffect(() => {
    const preventContext = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', preventContext);
    return () => document.removeEventListener('contextmenu', preventContext);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      
      {/* Main Modal Window */}
      <div 
        className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 z-20">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-200">Comparison View</h3>
                    <p className="text-xs text-slate-500 max-w-[200px] sm:max-w-md truncate">{fileName}</p>
                </div>
             </div>
             
             {/* Divider */}
             <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>

             {/* Mode Switcher */}
             <div className="hidden sm:flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                <button 
                   onClick={() => setMode('slider')}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'slider' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                   <MousePointer2 className="w-3 h-3" />
                   Slider
                </button>
                <button 
                   onClick={() => setMode('pan')}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'pan' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                   <Hand className="w-3 h-3" />
                   Pan
                </button>
             </div>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div 
          className="flex-1 overflow-hidden flex items-center justify-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-slate-950 p-4 relative"
          onWheel={handleWheel}
        >
           {/* Movable Viewport Wrapper */}
           <div 
              className="relative transition-transform duration-75 ease-out"
              style={{
                 transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                 transformOrigin: 'center center', // Scale from center, we adjust Pan manually in wheel handler
              }}
           >
                <div 
                    ref={containerRef}
                    className={`relative shadow-2xl rounded-lg overflow-hidden select-none max-h-full max-w-full ${activeMode === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-ew-resize'}`}
                    onMouseDown={handleMouseDown}
                >
                    {/* Size setter (Invisible) */}
                    <img 
                        src={originalUrl} 
                        alt="" 
                        className="opacity-0 max-h-[75vh] max-w-full pointer-events-none" 
                        draggable={false}
                    />

                    {/* Image Stack */}
                    <div className="absolute inset-0 w-full h-full bg-slate-900">
                        {/* Processed (Bottom) */}
                        <img 
                            src={processedUrl} 
                            alt="Processed" 
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                            draggable={false}
                        />
                        
                        {/* Original (Top) with Clip */}
                        <img 
                            src={originalUrl} 
                            alt="Original" 
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                            draggable={false}
                        />
                    </div>

                    {/* Slider Handle Overlay */}
                    <div 
                        className={`absolute inset-y-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none ${activeMode === 'pan' ? 'opacity-50' : 'opacity-100'}`}
                        style={{ left: `${sliderPos}%` }}
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-900 ring-4 ring-slate-900/20">
                            <ArrowLeftRight className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Labels */}
                    <div className="absolute top-4 left-4 bg-black/60 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded backdrop-blur-md pointer-events-none border border-white/10 shadow-lg">
                        Original
                    </div>
                    <div className="absolute top-4 right-4 bg-blue-600/90 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded backdrop-blur-md pointer-events-none border border-white/10 shadow-lg">
                        Processed
                    </div>
                </div>
           </div>

           {/* Floating Toolbar */}
           <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/90 border border-slate-700/50 backdrop-blur-xl shadow-2xl z-30">
               <button 
                  onClick={() => handleZoom('out')}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Zoom Out"
               >
                   <ZoomOut className="w-4 h-4" />
               </button>
               
               <div className="px-2 min-w-[3rem] text-center font-mono text-xs text-slate-300 select-none">
                   {Math.round(zoom * 100)}%
               </div>

               <button 
                  onClick={() => handleZoom('in')}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Zoom In"
               >
                   <ZoomIn className="w-4 h-4" />
               </button>
               
               <div className="w-px h-4 bg-slate-700 mx-1"></div>

               <button 
                  onClick={handleReset}
                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Reset View"
               >
                   <RotateCcw className="w-4 h-4" />
               </button>
           </div>
           
           {/* Spacebar Hint */}
           <div className={`absolute bottom-6 right-6 px-3 py-1.5 rounded-lg bg-black/50 text-slate-400 text-xs font-medium backdrop-blur-md pointer-events-none transition-opacity duration-300 hidden sm:block ${isSpaceHeld ? 'opacity-100 bg-blue-600/20 text-blue-200 border border-blue-500/30' : 'opacity-60'}`}>
                {isSpaceHeld ? 'Pan Mode Active' : 'Hold Space to Pan'}
           </div>

        </div>
      </div>
    </div>
  );
};

export default CompareModal;