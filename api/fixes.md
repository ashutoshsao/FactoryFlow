1. [x] attence should not ahve default uuid as it should alwasy depend on a workers id so that no dangling uuid attance is created if worker id is not given in case

2. [x] biometric id is string that references fingerprint templet that is stored and is sued for authentication by biometric controlled (eg biomaericID = "f102");

3. [x] simplify prisma.ts — With Prisma 7, direct Postgres requires an `adapter` (or use Accelerate with `accelerateUrl`). The current adapter-based singleton is the minimal setup; a “no adapter” version would only work with Prisma Accelerate.

4. [x] deviceId — Now stored on AttendanceRecord (optional). Scanner can send via body `deviceId` or header `x-device-id`; hardware auth sets `req.deviceId` from header. Used in scan route when creating PRESENT records; ABSENT (cron) stays null. CSV export includes Device Id column.

5. [x] in prisma.ts — Added `src/types/global.d.ts` with `declare global { var prisma: PrismaClient | undefined }`. prisma.ts now uses `globalThis.prisma ?? new PrismaClient({ adapter, log })` (adapter still required for Prisma 7 direct Postgres).

6. [x] JwtPayload — Uses `id` (supervisor id). Set at login; requireAuth sets `req.userId = decoded.id` on protected routes.

7. [x] errorHandler.ts — Global Express error middleware (registered last in index). When a route calls next(err), this runs: responds with JSON { message, code? } and status err.statusCode or 500. AppError lets routes set statusCode/code for consistent API errors (e.g. frontend toasts).

8. [x] remove incentive code — Removed GET /workers/:id/incentive route and deleted src/lib/incentiveEngine.ts.

9. [x] Replaced API key with device allowlist: scan requires x-device-id header; device must exist in Device table. Removed HARDWARE_API_KEY. Added Device model; seed creates default device "gate-1". Middleware: requireAllowedDevice.

10. [x] Compound unique is in schema: AttendanceRecord has `@@unique([workerId, date])`; Prisma exposes it as `workerId_date` for findUnique in scan and leaveCron.

11. [x] Two-scan logic: first scan before 11:00 → create HALF_DAY + checkInTime; second scan after 16:00 → update to PRESENT + checkOutTime. Reject first after 11:00, second before 16:00.

12. [x] Response messages: "Attendance logged for half day" (first scan), "Attendance logged for full day (present)" (second), "Attendance already recorded for today (present)" (already PRESENT).

13. [x] Removed GET /attendance/export route.