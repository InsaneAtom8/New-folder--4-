import { GPSPoint } from '../types/pothole';

export interface RoutePreset {
  id: string;
  name: string;
  description: string;
  startLat: number;
  startLng: number;
  bearingDeg: number;
  avgSpeedKmH: number;
}

export const PRESET_ROUTES: RoutePreset[] = [
  {
    id: 'mumbai-western-express',
    name: 'Mumbai Western Express Highway',
    description: 'WEH Andheri to Borivali — Heavy Urban Traffic',
    startLat: 19.119190,
    startLng: 72.846580,
    bearingDeg: 20,
    avgSpeedKmH: 35,
  },
  {
    id: 'delhi-ring-road',
    name: 'Delhi Outer Ring Road',
    description: 'NH-48 Outer Ring Road — Multi-lane Expressway',
    startLat: 28.635308,
    startLng: 77.224990,
    bearingDeg: 110,
    avgSpeedKmH: 65,
  },
  {
    id: 'pune-fc-road',
    name: 'Pune FC Road — Shivajinagar',
    description: 'Fergusson College Road — Busy Residential Arterial',
    startLat: 18.521428,
    startLng: 73.847015,
    bearingDeg: 75,
    avgSpeedKmH: 28,
  },
  {
    id: 'bangalore-hosur-road',
    name: 'Bengaluru Hosur Road',
    description: 'Electronic City Flyover to Silk Board — IT Corridor',
    startLat: 12.917186,
    startLng: 77.622498,
    bearingDeg: 145,
    avgSpeedKmH: 42,
  },
  {
    id: 'chennai-ecr',
    name: 'Chennai East Coast Road (ECR)',
    description: 'ECR Besant Nagar — Coastal Highway',
    startLat: 12.997700,
    startLng: 80.267330,
    bearingDeg: 160,
    avgSpeedKmH: 58,
  },
];

/**
 * Generates a smooth, realistic GPS track for a video of specified duration in seconds
 */
export function generateSyntheticTrack(durationSeconds: number, presetId: string = 'mumbai-western-express'): GPSPoint[] {
  const preset = PRESET_ROUTES.find(r => r.id === presetId) || PRESET_ROUTES[0];
  const points: GPSPoint[] = [];

  const totalPoints = Math.max(10, Math.ceil(durationSeconds * 2)); // Every 0.5s
  let currentLat = preset.startLat;
  let currentLng = preset.startLng;

  // Conversion: ~111,000 meters per degree lat/lng
  const speedMetersPerSec = (preset.avgSpeedKmH * 1000) / 3600;

  for (let i = 0; i <= totalPoints; i++) {
    const timeSec = (i / totalPoints) * durationSeconds;

    // Add slight curve and micro-variations
    const speedVariation = (Math.sin(i / 5) * 4) + (Math.random() * 2 - 1);
    const actualSpeedSec = Math.max(15, speedMetersPerSec + speedVariation);

    const distanceMoved = actualSpeedSec * (durationSeconds / totalPoints); // meters

    const angleRad = ((preset.bearingDeg + Math.sin(i / 10) * 12) * Math.PI) / 180;
    const deltaLat = (distanceMoved * Math.cos(angleRad)) / 111000;
    const deltaLng = (distanceMoved * Math.sin(angleRad)) / (111000 * Math.cos((currentLat * Math.PI) / 180));

    currentLat += deltaLat;
    currentLng += deltaLng;

    points.push({
      latitude: Number(currentLat.toFixed(6)),
      longitude: Number(currentLng.toFixed(6)),
      timestamp: Number(timeSec.toFixed(2)),
      speed: Math.round(actualSpeedSec * 3.6),
      elevation: Math.round(15 + Math.sin(i / 8) * 5),
    });
  }

  return points;
}
