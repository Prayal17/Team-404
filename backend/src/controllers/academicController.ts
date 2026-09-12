import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { sortTimeSlots, DEFAULT_ACADEMIC_DAYS } from '../utils/timeUtils.js';

export class AcademicController {
  // --- MODULES ---
  static async getModules(req: Request, res: Response) {
    try {
      const modules = await prisma.module.findMany({
        include: {
          components: {
            include: { lecturer: true },
            orderBy: { type: 'asc' }
          },
          cohorts: true
        },
        orderBy: { code: 'asc' }
      });
      res.json({ success: true, data: modules });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async createModule(req: Request, res: Response) {
    try {
      const { code, name, description, cohortIds, components } = req.body;
      if (!code || !name || !cohortIds || !Array.isArray(cohortIds) || cohortIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Code, Name, and at least one Cohort are required.' });
      }

      if (!components || !Array.isArray(components) || components.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one teaching component is required.' });
      }

      // Validate components
      for (const comp of components) {
        if (!comp.type || !comp.lecturerId) {
          return res.status(400).json({
            success: false,
            message: `Please select a lecturer for the ${comp.type || 'teaching'} component.`
          });
        }
        if (!comp.durationMinutes || comp.durationMinutes <= 0) {
          return res.status(400).json({
            success: false,
            message: `Duration for ${comp.type} must be greater than 0 minutes.`
          });
        }
      }

      const mod = await prisma.module.create({
        data: {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description ? description.trim() : undefined,
          cohorts: {
            connect: cohortIds.map((id: string) => ({ id }))
          },
          components: {
            create: components.map(c => ({
              type: c.type,
              durationMinutes: parseInt(c.durationMinutes, 10),
              requiredRoomType: c.requiredRoomType || 'ANY',
              lecturerId: c.lecturerId
            }))
          }
        },
        include: {
          components: { include: { lecturer: true } },
          cohorts: true
        }
      });

      res.status(201).json({ success: true, data: mod });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async updateModule(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { code, name, description, cohortIds, components } = req.body;

      if (cohortIds !== undefined && (!Array.isArray(cohortIds) || cohortIds.length === 0)) {
        return res.status(400).json({ success: false, message: 'At least one Cohort is required.' });
      }

      if (components && Array.isArray(components)) {
        for (const comp of components) {
          if (!comp.type || !comp.lecturerId) {
            return res.status(400).json({
              success: false,
              message: `Please select a lecturer for the ${comp.type || 'teaching'} component.`
            });
          }
          if (!comp.durationMinutes || comp.durationMinutes <= 0) {
            return res.status(400).json({
              success: false,
              message: `Duration for ${comp.type} must be greater than 0 minutes.`
            });
          }
        }
      }

      // Update module basic info and cohorts
      await prisma.module.update({
        where: { id },
        data: {
          code: code ? code.trim().toUpperCase() : undefined,
          name: name ? name.trim() : undefined,
          description: description !== undefined ? description : undefined,
          cohorts: cohortIds && Array.isArray(cohortIds) ? {
            set: cohortIds.map((cId: string) => ({ id: cId }))
          } : undefined
        }
      });

      // If components are provided, replace components
      if (components && Array.isArray(components)) {
        await prisma.moduleComponent.deleteMany({ where: { moduleId: id } });
        await prisma.moduleComponent.createMany({
          data: components.map(c => ({
            moduleId: id,
            type: c.type,
            durationMinutes: parseInt(c.durationMinutes, 10),
            requiredRoomType: c.requiredRoomType || 'ANY',
            lecturerId: c.lecturerId
          }))
        });
      }

      const mod = await prisma.module.findUnique({
        where: { id },
        include: {
          components: { include: { lecturer: true } },
          cohorts: true
        }
      });

      res.json({ success: true, data: mod });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async deleteModule(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await prisma.module.delete({ where: { id } });
      res.json({ success: true, message: 'Module and associated components deleted successfully' });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // --- LECTURERS ---
  static async getLecturers(req: Request, res: Response) {
    try {
      const lecturers = await prisma.lecturer.findMany({
        include: {
          components: {
            include: { module: true }
          }
        },
        orderBy: { name: 'asc' }
      });
      res.json({ success: true, data: lecturers });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async createLecturer(req: Request, res: Response) {
    try {
      const { name, email, department, availability, maxDailyHours } = req.body;
      if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Name and Email are required.' });
      }
      const lecturer = await prisma.lecturer.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          department: department || 'Computing and Informatics',
          availability: typeof availability === 'string' ? availability : JSON.stringify(availability || DEFAULT_ACADEMIC_DAYS),
          maxDailyHours: maxDailyHours ? parseInt(maxDailyHours, 10) : 6
        }
      });
      res.status(201).json({ success: true, data: lecturer });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async updateLecturer(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { name, email, department, availability, maxDailyHours } = req.body;
      const lecturer = await prisma.lecturer.update({
        where: { id },
        data: {
          name: name ? name.trim() : undefined,
          email: email ? email.trim().toLowerCase() : undefined,
          department: department || undefined,
          availability: availability ? (typeof availability === 'string' ? availability : JSON.stringify(availability)) : undefined,
          maxDailyHours: maxDailyHours ? parseInt(maxDailyHours, 10) : undefined
        }
      });
      res.json({ success: true, data: lecturer });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async deleteLecturer(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await prisma.lecturer.delete({ where: { id } });
      res.json({ success: true, message: 'Lecturer deleted' });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // --- COHORTS ---
  static async getCohorts(req: Request, res: Response) {
    try {
      const cohorts = await prisma.cohort.findMany({
        include: {
          modules: {
            include: { components: true }
          }
        },
        orderBy: { name: 'asc' }
      });
      res.json({ success: true, data: cohorts });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async createCohort(req: Request, res: Response) {
    try {
      const { name, programme, studentCount } = req.body;
      if (!name || !programme) {
        return res.status(400).json({ success: false, message: 'Name and Programme are required.' });
      }
      const cohort = await prisma.cohort.create({
        data: {
          name: name.trim(),
          programme: programme.trim(),
          studentCount: parseInt(studentCount || 30, 10)
        }
      });
      res.status(201).json({ success: true, data: cohort });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async updateCohort(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { name, programme, studentCount } = req.body;
      const cohort = await prisma.cohort.update({
        where: { id },
        data: {
          name: name ? name.trim() : undefined,
          programme: programme ? programme.trim() : undefined,
          studentCount: studentCount ? parseInt(studentCount, 10) : undefined
        }
      });
      res.json({ success: true, data: cohort });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async deleteCohort(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await prisma.cohort.delete({ where: { id } });
      res.json({ success: true, message: 'Cohort deleted' });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // --- ROOMS ---
  static async getRooms(req: Request, res: Response) {
    try {
      const rooms = await prisma.room.findMany({
        orderBy: [{ building: 'asc' }, { name: 'asc' }]
      });
      res.json({ success: true, data: rooms });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async createRoom(req: Request, res: Response) {
    try {
      const { name, building, capacity, type, isAvailable } = req.body;
      if (!name || !capacity) {
        return res.status(400).json({ success: false, message: 'Room name and capacity are required.' });
      }
      const room = await prisma.room.create({
        data: {
          name: name.trim(),
          building: building || 'Main Block',
          capacity: parseInt(capacity, 10),
          type: type || 'CLASSROOM',
          isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true
        }
      });
      res.status(201).json({ success: true, data: room });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async updateRoom(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { name, building, capacity, type, isAvailable } = req.body;
      const room = await prisma.room.update({
        where: { id },
        data: {
          name: name ? name.trim() : undefined,
          building: building !== undefined ? building : undefined,
          capacity: capacity ? parseInt(capacity, 10) : undefined,
          type: type || undefined,
          isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : undefined
        }
      });
      res.json({ success: true, data: room });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async deleteRoom(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await prisma.room.delete({ where: { id } });
      res.json({ success: true, message: 'Room deleted' });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // --- TIME SLOTS ---
  static async getTimeSlots(req: Request, res: Response) {
    try {
      const timeSlots = await prisma.timeSlot.findMany({
        orderBy: { slotOrder: 'asc' }
      });
      res.json({ success: true, data: sortTimeSlots(timeSlots) });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async createTimeSlot(req: Request, res: Response) {
    try {
      const { day, startTime, endTime, slotOrder } = req.body;
      if (!day || !startTime || !endTime) {
        return res.status(400).json({ success: false, message: 'Day, Start Time and End Time are required.' });
      }
      const slot = await prisma.timeSlot.create({
        data: {
          day,
          startTime,
          endTime,
          slotOrder: slotOrder ? parseInt(slotOrder, 10) : 1
        }
      });
      res.status(201).json({ success: true, data: slot });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  }
}
