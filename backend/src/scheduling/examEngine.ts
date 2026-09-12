import { prisma } from '../config/prisma.js';

export interface ExamAllocationResult {
  examId: string;
  moduleCode: string;
  cohortName: string;
  studentCount: number;
  allocatedCapacity: number;
  isFullyAllocated: boolean;
  allocations: Array<{
    roomId: string;
    roomName: string;
    roomCapacity: number;
    allocatedStudents: number;
  }>;
  notes?: string;
}

export class ExamEngine {
  /**
   * Automatically allocates rooms for all examinations or a specific examination.
   * Supports multi-room distribution when student count exceeds single room capacity.
   */
  static async allocateExamRooms(targetExamId?: string): Promise<ExamAllocationResult[]> {
    const exams = await prisma.examination.findMany({
      where: targetExamId ? { id: targetExamId } : undefined,
      include: {
        module: true,
        cohort: true,
        allocations: {
          include: { room: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    const allRooms = await prisma.room.findMany({
      where: { isAvailable: true },
      orderBy: { capacity: 'desc' }
    });

    const results: ExamAllocationResult[] = [];
    const allAllocationsToCreate: Array<{ examinationId: string; roomId: string; allocatedStudents: number }> = [];
    const examUpdates: Array<any> = [];

    // Track room bookings in memory across exams to prevent double-booking on same date/time
    const bookedRoomsBySlot = new Map<string, Set<string>>();

    for (const exam of exams) {
      const slotKey = `${exam.date}_${exam.startTime}`;
      const bookedSet = bookedRoomsBySlot.get(slotKey) || new Set<string>();

      const availableRoomsForExam = allRooms.filter(r => !bookedSet.has(r.id));

      let remainingStudents = exam.studentCount;
      let totalAllocated = 0;
      const allocations: ExamAllocationResult['allocations'] = [];

      // Greedy room allocation
      for (const room of availableRoomsForExam) {
        if (remainingStudents <= 0) break;

        const studentsToPutInThisRoom = Math.min(room.capacity, remainingStudents);
        allocations.push({
          roomId: room.id,
          roomName: room.name,
          roomCapacity: room.capacity,
          allocatedStudents: studentsToPutInThisRoom
        });

        allAllocationsToCreate.push({
          examinationId: exam.id,
          roomId: room.id,
          allocatedStudents: studentsToPutInThisRoom
        });

        bookedSet.add(room.id);
        remainingStudents -= studentsToPutInThisRoom;
        totalAllocated += studentsToPutInThisRoom;
      }

      bookedRoomsBySlot.set(slotKey, bookedSet);
      const isFullyAllocated = remainingStudents === 0;

      examUpdates.push(
        prisma.examination.update({
          where: { id: exam.id },
          data: {
            status: isFullyAllocated ? 'SCHEDULED' : 'UNALLOCATED',
            notes: isFullyAllocated
              ? `Successfully allocated across ${allocations.length} venue(s) (${allocations.map(a => `${a.roomName}: ${a.allocatedStudents}`).join(', ')})`
              : `Capacity deficit: ${remainingStudents} students unallocated due to room shortages on ${exam.date}.`
          }
        })
      );

      results.push({
        examId: exam.id,
        moduleCode: exam.module.code,
        cohortName: exam.cohort.name,
        studentCount: exam.studentCount,
        allocatedCapacity: totalAllocated,
        isFullyAllocated,
        allocations,
        notes: isFullyAllocated
          ? `Allocated to: ${allocations.map(a => `${a.roomName} (${a.allocatedStudents} seats)`).join(', ')}`
          : `Deficit of ${remainingStudents} seats`
      });
    }

    // Single atomic batch transaction for all exams
    await prisma.$transaction([
      targetExamId
        ? prisma.examRoomAllocation.deleteMany({ where: { examinationId: targetExamId } })
        : prisma.examRoomAllocation.deleteMany(),
      ...(allAllocationsToCreate.length > 0
        ? [prisma.examRoomAllocation.createMany({ data: allAllocationsToCreate })]
        : []),
      ...examUpdates
    ]);

    return results;
  }
}
