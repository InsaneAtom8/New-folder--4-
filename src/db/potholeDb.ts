import { PotholeRecord, RepairStatus, SeverityLevel } from '../types/pothole';
import { deduplicatePotholeRecords } from '../utils/geoDeduplication';

const DB_NAME = 'PotholeVisionDB';
const DB_VERSION = 2;
const STORE_NAME = 'potholes';

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('severity', 'severity', { unique: false });
        store.createIndex('repairStatus', 'repairStatus', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Gets all pothole records from IndexedDB
 */
export async function getAllPotholes(): Promise<PotholeRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      let records: PotholeRecord[] = request.result || [];
      // If empty, seed initial municipal data
      if (records.length === 0) {
        records = getSeedPotholes();
        seedDatabase(records);
      }
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Adds a new pothole record
 */
export async function addPothole(record: PotholeRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Adds multiple pothole records in bulk
 */
export async function addPotholesBulk(records: PotholeRecord[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    records.forEach((rec) => store.put(rec));

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Updates repair status of a pothole
 */
export async function updatePotholeStatus(id: string, status: RepairStatus): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record: PotholeRecord = getReq.result;
      if (record) {
        record.repairStatus = status;
        store.put(record);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Deletes a pothole record by ID
 */
export async function deletePothole(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clears all records
 */
export async function clearAllPotholes(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deduplicates all stored potholes in IndexedDB within a spatial radius (default 15m)
 */
export async function deduplicateAllPotholes(radiusMeters: number = 15): Promise<PotholeRecord[]> {
  const allRecords = await getAllPotholes();
  const cleanRecords = deduplicatePotholeRecords(allRecords, radiusMeters);

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    cleanRecords.forEach((rec) => store.put(rec));

    transaction.oncomplete = () => resolve(cleanRecords);
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Exports database to GeoJSON (GIS Mapping Format)
 */
export function exportToGeoJSON(records: PotholeRecord[]): string {
  const geojson = {
    type: 'FeatureCollection',
    features: records.map(p => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [p.longitude, p.latitude],
      },
      properties: {
        id: p.id,
        severity: p.severity,
        confidence: p.confidence,
        speedKmH: p.speedKmH,
        estimatedAreaCm2: p.estimatedAreaCm2,
        repairStatus: p.repairStatus,
        streetName: p.streetName || 'Unknown Street',
        timestamp: p.timestamp,
        detectionSource: p.detectionSource,
      }
    }))
  };
  return JSON.stringify(geojson, null, 2);
}

/**
 * Exports database to CSV
 */
export function exportToCSV(records: PotholeRecord[]): string {
  const headers = ['ID', 'Timestamp', 'Latitude', 'Longitude', 'Street Name', 'Severity', 'Confidence (%)', 'Speed (km/h)', 'Area (cm²)', 'Repair Status', 'Detection Source'];
  const rows = records.map(p => [
    p.id,
    p.timestamp,
    p.latitude,
    p.longitude,
    `"${p.streetName || ''}"`,
    p.severity,
    p.confidence,
    p.speedKmH,
    p.estimatedAreaCm2,
    p.repairStatus,
    p.detectionSource,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Initial municipal seed dataset for immediate visual exploring
 */
function getSeedPotholes(): PotholeRecord[] {
  const seeds: { lat: number; lng: number; street: string; sev: SeverityLevel; status: RepairStatus }[] = [
    // Mumbai
    { lat: 19.1196, lng: 72.8468, street: 'Western Express Highway, Andheri (E), Mumbai', sev: 'Critical', status: 'Reported' },
    { lat: 19.0728, lng: 72.8826, street: 'LBS Marg, Kurla West, Mumbai', sev: 'Moderate', status: 'Scheduled' },
    { lat: 18.9220, lng: 72.8347, street: 'P D\'Mello Road, Fort, Mumbai', sev: 'Critical', status: 'In Review' },
    { lat: 19.1760, lng: 72.9634, street: 'Ghodbunder Road, Thane, Maharashtra', sev: 'Critical', status: 'Reported' },
    // Delhi
    { lat: 28.6354, lng: 77.2245, street: 'Outer Ring Road, Dwarka Sector 10, New Delhi', sev: 'Moderate', status: 'Reported' },
    { lat: 28.7041, lng: 77.1025, street: 'NH-48, Shivaji Place Junction, New Delhi', sev: 'Critical', status: 'Scheduled' },
    { lat: 28.5665, lng: 77.3211, street: 'Noida Link Road, Mayur Vihar, Delhi', sev: 'Minor', status: 'Repaired' },
    // Pune
    { lat: 18.5204, lng: 73.8567, street: 'FC Road, Near Deccan Gymkhana, Pune', sev: 'Moderate', status: 'Scheduled' },
    { lat: 18.5626, lng: 73.9140, street: 'Nagar Road, Kharadi IT Park, Pune', sev: 'Critical', status: 'In Review' },
    // Bengaluru
    { lat: 12.9176, lng: 77.6227, street: 'Hosur Road, Silk Board Flyover, Bengaluru', sev: 'Moderate', status: 'Reported' },
    { lat: 12.9791, lng: 77.5913, street: 'MG Road, Near Trinity Circle, Bengaluru', sev: 'Minor', status: 'Repaired' },
    // Chennai
    { lat: 13.0012, lng: 80.2565, street: 'Anna Salai (Mount Road), Chennai', sev: 'Critical', status: 'Reported' },
  ];

  return seeds.map((s, idx) => ({
    id: `seed-ph-${idx + 100}`,
    timestamp: new Date(Date.now() - (idx * 3600000 * 4)).toISOString(),
    videoTimeOffset: idx * 2.5,
    latitude: s.lat,
    longitude: s.lng,
    streetName: s.street,
    severity: s.sev,
    confidence: 86 + (idx % 12),
    estimatedAreaCm2: 240 + (idx * 60),
    speedKmH: 38 + (idx % 15),
    repairStatus: s.status,
    detectionSource: 'Roboflow YOLO',
    boundingBox: { x: 0.45, y: 0.60, width: 0.20, height: 0.15 },
  }));
}

async function seedDatabase(records: PotholeRecord[]) {
  try {
    await addPotholesBulk(records);
  } catch (e) {
    console.warn('Seed database warning:', e);
  }
}
