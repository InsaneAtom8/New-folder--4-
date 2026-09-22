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
      const records: PotholeRecord[] = request.result || [];
      // Filter out any legacy dummy/seed records
      const cleanRecords = records.filter(r => !r.id.startsWith('seed-ph-'));
      if (cleanRecords.length !== records.length) {
        clearLegacySeedPotholes();
      }
      resolve(cleanRecords);
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
 * Utility function to purge legacy dummy seed records from IndexedDB
 */
export async function clearLegacySeedPotholes(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getReq = store.getAll();

    getReq.onsuccess = () => {
      const records: PotholeRecord[] = getReq.result || [];
      records.forEach((rec) => {
        if (rec.id && rec.id.startsWith('seed-ph-')) {
          store.delete(rec.id);
        }
      });
    };
  } catch (e) {
    console.warn('Failed to clean legacy seed potholes:', e);
  }
}
