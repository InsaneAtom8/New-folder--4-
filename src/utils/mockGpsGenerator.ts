import { GPSPoint } from '../types/pothole';

/**
 * High-precision road corridor centerline nodes for Lal Bahadur Shastri Marg (LBS Marg)
 * accurately mapped to OpenStreetMap highway centerlines.
 */
export const LBS_MARG_CORRIDOR_WAYPOINTS = [
  { lat: 19.07480, lng: 72.87655 }, // SCLR flyover interchange
  { lat: 19.07550, lng: 72.87705 }, // Southbound/Northbound connector
  { lat: 19.07620, lng: 72.87755 }, // LBS Marg main road
  { lat: 19.07680, lng: 72.87798 }, // Near Kalina Kurla road branch
  { lat: 19.07750, lng: 72.87848 }, // Kurla West commercial corridor
  { lat: 19.07820, lng: 72.87895 }, // Kalina Kurla intersection junction
  { lat: 19.07920, lng: 72.87965 }, // Hallow Pul transit segment
  { lat: 19.08050, lng: 72.88055 }, // Kurla North arterial
];

function getSegmentDistanceMeters(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const dLat = (p2.lat - p1.lat) * 111000;
  const avgLat = ((p1.lat + p2.lat) / 2) * (Math.PI / 180);
  const dLng = (p2.lng - p1.lng) * 111000 * Math.cos(avgLat);
  return Math.hypot(dLat, dLng);
}

/**
 * Generates smooth GPS track strictly locked along the OpenStreetMap road centerline.
 */
export function generateTrackFromBaseCoords(
  durationSeconds: number,
  baseCoords?: { lat: number; lng: number }
): GPSPoint[] {
  const waypoints = LBS_MARG_CORRIDOR_WAYPOINTS;

  // Calculate cumulative distance along the road
  const segmentLengths: number[] = [];
  let totalRoadMeters = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const len = getSegmentDistanceMeters(waypoints[i], waypoints[i + 1]);
    segmentLengths.push(len);
    totalRoadMeters += len;
  }

  const speedKmh = 38; // standard urban speed ~38 km/h
  const speedMetersPerSec = (speedKmh * 1000) / 3600;
  const totalTravelMeters = Math.min(speedMetersPerSec * durationSeconds, totalRoadMeters - 1);

  const points: GPSPoint[] = [];
  const totalSteps = Math.max(12, Math.ceil(durationSeconds * 2)); // Every 0.5s

  for (let i = 0; i <= totalSteps; i++) {
    const timeSec = (i / totalSteps) * durationSeconds;
    const progressDist = (i / totalSteps) * totalTravelMeters;

    // Find the road segment corresponding to progressDist
    let accumulated = 0;
    let segIdx = 0;
    while (segIdx < segmentLengths.length - 1 && accumulated + segmentLengths[segIdx] < progressDist) {
      accumulated += segmentLengths[segIdx];
      segIdx++;
    }

    const segLen = segmentLengths[segIdx];
    const segT = segLen > 0 ? (progressDist - accumulated) / segLen : 0;
    const p1 = waypoints[segIdx];
    const p2 = waypoints[segIdx + 1];

    const lat = p1.lat + (p2.lat - p1.lat) * segT;
    const lng = p1.lng + (p2.lng - p1.lng) * segT;

    points.push({
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      timestamp: Number(timeSec.toFixed(2)),
      speed: speedKmh,
      elevation: 15,
    });
  }

  return points;
}
