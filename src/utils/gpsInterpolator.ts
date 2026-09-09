import { GPSPoint } from '../types/pothole';

/**
 * Interpolates exact Latitude, Longitude, and Speed for a specific video time offset
 */
export function getInterpolatedGPS(points: GPSPoint[], videoTimeOffset: number): GPSPoint {
  if (!points || points.length === 0) {
    // Default center: Mumbai, Maharashtra, India
    return {
      latitude: 19.0760,
      longitude: 72.8777,
      timestamp: videoTimeOffset,
      speed: 35,
    };
  }

  if (points.length === 1) {
    return { ...points[0], timestamp: videoTimeOffset };
  }

  // Sort by timestamp
  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);

  // Before track start
  if (videoTimeOffset <= sorted[0].timestamp) {
    return { ...sorted[0], timestamp: videoTimeOffset };
  }

  // After track end
  const maxIdx = sorted.length - 1;
  if (videoTimeOffset >= sorted[maxIdx].timestamp) {
    return { ...sorted[maxIdx], timestamp: videoTimeOffset };
  }

  // Find bounding point pair
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];

    if (videoTimeOffset >= p1.timestamp && videoTimeOffset <= p2.timestamp) {
      const dt = p2.timestamp - p1.timestamp;
      const ratio = dt === 0 ? 0 : (videoTimeOffset - p1.timestamp) / dt;

      const lat = p1.latitude + (p2.latitude - p1.latitude) * ratio;
      const lon = p1.longitude + (p2.longitude - p1.longitude) * ratio;
      const speed = (p1.speed || 40) + ((p2.speed || 40) - (p1.speed || 40)) * ratio;
      const elevation = (p1.elevation || 10) + ((p2.elevation || 10) - (p1.elevation || 10)) * ratio;

      return {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lon.toFixed(6)),
        timestamp: videoTimeOffset,
        speed: Math.round(speed),
        elevation: Math.round(elevation),
      };
    }
  }

  return { ...sorted[0], timestamp: videoTimeOffset };
}
