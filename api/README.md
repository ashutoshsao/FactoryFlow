# Biometric Worker Attendance — API

Express API for worker attendance via biometric scans. Supervisors log in with JWT; scanners identify by device allowlist.

## Setup

```bash
bun install
```

Set `DATABASE_URL` (Postgres). For Prisma 7 with direct Postgres you need an adapter (see `src/lib/prisma.ts`). Generate the client and run migrations as needed:

```bash
bun run prisma:generate
```

Seed the DB (creates default device `gate-1` and optional supervisor):

```bash
bun run seed
```

## Run

```bash
bun run dev
```

Runs `src/index.ts`; server listens on `PORT` (default 8080).

---

## Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | — | Supervisor login; returns JWT (payload uses supervisor `id`). |
| POST | `/api/scan` | Device | Biometric scan: requires `x-device-id` header (device must exist in `Device` table). Body: `biometricId`, optional `deviceId`. |
| GET | `/workers` | JWT | List workers (paginated). |
| POST | `/workers` | JWT | Create worker (`name`, `biometricId`). |
| PATCH | `/workers/:id` | JWT | Update worker. |
| GET | `/workers/:id/attendance` | JWT | Worker attendance for calendar; optional `?startDate=&endDate=`. |
| GET | `/attendance` | JWT | List attendance; optional `?startDate=&endDate=&workerId=`; default current month. |

- **JWT:** `Authorization: Bearer <token>`; `requireAuth` sets `req.userId = decoded.id`.
- **Device:** Scanner must send `x-device-id` matching a row in `Device`; middleware sets `req.deviceId`. No API key; device allowlist only.

---

## Behaviour (from fixes)

- **AttendanceRecord**  
  - No default UUID for `id`; record is always tied to a worker (no dangling records).  
  - One record per worker per day: `@@unique([workerId, date])`; Prisma exposes `workerId_date` for `findUnique` in scan and leaveCron.  
  - `deviceId` optional on record: set from scanner (body `deviceId` or header `x-device-id`); null for cron-created ABSENT. CSV export can include Device Id.

- **Worker**  
  - `biometricId` is a string (e.g. fingerprint template id like `"f102"`), used for scan authentication.

- **Two-scan logic**  
  - First scan before 11:00 → create HALF_DAY + `checkInTime`.  
  - Second scan after 16:00 → update to PRESENT + `checkOutTime`.  
  - Reject first after 11:00, second before 16:00.  
  - Messages: "Attendance logged for half day" / "Attendance logged for full day (present)" / "Attendance already recorded for today (present)".

- **Errors**  
  - Global error handler (registered last): JSON `{ message, code? }`, status from `err.statusCode` or 500. Routes can use `AppError` for consistent API errors.

- **Removed**  
  - GET `/workers/:id/incentive` and incentive engine.  
  - GET `/attendance/export`.  
  - `HARDWARE_API_KEY`; replaced by device allowlist.

---

## Tech

- **Runtime:** Bun  
- **DB:** PostgreSQL + Prisma 7 (adapter required for direct Postgres; or use Accelerate).  
- **Auth:** JWT for supervisors; device allowlist for scan endpoint.
