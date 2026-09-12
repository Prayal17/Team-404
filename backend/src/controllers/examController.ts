import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { ExamEngine } from '../scheduling/examEngine.js';

export class ExamController {
  static async getExams(req: Request, res: Response) {
    try {
      const exams = await prisma.examination.findMany({
        include: {
          module: true,
          cohort: true,
          allocations: {
            include: { room: true }
          }
        },
        orderBy: { date: 'asc' }
      });
      res.json({ success: true, data: exams });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async createExam(req: Request, res: Response) {
    try {
      const { moduleId, cohortId, studentCount, date, startTime, duration } = req.body;
      if (!moduleId || !cohortId || !date) {
        return res.status(400).json({ success: false, message: 'Module, Cohort and Date are required.' });
      }

      const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
      const finalCount = studentCount ? parseInt(studentCount, 10) : (cohort?.studentCount || 40);

      const exam = await prisma.examination.create({
        data: {
          moduleId,
          cohortId,
          studentCount: finalCount,
          date,
          startTime: startTime || '09:00',
          duration: duration ? parseInt(duration, 10) : 2,
          status: 'PENDING'
        },
        include: { module: true, cohort: true }
      });

      // Auto-allocate rooms for this new exam immediately
      await ExamEngine.allocateExamRooms(exam.id);

      const updatedExam = await prisma.examination.findUnique({
        where: { id: exam.id },
        include: {
          module: true,
          cohort: true,
          allocations: { include: { room: true } }
        }
      });

      res.status(201).json({ success: true, data: updatedExam });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async generateExamSchedule(req: Request, res: Response) {
    try {
      const results = await ExamEngine.allocateExamRooms();
      const exams = await prisma.examination.findMany({
        include: {
          module: true,
          cohort: true,
          allocations: { include: { room: true } }
        },
        orderBy: { date: 'asc' }
      });

      res.json({
        success: true,
        message: `Exam schedule generated for ${results.length} examinations.`,
        data: {
          results,
          exams
        }
      });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async deleteExam(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await prisma.examination.delete({ where: { id } });
      res.json({ success: true, message: 'Examination deleted successfully' });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }
}
