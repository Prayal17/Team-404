import React from 'react';
import { X, Cpu, CheckCircle, AlertTriangle } from 'lucide-react';
import { SchedulingStats } from '../types';

interface EngineStatsModalProps {
  stats: SchedulingStats;
  onClose: () => void;
}

export const EngineStatsModal: React.FC<EngineStatsModalProps> = ({ stats, onClose }) => {
  const isAllScheduled = stats.unscheduledCount === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Constraint Solver Analytics</h3>
              <p className="text-xs text-slate-400">Execution transparency & candidate pruning metrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Top KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Candidate Evaluations</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats.candidateEvaluations}</p>
            </div>
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
              <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Quality Score</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{stats.qualityScore}%</p>
            </div>
            <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
              <p className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Execution Time</p>
              <p className="text-2xl font-black text-indigo-700 mt-1">{stats.executionTimeMs} ms</p>
            </div>
          </div>

          {/* Pass / Fail Solver Diagnostics Summary */}
          {isAllScheduled ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-emerald-900 text-sm">
                  All {stats.totalRequirements} sessions were placed with zero lecturer/room/cohort clashes
                </p>
                <p className="text-emerald-700 text-xs leading-relaxed">
                  The solver checked {stats.candidateEvaluations} combinations and ruled out {stats.rejectionsCount} invalid ones before finding a valid option for every session.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 text-xs">
                  <p className="font-bold text-amber-900 text-sm">
                    {stats.unscheduledCount} of {stats.totalRequirements} sessions could not be placed
                  </p>
                  <p className="text-amber-700 text-xs leading-relaxed">
                    The solver checked {stats.candidateEvaluations} combinations and ruled out {stats.rejectionsCount} invalid ones before finding a valid option for every session.
                  </p>
                </div>
              </div>

              {stats.unscheduledItems && stats.unscheduledItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Unplaced Sessions
                  </h4>
                  <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto pr-1">
                    {stats.unscheduledItems.slice(0, 5).map((item, index) => (
                      <div
                        key={index}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700"
                      >
                        <span className="font-semibold text-slate-900">
                          {item.moduleCode} ({item.sessionType})
                        </span>{' '}
                        — <span className="text-slate-600">{item.reason}</span>
                      </div>
                    ))}
                    {stats.unscheduledItems.length > 5 && (
                      <p className="text-center text-xs text-slate-500 font-medium py-1">
                        +{stats.unscheduledItems.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
