export type RoomType = 'CLASSROOM' | 'COMPUTER_LAB' | 'LECTURE_HALL' | 'SEMINAR_ROOM' | 'ANY';

export type SessionType = 'LECTURE' | 'TUTORIAL' | 'WORKSHOP';

export type SessionStatus = 'SCHEDULED' | 'CONFLICT' | 'UNSCHEDULED';

export interface ModuleComponentInput {
  id?: string;
  type: SessionType;
  durationMinutes: number; // e.g. 90, 60, 120
  requiredRoomType?: RoomType;
  lecturerId: string;
}

export interface ConflictDetail {
  type: 'LECTURER_CLASH' | 'COHORT_CLASH' | 'ROOM_CLASH' | 'CAPACITY_VIOLATION' | 'ROOM_UNAVAILABLE' | 'LECTURER_UNAVAILABLE' | 'ROOM_TYPE_MISMATCH';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  involvedSessionIds: string[];
  entityIds?: {
    lecturerId?: string;
    cohortId?: string;
    roomId?: string;
    timeSlotId?: string;
    moduleComponentId?: string;
  };
}

export interface ValidationReport {
  isValid: boolean;
  totalSessions: number;
  scheduledCount: number;
  unscheduledCount: number;
  conflictCount: number;
  conflicts: ConflictDetail[];
  lecturerConflictCount: number;
  roomConflictCount: number;
  cohortConflictCount: number;
  capacityViolationCount: number;
  availabilityViolationCount: number;
}

export interface SchedulingStats {
  totalRequirements: number;
  scheduledCount: number;
  unscheduledCount: number;
  candidateEvaluations: number;
  rejectionsCount: number;
  rejectionsByConstraint: {
    lecturerClash: number;
    cohortClash: number;
    roomClash: number;
    capacityViolation: number;
    lecturerUnavailable: number;
    roomUnavailable: number;
    roomTypeMismatch: number;
  };
  qualityScore: number;
  executionTimeMs: number;
  unscheduledItems: Array<{
    moduleCode: string;
    moduleName: string;
    sessionType: SessionType;
    cohortName: string;
    lecturerName: string;
    durationMinutes: number;
    reason: string;
  }>;
}

export interface SmartSuggestion {
  type: 'ALTERNATIVE_ROOM' | 'ALTERNATIVE_SLOT' | 'ALTERNATIVE_COMBO';
  title: string;
  description: string;
  roomId?: string;
  roomName?: string;
  timeSlotId?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  scoreBonus: number;
}
