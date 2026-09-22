import React, { useState, useRef } from 'react';
import { usePotholes } from '../../context/PotholeContext';
import { GPSPoint } from '../../types/pothole';
import { parseGPX, parseNMEA, parseCSV } from '../../utils/gpxParser';
import { Video, FileCode, CheckCircle2, UploadCloud, MapPin, Sparkles, AlertCircle } from 'lucide-react';

interface VideoUploaderProps {
  onVideoLoaded: (videoFile: File, gpsPoints: GPSPoint[], presetId: string) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onVideoLoaded }) => {
  const { aiConfig, setAIConfig } = usePotholes();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [gpsFile, setGpsFile] = useState<File | null>(null);
  const [parsedGpsPoints, setParsedGpsPoints] = useState<GPSPoint[]>([]);
  const [isDragOverVideo, setIsDragOverVideo] = useState(false);
  const [isDragOverGps, setIsDragOverGps] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const gpsInputRef = useRef<HTMLInputElement>(null);

  const handleVideoSelect = (file: File) => {
    if (!file.type.includes('video/') && !file.name.endsWith('.mp4') && !file.name.endsWith('.webm')) {
      setErrorMsg('Please select a valid video file (MP4 or WebM format recommended)');
      return;
    }
    setErrorMsg(null);
    setVideoFile(file);
  };

  const handleGpsSelect = async (file: File) => {
    setGpsFile(file);
    try {
      const text = await file.text();
      let points: GPSPoint[] = [];

      if (file.name.endsWith('.gpx')) {
        points = parseGPX(text);
      } else if (file.name.endsWith('.nmea') || file.name.endsWith('.log') || text.includes('$GPRMC')) {
        points = parseNMEA(text);
      } else if (file.name.endsWith('.csv')) {
        points = parseCSV(text);
      } else {
        points = parseGPX(text);
        if (points.length === 0) points = parseCSV(text);
      }

      setParsedGpsPoints(points);
      setLocationStatus(`Loaded ${points.length} GPS points from ${file.name}`);
    } catch (e) {
      console.warn('GPS parsing error:', e);
    }
  };

  const handleDetectLiveLocation = () => {
    if ('geolocation' in navigator) {
      setLocationStatus('Detecting live position...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setParsedGpsPoints([
            { latitude: lat, longitude: lng, timestamp: 0, speed: 40, elevation: 15 }
          ]);
          setLocationStatus(`Live Location Locked: [${lat}, ${lng}]`);
        },
        (err) => {
          console.warn('Geolocation failed:', err);
          setLocationStatus('Could not fetch live location. Please upload a GPX log file.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const handleStartProcessing = () => {
    if (!videoFile) return;
    onVideoLoaded(videoFile, parsedGpsPoints, 'live');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Intro Header */}
      <div className="text-center space-y-2">
        <h2 className="font-h2 text-2xl lg:text-4xl font-bold text-romer-text-main tracking-tight">
          Pothole Vision — Dashcam Ingestion
        </h2>
        <p className="text-sm text-romer-text-muted max-w-xl mx-auto">
          Upload your video to run YOLOv12 PyResearch AI detection.
          Optionally attach GPX/CSV telemetry or auto-geotag your location.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: Video Dropzone & GPS Dropzone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Step 1: Video File Upload (Required) */}
        <div className="bg-romer-card border border-romer-divider rounded-xl p-5 space-y-4 flex flex-col justify-between inner-glow">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-romer-cyan flex items-center gap-1.5 font-mono">
                <Video className="w-4 h-4" /> 1. DASHCAM VIDEO
              </span>
              <span className="text-[10px] bg-romer-cyan/10 text-romer-cyan font-mono px-2 py-0.5 rounded border border-romer-cyan/20 uppercase tracking-wider">
                Required
              </span>
            </div>

            <div
              onClick={() => videoInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragOverVideo(true); }}
              onDragLeave={() => setIsDragOverVideo(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverVideo(false);
                if (e.dataTransfer.files?.[0]) handleVideoSelect(e.dataTransfer.files[0]);
              }}
              className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                videoFile
                  ? 'border-emerald-500/50 bg-emerald-950/10'
                  : isDragOverVideo
                  ? 'border-romer-cyan bg-romer-cyan/10'
                  : 'border-romer-divider hover:border-romer-text-muted bg-[#070708]'
              }`}
            >
              {videoFile ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-romer-text-main truncate max-w-[240px] mx-auto">{videoFile.name}</h4>
                  <p className="text-xs font-mono text-romer-text-muted">
                    {(videoFile.size / (1024 * 1024)).toFixed(2)} MB • Ready
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadCloud className="w-10 h-10 text-romer-cyan mx-auto animate-bounce" />
                  <h4 className="text-sm font-semibold text-romer-text-main">Drag & Drop MP4 Video File</h4>
                  <p className="text-xs text-romer-text-muted">Click to browse filesystem</p>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={videoInputRef}
              accept="video/mp4,video/webm,video/*"
              onChange={(e) => e.target.files?.[0] && handleVideoSelect(e.target.files[0])}
              className="hidden"
            />
          </div>
        </div>

        {/* Step 2: GPS Telemetry Log Upload (Optional) */}
        <div className="bg-romer-card border border-romer-divider rounded-xl p-5 space-y-4 flex flex-col justify-between inner-glow">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-romer-amber flex items-center gap-1.5 font-mono">
                <FileCode className="w-4 h-4" /> 2. GPS LOCATION LOG
              </span>
              <span className="text-[10px] bg-romer-amber/10 text-romer-amber font-mono px-2 py-0.5 rounded border border-romer-amber/20 uppercase tracking-wider">
                Optional
              </span>
            </div>

            <div
              onClick={() => gpsInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragOverGps(true); }}
              onDragLeave={() => setIsDragOverGps(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverGps(false);
                if (e.dataTransfer.files?.[0]) handleGpsSelect(e.dataTransfer.files[0]);
              }}
              className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                gpsFile
                  ? 'border-emerald-500/50 bg-emerald-950/10'
                  : isDragOverGps
                  ? 'border-romer-amber bg-romer-amber/10'
                  : 'border-romer-divider hover:border-romer-text-muted bg-[#070708]'
              }`}
            >
              {gpsFile ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-romer-text-main truncate max-w-[240px] mx-auto">{gpsFile.name}</h4>
                  <p className="text-xs font-mono text-romer-amber font-semibold">
                    {parsedGpsPoints.length} Trackpoints
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <MapPin className="w-10 h-10 text-romer-amber mx-auto" />
                  <h4 className="text-sm font-semibold text-romer-text-main">Upload GPX / NMEA / CSV Log</h4>
                  <p className="text-xs text-romer-text-muted">Syncs video timestamp to GPS</p>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={gpsInputRef}
              accept=".gpx,.nmea,.csv,.log,.txt"
              onChange={(e) => e.target.files?.[0] && handleGpsSelect(e.target.files[0])}
              className="hidden"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDetectLiveLocation}
              className="text-xs bg-romer-card hover:bg-romer-panel text-romer-cyan border border-romer-divider font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all inner-glow"
            >
              <MapPin className="w-3.5 h-3.5 text-romer-cyan" />
              <span>Use Current GPS Position</span>
            </button>
            {locationStatus && (
              <span className="text-[11px] font-mono text-emerald-400 truncate max-w-[180px]">
                {locationStatus}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Step 3: AI Vision Model Selector */}
      <div className="bg-romer-card border border-romer-divider rounded-xl p-5 space-y-3 inner-glow">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-romer-cyan flex items-center gap-2 font-mono">
            <Sparkles className="w-4 h-4" /> AI DETECTION ENGINE
          </h3>
          <span className="text-[10px] bg-romer-sidebar text-romer-text-muted px-2 py-0.5 rounded font-mono border border-romer-divider">
            Confidence Threshold: {Math.round(aiConfig.confidenceThreshold * 100)}%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          
          {/* YOLOv12 PyResearch Local */}
          <div
            onClick={() => setAIConfig({ ...aiConfig, activeModelPreset: 'rdd2022-custom' })}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              aiConfig.activeModelPreset === 'rdd2022-custom'
                ? 'bg-romer-primary/10 border-romer-primary shadow-md shadow-romer-primary/10'
                : 'bg-[#070708] border-romer-divider hover:border-romer-text-muted'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-romer-text-main flex items-center gap-1.5">
                ⚡ YOLOv12 PyResearch (Local PyTorch)
              </span>
              {aiConfig.activeModelPreset === 'rdd2022-custom' && (
                <span className="w-2 h-2 rounded-full bg-romer-primary animate-ping" />
              )}
            </div>
            <p className="text-[11px] text-romer-text-muted leading-snug">
              Trained best.pt model running locally via Python FastAPI endpoint
            </p>
          </div>

          {/* Roboflow Cloud */}
          <div
            onClick={() => setAIConfig({ ...aiConfig, activeModelPreset: 'roboflow-yolo' })}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              aiConfig.activeModelPreset === 'roboflow-yolo'
                ? 'bg-romer-amber/10 border-romer-amber shadow-md shadow-romer-amber/10'
                : 'bg-[#070708] border-romer-divider hover:border-romer-text-muted'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-romer-text-main flex items-center gap-1.5">
                🌐 Roboflow YOLO Cloud API
              </span>
              {aiConfig.activeModelPreset === 'roboflow-yolo' && (
                <span className="w-2 h-2 rounded-full bg-romer-amber animate-ping" />
              )}
            </div>
            <p className="text-[11px] text-romer-text-muted leading-snug">
              Hosted inference API for remote detection model
            </p>
          </div>

        </div>
      </div>

      {/* Start Button */}
      <div className="pt-2 flex justify-center">
        <button
          disabled={!videoFile}
          onClick={handleStartProcessing}
          className={`px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center gap-2.5 shadow-xl ${
            videoFile
              ? 'bg-romer-primary hover:bg-romer-primary-hover text-white shadow-romer-primary/25 cursor-pointer font-h3'
              : 'bg-romer-sidebar text-romer-text-muted cursor-not-allowed border border-romer-divider'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>
            Start {aiConfig.activeModelPreset === 'rdd2022-custom' ? 'YOLOv12 PyResearch' : 'Roboflow YOLO'} AI Analysis
          </span>
        </button>
      </div>

    </div>
  );
};

