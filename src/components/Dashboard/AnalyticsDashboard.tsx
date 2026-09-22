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
    if (score >= 85) return { label: 'Optimal Condition', color: 'text-romer-cyan', border: 'border-romer-cyan/40 bg-romer-cyan/10' };
    if (score >= 65) return { label: 'Moderate Degradation', color: 'text-romer-amber', border: 'border-romer-amber/40 bg-romer-amber/10' };
    return { label: 'Severe Hazard Risk', color: 'text-rose-400', border: 'border-rose-500/40 bg-rose-950/20' };
  };

  const rating = getHealthRating(healthScore);

  // Donut Chart Data
  const donutData = {
    labels: ['Critical Hazards', 'Moderate Potholes', 'Minor Defects'],
    datasets: [
      {
        data: [criticalCount, moderateCount, minorCount],
        backgroundColor: ['#ffb4ab', '#ffb689', '#50d8e9'],
        borderColor: '#101112',
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
        backgroundColor: ['#5E6BFF', '#ffb689', '#50d8e9'],
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
          color: '#9A9DA3',
          font: { family: 'Inter', size: 11 },
        },
      },
    },
    scales: {
      x: { ticks: { color: '#9A9DA3' }, grid: { color: '#232426' } },
      y: { ticks: { color: '#9A9DA3' }, grid: { color: '#232426' } },
    },
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-romer-card border border-romer-divider p-6 rounded-xl inner-glow">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-romer-cyan" />
            <h2 className="text-xl font-h2 font-bold text-romer-text-main tracking-wide">
              Municipal Road Health & AI Analytics
            </h2>
          </div>
          <p className="text-xs text-romer-text-muted mt-1">
            Automated Road Infrastructure Condition Monitoring & Repair Maintenance Dispatch
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-romer-sidebar hover:bg-romer-panel border border-romer-divider text-xs font-bold text-romer-text-main rounded-xl flex items-center gap-2 transition-colors inner-glow"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export CSV Report
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-romer-primary hover:bg-romer-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-romer-primary/25 hover:scale-[1.02] transition-transform font-h3"
          >
            <Printer className="w-4 h-4" /> Print Work Order
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Road Health Score Card */}
        <div className={`p-5 rounded-xl border ${rating.border} flex flex-col justify-between inner-glow`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-romer-text-muted uppercase tracking-wider font-mono">Health Index</span>
            <Activity className={`w-5 h-5 ${rating.color}`} />
          </div>
          <div className="my-2">
            <h3 className={`text-3xl font-extrabold font-mono ${rating.color}`}>{healthScore}<span className="text-sm font-sans font-normal text-romer-text-muted">/100</span></h3>
            <p className="text-xs font-semibold text-romer-text-main mt-1">{rating.label}</p>
          </div>
          <div className="w-full bg-romer-sidebar h-1.5 rounded-full overflow-hidden border border-romer-divider">
            <div className={`h-full ${healthScore > 70 ? 'bg-romer-cyan' : healthScore > 40 ? 'bg-romer-amber' : 'bg-rose-400'}`} style={{ width: `${healthScore}%` }} />
          </div>
        </div>

        {/* Total Scanned Potholes */}
        <div className="bg-romer-card border border-romer-divider p-5 rounded-xl flex flex-col justify-between inner-glow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-romer-text-muted uppercase tracking-wider font-mono">Total Hazards</span>
            <AlertTriangle className="w-5 h-5 text-romer-amber" />
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-extrabold font-mono text-romer-text-main">{totalCount}</h3>
            <p className="text-xs text-romer-text-muted mt-1">Detected via Dashcam AI</p>
          </div>
          <span className="text-[11px] font-mono text-romer-cyan font-semibold">100% Geotagged</span>
        </div>

        {/* Critical Hazards */}
        <div className="bg-romer-card border border-romer-divider p-5 rounded-xl flex flex-col justify-between inner-glow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-romer-text-muted uppercase tracking-wider font-mono">Critical Hazards</span>
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-extrabold font-mono text-rose-400">{criticalCount}</h3>
            <p className="text-xs text-romer-text-muted mt-1">Requires Emergency Patch</p>
          </div>
          <span className="text-[11px] font-mono text-rose-400 font-semibold">
            {totalCount > 0 ? Math.round((criticalCount / totalCount) * 100) : 0}% of Total
          </span>
        </div>

        {/* Average AI Confidence */}
        <div className="bg-romer-card border border-romer-divider p-5 rounded-xl flex flex-col justify-between inner-glow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-romer-text-muted uppercase tracking-wider font-mono">YOLO Precision</span>
            <ShieldCheck className="w-5 h-5 text-romer-cyan" />
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-extrabold font-mono text-romer-cyan">{avgConfidence}%</h3>
            <p className="text-xs text-romer-text-muted mt-1">Average Model Confidence</p>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">YOLOv12 PyResearch AI</span>
        </div>

      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Severity Breakdown Donut Chart */}
        <div className="bg-romer-card border border-romer-divider p-5 rounded-xl space-y-4 inner-glow">
          <div className="flex items-center justify-between border-b border-romer-divider pb-3">
            <h3 className="text-sm font-h3 font-bold text-romer-text-main tracking-wide">Severity Breakdown Distribution</h3>
            <span className="text-[10px] font-mono text-romer-text-muted">Class Proportions</span>
          </div>
          <div className="h-64 relative flex items-center justify-center">
            <Doughnut data={donutData} options={chartOptions} />
          </div>
        </div>

        {/* Repair Status Bar Chart */}
        <div className="bg-romer-card border border-romer-divider p-5 rounded-xl space-y-4 inner-glow">
          <div className="flex items-center justify-between border-b border-romer-divider pb-3">
            <h3 className="text-sm font-h3 font-bold text-romer-text-main tracking-wide">Maintenance Lifecycle Status</h3>
            <span className="text-[10px] font-mono text-romer-text-muted">Workflow Progress</span>
          </div>
          <div className="h-64 relative">
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>

      </div>

      {/* Top Priority Hazardous Corridors List */}
      <div className="bg-romer-card border border-romer-divider p-5 rounded-xl space-y-4 inner-glow">
        <div className="flex items-center justify-between border-b border-romer-divider pb-3">
          <h3 className="text-sm font-h3 font-bold text-romer-text-main tracking-wide flex items-center gap-2">
            <Wrench className="w-4 h-4 text-romer-amber" /> High-Priority Municipal Maintenance Corridors
          </h3>
          <span className="text-xs text-romer-text-muted">Sorted by Severity & Area</span>
        </div>

        <div className="divide-y divide-romer-divider">
          {potholes.slice(0, 5).map((p, i) => (
            <div key={p.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-romer-sidebar border border-romer-divider text-romer-cyan font-mono font-bold flex items-center justify-center text-[11px]">
                  #{i + 1}
                </span>
                <div>
                  <h4 className="font-bold text-romer-text-main">{p.streetName}</h4>
                  <p className="text-romer-text-muted font-mono text-[10px]">
                    GPS: {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)} • Speed: {p.speedKmH} km/h
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                  p.severity === 'Critical' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' : 'bg-romer-amber/10 text-romer-amber border border-romer-amber/20'
                }`}>
                  {p.severity}
                </span>
                <span className="text-romer-text-main font-bold">{p.estimatedAreaCm2} cm²</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

