import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { TimetableEngine } from '../scheduling/timetableEngine.js';
import { ConflictDetector, SessionWithRelations } from '../scheduling/conflictDetector.js';
import { addMinutesToTime, DAY_ORDER_MAP } from '../utils/timeUtils.js';

function sortSessions<T extends { day?: string | null; startTime?: string | null }>(sessions: T[]): T[] {
  return [...sessions].sort((a, b) => {
    const dayDiff = (DAY_ORDER_MAP[a.day || ''] ?? 99) - (DAY_ORDER_MAP[b.day || ''] ?? 99);
    if (dayDiff !== 0) return dayDiff;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });
}

export class TimetableController {
  static async getTimetable(req: Request, res: Response) {
    try {
      const { cohortId, lecturerId, roomId } = req.query;

      const rawSessions = await prisma.timetableSession.findMany({
        where: {
          cohortId: cohortId ? String(cohortId) : undefined,
          lecturerId: lecturerId ? String(lecturerId) : undefined,
          roomId: roomId ? String(roomId) : undefined
        },
        include: {
          module: true,
          moduleComponent: true,
          lecturer: true,
          cohort: true,
          room: true,
          timeSlot: true
        },
        orderBy: { startTime: 'asc' }
      });
      const sessions = sortSessions(rawSessions);

      const allSessions = await prisma.timetableSession.findMany({
        include: {
          module: true,
          moduleComponent: true,
          lecturer: true,
          cohort: true,
          room: true,
          timeSlot: true
        }
      });

      const validation = ConflictDetector.validateTimetable(allSessions as SessionWithRelations[]);

      res.json({
        success: true,
        data: {
          sessions,
          validation
        }
      });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async generate(req: Request, res: Response) {
    try {
      const result = await TimetableEngine.generateTimetable();
      
      const rawSessions = await prisma.timetableSession.findMany({
        include: {
          module: true,
          moduleComponent: true,
          lecturer: true,
          cohort: true,
          room: true,
          timeSlot: true
        },
        orderBy: { startTime: 'asc' }
      });
      const sessions = sortSessions(rawSessions);

      res.json({
        success: true,
        message: `Timetable generated: ${result.stats.scheduledCount} scheduled, ${result.stats.unscheduledCount} unscheduled.`,
        data: {
          stats: result.stats,
          validation: result.validation,
          sessions
        }
      });
    } catch (e: any) {
      console.error('Error generating timetable:', e);
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async validate(req: Request, res: Response) {
    try {
      const allSessions = await prisma.timetableSession.findMany({
        include: {
          module: true,
          moduleComponent: true,
          lecturer: true,
          cohort: true,
          room: true,
          timeSlot: true
        }
      });

      const validation = ConflictDetector.validateTimetable(allSessions as SessionWithRelations[]);
      res.json({ success: true, data: validation });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async updateSession(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { roomId, timeSlotId, lecturerId } = req.body;

      const currentSession = await prisma.timetableSession.findUnique({
        where: { id }
      });

      let updatedDay = currentSession?.day;
      let updatedStart = currentSession?.startTime;
      let updatedEnd = currentSession?.endTime;

      if (timeSlotId) {
        const slot = await prisma.timeSlot.findUnique({ where: { id: timeSlotId } });
        if (slot) {
          updatedDay = slot.day;
          updatedStart = slot.startTime;
          updatedEnd = addMinutesToTime(slot.startTime, currentSession?.durationMinutes || 90);
        }
      }

      await prisma.timetableSession.update({
        where: { id },
        data: {
          roomId: roomId || undefined,
          timeSlotId: timeSlotId || undefined,
          lecturerId: lecturerId || undefined,
          day: updatedDay || undefined,
          startTime: updatedStart || undefined,
          endTime: updatedEnd || undefined,
          status: 'SCHEDULED'
        }
      });

      const allSessions = (await prisma.timetableSession.findMany({
        include: {
          module: true,
          moduleComponent: true,
          lecturer: true,
          cohort: true,
          room: true,
          timeSlot: true
        }
      })) as SessionWithRelations[];

      const validation = ConflictDetector.validateTimetable(allSessions);
      const updatedSession = allSessions.find(s => s.id === id);
      const sessionConflicts = validation.conflicts.filter(c => c.involvedSessionIds.includes(id));

      const allRooms = await prisma.room.findMany();
      const allTimeSlots = await prisma.timeSlot.findMany();
      const suggestions = updatedSession
        ? ConflictDetector.generateSuggestions(updatedSession, allSessions, allRooms, allTimeSlots)
        : [];

      res.json({
        success: true,
        message: sessionConflicts.length > 0 ? 'Session updated but conflicts detected.' : 'Session updated successfully.',
        data: {
          session: updatedSession,
          validation,
          sessionConflicts,
          suggestions
        }
      });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async getSuggestions(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const allSessions = (await prisma.timetableSession.findMany({
        include: {
          module: true,
          moduleComponent: true,
          lecturer: true,
          cohort: true,
          room: true,
          timeSlot: true
        }
      })) as SessionWithRelations[];

      const targetSession = allSessions.find(s => s.id === id);
      if (!targetSession) {
        return res.status(404).json({ success: false, message: 'Session not found' });
      }

      const allRooms = await prisma.room.findMany();
      const allTimeSlots = await prisma.timeSlot.findMany();

      const suggestions = ConflictDetector.generateSuggestions(targetSession, allSessions, allRooms, allTimeSlots);
      res.json({ success: true, data: suggestions });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async clear(req: Request, res: Response) {
    try {
      await prisma.timetableSession.deleteMany();
      res.json({ success: true, message: 'Timetable cleared successfully.' });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }
}
