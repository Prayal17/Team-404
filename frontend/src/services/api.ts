import axios from 'axios';
import {
  DashboardOverview,
  Module,
  Lecturer,
  Cohort,
  Room,
  TimeSlot,
  TimetableSession,
  ValidationReport,
  SchedulingStats,
  SmartSuggestion,
  Examination
} from '../types';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('iap_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    client.post('/auth/login', credentials),
  getMe: () => client.get('/auth/me'),

  // Dashboard
  getDashboard: () => client.get<{ success: boolean; data: DashboardOverview }>('/dashboard'),

  // Modules
  getModules: () => client.get<{ success: boolean; data: Module[] }>('/modules'),
  createModule: (data: Partial<Module>) => client.post<{ success: boolean; data: Module }>('/modules', data),
  updateModule: (id: string, data: Partial<Module>) => client.put<{ success: boolean; data: Module }>(`/modules/${id}`, data),
  deleteModule: (id: string) => client.delete(`/modules/${id}`),

  // Lecturers
  getLecturers: () => client.get<{ success: boolean; data: Lecturer[] }>('/lecturers'),
  createLecturer: (data: Partial<Lecturer>) => client.post<{ success: boolean; data: Lecturer }>('/lecturers', data),
  updateLecturer: (id: string, data: Partial<Lecturer>) => client.put<{ success: boolean; data: Lecturer }>(`/lecturers/${id}`, data),
  deleteLecturer: (id: string) => client.delete(`/lecturers/${id}`),

  // Cohorts
  getCohorts: () => client.get<{ success: boolean; data: Cohort[] }>('/cohorts'),
  createCohort: (data: Partial<Cohort>) => client.post<{ success: boolean; data: Cohort }>('/cohorts', data),
  updateCohort: (id: string, data: Partial<Cohort>) => client.put<{ success: boolean; data: Cohort }>(`/cohorts/${id}`, data),
  deleteCohort: (id: string) => client.delete(`/cohorts/${id}`),

  // Rooms
  getRooms: () => client.get<{ success: boolean; data: Room[] }>('/rooms'),
  createRoom: (data: Partial<Room>) => client.post<{ success: boolean; data: Room }>('/rooms', data),
  updateRoom: (id: string, data: Partial<Room>) => client.put<{ success: boolean; data: Room }>(`/rooms/${id}`, data),
  deleteRoom: (id: string) => client.delete(`/rooms/${id}`),

  // Time Slots
  getTimeSlots: () => client.get<{ success: boolean; data: TimeSlot[] }>('/time-slots'),

  // Timetable
  getTimetable: (params?: { cohortId?: string; lecturerId?: string; roomId?: string }) =>
    client.get<{ success: boolean; data: { sessions: TimetableSession[]; validation: ValidationReport } }>('/timetable', { params }),
  generateTimetable: () =>
    client.post<{ success: boolean; message: string; data: { stats: SchedulingStats; validation: ValidationReport; sessions: TimetableSession[] } }>('/timetable/generate'),
  validateTimetable: () =>
    client.post<{ success: boolean; data: ValidationReport }>('/timetable/validate'),
  updateSession: (id: string, data: { roomId?: string; timeSlotId?: string; lecturerId?: string }) =>
    client.put<{ success: boolean; message: string; data: { session: TimetableSession; validation: ValidationReport; sessionConflicts: any[]; suggestions: SmartSuggestion[] } }>(`/timetable/sessions/${id}`, data),
  getSessionSuggestions: (id: string) =>
    client.get<{ success: boolean; data: SmartSuggestion[] }>(`/timetable/sessions/${id}/suggestions`),
  clearTimetable: () =>
    client.post<{ success: boolean; message: string }>('/timetable/clear'),

  // Examinations
  getExaminations: () => client.get<{ success: boolean; data: Examination[] }>('/examinations'),
  createExamination: (data: any) => client.post<{ success: boolean; data: Examination }>('/examinations', data),
  generateExamSchedule: () => client.post<{ success: boolean; message: string; data: { results: any[]; exams: Examination[] } }>('/examinations/generate'),
  deleteExamination: (id: string) => client.delete(`/examinations/${id}`)
};
