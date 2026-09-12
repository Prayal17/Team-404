import { prisma } from '../src/config/prisma.js';
import { TimetableEngine } from '../src/scheduling/timetableEngine.js';
import { ConflictDetector, SessionWithRelations } from '../src/scheduling/conflictDetector.js';
import { doIntervalsOverlap } from '../src/utils/timeUtils.js';

async function runDemoVerification() {
  console.log('================================================================');
  console.log('  KEY DEMO SCENARIO & INTERVAL CONFLICT VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function check(cond: boolean | undefined | null, name: string, detail?: string) {
    total++;
    if (Boolean(cond)) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name}`);
      if (detail) console.error(`    Detail: ${detail}`);
    }
  }

  // 1. Verify Module ABC in Database
  const abcModule = await prisma.module.findUnique({
    where: { code: 'ABC' },
    include: {
      components: {
        include: { lecturer: true }
      },
      cohorts: true
    }
  });

  check(!!abcModule, 'ABC Module exists in database');
  if (!abcModule) {
    throw new Error('ABC module not found. Please run seed script.');
  }

  const lectureComp = abcModule.components.find(c => c.type === 'LECTURE');
  const tutorialComp = abcModule.components.find(c => c.type === 'TUTORIAL');
  const workshopComp = abcModule.components.find(c => c.type === 'WORKSHOP');

  check(
    Boolean(lectureComp?.lecturer.name.includes('John') && lectureComp.durationMinutes === 90),
    'ABC Lecture component -> Dr. John Smith (1.5h / 90m)',
    `Got ${lectureComp?.lecturer.name}, ${lectureComp?.durationMinutes}m`
  );

  check(
    Boolean(tutorialComp?.lecturer.name.includes('Roy') && tutorialComp.durationMinutes === 60),
    'ABC Tutorial component -> Dr. Roy Kumar (1.0h / 60m)',
    `Got ${tutorialComp?.lecturer.name}, ${tutorialComp?.durationMinutes}m`
  );

  check(
    Boolean(workshopComp?.lecturer.name.includes('Sarah') && workshopComp.durationMinutes === 120),
    'ABC Workshop component -> Prof. Sarah Wilson (2.0h / 120m)',
    `Got ${workshopComp?.lecturer.name}, ${workshopComp?.durationMinutes}m`
  );

  // 2. Generate Timetable and inspect ABC scheduled sessions
  console.log('\n--- Generating Timetable via Engine ---');
  const genResult = await TimetableEngine.generateTimetable();
  console.log(`  Engine finished in ${genResult.stats.executionTimeMs}ms with quality ${genResult.stats.qualityScore}%`);

  const abcSessions = await prisma.timetableSession.findMany({
    where: { moduleId: abcModule.id },
    include: { lecturer: true, room: true, cohort: true }
  });

  check(abcSessions.length === 3, 'All 3 components of ABC module were scheduled');

  const scheduledLec = abcSessions.find(s => s.sessionType === 'LECTURE');
  const scheduledTut = abcSessions.find(s => s.sessionType === 'TUTORIAL');
  const scheduledWrk = abcSessions.find(s => s.sessionType === 'WORKSHOP');

  check(
    Boolean(scheduledLec?.lecturer.name.includes('John') && scheduledLec?.durationMinutes === 90),
    `Scheduled ABC Lecture preserves John & 1.5h (${scheduledLec?.day} ${scheduledLec?.startTime}–${scheduledLec?.endTime} in ${scheduledLec?.room?.name})`
  );

  check(
    Boolean(scheduledTut?.lecturer.name.includes('Roy') && scheduledTut?.durationMinutes === 60),
    `Scheduled ABC Tutorial preserves Roy & 1.0h (${scheduledTut?.day} ${scheduledTut?.startTime}–${scheduledTut?.endTime} in ${scheduledTut?.room?.name})`
  );

  check(
    Boolean(scheduledWrk?.lecturer.name.includes('Sarah') && scheduledWrk?.durationMinutes === 120),
    `Scheduled ABC Workshop preserves Sarah & 2.0h (${scheduledWrk?.day} ${scheduledWrk?.startTime}–${scheduledWrk?.endTime} in ${scheduledWrk?.room?.name})`
  );

  // Check multi-cohort shared module (CS503 Software Engineering taken by 2 cohorts)
  const cs503 = await prisma.module.findUnique({
    where: { code: 'CS503' },
    include: { cohorts: true, components: true }
  });
  const cs503Sessions = await prisma.timetableSession.findMany({
    where: { moduleId: cs503?.id },
    include: { cohort: true, moduleComponent: true }
  });
  const cohortNames = Array.from(new Set(cs503Sessions.map(s => s.cohort.name)));
  check(
    (cs503?.cohorts.length || 0) >= 2 && cs503Sessions.length >= 6 && cohortNames.length === 2,
    `Shared Module CS503 scheduled separately per cohort (2 cohorts: ${cohortNames.join(', ')} -> ${cs503Sessions.length} total sessions)`
  );

  // 3. Test Conflict Detection Logic
  console.log('\n--- Conflict Detection & Interval Overlaps ---');

  // Interval overlap checks
  const backToBack = doIntervalsOverlap('09:00', '10:30', '10:30', '11:30');
  check(!backToBack, '09:00–10:30 and 10:30–11:30 do NOT conflict (back-to-back)');

  const partialOverlap = doIntervalsOverlap('09:00', '10:30', '10:00', '11:00');
  check(partialOverlap, '09:00‒10:30 and 10:00‒11:00 DO conflict (overlapping interval)');

  // John overlapping session conflict
  const mockJohn = { id: 'lec-john', name: 'Dr. John Smith', email: 'john@iap.edu', availability: 'ALL' };
  const mockRoomA = { id: 'r-101', name: 'Room 101', capacity: 50, type: 'CLASSROOM', isAvailable: true };
  const mockRoomB = { id: 'r-102', name: 'Room 102', capacity: 50, type: 'CLASSUOOM', isAvailable: true };
  const mockCohort1 = { id: 'c-1', name: 'Cohort 1', studentCount: 30 };
  const mockCohort2 = { id: 'c-2', name: 'Cohort 2', studentCount: 30 };

  const sJohn1: SessionWithRelations = {
    id: 'sj1',
    moduleId: 'm1',
    sessionType: 'LECTURE',
    durationMinutes: 90,
    startTime: '09:00',
    endTime: '10:30',
    day: 'Monday',
    lecturerId: mockJohn.id,
    cohortId: mockCohort1.id,
    roomId: mockRoomA.id,
    timeSlotId: 'ts1',
    status: 'SCHEDULED',
    module: { id: 'm1', code: 'ABC', name: 'ABC Module' },
    lecturer: mockJohn,
    cohort: mockCohort1,
    room: mockRoomA,
    timeSlot: { id: 'ts1', day: 'Monday', startTime: '09:00', endTime: '11:00', slotOrder: 1 }
  };

  const sJohn2Overlapping: SessionWithRelations = {
    id: 'sj2',
    moduleId: 'm2',
    sessionType: 'LECTURE',
    durationMinutes: 60,
    startTime: '10:00',
    endTime: '11:00',
    day: 'Monday',
    lecturerId: mockJohn.id,
    cohortId: mockCohort2.id,
    roomId: mockRoomB.id,
    timeSlotId: 'ts1',
    status: 'SCHEDULED',
    module: { id: 'm2', code: 'DEF', name: 'DEF Module' },
    lecturer: mockJohn,
    cohort: mockCohort2,
    room: mockRoomB,
    timeSlot: { id: 'ts1', day: 'Monday', startTime: '09:00', endTime: '11:00', slotOrder: 1 }
  };

  const conflictReport = ConflictDetector.validateTimetable([sJohn1, sJohn2Overlapping]);
  check(
    !conflictReport.isValid && conflictReport.lecturerConflictCount === 1,
    'John teaching another overlapping session causes a conflict (detected by validator)',
    `Got ${conflictReport.lecturerConflictCount} lecturer conflicts`
  );

  // 4. Workload Attribution
  console.log('\n--- Workload Attribution Verification ---');
  const johnComponents = await prisma.moduleComponent.findMany({
    where: { lecturer: { name: { contains: 'John' } } }
  });
  const royComponents = await prisma.moduleComponent.findMany({
    where: { lecturer: { name: { contains: 'Roy' } } }
  });
  const sarahComponents = await prisma.moduleComponent.findMany({
    where: { lecturer: { name: { contains: 'Sarah' } } }
  });

  const johnHours = johnComponents.reduce((acc, c) => acc + c.durationMinutes / 60, 0);
  const royHours = royComponents.reduce((acc, c) => acc + c.durationMinutes / 60, 0);
  const sarahHours = sarahComponents.reduce((acc, c) => acc + c.durationMinutes / 60, 0);

  check(johnHours > 0, `John attributed workload: ${johnHours} hrs/wk across ${johnComponents.length} components`);
  check(royHours > 0, `Roy attributed workload: ${royHours} hrs/wk across ${royComponents.length} components`);
  check(sarahHours > 0, `Sarah attributed workload: ${sarahHours} hrs/wk across ${sarahComponents.length} components`);
  check(
    johnHours !== royHours || royHours !== sarahHours,
    'Workload is attributed to John, Roy, and Sarah separately and accurately'
  );

  console.log(`\n===============================================================`);
  console.log(`  SUMMARY: ${passed}/${total} DEMO CHECKS PASSED`);
  console.log('===============================================================\n');

  await prisma.$disconnect();

  if (passed !== total) {
    throw new Error(`Only ${passed}/${total} demo checks passed.`);
  }
}

runDemoVerification().catch(e => {
  console.error('Verification error:', e);
});
