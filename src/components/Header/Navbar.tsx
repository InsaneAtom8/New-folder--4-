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
  ChevronDown,
  Sparkles,
  Menu,
  X
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = await file.text();
      await importGeoJSON(text);
    }
  };

  const tabs: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    { id: 'uploader', label: 'Upload & Detect', icon: <Video className="w-4 h-4" /> },
    { id: 'map', label: 'GIS Map', icon: <Map className="w-4 h-4" /> },
    { id: 'dashboard', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'table', label: 'Data Registry', icon: <Table className="w-4 h-4" /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-black/10 px-4 sm:px-6 lg:px-12 py-3 sm:py-4">
        <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-4">
          
          {/* Mobile Top Header Row */}
          <div className="w-full flex items-center justify-between lg:hidden">
            {/* Logo Brand */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-[#000000] text-[#FFFFFF] flex items-center justify-center font-bold text-xs">
                <span>P</span>
              </div>
              <h1 className="text-lg font-normal text-[#000000] tracking-tight">
                PotholeVision <span className="serif-italic text-[#000000]">AI</span>
              </h1>
            </div>

            {/* Right Quick Actions + Mobile Menu Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('uploader')}
                className="px-3 py-1.5 bg-[#000000] text-[#FFFFFF] font-medium text-xs rounded-full flex items-center gap-1 shadow-sm"
              >
                <Sparkles className="w-3 h-3" />
                <span>Launch</span>
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 bg-[#F2F2F2] border border-black/10 rounded-lg text-[#000000]"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Desktop Logo Brand */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#000000] text-[#FFFFFF] flex items-center justify-center font-bold text-sm">
              <span>P</span>
            </div>
            <div>
              <h1 className="text-xl font-normal text-[#000000] tracking-tight">
                PotholeVision <span className="serif-italic text-[#000000]">AI</span>
              </h1>
            </div>
          </div>

          {/* Navigation Tabs - Horizontal Scroll on Mobile / Centered on Desktop */}
          <nav className="w-full lg:w-auto overflow-x-auto no-scrollbar flex items-center gap-1 bg-[#F2F2F2] p-1 rounded-full border border-black/10 shrink-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#000000] text-[#FFFFFF] shadow-sm'
                      : 'text-[#222222] hover:text-[#000000]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Desktop Right Action Bar */}
          <div className="hidden lg:flex items-center gap-2">
            
            {/* Database Counter Badge */}
            <div className="flex items-center gap-1.5 bg-[#F2F2F2] border border-black/10 px-3 py-1.5 rounded-full text-xs font-mono text-[#000000]">
              <Database className="w-3.5 h-3.5 text-[#000000]" />
              <span className="font-bold">{potholes.length}</span>
              <span className="text-[#222222]">Hazards</span>
            </div>

            {/* AI Settings Config */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F2] hover:bg-black/5 border border-black/10 text-xs font-medium text-[#000000] rounded-full transition-all"
              title="Configure AI API Key & Model Parameters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#000000]" />
              <span>AI Settings</span>
              {aiConfig.apiKey && (
                <ShieldCheck className="w-3.5 h-3.5 text-[#000000] ml-0.5" />
              )}
            </button>

            {/* Data Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F2] hover:bg-black/5 border border-black/10 text-xs font-medium text-[#000000] rounded-full transition-all"
              >
                <Download className="w-3.5 h-3.5 text-[#000000]" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-[#222222]" />
              </button>

              {isExportOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#FFFFFF] border border-black/10 rounded-xl shadow-lg p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => { exportGeoJSON(); setIsExportOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-[#000000] hover:bg-[#F2F2F2] rounded-lg flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" /> Export GeoJSON
                  </button>
                  <button
                    onClick={() => { exportCSV(); setIsExportOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-[#000000] hover:bg-[#F2F2F2] rounded-lg flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                  <button
                    onClick={() => { fileInputRef.current?.click(); setIsExportOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-[#000000] hover:bg-[#F2F2F2] rounded-lg flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" /> Import GeoJSON
                  </button>
                  <hr className="my-1 border-black/10" />
                  <button
                    onClick={() => { if (confirm('Clear all stored potholes from local database?')) clearAll(); setIsExportOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-[#000000] hover:bg-black/5 rounded-lg flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" /> Clear Local DB
                  </button>
                </div>
              )}
            </div>

            {/* Launch Action Button */}
            <button
              onClick={() => setActiveTab('uploader')}
              className="px-4 py-2 bg-[#000000] text-[#FFFFFF] font-medium text-xs rounded-full hover:bg-[#222222] transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch AI</span>
            </button>

          </div>

          {/* Mobile Dropdown Menu Drawer */}
          {isMobileMenuOpen && (
            <div className="w-full lg:hidden pt-3 border-t border-black/10 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-mono text-[#000000] bg-[#F2F2F2] p-2.5 rounded-xl border border-black/10">
                <span className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-[#000000]" /> Total Hazards
                </span>
                <span className="font-bold">{potholes.length} Records</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }}
                  className="py-2 px-3 bg-[#F2F2F2] border border-black/10 rounded-xl text-xs font-medium text-[#000000] flex items-center justify-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> AI Settings
                </button>
                <button
                  onClick={() => { exportGeoJSON(); setIsMobileMenuOpen(false); }}
                  className="py-2 px-3 bg-[#F2F2F2] border border-black/10 rounded-xl text-xs font-medium text-[#000000] flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> GeoJSON
                </button>
                <button
                  onClick={() => { exportCSV(); setIsMobileMenuOpen(false); }}
                  className="py-2 px-3 bg-[#F2F2F2] border border-black/10 rounded-xl text-xs font-medium text-[#000000] flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> CSV Data
                </button>
                <button
                  onClick={() => { fileInputRef.current?.click(); setIsMobileMenuOpen(false); }}
                  className="py-2 px-3 bg-[#F2F2F2] border border-black/10 rounded-xl text-xs font-medium text-[#000000] flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> Import
                </button>
              </div>
            </div>
          )}

        </div>
      </header>

      {/* Hidden File Input for GeoJSON Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".json,.geojson"
        className="hidden"
      />

      <AISettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};
