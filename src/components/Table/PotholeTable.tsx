import React, { useState } from 'react';
import { usePotholes } from '../../context/PotholeContext';
import { RepairStatus, SeverityLevel, PotholeRecord } from '../../types/pothole';
import { AdminLoginModal } from '../Common/AdminLoginModal';
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
  Sparkles,
  Lock,
  LogOut,
  ShieldCheck
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
    setActiveTab,
    isAdminAuthenticated,
    loginAdmin,
    logoutAdmin
  } = usePotholes();

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [previewPothole, setPreviewPothole] = useState<PotholeRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // If user is not authenticated as admin, show security checkpoint
  if (!isAdminAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-[#000000] text-[#FFFFFF] flex items-center justify-center mx-auto shadow-xl">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-normal text-[#000000] tracking-tight">
            Restricted <span className="serif-italic font-normal">Data Registry</span>
          </h2>
          <p className="text-sm text-[#444444] max-w-md mx-auto leading-relaxed">
            The municipal pothole registry and maintenance records are protected. Please authenticate with administrator credentials to view and manage work orders.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setIsAdminModalOpen(true)}
            className="px-8 py-3 bg-[#000000] hover:bg-[#222222] text-[#FFFFFF] font-medium text-sm rounded-full shadow-md transition-all active:scale-95 inline-flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Sign In as Admin</span>
          </button>
        </div>

        <div className="pt-4 text-xs font-mono text-[#666666]">
          Authorized: <strong className="text-[#000000]">admin@gmail.com</strong>
        </div>

        <AdminLoginModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          onSuccess={loginAdmin}
        />
      </div>
    );
  }

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFFFFF] border border-black/10 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-normal text-[#000000] tracking-tight flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-[#000000]" /> Pothole Spatial Registry & Master Log
          </h2>
          <p className="text-xs text-[#222222] mt-0.5">
            IndexedDB persistent database records with frame visual snapshots & repair status lifecycle
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => deduplicateDatabase(15)}
            title="Consolidate duplicate observations within 15 meters"
            className="px-4 py-2 bg-black/5 hover:bg-black/10 border border-black/20 text-xs font-medium text-[#000000] rounded-full flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#000000]" /> Merge Duplicates
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-[#F2F2F2] hover:bg-black/5 border border-black/10 text-xs font-medium text-[#000000] rounded-full flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#000000]" /> CSV
          </button>
          <button
            onClick={exportGeoJSON}
            className="px-4 py-2 bg-[#F2F2F2] hover:bg-black/5 border border-black/10 text-xs font-medium text-[#000000] rounded-full flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#000000]" /> GeoJSON
          </button>
          <button
            onClick={logoutAdmin}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-medium text-red-700 rounded-full flex items-center gap-1.5 transition-colors shadow-sm"
            title="Log out of Admin session"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-[#FFFFFF] border border-black/10 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs shadow-sm">
        
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-[#222222] absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search street name or ID..."
            className="w-full bg-[#F2F2F2] border border-black/10 rounded-xl pl-9 pr-3 py-2 text-[#000000] placeholder:text-[#222222] focus:outline-none focus:border-[#000000]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-[#222222] font-medium font-mono text-[11px]">Severity:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="bg-[#F2F2F2] border border-black/10 rounded-lg px-2.5 py-1.5 text-[#000000] focus:outline-none"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="Moderate">Moderate</option>
              <option value="Minor">Minor</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#222222] font-medium font-mono text-[11px]">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-[#F2F2F2] border border-black/10 rounded-lg px-2.5 py-1.5 text-[#000000] focus:outline-none"
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
      <div className="bg-[#FFFFFF] border border-black/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F2F2F2] border-b border-black/10 text-[#222222] font-mono text-[11px] uppercase tracking-wider">
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
            <tbody className="divide-y divide-black/10 font-sans">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#222222]">
                    No pothole records match the filter criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((p) => {
                  const sevBadge = {
                    Critical: 'bg-[#000000] text-[#FFFFFF]',
                    Moderate: 'bg-black/10 text-[#000000] border-black/20',
                    Minor: 'bg-[#F2F2F2] text-[#000000] border-black/10',
                  };

                  return (
                    <tr key={p.id} className="hover:bg-black/5 transition-colors">
                      
                      {/* Image Thumbnail */}
                      <td className="p-4">
                        {p.snapshotUrl ? (
                          <div
                            onClick={() => setPreviewPothole(p)}
                            className="w-12 h-9 rounded-lg overflow-hidden border border-black/10 bg-[#000000] cursor-pointer hover:scale-105 transition-transform"
                          >
                            <img src={p.snapshotUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-9 rounded-lg bg-[#F2F2F2] border border-black/10 flex items-center justify-center text-[#222222] font-mono text-[10px]">
                            N/A
                          </div>
                        )}
                      </td>

                      {/* Location */}
                      <td className="p-4">
                        <h4 className="font-bold text-[#000000] text-xs">{p.streetName}</h4>
                        <span className="font-mono text-[10px] text-[#222222]">{p.id}</span>
                      </td>

                      {/* Coords */}
                      <td className="p-4 font-mono text-[11px] text-[#000000]">
                        {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                      </td>

                      {/* Severity */}
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-medium ${sevBadge[p.severity]}`}>
                          {p.severity}
                        </span>
                      </td>

                      {/* Confidence */}
                      <td className="p-4 font-mono text-[#000000] font-bold">
                        {p.confidence}%
                      </td>

                      {/* Speed */}
                      <td className="p-4 font-mono text-[#000000]">
                        {p.speedKmH} km/h
                      </td>

                      {/* Repair Status Select */}
                      <td className="p-4">
                        <select
                          value={p.repairStatus}
                          onChange={(e) => updateStatus(p.id, e.target.value as RepairStatus)}
                          className="bg-[#F2F2F2] border border-black/10 text-[#000000] text-xs rounded-lg px-2 py-1 font-medium focus:outline-none"
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
                          className="p-1.5 bg-[#F2F2F2] hover:bg-black/10 text-[#000000] rounded-lg border border-black/10 transition-colors"
                          title="View on Interactive GIS Map"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete this pothole record?')) deleteRecord(p.id); }}
                          className="p-1.5 bg-[#F2F2F2] hover:bg-rose-50 text-rose-600 rounded-lg border border-black/10 transition-colors"
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
        <div className="p-4 border-t border-black/10 bg-[#F2F2F2] flex items-center justify-between text-xs text-[#222222]">
          <span>Showing page {currentPage} of {totalPages} ({filtered.length} total entries)</span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 bg-[#FFFFFF] border border-black/10 rounded-lg disabled:opacity-50 hover:bg-black/5 text-[#000000]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 bg-[#FFFFFF] border border-black/10 rounded-lg disabled:opacity-50 hover:bg-black/5 text-[#000000]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Snapshot Image Preview Modal */}
      {previewPothole && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-black/10 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 pb-2">
              <h3 className="text-sm font-bold text-[#000000]">{previewPothole.streetName}</h3>
              <button onClick={() => setPreviewPothole(null)} className="text-[#222222] hover:text-[#000000]">✕</button>
            </div>
            {previewPothole.snapshotUrl && (
              <img src={previewPothole.snapshotUrl} alt="Visual Frame" className="w-full rounded-xl border border-black/10" />
            )}
            <div className="text-xs font-mono text-[#222222] space-y-1 bg-[#F2F2F2] p-3 rounded-xl border border-black/10">
              <p>ID: {previewPothole.id}</p>
              <p>Severity: <strong className="text-[#000000]">{previewPothole.severity}</strong> ({previewPothole.confidence}% confidence)</p>
              <p>Coordinates: {previewPothole.latitude}, {previewPothole.longitude}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

