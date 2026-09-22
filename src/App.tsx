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

      {/* Romer Enterprise Dark Footer */}
      <footer className="border-t border-romer-divider py-4 px-6 text-center text-xs text-romer-text-muted bg-romer-sidebar">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 <strong className="text-romer-text-main font-h3">PotholeVision AI Enterprise</strong> • Roboflow Deep Learning YOLOv8/v11 Vision System
          </span>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-romer-cyan animate-pulse" /> System Operational
            </span>
            <span>Zero-Config Spatial IndexedDB</span>
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

