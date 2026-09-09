import React, { createContext, useContext, useState, useEffect } from 'react';
import { PotholeRecord, RepairStatus, SeverityLevel, AIConfig } from '../types/pothole';
import * as db from '../db/potholeDb';

export type AppTab = 'uploader' | 'map' | 'dashboard' | 'table';

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
}

interface PotholeContextType {
  potholes: PotholeRecord[];
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  aiConfig: AIConfig;
  setAIConfig: (config: AIConfig) => void;
  selectedPothole: PotholeRecord | null;
  setSelectedPothole: (p: PotholeRecord | null) => void;
  isLoading: boolean;

  // Filters
  filterSeverity: SeverityLevel | 'All';
  setFilterSeverity: (sev: SeverityLevel | 'All') => void;
  filterStatus: RepairStatus | 'All';
  setFilterStatus: (status: RepairStatus | 'All') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Actions
  addPothole: (record: PotholeRecord) => Promise<void>;
  addPotholesBulk: (records: PotholeRecord[]) => Promise<void>;
  updateStatus: (id: string, status: RepairStatus) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  deduplicateDatabase: (radiusMeters?: number) => Promise<number>;
  exportGeoJSON: () => void;
  exportCSV: () => void;
  importGeoJSON: (jsonText: string) => Promise<boolean>;

  // Toast
  toasts: ToastNotification[];
  addToast: (type: ToastNotification['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;
}

const DEFAULT_AI_CONFIG: AIConfig = {
  apiKey: import.meta.env.VITE_ROBOFLOW_API_KEY || 'pwbfBnUCVvZQlktfIAJc',
  modelId: import.meta.env.VITE_ROBOFLOW_MODEL || 'pothole-detection-system/3',
  confidenceThreshold: 0.25, // 25% confidence threshold to capture all 6 physical potholes
  sampleRateSeconds: 0.3,   // Sample 3.3 frames per second for accurate pothole video scanning
  useLocalFallback: true,
  activeModelPreset: 'rdd2022-custom',
};

const PotholeContext = createContext<PotholeContextType | undefined>(undefined);

export const PotholeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [potholes, setPotholes] = useState<PotholeRecord[]>([]);
  const [activeTab, setActiveTab] = useState<AppTab>('uploader');
  const [aiConfig, setAIConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [selectedPothole, setSelectedPothole] = useState<PotholeRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [filterSeverity, setFilterSeverity] = useState<SeverityLevel | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<RepairStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  useEffect(() => {
    loadDatabase();
  }, []);

  const loadDatabase = async () => {
    try {
      setIsLoading(true);
      const records = await db.getAllPotholes();
      setPotholes(records);
    } catch (err) {
      console.error('Failed to load IndexedDB:', err);
      addToast('error', 'Database Error', 'Could not open client spatial database');
    } finally {
      setIsLoading(false);
    }
  };

  const addToast = (type: ToastNotification['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addPothole = async (record: PotholeRecord) => {
    await db.addPothole(record);
    setPotholes(prev => [record, ...prev]);
  };

  const addPotholesBulk = async (records: PotholeRecord[]) => {
    await db.addPotholesBulk(records);
    setPotholes(prev => [...records, ...prev]);
    addToast('success', 'Processing Complete', `Added ${records.length} detected potholes to database`);
  };

  const updateStatus = async (id: string, status: RepairStatus) => {
    await db.updatePotholeStatus(id, status);
    setPotholes(prev => prev.map(p => p.id === id ? { ...p, repairStatus: status } : p));
    if (selectedPothole?.id === id) {
      setSelectedPothole(prev => prev ? { ...prev, repairStatus: status } : null);
    }
    addToast('info', 'Status Updated', `Pothole repair status set to ${status}`);
  };

  const deleteRecord = async (id: string) => {
    await db.deletePothole(id);
    setPotholes(prev => prev.filter(p => p.id !== id));
    if (selectedPothole?.id === id) setSelectedPothole(null);
    addToast('warning', 'Record Removed', 'Pothole entry deleted from database');
  };

  const clearAll = async () => {
    await db.clearAllPotholes();
    setPotholes([]);
    setSelectedPothole(null);
    addToast('info', 'Database Cleared', 'All pothole records removed');
  };

  const deduplicateDatabase = async (radiusMeters: number = 15): Promise<number> => {
    try {
      setIsLoading(true);
      const initialCount = potholes.length;
      const cleanRecords = await db.deduplicateAllPotholes(radiusMeters);
      const mergedCount = Math.max(0, initialCount - cleanRecords.length);
      setPotholes(cleanRecords);

      if (mergedCount > 0) {
        addToast(
          'success',
          'Duplicates Consolidated',
          `Merged ${mergedCount} redundant pothole records within ${radiusMeters}m spatial proximity.`
        );
      } else {
        addToast(
          'info',
          'Database Clean',
          `No duplicate pothole records detected within ${radiusMeters}m radius.`
        );
      }
      return mergedCount;
    } catch (err) {
      console.error('Failed to deduplicate database:', err);
      addToast('error', 'Deduplication Failed', 'Could not run spatial clustering algorithm');
      return 0;
    } finally {
      setIsLoading(false);
    }
  };

  const exportGeoJSON = () => {
    const jsonStr = db.exportToGeoJSON(potholes);
    const blob = new Blob([jsonStr], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `potholevision-data-${new Date().toISOString().substring(0, 10)}.geojson`;
    a.click();
    addToast('success', 'Export Complete', 'Exported GeoJSON file for QGIS / ArcGIS');
  };

  const exportCSV = () => {
    const csvStr = db.exportToCSV(potholes);
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `potholevision-registry-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    addToast('success', 'Export Complete', 'Exported CSV spreadsheet');
  };

  const importGeoJSON = async (jsonText: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonText);
      let newRecords: PotholeRecord[] = [];

      if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
        newRecords = parsed.features.map((f: any, idx: number) => ({
          id: f.properties?.id || `import-${Date.now()}-${idx}`,
          timestamp: f.properties?.timestamp || new Date().toISOString(),
          videoTimeOffset: 0,
          latitude: f.geometry?.coordinates?.[1] || 19.0760,
          longitude: f.geometry?.coordinates?.[0] || 72.8777,
          streetName: f.properties?.streetName || 'Imported Location',
          severity: (f.properties?.severity as SeverityLevel) || 'Moderate',
          confidence: f.properties?.confidence || 88,
          estimatedAreaCm2: f.properties?.estimatedAreaCm2 || 280,
          speedKmH: f.properties?.speedKmH || 40,
          repairStatus: (f.properties?.repairStatus as RepairStatus) || 'Reported',
          detectionSource: 'Roboflow YOLO',
          boundingBox: { x: 0.4, y: 0.5, width: 0.2, height: 0.2 },
        }));
      } else if (Array.isArray(parsed)) {
        newRecords = parsed;
      }

      if (newRecords.length > 0) {
        await addPotholesBulk(newRecords);
        addToast('success', 'Import Successful', `Imported ${newRecords.length} records into database`);
        return true;
      }
    } catch (e) {
      addToast('error', 'Import Failed', 'Invalid JSON/GeoJSON file format');
    }
    return false;
  };

  return (
    <PotholeContext.Provider
      value={{
        potholes,
        activeTab,
        setActiveTab,
        aiConfig,
        setAIConfig,
        selectedPothole,
        setSelectedPothole,
        isLoading,
        filterSeverity,
        setFilterSeverity,
        filterStatus,
        setFilterStatus,
        searchQuery,
        setSearchQuery,
        addPothole,
        addPotholesBulk,
        updateStatus,
        deleteRecord,
        clearAll,
        deduplicateDatabase,
        exportGeoJSON,
        exportCSV,
        importGeoJSON,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </PotholeContext.Provider>
  );
};

export const usePotholes = () => {
  const context = useContext(PotholeContext);
  if (!context) throw new Error('usePotholes must be used within PotholeProvider');
  return context;
};
