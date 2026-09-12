import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { AcademicController } from '../controllers/academicController.js';
import { TimetableController } from '../controllers/timetableController.js';
import { ExamController } from '../controllers/examController.js';
import { AnalyticsController } from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';

export const apiRouter = Router();

// Auth Routes
apiRouter.post('/auth/login', AuthController.login);
apiRouter.get('/auth/me', authenticate, AuthController.me);

// Analytics & Dashboard Overview
apiRouter.get('/dashboard', AnalyticsController.getDashboardOverview);

// Academic Entities: Modules
apiRouter.get('/modules', AcademicController.getModules);
apiRouter.post('/modules', AcademicController.createModule);
apiRouter.put('/modules/:id', AcademicController.updateModule);
apiRouter.delete('/modules/:id', AcademicController.deleteModule);

// Academic Entities: Lecturers
apiRouter.get('/lecturers', AcademicController.getLecturers);
apiRouter.post('/lecturers', AcademicController.createLecturer);
apiRouter.put('/lecturers/:id', AcademicController.updateLecturer);
apiRouter.delete('/lecturers/:id', AcademicController.deleteLecturer);

// Academic Entities: Cohorts
apiRouter.get('/cohorts', AcademicController.getCohorts);
apiRouter.post('/cohorts', AcademicController.createCohort);
apiRouter.put('/cohorts/:id', AcademicController.updateCohort);
apiRouter.delete('/cohorts/:id', AcademicController.deleteCohort);

// Academic Entities: Rooms
apiRouter.get('/rooms', AcademicController.getRooms);
apiRouter.post('/rooms', AcademicController.createRoom);
apiRouter.put('/rooms/:id', AcademicController.updateRoom);
apiRouter.delete('/rooms/:id', AcademicController.deleteRoom);

// Academic Entities: Time Slots
apiRouter.get('/time-slots', AcademicController.getTimeSlots);
apiRouter.post('/time-slots', AcademicController.createTimeSlot);

// Timetable Operations
apiRouter.get('/timetable', TimetableController.getTimetable);
apiRouter.post('/timetable/generate', TimetableController.generate);
apiRouter.post('/timetable/validate', TimetableController.validate);
apiRouter.post('/timetable/clear', TimetableController.clear);
apiRouter.put('/timetable/sessions/:id', TimetableController.updateSession);
apiRouter.get('/timetable/sessions/:id/suggestions', TimetableController.getSuggestions);

// Examination Operations
apiRouter.get('/examinations', ExamController.getExams);
apiRouter.post('/examinations', ExamController.createExam);
apiRouter.post('/examinations/generate', ExamController.generateExamSchedule);
apiRouter.delete('/examinations/:id', ExamController.deleteExam);
