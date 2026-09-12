import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding Intelligent Academic Planner (Multi-Component Architecture)...');

  // Clean existing records
  await prisma.examRoomAllocation.deleteMany();
  await prisma.examination.deleteMany();
  await prisma.timetableSession.deleteMany();
  await prisma.generationLog.deleteMany();
  await prisma.moduleComponent.deleteMany();
  await prisma.module.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.room.deleteMany();
  await prisma.cohort.deleteMany();
  await prisma.lecturer.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed Admin User
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      name: 'Academic Administrator',
      email: 'admin@iap.edu',
      passwordHash,
      role: 'ADMIN'
    }
  });
  console.log('✓ Seeded Admin User (admin@iap.edu / admin123)');

  // 2. Seed Lecturers
  const lecturers = await prisma.$transaction([
    prisma.lecturer.create({
      data: {
        name: 'Dr. John Smith',
        email: 'john.smith@iap.edu',
        department: 'Software Engineering',
        availability: JSON.stringify(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
        maxDailyHours: 6
      }
    }),
    prisma.lecturer.create({
      data: {
        name: 'Prof. Sarah Wilson',
        email: 'sarah.wilson@iap.edu',
        department: 'Data and AI Systems',
        availability: JSON.stringify(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']),
        maxDailyHours: 4
      }
    }),
    prisma.lecturer.create({
      data: {
        name: 'Dr. Roy Kumar',
        email: 'roy.kumar@iap.edu',
        department: 'Software Architecture',
        availability: JSON.stringify(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
        maxDailyHours: 6
      }
    }),
    prisma.lecturer.create({
      data: {
        name: 'Dr. Michael Brown',
        email: 'michael.brown@iap.edu',
        department: 'Systems and Networks',
        availability: JSON.stringify(['Sunday', 'Monday', 'Wednesday', 'Thursday', 'Friday']),
        maxDailyHours: 6
      }
    }),
    prisma.lecturer.create({
      data: {
        name: 'Ms. Emily Davis',
        email: 'emily.davis@iap.edu',
        department: 'Web and Mobile Computing',
        availability: JSON.stringify(['Sunday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
        maxDailyHours: 4
      }
    }),
    prisma.lecturer.create({
      data: {
        name: 'Prof. David Sharma',
        email: 'david.sharma@iap.edu',
        department: 'Computer Science Core',
        availability: JSON.stringify(['Sunday', 'Monday', 'Tuesday', 'Thursday', 'Friday']),
        maxDailyHours: 6
      }
    })
  ]);
  console.log(`✓ Seeded ${lecturers.length} Lecturers`);

  // 3. Seed Cohorts
  const cohorts = await prisma.$transaction([
    prisma.cohort.create({
      data: {
        name: 'BIT 2A',
        programme: 'BSc (Hons) Information Technology',
        studentCount: 45
      }
    }),
    prisma.cohort.create({
      data: {
        name: 'BIT 2B',
        programme: 'BSc (Hons) Information Technology',
        studentCount: 38
      }
    }),
    prisma.cohort.create({
      data: {
        name: 'BIT 3A',
        programme: 'BSc (Hons) Software Engineering',
        studentCount: 42
      }
    }),
    prisma.cohort.create({
      data: {
        name: 'BSc CS 2A',
        programme: 'BSc (Hons) Computer Science',
        studentCount: 55
      }
    })
  ]);
  console.log(`✓ Seeded ${cohorts.length} Cohorts`);

  // 4. Seed Rooms
  const rooms = await prisma.$transaction([
    prisma.room.create({
      data: {
        name: 'Room 101',
        building: 'Block A (Main)',
        capacity: 40,
        type: 'CLASSROOM',
        isAvailable: true
      }
    }),
    prisma.room.create({
      data: {
        name: 'Room 102',
        building: 'Block A (Main)',
        capacity: 60,
        type: 'CLASSROOM',
        isAvailable: true
      }
    }),
    prisma.room.create({
      data: {
        name: 'Lab 201',
        building: 'Block B (Tech Center)',
        capacity: 40,
        type: 'COMPUTER_LAB',
        isAvailable: true
      }
    }),
    prisma.room.create({
      data: {
        name: 'Lab 202',
        building: 'Block B (Tech Center)',
        capacity: 50,
        type: 'COMPUTER_LAB',
        isAvailable: true
      }
    }),
    prisma.room.create({
      data: {
        name: 'Grand Hall 1',
        building: 'Auditorium Wing',
        capacity: 100,
        type: 'LECTURE_HALL',
        isAvailable: true
      }
    })
  ]);
  console.log(`✓ Seeded ${rooms.length} Rooms`);

  // 5. Seed Type-Specific Time Slots across Sunday - Friday (6-day academic week)
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const slotDefinitions = [
    // WORKSHOP anchors (120 min)
    { startTime: '09:00', endTime: '11:00', slotOrder: 1, intendedType: 'WORKSHOP' },
    { startTime: '11:00', endTime: '13:00', slotOrder: 2, intendedType: 'WORKSHOP' },
    { startTime: '14:00', endTime: '16:00', slotOrder: 3, intendedType: 'WORKSHOP' },

    // LECTURE anchors (90 min)
    { startTime: '09:30', endTime: '11:00', slotOrder: 1, intendedType: 'LECTURE' },
    { startTime: '12:00', endTime: '13:30', slotOrder: 2, intendedType: 'LECTURE' },
    { startTime: '14:30', endTime: '16:00', slotOrder: 3, intendedType: 'LECTURE' },

    // TUTORIAL anchors (60 min)
    { startTime: '09:00', endTime: '10:00', slotOrder: 1, intendedType: 'TUTORIAL' },
    { startTime: '11:00', endTime: '12:00', slotOrder: 2, intendedType: 'TUTORIAL' },
    { startTime: '13:00', endTime: '14:00', slotOrder: 3, intendedType: 'TUTORIAL' }
  ];

  const timeSlotsData = [];
  for (const day of days) {
    for (const slot of slotDefinitions) {
      timeSlotsData.push({
        day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotOrder: slot.slotOrder,
        intendedType: slot.intendedType
      });
    }
  }

  await prisma.timeSlot.createMany({
    data: timeSlotsData
  });
  const timeSlots = await prisma.timeSlot.findMany();
  console.log(`✓ Seeded ${timeSlots.length} Type-Specific Time Slots`);

  // 6. Seed Modules with Multi-Component Teaching Structures (Different Lecturers per Component)
  const modules = await prisma.$transaction([
    // Demo Module: ABC Core Systems (BIT 2A)
    // Lecture: John (1.5h/90m), Tutorial: Roy (1h/60m), Workshop: Sarah (2h/120m)
    prisma.module.create({
      data: {
        code: 'ABC',
        name: 'Computer Systems and Architecture',
        cohorts: { connect: [{ id: cohorts[0].id }] },
        components: {
          create: [
            {
              type: 'LECTURE',
              durationMinutes: 90, // 1.5 hours
              requiredRoomType: 'CLASSROOM',
              lecturerId: lecturers[0].id // Dr. John Smith
            },
            {
              type: 'TUTORIAL',
              durationMinutes: 60, // 1.0 hour
              requiredRoomType: 'CLASSROOM',
              lecturerId: lecturers[2].id // Dr. Roy Kumar
            },
            {
              type: 'WORKSHOP',
              durationMinutes: 120, // 2.0 hours
              requiredRoomType: 'COMPUTER_LAB',
              lecturerId: lecturers[1].id // Prof. Sarah Wilson
            }
          ]
        }
      }
    }),

    // Module 2: CS501 Web Development (BIT 2A)
    // Lecture: John (1.5h/90m), Tutorial: Emily (1h/60m), Workshop: Michael (2h/120m)
    prisma.module.create({
      data: {
        code: 'CS501',
        name: 'Web Development',
        cohorts: { connect: [{ id: cohorts[0].id }] },
        components: {
          create: [
            {
              type: 'LECTURE',
              durationMinutes: 90,
              requiredRoomType: 'CLASSROOM',
              lecturerId: lecturers[0].id // Dr. John Smith
            },
            {
              type: 'TUTORIAL',
              durationMinutes: 60,
              requiredRoomType: 'CLASSROOM',
              lecturerId: lecturers[4].id // Ms. Emily Davis
            },
            {
              type: 'WORKSHOP',
              durationMinutes: 120,
              requiredRoomType: 'COMPUTER_LAB',
              lecturerId: lecturers[3].id // Dr. Michael Brown
            }
          ]
        }
      }
    }),

    // Module 3: CS502 Database Systems (BIT 2A)
    // Lecture: Sarah (1.5h), Tutorial: David (1h), Workshop: John (2h)
    prisma.module.create({
      data: {
        code: 'CS502',
        name: 'Database Systems',
        cohorts: { connect: [{ id: cohorts[0].id }] },
        components: {
          create: [
            {
              type: 'LECTURE',
              durationMinutes: 90,
              requiredRoomType: 'CLASSROOM',
              lecturerId: lecturers[1].id // Prof. Sarah Wilson
            },
            {
              type: 'TUTORIAL',
              durationMinutes: 60,
              requiredRoomType: 'CLASSROOM',
              lecturerId: lecturers[5].id // Prof. David Sharma
            },
            {
              type: 'WORKSHOP',
              durationMinutes: 120,
              requiredRoomType: 'COMPUTER_LAB',
              lecturerId: lecturers[0].id // Dr. John Smith
            }
          ]
        }
      }
    }),

    // Module 4: CS503 Software Engineering (BIT 2B & BIT 3A - Multi-Cohort Shared Module)
    // Lecture: Michael (1.5h), Tutorial: Roy (1h), Workshop: Emily (2h)
    prisma.module.create({
      data: {
        code: 'CS503',
        name: 'Software Engineering',
        cohorts: { connect: [{ id: cohorts[1].id }, { id: cohorts[2].id }] },
        components: {
          create: [
            {
              type: 'LECTURE',
              durationMinutes: 90,
              requiredRoomType: 'CLASSROOM',
              lecturerId: lecturers[3].id // Dr. Michael Brown
            },
            {
              type: 'TUTORIAL',
              durationMinutes: 60,
              requiredRoomType: 'CLASSROOM',
              lecturerId: lecturers[2].id // Dr. Roy Kumar
            },
            {
              type: 'WORKSHOP',
              durationMinutes: 120,
              requiredRoomType: 'COMPUTER_LAB',
              lecturerId: lecturers[4].id // Ms. Emily Davis
            }
          ]
        }
      }
    }),

    // Module 5: CS504 Computer Networks (BIT 2B)
    // Lecture: Michael (1.5h), Workshop: Sarah (2h)
    prisma.module.create({
      data: {
        code: 'CS504',
        name: 'Computer Networks',
        cohorts: { connect: [{ id: cohorts[1].id }] },
        components: {
          create: [
            {
              type: 'LECTURE',
              durationMinutes: 90,
              requiredRoomType: 'CLASSROOM',
              lecturerId: lecturers[3].id // Dr. Michael Brown
            },
            {
              type: 'WORKSHOP',
              durationMinutes: 120,
              requiredRoomType: 'COMPUTER_LAB',
              lecturerId: lecturers[1].id // Prof. Sarah Wilson
            }
          ]
        }
      }
    }),

    // Module 6: CS601 Artificial Intelligence (BIT 3A)
    // Lecture: Sarah (1.5h), Workshop: Emily (2h)
    prisma.module.create({
      data: {
        code: 'CS601',
        name: 'Artificial Intelligence',
        cohorts: { connect: [{ id: cohorts[2].id }] },
        components: {
          create: [
            {
              type: 'LECTURE',
              durationMinutes: 90,
              requiredRoomType: 'CLASSROOM',
              lecturerId: lecturers[1].id // Prof. Sarah Wilson
            },
            {
              type: 'WORKSHOP',
              durationMinutes: 120,
              requiredRoomType: 'COMPUTER_LAB',
              lecturerId: lecturers[4].id // Ms. Emily Davis
            }
          ]
        }
      }
    }),

    // Module 7: CS505 Data Structures & Algorithms (BSc CS 2A)
    // Lecture: David (1.5h), Tutorial: Michael (1h), Workshop: David (2h)
    prisma.module.create({
      data: {
        code: 'CS505',
        name: 'Data Structures and Algorithms',
        cohorts: { connect: [{ id: cohorts[3].id }] },
        components: {
          create: [
            {
              type: 'LECTURE',
              durationMinutes: 90,
              requiredRoomType: 'CLASSROOM',
              lecturerId: lecturers[5].id // Prof. David Sharma
            },
            {
              type: 'TUTORIAL',
              durationMinutes: 60,
              requiredRoomType: 'CLASSROOM',
              lecturerId: lecturers[3].id // Dr. Michael Brown
            },
            {
              type: 'WORKSHOP',
              durationMinutes: 120,
              requiredRoomType: 'COMPUTER_LAB',
              lecturerId: lecturers[5].id // Prof. David Sharma
            }
          ]
        }
      }
    })
  ]);
  console.log(`✓ Seeded ${modules.length} Multi-Component Modules`);

  // 7. Seed Demo Examinations
  const exams = await prisma.$transaction([
    prisma.examination.create({
      data: {
        title: 'Database Systems Midterm Examination',
        studentCount: 85,
        date: '2026-10-15',
        startTime: '10:00',
        duration: 2,
        status: 'PENDING',
        moduleId: modules[1].id,
        cohortId: cohorts[0].id
      }
    }),
    prisma.examination.create({
      data: {
        title: 'Web Development Practical Exam',
        studentCount: 72,
        date: '2026-10-16',
        startTime: '10:00',
        duration: 2,
        status: 'PENDING',
        moduleId: modules[0].id,
        cohortId: cohorts[0].id
      }
    }),
    prisma.examination.create({
      data: {
        title: 'Software Engineering Comprehensive Exam',
        studentCount: 60,
        date: '2026-10-17',
        startTime: '14:00',
        duration: 2,
        status: 'PENDING',
        moduleId: modules[2].id,
        cohortId: cohorts[1].id
      }
    })
  ]);
  console.log(`✓ Seeded ${exams.length} Examinations`);

  console.log('🎉 Database seeding complete with Multi-Component Module architecture!');
}

seed()
  .catch(e => {
    console.error('Seeding failed:', e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
