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
    <div className="min-h-screen flex flex-col justify-between">
      
      <Navbar />

      <main className="flex-1 p-4 lg:p-6">
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

      {/* Enterprise Dark Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 bg-slate-950/60">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 <strong>PotholeVision AI Enterprise</strong> • Roboflow Deep Learning YOLOv8/v11 Vision System
          </span>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> System Operational
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
