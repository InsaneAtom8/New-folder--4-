import React from 'react';
import { usePotholes } from '../../context/PotholeContext';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title 
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  TrendingUp, 
  FileSpreadsheet, 
  Printer, 
  Wrench,
  CheckCircle2,
  Building2
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export const AnalyticsDashboard: React.FC = () => {
  const { potholes, exportCSV, exportGeoJSON } = usePotholes();

  // Metrics computation
  const totalCount = potholes.length;
  const criticalCount = potholes.filter(p => p.severity === 'Critical').length;
  const moderateCount = potholes.filter(p => p.severity === 'Moderate').length;
  const minorCount = potholes.filter(p => p.severity === 'Minor').length;

  const repairedCount = potholes.filter(p => p.repairStatus === 'Repaired').length;
  const scheduledCount = potholes.filter(p => p.repairStatus === 'Scheduled').length;
  const reportedCount = potholes.filter(p => p.repairStatus === 'Reported').length;

  const avgConfidence = totalCount > 0
    ? Math.round(potholes.reduce((acc, curr) => acc + curr.confidence, 0) / totalCount)
    : 0;

  // Road Health Score computation (0-100)
  const healthPenalty = (criticalCount * 8) + (moderateCount * 4) + (minorCount * 1);
  const healthScore = Math.max(12, Math.min(100, 100 - healthPenalty));

  const getHealthRating = (score: number) => {
    if (score >= 85) return { label: 'Optimal Condition', color: 'text-emerald-400', border: 'border-emerald-500/40 bg-emerald-950/20' };
    if (score >= 65) return { label: 'Moderate Degradation', color: 'text-amber-400', border: 'border-amber-500/40 bg-amber-950/20' };
    return { label: 'Severe Hazard Risk', color: 'text-rose-400', border: 'border-rose-500/40 bg-rose-950/20' };
  };

  const rating = getHealthRating(healthScore);

  // Donut Chart Data
  const donutData = {
    labels: ['Critical Hazards', 'Moderate Potholes', 'Minor Defects'],
    datasets: [
      {
        data: [criticalCount, moderateCount, minorCount],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderColor: '#0b0f19',
        borderWidth: 3,
      },
    ],
  };

  // Status Bar Chart Data
  const barData = {
    labels: ['Reported', 'Scheduled', 'Repaired'],
    datasets: [
      {
        label: 'Pothole Count',
        data: [reportedCount, scheduledCount, repairedCount],
        backgroundColor: ['#38bdf8', '#f59e0b', '#10b981'],
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 11 },
        },
      },
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
    },
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-extrabold text-white tracking-wide">
              Municipal Road Health & AI Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated Road Infrastructure Condition Monitoring & Repair Maintenance Dispatch
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 rounded-xl flex items-center gap-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export CSV Report
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 text-xs font-extrabold rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition-transform"
          >
            <Printer className="w-4 h-4" /> Print Work Order
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Road Health Score Card */}
        <div className={`p-5 rounded-2xl border ${rating.border} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Health Index</span>
            <Activity className={`w-5 h-5 ${rating.color}`} />
          </div>
          <div className="my-2">
            <h3 className={`text-3xl font-extrabold font-mono ${rating.color}`}>{healthScore}<span className="text-sm font-sans font-normal text-slate-500">/100</span></h3>
            <p className="text-xs font-semibold text-white mt-1">{rating.label}</p>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className={`h-full ${healthScore > 70 ? 'bg-emerald-400' : healthScore > 40 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${healthScore}%` }} />
          </div>
        </div>

        {/* Total Scanned Potholes */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Hazards</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-extrabold font-mono text-white">{totalCount}</h3>
            <p className="text-xs text-slate-400 mt-1">Detected via Dashcam AI</p>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 font-semibold">100% Geotagged</span>
        </div>

        {/* Critical Hazards */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Critical Hazards</span>
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-extrabold font-mono text-rose-400">{criticalCount}</h3>
            <p className="text-xs text-slate-400 mt-1">Requires Emergency Patch</p>
          </div>
          <span className="text-[11px] font-mono text-rose-400 font-semibold">
            {totalCount > 0 ? Math.round((criticalCount / totalCount) * 100) : 0}% of Total
          </span>
        </div>

        {/* Average AI Confidence */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">YOLO Precision</span>
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-extrabold font-mono text-cyan-400">{avgConfidence}%</h3>
            <p className="text-xs text-slate-400 mt-1">Average Model Confidence</p>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">Roboflow Model v3</span>
        </div>

      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Severity Breakdown Donut Chart */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white tracking-wide">Severity Breakdown Distribution</h3>
            <span className="text-[10px] font-mono text-slate-400">Class Proportions</span>
          </div>
          <div className="h-64 relative flex items-center justify-center">
            <Doughnut data={donutData} options={chartOptions} />
          </div>
        </div>

        {/* Repair Status Bar Chart */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white tracking-wide">Maintenance Lifecycle Status</h3>
            <span className="text-[10px] font-mono text-slate-400">Workflow Progress</span>
          </div>
          <div className="h-64 relative">
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>

      </div>

      {/* Top Priority Hazardous Corridors List */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-400" /> High-Priority Municipal Maintenance Corridors
          </h3>
          <span className="text-xs text-slate-400">Sorted by Severity & Area</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {potholes.slice(0, 5).map((p, i) => (
            <div key={p.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-cyan-400 font-mono font-bold flex items-center justify-center text-[11px]">
                  #{i + 1}
                </span>
                <div>
                  <h4 className="font-bold text-white">{p.streetName}</h4>
                  <p className="text-slate-500 font-mono text-[10px]">
                    GPS: {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)} • Speed: {p.speedKmH} km/h
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                  p.severity === 'Critical' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {p.severity}
                </span>
                <span className="text-slate-300 font-bold">{p.estimatedAreaCm2} cm²</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
