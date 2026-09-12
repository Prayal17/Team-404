import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Users,
  Layers,
  Building2,
  CalendarCheck,
  AlertTriangle,
  GraduationCap,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { ConflictAlertBanner } from '../components/ConflictAlertBanner';
import { EngineStatsModal } from '../components/EngineStatsModal';
import { api } from '../services/api';
import { DashboardOverview, SchedulingStats } from '../types';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingExams, setIsGeneratingExams] = useState(false);
  const [statsModalData, setStatsModalData] = useState<SchedulingStats | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const res = await api.getDashboard();
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleGenerateTimetable = async () => {
    try {
      setIsGenerating(true);
      const res = await api.generateTimetable();
      setStatsModalData(res.data.data.stats);
      setNotification('✓ Timetable successfully generated!');
      await fetchDashboard();
    } catch (e: any) {
      setNotification('Failed to generate timetable: ' + (e.response?.data?.message || e.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateExams = async () => {
    try {
      setIsGeneratingExams(true);
      const res = await api.generateExamSchedule();
      setNotification('✓ Exam schedule generated: ' + res.data.message);
      await fetchDashboard();
    } catch (e: any) {
      setNotification('Failed to generate exams: ' + (e.response?.data?.message || e.message));
    } finally {
      setIsGeneratingExams(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading Academic Planner Data...</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    modules: 0,
    lecturers: 0,
    cohorts: 0,
    rooms: 0,
    scheduledClasses: 0,
    unscheduledClasses: 0,
    conflicts: 0,
    examinations: 0,
    isTimetableValid: true,
    qualityScore: 0
  };

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Notifications */}
      {notification && (
        <div className="p-3.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg shadow-indigo-500/20">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-indigo-200 hover:text-white ml-4 cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* Top Banner & Generation Hub */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <Cpu className="w-3.5 h-3.5" />
            <span>Intelligent Constraint-Satisfaction Engine</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Automated Academic Scheduling & Venue Optimization
          </h2>
          <p className="text-slate-300 text-xs lg:text-sm leading-relaxed">
            Eliminates lecturer clashes, room double-bookings, cohort overlaps, and venue capacity violations in real time using heuristic constraint satisfaction.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={handleGenerateTimetable}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evaluating Constraints...</span>
                </>
              ) : (
                <span>GENERATE TIMETABLE</span>
              )}
            </button>

            <button
              onClick={handleGenerateExams}
              disabled={isGeneratingExams}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:text-white font-bold rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingExams ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Allocating Exam Venues...</span>
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                  <span>GENERATE EXAM SCHEDULE</span>
                </>
              )}
            </button>

            {data?.latestGenerationLog && (
              <button
                onClick={() => setStatsModalData(data.latestGenerationLog)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-indigo-300 hover:text-white font-medium transition-colors cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>View Engine Diagnostics</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Conflict Alert Banner */}
      <ConflictAlertBanner validation={data?.validation} />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Modules"
          value={summary.modules}
          subtitle="Active academic modules"
          icon={BookOpen}
          colorScheme="indigo"
        />
        <StatCard
          title="Lecturers"
          value={summary.lecturers}
          subtitle="Teaching faculty"
          icon={Users}
          colorScheme="slate"
        />
        <StatCard
          title="Cohorts"
          value={summary.cohorts}
          subtitle="Student groups"
          icon={Layers}
          colorScheme="slate"
        />
        <StatCard
          title="Rooms & Labs"
          value={summary.rooms}
          subtitle="Teaching venues"
          icon={Building2}
          colorScheme="slate"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Scheduled Classes"
          value={summary.scheduledClasses}
          subtitle="Active weekly blocks"
          icon={CalendarCheck}
          colorScheme="emerald"
          badge={summary.scheduledClasses > 0 ? 'Active' : 'Unscheduled'}
        />
        <StatCard
          title="Conflicts"
          value={summary.conflicts}
          subtitle={summary.conflicts === 0 ? 'All constraints satisfied' : 'Violations detected'}
          icon={AlertTriangle}
          colorScheme={summary.conflicts === 0 ? 'emerald' : 'rose'}
          badge={summary.conflicts === 0 ? '0' : String(summary.conflicts) + ' Issues'}
        />
        <StatCard
          title="Schedule Quality"
          value={String(summary.qualityScore) + '%'}
          subtitle="Optimization score"
          icon={Cpu}
          colorScheme="indigo"
        />
        <StatCard
          title="Examinations"
          value={summary.examinations}
          subtitle="Multi-venue schedules"
          icon={GraduationCap}
          colorScheme="amber"
        />
      </div>

      {/* Lower Dashboard Section: Room Utilization & Quick Links */}
      <div className="grid grid-cols-1 gap-6">
        {/* Room Utilization Preview */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Room & Venue Utilization</h3>
              <p className="text-xs text-slate-500">Weekly slot allocation percentages</p>
            </div>
            <Link to="/analytics" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Full Analytics <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 pt-2">
            {data?.roomUtilization?.map((r) => (
              <div key={r.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{r.name} ({r.type})</span>
                  <span className="font-mono text-slate-600 font-bold">{r.utilizationPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={'h-2 rounded-full transition-all duration-500 ' + (r.utilizationPercentage > 80 ? 'bg-indigo-600' : r.utilizationPercentage > 40 ? 'bg-indigo-400' : 'bg-slate-300')}
                    style={{ width: Math.max(4, r.utilizationPercentage) + '%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Engine Stats Modal */}
      {statsModalData && (
        <EngineStatsModal stats={statsModalData} onClose={() => setStatsModalData(null)} />
      )}
    </div>
  );
};
