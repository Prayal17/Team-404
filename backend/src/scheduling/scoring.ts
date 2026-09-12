import { RoomType, SessionType } from '../types/index.js';
import { doIntervalsOverlap, addMinutesToTime, formatDuration } from '../utils/timeUtils.js';

export interface CandidateEvaluationContext {
  component: {
    id?: string;
    type: SessionType;
    durationMinutes: number;
    requiredRoomType: string;
  };
  module: {
    code: string;
    name: string;
  };
  cohort: {
    id: string;
    name: string;
    studentCount: number;
  };
  lecturer: {
    id: string;
    name: string;
    availability: string;
  };
  room: {
    id: string;
    name: string;
    capacity: number;
    type: string;
    isAvailable: boolean;
  };
  timeSlot: {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    slotOrder: number;
    intendedType?: string;
  };
  currentSchedule: Array<{
    moduleId: string;
    moduleComponentId?: string;
    sessionType: string;
    lecturerId: string;
    cohortId: string;
    roomId: string;
    timeSlotId: string;
    day: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    slotOrder: number;
  }>;
}

export interface CandidateScoreResult {
  isValid: boolean;
  hardViolations: string[];
  softScore: number;
  reasons: string[];
  calculatedEndTime: string;
  scoreBreakdown: {
    hardConstraintScore: number;
    roomFitScore: number;
    roomTypeScore: number;
    lecturerCompactnessScore: number;
    cohortGapScore: number;
    dayDistributionScore: number;
  };
}

export class ScoringEngine {
  static evaluateCandidate(ctx: CandidateEvaluationContext): CandidateScoreResult {
    const hardViolations: string[] = [];
    const reasons: string[] = [];

    const proposedStart = ctx.timeSlot.startTime;
    const proposedEnd = addMinutesToTime(proposedStart, ctx.component.durationMinutes);

    // 1. Room Availability
    if (!ctx.room.isAvailable) {
      hardViolations.push(`Room ${ctx.room.name} is marked as unavailable / maintenance.`);
    }

    // 2. Room Capacity
    if (ctx.room.capacity < ctx.cohort.studentCount) {
      hardViolations.push(
        `Room capacity (${ctx.room.capacity}) is insufficient for cohort ${ctx.cohort.name} (${ctx.cohort.studentCount} students).`
      );
    }

    // 3. Room Type Compatibility
    if (
      ctx.component.requiredRoomType !== 'ANY' &&
      ctx.room.type !== ctx.component.requiredRoomType
    ) {
      if (ctx.component.requiredRoomType === 'COMPUTER_LAB' && ctx.room.type !== 'COMPUTER_LAB') {
        hardViolations.push(`Component ${ctx.module.code} ${ctx.component.type} requires a Computer Lab, but ${ctx.room.name} is ${ctx.room.type}.`);
      } else if (ctx.component.requiredRoomType === 'LECTURE_HALL' && ctx.room.type !== 'LECTURE_HALL') {
        hardViolations.push(`Component ${ctx.module.code} ${ctx.component.type} requires a Lecture Hall, but ${ctx.room.name} is ${ctx.room.type}.`);
      }
    }

    // 4. Lecturer Availability for this Component
    let parsedAvailability: string[] = [];
    if (ctx.lecturer.availability === 'ALL') {
      parsedAvailability = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    } else {
      try {
        parsedAvailability = JSON.parse(ctx.lecturer.availability);
      } catch {
        parsedAvailability = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      }
    }

    const daySlotKey = `${ctx.timeSlot.day}_${ctx.timeSlot.startTime}`;
    const isDayAvailable = parsedAvailability.includes(ctx.timeSlot.day) || parsedAvailability.includes(daySlotKey);
    if (!isDayAvailable) {
      hardViolations.push(`Lecturer ${ctx.lecturer.name} assigned to ${ctx.component.type} is not available on ${ctx.timeSlot.day}.`);
    }

    // 5, 6, 7. Interval Overlaps
    for (const session of ctx.currentSchedule) {
      if (session.day !== ctx.timeSlot.day) continue;

      const overlaps = doIntervalsOverlap(
        proposedStart,
        proposedEnd,
        session.startTime,
        session.endTime
      );

      if (overlaps) {
        if (session.roomId === ctx.room.id) {
          hardViolations.push(
            `Room ${ctx.room.name} is occupied during ${ctx.timeSlot.day} ${session.startTime}–${session.endTime}.`
          );
        }

        if (session.lecturerId === ctx.lecturer.id) {
          hardViolations.push(
            `Lecturer ${ctx.lecturer.name} is teaching another session during ${ctx.timeSlot.day} ${session.startTime}–${session.endTime}.`
          );
        }

        if (session.cohortId === ctx.cohort.id) {
          hardViolations.push(
            `Cohort ${ctx.cohort.name} has another session scheduled during ${ctx.timeSlot.day} ${session.startTime}–${session.endTime}.`
          );
        }
      }
    }

    if (hardViolations.length > 0) {
      return {
        isValid: false,
        hardViolations,
        softScore: 0,
        reasons: hardViolations,
        calculatedEndTime: proposedEnd,
        scoreBreakdown: {
          hardConstraintScore: 0,
          roomFitScore: 0,
          roomTypeScore: 0,
          lecturerCompactnessScore: 0,
          cohortGapScore: 0,
          dayDistributionScore: 0
        }
      };
    }

    // Soft Scoring
    let hardConstraintScore = 100;
    let roomFitScore = 0;
    let roomTypeScore = 0;
    let lecturerCompactnessScore = 0;
    let cohortGapScore = 0;
    let dayDistributionScore = 0;

    const utilizationRatio = ctx.cohort.studentCount / ctx.room.capacity;
    if (utilizationRatio >= 0.8) {
      roomFitScore += 25;
      reasons.push(`Optimal room utilization (${Math.round(utilizationRatio * 100)}% capacity filled)`);
    } else if (utilizationRatio >= 0.6) {
      roomFitScore += 15;
      reasons.push(`Good capacity fit (${Math.round(utilizationRatio * 100)}%)`);
    } else {
      roomFitScore += 5;
    }

    if (ctx.component.requiredRoomType === ctx.room.type) {
      roomTypeScore += 20;
      reasons.push(`Exact room type matched (${ctx.room.type})`);
    } else if (ctx.component.requiredRoomType === 'ANY' && ctx.room.type === 'CLASSROOM') {
      roomTypeScore += 10;
      reasons.push(`Standard classroom allocated`);
    }

    const lecturerDaySessions = ctx.currentSchedule.filter(
      s => s.lecturerId === ctx.lecturer.id && s.day === ctx.timeSlot.day
    );
    if (lecturerDaySessions.length > 0) {
      lecturerCompactnessScore += 15;
      reasons.push(`Compact teaching schedule for ${ctx.lecturer.name}`);
    } else {
      lecturerCompactnessScore += 10;
    }

    const cohortDaySessions = ctx.currentSchedule.filter(
      s => s.cohortId === ctx.cohort.id && s.day === ctx.timeSlot.day
    );
    if (cohortDaySessions.length > 0) {
      cohortGapScore += 15;
      reasons.push(`Consolidated schedule for ${ctx.cohort.name}`);
    } else {
      cohortGapScore += 10;
    }

    const moduleSessionsScheduled = ctx.currentSchedule.filter(
      s => s.moduleId === ctx.module.code
    );
    const sameDayCount = moduleSessionsScheduled.filter(s => s.day === ctx.timeSlot.day).length;
    if (sameDayCount === 0) {
      dayDistributionScore += 15;
      reasons.push(`Evenly distributed across days`);
    } else {
      dayDistributionScore -= 5;
    }

    const totalSoftScore =
      hardConstraintScore +
      roomFitScore +
      roomTypeScore +
      lecturerCompactnessScore +
      cohortGapScore +
      dayDistributionScore;

    return {
      isValid: true,
      hardViolations: [],
      softScore: totalSoftScore,
      reasons,
      calculatedEndTime: proposedEnd,
      scoreBreakdown: {
        hardConstraintScore,
        roomFitScore,
        roomTypeScore,
        lecturerCompactnessScore,
        cohortGapScore,
        dayDistributionScore
      }
    };
  }
}
