Intelligent Academic Planner (IAP)

Team 404 — Intelligent Academic Planning (Automating Academic Scheduling & Resource Allocation)

What this actually is

Islington's RTE department currently builds timetables and exam seating by hand in spreadsheets. That's slow and it's easy to accidentally double-book a room or a lecturer. IAP is our attempt at fixing that: you give it your modules, lecturers, cohorts and rooms, hit "Generate Timetable", and it produces a clash-free schedule on its own using a constraint solver — not just a form where an admin drags classes around and hopes for the best.

It also handles exam room allocation (including splitting a big cohort across multiple rooms when one room isn't big enough), flags conflicts if someone edits the timetable by hand afterwards, and gives you a dashboard for room utilisation and lecturer workload.

Architecture
text
React frontend (Vite + TypeScript + Tailwind)
       │  REST API, JWT auth
       ▼
Express backend (TypeScript)
       ├── auth + role middleware
       ├── CRUD for modules, lecturers, cohorts, rooms, time slots
       ├── timetable engine (constraint solver)
       ├── conflict detector + suggestion engine
       ├── exam room allocation engine
       └── analytics
       │
       ▼
Prisma ORM → SQLite (works out of the box, Postgres-ready)
How the scheduling actually works

This is the part we spent most of our time on, so it's worth explaining properly instead of just saying "AI-powered."

Hard constraints — a slot is rejected outright if it breaks any of these:

Lecturer already has a class at that time
Cohort already has a class at that time
Room is already booked for that time
Room capacity is smaller than the cohort size
Room is marked unavailable / under maintenance
Module needs a specific room type (e.g. a lab) and this room doesn't match
Lecturer isn't marked available for that day

Ordering — we don't just schedule modules in whatever order they come from the database. Harder-to-place sessions go first: modules that need a specific room type, modules with big cohorts, modules taught by lecturers with limited availability. This is the standard "most constrained variable" idea from constraint satisfaction — placing the tricky ones first avoids painting yourself into a corner.

Soft scoring — once a slot passes all the hard checks, it's not just accepted; it's scored against the other valid options. We reward slots that don't waste room capacity, that keep a lecturer's day compact instead of leaving gaps, that don't leave holes in a cohort's timetable, and that spread a module's multiple sessions across different days rather than stacking them.

Every scheduled session also gets stored with a plain-English reason for why it landed where it did, and every generation run logs how many candidates it checked, how many got rejected and why, how long it took, and a quality score. That log is what powers the diagnostics you see after generating.

Conflict detection is a separate pass from the generator — it re-reads whatever is currently in the database and checks it again. So if someone manually drags a class into a bad slot, the system catches it the same way it would if the generator itself had done it wrong.

Running it locally

You need Node 18+ and npm 9+.

bash
npm run install:all      # installs root, backend and frontend deps
npm run db:push          # creates the SQLite schema
npm run db:seed          # loads demo data (modules, lecturers, rooms, etc.)
npm run dev               # runs backend on :5000 and frontend on :3000 together

Frontend: http://localhost:3000 Backend health check: http://localhost:5000/api/health

Login
Role	Email	Password
Administrator	admin@iap.edu	admin123

We only implemented the admin role for this build — see the limitations section in the submission doc for what a lecturer/student view would look like.

Walking through the demo

This is roughly what we'll show if we get called up:

Open the dashboard. It's already seeded with 7 modules, 5 lecturers, 4 cohorts and 5 rooms/labs, and it should say the timetable is valid with zero conflicts.
Go to Timetable and hit Generate. Takes under a second. Open the diagnostics panel afterward — it'll show how many requirements it scheduled, how many room/slot combinations it actually checked, how many got rejected for breaking a constraint, and the overall quality score. This is the bit that shows it's actually solving something, not just filling in a template.
Click on any class card — CS501 Web Development is a good one because it needs a computer lab — and open the "why this assignment" view. It'll show you the room capacity check, the room-type match, and the lecturer availability check that led to that placement.
Break something on purpose. Open a session, change its room or time slot to clash with another class, and save. The system should immediately flag it as a room or lecturer conflict and offer a couple of alternative rooms/slots that would actually work. This is the part that usually gets a reaction from judges, since most scheduling tools just say "error" and leave you to figure it out yourself.
Jump to Examinations. Pick an exam with a large cohort (Database Systems, 85 students, is a good example — it won't fit in most single rooms) and click Generate. It should split the students across two or more rooms automatically.
Tests
bash
npm run test:backend

This runs three suites we wrote to sanity-check the scheduling logic itself rather than just the API:

scheduling.test.ts — unit-level checks on time math and conflict logic (interval overlaps, duration conversion, clash detection for lecturers/rooms/cohorts)
e2e.test.ts — spins up the actual server and hits the real API end to end (login, fetch data, generate a timetable)
demo_verification.test.ts — checks that the specific scenarios we use in the live demo actually behave the way we say they do
Project layout
text
Team-404/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # data model
│   │   └── seed.ts             # demo data
│   ├── src/
│   │   ├── config/             # env + prisma client
│   │   ├── controllers/        # academic / timetable / exam / analytics / auth
│   │   ├── middleware/         # JWT auth, error handling
│   │   ├── routes/             # API routes
│   │   ├── scheduling/
│   │   │   ├── timetableEngine.ts   # the CSP solver
│   │   │   ├── conflictDetector.ts  # validation + suggestions
│   │   │   ├── scoring.ts           # soft-constraint scoring
│   │   │   └── examEngine.ts        # exam room allocation
│   │   ├── app.ts
│   │   └── server.ts
│   └── tests/
└── frontend/
    └── src/
        ├── components/          # Sidebar, Navbar, modals, etc.
        ├── pages/                # Dashboard, Timetable, Conflicts, Exams, CRUD pages
        ├── services/             # API client
        ├── context/              # auth context
        └── App.tsx
What's not in here

We didn't build separate lecturer or student logins, invigilator assignment, or any live college-system integration — that's all covered honestly in the submission documentation rather than pretended away. This was built in one 24-hour sprint, so we focused on making the scheduling engine actually work well rather than spreading thin across every feature in the brief.
