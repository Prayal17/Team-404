import { ConflictDetail, SmartSuggestion, ValidationReport } from '../types/index.js';
import { doIntervalsOverlap, addMinutesToTime, formatDuration } from '../utils/timeUtils.js';

export interface SessionWithRelations {
  id: string;
  moduleId: string;
  moduleComponentId?: string | null;
  sessionType: string;
  durationMinutes: number;
  startTime?: string | null;
  endTime?: string | null;
  day?: string | null;
  lecturerId: string;
  cohortId: string;
  roomId: string | null;
  timeSlotId: string | null;
  status: string;
  module: {
    id: string;
    code: string;
    name: string;
  };
  moduleComponent?: {
    id: string;
    type: string;
    durationMinutes: number;
    requiredRoomType: string;
    lecturerId: string;
  } | null;
  lecturer: {
    id: string;
    name: string;
    email: string;
    availability: string;
  };
  cohort: {
    id: string;
    name: string;
    studentCount: number;
  };
  room: {
    id: string;
    name: string;
    capacity: number;
    type: string;
    isAvailable: boolean;
  } | null;
  timeSlot: {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    slotOrder: number;
    intendedType?: string;
  } | null;
}

export class ConflictDetector {
  static validateTimetable(sessions: SessionWithRelations[]): ValidationReport {
    const conflicts: ConflictDetail[] = [];
    let lecturerConflictCount = 0;
    let roomConflictCount = 0;
    let cohortConflictCount = 0;
    let capacityViolationCount = 0;
    let availabilityViolationCount = 0;

    const scheduled = sessions.filter(s => s.status === 'SCHEDULED' && s.roomId && (s.timeSlot || s.startTime));
    const unscheduled = sessions.filter(s => s.status === 'UNSCHEDULED' || !s.roomId || (!s.timeSlot && !s.startTime));

    for (const session of scheduled) {
      if (!session.room) continue;

      const day = session.day || session.timeSlot?.day || 'Monday';
      const start = session.startTime || session.timeSlot?.startTime || '09:00';
      const end = session.endTime || addMinutesToTime(start, session.durationMinutes || 90);

      // Room Availability
      if (!session.room.isAvailable) {
        availabilityViolationCount++;
        conflicts.push({
          type: 'ROOM_UNAVAILABLE',
          severity: 'HIGH',
          title: `Unavailable Room: ${session.room.name}`,
          description: `Session ${session.module.code} ${session.sessionType} is allocated to ${session.room.name}, which is inactive.`,
          involvedSessionIds: [session.id],
          entityIds: { roomId: session.room.id }
        });
      }

      // Room Capacity
      if (session.room.capacity < session.cohort.studentCount) {
        capacityViolationCount++;
        conflicts.push({
          type: 'CAPACITY_VIOLATION',
          severity: 'HIGH',
          title: `Capacity Violation: ${session.room.name}`,
          description: `Room ${session.room.name} capacity (${session.room.capacity}) is less than cohort ${session.cohort.name} (${session.cohort.studentCount} students).`,
          involvedSessionIds: [session.id],
          entityIds: { roomId: session.room.id, cohortId: session.cohort.id }
        });
      }

      // Lecturer Availability
      let lecturerDays: string[] = [];
      if (session.lecturer.availability === 'ALL') {
        lecturerDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      } else {
        try {
          lecturerDays = JSON.parse(session.lecturer.availability);
        } catch {
          lecturerDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        }
      }

      const slotKey = `${day}_${start}`;
      const isAvailable = lecturerDays.includes(day) || lecturerDays.includes(slotKey);
      if (!isAvailable) {
        availabilityViolationCount++;
        conflicts.push({
          type: 'LECTURER_UNAVAILABLE',
          severity: 'HIGH',
          title: `Lecturer Unavailable: ${session.lecturer.name}`,
          description: `Lecturer ${session.lecturer.name} assigned to ${session.module.code} ${session.sessionType} is unavailable on ${day}.`,
          involvedSessionIds: [session.id],
          entityIds: { lecturerId: session.lecturer.id }
        });
      }
    }

    // Pairwise interval checks
    for (let i = 0; i < scheduled.length; i++) {
      for (let j = i + 1; j < scheduled.length; j++) {
        const s1 = scheduled[i];
        const s2 = scheduled[j];

        const day1 = s1.day || s1.timeSlot?.day;
        const day2 = s2.day || s2.timeSlot?.day;

        if (!day1 || !day2 || day1 !== day2) continue;

        const start1 = s1.startTime || s1.timeSlot?.startTime || '09:00';
        const end1 = s1.endTime || addMinutesToTime(start1, s1.durationMinutes || 90);

        const start2 = s2.startTime || s2.timeSlot?.startTime || '09:00';
        const end2 = s2.endTime || addMinutesToTime(start2, s2.durationMinutes || 90);

        const isOverlapping = doIntervalsOverlap(start1, end1, start2, end2);
        if (!isOverlapping) continue;

        const timeLabel = `${day1} (${start1}–${end1} vs ${start2}–${end2})`;

        // Room Clash
        if (s1.roomId && s2.roomId && s1.roomId === s2.roomId) {
          roomConflictCount++;
          conflicts.push({
            type: 'ROOM_CLASH',
            severity: 'HIGH',
            title: `Room Double-Booking: ${s1.room?.name}`,
            description: `Room ${s1.room?.name} is double-booked on ${timeLabel} for "${s1.module.code} ${s1.sessionType}" and "${s2.module.code} ${s2.sessionType}".`,
            involvedSessionIds: [s1.id, s2.id],
            entityIds: { roomId: s1.roomId }
          });
        }

        // Lecturer Clash
        if (s1.lecturerId === s2.lecturerId) {
          lecturerConflictCount++;
          conflicts.push({
            type: 'LECTURER_CLASH',
            severity: 'HIGH',
            title: `Lecturer Clash: ${s1.lecturer.name}`,
            description: `Lecturer ${s1.lecturer.name} is assigned to overlapping sessions on ${timeLabel} ("${s1.module.code} ${s1.sessionType}" and "${s2.module.code} ${s2.sessionType}").`,
            involvedSessionIds: [s1.id, s2.id],
            entityIds: { lecturerId: s1.lecturerId }
          });
        }

        // Cohort Clash
        if (s1.cohortId === s2.cohortId) {
          cohortConflictCount++;
          conflicts.push({
            type: 'COHORT_CLASH',
            severity: 'HIGH',
            title: `Cohort Overlap: ${s1.cohort.name}`,
            description: `Cohort ${s1.cohort.name} has overlapping classes on ${timeLabel} ("${s1.module.code} ${s1.sessionType}" and "${s2.module.code} ${s2.sessionType}").`,
            involvedSessionIds: [s1.id, s2.id],
            entityIds: { cohortId: s1.cohortId }
          });
        }
      }
    }

    return {
      isValid: conflicts.length === 0,
      totalSessions: sessions.length,
      scheduledCount: scheduled.length,
      unscheduledCount: unscheduled.length,
      conflictCount: conflicts.length,
      conflicts,
      lecturerConflictCount,
      roomConflictCount,
      cohortConflictCount,
      capacityViolationCount,
      availabilityViolationCount
    };
  }

  static generateSuggestions(
    targetSession: SessionWithRelations,
    allSessions: SessionWithRelations[],
    allRooms: Array<{ id: string; name: string; capacity: number; type: string; isAvailable: boolean }>,
    allTimeSlots: Array<{ id: string; day: string; startTime: string; endTime: string; slotOrder: number; intendedType?: string }>
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const otherSessions = allSessions.filter(s => s.id !== targetSession.id && s.status === 'SCHEDULED');

    let lecturerDays: string[] = [];
    if (targetSession.lecturer.availability === 'ALL') {
      lecturerDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    } else {
      try {
        lecturerDays = JSON.parse(targetSession.lecturer.availability);
      } catch {
        lecturerDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      }
    }

    const duration = targetSession.durationMinutes || 90;
    const requiredRoomType = targetSession.moduleComponent?.requiredRoomType || 'ANY';

    if (targetSession.timeSlot) {
      const slot = targetSession.timeSlot;
      const proposedEnd = addMinutesToTime(slot.startTime, duration);

      const busyRoomIdsInSlot = new Set(
        otherSessions
          .filter(s => {
            const sDay = s.day || s.timeSlot?.day;
            if (sDay !== slot.day) return false;
            const sStart = s.startTime || s.timeSlot?.startTime || '09:00';
            const sEnd = s.endTime || addMinutesToTime(sStart, s.durationMinutes || 90);
            return doIntervalsOverlap(slot.startTime, proposedEnd, sStart, sEnd) && s.roomId;
          })
          .map(s => s.roomId as string)
      );

      const candidateRooms = allRooms.filter(r => {
        if (!r.isAvailable) return false;
        if (r.capacity < targetSession.cohort.studentCount) return false;
        if (requiredRoomType === 'COMPUTER_LAB' && r.type !== 'COMPUTER_LAB') return false;
        if (requiredRoomType === 'LECTURE_HALL' && r.type !== 'LECTURE_HALL') return false;
        if (busyRoomIdsInSlot.has(r.id)) return false;
        return true;
      });

      for (const r of candidateRooms) {
        suggestions.push({
          type: 'ALTERNATIVE_ROOM',
          title: `Move to ${r.name} (Capacity ${r.capacity})`,
          description: `Room ${r.name} (${r.type}) is available during ${slot.day} ${slot.startTime}–${proposedEnd}.`,
          roomId: r.id,
          roomName: r.name,
          timeSlotId: slot.id,
          day: slot.day,
          startTime: slot.startTime,
          endTime: proposedEnd,
          scoreBonus: 20
        });
      }
    }

    for (const slot of allTimeSlots) {
      if (targetSession.timeSlot && slot.id === targetSession.timeSlot.id) continue;
      if (slot.intendedType && slot.intendedType !== 'ANY' && slot.intendedType !== targetSession.sessionType) continue;

      const proposedEnd = addMinutesToTime(slot.startTime, duration);

      const slotKey = `${slot.day}_${slot.startTime}`;
      const isLecturerFree = lecturerDays.includes(slot.day) || lecturerDays.includes(slotKey);
      if (!isLecturerFree) continue;

      const isLecturerBusy = otherSessions.some(s => {
        const sDay = s.day || s.timeSlot?.day;
        if (sDay !== slot.day || s.lecturerId !== targetSession.lecturerId) return false;
        const sStart = s.startTime || s.timeSlot?.startTime || '09:00';
        const sEnd = s.endTime || addMinutesToTime(sStart, s.durationMinutes || 90);
        return doIntervalsOverlap(slot.startTime, proposedEnd, sStart, sEnd);
      });
      if (isLecturerBusy) continue;

      const isCohortBusy = otherSessions.some(s => {
        const sDay = s.day || s.timeSlot?.day;
        if (sDay !== slot.day || s.cohortId !== targetSession.cohortId) return false;
        const sStart = s.startTime || s.timeSlot?.startTime || '09:00';
        const sEnd = s.endTime || addMinutesToTime(sStart, s.durationMinutes || 90);
        return doIntervalsOverlap(slot.startTime, proposedEnd, sStart, sEnd);
      });
      if (isCohortBusy) continue;

      const occupiedInThisInterval = new Set(
        otherSessions
          .filter(s => {
            const sDay = s.day || s.timeSlot?.day;
            if (sDay !== slot.day || !s.roomId) return false;
            const sStart = s.startTime || s.timeSlot?.startTime || '09:00';
            const sEnd = s.endTime || addMinutesToTime(sStart, s.durationMinutes || 90);
            return doIntervalsOverlap(slot.startTime, proposedEnd, sStart, sEnd);
          })
          .map(s => s.roomId as string)
      );

      const validRooms = allRooms.filter(
        r =>
          r.isAvailable &&
          r.capacity >= targetSession.cohort.studentCount &&
          (requiredRoomType !== 'COMPUTER_LAB' || r.type === 'COMPUTER_LAB') &&
          (requiredRoomType !== 'LECTURE_HALL' || r.type === 'LECTURE_HALL') &&
          !occupiedInThisInterval.has(r.id)
      );

      if (validRooms.length > 0) {
        const bestRoom = validRooms[0];
        suggestions.push({
          type: 'ALTERNATIVE_SLOT',
          title: `Reschedule to ${slot.day} ${slot.startTime}–${proposedEnd} in ${bestRoom.name}`,
          description: `Lecturer ${targetSession.lecturer.name}, cohort ${targetSession.cohort.name}, and room ${bestRoom.name} are available.`,
          roomId: bestRoom.id,
          roomName: bestRoom.name,
          timeSlotId: slot.id,
          day: slot.day,
          startTime: slot.startTime,
          endTime: proposedEnd,
          scoreBonus: 30
        });
      }
    }

    return suggestions.slice(0, 5);
  }
}
