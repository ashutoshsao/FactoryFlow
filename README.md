## FactoryFlow - factory management system
Here is a comprehensive software specification sheet tailored specifically for your manufacturing plant use case. Since you are focusing on Phase 1 (Backend), this spec outlines the architecture, database design, and API endpoints needed to support the biometric hardware and the supervisor's frontend dashboard.

I've kept the tech stack identical to your example (TypeScript, Express, Prisma, PostgreSQL, Zod) since it's a robust choice for this kind of system and aligns perfectly with your toolset.

---

# Biometric Attendance & Incentive API – Phase 1 Specification

**Target Audience:** Manufacturing Plant Supervisors & Daily Workers
**Phase 1 Goal:** Build the backend infrastructure to process biometric hardware payloads, track attendance, and calculate worker incentives.

### Prerequisites

* TypeScript
* Express
* Zod (for request validation)
* Prisma (PostgreSQL database)
* JWT Authentication (for Supervisor dashboard access)
* Bun or Node.js runtime

### Project Overview

Build a RESTful API for a manufacturing plant where:

1. **Biometric Integration:** A biometric scanner sends a payload (a unique biometric hash/ID) to the API. If the hash is new, denied. If it exists, an attendance record is logged(no Duplicate).
2. **Supervisor Dashboard:** Supervisors can log in to view worker attendance records.
3. **Date Range Filtering:** Supervisors can query attendance over specific date ranges (defaulting to the current month).
4. **Incentive Calculation:** The system calculates incentives based on uninterrupted attendance (e.g., zero leaves in a specified period).

---

### Part 1: Database Design (Prisma)

Design the Prisma schema to handle workers, their daily scans, and the supervisors who manage them.

**Supervisor Model** (For dashboard access)

* `id` (String, UUID, Primary Key)
* `email` (String, unique)
* `password` (String, hashed)
* `name` (String)
* `createdAt` (DateTime)

**Worker Model**

* `id` (String, UUID, Primary Key)
* `biometricId` (String, unique) — *The unique string/hash sent by the physical scanner.*
* `name` (String, optional initially, updated later by supervisor)
* `isActive` (Boolean, default true)
* `createdAt` (DateTime)

**AttendanceRecord Model**

* `id` (String, UUID, Primary Key)
* `workerId` (String, Foreign Key → Worker)
* `checkInTime` (DateTime)
* `date` (DateTime, Date-only representation for easy querying)
* `status` (Enum: PRESENT, LEAVE, HALF_DAY)
* `createdAt` (DateTime)

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
* **Hardware Auth (Optional but recommended):** A simple API Key middleware to ensure only the actual biometric scanner can hit the `/attendance/scan` endpoint.

---

### Part 4: API Endpoints

#### Hardware Webhook Endpoint (The Core Logic)

* **POST /api/scan**
* *Payload:* `{ "biometricId": "xyz-123" }`
* *Logic:* Look up `biometricId`.
* If it doesn't exist: Create a new `Worker` and log an `AttendanceRecord`.
* If it exists: Check if an `AttendanceRecord` already exists for *today*. If not, create one.





#### Dashboard Auth Endpoints

* **POST /auth/login** – Supervisor login, returns JWT.

#### Worker Management Endpoints (Requires JWT)

* **GET /workers** – List all workers (supports pagination).
* **PATCH /workers/:id** – Update worker details (e.g., adding a human-readable name to a newly scanned biometric ID).

#### Attendance & Incentive Endpoints (Requires JWT)

* **GET /attendance** * Accepts `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
* If no dates are provided, default to the first and last day of the current month.


* **GET /workers/:id/attendance** – Get a specific worker's records for the calendar view.
* **GET /workers/:id/incentive**
* Accepts `?startDate&endDate`
* *Logic:* Count total `PRESENT` days vs `LEAVE` days in the range. Return a calculated incentive boolean or amount based on the plant's continuous-working rules.



---

### Part 5: Advanced Features (Choose Any 2 for Polish)

* **Option A: Incentive Calculation Engine**
Build a reusable utility function that takes an array of `AttendanceRecords` and a rule-set (e.g., "26 days continuous = ₹1000 bonus"), returning the exact calculated payout data to the frontend.
* **Option B: Automated Leave Marking (Cron Job)**
Since workers only scan when they arrive, you need a way to mark "LEAVE". Create a nightly script (using a tool like `node-cron`) that finds all active workers who do *not* have an `AttendanceRecord` for the day and creates a record with `status: LEAVE`.
* **Option C: Global Error Middleware**
Standardize the error responses so the Phase 2 frontend can easily display toast notifications (e.g., "Invalid Date Range").
* **Option D: Export to CSV**
An endpoint `GET /attendance/export` that generates a `.csv` file of the month's attendance, which is a highly requested feature in manufacturing administrative environments.

---

## Implementation (Phase 1 Complete)

The backend is implemented under `api/` with the following structure.

### Setup

1. **Environment**  
   Copy `api/.env.example` to `api/.env` and set:
   - `DATABASE_URL` — PostgreSQL connection string
   - `JWT_SECRET` — Secret for supervisor JWTs
   - `HARDWARE_API_KEY` — API key for the biometric scanner (send as `x-api-key` header on `POST /api/scan`)

2. **Database**  
   From the `api/` directory:
   ```bash
   bunx prisma migrate dev   # create/migrate DB
   bun run seed             # create default supervisor (optional)
   ```

3. **Run**  
   ```bash
   cd api && bun run dev
   ```
   Server listens on `PORT` (default 8080).

### Implemented

- **Part 1:** Prisma schema — `Supervisor`, `Worker`, `AttendanceRecord` (status: `PRESENT` | `LEAVE` | `HALF_DAY`).
- **Part 2:** Zod schemas — `supervisorAuthSchema`, `biometricScanSchema`, `updateWorkerSchema`, `attendanceQuerySchema`, `paginationSchema`.
- **Part 3:** JWT auth for dashboard (`requireAuth`), API key auth for hardware (`requireHardwareApiKey` on `/api/scan`).
- **Part 4:** All endpoints:
  - `POST /api/scan` — Biometric scan (create worker if new, log attendance for today; no duplicate).
  - `POST /auth/login` — Supervisor login, returns JWT.
  - `GET /workers` — List workers (pagination: `?page=&limit=`).
  - `PATCH /workers/:id` — Update worker (name, isActive).
  - `GET /attendance` — Attendance list (`?startDate=&endDate=&workerId=`; default current month).
  - `GET /workers/:id/attendance` — Worker attendance for calendar (`?startDate=&endDate=`).
  - `GET /workers/:id/incentive` — Incentive for date range (`?startDate=&endDate=`).
  - `GET /attendance/export` — CSV export for month/range.
- **Part 5 (all four options):**
  - **A** — Incentive engine in `api/src/lib/incentiveEngine.ts` (configurable rules, default 26 days = ₹1000).
  - **B** — Nightly cron at 23:59 marks `LEAVE` for active workers with no record for the day.
  - **C** — Global error middleware for consistent JSON error responses.
  - **D** — `GET /attendance/export` returns CSV.
