import React, { useState, useEffect, useRef } from 'react';
import { usePotholes } from '../../context/PotholeContext';
import { PotholeRecord, RepairStatus, SeverityLevel } from '../../types/pothole';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  Layers, 
  Flame, 
  Filter, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  ExternalLink,
  Shield,
  Activity,
  Maximize2
} from 'lucide-react';

export const PotholeMap: React.FC = () => {
  const {
    potholes,
    selectedPothole,
    setSelectedPothole,
    filterSeverity,
    setFilterSeverity,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    updateStatus,
    deleteRecord
  } = usePotholes();

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  const [showHeatmap, setShowHeatmap] = useState(false);
  const [tileMode, setTileMode] = useState<'dark' | 'satellite'>('dark');

  // Filtered dataset
  const filteredPotholes = potholes.filter((p) => {
    if (filterSeverity !== 'All' && p.severity !== filterSeverity) return false;
    if (filterStatus !== 'All' && p.repairStatus !== filterStatus) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchStreet = p.streetName?.toLowerCase().includes(q);
      const matchId = p.id.toLowerCase().includes(q);
      if (!matchStreet && !matchId) return false;
    }
    return true;
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center map around first pothole or default India location (Mumbai)
    const defaultCenter: [number, number] = potholes.length > 0
      ? [potholes[0].latitude, potholes[0].longitude]
      : [19.0760, 72.8777];

    // Restrict map to India geographic bounds
    const indiaBounds = L.latLngBounds(
      [6.0, 68.0],  // South-West corner of India
      [37.5, 97.5]  // North-East corner of India
    );

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 13,
      minZoom: 5,
      maxBounds: indiaBounds,
      maxBoundsViscosity: 1.0, // Strictly locks map view inside India
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle Tile Layer Switch
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });

    const tileUrl = tileMode === 'dark'
      ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors / Stadia Maps / ESRI ArcGIS PotholeVision GIS',
      maxZoom: 19,
    }).addTo(map);
  }, [tileMode]);

  // Update Markers
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    filteredPotholes.forEach((pothole) => {
      const customIcon = createCustomMarkerIcon(pothole.severity, pothole.repairStatus);

      const marker = L.marker([pothole.latitude, pothole.longitude], { icon: customIcon })
        .addTo(map)
        .on('click', () => {
          setSelectedPothole(pothole);
        });

      markersRef.current[pothole.id] = marker;
    });

    // Auto-fit bounds if records exist
    if (filteredPotholes.length > 0) {
      const bounds = L.latLngBounds(filteredPotholes.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [filteredPotholes]);

  // Fly to selected pothole when changed
  useEffect(() => {
    if (selectedPothole && mapRef.current) {
      mapRef.current.flyTo([selectedPothole.latitude, selectedPothole.longitude], 16, {
        duration: 1.2,
      });
    }
  }, [selectedPothole]);

  // Create SVG Marker Icon with severity glow
  function createCustomMarkerIcon(severity: SeverityLevel, status: RepairStatus) {
    const colorMap = {
      Critical: '#ffb4ab',
      Moderate: '#ffb689',
      Minor: '#50d8e9',
    };
    const color = colorMap[severity] || '#5E6BFF';
    const isRepaired = status === 'Repaired';

    const html = `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${color};
          opacity: 0.25;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: ${isRepaired ? '#50d8e9' : color};
          border: 2px solid #ffffff;
          box-shadow: 0 0 12px ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #070708;
          font-weight: bold;
          font-size: 10px;
        ">
          !
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-pothole-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col lg:flex-row overflow-hidden relative rounded-xl border border-romer-divider">
      
      {/* Left Explorer Sidebar */}
      <div className="w-full lg:w-96 bg-romer-sidebar border-r border-romer-divider p-4 space-y-4 flex flex-col justify-between overflow-y-auto shrink-0 z-10">
        
        {/* Search & Filter Toolbar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-h3 font-bold text-romer-text-main tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4 text-romer-cyan" /> GIS Spatial Explorer
            </h3>
            <span className="text-[10px] font-mono font-bold bg-romer-cyan/10 text-romer-cyan px-2 py-0.5 rounded border border-romer-cyan/20">
              {filteredPotholes.length} Hazards
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-romer-text-muted absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search street name or ID..."
              className="w-full bg-[#070708] border border-romer-divider rounded-xl pl-9 pr-3 py-2 text-xs text-romer-text-main placeholder:text-romer-text-muted focus:outline-none focus:border-romer-primary"
            />
          </div>

          {/* Filter Pills */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Severity Filter */}
            <div>
              <label className="text-[10px] font-bold text-romer-text-muted uppercase tracking-wider block mb-1 font-mono">Severity</label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as any)}
                className="w-full bg-[#070708] border border-romer-divider rounded-lg px-2 py-1.5 text-romer-text-main text-xs focus:outline-none"
              >
                <option value="All">All Severities</option>
                <option value="Critical">🔴 Critical</option>
                <option value="Moderate">🟡 Moderate</option>
                <option value="Minor">🟢 Minor</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-[10px] font-bold text-romer-text-muted uppercase tracking-wider block mb-1 font-mono">Repair Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full bg-[#070708] border border-romer-divider rounded-lg px-2 py-1.5 text-romer-text-main text-xs focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Reported">Reported</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In Review">In Review</option>
                <option value="Repaired">Repaired</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Pothole List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2 min-h-[200px]">
          {filteredPotholes.length === 0 ? (
            <div className="text-center py-12 text-romer-text-muted text-xs">
              No potholes match your current spatial filter criteria.
            </div>
          ) : (
            filteredPotholes.map((p) => {
              const isSelected = selectedPothole?.id === p.id;
              const sevColors = {
                Critical: 'border-rose-500/30 text-rose-300 bg-rose-950/20',
                Moderate: 'border-romer-amber/30 text-romer-amber bg-romer-amber/10',
                Minor: 'border-romer-cyan/30 text-romer-cyan bg-romer-cyan/10',
              };

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPothole(p)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer inner-glow ${
                    isSelected
                      ? 'bg-romer-card border-romer-primary shadow-md shadow-romer-primary/10'
                      : 'bg-romer-card/60 border-romer-divider hover:border-romer-text-muted hover:bg-romer-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${sevColors[p.severity]}`}>
                      {p.severity}
                    </span>
                    <span className="text-[10px] font-mono text-romer-text-muted">{p.confidence}% Conf</span>
                  </div>

                  <h4 className="text-xs font-bold text-romer-text-main truncate">{p.streetName}</h4>
                  
                  <div className="flex items-center justify-between mt-2 text-[11px] text-romer-text-muted font-mono">
                    <span>{p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</span>
                    <span className="text-romer-text-main font-semibold">{p.repairStatus}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Map View Mode Toggles */}
        <div className="pt-3 border-t border-romer-divider space-y-2">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setTileMode(tileMode === 'dark' ? 'satellite' : 'dark')}
              className="flex-1 py-2 px-3 bg-romer-card hover:bg-romer-panel border border-romer-divider rounded-xl text-xs font-semibold text-romer-text-main flex items-center justify-center gap-1.5 inner-glow"
            >
              <Layers className="w-3.5 h-3.5 text-romer-cyan" />
              <span>{tileMode === 'dark' ? 'Satellite View' : 'Dark Map'}</span>
            </button>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors inner-glow ${
                showHeatmap
                  ? 'bg-romer-amber/10 border-romer-amber/40 text-romer-amber'
                  : 'bg-romer-card border-romer-divider text-romer-text-muted hover:bg-romer-panel'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Heatmap</span>
            </button>
          </div>
        </div>

      </div>

      {/* Main Interactive Leaflet Map Container */}
      <div className="flex-1 h-full relative">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Selected Pothole Floating Inspector Modal Card */}
        {selectedPothole && (
          <div className="absolute bottom-5 right-5 z-20 w-full max-w-sm glass-panel rounded-2xl p-4 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-romer-divider pb-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-romer-cyan uppercase tracking-wider">
                  Hazard Snapshot Inspector
                </span>
                <h3 className="text-sm font-h3 font-bold text-romer-text-main">{selectedPothole.streetName}</h3>
              </div>
              <button
                onClick={() => setSelectedPothole(null)}
                className="text-romer-text-muted hover:text-romer-text-main p-1"
              >
                ✕
              </button>
            </div>

            {/* Visual Frame Image Snapshot if available */}
            {selectedPothole.snapshotUrl ? (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-romer-divider bg-[#070708]">
                <img
                  src={selectedPothole.snapshotUrl}
                  alt="Pothole Bounding Box Snapshot"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-[#070708]/80 px-2 py-0.5 rounded text-[10px] font-mono text-romer-cyan border border-romer-cyan/30">
                  {selectedPothole.confidence}% AI Confidence
                </div>
              </div>
            ) : null}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#070708] p-3 rounded-xl border border-romer-divider">
              <div>
                <span className="text-romer-text-muted text-[10px]">SEVERITY</span>
                <p className="font-bold text-romer-amber">{selectedPothole.severity}</p>
              </div>
              <div>
                <span className="text-romer-text-muted text-[10px]">SURFACE AREA</span>
                <p className="font-bold text-romer-cyan">{selectedPothole.estimatedAreaCm2} cm²</p>
              </div>
              <div>
                <span className="text-romer-text-muted text-[10px]">VEHICLE SPEED</span>
                <p className="font-bold text-romer-text-main">{selectedPothole.speedKmH} km/h</p>
              </div>
              <div>
                <span className="text-romer-text-muted text-[10px]">GPS COORDS</span>
                <p className="font-bold text-romer-text-main truncate">{selectedPothole.latitude.toFixed(4)}, {selectedPothole.longitude.toFixed(4)}</p>
              </div>
            </div>

            {/* Repair Status Update Controls */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-romer-text-main">Repair Status:</span>
              <div className="flex gap-1">
                {(['Reported', 'Scheduled', 'Repaired'] as RepairStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(selectedPothole.id, status)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                      selectedPothole.repairStatus === status
                        ? 'bg-romer-primary text-white shadow'
                        : 'bg-romer-card text-romer-text-muted hover:text-romer-text-main border border-romer-divider'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};

