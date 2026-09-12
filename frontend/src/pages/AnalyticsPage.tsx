import React, { useEffect, useState } from 'react';
import { BarChart3, Building2, Users, Cpu, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { DashboardOverview } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(res => {
      setData(res.data.data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading || !data) return <div className="p-8 text-center text-xs">Loading analytics...</div>;

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          Academic Scheduling & Resource Analytics
        </h2>
        <p className="text-xs text-slate-500">
          In-depth reports on venue utilization, faculty workload distribution, and solver execution metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Utilization */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Venue Utilization Index</h3>
          </div>
          <div className="space-y-3">
            {data.roomUtilization.map(r => (
              <div key={r.id} className="space-y-1 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-800 font-semibold">{r.name} ({r.type})</span>
                  <span className="font-mono text-indigo-700 font-bold">{r.scheduledCount} slots booked ({r.utilizationPercentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: Math.max(4, r.utilizationPercentage) + '%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Faculty Workload */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Faculty Workload Distribution</h3>
          </div>
          <div className="space-y-3">
            {data.facultyWorkload.map(f => (
              <div key={f.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{f.name}</p>
                  <p className="text-[11px] text-slate-500">{f.department}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 font-mono text-sm">{f.weeklyTeachingHours} hrs</span>
                  <p className="text-[10px] text-slate-500">{f.scheduledSessionCount} sessions/wk</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
