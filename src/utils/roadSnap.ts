import { LBS_MARG_CORRIDOR_WAYPOINTS } from './mockGpsGenerator';

export interface RoadCoord {
  lat: number;
  lng: number;
}

/**
 * Projects a point onto a line segment [p1, p2] and returns the closest coordinate and distance in meters
 */
export function projectPointToSegment(
  p: RoadCoord,
  p1: RoadCoord,
  p2: RoadCoord
): { lat: number; lng: number; distMeters: number; t: number } {
  const dLat = p2.lat - p1.lat;
  const dLng = p2.lng - p1.lng;
  const l2 = dLat * dLat + dLng * dLng;

  if (l2 === 0) {
    const dLatM = (p.lat - p1.lat) * 111000;
    const dLngM = (p.lng - p1.lng) * 111000 * Math.cos((p.lat * Math.PI) / 180);
    return {
      lat: p1.lat,
      lng: p1.lng,
      distMeters: Math.hypot(dLatM, dLngM),
      t: 0,
    };
  }

  let t = ((p.lat - p1.lat) * dLat + (p.lng - p1.lng) * dLng) / l2;
  t = Math.max(0, Math.min(1, t));

  const projLat = p1.lat + t * dLat;
  const projLng = p1.lng + t * dLng;

  const dLatM = (p.lat - projLat) * 111000;
  const dLngM = (p.lng - projLng) * 111000 * Math.cos((p.lat * Math.PI) / 180);
  const distMeters = Math.hypot(dLatM, dLngM);

  return { lat: projLat, lng: projLng, distMeters, t };
}

/**
 * Snaps any GPS point to the nearest road corridor centerline if within maxSnapMeters (default 95m).
 * Optionally applies a bounded lateral lane offset (-1.8m to +1.8m) based on bounding box horizontal position.
 */
export function snapPointToRoadLine(
  point: RoadCoord,
  normalizedBoxX?: number,
  maxSnapMeters: number = 95
): { lat: number; lng: number; isSnapped: boolean } {
  const waypoints = LBS_MARG_CORRIDOR_WAYPOINTS;
  let best: { lat: number; lng: number; distMeters: number; segIdx: number } | null = null;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const proj = projectPointToSegment(point, waypoints[i], waypoints[i + 1]);
    if (!best || proj.distMeters < best.distMeters) {
      best = { ...proj, segIdx: i };
    }
  }

  if (best && best.distMeters <= maxSnapMeters) {
    let finalLat = best.lat;
    let finalLng = best.lng;

    // If normalized horizontal box position is provided (0 = left, 1 = right of vehicle)
    // apply small realistic lane displacement across the road (max ±2.0 meters)
    if (typeof normalizedBoxX === 'number' && !isNaN(normalizedBoxX)) {
      const p1 = waypoints[best.segIdx];
      const p2 = waypoints[best.segIdx + 1];
      const segBearing = Math.atan2(
        (p2.lng - p1.lng) * Math.cos((p1.lat * Math.PI) / 180),
        p2.lat - p1.lat
      );

      // Normal to segment (perpendicular)
      const perpAngle = segBearing + Math.PI / 2;
      const lateralMeters = (Math.max(0.05, Math.min(0.95, normalizedBoxX)) - 0.5) * 3.6; // ~3.6m road lane breadth

      finalLat += (lateralMeters * Math.cos(perpAngle)) / 111000;
      finalLng += (lateralMeters * Math.sin(perpAngle)) / (111000 * Math.cos((finalLat * Math.PI) / 180));
    }

    return {
      lat: Number(finalLat.toFixed(6)),
      lng: Number(finalLng.toFixed(6)),
      isSnapped: true,
    };
  }

  return {
    lat: point.lat,
    lng: point.lng,
    isSnapped: false,
  };
}

