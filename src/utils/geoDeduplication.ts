import { PotholeRecord, BoundingBox, SeverityLevel } from '../types/pothole';

/**
 * Calculates the Haversine distance between two GPS coordinates in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates Intersection over Union (IoU) between two normalized bounding boxes
 */
export function calculateIoU(box1: BoundingBox, box2: BoundingBox): number {
  const x1_max = box1.x + box1.width;
  const y1_max = box1.y + box1.height;
  const x2_max = box2.x + box2.width;
  const y2_max = box2.y + box2.height;

  const interXmin = Math.max(box1.x, box2.x);
  const interYmin = Math.max(box1.y, box2.y);
  const interXmax = Math.min(x1_max, x2_max);
  const interYmax = Math.min(y1_max, y2_max);

  const interWidth = Math.max(0, interXmax - interXmin);
  const interHeight = Math.max(0, interYmax - interYmin);
  const interArea = interWidth * interHeight;

  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;
  const unionArea = area1 + area2 - interArea;

  if (unionArea <= 0) return 0;
  return interArea / unionArea;
}

/**
 * Performs Non-Maximum Suppression (NMS) on bounding boxes based on IoU.
 *
 * Nearby boxes are not necessarily duplicates: separate potholes can be close together in a
 * frame. Suppressing by centre distance merged unrelated detections, so only actual overlap is
 * used here.
 */
export function applyNMSBoundingBoxes(
  boxes: BoundingBox[],
  iouThreshold: number = 0.30
): BoundingBox[] {
  if (boxes.length <= 1) return boxes;

  // Sort boxes by confidence descending
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const selected: BoundingBox[] = [];

  while (sorted.length > 0) {
    const current = sorted.shift()!;
    selected.push(current);

    for (let i = sorted.length - 1; i >= 0; i--) {
      const candidate = sorted[i];
      const iou = calculateIoU(current, candidate);

      if (iou >= iouThreshold) {
        sorted.splice(i, 1);
      }
    }
  }

  return selected;
}

/**
 * Deduplicates legacy records from different analysis runs by geographic proximity.
 * Same-run records are already visually tracked and must stay separate even though they share
 * camera GPS coordinates.
 */
export function deduplicatePotholeRecords(
  records: PotholeRecord[],
  radiusMeters: number = 15
): PotholeRecord[] {
  if (records.length <= 1) return records;

  const result: PotholeRecord[] = [];
  const visited = new Set<string>();

  const severityWeight: Record<SeverityLevel, number> = {
    Critical: 3,
    Moderate: 2,
    Minor: 1,
  };

  for (let i = 0; i < records.length; i++) {
    const main = records[i];
    if (visited.has(main.id)) continue;

    visited.add(main.id);
    const cluster: PotholeRecord[] = [main];

    for (let j = i + 1; j < records.length; j++) {
      const target = records[j];
      if (visited.has(target.id)) continue;

      const distMeters = calculateHaversineDistance(
        main.latitude,
        main.longitude,
        target.latitude,
        target.longitude
      );

      const belongsToSameRun = Boolean(main.runId && target.runId && main.runId === target.runId);

      if (!belongsToSameRun && distMeters <= radiusMeters) {
        cluster.push(target);
        visited.add(target.id);
      }
    }

    if (cluster.length === 1) {
      result.push(cluster[0]);
    } else {
      // Pick record with best confidence & snapshot
      const maxConfRecord = cluster.reduce((best, item) =>
        item.confidence > best.confidence ? item : best
        , cluster[0]);

      const maxArea = Math.max(...cluster.map((c) => c.estimatedAreaCm2));

      // Highest severity in cluster
      const highestSeverity = cluster.reduce((bestSev, item) =>
        severityWeight[item.severity] > severityWeight[bestSev] ? item.severity : bestSev
        , cluster[0].severity);

      // Average latitude & longitude for geographic precision
      const avgLat = cluster.reduce((acc, c) => acc + c.latitude, 0) / cluster.length;
      const avgLng = cluster.reduce((acc, c) => acc + c.longitude, 0) / cluster.length;

      const mergedRecord: PotholeRecord = {
        ...maxConfRecord,
        latitude: avgLat,
        longitude: avgLng,
        severity: highestSeverity,
        estimatedAreaCm2: maxArea,
        confidence: Math.max(...cluster.map((c) => c.confidence)),
      };

      result.push(mergedRecord);
    }
  }

  return result;
}
