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
        backgroundColor: ['#000000', '#666666', '#CCCCCC'],
        borderColor: '#FFFFFF',
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
        backgroundColor: ['#000000', '#555555', '#AAAAAA'],
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
          color: '#000000',
          font: { family: 'Instrument Sans', size: 11 },
        },
      },
    },
    scales: {
      x: { ticks: { color: '#222222' }, grid: { color: 'rgba(0,0,0,0.05)' } },
      y: { ticks: { color: '#222222' }, grid: { color: 'rgba(0,0,0,0.05)' } },
    },
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFFFFF] border border-black/10 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#000000]" />
            <h2 className="text-xl font-normal text-[#000000] tracking-tight">
              Municipal Road Health & AI Analytics
            </h2>
          </div>
          <p className="text-xs text-[#222222] mt-1">
            Automated Road Infrastructure Condition Monitoring & Repair Maintenance Dispatch
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-[#F2F2F2] hover:bg-black/5 border border-black/10 text-xs font-medium text-[#000000] rounded-full flex items-center gap-2 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#000000]" /> Export CSV Report
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#000000] hover:bg-[#222222] text-[#FFFFFF] text-xs font-medium rounded-full flex items-center gap-2 shadow-md transition-all"
          >
            <Printer className="w-4 h-4" /> Print Work Order
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Road Health Score Card */}
        <div className="p-5 rounded-2xl border border-black/10 flex flex-col justify-between shadow-sm bg-[#FFFFFF]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#222222] uppercase tracking-wider font-mono">Health Index</span>
            <Activity className="w-5 h-5 text-[#000000]" />
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-extrabold font-mono text-[#000000]">{healthScore}<span className="text-sm font-sans font-normal text-[#222222]">/100</span></h3>
            <p className="text-xs font-medium text-[#000000] mt-1">{rating.label}</p>
          </div>
          <div className="w-full bg-[#F2F2F2] h-1.5 rounded-full overflow-hidden border border-black/10">
            <div className="h-full bg-[#000000]" style={{ width: `${healthScore}%` }} />
          </div>
        </div>

        {/* Total Scanned Potholes */}
        <div className="bg-[#FFFFFF] border border-black/10 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#222222] uppercase tracking-wider font-mono">Total Hazards</span>
            <AlertTriangle className="w-5 h-5 text-[#000000]" />
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-extrabold font-mono text-[#000000]">{totalCount}</h3>
            <p className="text-xs text-[#222222] mt-1">Detected via Dashcam AI</p>
          </div>
          <span className="text-[11px] font-mono text-[#000000] font-medium">100% Geotagged</span>
        </div>

        {/* Critical Hazards */}
        <div className="bg-[#FFFFFF] border border-black/10 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#222222] uppercase tracking-wider font-mono">Critical Hazards</span>
            <AlertTriangle className="w-5 h-5 text-[#000000]" />
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-extrabold font-mono text-[#000000]">{criticalCount}</h3>
            <p className="text-xs text-[#222222] mt-1">Requires Emergency Patch</p>
          </div>
          <span className="text-[11px] font-mono text-[#000000] font-medium">
            {totalCount > 0 ? Math.round((criticalCount / totalCount) * 100) : 0}% of Total
          </span>
        </div>

        {/* Average AI Precision */}
        <div className="bg-[#FFFFFF] border border-black/10 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#222222] uppercase tracking-wider font-mono">YOLO Precision</span>
            <ShieldCheck className="w-5 h-5 text-[#000000]" />
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-extrabold font-mono text-[#000000]">{avgConfidence}%</h3>
            <p className="text-xs text-[#222222] mt-1">Average Model Confidence</p>
          </div>
          <span className="text-[11px] font-mono text-[#000000] font-medium">YOLOv12 Neural AI</span>
        </div>

      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Severity Breakdown Donut Chart */}
        <div className="bg-[#FFFFFF] border border-black/10 p-5 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-black/10 pb-3">
            <h3 className="text-sm font-medium text-[#000000] tracking-tight">Severity Breakdown Distribution</h3>
            <span className="text-[10px] font-mono text-[#222222]">Class Proportions</span>
          </div>
          <div className="h-64 relative flex items-center justify-center">
            <Doughnut data={donutData} options={chartOptions} />
          </div>
        </div>

        {/* Repair Status Bar Chart */}
        <div className="bg-[#FFFFFF] border border-black/10 p-5 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-black/10 pb-3">
            <h3 className="text-sm font-medium text-[#000000] tracking-tight">Maintenance Lifecycle Status</h3>
            <span className="text-[10px] font-mono text-[#222222]">Workflow Progress</span>
          </div>
          <div className="h-64 relative">
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>

      </div>

      {/* Top Priority Hazardous Corridors List */}
      <div className="bg-[#FFFFFF] border border-black/10 p-5 rounded-2xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-black/10 pb-3">
          <h3 className="text-sm font-medium text-[#000000] tracking-tight flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#000000]" /> High-Priority Municipal Corridors
          </h3>
          <span className="text-xs text-[#222222]">Sorted by Severity & Surface Area</span>
        </div>

        <div className="divide-y divide-black/10">
          {potholes.slice(0, 5).map((p, i) => (
            <div key={p.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#000000] text-[#FFFFFF] font-mono font-medium flex items-center justify-center text-[11px]">
                  #{i + 1}
                </span>
                <div>
                  <h4 className="font-bold text-[#000000]">{p.streetName}</h4>
                  <p className="text-[#222222] font-mono text-[10px]">
                    GPS: {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)} • Speed: {p.speedKmH} km/h
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                  p.severity === 'Critical' ? 'bg-[#000000] text-[#FFFFFF]' : 'bg-black/10 text-[#000000] border border-black/10'
                }`}>
                  {p.severity}
                </span>
                <span className="text-[#000000] font-bold">{p.estimatedAreaCm2} cm²</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

