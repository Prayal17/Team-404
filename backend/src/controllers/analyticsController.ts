import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { ConflictDetector, SessionWithRelations } from '../scheduling/conflictDetector.js';

export class AnalyticsController {
  static async getDashboardOverview(req: Request, res: Response) {
    try {
      const [
        totalModules,
        totalLecturers,
        totalCohorts,
        totalRooms,
        totalTimeSlots,
        totalExams,
        sessions,
        latestLog
      ] = await Promise.all([
        prisma.module.count(),
        prisma.lecturer.count(),
        prisma.cohort.count(),
        prisma.room.count(),
        prisma.timeSlot.count(),
        prisma.examination.count(),
        prisma.timetableSession.findMany({
          include: {
            module: true,
            moduleComponent: true,
            lecturer: true,
            cohort: true,
            room: true,
            timeSlot: true
          }
        }),
        prisma.generationLog.findFirst({
          orderBy: { generatedAt: 'desc' }
        })
      ]);

      const validation = ConflictDetector.validateTimetable(sessions as SessionWithRelations[]);

      // Room utilization
      const rooms = await prisma.room.findMany();
      const roomUtilization = rooms.map(room => {
        const scheduledInRoom = sessions.filter(s => s.roomId === room.id && s.status === 'SCHEDULED').length;
        const totalPossibleSlots = totalTimeSlots || 1;
        const percentage = Math.min(100, Math.round((scheduledInRoom / totalPossibleSlots) * 100));
        return {
          id: room.id,
          name: room.name,
          type: room.type,
          capacity: room.capacity,
          scheduledCount: scheduledInRoom,
          utilizationPercentage: percentage
        };
      });

      // Faculty workload: accurately sum hours from assigned components / scheduled sessions
      const lecturers = await prisma.lecturer.findMany({
        include: {
          components: {
            include: { module: true }
          }
        }
      });

      const facultyWorkload = lecturers.map(lec => {
        const scheduledSessions = sessions.filter(s => s.lecturerId === lec.id && s.status === 'SCHEDULED');
        const weeklyTeachingHours = scheduledSessions.length > 0
          ? scheduledSessions.reduce((acc, s) => acc + (s.durationMinutes || 90) / 60, 0)
          : lec.components.reduce((acc, c) => acc + (c.durationMinutes || 90) / 60, 0);

        return {
          id: lec.id,
          name: lec.name,
          department: lec.department,
          moduleCount: lec.components.length,
          scheduledSessionCount: scheduledSessions.length,
          weeklyTeachingHours: parseFloat(weeklyTeachingHours.toFixed(1))
        };
      });

      res.json({
        success: true,
        data: {
          summary: {
            modules: totalModules,
            lecturers: totalLecturers,
            cohorts: totalCohorts,
            rooms: totalRooms,
            scheduledClasses: sessions.filter(s => s.status === 'SCHEDULED').length,
            unscheduledClasses: sessions.filter(s => s.status === 'UNSCHEDULED').length,
            conflicts: validation.conflictCount,
            examinations: totalExams,
            isTimetableValid: validation.isValid,
            qualityScore: latestLog?.qualityScore || (sessions.length > 0 && validation.isValid ? 100 : 0)
          },
          validation,
          roomUtilization,
          facultyWorkload,
          latestGenerationLog: latestLog
        }
      });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }
}
