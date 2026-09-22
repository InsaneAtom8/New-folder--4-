import { GPSPoint } from '../types/pothole';

/**
 * Generates smooth GPS track interpolated across video duration starting from base coordinates
 */
export function generateTrackFromBaseCoords(
  durationSeconds: number,
  baseCoords: { lat: number; lng: number } = { lat: 19.0760, lng: 72.8777 }
): GPSPoint[] {
  const points: GPSPoint[] = [];
  const totalPoints = Math.max(10, Math.ceil(durationSeconds * 2)); // Every 0.5s

  let currentLat = baseCoords.lat;
  let currentLng = baseCoords.lng;
  const speedMetersPerSec = (35 * 1000) / 3600;

  for (let i = 0; i <= totalPoints; i++) {
    const timeSec = (i / totalPoints) * durationSeconds;
    const distanceMoved = speedMetersPerSec * (durationSeconds / totalPoints);
    const angleRad = ((35 + Math.sin(i / 10) * 8) * Math.PI) / 180;

    const deltaLat = (distanceMoved * Math.cos(angleRad)) / 111000;
    const deltaLng = (distanceMoved * Math.sin(angleRad)) / (111000 * Math.cos((currentLat * Math.PI) / 180));

    currentLat += deltaLat;
    currentLng += deltaLng;

    points.push({
      latitude: Number(currentLat.toFixed(6)),
      longitude: Number(currentLng.toFixed(6)),
      timestamp: Number(timeSec.toFixed(2)),
      speed: 35,
      elevation: 15,
    });
  }

  return points;
}
