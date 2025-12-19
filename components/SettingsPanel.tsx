import React from 'react';
import { Settings, Sliders, Image as ImageIcon, Type, Activity, RotateCcw } from 'lucide-react';
import { ProcessingOptions, ResizeMode, ImageFormat } from '../types';
import { SUPPORTED_FORMATS } from '../constants';

interface SettingsPanelProps {
  options: ProcessingOptions;
  onOptionsChange: (newOptions: ProcessingOptions) => void;
  disabled?: boolean;
  onProcess: () => void;
  isProcessing: boolean;
  hasFiles: boolean;
  showReprocess?: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  options,
  onOptionsChange,
  disabled = false,
  onProcess,
  isProcessing,
  hasFiles,
  showReprocess = false,
}) => {
  const handleChange = <K extends keyof ProcessingOptions>(
    key: K,
    value: ProcessingOptions[K]
  ) => {
    onOptionsChange({ ...options, [key]: value });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 w-80 shrink-0 overflow-y-auto custom-scrollbar">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-500" />
          Image Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Adjust settings for all files
        </p>
      </div>

      <div className="p-6 space-y-8 flex-1">
        
        {/* === IMAGE MODE SETTINGS === */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <ImageIcon className="w-4 h-4 text-blue-400" />
            RESIZE
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {(['original', 'percentage', 'fixed-width', 'fixed-height'] as ResizeMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleChange('resizeMode', m)}
                disabled={disabled}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                  options.resizeMode === m
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {m.replace('-', ' ').toUpperCase()}
              </button>
            ))}
          </div>

          {options.resizeMode !== 'original' && (
            <div className="space-y-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <label className="text-xs text-slate-400">
                {options.resizeMode === 'percentage' ? 'Scale Percentage' : 'Target Pixels'}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={options.resizeMode === 'percentage' ? 10 : 100}
                  max={options.resizeMode === 'percentage' ? 200 : 4000}
                  step={options.resizeMode === 'percentage' ? 5 : 50}
                  value={options.resizeValue}
                  disabled={disabled}
                  onChange={(e) => handleChange('resizeValue', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-sm font-mono text-white min-w-[3rem] text-right">
                  {options.resizeValue}{options.resizeMode === 'percentage' ? '%' : 'px'}
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                      type="checkbox"
                      checked={options.maintainAspectRatio}
                      onChange={(e) => handleChange('maintainAspectRatio', e.target.checked)}
                      disabled={disabled}
                      className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-xs text-slate-400 group-hover:text-slate-300">Maintain aspect ratio</span>
              </label>
            </div>
          )}
        </section>

        {/* Format Section */}
        <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Type className="w-4 h-4 text-purple-400" />
            OUTPUT FORMAT
        </div>
        <div className="grid grid-cols-1 gap-2">
            <select
            value={options.format}
            onChange={(e) => handleChange('format', e.target.value as ImageFormat)}
            disabled={disabled}
            className={`w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500`}
            >
            {Object.entries(SUPPORTED_FORMATS).map(([value, label]) => (
                <option key={value} value={value}>
                {label}
                </option>
            ))}
            </select>
        </div>
        </section>

        {/* Quality Section - Shared */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Sliders className="w-4 h-4 text-green-400" />
            COMPRESSION QUALITY
          </div>
          
          <div className="space-y-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
             <div className="flex justify-between items-center">
                 <span className="text-xs text-slate-400">Low</span>
                 <span className="text-xs text-slate-400">High</span>
             </div>
            <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={options.quality}
                  disabled={disabled || options.format === 'image/png'}
                  onChange={(e) => handleChange('quality', Number(e.target.value))}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500 ${options.format === 'image/png' ? 'bg-slate-700 opacity-50' : 'bg-slate-700'}`}
                />
                <span className="text-sm font-mono text-white min-w-[3rem] text-right">
                  {Math.round(options.quality * 100)}%
                </span>
            </div>
            {options.format === 'image/png' && (
                <p className="text-[10px] text-yellow-500/80">
                    * PNG is lossless. Quality setting may not apply.
                </p>
            )}
          </div>
        </section>
      </div>

      <div className="p-6 border-t border-slate-800 bg-slate-900 sticky bottom-0 z-10">
        <button
          onClick={onProcess}
          disabled={disabled || !hasFiles || isProcessing}
          className={`w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg ${
            isProcessing
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : !hasFiles
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : showReprocess
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20 active:scale-[0.98]'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20 active:scale-[0.98]'
          }`}
        >
          {isProcessing ? (
             <Activity className="w-5 h-5 animate-spin" />
          ) : showReprocess ? (
             <RotateCcw className="w-5 h-5" />
          ) : (
             <Activity className="w-5 h-5" />
          )}
          {isProcessing ? 'Processing...' : showReprocess ? 'Re-process Images' : 'Process Images'}
        </button>
      </div>
    </div>
  );
};

export default SettingsPanel;