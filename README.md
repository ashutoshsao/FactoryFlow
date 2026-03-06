## FactoryFlow - factory management system

FactoryFlow is a small full‑stack system for managing **biometric worker attendance** in a manufacturing plant.

- Backend API in `api/`: TypeScript, Express, Prisma, PostgreSQL, Zod, Bun
- Supervisor dashboard in `frontend/`: React, React Router, Vite

This document started as a backend‑only Phase 1 spec and has been updated to match the current implementation.

I've kept the tech stack identical to your example (TypeScript, Express, Prisma, PostgreSQL, Zod) since it's a robust choice for this kind of system and aligns perfectly with your toolset.

---

# Biometric Attendance API – Phase 1 Specification

**Target Audience:** Manufacturing Plant Supervisors & Daily Workers
**Phase 1 Goal:** Build the backend infrastructure to process biometric hardware payloads and track worker attendance.

### Prerequisites

* TypeScript
* Express
* Zod (for request validation)
* Prisma (PostgreSQL database)
* JWT Authentication (for Supervisor dashboard access)
* Bun or Node.js runtime

### Project Overview

Build a RESTful API for a manufacturing plant where:

1. **Biometric Integration:** A biometric scanner sends a payload (a unique biometric hash/ID) to the API. If the worker is not registered, the request is denied. If the worker exists, an attendance record is logged (no duplicate per day).
2. **Supervisor Dashboard:** Supervisors can log in to view worker attendance records.
3. **Date Range Filtering:** Supervisors can query attendance over specific date ranges (defaulting to the current month).

---

### Part 1: Database Design (Prisma)

The Prisma schema in `api/prisma/schema.prisma` models supervisors, allowed devices, workers, and daily attendance.

**Supervisor Model** (For dashboard access)

* `id` (String, UUID, Primary Key)
* `email` (String, unique)
* `passwordHash` (String, hashed)
* `name` (String)
* `createdAt` (DateTime)

**Device Model** (Allowed biometric scanners)

* `id` (String, UUID, Primary Key)
* `deviceId` (String, unique) — sent as `x-device-id` header from the scanner
* `name` (String, optional)
* `createdAt` (DateTime)

**Worker Model**

* `id` (String, UUID, Primary Key)
* `biometricId` (String, unique) — *The unique string/hash sent by the physical scanner.*
* `name` (String, required)
* `isActive` (Boolean, default `true`)
* `createdAt` (DateTime)

**AttendanceStatus Enum**

* `PRESENT`
* `ABSENT`
* `HALF_DAY`

**AttendanceRecord Model**

* `id` (String, UUID, Primary Key)
* `workerId` (String, Foreign Key → Worker)
* `worker` (Relation)
* `deviceId` (String, optional)
* `checkInTime` (DateTime, optional)
* `checkOutTime` (DateTime, optional)
* `date` (DateTime, one record per worker per calendar day)
* `status` (AttendanceStatus, default `ABSENT`)
* `createdAt` (DateTime)
* Unique constraint on `(workerId, date)` to enforce at most one record per worker per day.

**Relationships (Strict)**

* `Worker` has many `AttendanceRecords` (1:Many)

---

### Part 2: Validation (Zod)

Create Zod schemas to ensure clean data enters your system, especially from the biometric hardware.

**Required Schemas**

* **SupervisorAuthSchema:** `email`, `password`
* **BiometricScanSchema:** `biometricId` (String, required), `timestamp` (ISO 8601 string, optional; e.g. `2026-03-02T14:30:00.000Z`; if omitted, server time is used)
* **UpdateWorkerSchema:** `name`, `isActive`
* **Date/time convention:** ISO 8601 at the boundary — client sends ISO strings; API validates; backend converts to `Date`; DB stores timestamp; responses serialize dates as ISO strings.
* **AttendanceQuerySchema:** `startDate` (ISO Date string, optional), `endDate` (ISO Date string, optional), `workerId` (optional)

---

### Part 3: Authentication & Middleware (JWT)

**Requirements**

* **Dashboard Auth:** Supervisors need a JWT to access analytics and worker details.
* **Hardware Auth:** The biometric scanner must send an `x-device-id` header that matches a registered `Device` row. The middleware (`requireAllowedDevice`) enforces this and attaches `req.deviceId` for auditing.

---

### Part 4: API Endpoints

#### Hardware Webhook Endpoint (The Core Logic)

* **POST /api/scan**
* **Headers:**
  * `x-device-id`: must match a `Device.deviceId` in the database
* **Payload:** (validated with Zod)
  * `{ "biometricId": "xyz-123", "timestamp"?: "2026-03-02T14:30:00.000Z", "deviceId"?: "gate-1" }`
* **Logic (current implementation):**
  * Look up `biometricId`.
  * If the worker does **not** exist:
    * Reject with an error explaining the worker must be registered (name + biometric ID) in the dashboard first.
  * If the worker is inactive:
    * Reject with `Worker is inactive`.
  * Normalize `date` to midnight for that day; compute local time in minutes.
  * Enforce a two‑scan rule per day:
    * First scan must be **before 11:00** local time.
    * Second scan must be **after 16:00** local time.
  * If there is **no record** yet for that worker + date:
    * A valid first scan before 11:00 creates a record with:
      * `status = HALF_DAY`
      * `checkInTime = scanTime`
      * `deviceId` set from the header/body.
  * If there **is already a record** for that worker + date:
    * If `status === PRESENT` → return a 200 with “Attendance already recorded for today (present)”.
    * If `status === HALF_DAY`:
      * Require the second scan to be after 16:00; otherwise reject.
      * A valid second scan updates the record to:
        * `status = PRESENT`
        * `checkOutTime = scanTime`.

#### Dashboard Auth Endpoints

* **POST /auth/login** – Supervisor login, returns JWT.

#### Worker Management Endpoints (Requires JWT)

* **GET /workers** – List all workers (supports pagination).
* **PATCH /workers/:id** – Update worker details (e.g., adding a human-readable name to a newly scanned biometric ID).

#### Attendance Endpoints (Requires JWT)

* **GET /attendance**
  * Accepts `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&workerId=...`
  * If no dates are provided, defaults to the first and last day of the current month.
  * Returns records including worker information for the dashboard.

* **GET /workers/:id/attendance**
  * Get a specific worker's records for the calendar view (optionally with date range).

* **GET /workers/:id/incentive**
  * Accepts `?startDate&endDate`
  * Logic: count total `PRESENT` days vs `ABSENT` days in the range and compute incentive using a rule such as “26 continuous working days = bonus”.

---

### Part 5: Advanced Features (Implemented)

* **Option B: Automated Absence Marking (Cron Job)**
Since workers only scan when they arrive, you need a way to mark "ABSENT". A nightly script (using `node-cron`) finds all active workers who do *not* have an `AttendanceRecord` for the day and creates a record with `status: ABSENT`.
* **Option C: Global Error Middleware**
Standardize the error responses so the frontend can easily display toast notifications (e.g., "Invalid Date Range").

---

## Implementation (Phase 1 Complete)

The backend is implemented under `api/` with the following structure.

### Backend Setup

1. **Environment**  
   Copy `api/.env.example` to `api/.env` and set:
   - `DATABASE_URL` — PostgreSQL connection string
   - `JWT_SECRET` — Secret for supervisor JWTs

2. **Database**  
   From the `api/` directory:
   ```bash
   bunx prisma migrate dev   # create/migrate DB
   bun run seed              # create default supervisor (optional)
   ```

3. **Run API**  
   ```bash
   cd api && bun run dev
   ```
   Server listens on `PORT` (default 8080).

### Backend Features Implemented

- **Part 1:** Prisma schema — `Supervisor`, `Device`, `Worker`, `AttendanceRecord` (status: `PRESENT` | `ABSENT` | `HALF_DAY`).
- **Part 2:** Zod schemas — `supervisorAuthSchema`, `biometricScanSchema`, `createWorkerSchema`, `updateWorkerSchema`, `attendanceQuerySchema`, `paginationSchema`.
- **Part 3:** JWT auth for dashboard (`requireAuth`), device‑based auth for hardware (`requireAllowedDevice` on `/api/scan` using `x-device-id`).
- **Part 4:** All endpoints:
  - `POST /api/scan` — Biometric scan with two‑scan rule (first before 11:00 as `HALF_DAY`, second after 16:00 upgrades to `PRESENT`; rejects unknown or inactive workers).
  - `POST /auth/login` — Supervisor login, returns JWT.
  - `GET /workers` — List workers (pagination: `?page=&limit=`).
  - `POST /workers` — Create worker (name, biometricId).
  - `PATCH /workers/:id` — Update worker (name, isActive).
  - `GET /attendance` — Attendance list (`?startDate=&endDate=&workerId=`; default current month).
  - `GET /workers/:id/attendance` — Worker attendance for calendar (`?startDate=&endDate=`).
- **Part 5:**
  - **B** — Nightly cron at 23:59 marks `ABSENT` for active workers with no record for the day.
  - **C** — Global error middleware for consistent JSON error responses.

---

## Frontend (Supervisor Dashboard)

The frontend lives in `frontend/` and provides a simple dashboard for supervisors to sign in and inspect attendance.

### Frontend Setup

1. **Environment**
   ```bash
   cd frontend
   cp .env.example .env
   # Ensure VITE_API_URL matches your running backend, e.g.:
   # VITE_API_URL=http://localhost:8080
   ```

2. **Run Development Server**
   ```bash
   bun install        # or npm install / pnpm install
   bun run dev        # or npm run dev / pnpm dev
   ```

   The app runs on `http://localhost:5173` by default and talks to the API at `VITE_API_URL`.

### Frontend Features

- **Authentication**
  - `/login` page with email + password form that calls `POST /auth/login`.
  - On success, stores JWT and supervisor info in `localStorage` and redirects to `/`.
  - React context (`AuthContext`) exposes `isAuthenticated`, `login`, and `logout`.
  - Protected routes: the dashboard is only accessible when authenticated; unauthenticated users are redirected to `/login`.

- **Dashboard**
  - Header with app name (“Factory Flow”) and logged‑in supervisor name, plus “Log out” button.
  - Filters for attendance:
    - Start date and end date inputs (default to current month).
    - Optional worker ID filter.
  - Fetches data from `GET /attendance` via the `getAttendance` client helper.
  - Table view of records showing worker name / biometric ID, date, check‑in / check‑out times, and status.
  - If the API returns 401 (e.g., expired token), the client clears auth state and forces a new login.

