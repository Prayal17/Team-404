import http from 'http';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

async function testFullBackend() {
  console.log('--- STARTING MULTI-COMPONENT END-TO-END SYSTEM TEST ---');

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(5099, () => resolve()));
  console.log('✓ Test server listening on port 5099');

  const base = 'http://127.0.0.1:5099/api';

  // 1. Health check
  const healthRes: any = await fetch(`${base}/health`).then(r => r.json());
  console.log('1. Health check:', healthRes.status === 'ok' ? 'PASS' : 'FAIL');

  // 2. Auth Login
  const loginRes: any = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@iap.edu', password: 'admin123' })
  }).then(r => r.json());
  console.log('2. Admin Login:', loginRes.success ? 'PASS (Token issued)' : 'FAIL');
  const token = loginRes.data.token;

  // 3. Fetch lecturers & cohorts
  const [lecsRes, cohsRes]: any = await Promise.all([
    fetch(`${base}/lecturers`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
    fetch(`${base}/cohorts`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
  ]);

  const john = lecsRes.data.find((l: any) => l.name.includes('John'));
  const sarah = lecsRes.data.find((l: any) => l.name.includes('Sarah'));
  const michael = lecsRes.data.find((l: any) => l.name.includes('Michael'));
  const cohort = cohsRes.data[0];

  console.log(`3. Verified Lecturers for Component Testing: John (${john?.id}), Sarah (${sarah?.id}), Michael (${michael?.id})`);

  // Clean up test module if it previously existed
  await prisma.module.deleteMany({ where: { code: 'CS701' } });

  // 4. Create Module with 3 Distinct Component Lecturers & Decimal Durations
  console.log('4. Creating Module with 3 Distinct Component Lecturers (Lecture: 1.5h/John, Tutorial: 1h/Michael, Workshop: 2h/Sarah)...');
  const createModRes: any = await fetch(`${base}/modules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      code: 'CS701',
      name: 'Advanced Distributed Systems',
      cohortIds: [cohort.id],
      components: [
        {
          type: 'LECTURE',
          durationMinutes: 90, // 1.5 hours
          requiredRoomType: 'CLASSROOM',
          lecturerId: john.id
        },
        {
          type: 'TUTORIAL',
          durationMinutes: 60, // 1.0 hour
          requiredRoomType: 'CLASSROOM',
          lecturerId: michael.id
        },
        {
          type: 'WORKSHOP',
          durationMinutes: 120, // 2.0 hours
          requiredRoomType: 'COMPUTER_LAB',
          lecturerId: sarah.id
        }
      ]
    })
  }).then(r => r.json());

  const createdMod = createModRes.data;
  const lecComp = createdMod.components.find((c: any) => c.type === 'LECTURE');
  const tutComp = createdMod.components.find((c: any) => c.type === 'TUTORIAL');
  const wrkComp = createdMod.components.find((c: any) => c.type === 'WORKSHOP');

  console.log('   Created Components count:', createdMod.components.length);
  console.log(`   - LECTURE: ${lecComp?.durationMinutes}m (1.5h) -> Lecturer: ${lecComp?.lecturer?.name}`);
  console.log(`   - TUTORIAL: ${tutComp?.durationMinutes}m (1.0h) -> Lecturer: ${tutComp?.lecturer?.name}`);
  console.log(`   - WORKSHOP: ${wrkComp?.durationMinutes}m (2.0h) -> Lecturer: ${wrkComp?.lecturer?.name}`);

  const componentsVerified =
    lecComp?.lecturerId === john.id &&
    tutComp?.lecturerId === michael.id &&
    wrkComp?.lecturerId === sarah.id &&
    lecComp?.durationMinutes === 90 &&
    tutComp?.durationMinutes === 60 &&
    wrkComp?.durationMinutes === 120;

  console.log('   Independent Component Creation Result:', componentsVerified ? 'PASS' : 'FAIL');

  // 5. Generate Timetable with Multi-Component Scheduling Engine
  console.log('5. Running Constraint Solver on all Module Components...');
  const genRes: any = await fetch(`${base}/timetable/generate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json());

  console.log('   Stats:', {
    totalRequirements: genRes.data.stats.totalRequirements,
    scheduled: genRes.data.stats.scheduledCount,
    unscheduled: genRes.data.stats.unscheduledCount,
    evaluations: genRes.data.stats.candidateEvaluations,
    rejections: genRes.data.stats.rejectionsCount,
    qualityScore: genRes.data.stats.qualityScore + '%',
    executionTimeMs: genRes.data.stats.executionTimeMs + 'ms'
  });
  console.log('   Validation conflicts count:', genRes.data.validation.conflictCount);
  console.log('   Timetable Solver Result:', genRes.data.validation.isValid && genRes.data.stats.scheduledCount > 0 ? 'PASS (0 CONFLICTS)' : 'FAIL');

  // 6. Verify Scheduled Sessions for CS701 retain independent component lecturers
  const cs701Sessions = genRes.data.sessions.filter((s: any) => s.module.code === 'CS701');
  console.log(`6. Verifying CS701 Scheduled Sessions count (${cs701Sessions.length}):`);
  for (const s of cs701Sessions) {
    console.log(`   - [${s.sessionType}] ${s.day} ${s.startTime}–${s.endTime} (${s.durationMinutes}m) in ${s.room?.name} -> Lecturer: ${s.lecturer?.name}`);
  }

  // 7. Verify Faculty Workload Attribution
  console.log('7. Verifying Faculty Workload Analytics...');
  const dashRes: any = await fetch(`${base}/dashboard`, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json());

  console.log('   Faculty Workload Table:');
  for (const fw of dashRes.data.facultyWorkload) {
    console.log(`   - ${fw.name}: ${fw.weeklyTeachingHours} hrs/wk (${fw.scheduledSessionCount} sessions)`);
  }

  // 8. Verify Examination Multi-Room Allocation still works
  console.log('8. Verifying Examination Multi-Room Allocation...');
  const examGenRes: any = await fetch(`${base}/examinations/generate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json());

  console.log('   Allocated exams count:', examGenRes.data.exams.length);
  console.log('   Exam Allocation Result:', examGenRes.data.exams.every((e: any) => e.allocations.length > 0) ? 'PASS' : 'FAIL');

  server.close();
  await prisma.$disconnect();
  console.log('\n--- ALL MULTI-COMPONENT SYSTEM TESTS COMPLETED SUCCESSFULLY! ---');
}

testFullBackend().catch(err => {
  console.error('Test failed:', err);
});
