import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Filter,
  User,
  Calendar,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { TimetableSession, Room, TimeSlot, Lecturer, Cohort, ValidationReport, SchedulingStats } from '../types';
import { SessionDetailModal } from '../components/SessionDetailModal';
import { ConflictAlertBanner } from '../components/ConflictAlertBanner';
import { EngineStatsModal } from '../components/EngineStatsModal';

export const TimetablePage: React.FC = () => {
  const [sessions, setSessions] = useState<TimetableSession[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [validation, setValidation] = useState<ValidationReport | undefined>(undefined);

  const [filterCohortId, setFilterCohortId] = useState<string>('ALL');
  const [filterLecturerId, setFilterLecturerId] = useState<string>('ALL');
  const [filterRoomId, setFilterRoomId] = useState<string>('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TimetableSession | null>(null);
  const [statsModalData, setStatsModalData] = useState<SchedulingStats | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [resTimetable, resRooms, resSlots, resLecturers, resCohorts] = await Promise.all([
        api.getTimetable({
          cohortId: filterCohortId !== 'ALL' ? filterCohortId : undefined,
          lecturerId: filterLecturerId !== 'ALL' ? filterLecturerId : undefined,
          roomId: filterRoomId !== 'ALL' ? filterRoomId : undefined
        }),
        api.getRooms(),
        api.getTimeSlots(),
        api.getLecturers(),
        api.getCohorts()
      ]);

      setSessions(resTimetable.data.data.sessions);
      setValidation(resTimetable.data.data.validation);
      setRooms(resRooms.data.data);
      setTimeSlots(resSlots.data.data);
      setLecturers(resLecturers.data.data);
      setCohorts(resCohorts.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterCohortId, filterLecturerId, filterRoomId]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const res = await api.generateTimetable();
      setStatsModalData(res.data.data.stats);
      await loadData();
    } catch (e: any) {
      alert('Error generating: ' + (e.response?.data?.message || e.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear the timetable?')) {
      await api.clearTimetable();
      await loadData();
    }
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Derive distinct chronological time slot rows across all session types
  const gridRows = React.useMemo(() => {
    const rowMap = new Map<string, { start: string; end: string; intendedType?: string; label: string }>();
    
    // Sort all timeSlots chronologically by start time, then end time
    const sortedSlots = [...timeSlots].sort((a, b) => {
      const cmp = a.startTime.localeCompare(b.startTime);
      if (cmp !== 0) return cmp;
      return a.endTime.localeCompare(b.endTime);
    });

    for (const slot of sortedSlots) {
      const key = `${slot.startTime}_${slot.endTime}_${slot.intendedType || 'ANY'}`;
      if (!rowMap.has(key)) {
        const typeLabel = slot.intendedType && slot.intendedType !== 'ANY'
          ? ` (${slot.intendedType.charAt(0) + slot.intendedType.slice(1).toLowerCase()})`
          : '';
        rowMap.set(key, {
          start: slot.startTime,
          end: slot.endTime,
          intendedType: slot.intendedType,
          label: `${slot.startTime} – ${slot.endTime}${typeLabel}`
        });
      }
    }

    if (rowMap.size === 0) {
      return [
        { start: '07:00', end: '08:00', intendedType: 'TUTORIAL', label: '07:00 – 08:00 (Tutorial)' },
        { start: '07:00', end: '08:30', intendedType: 'LECTURE', label: '07:00 – 08:30 (Lecture)' },
        { start: '07:00', end: '09:00', intendedType: 'WORKSHOP', label: '07:00 – 09:00 (Workshop)' },
        { start: '08:00', end: '09:00', intendedType: 'TUTORIAL', label: '08:00 – 09:00 (Tutorial)' },
        { start: '08:30', end: '10:00', intendedType: 'LECTURE', label: '08:30 – 10:00 (Lecture)' },
        { start: '09:00', end: '10:00', intendedType: 'TUTORIAL', label: '09:00 – 10:00 (Tutorial)' },
        { start: '09:00', end: '11:00', intendedType: 'WORKSHOP', label: '09:00 – 11:00 (Workshop)' },
        { start: '10:00', end: '11:00', intendedType: 'TUTORIAL', label: '10:00 – 11:00 (Tutorial)' },
        { start: '10:00', end: '11:30', intendedType: 'LECTURE', label: '10:00 – 11:30 (Lecture)' },
        { start: '11:00', end: '12:00', intendedType: 'TUTORIAL', label: '11:00 – 12:00 (Tutorial)' },
        { start: '11:00', end: '13:00', intendedType: 'WORKSHOP', label: '11:00 – 13:00 (Workshop)' },
        { start: '11:30', end: '13:00', intendedType: 'LECTURE', label: '11:30 – 13:00 (Lecture)' },
        { start: '12:00', end: '13:00', intendedType: 'TUTORIAL', label: '12:00 – 13:00 (Tutorial)' },
        { start: '13:00', end: '14:00', intendedType: 'TUTORIAL', label: '13:00 – 14:00 (Tutorial)' },
        { start: '13:00', end: '14:30', intendedType: 'LECTURE', label: '13:00 – 14:30 (Lecture)' },
        { start: '13:00', end: '15:00', intendedType: 'WORKSHOP', label: '13:00 – 15:00 (Workshop)' },
        { start: '14:00', end: '15:00', intendedType: 'TUTORIAL', label: '14:00 – 15:00 (Tutorial)' },
        { start: '14:30', end: '16:00', intendedType: 'LECTURE', label: '14:30 – 16:00 (Lecture)' },
        { start: '15:00', end: '16:00', intendedType: 'TUTORIAL', label: '15:00 – 16:00 (Tutorial)' },
        { start: '15:00', end: '17:00', intendedType: 'WORKSHOP', label: '15:00 – 17:00 (Workshop)' },
        { start: '15:30', end: '17:00', intendedType: 'LECTURE', label: '15:30 – 17:00 (Lecture)' },
        { start: '16:00', end: '17:00', intendedType: 'TUTORIAL', label: '16:00 – 17:00 (Tutorial)' }
      ];
    }

    return Array.from(rowMap.values());
  }, [timeSlots]);

  const unscheduledSessions = sessions.filter(s => s.status === 'UNSCHEDULED' || !s.timeSlotId || !s.roomId);

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Academic Timetable Grid
          </h2>
          <p className="text-xs text-slate-500">
            Multi-component schedule with distinct Lecture, Tutorial, and Workshop sessions and dedicated component lecturers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleClear}
            className="px-3.5 py-2 border border-slate-300 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-lg text-xs shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Solving Constraints...</span>
              </>
            ) : (
              <span>GENERATE TIMETABLE</span>
            )}
          </button>
        </div>
      </div>

      {/* Validation Status Banner */}
      <ConflictAlertBanner validation={validation} />

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700">Filter By:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Cohort:</span>
            <select
              value={filterCohortId}
              onChange={(e) => setFilterCohortId(e.target.value)}
              className="text-xs rounded-lg border-slate-200 bg-slate-50 py-1.5 px-2.5 font-medium text-slate-800 focus:ring-indigo-500 focus:border-indigo-500 border"
            >
              <option value="ALL">All Cohorts ({cohorts.length})</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.studentCount} students)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Lecturer:</span>
            <select
              value={filterLecturerId}
              onChange={(e) => setFilterLecturerId(e.target.value)}
              className="text-xs rounded-lg border-slate-200 bg-slate-50 py-1.5 px-2.5 font-medium text-slate-800 focus:ring-indigo-500 focus:border-indigo-500 border"
            >
              <option value="ALL">All Lecturers ({lecturers.length})</option>
              {lecturers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Room:</span>
            <select
              value={filterRoomId}
              onChange={(e) => setFilterRoomId(e.target.value)}
              className="text-xs rounded-lg border-slate-200 bg-slate-50 py-1.5 px-2.5 font-medium text-slate-800 focus:ring-indigo-500 focus:border-indigo-500 border"
            >
              <option value="ALL">All Rooms ({rooms.length})</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (Cap: {r.capacity})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing {(() => {
            const scheduled = sessions.filter(s => s.status === 'SCHEDULED' && s.roomId);
            const seen = new Set<string>();
            return scheduled.filter(s => {
              if (!s.combinedGroupId) return true;
              if (seen.has(s.combinedGroupId)) return false;
              seen.add(s.combinedGroupId);
              return true;
            }).length;
          })()} scheduled sessions
        </div>
      </div>

      {/* Unscheduled Sessions Alert */}
      {unscheduledSessions.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Unscheduled Sessions ({unscheduledSessions.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {unscheduledSessions.map((u) => (
              <div key={u.id} className="p-2.5 bg-white border border-amber-200 rounded-lg">
                <span className="font-bold text-slate-900">{u.module.code} - {u.sessionType}</span>
                <p className="text-[11px] text-amber-800 mt-0.5">Reason: {u.conflictNote || 'Resource constraint'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Master Weekly Timetable Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1560px]">
            <thead>
              <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4 text-left font-bold border-r border-slate-800 w-36">Time Block</th>
                {days.map((day) => (
                  <th key={day} className="py-3.5 px-4 text-center font-bold border-r border-slate-800 last:border-r-0 min-w-[220px]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {gridRows.map((row) => (
                <tr key={`${row.start}_${row.end}_${row.intendedType}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 bg-slate-50 text-slate-700 font-mono text-xs font-bold border-r border-slate-200 whitespace-nowrap align-top">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{row.label}</span>
                    </div>
                  </td>

                  {days.map((day) => {
                    const matchedSlot = timeSlots.find(
                      t => t.day === day && t.startTime === row.start && t.endTime === row.end && (row.intendedType ? t.intendedType === row.intendedType : true)
                    );

                    const rawCellSessions = matchedSlot
                      ? sessions.filter(
                          s => s.status === 'SCHEDULED' && s.timeSlotId === matchedSlot.id && s.room
                        )
                      : [];

                    const seenCombinedGroups = new Set<string>();
                    const cellSessions = rawCellSessions.filter((s) => {
                      if (!s.combinedGroupId) return true;
                      if (seenCombinedGroups.has(s.combinedGroupId)) return false;
                      seenCombinedGroups.add(s.combinedGroupId);
                      return true;
                    });

                    return (
                      <td key={day} className="p-2.5 border-r border-slate-200 last:border-r-0 align-top min-h-[120px] min-w-[220px]">
                        {cellSessions.length === 0 ? (
                          <div className="h-24 rounded-lg border-2 border-dashed border-slate-100 flex items-center justify-center text-[11px] text-slate-300 select-none">
                            Available Slot
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {cellSessions.map((session) => {
                              const hasConflict = validation?.conflicts.some(
                                c => c.involvedSessionIds.includes(session.id)
                              );

                              const isLec = session.sessionType === 'LECTURE';
                              const isTut = session.sessionType === 'TUTORIAL';
                              const isWrk = session.sessionType === 'WORKSHOP';

                              let cardBorder = 'border-slate-200 bg-white';
                              let typeBadgeColor = 'bg-slate-100 text-slate-700';

                              if (hasConflict) {
                                cardBorder = 'bg-rose-50 border-rose-300 text-rose-950 ring-1 ring-rose-400';
                              } else if (isLec) {
                                cardBorder = 'bg-gradient-to-br from-indigo-50/90 to-blue-50/50 border-indigo-200';
                                typeBadgeColor = 'bg-indigo-600 text-white';
                              } else if (isTut) {
                                cardBorder = 'bg-gradient-to-br from-emerald-50/90 to-teal-50/50 border-emerald-200';
                                typeBadgeColor = 'bg-emerald-600 text-white';
                              } else if (isWrk) {
                                cardBorder = 'bg-gradient-to-br from-violet-50/90 to-purple-50/50 border-violet-200';
                                typeBadgeColor = 'bg-violet-600 text-white';
                              }

                              const durationH = (session.durationMinutes || 90) / 60;
                              const formattedH = durationH % 1 === 0 ? `${durationH}h` : `${durationH.toFixed(1)}h`;
                              const timeInterval = session.startTime && session.endTime
                                ? `${session.startTime}–${session.endTime}`
                                : session.timeSlot
                                ? `${session.timeSlot.startTime}–${session.timeSlot.endTime}`
                                : '';

                              const combinedMembers = session.combinedGroupId
                                ? sessions.filter(s => s.combinedGroupId === session.combinedGroupId)
                                : [];
                              const totalStudents = session.combinedGroupId
                                ? combinedMembers.reduce((sum, m) => sum + (m.cohort?.studentCount || 0), 0)
                                : session.cohort?.studentCount || 0;
                              const combinedCohortNames = session.combinedGroupId
                                ? Array.from(new Set(combinedMembers.map(s => s.cohort?.name).filter(Boolean))).join(' + ')
                                : session.cohort?.name;

                              return (
                                <div
                                  key={session.id}
                                  onClick={() => setSelectedSession(session)}
                                  className={'p-3 rounded-xl border text-xs cursor-pointer transition-all shadow-sm hover:shadow-md active:scale-[0.98] group relative ' + cardBorder}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1.5">
                                    <span className={'text-[10px] uppercase font-extrabold px-2 py-0.5 rounded shadow-xs tracking-wider ' + typeBadgeColor}>
                                      {session.sessionType}
                                    </span>
                                    <span className="font-mono text-[11px] font-bold text-slate-700">
                                      {timeInterval} ({formattedH})
                                    </span>
                                  </div>

                                  <div className="flex items-baseline gap-1.5">
                                    <span className="font-mono font-black text-indigo-700 text-xs shrink-0">
                                      {session.module.code}
                                    </span>
                                    <span className="font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                      {session.module.name}
                                    </span>
                                  </div>

                                  <div className="mt-2 pt-2 border-t border-slate-200/60 space-y-1 text-[11px] text-slate-600">
                                    <div className="flex items-center gap-1 font-semibold text-slate-900">
                                      <User className="w-3 h-3 text-indigo-600 shrink-0" />
                                      <span className="truncate">{session.lecturer.name}</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-1 text-slate-600">
                                      {session.combinedGroupId ? (
                                        <span className="truncate font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]" title={`Combined: ${combinedCohortNames} (${totalStudents} students)`}>
                                          Combined: {combinedCohortNames} ({totalStudents}s)
                                        </span>
                                      ) : (
                                        <span className="truncate">{session.cohort.name} ({session.cohort.studentCount}s)</span>
                                      )}
                                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 font-bold rounded text-[10px]">
                                        {session.room?.name}
                                      </span>
                                    </div>
                                  </div>

                                  {hasConflict && (
                                    <div className="mt-2 pt-1 flex items-center gap-1 text-[10px] font-bold text-rose-700">
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>Conflict Detected</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

      {statsModalData && (
        <EngineStatsModal stats={statsModalData} onClose={() => setStatsModalData(null)} />
      )}
    </div>
  );
};
