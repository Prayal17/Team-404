import React from 'react';
import { RefreshCw, CheckCircle2, AlertOctagon } from 'lucide-react';

interface NavbarProps {
  onGenerateTimetable?: () => void;
  isGenerating?: boolean;
  isValid?: boolean;
  conflictCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onGenerateTimetable,
  isGenerating = false,
  isValid = true,
  conflictCount = 0
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
      {/* Title / Breadcrumb */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Intelligent Academic Planning & Resource Optimization
          </h1>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Status Indicator Pill */}
        <div
          className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            isValid
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
          }`}
        >
          {isValid ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Timetable Valid (0 Conflicts)</span>
            </>
          ) : (
            <>
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              <span>{conflictCount} Conflict{conflictCount > 1 ? 's' : ''} Detected</span>
            </>
          )}
        </div>

        {/* Generate Timetable Primary CTA Button */}
        {onGenerateTimetable && (
          <button
            onClick={onGenerateTimetable}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.98] text-white rounded-lg text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Solving Constraints...</span>
              </>
            ) : (
              <span>Generate Timetable</span>
            )}
          </button>
        )}
      </div>
    </header>
  );
};
