import React, { useState } from 'react';
import { usePotholes } from '../../context/PotholeContext';
import { RepairStatus, SeverityLevel, PotholeRecord } from '../../types/pothole';
import { 
  Table as TableIcon, 
  Search, 
  Download, 
  Trash2, 
  Eye, 
  MapPin, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export const PotholeTable: React.FC = () => {
  const { 
    potholes, 
    filterSeverity, 
    setFilterSeverity, 
    filterStatus, 
    setFilterStatus, 
    searchQuery, 
    setSearchQuery,
    updateStatus,
    deleteRecord,
    deduplicateDatabase,
    exportGeoJSON,
    exportCSV,
    setSelectedPothole,
    setActiveTab
  } = usePotholes();

  const [previewPothole, setPreviewPothole] = useState<PotholeRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filtered
  const filtered = potholes.filter((p) => {
    if (filterSeverity !== 'All' && p.severity !== filterSeverity) return false;
    if (filterStatus !== 'All' && p.repairStatus !== filterStatus) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      if (!p.streetName?.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleJumpToMap = (p: PotholeRecord) => {
    setSelectedPothole(p);
    setActiveTab('map');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12 animate-in fade-in duration-300">
      
      {/* Table Toolbar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-romer-card border border-romer-divider p-5 rounded-xl inner-glow">
        <div>
          <h2 className="text-lg font-h2 font-bold text-romer-text-main tracking-wide flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-romer-cyan" /> Pothole Spatial Registry & Master Log
          </h2>
          <p className="text-xs text-romer-text-muted mt-0.5">
            IndexedDB persistent database records with frame visual snapshots & repair status lifecycle
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => deduplicateDatabase(15)}
            title="Consolidate duplicate observations within 15 meters"
            className="px-3.5 py-2 bg-romer-primary/10 hover:bg-romer-primary/20 border border-romer-primary/40 text-xs font-semibold text-romer-primary rounded-xl flex items-center gap-1.5 transition-all shadow-sm inner-glow"
          >
            <Sparkles className="w-3.5 h-3.5 text-romer-primary animate-pulse" /> Merge Duplicates
          </button>
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 bg-romer-sidebar hover:bg-romer-panel border border-romer-divider text-xs font-semibold text-romer-text-main rounded-xl flex items-center gap-1.5 transition-colors inner-glow"
          >
            <Download className="w-3.5 h-3.5 text-romer-amber" /> CSV
          </button>
          <button
            onClick={exportGeoJSON}
            className="px-3.5 py-2 bg-romer-sidebar hover:bg-romer-panel border border-romer-divider text-xs font-semibold text-romer-text-main rounded-xl flex items-center gap-1.5 transition-colors inner-glow"
          >
            <Download className="w-3.5 h-3.5 text-romer-cyan" /> GeoJSON
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-romer-card/60 border border-romer-divider p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs inner-glow">
        
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-romer-text-muted absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search street name or ID..."
            className="w-full bg-[#070708] border border-romer-divider rounded-xl pl-9 pr-3 py-2 text-romer-text-main placeholder:text-romer-text-muted focus:outline-none focus:border-romer-primary"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-romer-text-muted font-medium font-mono text-[11px]">Severity:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="bg-[#070708] border border-romer-divider rounded-lg px-2.5 py-1.5 text-romer-text-main focus:outline-none"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="Moderate">Moderate</option>
              <option value="Minor">Minor</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-romer-text-muted font-medium font-mono text-[11px]">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-[#070708] border border-romer-divider rounded-lg px-2.5 py-1.5 text-romer-text-main focus:outline-none"
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

      {/* Main Table View */}
      <div className="bg-romer-card border border-romer-divider rounded-xl overflow-hidden shadow-2xl inner-glow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-romer-sidebar border-b border-romer-divider text-romer-text-muted font-mono text-[11px] uppercase tracking-wider">
                <th className="p-4">Snapshot</th>
                <th className="p-4">ID & Location</th>
                <th className="p-4">Coordinates</th>
                <th className="p-4">Severity</th>
                <th className="p-4">Confidence</th>
                <th className="p-4">Speed</th>
                <th className="p-4">Repair Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-romer-divider font-sans">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-romer-text-muted">
                    No pothole records match the filter criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((p) => {
                  const sevBadge = {
                    Critical: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
                    Moderate: 'bg-romer-amber/10 text-romer-amber border-romer-amber/30',
                    Minor: 'bg-romer-cyan/10 text-romer-cyan border-romer-cyan/30',
                  };

                  return (
                    <tr key={p.id} className="hover:bg-romer-panel/60 transition-colors">
                      
                      {/* Image Thumbnail */}
                      <td className="p-4">
                        {p.snapshotUrl ? (
                          <div
                            onClick={() => setPreviewPothole(p)}
                            className="w-12 h-9 rounded-lg overflow-hidden border border-romer-divider bg-[#070708] cursor-pointer hover:scale-105 transition-transform"
                          >
                            <img src={p.snapshotUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-9 rounded-lg bg-[#070708] border border-romer-divider flex items-center justify-center text-romer-text-muted font-mono text-[10px]">
                            N/A
                          </div>
                        )}
                      </td>

                      {/* Location */}
                      <td className="p-4">
                        <h4 className="font-bold text-romer-text-main text-xs">{p.streetName}</h4>
                        <span className="font-mono text-[10px] text-romer-text-muted">{p.id}</span>
                      </td>

                      {/* Coords */}
                      <td className="p-4 font-mono text-[11px] text-romer-text-main">
                        {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                      </td>

                      {/* Severity */}
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${sevBadge[p.severity]}`}>
                          {p.severity}
                        </span>
                      </td>

                      {/* Confidence */}
                      <td className="p-4 font-mono text-romer-cyan font-bold">
                        {p.confidence}%
                      </td>

                      {/* Speed */}
                      <td className="p-4 font-mono text-romer-text-main">
                        {p.speedKmH} km/h
                      </td>

                      {/* Repair Status Select */}
                      <td className="p-4">
                        <select
                          value={p.repairStatus}
                          onChange={(e) => updateStatus(p.id, e.target.value as RepairStatus)}
                          className="bg-[#070708] border border-romer-divider text-romer-text-main text-xs rounded-lg px-2 py-1 font-semibold focus:outline-none"
                        >
                          <option value="Reported">Reported</option>
                          <option value="Scheduled">Scheduled</option>
                          <option value="In Review">In Review</option>
                          <option value="Repaired">Repaired</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleJumpToMap(p)}
                          className="p-1.5 bg-romer-sidebar hover:bg-romer-panel text-romer-cyan rounded-lg border border-romer-divider transition-colors"
                          title="View on Interactive GIS Map"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete this pothole record?')) deleteRecord(p.id); }}
                          className="p-1.5 bg-romer-sidebar hover:bg-rose-950/60 text-rose-400 rounded-lg border border-romer-divider transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-romer-divider bg-romer-sidebar flex items-center justify-between text-xs text-romer-text-muted">
          <span>Showing page {currentPage} of {totalPages} ({filtered.length} total entries)</span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 bg-romer-card border border-romer-divider rounded-lg disabled:opacity-50 hover:bg-romer-panel text-romer-text-main"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 bg-romer-card border border-romer-divider rounded-lg disabled:opacity-50 hover:bg-romer-panel text-romer-text-main"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Snapshot Image Preview Modal */}
      {previewPothole && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-romer-divider pb-2">
              <h3 className="text-sm font-h3 font-bold text-romer-text-main">{previewPothole.streetName}</h3>
              <button onClick={() => setPreviewPothole(null)} className="text-romer-text-muted hover:text-romer-text-main">✕</button>
            </div>
            {previewPothole.snapshotUrl && (
              <img src={previewPothole.snapshotUrl} alt="Visual Frame" className="w-full rounded-xl border border-romer-divider" />
            )}
            <div className="text-xs font-mono text-romer-text-muted space-y-1 bg-[#070708] p-3 rounded-xl border border-romer-divider">
              <p>ID: {previewPothole.id}</p>
              <p>Severity: <strong className="text-romer-amber">{previewPothole.severity}</strong> ({previewPothole.confidence}% confidence)</p>
              <p>Coordinates: {previewPothole.latitude}, {previewPothole.longitude}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

