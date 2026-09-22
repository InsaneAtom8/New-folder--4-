import React, { useState, useRef } from 'react';
import { usePotholes, AppTab } from '../../context/PotholeContext';
import { AISettingsModal } from './AISettingsModal';
import { 
  Video, 
  Map, 
  BarChart3, 
  Table, 
  SlidersHorizontal, 
  Download, 
  Upload, 
  Trash2, 
  ShieldCheck, 
  Database,
  ChevronDown
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    potholes, 
    aiConfig, 
    exportGeoJSON, 
    exportCSV, 
    importGeoJSON, 
    clearAll 
  } = usePotholes();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = await file.text();
      await importGeoJSON(text);
    }
  };

  const tabs: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    { id: 'uploader', label: 'Upload & AI Detect', icon: <Video className="w-4 h-4" /> },
    { id: 'map', label: 'GIS Map View', icon: <Map className="w-4 h-4" /> },
    { id: 'dashboard', label: 'Road Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'table', label: 'Data Registry', icon: <Table className="w-4 h-4" /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-romer-bg/95 backdrop-blur-md border-b border-romer-divider px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Brand & Badge */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border border-romer-divider bg-romer-card flex items-center justify-center text-romer-text-main font-h3 font-bold inner-glow">
              <span className="text-romer-cyan font-bold text-sm">P</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-h3 font-bold text-romer-text-main tracking-tight">
                  PotholeVision <span className="text-romer-cyan">AI</span>
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-romer-cyan bg-romer-cyan/10 px-2 py-0.5 rounded border border-romer-cyan/20">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-romer-text-muted font-medium">
                Dashcam Vision • Telemetry Ingestion • GIS Mapping
              </p>
            </div>
          </div>

          {/* Step Navigation Tabs */}
          <nav className="flex items-center p-1 bg-romer-sidebar border border-romer-divider rounded-xl">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-romer-primary text-white font-bold shadow-lg shadow-romer-primary/25'
                      : 'text-romer-text-muted hover:text-romer-text-main hover:bg-romer-card/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2">
            
            {/* Database Counter Badge */}
            <div className="hidden sm:flex items-center gap-1.5 bg-romer-card border border-romer-divider px-3 py-1.5 rounded-xl text-xs font-mono text-romer-text-muted inner-glow">
              <Database className="w-3.5 h-3.5 text-romer-cyan" />
              <span className="font-bold text-romer-text-main">{potholes.length}</span>
              <span className="text-romer-text-muted">Potholes</span>
            </div>

            {/* AI Settings Config */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-romer-card hover:bg-romer-panel border border-romer-divider text-xs font-semibold text-romer-text-main rounded-xl transition-all inner-glow"
              title="Configure Roboflow AI API Key & Model Parameters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-romer-cyan" />
              <span className="hidden sm:inline">AI Settings</span>
              {aiConfig.apiKey ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
              ) : null}
            </button>

            {/* Data Export / Import Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-romer-card hover:bg-romer-panel border border-romer-divider text-xs font-semibold text-romer-text-main rounded-xl transition-all inner-glow"
              >
                <Download className="w-3.5 h-3.5 text-romer-cyan" />
                <span className="hidden sm:inline">Data Sync</span>
                <ChevronDown className="w-3 h-3 text-romer-text-muted" />
              </button>

              {isExportOpen && (
                <div className="absolute right-0 mt-2 w-48 glass-panel rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => { exportGeoJSON(); setIsExportOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-romer-text-main hover:bg-romer-panel rounded-lg flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-romer-cyan" /> Export GeoJSON (GIS)
                  </button>
                  <button
                    onClick={() => { exportCSV(); setIsExportOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-romer-text-main hover:bg-romer-panel rounded-lg flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-romer-amber" /> Export CSV Spreadsheet
                  </button>
                  <button
                    onClick={() => { fileInputRef.current?.click(); setIsExportOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-romer-text-main hover:bg-romer-panel rounded-lg flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" /> Import GeoJSON / JSON
                  </button>
                  <hr className="my-1 border-romer-divider" />
                  <button
                    onClick={() => { if (confirm('Clear all stored potholes from local database?')) clearAll(); setIsExportOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear Local DB
                  </button>
                </div>
              )}
            </div>

            {/* Hidden Input for JSON Import */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".json,.geojson"
              className="hidden"
            />
          </div>

        </div>
      </header>

      <AISettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

