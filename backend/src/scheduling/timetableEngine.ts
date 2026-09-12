import crypto from 'node:crypto';
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
  cohorts: Array<{
    id: string;
    name: string;
    studentCount: number;
  }>;
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
        if (comp.type === 'LECTURE') {
          // Group cohorts taking this module by academic programme
          const programmeMap = new Map<string, Array<{ id: string; name: string; studentCount: number }>>();
          for (const cohort of mod.cohorts) {
            const prog = cohort.programme || 'DEFAULT';
            if (!programmeMap.has(prog)) {
              programmeMap.set(prog, []);
            }
            programmeMap.get(prog)!.push({
              id: cohort.id,
              name: cohort.name,
              studentCount: cohort.studentCount
            });
          }

          for (const [_, cohortList] of programmeMap) {
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
              cohorts: cohortList
            });
          }
        } else {
          // TUTORIAL and WORKSHOP components remain scheduled per cohort
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
              cohorts: [{
                id: cohort.id,
                name: cohort.name,
                studentCount: cohort.studentCount
              }]
            });
          }
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

      const aTotalStudents = a.cohorts.reduce((sum, c) => sum + c.studentCount, 0);
      const bTotalStudents = b.cohorts.reduce((sum, c) => sum + c.studentCount, 0);
      if (bTotalStudents !== aTotalStudents) {
        return bTotalStudents - aTotalStudents;
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
      combinedGroupId?: string | null;
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

    function evaluateRequirement(
      r: ComponentSchedulingRequirement,
      currentSchedule: PlacedSession[]
    ): {
      bestCandidate: {
        roomId: string;
        timeSlotId: string;
        day: string;
        startTime: string;
        endTime: string;
        slotOrder: number;
        score: number;
        reasons: string[];
      } | null;
      failureReasons: Set<string>;
    } {
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

      const totalStudentCount = r.cohorts.reduce((sum, c) => sum + c.studentCount, 0);
      const combinedCohortName = r.cohorts.map(c => c.name).join(' + ');

      const candidateSlots = timeSlots.filter(
        s => s.intendedType === r.sessionType || s.intendedType === 'ANY' || !s.intendedType
      );

      for (const slot of candidateSlots) {
        for (const room of rooms) {
          candidateEvaluations++;

          const evalContext: CandidateEvaluationContext = {
            component: {
              id: r.componentId,
              type: r.sessionType,
              durationMinutes: r.durationMinutes,
              requiredRoomType: r.requiredRoomType
            },
            module: {
              code: r.moduleCode,
              name: r.moduleName
            },
            cohort: {
              id: r.cohorts.length === 1 ? r.cohorts[0].id : r.cohorts.map(c => c.id).join('_'),
              name: combinedCohortName,
              studentCount: totalStudentCount
            },
            cohorts: r.cohorts,
            lecturer: {
              id: r.lecturerId,
              name: r.lecturerName,
              availability: r.lecturerAvailability
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
            currentSchedule
          };

          const result = ScoringEngine.evaluateCandidate(evalContext);

          if (!result.isValid) {
            rejectionsCount++;
            for (const v of result.hardViolations) {
              if (v.includes('capacity') || v.includes('insufficient')) {
                rejectionsByConstraint.capacityViolation++;
                failureReasons.add('No room with sufficient capacity available');
              } else if (v.includes('occupied') || v.includes('Room')) {
                rejectionsByConstraint.roomClash++;
              } else if (v.includes('teaching another session') || v.includes('Lecturer')) {
                rejectionsByConstraint.lecturerClash++;
              } else if (v.includes('not available')) {
                rejectionsByConstraint.lecturerUnavailable++;
                failureReasons.add(`Lecturer ${r.lecturerName} availability constraint`);
              } else if (v.includes('Cohort') && v.includes('another session')) {
                rejectionsByConstraint.cohortClash++;
              } else if (v.includes('Computer Lab') || v.includes('Lecture Hall')) {
                rejectionsByConstraint.roomTypeMismatch++;
                failureReasons.add(`Requires ${r.requiredRoomType} which was unavailable`);
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

      return { bestCandidate, failureReasons };
    }

    for (const req of requirements) {
      const { bestCandidate, failureReasons } = evaluateRequirement(req, scheduledSessions);

      if (bestCandidate) {
        const isCombined = req.cohorts.length > 1;
        const combinedGroupId = isCombined ? crypto.randomUUID() : null;
        const reason = isCombined
          ? `Combined lecture for ${req.cohorts.map(c => c.name).join(' + ')} (${req.cohorts.reduce((s, c) => s + c.studentCount, 0)} students) • ${bestCandidate.reasons.join(' • ')}`
          : bestCandidate.reasons.join(' • ');

        for (const cohort of req.cohorts) {
          scheduledSessions.push({
            moduleId: req.moduleId,
            moduleComponentId: req.componentId,
            sessionType: req.sessionType,
            durationMinutes: req.durationMinutes,
            lecturerId: req.lecturerId,
            cohortId: cohort.id,
            roomId: bestCandidate.roomId,
            timeSlotId: bestCandidate.timeSlotId,
            day: bestCandidate.day,
            startTime: bestCandidate.startTime,
            endTime: bestCandidate.endTime,
            slotOrder: bestCandidate.slotOrder,
            selectionReason: reason,
            softScore: bestCandidate.score,
            combinedGroupId
          });
        }
      } else if (req.cohorts.length > 1) {
        // Fallback: If no single room fits combined student count, schedule each cohort individually
        for (const cohort of req.cohorts) {
          const singleReq: ComponentSchedulingRequirement = {
            ...req,
            cohorts: [cohort]
          };
          const singleResult = evaluateRequirement(singleReq, scheduledSessions);
          if (singleResult.bestCandidate) {
            scheduledSessions.push({
              moduleId: singleReq.moduleId,
              moduleComponentId: singleReq.componentId,
              sessionType: singleReq.sessionType,
              durationMinutes: singleReq.durationMinutes,
              lecturerId: singleReq.lecturerId,
              cohortId: cohort.id,
              roomId: singleResult.bestCandidate.roomId,
              timeSlotId: singleResult.bestCandidate.timeSlotId,
              day: singleResult.bestCandidate.day,
              startTime: singleResult.bestCandidate.startTime,
              endTime: singleResult.bestCandidate.endTime,
              slotOrder: singleResult.bestCandidate.slotOrder,
              selectionReason: `Fallback individual lecture • ${singleResult.bestCandidate.reasons.join(' • ')}`,
              softScore: singleResult.bestCandidate.score,
              combinedGroupId: null
            });
          } else {
            unscheduledItems.push({
              moduleCode: singleReq.moduleCode,
              moduleName: singleReq.moduleName,
              sessionType: singleReq.sessionType,
              cohortName: cohort.name,
              lecturerName: singleReq.lecturerName,
              durationMinutes: singleReq.durationMinutes,
              reason: Array.from(singleResult.failureReasons).join('; ') || 'No conflict-free slot/venue found'
            });
          }
        }
      } else {
        unscheduledItems.push({
          moduleCode: req.moduleCode,
          moduleName: req.moduleName,
          sessionType: req.sessionType,
          cohortName: req.cohorts[0].name,
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
      selectionReason: s.selectionReason,
      combinedGroupId: s.combinedGroupId || null
    }));

    const unscheduledData = unscheduledItems.map(u => {
      const mod = modules.find(m => m.code === u.moduleCode)!;
      const comp = mod.components.find(c => c.type === u.sessionType);
      const cohort = mod.cohorts.find(c => c.name === u.cohortName)!;
      return {
        moduleId: mod.id,
        moduleComponentId: comp?.id || null,
        sessionType: u.sessionType,
        durationMinutes: u.durationMinutes,
        lecturerId: comp?.lecturerId || mod.components[0]?.lecturerId,
        cohortId: cohort.id,
        roomId: null,
        timeSlotId: null,
        status: 'UNSCHEDULED',
        conflictNote: u.reason,
        combinedGroupId: null
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
