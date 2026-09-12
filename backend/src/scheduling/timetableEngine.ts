import { prisma } from '../config/prisma.js';
import { ScoringEngine, CandidateEvaluationContext } from './scoring.js';
import { ConflictDetector, SessionWithRelations } from './conflictDetector.js';
import { SchedulingStats, SessionType } from '../types/index.js';
import { addMinutesToTime, sortTimeSlots } from '../utils/timeUtils.js';

interface ComponentSchedulingRequirement {
  componentId: string;
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  sessionType: SessionType;
  durationMinutes: number;
  requiredRoomType: string;
  lecturerId: string;
  lecturerName: string;
  lecturerAvailability: string;
  cohortId: string;
  cohortName: string;
  cohortStudentCount: number;
}

export class TimetableEngine {
  static async generateTimetable(): Promise<{
    stats: SchedulingStats;
    validation: ReturnType<typeof ConflictDetector.validateTimetable>;
  }> {
    const startTime = performance.now();

    const modules = await prisma.module.findMany({
      include: {
        components: {
          include: { lecturer: true }
        },
        cohorts: true
      }
    });

    const rooms = await prisma.room.findMany();
    const rawTimeSlots = await prisma.timeSlot.findMany({
      orderBy: { slotOrder: 'asc' }
    });
    const timeSlots = sortTimeSlots(rawTimeSlots);

    const requirements: ComponentSchedulingRequirement[] = [];
    for (const mod of modules) {
      for (const comp of mod.components) {
        for (const cohort of mod.cohorts) {
          requirements.push({
            componentId: comp.id,
            moduleId: mod.id,
            moduleCode: mod.code,
            moduleName: mod.name,
            sessionType: comp.type as SessionType,
            durationMinutes: comp.durationMinutes || 90,
            requiredRoomType: comp.requiredRoomType || 'ANY',
            lecturerId: comp.lecturer.id,
            lecturerName: comp.lecturer.name,
            lecturerAvailability: comp.lecturer.availability,
            cohortId: cohort.id,
            cohortName: cohort.name,
            cohortStudentCount: cohort.studentCount
          });
        }
      }
    }

    // Sort requirements using Most Constrained Variable (MRV)
    requirements.sort((a, b) => {
      const aSpecial = a.requiredRoomType !== 'ANY' ? 1 : 0;
      const bSpecial = b.requiredRoomType !== 'ANY' ? 1 : 0;
      if (aSpecial !== bSpecial) return bSpecial - aSpecial;

      if (b.durationMinutes !== a.durationMinutes) {
        return b.durationMinutes - a.durationMinutes;
      }

      if (b.cohortStudentCount !== a.cohortStudentCount) {
        return b.cohortStudentCount - a.cohortStudentCount;
      }

      let aAvailCount = 6;
      let bAvailCount = 6;
      try {
        if (a.lecturerAvailability !== 'ALL') aAvailCount = JSON.parse(a.lecturerAvailability).length;
        if (b.lecturerAvailability !== 'ALL') bAvailCount = JSON.parse(b.lecturerAvailability).length;
      } catch {}
      if (aAvailCount !== bAvailCount) return aAvailCount - bAvailCount;

      return a.moduleCode.localeCompare(b.moduleCode);
    });

    let candidateEvaluations = 0;
    let rejectionsCount = 0;
    const rejectionsByConstraint = {
      lecturerClash: 0,
      cohortClash: 0,
      roomClash: 0,
      capacityViolation: 0,
      lecturerUnavailable: 0,
      roomUnavailable: 0,
      roomTypeMismatch: 0
    };

    interface PlacedSession {
      moduleId: string;
      moduleComponentId: string;
      sessionType: SessionType;
      durationMinutes: number;
      lecturerId: string;
      cohortId: string;
      roomId: string;
      timeSlotId: string;
      day: string;
      startTime: string;
      endTime: string;
      slotOrder: number;
      selectionReason: string;
      softScore: number;
    }

    const scheduledSessions: PlacedSession[] = [];
    const unscheduledItems: Array<{
      moduleCode: string;
      moduleName: string;
      sessionType: SessionType;
      cohortName: string;
      lecturerName: string;
      durationMinutes: number;
      reason: string;
    }> = [];

    for (const req of requirements) {
      let bestCandidate: {
        roomId: string;
        timeSlotId: string;
        day: string;
        startTime: string;
        endTime: string;
        slotOrder: number;
        score: number;
        reasons: string[];
      } | null = null;

      let bestScore = -Infinity;
      const failureReasons = new Set<string>();

      const candidateSlots = timeSlots.filter(
        s => s.intendedType === req.sessionType || s.intendedType === 'ANY' || !s.intendedType
      );

      for (const slot of candidateSlots) {
        for (const room of rooms) {
          candidateEvaluations++;

          const evalContext: CandidateEvaluationContext = {
            component: {
              id: req.componentId,
              type: req.sessionType,
              durationMinutes: req.durationMinutes,
              requiredRoomType: req.requiredRoomType
            },
            module: {
              code: req.moduleCode,
              name: req.moduleName
            },
            cohort: {
              id: req.cohortId,
              name: req.cohortName,
              studentCount: req.cohortStudentCount
            },
            lecturer: {
              id: req.lecturerId,
              name: req.lecturerName,
              availability: req.lecturerAvailability
            },
            room: {
              id: room.id,
              name: room.name,
              capacity: room.capacity,
              type: room.type,
              isAvailable: room.isAvailable
            },
            timeSlot: {
              id: slot.id,
              day: slot.day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              slotOrder: slot.slotOrder
            },
            currentSchedule: scheduledSessions
          };

          const result = ScoringEngine.evaluateCandidate(evalContext);

          if (!result.isValid) {
            rejectionsCount++;
            for (const v of result.hardViolations) {
              if (v.includes('capacity')) {
                rejectionsByConstraint.capacityViolation++;
                failureReasons.add('No room with sufficient capacity available');
              } else if (v.includes('occupied') || v.includes('Room')) {
                rejectionsByConstraint.roomClash++;
              } else if (v.includes('teaching another session') || v.includes('Lecturer')) {
                rejectionsByConstraint.lecturerClash++;
              } else if (v.includes('not available')) {
                rejectionsByConstraint.lecturerUnavailable++;
                failureReasons.add(`Lecturer ${req.lecturerName} availability constraint`);
              } else if (v.includes('Cohort') && v.includes('another session')) {
                rejectionsByConstraint.cohortClash++;
              } else if (v.includes('Computer Lab') || v.includes('Lecture Hall')) {
                rejectionsByConstraint.roomTypeMismatch++;
                failureReasons.add(`Requires ${req.requiredRoomType} which was unavailable`);
              } else if (v.includes('maintenance')) {
                rejectionsByConstraint.roomUnavailable++;
              }
            }
            continue;
          }

          if (result.softScore > bestScore) {
            bestScore = result.softScore;
            bestCandidate = {
              roomId: room.id,
              timeSlotId: slot.id,
              day: slot.day,
              startTime: slot.startTime,
              endTime: result.calculatedEndTime,
              slotOrder: slot.slotOrder,
              score: result.softScore,
              reasons: result.reasons
            };
          }
        }
      }

      if (bestCandidate) {
        scheduledSessions.push({
          moduleId: req.moduleId,
          moduleComponentId: req.componentId,
          sessionType: req.sessionType,
          durationMinutes: req.durationMinutes,
          lecturerId: req.lecturerId,
          cohortId: req.cohortId,
          roomId: bestCandidate.roomId,
          timeSlotId: bestCandidate.timeSlotId,
          day: bestCandidate.day,
          startTime: bestCandidate.startTime,
          endTime: bestCandidate.endTime,
          slotOrder: bestCandidate.slotOrder,
          selectionReason: bestCandidate.reasons.join(' • '),
          softScore: bestCandidate.score
        });
      } else {
        unscheduledItems.push({
          moduleCode: req.moduleCode,
          moduleName: req.moduleName,
          sessionType: req.sessionType,
          cohortName: req.cohortName,
          lecturerName: req.lecturerName,
          durationMinutes: req.durationMinutes,
          reason: Array.from(failureReasons).join('; ') || 'No conflict-free slot/venue found'
        });
      }
    }

    const scheduledData = scheduledSessions.map(s => ({
      moduleId: s.moduleId,
      moduleComponentId: s.moduleComponentId || null,
      sessionType: s.sessionType,
      durationMinutes: s.durationMinutes,
      startTime: s.startTime,
      endTime: s.endTime,
      day: s.day,
      lecturerId: s.lecturerId,
      cohortId: s.cohortId,
      roomId: s.roomId,
      timeSlotId: s.timeSlotId,
      status: 'SCHEDULED',
      selectionReason: s.selectionReason
    }));

    const unscheduledData = unscheduledItems.map(u => {
      const req = requirements.find(
        r => r.moduleCode === u.moduleCode && r.sessionType === u.sessionType && r.cohortName === u.cohortName
      )!;
      return {
        moduleId: req.moduleId,
        moduleComponentId: req.componentId || null,
        sessionType: req.sessionType,
        durationMinutes: req.durationMinutes,
        lecturerId: req.lecturerId,
        cohortId: req.cohortId,
        roomId: null,
        timeSlotId: null,
        status: 'UNSCHEDULED',
        conflictNote: u.reason
      };
    });

    const allData = [...scheduledData, ...unscheduledData];

    // Persist to database in a single batch transaction
    await prisma.$transaction([
      prisma.timetableSession.deleteMany(),
      ...(allData.length > 0 ? [prisma.timetableSession.createMany({ data: allData })] : [])
    ]);

    const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));
    const schedulingRatio = requirements.length > 0 ? scheduledSessions.length / requirements.length : 0;
    const qualityScore = Math.min(100, Math.round(schedulingRatio * 100));

    const stats: SchedulingStats = {
      totalRequirements: requirements.length,
      scheduledCount: scheduledSessions.length,
      unscheduledCount: unscheduledItems.length,
      candidateEvaluations,
      rejectionsCount,
      rejectionsByConstraint,
      qualityScore,
      executionTimeMs,
      unscheduledItems
    };

    await prisma.generationLog.create({
      data: {
        totalSessions: requirements.length,
        scheduledCount: scheduledSessions.length,
        unscheduledCount: unscheduledItems.length,
        executionTimeMs,
        candidateEvaluations,
        rejectionsCount,
        qualityScore,
        unscheduledReasons: JSON.stringify(unscheduledItems),
        hardConstraintsRate: scheduledSessions.length > 0 ? 100.0 : 0
      }
    });

    const fullSessions = await prisma.timetableSession.findMany({
      include: {
        module: true,
        moduleComponent: true,
        lecturer: true,
        cohort: true,
        room: true,
        timeSlot: true
      }
    });

    const validation = ConflictDetector.validateTimetable(fullSessions as SessionWithRelations[]);

    return { stats, validation };
  }
}
