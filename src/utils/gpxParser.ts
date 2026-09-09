import { GPSPoint } from '../types/pothole';

/**
 * Parses GPX XML content into timestamped GPS trackpoints
 */
export function parseGPX(xmlText: string): GPSPoint[] {
  const points: GPSPoint[] = [];
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const trkpts = xmlDoc.querySelectorAll('trkpt');

    let firstTime: number | null = null;

    trkpts.forEach((pt, index) => {
      const lat = parseFloat(pt.getAttribute('lat') || '0');
      const lon = parseFloat(pt.getAttribute('lon') || '0');
      const eleEl = pt.querySelector('ele');
      const timeEl = pt.querySelector('time');

      let timeSec = index * 0.5; // fallback
      if (timeEl && timeEl.textContent) {
        const dateMs = new Date(timeEl.textContent).getTime();
        if (firstTime === null) firstTime = dateMs;
        timeSec = (dateMs - firstTime) / 1000;
      }

      points.push({
        latitude: lat,
        longitude: lon,
        timestamp: timeSec,
        elevation: eleEl ? parseFloat(eleEl.textContent || '0') : undefined,
        speed: 35 + Math.random() * 15, // km/h fallback if not present
      });
    });
  } catch (err) {
    console.error('Error parsing GPX file:', err);
  }
  return points;
}

/**
 * Parses raw NMEA 0183 log text ($GPRMC or $GPGGA lines)
 */
export function parseNMEA(nmeaText: string): GPSPoint[] {
  const points: GPSPoint[] = [];
  const lines = nmeaText.split(/\r?\n/);
  let timeSec = 0;

  lines.forEach((line) => {
    if (line.startsWith('$GPRMC') || line.startsWith('$GPGGA')) {
      const parts = line.split(',');
      if (parts.length > 6) {
        const rawLat = parts[2];
        const latDir = parts[3];
        const rawLon = parts[4];
        const lonDir = parts[5];

        if (rawLat && rawLon) {
          let lat = parseFloat(rawLat.substring(0, 2)) + parseFloat(rawLat.substring(2)) / 60;
          if (latDir === 'S') lat = -lat;

          let lon = parseFloat(rawLon.substring(0, 3)) + parseFloat(rawLon.substring(3)) / 60;
          if (lonDir === 'W') lon = -lon;

          let speed = 40;
          if (parts[7] && !isNaN(parseFloat(parts[7]))) {
            speed = parseFloat(parts[7]) * 1.852; // knots to km/h
          }

          points.push({
            latitude: lat,
            longitude: lon,
            timestamp: timeSec,
            speed: speed,
          });
          timeSec += 1;
        }
      }
    }
  });

  return points;
}

/**
 * Parses CSV log file with columns: lat, lon, time/timestamp, speed
 */
export function parseCSV(csvText: string): GPSPoint[] {
  const points: GPSPoint[] = [];
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length <= 1) return points;

  const header = lines[0].toLowerCase().split(',');
  const latIdx = header.findIndex(h => h.includes('lat'));
  const lonIdx = header.findIndex(h => h.includes('lon') || h.includes('lng'));
  const timeIdx = header.findIndex(h => h.includes('time') || h.includes('sec'));
  const speedIdx = header.findIndex(h => h.includes('speed'));

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length > Math.max(latIdx, lonIdx)) {
      const lat = parseFloat(cols[latIdx]);
      const lon = parseFloat(cols[lonIdx]);
      const timestamp = timeIdx >= 0 ? parseFloat(cols[timeIdx]) : i * 0.5;
      const speed = speedIdx >= 0 ? parseFloat(cols[speedIdx]) : 42;

      if (!isNaN(lat) && !isNaN(lon)) {
        points.push({
          latitude: lat,
          longitude: lon,
          timestamp: isNaN(timestamp) ? i * 0.5 : timestamp,
          speed: isNaN(speed) ? 40 : speed,
        });
      }
    }
  }

  return points;
}
