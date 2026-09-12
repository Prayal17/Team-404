export type RoomType = 'CLASSROOM' | 'COMPUTER_LAB' | 'LECTURE_HALL' | 'SEMINAR_ROOM' | 'ANY';

export type SessionType = 'LECTURE' | 'TUTORIAL' | 'WORKSHOP';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Lecturer {
  id: string;
  name: string;
  email: string;
  department: string;
  availability: string;
  maxDailyHours: number;
  components?: ModuleComponent[];
  createdAt?: string;
}

export interface Cohort {
  id: string;
  name: string;
  programme: string;
  studentCount: number;
  modules?: Module[];
  createdAt?: string;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  type: RoomType;
  isAvailable: boolean;
  createdAt?: string;
}

export interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  slotOrder: number;
  intendedType?: string;
}

export interface ModuleComponent {
  id?: string;
  moduleId?: string;
  type: SessionType;
  durationMinutes: number; // e.g. 90, 60, 120
  requiredRoomType: RoomType;
  lecturerId: string;
  lecturer?: Lecturer;
}

export interface Module {
  id: string;
  code: string;
  name: string;
  description?: string;
  cohorts?: Cohort[];
  components: ModuleComponent[];
  createdAt?: string;
}

export interface TimetableSession {
  id: string;
  status: 'SCHEDULED' | 'CONFLICT' | 'UNSCHEDULED';
  sessionType: SessionType;
  durationMinutes: number;
  startTime?: string | null;
  endTime?: string | null;
  day?: string | null;
  conflictNote?: string | null;
  selectionReason?: string | null;
  combinedGroupId?: string | null;
  moduleId: string;
  moduleComponentId?: string | null;
  lecturerId: string;
  cohortId: string;
  roomId?: string | null;
  timeSlotId?: string | null;
  module: Module;
  moduleComponent?: ModuleComponent | null;
  lecturer: Lecturer;
  cohort: Cohort;
  room?: Room | null;
  timeSlot?: TimeSlot | null;
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

export interface ExamRoomAllocation {
  id: string;
  allocatedStudents: number;
  roomId: string;
  room: Room;
}

export interface Examination {
  id: string;
  title?: string;
  studentCount: number;
  date: string;
  startTime: string;
  duration: number;
  status: 'SCHEDULED' | 'PENDING' | 'UNALLOCATED';
  notes?: string;
  moduleId: string;
  cohortId: string;
  module: Module;
  cohort: Cohort;
  allocations: ExamRoomAllocation[];
}

export interface DashboardOverview {
  summary: {
    modules: number;
    lecturers: number;
    cohorts: number;
    rooms: number;
    scheduledClasses: number;
    unscheduledClasses: number;
    conflicts: number;
    examinations: number;
    isTimetableValid: boolean;
    qualityScore: number;
  };
  validation: ValidationReport;
  roomUtilization: Array<{
    id: string;
    name: string;
    type: string;
    capacity: number;
    scheduledCount: number;
    utilizationPercentage: number;
  }>;
  facultyWorkload: Array<{
    id: string;
    name: string;
    department: string;
    moduleCount: number;
    scheduledSessionCount: number;
    weeklyTeachingHours: number;
  }>;
  latestGenerationLog?: any;
}
