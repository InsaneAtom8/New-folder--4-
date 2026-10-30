import React, { useState, useEffect } from 'react';
import { Cpu, ShieldCheck, Sparkles, Activity } from 'lucide-react';

interface LoadingScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onFinish,
  minDurationMs = 1200,
}) => {
  const [progress, setProgress] = useState(15);
  const [statusIndex, setStatusIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const statusMessages = [
    'Connecting to Neural Engine...',
    'Loading spatial IndexedDB geometry...',
    'Calibrating YOLOv8/YOLOv12 detection pipeline...',
    'Ready for road inspection.',
  ];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / minDurationMs) * 100), 100);
      setProgress(pct);

      if (pct > 75) {
        setStatusIndex(3);
      } else if (pct > 45) {
        setStatusIndex(2);
      } else if (pct > 20) {
        setStatusIndex(1);
      }

      if (elapsed >= minDurationMs) {
        clearInterval(interval);
        setIsFadingOut(true);
        setTimeout(() => {
          if (onFinish) onFinish();
        }, 400); // match transition duration
      }
    }, 40);

    return () => clearInterval(interval);
  }, [minDurationMs, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FFFFFF] transition-opacity duration-400 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Subtle Paper Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#000000 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-8 text-center space-y-8 animate-in fade-in duration-300">
        
        {/* Brand Icon with Radar Pulse Rings */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full border border-black/10 animate-ping" />
          <div className="absolute w-16 h-16 rounded-full border border-black/20" />
          <div className="w-14 h-14 rounded-2xl bg-[#000000] text-[#FFFFFF] flex items-center justify-center shadow-xl">
            <span className="font-bold text-xl tracking-tight">P</span>
          </div>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-normal text-[#000000] tracking-tight">
            PotholeVision <span className="serif-italic font-normal">AI</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#444444]">
            Enterprise Spatial Road Surface Intelligence
          </p>
        </div>

        {/* Progress Bar & Status Text */}
        <div className="w-full space-y-3 pt-2">
          <div className="h-1.5 w-full bg-[#F2F2F2] rounded-full overflow-hidden border border-black/10">
            <div
              className="h-full bg-[#000000] transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[#444444]">
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {statusMessages[statusIndex]}
            </span>
            <span className="font-semibold text-[#000000]">{progress}%</span>
          </div>
        </div>

        {/* System Badges */}
        <div className="flex items-center justify-center gap-4 pt-4 border-t border-black/10 text-[11px] font-mono text-[#555555]">
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-[#000000]" /> YOLOv8/12 Core
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#000000]" /> Spatial GIS
          </span>
        </div>

      </div>
    </div>
  );
};

