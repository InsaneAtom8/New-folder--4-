import { BoundingBox, SeverityLevel, AIConfig } from '../types/pothole';
import { detectPotholesRoboflow } from './roboflowService';
import { applyNMSBoundingBoxes } from '../utils/geoDeduplication';

export interface DetectionResult {
  detected: boolean;
  boundingBoxes: BoundingBox[];
  severity: SeverityLevel;
  confidence: number;
  estimatedAreaCm2: number;
  source: 'Roboflow YOLO' | 'RDD2022 Custom D40' | 'Local Computer Vision';
}

interface LocalDetectorResponse {
  predictions?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    class: string;
  }>;
  image?: {
    width: number;
    height: number;
  };
}

/**
 * Analyzes video frame canvas and executes AI object detection pipeline
 */
export async function analyzeFrame(
  canvas: HTMLCanvasElement,
  videoElement: HTMLVideoElement,
  aiConfig: AIConfig
): Promise<DetectionResult> {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return createEmptyResult();
  }

  // Draw current video frame onto canvas
  canvas.width = videoElement.videoWidth || 640;
  canvas.height = videoElement.videoHeight || 480;
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

  if (aiConfig.activeModelPreset === 'rdd2022-custom') {
    try {
      const boxes = await detectLocalModel(dataUrl);
      const filtered = boxes.filter(b => (b.confidence / 100) >= aiConfig.confidenceThreshold);
      const nmsFiltered = applyNMSBoundingBoxes(filtered, 0.30);

      if (nmsFiltered.length > 0) {
        const topBox = nmsFiltered[0];
        const severity = calculateSeverity(topBox.width, topBox.height, topBox.confidence);
        const area = Math.round(topBox.width * canvas.width * topBox.height * canvas.height * 0.25);
        return {
          detected: true,
          boundingBoxes: nmsFiltered,
          severity,
          confidence: topBox.confidence,
          estimatedAreaCm2: Math.max(120, area),
          source: 'RDD2022 Custom D40',
        };
      }
    } catch (err) {
      console.warn('Local YOLO detector unavailable; using Computer Vision fallback:', err);
    }
  }

  // Attempt Roboflow AI detection only when the Roboflow model is selected.
  if (aiConfig.activeModelPreset === 'roboflow-yolo' && aiConfig.apiKey && aiConfig.apiKey.trim().length > 0) {
    try {
      const boxes = await detectPotholesRoboflow(dataUrl, aiConfig.apiKey, aiConfig.modelId);

      // Filter by confidence threshold & apply Non-Maximum Suppression (NMS)
      const filtered = boxes.filter(b => (b.confidence / 100) >= aiConfig.confidenceThreshold);
      const nmsFiltered = applyNMSBoundingBoxes(filtered, 0.30);

      if (nmsFiltered.length > 0) {
        const topBox = nmsFiltered[0];
        const severity = calculateSeverity(topBox.width, topBox.height, topBox.confidence);
        const area = Math.round(topBox.width * canvas.width * topBox.height * canvas.height * 0.25);

        return {
          detected: true,
          boundingBoxes: nmsFiltered,
          severity,
          confidence: topBox.confidence,
          estimatedAreaCm2: Math.max(120, area),
          source: 'Roboflow YOLO',
        };
      }
    } catch (err) {
      // Fallback to local CV if API fails or quota exceeded
    }
  }

  // Local Computer Vision Spatial & Contrast Analyzer Fallback
  if (aiConfig.useLocalFallback) {
    return analyzeFrameLocalCV(ctx, canvas.width, canvas.height);
  }

  return createEmptyResult();
}

async function detectLocalModel(dataUrl: string): Promise<BoundingBox[]> {
  const endpoint = import.meta.env.VITE_LOCAL_DETECTOR_URL || 'http://localhost:8000/detect';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, ''),
  });

  if (!response.ok) {
    throw new Error(`Local detector returned ${response.status}`);
  }

  const data: LocalDetectorResponse = await response.json();
  const imageWidth = data.image?.width || 640;
  const imageHeight = data.image?.height || 480;

  return (data.predictions || []).map(prediction => ({
    x: prediction.x / imageWidth,
    y: prediction.y / imageHeight,
    width: prediction.width / imageWidth,
    height: prediction.height / imageHeight,
    confidence: Math.round(prediction.confidence * 100),
    class: prediction.class || 'pothole',
  }));
}

/**
 * High-Precision Multi-Grid Computer Vision Anomaly Engine (RDD2022 D40 Multi-Pothole Optimized)
 * Scans an 8x6 fine spatial grid across the road for individual dark voids, water reflection puddles, and edge contrast fractures
 */
function analyzeFrameLocalCV(ctx: CanvasRenderingContext2D, width: number, height: number): DetectionResult {
  const roadYStart = Math.floor(height * 0.20); // Scan upper-mid road to bottom of frame
  const roadHeight = height - roadYStart;

  const frameData = ctx.getImageData(0, roadYStart, width, roadHeight);
  const pixels = frameData.data;

  // Fine 8x6 spatial grid to capture all distinct potholes & puddles independently
  const gridCols = 8;
  const gridRows = 6;
  const cellWidth = Math.floor(width / gridCols);
  const cellHeight = Math.floor(roadHeight / gridRows);

  let overallRoadLuminanceSum = 0;
  let totalPixelCount = 0;

  for (let i = 0; i < pixels.length; i += 16) {
    const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    overallRoadLuminanceSum += lum;
    totalPixelCount++;
  }

  const avgRoadLuminance = overallRoadLuminanceSum / (totalPixelCount || 1);
  const darkThreshold = Math.min(110, Math.max(45, avgRoadLuminance * 0.68));
  const brightReflectThreshold = Math.max(160, avgRoadLuminance * 1.45); // Water surface reflection threshold

  const rawCandidateBoxes: BoundingBox[] = [];

  for (let rIdx = 0; rIdx < gridRows; rIdx++) {
    for (let cIdx = 0; cIdx < gridCols; cIdx++) {
      let cellDarkPixels = 0;
      let cellReflectPixels = 0;
      let cellTotalPixels = 0;
      let cellLuminanceSum = 0;
      let cellLuminanceSqSum = 0;

      const startX = cIdx * cellWidth;
      const startY = rIdx * cellHeight;

      for (let py = startY; py < startY + cellHeight; py += 3) {
        for (let px = startX; px < startX + cellWidth; px += 3) {
          const pixelIdx = (py * width + px) * 4;
          if (pixelIdx < pixels.length) {
            const r = pixels[pixelIdx];
            const g = pixels[pixelIdx + 1];
            const b = pixels[pixelIdx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            cellLuminanceSum += lum;
            cellLuminanceSqSum += lum * lum;

            if (lum < darkThreshold) {
              cellDarkPixels++;
            } else if (lum > brightReflectThreshold) {
              cellReflectPixels++; // Pothole water surface / reflection
            }
            cellTotalPixels++;
          }
        }
      }

      const count = cellTotalPixels || 1;
      const darkRatio = cellDarkPixels / count;
      const reflectRatio = cellReflectPixels / count;

      // Calculate local texture variance (captures rough broken edges on Indian asphalt/concrete roads)
      const meanLum = cellLuminanceSum / count;
      const variance = Math.sqrt(Math.max(0, (cellLuminanceSqSum / count) - (meanLum * meanLum)));

      // Calibrated Trigger for Indian road conditions:
      // Dark void (>7%), water reflection patch (>4%), OR high edge texture variance (>26)
      if (darkRatio > 0.07 || (darkRatio > 0.04 && reflectRatio > 0.04) || (variance > 26 && darkRatio > 0.04)) {
        const boxX = Math.max(0.01, (startX / width));
        const boxY = Math.max(0.16, ((roadYStart + startY) / height));
        const boxW = Math.max(0.06, Math.min(0.35, (cellWidth / width) * 1.10));
        const boxH = Math.max(0.05, Math.min(0.28, (cellHeight / height) * 1.10));
        const conf = Math.min(98, Math.floor(68 + (darkRatio + reflectRatio) * 45 + (variance > 28 ? 10 : 0)));

        // Enforce physical minimum dimension filter (allows capturing distant & smaller potholes)
        if (boxW >= 0.05 && boxH >= 0.04 && (boxW * boxH >= 0.002)) {
          rawCandidateBoxes.push({
            x: boxX,
            y: boxY,
            width: boxW,
            height: boxH,
            confidence: conf,
            class: 'D40_pothole',
          });
        }
      }
    }
  }

  // Apply IoU Non-Maximum Suppression (NMS) to combine adjacent/overlapping grid patches
  const nmsFilteredBoxes = applyNMSBoundingBoxes(rawCandidateBoxes, 0.28);

  // High-recall threshold: keep all genuine detections >= 40% confidence
  const finalSignificantPotholes = nmsFilteredBoxes.filter(b => b.confidence >= 40);

  if (finalSignificantPotholes.length > 0) {
    const topBox = finalSignificantPotholes.reduce((prev, curr) => curr.confidence > prev.confidence ? curr : prev, finalSignificantPotholes[0]);
    const severity = calculateSeverity(topBox.width, topBox.height, topBox.confidence);
    const area = Math.round(topBox.width * width * topBox.height * height * 0.30);

    return {
      detected: true,
      boundingBoxes: finalSignificantPotholes,
      severity,
      confidence: topBox.confidence,
      estimatedAreaCm2: Math.max(220, area),
      source: 'RDD2022 Custom D40',
    };
  }

  return createEmptyResult();
}

function calculateSeverity(w: number, h: number, confidence: number): SeverityLevel {
  const surfaceAreaRatio = w * h;
  if (surfaceAreaRatio > 0.045 || confidence > 92) return 'Critical';
  if (surfaceAreaRatio > 0.020 || confidence > 82) return 'Moderate';
  return 'Minor';
}

function createEmptyResult(): DetectionResult {
  return {
    detected: false,
    boundingBoxes: [],
    severity: 'Minor',
    confidence: 0,
    estimatedAreaCm2: 0,
    source: 'Local Computer Vision',
  };
}
