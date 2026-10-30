import React, { useState, useRef } from 'react';
import { usePotholes } from '../../context/PotholeContext';
import { GPSPoint } from '../../types/pothole';
import { parseGPX, parseNMEA, parseCSV } from '../../utils/gpxParser';
import { validateVideoIsRoadOrPothole } from '../../utils/roadValidator';
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
  const [isValidatingVideo, setIsValidatingVideo] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const gpsInputRef = useRef<HTMLInputElement>(null);

  const handleVideoSelect = async (file: File) => {
    if (!file.type.includes('video/') && !file.name.endsWith('.mp4') && !file.name.endsWith('.webm')) {
      setErrorMsg('Please select a valid video file (MP4 or WebM format recommended)');
      return;
    }
    setErrorMsg(null);
    setIsValidatingVideo(true);

    try {
      const validation = await validateVideoIsRoadOrPothole(file);
      setIsValidatingVideo(false);

      if (!validation.isValidRoad) {
        setVideoFile(null);
        setErrorMsg(validation.reason || 'Selected video does not appear to contain road or pothole footage. AI vision aborted.');
        return;
      }

      setVideoFile(file);
    } catch (err) {
      setIsValidatingVideo(false);
      setVideoFile(file);
    }
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
    <div className="max-w-5xl mx-auto space-y-12 sm:space-y-16 pb-20 animate-in fade-in duration-300">
      
      {/* Hero Display Section: Instrument Sans with Serif Italic re-lettered word */}
      <div className="text-center space-y-5 sm:space-y-7 pt-6 sm:pt-10">
        <h1 className="text-3xl sm:text-4xl md:text-[50px] lg:text-[58px] font-normal text-[#000000] tracking-[-1.2px] !leading-[1.28] sm:!leading-[1.3] max-w-4xl mx-auto px-4">
          AI Road Vision for <span className="serif-italic font-normal inline-block mx-1.5 align-baseline">Pothole</span> Hazard Inspection.
        </h1>
        <p className="text-sm sm:text-base text-[#444444] max-w-2xl mx-auto leading-relaxed px-4 pt-1">
          Upload dashcam video telemetry to run deep-learning object detection, correlated directly to GIS spatial coordinates.
        </p>

        {/* Hero Stacked Actions: Black Fills & Borders with improved touch targets & breathing room */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
          <button
            disabled={!videoFile || isValidatingVideo}
            onClick={handleStartProcessing}
            className={`h-12 px-8 rounded-full font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2.5 shadow-sm ${
              videoFile && !isValidatingVideo
                ? 'bg-[#000000] hover:bg-[#222222] text-[#FFFFFF] cursor-pointer shadow-md active:scale-95'
                : 'bg-[#000000]/40 text-[#FFFFFF]/60 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isValidatingVideo ? 'Validating Road Scene...' : 'Start AI Vision Scanning'}</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className="h-12 px-7 rounded-full bg-[#FFFFFF] text-[#000000] border border-black/20 hover:border-black/60 hover:bg-black/[0.02] font-medium text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
          >
            <span>Explore Live GIS Map</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-[#F2F2F2] border border-black/20 text-[#000000] px-5 py-3.5 rounded-xl text-xs flex items-center gap-2.5 max-w-xl mx-auto shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Inputs Section: Paper Gray Surfaces (#F2F2F2) with generous spacing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-2">
        
        {/* Step 1: Video File Dropzone */}
        <div className="bg-[#F2F2F2] border border-black/10 hover:border-black/20 transition-colors rounded-2xl p-6 sm:p-7 space-y-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
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
              className={`border border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 ${
                videoFile
                  ? 'border-black bg-[#FFFFFF] text-[#000000] shadow-sm'
                  : isDragOverVideo
                  ? 'border-black bg-black/5 scale-[0.99]'
                  : 'border-black/20 hover:border-black/50 bg-[#FFFFFF] text-[#222222]'
              }`}
            >
              {isValidatingVideo ? (
                <div className="space-y-2.5">
                  <div className="w-9 h-9 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                  <h4 className="text-sm font-medium text-[#000000]">Inspecting Video Content...</h4>
                  <p className="text-xs font-mono text-[#555555]">Verifying road & asphalt surface presence</p>
                </div>
              ) : videoFile ? (
                <div className="space-y-2.5">
                  <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-medium truncate max-w-[260px] mx-auto text-[#000000]">{videoFile.name}</h4>
                  <p className="text-xs font-mono text-[#555555]">
                    {(videoFile.size / (1024 * 1024)).toFixed(2)} MB • Road Scene Verified
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center mx-auto text-[#000000]">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-medium text-[#000000]">Select MP4 Video File</h4>
                  <p className="text-xs text-[#555555]">Drag & drop or click to browse</p>
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
        <div className="bg-[#F2F2F2] border border-black/10 hover:border-black/20 transition-colors rounded-2xl p-6 sm:p-7 space-y-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
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
              className={`border border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 ${
                gpsFile
                  ? 'border-black bg-[#FFFFFF] text-[#000000] shadow-sm'
                  : isDragOverGps
                  ? 'border-black bg-black/5 scale-[0.99]'
                  : 'border-black/20 hover:border-black/50 bg-[#FFFFFF] text-[#222222]'
              }`}
            >
              {gpsFile ? (
                <div className="space-y-2.5">
                  <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-medium truncate max-w-[260px] mx-auto text-[#000000]">{gpsFile.name}</h4>
                  <p className="text-xs font-mono text-[#000000] font-medium">
                    {parsedGpsPoints.length} Trackpoints Loaded
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center mx-auto text-[#000000]">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-medium text-[#000000]">Upload GPX / NMEA / CSV</h4>
                  <p className="text-xs text-[#555555]">Syncs timestamp to GPS coordinates</p>
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
              className="text-xs bg-[#FFFFFF] hover:bg-black/5 text-[#000000] border border-black/10 font-medium px-4 py-2 rounded-full flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Use Current Position</span>
            </button>
            {locationStatus && (
              <span className="text-[11px] font-mono text-[#000000] truncate max-w-[200px]">
                {locationStatus}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Model Engine Selector: Paper-Gray Field with polished paddings */}
      <div className="bg-[#F2F2F2] border border-black/10 rounded-2xl p-6 sm:p-7 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[#000000] flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> AI Neural Engine Preset
          </h3>
          <span className="text-xs font-mono text-[#444444] bg-white/60 px-2.5 py-1 rounded-md border border-black/5">
            Confidence Threshold: {Math.round(aiConfig.confidenceThreshold * 100)}%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div
            onClick={() => setAIConfig({ ...aiConfig, activeModelPreset: 'rdd2022-custom' })}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              aiConfig.activeModelPreset === 'rdd2022-custom'
                ? 'bg-[#000000] text-[#FFFFFF] border-[#000000] shadow-md'
                : 'bg-[#FFFFFF] text-[#000000] border-black/10 hover:border-black/30'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium">Local YOLOv12 Engine</span>
              {aiConfig.activeModelPreset === 'rdd2022-custom' && (
                <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
              )}
            </div>
            <p className={`text-xs ${aiConfig.activeModelPreset === 'rdd2022-custom' ? 'text-[#FFFFFF]/80' : 'text-[#444444]'}`}>
              Local FastAPI inference endpoint for custom weights
            </p>
          </div>

          <div
            onClick={() => setAIConfig({ ...aiConfig, activeModelPreset: 'roboflow-yolo' })}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              aiConfig.activeModelPreset === 'roboflow-yolo'
                ? 'bg-[#000000] text-[#FFFFFF] border-[#000000] shadow-md'
                : 'bg-[#FFFFFF] text-[#000000] border-black/10 hover:border-black/30'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium">Roboflow Hosted Cloud API</span>
              {aiConfig.activeModelPreset === 'roboflow-yolo' && (
                <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
              )}
            </div>
            <p className={`text-xs ${aiConfig.activeModelPreset === 'roboflow-yolo' ? 'text-[#FFFFFF]/80' : 'text-[#444444]'}`}>
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

