import React, { useRef, useState, useEffect } from 'react';
import { usePotholes } from '../../context/PotholeContext';
import { BoundingBox, GPSPoint, PotholeRecord, ProcessingLog } from '../../types/pothole';
import { getInterpolatedGPS } from '../../utils/gpsInterpolator';
import { generateTrackFromBaseCoords } from '../../utils/mockGpsGenerator';
import { analyzeFrame } from '../../services/potholeDetector';
import { findBestTrackMatch, PotholeTrack } from '../../services/potholeTracker';
import { getStreetNameFromCoords } from '../../utils/reverseGeocode';
import {
  Play,
  Pause,
  Cpu,
  MapPin,
  Activity,
  Gauge,
  CheckCircle2,
  ArrowRight,
  Terminal
} from 'lucide-react';

interface DetectionCanvasProps {
  videoFile: File;
  gpsPoints: GPSPoint[];
  presetId: string;
  onFinished: () => void;
}

interface FrameJob {
  id: number;
  runVersion: number;
  videoTimeSec: number;
  gps: GPSPoint;
  snapshotUrl: string;
  frameWidth: number;
  frameHeight: number;
}

export const DetectionCanvas: React.FC<DetectionCanvasProps> = ({
  videoFile,
  gpsPoints,
  onFinished
}) => {
  const { aiConfig, addPotholesBulk, setActiveTab } = usePotholes();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tracksRef = useRef<PotholeTrack[]>([]);
  const frameQueueRef = useRef<FrameJob[]>([]);
  const processingPromiseRef = useRef<Promise<void> | null>(null);
  const runVersionRef = useRef(0);
  const nextFrameIdRef = useRef(0);
  const hasFinalizedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [detectedRecords, setDetectedRecords] = useState<PotholeRecord[]>([]);
  const detectedRecordsRef = useRef<PotholeRecord[]>([]);
  const [currentGps, setCurrentGps] = useState<GPSPoint | null>(null);
  const [activeBoxes, setActiveBoxes] = useState<BoundingBox[]>([]);

  const [isCompleted, setIsCompleted] = useState(false);
  const lastSampleTimeRef = useRef<number>(0);
  const initialFrameScannedRef = useRef(false);

  // Initialize track points
  const [effectiveTrack, setEffectiveTrack] = useState<GPSPoint[]>([]);
  const effectiveTrackRef = useRef<GPSPoint[]>([]);

  useEffect(() => {
    const runVersion = runVersionRef.current + 1;
    runVersionRef.current = runVersion;
    detectedRecordsRef.current = [];
    tracksRef.current = [];
    frameQueueRef.current = [];
    setDetectedRecords([]);
    setActiveBoxes([]);
    setIsCompleted(false);
    initialFrameScannedRef.current = false;
    lastSampleTimeRef.current = 0;
    hasFinalizedRef.current = false;
    const videoUrl = URL.createObjectURL(videoFile);
    if (videoRef.current) {
      videoRef.current.src = videoUrl;
    }
    return () => {
      if (runVersionRef.current === runVersion) runVersionRef.current += 1;
      frameQueueRef.current = [];
      URL.revokeObjectURL(videoUrl);
    };
  }, [videoFile]);

  const addLog = (type: ProcessingLog['type'], message: string) => {
    const logItem: ProcessingLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    };
    setLogs(prev => [logItem, ...prev].slice(0, 50));
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration || 10;
    setDuration(dur);

    // Prepare GPS track
    let track = gpsPoints;
    if (!track || track.length === 0) {
      track = generateTrackFromBaseCoords(dur);
      addLog('info', `Using GPS track relative to current position`);
    } else {
      addLog('info', `Loaded ${track.length} telemetry GPS points from log file`);
    }
    effectiveTrackRef.current = track;
    setEffectiveTrack(track);

    const modelName = aiConfig.activeModelPreset === 'rdd2022-custom' ? 'YOLOv12 PyResearch' : 'Roboflow YOLO';
    addLog('ai', `Initialized AI Engine (${modelName})`);

    // Auto start
    playVideo();
  };

  const handleLoadedData = () => {
    if (initialFrameScannedRef.current || !videoRef.current || !canvasRef.current || effectiveTrackRef.current.length === 0) return;
    initialFrameScannedRef.current = true;
    const initialGps = getInterpolatedGPS(effectiveTrackRef.current, 0);
    enqueueFrame(0, initialGps);
  };

  const playVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
      addLog('info', 'Started video playback & AI frame scanning stream');
    }
  };

  const pauseVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const t = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setCurrentTime(t);
    setProgress((t / dur) * 100);

    // Update GPS telemetry display
    const gps = getInterpolatedGPS(effectiveTrack, t);
    setCurrentGps(gps);

    // Sample frame based on configured sample rate
    if (!initialFrameScannedRef.current) {
      initialFrameScannedRef.current = true;
      lastSampleTimeRef.current = t;
      enqueueFrame(t, gps);
    } else if (t - lastSampleTimeRef.current >= aiConfig.sampleRateSeconds) {
      lastSampleTimeRef.current = t;
      enqueueFrame(t, gps);
    }
  };

  const enqueueFrame = (videoTimeSec: number, gps: GPSPoint) => {
    if (!canvasRef.current || !videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    frameQueueRef.current.push({
      id: nextFrameIdRef.current++,
      runVersion: runVersionRef.current,
      videoTimeSec,
      gps,
      snapshotUrl: canvas.toDataURL('image/jpeg', 0.85),
      frameWidth: canvas.width,
      frameHeight: canvas.height,
    });
    void drainFrameQueue();
  };

  const drainFrameQueue = (): Promise<void> => {
    if (processingPromiseRef.current) return processingPromiseRef.current;

    const processor = (async () => {
      while (frameQueueRef.current.length > 0) {
        const job = frameQueueRef.current.shift()!;
        await processFrame(job);
      }
    })();

    processingPromiseRef.current = processor;
    void processor.finally(() => {
      if (processingPromiseRef.current === processor) {
        processingPromiseRef.current = null;
        if (frameQueueRef.current.length > 0) void drainFrameQueue();
      }
    });
    return processor;
  };

  const enrichRecordLocation = async (trackId: string, gps: GPSPoint, runVersion: number) => {
    const streetName = await getStreetNameFromCoords(gps.latitude, gps.longitude);
    if (runVersion !== runVersionRef.current) return;

    const track = tracksRef.current.find(item => item.record.trackId === trackId);
    if (!track) return;

    track.record = { ...track.record, streetName };
    detectedRecordsRef.current = tracksRef.current.map(item => item.record);
    setDetectedRecords([...detectedRecordsRef.current]);
  };

  const processFrame = async (job: FrameJob) => {
    if (job.runVersion !== runVersionRef.current) return;

    try {
      const res = await analyzeFrame(job.snapshotUrl, aiConfig);
      if (job.runVersion !== runVersionRef.current) return;

      if (res.detected && res.boundingBoxes.length > 0) {
        setActiveBoxes(res.boundingBoxes);

        for (let idx = 0; idx < res.boundingBoxes.length; idx++) {
          const box = res.boundingBoxes[idx];
          const area = Math.round(box.width * job.frameWidth * box.height * job.frameHeight * 0.35);
          const existingIdx = findBestTrackMatch(
            tracksRef.current,
            box,
            job.videoTimeSec,
            job.id
          );

          if (existingIdx >= 0) {
            const track = tracksRef.current[existingIdx];
            const old = track.record;
            const shouldUseNewEvidence = box.confidence >= old.confidence;
            const updatedRecord: PotholeRecord = {
              ...old,
              confidence: Math.max(old.confidence, box.confidence),
              estimatedAreaCm2: Math.max(old.estimatedAreaCm2, area),
              observationCount: (old.observationCount || 1) + 1,
              ...(shouldUseNewEvidence
                ? { snapshotUrl: job.snapshotUrl, boundingBox: box }
                : {}),
            };
            track.record = updatedRecord;
            track.lastBoundingBox = box;
            track.lastSeenVideoTime = job.videoTimeSec;
            track.lastFrameId = job.id;
            detectedRecordsRef.current = tracksRef.current.map(item => item.record);
            setDetectedRecords([...detectedRecordsRef.current]);
          } else {
            const trackId = `track-${job.id}-${idx}`;

            const newRecord: PotholeRecord = {
              id: `ph-det-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
              runId: `run-${job.runVersion}`,
              trackId,
              observationCount: 1,
              timestamp: new Date().toISOString(),
              videoTimeOffset: Number(job.videoTimeSec.toFixed(2)),
              latitude: job.gps.latitude,
              longitude: job.gps.longitude,
              streetName: `Loc: ${job.gps.latitude.toFixed(4)}, ${job.gps.longitude.toFixed(4)}`,
              severity: box.width > 0.24 || box.height > 0.20 ? 'Critical' : 'Moderate',
              confidence: box.confidence,
              estimatedAreaCm2: Math.max(220, area),
              speedKmH: job.gps.speed || 40,
              repairStatus: 'Reported',
              detectionSource: res.source,
              snapshotUrl: job.snapshotUrl,
              boundingBox: box
            };

            tracksRef.current.push({
              record: newRecord,
              lastBoundingBox: box,
              lastSeenVideoTime: job.videoTimeSec,
              lastFrameId: job.id,
            });
            detectedRecordsRef.current = tracksRef.current.map(item => item.record);
            setDetectedRecords([...detectedRecordsRef.current]);
            void enrichRecordLocation(trackId, job.gps, job.runVersion);
            addLog(
              'success',
              `New Pothole #${tracksRef.current.length} Registered (${box.confidence}% Conf) at ${newRecord.streetName}`
            );
          }
        }
      } else {
        setActiveBoxes([]);
      }
    } catch (err) {
      console.warn('Frame processing exception:', err);
    }
  };

  const handleEnded = async () => {
    setIsPlaying(false);
    await drainFrameQueue();
    if (hasFinalizedRef.current) return;
    hasFinalizedRef.current = true;

    const finalRecords = detectedRecordsRef.current;

    addLog('success', `Video Analysis Completed! Preserved ${finalRecords.length} independently tracked potholes.`);

    if (finalRecords.length > 0) {
      await addPotholesBulk(finalRecords);
    }
    setIsCompleted(true);
  };

  const handleRedirectToMap = () => {
    onFinished();
    setActiveTab('map');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-in fade-in duration-200">

      {/* Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <Cpu className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Real-Time AI Vision Scanner HUD
            </h3>
            <p className="text-xs text-slate-400">
              Roboflow Deep Learning Frame Analysis & Timestamp Telemetry Correlation
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300">FPS: <strong className="text-cyan-400">29.9</strong></span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300">Detected: <strong className="text-amber-400">{detectedRecords.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Grid: Video Player + Canvas HUD & Right Log Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left 2 Cols: Canvas Video Viewport */}
        <div className="lg:col-span-2 space-y-3">

          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl group">

            {/* HTML5 Video Element (Hidden rendering source) */}
            <video
              ref={videoRef}
              onLoadedMetadata={handleLoadedMetadata}
              onLoadedData={handleLoadedData}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Canvas Overlay for HUD, Laser Scan Lines & Bounding Boxes */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* AI Bounding Box Overlays */}
            {activeBoxes.map((box, idx) => (
              <div
                key={idx}
                className="absolute border-2 border-cyan-400 bg-cyan-400/15 rounded shadow-lg shadow-cyan-500/40 transition-all duration-75 animate-pulse"
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.width * 100}%`,
                  height: `${box.height * 100}%`,
                }}
              >
                <div className="absolute -top-6 left-0 bg-cyan-500 text-slate-950 font-mono text-[10px] font-extrabold px-2 py-0.5 rounded shadow flex items-center gap-1">
                  <span>POTHOLE {box.confidence}%</span>
                </div>
              </div>
            ))}

            {/* Laser Line Scanning Animation */}
            {isPlaying && (
              <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#00f2fe] animate-scan-line pointer-events-none" />
            )}

            {/* Top Telemetry HUD Overlay */}
            {currentGps && (
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>LAT: <strong>{currentGps.latitude}</strong></span>
                  <span>LNG: <strong>{currentGps.longitude}</strong></span>
                </div>
                <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-amber-300 flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  <span>{currentGps.speed} KM/H</span>
                </div>
              </div>
            )}

            {/* Controls Overlay Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-4 flex items-center justify-between gap-4">
              <button
                onClick={() => (isPlaying ? pauseVideo() : playVideo())}
                className="p-2.5 bg-cyan-400 text-slate-950 hover:bg-cyan-300 rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/20"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              {/* Progress Slider */}
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>{currentTime.toFixed(1)}s</span>
                  <span>{duration.toFixed(1)}s</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Right 1 Col: Live AI Processing Log Terminal */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-[420px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" /> Live AI Telemetry Stream
            </span>
            <span className="text-[10px] font-mono text-cyan-400 uppercase">
              {aiConfig.activeModelPreset === 'rdd2022-custom' ? 'YOLOv12 PyResearch' : 'Roboflow YOLO'} Active
            </span>
          </div>

          {/* Log Items Scroll Container */}
          <div className="flex-1 overflow-y-auto my-3 space-y-2 pr-1 font-mono text-[11px] scrollbar-thin">
            {logs.length === 0 ? (
              <div className="text-slate-500 text-center py-10">Waiting for video stream...</div>
            ) : (
              logs.map((log) => {
                const colorMap = {
                  info: 'text-slate-400 border-slate-800',
                  success: 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20',
                  warning: 'text-amber-400 border-amber-500/20 bg-amber-950/20',
                  error: 'text-rose-400 border-rose-500/20 bg-rose-950/20',
                  ai: 'text-cyan-400 border-cyan-500/20 bg-cyan-950/20',
                };
                return (
                  <div
                    key={log.id}
                    className={`p-2 rounded-lg border text-[11px] leading-snug ${colorMap[log.type]}`}
                  >
                    <span className="text-slate-600 mr-2">[{log.timestamp}]</span>
                    <span>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Model: <strong className="text-cyan-400">{aiConfig.activeModelPreset === 'rdd2022-custom' ? 'YOLOv12 PyResearch' : 'Roboflow YOLO'}</strong></span>
            <span>Target: <strong className="text-emerald-400">Pothole Hazard</strong></span>
          </div>
        </div>

      </div>

      {/* Processing Completed Dialog Modal */}
      {isCompleted && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in zoom-in duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Detection Run Successfully Completed!</h3>
              <p className="text-xs text-slate-300">
                Mapped <strong>{detectedRecords.length}</strong> new pothole hazards to the spatial database.
              </p>
            </div>
          </div>
          <button
            onClick={handleRedirectToMap}
            className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <span>Proceed to GIS Map View</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
