import React, { useState } from 'react';
import { PotholeProvider, usePotholes } from './context/PotholeContext';
import { Navbar } from './components/Header/Navbar';
import { ToastContainer } from './components/Header/ToastContainer';
import { VideoUploader } from './components/Detector/VideoUploader';
import { DetectionCanvas } from './components/Detector/DetectionCanvas';
import { PotholeMap } from './components/Map/PotholeMap';
import { AnalyticsDashboard } from './components/Dashboard/AnalyticsDashboard';
import { PotholeTable } from './components/Table/PotholeTable';
import { GPSPoint } from './types/pothole';

const MainContent: React.FC = () => {
  const { activeTab } = usePotholes();

  // Active Processing State
  const [activeVideoFile, setActiveVideoFile] = useState<File | null>(null);
  const [activeGpsPoints, setActiveGpsPoints] = useState<GPSPoint[]>([]);
  const [activePresetId, setActivePresetId] = useState<string>('mumbai-western-express');

  const handleVideoLoaded = (videoFile: File, gpsPoints: GPSPoint[], presetId: string) => {
    setActiveVideoFile(videoFile);
    setActiveGpsPoints(gpsPoints);
    setActivePresetId(presetId);
  };

  const handleDetectionFinished = () => {
    setActiveVideoFile(null);
  };

  return (
    <div className="min-h-screen bg-romer-bg text-romer-text-main flex flex-col justify-between selection:bg-romer-primary selection:text-white">
      
      <Navbar />

      <main className="flex-1 p-4 lg:p-6 bg-romer-bg">
        {activeTab === 'uploader' && (
          activeVideoFile ? (
            <DetectionCanvas
              videoFile={activeVideoFile}
              gpsPoints={activeGpsPoints}
              presetId={activePresetId}
              onFinished={handleDetectionFinished}
            />
          ) : (
            <VideoUploader onVideoLoaded={handleVideoLoaded} />
          )
        )}

        {activeTab === 'map' && <PotholeMap />}

        {activeTab === 'dashboard' && <AnalyticsDashboard />}

        {activeTab === 'table' && <PotholeTable />}
      </main>

      {/* Instrument Typography Paper Light Footer */}
      <footer className="border-t border-black/10 py-6 px-6 text-center text-xs text-[#222222] bg-[#F2F2F2]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            © 2026 <strong className="text-[#000000]">PotholeVision AI</strong> • Instrument Typography System
          </span>
          <div className="flex items-center gap-4 font-mono text-[11px] text-[#000000]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#000000] animate-pulse" /> System Operational
            </span>
            <span>Spatial IndexedDB</span>
          </div>
        </div>
      </footer>

      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <PotholeProvider>
      <MainContent />
    </PotholeProvider>
  );
}

export default App;

