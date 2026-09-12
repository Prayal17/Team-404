import { ConflictDetector, SessionWithRelations } from '../src/scheduling/conflictDetector.js';
import { doIntervalsOverlap, timeToMinutes, minutesToTime, addMinutesToTime, formatDuration } from '../src/utils/timeUtils.js';

console.log('================================================================');
console.log('  IAP MULTI-COMPONENT LECTURER & INTERVAL SCHEDULING TEST SUITE  ');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (detail) console.error(`    Reason: ${detail}`);
  }
}

// Mock test entities
const mockLecturerJohn = { id: 'lec-john', name: 'Dr. John Smith', email: 'john@iap.edu', availability: JSON.stringify(['Monday', 'Tuesday', 'Wednesday']) };
const mockLecturerRoy = { id: 'lec-roy', name: 'Dr. Roy Kumar', email: 'roy@iap.edu', availability: JSON.stringify(['Monday', 'Thursday']) };
const mockLecturerSarah = { id: 'lec-sarah', name: 'Prof. Sarah Wilson', email: 'sarah@iap.edu', availability: JSON.stringify(['Tuesday', 'Wednesday', 'Thursday']) };

const mockCohortA = { id: 'coh-a', name: 'BIT 2A', studentCount: 40 };
const mockCohortB = { id: 'coh-b', name: 'BIT 2B', studentCount: 30 };

const mockRoom101 = { id: 'r-101', name: 'Room 101', capacity: 45, type: 'CLASSROOM', isAvailable: true };
const mockRoom102 = { id: 'r-102', name: 'Room 102', capacity: 50, type: 'CLASSROOM', isAvailable: true };
const mockLab201 = { id: 'lab-201', name: 'Lab 201', capacity: 40, type: 'COMPUTER_LAB', isAvailable: true };

const mockSlotMon09 = { id: 'slot-1', day: 'Monday', startTime: '09:00', endTime: '11:00', slotOrder: 1 };
const mockSlotMon11 = { id: 'slot-2', day: 'Monday', startTime: '11:00', endTime: '13:00', slotOrder: 2 };

// TEST 1: Decimal Duration & Minute Conversion
{
  const durHours = 1.5;
  const durMinutes = durHours * 60; // 90
  const formatted = formatDuration(durMinutes); // "1.5h"
  const start = '09:00';
  const end = addMinutesToTime(start, durMinutes); // "10:30"

  assert(
    durMinutes === 90 && formatted === '1.5h' && end === '10:30',
    'Test 1: Decimal Duration (1.5h = 90min, 09:00 + 90min = 10:30)',
    `Expected 90min & 10:30, got ${durMinutes} & ${end}`
  );
}

// TEST 2: Different lecturers for components of same module (Lecture -> John, Tutorial -> Roy, Workshop -> Sarah)
{
  const moduleABC = { id: 'm-abc', code: 'ABC', name: 'Web Dev' };

  const sessionLecture: SessionWithRelations = {
    id: 's-lec',
    moduleId: moduleABC.id,
    sessionType: 'LECTURE',
    durationMinutes: 90,
    startTime: '09:00',
    endTime: '10:30',
    day: 'Monday',
    lecturerId: mockLecturerJohn.id,
    cohortId: mockCohortA.id,
    roomId: mockRoom101.id,
    timeSlotId: mockSlotMon09.id,
    status: 'SCHEDULED',
    module: moduleABC,
    lecturer: mockLecturerJohn,
    cohort: mockCohortA,
    room: mockRoom101,
    timeSlot: mockSlotMon09
  };

  const sessionTutorial: SessionWithRelations = {
    id: 's-tut',
    moduleId: moduleABC.id,
    sessionType: 'TUTORIAL',
    durationMinutes: 60,
    startTime: '11:00',
    endTime: '12:00',
    day: 'Monday',
    lecturerId: mockLecturerRoy.id,
    cohortId: mockCohortA.id,
    roomId: mockRoom102.id,
    timeSlotId: mockSlotMon11.id,
    status: 'SCHEDULED',
    module: moduleABC,
    lecturer: mockLecturerRoy,
    cohort: mockCohortA,
    room: mockRoom102,
    timeSlot: mockSlotMon11
  };

  const report = ConflictDetector.validateTimetable([sessionLecture, sessionTutorial]);
  assert(
    report.isValid && report.conflictCount === 0,
    'Test 2: Different Lecturers per Component Valid (Lecture: John, Tutorial: Roy)',
    `Expected valid schedule, got ${report.conflictCount} conflicts`
  );
}

// TEST 3: Same lecturer for all components (valid)
{
  const moduleABC = { id: 'm-abc', code: 'ABC', name: 'Web Dev' };

  const s1: SessionWithRelations = {
    id: 's1',
    moduleId: moduleABC.id,
    sessionType: 'LECTURE',
    durationMinutes: 90,
    startTime: '09:00',
    endTime: '10:30',
    day: 'Monday',
    lecturerId: mockLecturerJohn.id,
    cohortId: mockCohortA.id,
    roomId: mockRoom101.id,
    timeSlotId: mockSlotMon09.id,
    status: 'SCHEDULED',
    module: moduleABC,
    lecturer: mockLecturerJohn,
    cohort: mockCohortA,
    room: mockRoom101,
    timeSlot: mockSlotMon09
  };

  const s2: SessionWithRelations = {
    id: 's2',
    moduleId: moduleABC.id,
    sessionType: 'TUTORIAL',
    durationMinutes: 60,
    startTime: '11:00',
    endTime: '12:00',
    day: 'Monday',
    lecturerId: mockLecturerJohn.id, // SAME LECTURER, DIFFERENT TIME
    cohortId: mockCohortA.id,
    roomId: mockRoom101.id,
    timeSlotId: mockSlotMon11.id,
    status: 'SCHEDULED',
    module: moduleABC,
    lecturer: mockLecturerJohn,
    cohort: mockCohortA,
    room: mockRoom101,
    timeSlot: mockSlotMon11
  };

  const report = ConflictDetector.validateTimetable([s1, s2]);
  assert(
    report.isValid,
    'Test 3: Same Lecturer for Multiple Components at Non-Overlapping Times (Valid)',
    `Expected valid, got ${report.conflictCount} conflicts`
  );
}

// TEST 4: Interval Non-Conflict (Back-to-back 09:00-10:30 and 10:30-11:30 for same lecturer)
{
  const overlaps = doIntervalsOverlap('09:00', '10:30', '10:30', '11:30');
  assert(
    !overlaps,
    'Test 4: Back-to-Back Sessions (09:00–10:30 and 10:30–11:30) Do NOT Overlap',
    `Expected false, got ${overlaps}`
  );
}

// TEST 5: Interval Overlap Detection (09:00-10:30 and 10:00-11:00 -> Overlap)
{
  const overlaps = doIntervalsOverlap('09:00', '10:30', '10:00', '11:00');
  assert(
    overlaps,
    'Test 5: Partial Interval Overlap (09:00–10:30 and 10:00–11:00) Correctly Detected',
    `Expected true, got ${overlaps}`
  );
}

// TEST 6: Lecturer Conflict on Overlapping Interval
{
  const moduleA = { id: 'm-a', code: 'ABC', name: 'Web Dev' };
  const moduleB = { id: 'm-b', code: 'DEF', name: 'Database' };

  const s1: SessionWithRelations = {
    id: 's1',
    moduleId: moduleA.id,
    sessionType: 'LECTURE',
    durationMinutes: 90,
    startTime: '09:00',
    endTime: '10:30',
    day: 'Monday',
    lecturerId: mockLecturerJohn.id,
    cohortId: mockCohortA.id,
    roomId: mockRoom101.id,
    timeSlotId: mockSlotMon09.id,
    status: 'SCHEDULED',
    module: moduleA,
    lecturer: mockLecturerJohn,
    cohort: mockCohortA,
    room: mockRoom101,
    timeSlot: mockSlotMon09
  };

  const s2: SessionWithRelations = {
    id: 's2',
    moduleId: moduleB.id,
    sessionType: 'TUTORIAL',
    durationMinutes: 60,
    startTime: '10:00',
    endTime: '11:00', // OVERLAPS 10:00-10:30 with John
    day: 'Monday',
    lecturerId: mockLecturerJohn.id,
    cohortId: mockCohortB.id,
    roomId: mockRoom102.id,
    timeSlotId: mockSlotMon09.id,
    status: 'SCHEDULED',
    module: moduleB,
    lecturer: mockLecturerJohn,
    cohort: mockCohortB,
    room: mockRoom102,
    timeSlot: mockSlotMon09
  };

  const report = ConflictDetector.validateTimetable([s1, s2]);
  assert(
    !report.isValid && report.lecturerConflictCount === 1,
    'Test 6: Lecturer Clash Detected on Interval Overlap',
    `Expected 1 lecturer conflict, got ${report.lecturerConflictCount}`
  );
}

// TEST 7: Different Lecturers in Overlapping Slot Do NOT Cause Lecturer Conflict
{
  const moduleA = { id: 'm-a', code: 'ABC', name: 'Web Dev' };

  const sLecture: SessionWithRelations = {
    id: 's1',
    moduleId: moduleA.id,
    sessionType: 'LECTURE',
    durationMinutes: 90,
    startTime: '09:00',
    endTime: '10:30',
    day: 'Monday',
    lecturerId: mockLecturerJohn.id,
    cohortId: mockCohortA.id,
    roomId: mockRoom101.id,
    timeSlotId: mockSlotMon09.id,
    status: 'SCHEDULED',
    module: moduleA,
    lecturer: mockLecturerJohn,
    cohort: mockCohortA,
    room: mockRoom101,
    timeSlot: mockSlotMon09
  };

  const sTutorial: SessionWithRelations = {
    id: 's2',
    moduleId: moduleA.id,
    sessionType: 'TUTORIAL',
    durationMinutes: 60,
    startTime: '09:00',
    endTime: '10:00',
    day: 'Monday',
    lecturerId: mockLecturerRoy.id, // DIFFERENT LECTURER (Roy != John)
    cohortId: mockCohortB.id,       // DIFFERENT COHORT
    roomId: mockRoom102.id,         // DIFFERENT ROOM
    timeSlotId: mockSlotMon09.id,
    status: 'SCHEDULED',
    module: moduleA,
    lecturer: mockLecturerRoy,
    cohort: mockCohortB,
    room: mockRoom102,
    timeSlot: mockSlotMon09
  };

  const report = ConflictDetector.validateTimetable([sLecture, sTutorial]);
  assert(
    report.isValid && report.lecturerConflictCount === 0,
    'Test 7: Overlapping Times with Different Lecturers (Roy & John) Produce 0 Lecturer Conflicts',
    `Expected 0 conflicts, got ${report.conflictCount}`
  );
}

// TEST 8: Room Double-Booking on Interval Overlap
{
  const moduleA = { id: 'm-a', code: 'ABC', name: 'Web Dev' };
  const moduleB = { id: 'm-b', code: 'DEF', name: 'Database' };

  const s1: SessionWithRelations = {
    id: 's1',
    moduleId: moduleA.id,
    sessionType: 'LECTURE',
    durationMinutes: 90,
    startTime: '09:00',
    endTime: '10:30',
    day: 'Monday',
    lecturerId: mockLecturerJohn.id,
    cohortId: mockCohortA.id,
    roomId: mockRoom101.id, // SAME ROOM
    timeSlotId: mockSlotMon09.id,
    status: 'SCHEDULED',
    module: moduleA,
    lecturer: mockLecturerJohn,
    cohort: mockCohortA,
    room: mockRoom101,
    timeSlot: mockSlotMon09
  };

  const s2: SessionWithRelations = {
    id: 's2',
    moduleId: moduleB.id,
    sessionType: 'TUTORIAL',
    durationMinutes: 60,
    startTime: '10:00',
    endTime: '11:00',
    day: 'Monday',
    lecturerId: mockLecturerRoy.id,
    cohortId: mockCohortB.id,
    roomId: mockRoom101.id, // SAME ROOM
    timeSlotId: mockSlotMon09.id,
    status: 'SCHEDULED',
    module: moduleB,
    lecturer: mockLecturerRoy,
    cohort: mockCohortB,
    room: mockRoom101,
    timeSlot: mockSlotMon09
  };

  const report = ConflictDetector.validateTimetable([s1, s2]);
  assert(
    !report.isValid && report.roomConflictCount === 1,
    'Test 8: Room Double-Booking Detected on Interval Overlap',
    `Expected 1 room conflict, got ${report.roomConflictCount}`
  );
}

// TEST 9: Cohort Overlap Detected
{
  const moduleA = { id: 'm-a', code: 'ABC', name: 'Web Dev' };
  const moduleB = { id: 'm-b', code: 'DEF', name: 'Database' };

  const s1: SessionWithRelations = {
    id: 's1',
    moduleId: moduleA.id,
    sessionType: 'LECTURE',
    durationMinutes: 90,
    startTime: '09:00',
    endTime: '10:30',
    day: 'Monday',
    lecturerId: mockLecturerJohn.id,
    cohortId: mockCohortA.id, // SAME COHORT
    roomId: mockRoom101.id,
    timeSlotId: mockSlotMon09.id,
    status: 'SCHEDULED',
    module: moduleA,
    lecturer: mockLecturerJohn,
    cohort: mockCohortA,
    room: mockRoom101,
    timeSlot: mockSlotMon09
  };

  const s2: SessionWithRelations = {
    id: 's2',
    moduleId: moduleB.id,
    sessionType: 'TUTORIAL',
    durationMinutes: 60,
    startTime: '10:00',
    endTime: '11:00',
    day: 'Monday',
    lecturerId: mockLecturerRoy.id,
    cohortId: mockCohortA.id, // SAME COHORT
    roomId: mockRoom102.id,
    timeSlotId: mockSlotMon09.id,
    status: 'SCHEDULED',
    module: moduleB,
    lecturer: mockLecturerRoy,
    cohort: mockCohortA,
    room: mockRoom102,
    timeSlot: mockSlotMon09
  };

  const report = ConflictDetector.validateTimetable([s1, s2]);
  assert(
    !report.isValid && report.cohortConflictCount === 1,
    'Test 9: Cohort Clash Detected on Interval Overlap',
    `Expected 1 cohort conflict, got ${report.cohortConflictCount}`
  );
}

// TEST 10: Room Capacity Violation
{
  const moduleA = { id: 'm-a', code: 'ABC', name: 'Web Dev' };
  const mockRoomTiny = { id: 'r-tiny', name: 'Tiny Room', capacity: 20, type: 'CLASSROOM', isAvailable: true };

  const s1: SessionWithRelations = {
    id: 's1',
    moduleId: moduleA.id,
    sessionType: 'LECTURE',
    durationMinutes: 90,
    startTime: '09:00',
    endTime: '10:30',
    day: 'Monday',
    lecturerId: mockLecturerJohn.id,
    cohortId: mockCohortA.id, // 40 students
    roomId: mockRoomTiny.id,  // 20 capacity -> violation
    timeSlotId: mockSlotMon09.id,
    status: 'SCHEDULED',
    module: moduleA,
    lecturer: mockLecturerJohn,
    cohort: mockCohortA,
    room: mockRoomTiny,
    timeSlot: mockSlotMon09
  };

  const report = ConflictDetector.validateTimetable([s1]);
  assert(
    !report.isValid && report.capacityViolationCount === 1,
    'Test 10: Capacity Violation Detected (40 students in 20-cap room)',
    `Expected 1 capacity violation, got ${report.capacityViolationCount}`
  );
}

// TEST 11: Lecturer Availability Respected for Component
{
  // Roy is available Monday & Thursday. Scheduling Roy on Tuesday -> violation
  const moduleA = { id: 'm-a', code: 'ABC', name: 'Web Dev' };
  const mockSlotTue = { id: 'slot-tue', day: 'Tuesday', startTime: '09:00', endTime: '11:00', slotOrder: 1 };

  const s1: SessionWithRelations = {
    id: 's1',
    moduleId: moduleA.id,
    sessionType: 'TUTORIAL',
    durationMinutes: 60,
    startTime: '09:00',
    endTime: '10:00',
    day: 'Tuesday', // Roy not available Tuesday
    lecturerId: mockLecturerRoy.id,
    cohortId: mockCohortA.id,
    roomId: mockRoom101.id,
    timeSlotId: mockSlotTue.id,
    status: 'SCHEDULED',
    module: moduleA,
    lecturer: mockLecturerRoy,
    cohort: mockCohortA,
    room: mockRoom101,
    timeSlot: mockSlotTue
  };

  const report = ConflictDetector.validateTimetable([s1]);
  assert(
    !report.isValid && report.availabilityViolationCount === 1,
    'Test 11: Lecturer Availability Profile Respected per Component',
    `Expected 1 availability violation, got ${report.availabilityViolationCount}`
  );
}

// TEST 12: Workload Calculation Attribution
{
  // Module ABC: Lecture 1.5h (John), Tutorial 1.0h (Roy), Workshop 2.0h (Sarah)
  const components = [
    { type: 'LECTURE', durationMinutes: 90, lecturerId: mockLecturerJohn.id },
    { type: 'TUTORIAL', durationMinutes: 60, lecturerId: mockLecturerRoy.id },
    { type: 'WORKSHOP', durationMinutes: 120, lecturerId: mockLecturerSarah.id }
  ];

  const johnWorkload = components.filter(c => c.lecturerId === mockLecturerJohn.id).reduce((acc, c) => acc + c.durationMinutes / 60, 0);
  const royWorkload = components.filter(c => c.lecturerId === mockLecturerRoy.id).reduce((acc, c) => acc + c.durationMinutes / 60, 0);
  const sarahWorkload = components.filter(c => c.lecturerId === mockLecturerSarah.id).reduce((acc, c) => acc + c.durationMinutes / 60, 0);
  const totalModuleWorkload = components.reduce((acc, c) => acc + c.durationMinutes / 60, 0);

  assert(
    johnWorkload === 1.5 && royWorkload === 1.0 && sarahWorkload === 2.0 && totalModuleWorkload === 4.5,
    'Test 12: Workload Attribution (John: 1.5h, Roy: 1.0h, Sarah: 2.0h, Total: 4.5h)',
    `Got John: ${johnWorkload}h, Roy: ${royWorkload}h, Sarah: ${sarahWorkload}h`
  );
}

// TEST 13: Smart Suggestions for Component Resolution
{
  const moduleA = { id: 'm-a', code: 'ABC', name: 'Web Dev' };
  const mockRoomTiny = { id: 'r-tiny', name: 'Tiny Room', capacity: 20, type: 'CLASSROOM', isAvailable: true };

  const s1: SessionWithRelations = {
    id: 's1',
    moduleId: moduleA.id,
    sessionType: 'LECTURE',
    durationMinutes: 90,
    startTime: '09:00',
    endTime: '10:30',
    day: 'Monday',
    lecturerId: mockLecturerJohn.id,
    cohortId: mockCohortA.id, // 40 students
    roomId: mockRoomTiny.id,  // Tiny -> Capacity conflict
    timeSlotId: mockSlotMon09.id,
    status: 'SCHEDULED',
    module: moduleA,
    lecturer: mockLecturerJohn,
    cohort: mockCohortA,
    room: mockRoomTiny,
    timeSlot: mockSlotMon09
  };

  const suggestions = ConflictDetector.generateSuggestions(
    s1,
    [s1],
    [mockRoomTiny, mockRoom101, mockRoom102],
    [mockSlotMon09, mockSlotMon11]
  );

  assert(
    suggestions.length > 0 && suggestions.some(s => s.roomName === 'Room 101' || s.roomName === 'Room 102'),
    'Test 13: Smart Alternatives Generated for Component Session',
    `Generated ${suggestions.length} suggestions`
  );
}

// TEST 14: Valid Full Multi-Component Schedule Verification
{
  const moduleA = { id: 'm-a', code: 'ABC', name: 'Web Dev' };

  const sLecture: SessionWithRelations = {
    id: 's1',
    moduleId: moduleA.id,
    sessionType: 'LECTURE',
    durationMinutes: 90,
    startTime: '09:00',
    endTime: '10:30',
    day: 'Monday',
    lecturerId: mockLecturerJohn.id,
    cohortId: mockCohortA.id,
    roomId: mockRoom101.id,
    timeSlotId: mockSlotMon09.id,
    status: 'SCHEDULED',
    module: moduleA,
    lecturer: mockLecturerJohn,
    cohort: mockCohortA,
    room: mockRoom101,
    timeSlot: mockSlotMon09
  };

  const sTutorial: SessionWithRelations = {
    id: 's2',
    moduleId: moduleA.id,
    sessionType: 'TUTORIAL',
    durationMinutes: 60,
    startTime: '11:00',
    endTime: '12:00',
    day: 'Monday',
    lecturerId: mockLecturerRoy.id,
    cohortId: mockCohortA.id,
    roomId: mockRoom102.id,
    timeSlotId: mockSlotMon11.id,
    status: 'SCHEDULED',
    module: moduleA,
    lecturer: mockLecturerRoy,
    cohort: mockCohortA,
    room: mockRoom102,
    timeSlot: mockSlotMon11
  };

  const sWorkshop: SessionWithRelations = {
    id: 's3',
    moduleId: moduleA.id,
    sessionType: 'WORKSHOP',
    durationMinutes: 120,
    startTime: '14:00',
    endTime: '16:00',
    day: 'Tuesday',
    lecturerId: mockLecturerSarah.id,
    cohortId: mockCohortA.id,
    roomId: mockLab201.id,
    timeSlotId: { id: 'slot-tue14', day: 'Tuesday', startTime: '14:00', endTime: '16:00', slotOrder: 3 } as any,
    status: 'SCHEDULED',
    module: moduleA,
    lecturer: mockLecturerSarah,
    cohort: mockCohortA,
    room: mockLab201,
    timeSlot: { id: 'slot-tue14', day: 'Tuesday', startTime: '14:00', endTime: '16:00', slotOrder: 3 } as any
  };

  const report = ConflictDetector.validateTimetable([sLecture, sTutorial, sWorkshop]);
  assert(
    report.isValid && report.conflictCount === 0,
    'Test 14: Full Multi-Component Module Schedule Valid (0 Conflicts)',
    `Expected 0 conflicts, got ${report.conflictCount}`
  );
}

console.log(`\n================================================================`);
console.log(`  RESULTS: ${passedTests}/${totalTests} TESTS PASSED  `);
console.log(`================================================================\n`);

if (passedTests !== totalTests) {
  throw new Error(`Only ${passedTests}/${totalTests} tests passed.`);
}
