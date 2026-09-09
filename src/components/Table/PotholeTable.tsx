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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-lg font-extrabold text-white tracking-wide flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-cyan-400" /> Pothole Spatial Registry & Master Log
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            IndexedDB persistent database records with frame visual snapshots & repair status lifecycle
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => deduplicateDatabase(15)}
            title="Consolidate duplicate observations within 15 meters"
            className="px-3.5 py-2 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/80 text-xs font-semibold text-cyan-300 rounded-xl flex items-center gap-1.5 transition-all shadow-sm shadow-cyan-950"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Merge Duplicates
          </button>
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" /> CSV
          </button>
          <button
            onClick={exportGeoJSON}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" /> GeoJSON
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search street name or ID..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Severity:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="Moderate">Moderate</option>
              <option value="Minor">Minor</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
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
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No pothole records match the filter criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((p) => {
                  const sevBadge = {
                    Critical: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                    Moderate: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                    Minor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                  };

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      
                      {/* Image Thumbnail */}
                      <td className="p-4">
                        {p.snapshotUrl ? (
                          <div
                            onClick={() => setPreviewPothole(p)}
                            className="w-12 h-9 rounded-lg overflow-hidden border border-slate-700 bg-black cursor-pointer hover:scale-105 transition-transform"
                          >
                            <img src={p.snapshotUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 font-mono text-[10px]">
                            N/A
                          </div>
                        )}
                      </td>

                      {/* Location */}
                      <td className="p-4">
                        <h4 className="font-bold text-white text-xs">{p.streetName}</h4>
                        <span className="font-mono text-[10px] text-slate-500">{p.id}</span>
                      </td>

                      {/* Coords */}
                      <td className="p-4 font-mono text-[11px] text-slate-300">
                        {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                      </td>

                      {/* Severity */}
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${sevBadge[p.severity]}`}>
                          {p.severity}
                        </span>
                      </td>

                      {/* Confidence */}
                      <td className="p-4 font-mono text-cyan-400 font-bold">
                        {p.confidence}%
                      </td>

                      {/* Speed */}
                      <td className="p-4 font-mono text-slate-300">
                        {p.speedKmH} km/h
                      </td>

                      {/* Repair Status Select */}
                      <td className="p-4">
                        <select
                          value={p.repairStatus}
                          onChange={(e) => updateStatus(p.id, e.target.value as RepairStatus)}
                          className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 font-semibold focus:outline-none"
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
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg transition-colors"
                          title="View on Interactive GIS Map"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete this pothole record?')) deleteRecord(p.id); }}
                          className="p-1.5 bg-slate-800 hover:bg-rose-950/60 text-rose-400 rounded-lg transition-colors"
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
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Showing page {currentPage} of {totalPages} ({filtered.length} total entries)</span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-50 hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-50 hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Snapshot Image Preview Modal */}
      {previewPothole && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{previewPothole.streetName}</h3>
              <button onClick={() => setPreviewPothole(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            {previewPothole.snapshotUrl && (
              <img src={previewPothole.snapshotUrl} alt="Visual Frame" className="w-full rounded-xl border border-slate-800" />
            )}
            <div className="text-xs font-mono text-slate-400 space-y-1">
              <p>ID: {previewPothole.id}</p>
              <p>Severity: <strong className="text-amber-400">{previewPothole.severity}</strong> ({previewPothole.confidence}% confidence)</p>
              <p>Coordinates: {previewPothole.latitude}, {previewPothole.longitude}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
