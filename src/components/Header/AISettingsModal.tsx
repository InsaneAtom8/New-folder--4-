import React, { useState } from 'react';
import { usePotholes } from '../../context/PotholeContext';
import { Settings, Key, Cpu, ShieldCheck, X, RefreshCw, CheckCircle2 } from 'lucide-react';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose }) => {
  const { aiConfig, setAIConfig, addToast } = usePotholes();

  const [apiKey, setApiKey] = useState(aiConfig.apiKey);
  const [modelId, setModelId] = useState(aiConfig.modelId);
  const [confidenceThreshold, setConfidenceThreshold] = useState(aiConfig.confidenceThreshold);
  const [sampleRate, setSampleRate] = useState(aiConfig.sampleRateSeconds);
  const [useLocalFallback, setUseLocalFallback] = useState(aiConfig.useLocalFallback);
  const [activeModelPreset, setActiveModelPreset] = useState<'roboflow-yolo' | 'rdd2022-custom'>(aiConfig.activeModelPreset || 'rdd2022-custom');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setAIConfig({
      apiKey,
      modelId,
      confidenceThreshold: Number(confidenceThreshold),
      sampleRateSeconds: Number(sampleRate),
      useLocalFallback,
      activeModelPreset,
    });
    setIsSaved(true);
    addToast('success', 'AI Configuration Saved', 'Active Model engine and parameters updated');
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">AI & Deep Learning Settings</h2>
              <p className="text-xs text-slate-400">Configure Roboflow YOLO API Credentials & Inference Parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          
          {/* Active Model Engine Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Active AI Model Engine
            </label>
            <select
              value={activeModelPreset}
              onChange={(e) => setActiveModelPreset(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="rdd2022-custom">🇮🇳 RDD2022 Custom D40 Model (Fine-tuned on RDD2022 Dataset)</option>
              <option value="roboflow-yolo">🌐 Roboflow YOLOv8 Cloud Model (Pre-trained Pothole Universe)</option>
            </select>
          </div>

          {/* Roboflow API Key Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-cyan-400" /> Roboflow Private API Key
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="e.g. pwbfBnUCVvZQlktfIAJc"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
              {apiKey && (
                <span className="absolute right-3 top-2.5 text-xs text-emerald-400 font-mono flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" /> Key Loaded
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Obtained from your Roboflow Account Settings. Enables real-time YOLOv8/v11 cloud inference.
            </p>
          </div>

          {/* Model ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-amber-400" /> Target Roboflow Model ID
            </label>
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="pothole-detection-system/3"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <p className="text-[11px] text-slate-400">
              Default pre-trained dataset: <code className="text-cyan-400">pothole-detection-system/3</code>
            </p>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            
            {/* Confidence Threshold */}
            <div className="space-y-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">Confidence Min</span>
                <span className="font-mono text-cyan-400 font-bold">{Math.round(confidenceThreshold * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.90"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Frame Sample Rate */}
            <div className="space-y-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">Frame Sample Interval</span>
                <span className="font-mono text-amber-400 font-bold">{sampleRate}s</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={sampleRate}
                onChange={(e) => setSampleRate(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Local Fallback Toggle */}
          <div className="flex items-center justify-between bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
            <div>
              <h4 className="text-xs font-semibold text-white">Browser Computer Vision Fallback</h4>
              <p className="text-[11px] text-slate-400">Enable local frame scanner if API request fails or is offline</p>
            </div>
            <button
              type="button"
              onClick={() => setUseLocalFallback(!useLocalFallback)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useLocalFallback ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useLocalFallback ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Save Button */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all"
            >
              {isSaved ? <CheckCircle2 className="w-4 h-4 text-slate-950" /> : <RefreshCw className="w-4 h-4" />}
              {isSaved ? 'Saved!' : 'Save Configuration'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
