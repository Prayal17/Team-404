import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Lightbulb
} from 'lucide-react';
import { api } from '../services/api';
import { ValidationReport, TimetableSession, Room, TimeSlot, Lecturer } from '../types';
import { SessionDetailModal } from '../components/SessionDetailModal';

export const ConflictsPage: React.FC = () => {
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [sessions, setSessions] = useState<TimetableSession[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFixing, setIsFixing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TimetableSession | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [resTimetable, resRooms, resSlots, resLecturers] = await Promise.all([
        api.getTimetable(),
        api.getRooms(),
        api.getTimeSlots(),
        api.getLecturers()
      ]);

      setValidation(resTimetable.data.data.validation);
      setSessions(resTimetable.data.data.sessions);
      setRooms(resRooms.data.data);
      setTimeSlots(resSlots.data.data);
      setLecturers(resLecturers.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAutoResolve = async () => {
    try {
      setIsFixing(true);
      await api.generateTimetable();
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsFixing(false);
    }
  };

  if (isLoading && !validation) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const conflicts = validation?.conflicts || [];

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Conflict Detection & Diagnostic Engine
          </h2>
          <p className="text-xs text-slate-500">
            Live validation of hard constraints: Lecturer availability, Cohort overlaps, Room clashes, and Capacity bounds.
          </p>
        </div>

        {conflicts.length > 0 && (
          <button
            onClick={handleAutoResolve}
            disabled={isFixing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            {isFixing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Auto-Resolve with Constraint Solver</span>
          </button>
        )}
      </div>

      {/* Big Status Hero */}
      {validation?.isValid ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-3">
          <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-emerald-950">ALL CONSTRAINTS SATISFIED</h3>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">
            The current academic timetable has 0 lecturer clashes, 0 room double-bookings, 0 cohort overlaps, and 0 capacity deficits.
          </p>
          <div className="inline-flex items-center gap-6 pt-2 text-xs font-semibold text-emerald-900">
            <span>✓ {validation.scheduledCount} Scheduled Sessions Valid</span>
            <span>✓ 100% Hard Constraint Adherence</span>
          </div>
        </div>
      ) : (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 lg:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-600/25 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-950">
                {conflicts.length} CONSTRAINTS VIOLATION{conflicts.length > 1 ? 'S' : ''} DETECTED
              </h3>
              <p className="text-xs text-rose-800">
                The scheduler detected hard resource clashes. Choose manual reassignment with smart alternatives or run automatic solver.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Conflicts List */}
      {conflicts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Active Conflicts Breakdown
          </h4>
          <div className="space-y-3">
            {conflicts.map((conflict, index) => {
              const involvedSession = sessions.find(s => conflict.involvedSessionIds.includes(s.id));

              return (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-rose-200 p-5 shadow-sm space-y-3 hover:border-rose-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded text-[10px] uppercase font-mono">
                            {conflict.type}
                          </span>
                          <h5 className="font-bold text-slate-900 text-sm">{conflict.title}</h5>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {conflict.description}
                        </p>
                      </div>
                    </div>

                    {involvedSession && (
                      <button
                        onClick={() => setSelectedSession(involvedSession)}
                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>Inspect & Reassign</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Session Modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          rooms={rooms}
          timeSlots={timeSlots}
          lecturers={lecturers}
          onClose={() => setSelectedSession(null)}
          onUpdated={loadData}
        />
      )}
    </div>
  );
};
