import React, { useState, useRef } from 'react';
import { usePotholes } from '../../context/PotholeContext';
import { GPSPoint } from '../../types/pothole';
import { parseGPX, parseNMEA, parseCSV } from '../../utils/gpxParser';
import { PRESET_ROUTES, RoutePreset } from '../../utils/mockGpsGenerator';
import { Video, FileCode, CheckCircle2, UploadCloud, MapPin, Sparkles, AlertCircle } from 'lucide-react';

interface VideoUploaderProps {
  onVideoLoaded: (videoFile: File, gpsPoints: GPSPoint[], presetId: string) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onVideoLoaded }) => {
  const { aiConfig, setAIConfig } = usePotholes();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [gpsFile, setGpsFile] = useState<File | null>(null);
  const [parsedGpsPoints, setParsedGpsPoints] = useState<GPSPoint[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('mumbai-western-express');
  const [isDragOverVideo, setIsDragOverVideo] = useState(false);
  const [isDragOverGps, setIsDragOverGps] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        // Attempt GPX then CSV
        points = parseGPX(text);
        if (points.length === 0) points = parseCSV(text);
      }

      setParsedGpsPoints(points);
    } catch (e) {
      console.warn('GPS parsing error:', e);
    }
  };

  const handleStartProcessing = () => {
    if (!videoFile) return;
    onVideoLoaded(videoFile, parsedGpsPoints, selectedPresetId);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Intro Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
          Ingest Dashcam Stream & Telemetry
        </h2>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Upload your dashcam MP4 video. Optionally attach a GPS log file (GPX/NMEA/CSV). 
          Our Roboflow Deep Learning model will scan for potholes and match coordinates.
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Video className="w-4 h-4" /> 1. Dashcam Video (Required)
              </span>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 font-mono px-2 py-0.5 rounded border border-cyan-500/20">
                MP4 / WebM
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
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                videoFile
                  ? 'border-emerald-500/50 bg-emerald-950/10'
                  : isDragOverVideo
                  ? 'border-cyan-400 bg-cyan-950/20'
                  : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/50'
              }`}
            >
              {videoFile ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white truncate max-w-[240px] mx-auto">{videoFile.name}</h4>
                  <p className="text-xs font-mono text-slate-400">
                    {(videoFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI Scanner
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadCloud className="w-10 h-10 text-cyan-400 mx-auto animate-bounce" />
                  <h4 className="text-sm font-semibold text-slate-200">Drag & Drop MP4 Video File</h4>
                  <p className="text-xs text-slate-400">Click to browse your file system</p>
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

          <p className="text-[11px] text-slate-500">
            Note: Videos are processed entirely locally & via secure encrypted AI inference API.
          </p>
        </div>

        {/* Step 2: GPS Telemetry Log Upload (Optional) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <FileCode className="w-4 h-4" /> 2. GPS Track Log (Optional)
              </span>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 font-mono px-2 py-0.5 rounded border border-amber-500/20">
                GPX / NMEA / CSV
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
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                gpsFile
                  ? 'border-emerald-500/50 bg-emerald-950/10'
                  : isDragOverGps
                  ? 'border-amber-400 bg-amber-950/20'
                  : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/50'
              }`}
            >
              {gpsFile ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white truncate max-w-[240px] mx-auto">{gpsFile.name}</h4>
                  <p className="text-xs font-mono text-amber-400 font-semibold">
                    {parsedGpsPoints.length} Trackpoints Parsed
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <MapPin className="w-10 h-10 text-amber-400 mx-auto" />
                  <h4 className="text-sm font-semibold text-slate-200">Upload GPX, NMEA, or CSV Log</h4>
                  <p className="text-xs text-slate-400">Syncs video timestamp to GPS coordinates</p>
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

          {/* Automatic Geolocation & Route Preset Fallback (No Manual Input Required) */}
          {!gpsFile && (
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Auto-Geotag Route (No GPS File Required):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if ('geolocation' in navigator) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const lat = Number(pos.coords.latitude.toFixed(6));
                          const lng = Number(pos.coords.longitude.toFixed(6));
                          const acc = Math.round(pos.coords.accuracy);
                          setParsedGpsPoints([
                            { latitude: lat, longitude: lng, timestamp: 0, speed: 40, elevation: 15 }
                          ]);
                          setErrorMsg(`Auto-detected live GPS location: [${lat}, ${lng}] with ±${acc}m accuracy!`);
                        },
                        (err) => {
                          console.warn('Geolocation failed:', err);
                          setErrorMsg('Browser location access declined. Selected route preset will be used automatically.');
                        },
                        { enableHighAccuracy: true, timeout: 8000 }
                      );
                    }
                  }}
                  className="text-[10px] bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-all"
                >
                  <MapPin className="w-3 h-3 text-cyan-400" /> Auto-Detect Live Location
                </button>
              </div>

              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
              >
                {PRESET_ROUTES.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.description})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Step 3: AI Deep Learning Model Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> 3. Select AI Vision Model Engine
          </h3>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
            Dual AI Engine Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          
          {/* Model 1 Option */}
          <div
            onClick={() => setAIConfig({ ...aiConfig, activeModelPreset: 'roboflow-yolo' })}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              aiConfig.activeModelPreset === 'roboflow-yolo'
                ? 'bg-cyan-950/30 border-cyan-400 shadow-md shadow-cyan-500/10'
                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                🌐 Roboflow YOLOv8 Cloud Model
              </span>
              {aiConfig.activeModelPreset === 'roboflow-yolo' && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              
            </p>
          </div>

          {/* Model 2 Option */}
          <div
            onClick={() => setAIConfig({ ...aiConfig, activeModelPreset: 'rdd2022-custom' })}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              aiConfig.activeModelPreset === 'rdd2022-custom'
                ? 'bg-amber-950/30 border-amber-400 shadow-md shadow-amber-500/10'
                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                🇮🇳 RDD2022 Custom D40 Model
              </span>
              {aiConfig.activeModelPreset === 'rdd2022-custom' && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
            
            </p>
          </div>

        </div>
      </div>

      {/* Start Button */}
      <div className="pt-2 flex justify-center">
        <button
          disabled={!videoFile}
          onClick={handleStartProcessing}
          className={`px-8 py-4 rounded-2xl font-extrabold text-sm tracking-wider uppercase transition-all duration-300 flex items-center gap-3 shadow-xl ${
            videoFile
              ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-500 text-slate-950 hover:scale-[1.02] shadow-cyan-500/25 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span>
            Launch {aiConfig.activeModelPreset === 'rdd2022-custom' ? 'RDD2022 Custom D40' : 'Roboflow YOLOv8'} AI Detection
          </span>
        </button>
      </div>

    </div>
  );
};
