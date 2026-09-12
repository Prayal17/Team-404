import React from 'react';
import { CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ValidationReport } from '../types';

interface ConflictAlertBannerProps {
  validation?: ValidationReport;
}

export const ConflictAlertBanner: React.FC<ConflictAlertBannerProps> = ({ validation }) => {
  if (!validation) return null;

  if (validation.isValid) {
    return (
      <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border border-emerald-200/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
              <span>SCHEDULING STATUS: TIMETABLE VALID</span>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                0 Conflicts Detected
              </span>
            </h4>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-800 mt-0.5 font-medium">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Lecturer clashes: 0</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Room double-bookings: 0</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Cohort overlaps: 0</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Capacity violations: 0</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-amber-500/10 border border-rose-300 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/25 shrink-0 animate-bounce">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-rose-950 text-sm flex items-center gap-2">
            <span>SCHEDULING STATUS: {validation.conflictCount} CONFLICT{validation.conflictCount > 1 ? 'S' : ''} DETECTED</span>
            <span className="text-[11px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
              Action Required
            </span>
          </h4>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-rose-900 mt-0.5 font-medium">
            {validation.lecturerConflictCount > 0 && <span>✕ {validation.lecturerConflictCount} Lecturer clash</span>}
            {validation.roomConflictCount > 0 && <span>✕ {validation.roomConflictCount} Room double-booking</span>}
            {validation.cohortConflictCount > 0 && <span>✕ {validation.cohortConflictCount} Cohort overlap</span>}
            {validation.capacityViolationCount > 0 && <span>✕ {validation.capacityViolationCount} Capacity violation</span>}
          </div>
        </div>
      </div>
      <Link
        to="/conflicts"
        className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm shrink-0"
      >
        <span>View & Resolve Conflicts</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
};
