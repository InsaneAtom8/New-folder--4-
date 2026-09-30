import React, { useState, useRef } from 'react';
import { usePotholes } from '../../context/PotholeContext';
import { GPSPoint } from '../../types/pothole';
import { parseGPX, parseNMEA, parseCSV } from '../../utils/gpxParser';
import { 
  Video, 
  FileCode, 
  CheckCircle2, 
  UploadCloud, 
  MapPin, 
  Sparkles, 
  AlertCircle,
  Eye,
  ShieldCheck,
  Zap,
  Layers,
  CheckSquare,
  BarChart,
  HardDrive
} from 'lucide-react';

interface VideoUploaderProps {
  onVideoLoaded: (videoFile: File, gpsPoints: GPSPoint[], presetId: string) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onVideoLoaded }) => {
  const { aiConfig, setAIConfig, setActiveTab } = usePotholes();
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
    <div className="max-w-5xl mx-auto space-y-16 pb-20 animate-in fade-in duration-300">
      
      {/* Hero Display Section: Instrument Sans 60px/400 with Instrument Serif Italic re-lettered single word */}
      <div className="text-center space-y-4 sm:space-y-6 pt-4 sm:pt-8">
        <h1 className="text-3xl sm:text-4xl md:text-[52px] lg:text-[60px] font-normal text-[#000000] tracking-[-1.2px] leading-[1.12] max-w-4xl mx-auto px-2">
          AI Road Vision for <span className="serif-italic font-normal">Pothole</span> Hazard Inspection.
        </h1>
        <p className="text-sm sm:text-base text-[#222222] max-w-2xl mx-auto leading-relaxed px-2">
          Upload dashcam video telemetry to run deep-learning object detection, correlated directly to GIS spatial coordinates.
        </p>

        {/* Hero Stacked Actions: Black Fills & Borders */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            disabled={!videoFile}
            onClick={handleStartProcessing}
            className={`h-12 px-8 rounded-full font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2.5 ${
              videoFile
                ? 'bg-[#000000] hover:bg-[#222222] text-[#FFFFFF] cursor-pointer shadow-md'
                : 'bg-[#000000]/40 text-[#FFFFFF]/60 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Start AI Vision Scanning</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className="h-12 px-6 rounded-full bg-[#FFFFFF] text-[#000000] border border-black/20 hover:border-black font-medium text-sm transition-all flex items-center justify-center gap-2"
          >
            <span>Explore Live GIS Map</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-[#F2F2F2] border border-black/20 text-[#000000] px-4 py-3 rounded-xl text-xs flex items-center gap-2 max-w-xl mx-auto">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Inputs Section: Paper Gray Surfaces (#F2F2F2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Step 1: Video File Dropzone */}
        <div className="bg-[#F2F2F2] border border-black/10 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[#000000] flex items-center gap-2">
                <Video className="w-4 h-4" /> 1. Dashcam Video File
              </span>
              <span className="text-xs bg-[#000000] text-[#FFFFFF] px-2.5 py-0.5 rounded-full font-mono">
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
              className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                videoFile
                  ? 'border-black bg-[#FFFFFF] text-[#000000]'
                  : isDragOverVideo
                  ? 'border-black bg-black/5'
                  : 'border-black/20 hover:border-black/50 bg-[#FFFFFF] text-[#222222]'
              }`}
            >
              {videoFile ? (
                <div className="space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#000000] mx-auto" />
                  <h4 className="text-sm font-medium truncate max-w-[240px] mx-auto text-[#000000]">{videoFile.name}</h4>
                  <p className="text-xs font-mono text-[#222222]">
                    {(videoFile.size / (1024 * 1024)).toFixed(2)} MB • Ready
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadCloud className="w-8 h-8 text-[#000000] mx-auto" />
                  <h4 className="text-sm font-medium text-[#000000]">Select MP4 Video File</h4>
                  <p className="text-xs text-[#222222]">Drag & drop or click to browse</p>
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

        {/* Step 2: GPS Telemetry File Dropzone */}
        <div className="bg-[#F2F2F2] border border-black/10 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[#000000] flex items-center gap-2">
                <FileCode className="w-4 h-4" /> 2. GPS Location Log
              </span>
              <span className="text-xs bg-[#FFFFFF] text-[#222222] border border-black/10 px-2.5 py-0.5 rounded-full font-mono">
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
              className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                gpsFile
                  ? 'border-black bg-[#FFFFFF] text-[#000000]'
                  : isDragOverGps
                  ? 'border-black bg-black/5'
                  : 'border-black/20 hover:border-black/50 bg-[#FFFFFF] text-[#222222]'
              }`}
            >
              {gpsFile ? (
                <div className="space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#000000] mx-auto" />
                  <h4 className="text-sm font-medium truncate max-w-[240px] mx-auto text-[#000000]">{gpsFile.name}</h4>
                  <p className="text-xs font-mono text-[#000000] font-medium">
                    {parsedGpsPoints.length} Trackpoints
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <MapPin className="w-8 h-8 text-[#000000] mx-auto" />
                  <h4 className="text-sm font-medium text-[#000000]">Upload GPX / NMEA / CSV</h4>
                  <p className="text-xs text-[#222222]">Syncs timestamp to GPS coordinates</p>
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
              className="text-xs bg-[#FFFFFF] hover:bg-black/5 text-[#000000] border border-black/10 font-medium px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Use Current Position</span>
            </button>
            {locationStatus && (
              <span className="text-[11px] font-mono text-[#000000] truncate max-w-[180px]">
                {locationStatus}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Model Engine Selector: Paper-Gray Field */}
      <div className="bg-[#F2F2F2] border border-black/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[#000000] flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> AI Neural Engine Preset
          </h3>
          <span className="text-xs font-mono text-[#222222]">
            Confidence Threshold: {Math.round(aiConfig.confidenceThreshold * 100)}%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setAIConfig({ ...aiConfig, activeModelPreset: 'rdd2022-custom' })}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              aiConfig.activeModelPreset === 'rdd2022-custom'
                ? 'bg-[#000000] text-[#FFFFFF] border-[#000000]'
                : 'bg-[#FFFFFF] text-[#000000] border-black/10 hover:border-black/30'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Local YOLOv12 Engine</span>
              {aiConfig.activeModelPreset === 'rdd2022-custom' && (
                <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
              )}
            </div>
            <p className={`text-xs ${aiConfig.activeModelPreset === 'rdd2022-custom' ? 'text-[#FFFFFF]/80' : 'text-[#222222]'}`}>
              Local FastAPI inference endpoint for custom weights
            </p>
          </div>

          <div
            onClick={() => setAIConfig({ ...aiConfig, activeModelPreset: 'roboflow-yolo' })}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              aiConfig.activeModelPreset === 'roboflow-yolo'
                ? 'bg-[#000000] text-[#FFFFFF] border-[#000000]'
                : 'bg-[#FFFFFF] text-[#000000] border-black/10 hover:border-black/30'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Roboflow Hosted Cloud API</span>
              {aiConfig.activeModelPreset === 'roboflow-yolo' && (
                <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
              )}
            </div>
            <p className={`text-xs ${aiConfig.activeModelPreset === 'roboflow-yolo' ? 'text-[#FFFFFF]/80' : 'text-[#222222]'}`}>
              Cloud-hosted inference API for remote detection
            </p>
          </div>
        </div>
      </div>

      {/* Feature Showcase Grid: Instrument Section Headline with Serif Italic re-lettering + 2 Showcase Accent Tiles (~2.4% area each) */}
      <div className="space-y-8 pt-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl md:text-[40px] lg:text-[48px] font-normal text-[#000000] tracking-[-0.5px] leading-[1.2] px-2">
            Engineered for <span className="serif-italic font-normal">Precision</span> Road Monitoring.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Showcase Tile 1: Pale Lavender Accent Wash (linear-gradient(rgb(247, 243, 255), rgb(229, 215, 255))) */}
          <div className="showcase-lavender-card rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#000000] text-[#FFFFFF] flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-[#000000] tracking-[-0.3px]">YOLOv12 Neural Engine</h4>
              <p className="text-xs text-[#222222] mt-1 leading-relaxed">
                High-frequency 29.9 FPS frame sampling for accurate hazard bounding box tracking.
              </p>
            </div>
          </div>

          {/* Showcase Tile 2: Pale Mint Accent Wash (linear-gradient(170deg, rgb(236, 247, 241), rgb(179, 226, 207))) */}
          <div className="showcase-mint-card rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#000000] text-[#FFFFFF] flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-[#000000] tracking-[-0.3px]">GPX Telemetry Sync</h4>
              <p className="text-xs text-[#222222] mt-1 leading-relaxed">
                Direct correlation of timestamp offset to latitude and longitude telemetry log files.
              </p>
            </div>
          </div>

          {/* Standard Monochromatic Card 3 */}
          <div className="bg-[#F2F2F2] border border-black/10 rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#000000] text-[#FFFFFF] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-[#000000] tracking-[-0.3px]">Zero-Config IndexedDB</h4>
              <p className="text-xs text-[#222222] mt-1 leading-relaxed">
                Client-side persistent spatial registry with local browser storage.
              </p>
            </div>
          </div>

          {/* Standard Monochromatic Card 4 */}
          <div className="bg-[#F2F2F2] border border-black/10 rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#000000] text-[#FFFFFF] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-[#000000] tracking-[-0.3px]">Hazard Clustering</h4>
              <p className="text-xs text-[#222222] mt-1 leading-relaxed">
                Sub-15m spatial proximity deduplication to consolidate repeated detections.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Closing CTA Section: Re-lettered Serif Italic word */}
      <div className="text-center pt-8 space-y-6">
        <h2 className="text-2xl sm:text-3xl md:text-[40px] lg:text-[48px] font-normal text-[#000000] tracking-[-0.5px] px-2">
          Ready to <span className="serif-italic font-normal">Inspect</span> Your Corridors?
        </h2>
        <button
          disabled={!videoFile}
          onClick={handleStartProcessing}
          className={`h-12 px-8 rounded-full font-medium text-sm transition-all duration-200 inline-flex items-center justify-center gap-2.5 ${
            videoFile
              ? 'bg-[#000000] hover:bg-[#222222] text-[#FFFFFF] cursor-pointer shadow-md'
              : 'bg-[#000000]/40 text-[#FFFFFF]/60 cursor-not-allowed'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Start AI Vision Scanning</span>
        </button>
      </div>

    </div>
  );
};

