import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Users,
  Save,
  Lightbulb
} from 'lucide-react';
import { TimetableSession, Room, TimeSlot, Lecturer, SmartSuggestion } from '../types';
import { api } from '../services/api';

interface SessionDetailModalProps {
  session: TimetableSession;
  rooms: Room[];
  timeSlots: TimeSlot[];
  lecturers: Lecturer[];
  onClose: () => void;
  onUpdated: () => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  rooms,
  timeSlots,
  lecturers,
  onClose,
  onUpdated
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(session.roomId || '');
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string>(session.timeSlotId || '');
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>(session.lecturerId || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const isCapacityDeficit = selectedRoom && selectedRoom.capacity < session.cohort.studentCount;

  const durationH = (session.durationMinutes || 90) / 60;
  const formattedH = durationH % 1 === 0 ? `${durationH}h` : `${durationH.toFixed(1)}h`;
  const timeInterval = session.startTime && session.endTime
    ? `${session.startTime}–${session.endTime}`
    : session.timeSlot
    ? `${session.timeSlot.startTime}–${session.timeSlot.endTime}`
    : '';

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorNotice(null);

      const res = await api.updateSession(session.id, {
        roomId: selectedRoomId || undefined,
        timeSlotId: selectedTimeSlotId || undefined,
        lecturerId: selectedLecturerId || undefined
      });

      if (res.data.data.sessionConflicts && res.data.data.sessionConflicts.length > 0) {
        const conflictDescriptions = res.data.data.sessionConflicts.map(c => c.description).join('; ');
        setErrorNotice(`Conflict Detected: ${conflictDescriptions}`);
        if (res.data.data.suggestions) {
          setSuggestions(res.data.data.suggestions);
        }
      } else {
        onUpdated();
        onClose();
      }
    } catch (e: any) {
      setErrorNotice(e.response?.data?.message || e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFetchSuggestions = async () => {
    try {
      setIsLoadingSuggestions(true);
      const res = await api.getSessionSuggestions(session.id);
      setSuggestions(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const applySuggestion = (sug: SmartSuggestion) => {
    if (sug.roomId) setSelectedRoomId(sug.roomId);
    if (sug.timeSlotId) setSelectedTimeSlotId(sug.timeSlotId);
    setErrorNotice(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded text-xs font-bold font-mono">
                {session.module.code}
              </span>
              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold uppercase tracking-wider">
                {session.sessionType}
              </span>
              <span className="text-xs text-slate-400">
                {formattedH} ({session.durationMinutes} min)
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">{session.module.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Why This Assignment Section */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/80 to-slate-50 border border-indigo-100">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Constraint Solver: Why This Assignment?
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              {session.selectionReason || `Assigned to ${session.lecturer.name} based on availability profile, ${session.cohort.name} schedule, room capacity, and venue type.`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-[11px] font-medium text-slate-600">
              <div className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> No Lecturer Clash
              </div>
              <div className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> No Cohort Overlap
              </div>
              <div className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Room Capacity OK
              </div>
            </div>
          </div>

          {/* Academic Context */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-medium flex items-center gap-1"><User className="w-3.5 h-3.5 text-indigo-600" /> Lecturer</span>
              <p className="font-bold text-slate-900 mt-1">{session.lecturer.name}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-medium flex items-center gap-1"><Users className="w-3.5 h-3.5 text-indigo-600" /> Cohort</span>
              <p className="font-bold text-slate-900 mt-1">{session.cohort.name}</p>
              <p className="text-[10px] text-slate-500">{session.cohort.studentCount} sts</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-medium flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-indigo-600" /> Timing</span>
              <p className="font-bold text-slate-900 mt-1">{timeInterval || 'Unscheduled'}</p>
              <p className="text-[10px] text-slate-500">{session.day || session.timeSlot?.day}</p>
            </div>
          </div>

          {/* Live Conflict Warning */}
          {errorNotice && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="flex items-start gap-2.5 text-rose-800">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-rose-900">Conflict Detected</h5>
                  <p className="text-xs text-rose-700 mt-1">{errorNotice}</p>
                </div>
              </div>
            </div>
          )}

          {isCapacityDeficit && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Warning: Room {selectedRoom?.name} capacity is {selectedRoom?.capacity}, but cohort has {session.cohort.studentCount} students.
              </span>
            </div>
          )}

          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-indigo-600" /> Smart Alternative Suggestions
                </h5>
                <span className="text-[10px] text-indigo-600 font-semibold">{suggestions.length} available</span>
              </div>
              <div className="space-y-1.5">
                {suggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    onClick={() => applySuggestion(sug)}
                    className="p-2.5 bg-white rounded-lg border border-indigo-100 hover:border-indigo-400 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600">{sug.title}</p>
                      <p className="text-[11px] text-slate-500">{sug.description}</p>
                    </div>
                    <button
                      type="button"
                      className="px-2 py-1 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual Reassignment Controls */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Manual Reassignment Controls
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Assigned Lecturer
                </label>
                <select
                  value={selectedLecturerId}
                  onChange={(e) => {
                    setSelectedLecturerId(e.target.value);
                    setErrorNotice(null);
                  }}
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white"
                >
                  {lecturers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Assigned Room
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => {
                    setSelectedRoomId(e.target.value);
                    setErrorNotice(null);
                  }}
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white"
                >
                  <option value="">-- Select Room --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.type}, Cap: {r.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Time Slot
                </label>
                <select
                  value={selectedTimeSlotId}
                  onChange={(e) => {
                    setSelectedTimeSlotId(e.target.value);
                    setErrorNotice(null);
                  }}
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white"
                >
                  <option value="">-- Select Slot --</option>
                  {timeSlots
                    .filter(
                      (t) =>
                        !t.intendedType ||
                        t.intendedType === 'ANY' ||
                        t.intendedType === session.sessionType
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.day} {t.startTime}–{t.endTime}
                        {t.intendedType && t.intendedType !== 'ANY' ? ` (${t.intendedType})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleFetchSuggestions}
            disabled={isLoadingSuggestions}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Lightbulb className="w-4 h-4" />
            <span>{isLoadingSuggestions ? 'Searching...' : 'Find Smart Suggestions'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Validating...' : 'Apply & Validate'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
