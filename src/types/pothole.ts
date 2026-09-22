export type SeverityLevel = 'Minor' | 'Moderate' | 'Critical';
export type RepairStatus = 'Reported' | 'In Review' | 'Scheduled' | 'Repaired';

export interface BoundingBox {
  x: number;      // Center X (normalized 0-1 or pixels)
  y: number;      // Center Y
  width: number;  // Width
  height: number; // Height
  confidence: number;
  class: string;
}

export interface GPSPoint {
  latitude: number;
  longitude: number;
  timestamp: number; // Seconds into video or Epoch milliseconds
  elevation?: number;
  speed?: number;    // km/h
  heading?: number;  // degrees
}

export interface PotholeRecord {
  id: string;
  /** Identifies one video-analysis run so same-run records are never spatially merged. */
  runId?: string;
  /** Stable visual track ID within a video-analysis run. */
  trackId?: string;
  /** Number of sampled frames that contributed evidence for this record. */
  observationCount?: number;
  timestamp: string;          // ISO string
  videoTimeOffset: number;    // Seconds into video
  latitude: number;
  longitude: number;
  streetName?: string;
  severity: SeverityLevel;
  confidence: number;         // Percentage 0-100
  estimatedAreaCm2: number;   // Estimated physical surface area in cm²
  speedKmH: number;           // Vehicle speed at moment of detection
  repairStatus: RepairStatus;
  detectionSource: 'Roboflow YOLO' | 'YOLOv12 PyResearch' | 'RDD2022 Custom D40' | 'Local Computer Vision';
  snapshotUrl?: string;       // Base64 thumbnail of video frame with bounding box
  /** Normalized top-left x/y and normalized width/height for the stored evidence frame. */
  boundingBox: Pick<BoundingBox, 'x' | 'y' | 'width' | 'height'>;
}

export interface AIConfig {
  apiKey: string;
  modelId: string;
  confidenceThreshold: number; // e.g. 0.15
  sampleRateSeconds: number;   // e.g. 0.2 seconds between frame dispatches
  useLocalFallback: boolean;
  activeModelPreset: 'roboflow-yolo' | 'rdd2022-custom';
}

export interface ProcessingLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'ai';
  message: string;
}
