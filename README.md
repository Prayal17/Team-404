# Intelligent Academic Planner (IAP)
> **Intelligent Academic Planning & Resource Optimization System**  
> *24-Hour Hackathon Full Working Prototype*

---

## 🌟 Executive Summary

**Intelligent Academic Planner (IAP)** is a constraint-based academic scheduling and resource optimization platform designed to replace manual, error-prone spreadsheet scheduling. It automates timetable generation, performs real-time conflict detection with smart alternative suggestions, and coordinates examination room allocation.

### The Core Value Proposition
> *"We are not building another timetable database. We are building an intelligent scheduling engine that actively generates, validates, and optimizes academic schedules while eliminating resource conflicts."*

---

## 🏗️ Architecture

```text
React Frontend (Vite + TypeScript + Tailwind CSS + Lucide Icons)
       │
       │ REST API (JSON / JWT)
       ▼
Node.js + Express Backend (TypeScript)
       │
       ├── Authentication & Role Middleware (admin@iap.edu)
       ├── Academic Management (Modules, Lecturers, Cohorts, Rooms, TimeSlots)
       ├── Constraint-Based Timetable Engine (MRV Heuristic + Branch Pruning)
       ├── Live Conflict Detection & Smart Suggestion Engine
       ├── Multi-Venue Examination Allocation Engine
       └── Analytics & Resource Utilization Engine
       │
       ▼
Prisma ORM
       │
       ▼
Relational Database (SQLite embedded zero-config / PostgreSQL ready)
```

---

## 🧠 The Constraint-Based Scheduling Engine

The intelligence of IAP is powered by a **Constraint Satisfaction Problem (CSP)** heuristic algorithm:

### 1. Hard Constraints (Enforced Strictly)
1. **Lecturer Clash**: A lecturer cannot teach multiple classes at the same time slot.
2. **Cohort Timetable Overlap**: A cohort of students cannot attend overlapping lectures.
3. **Room Double-Booking**: A room/laboratory cannot host multiple sessions simultaneously.
4. **Room Capacity Bounds**: Room capacity must be greater than or equal to the cohort's enrolled student count.
5. **Room Availability**: Rooms under maintenance or inactive status are rejected.
6. **Room Type Compatibility**: Modules requiring specialized facilities (e.g., `COMPUTER_LAB`) must be assigned to matching rooms.
7. **Lecturer Availability Profile**: Sessions are only scheduled during slots where the lecturer is marked available.

### 2. Variable Ordering (Most Constrained Variable - MRV Heuristic)
Before assignment, session requirements are sorted by difficulty:
1. Modules with specialized room constraints (`COMPUTER_LAB` / `LECTURE_HALL`)
2. Modules with larger cohort student counts (competing for scarce high-capacity venues)
3. Modules taught by faculty with restricted availability profiles
4. Multi-session modules

### 3. Soft Constraints & Optimization Scoring
Valid candidates are scored based on:
- **Optimal Room Utilization (+25 pts)**: Penalizes wasted excess capacity.
- **Lecturer Schedule Compactness (+15 pts)**: Groups teaching sessions to reduce isolated gap hours.
- **Cohort Gap Minimization (+15 pts)**: Avoids disjointed student schedules.
- **Balanced Day Distribution (+15 pts)**: Spreads multi-session modules across different days.

---

## 🚀 Getting Started & Running Locally

### Prerequisites
- **Node.js**: v18+ (tested on Node v20/v22/v24)
- **npm**: v9+

### 1. Quick Start (Run Both Backend & Frontend)
From the project root:

```bash
# 1. Install dependencies for root, backend, and frontend
npm run install:all

# 2. Push database schema and seed demo data
npm run db:push
npm run db:seed

# 3. Start both backend (port 5000) and frontend (port 3000) concurrently
npm run dev
```

The web application will be accessible at:
👉 **`http://localhost:3000`**

Backend API & health check:
👉 **`http://localhost:5000/api/health`**

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Administrator** | `admin@iap.edu` | `admin123` |

---

## 🎬 3-Minute Hackathon Demo Script for Judges

1. **Dashboard Overview (`/`)**:
   - Show populated statistics: 7 Modules, 5 Lecturers, 4 Cohorts, 5 Rooms/Labs, and the "TIMETABLE VALID (0 Conflicts)" banner.
2. **Generate Timetable (`/timetable`)**:
   - Click the prominent **"GENERATE TIMETABLE"** button.
   - Observe solver metrics in the Engine Diagnostics modal: 14 requirements scheduled in ~30ms, 840 candidate evaluations, 650+ constraint violations rejected, and a 100% Quality Score.
3. **Inspect Session Logic ("Why this assignment?")**:
   - Click any timetable card (e.g., *CS501 Web Development*).
   - View the detailed reasoning: verified room capacity, matched Computer Lab room type, verified faculty availability.
4. **The "WOW" Moment — Live Conflict Detection & Smart Suggestions**:
   - In the modal, manually change the room or time slot to create an intentional clash with another class.
   - Click **"Apply & Validate"**.
   - Watch the system immediately flag the conflict in red (**"Room Double-Booking / Lecturer Clash"**) and display **Smart Alternative Suggestions** (e.g., *"Move to Room 102 (Capacity 50)"*).
5. **Multi-Venue Examination Planning (`/examinations`)**:
   - View the examination list (e.g., Database Systems with 85 students).
   - Click **"GENERATE EXAM SCHEDULE"**.
   - Watch the system allocate venues based on capacity requirements.

---

## 🧪 Automated Test Suite

To run the standalone test suite verifying all 6 constraint categories:

```bash
npm run test:backend
```

Tests executed:
- `✓ Test 1: Lecturer Clash Detection`
- `✓ Test 2: Cohort Clash Detection`
- `✓ Test 3: Room Double Booking Detection`
- `✓ Test 4: Room Capacity Violation Detection`
- `✓ Test 5: Valid Timetable Verification (0 Conflicts)`
- `✓ Test 6: Smart Suggestions for Conflict Resolution`

---

## 📂 Project Structure

```text
intelligent-academic-planner/
├── package.json               # Root scripts (install:all, dev, build)
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Relational Prisma models
│   │   └── seed.ts            # Realistic academic demo data
│   ├── src/
│   │   ├── config/            # Environment & Prisma client
│   │   ├── controllers/       # Academic, Timetable, Exam, Analytics controllers
│   │   ├── middleware/        # JWT auth & error handling
│   │   ├── routes/            # REST API route tree
│   │   ├── scheduling/
│   │   │   ├── timetableEngine.ts   # Constraint-satisfaction solver (MRV)
│   │   │   ├── conflictDetector.ts  # Independent validation & smart suggestions
│   │   │   ├── scoring.ts           # Soft constraint optimization heuristics
│   │   │   └── examEngine.ts        # Multi-room exam capacity allocation
│   │   ├── app.ts             # Express application
│   │   └── server.ts          # Server entry point
│   ├── tests/                 # Automated scheduling test suite
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/        # Sidebar, Navbar, StatCard, Modals, Banner
    │   ├── pages/             # Dashboard, Timetable, Conflicts, Exams, CRUD pages
    │   ├── services/          # Axios API client
    │   ├── context/           # AuthContext
    │   ├── types/             # TypeScript interfaces
    │   ├── App.tsx            # Route configuration
    │   └── main.tsx           # React entry point
    ├── vite.config.ts
    ├── tailwind.config.js
    └── package.json
```
