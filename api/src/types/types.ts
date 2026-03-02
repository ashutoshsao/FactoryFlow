import { z } from "zod";

/** Supervisor login: email + password */
export const supervisorAuthSchema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(1, "Password required").max(20, "Password must be less than 20 characters"),
});

/** Biometric scanner payload: biometricId required; timestamp and deviceId optional. deviceId = entry point/device that registered the scan. */
export const biometricScanSchema = z.object({
  biometricId: z.string().min(1, "biometricId required"),
  timestamp: z.iso
    .datetime({ offset: true, error: "Use ISO 8601 with timezone (e.g. 2026-03-02T10:15:00+01:00 or 2026-03-02T09:15:00Z)" })
    .optional(),
  deviceId: z.string().min(1).optional(),
});

/** Create worker (POST): name + biometricId required */
export const createWorkerSchema = z.object({
  name: z.string().min(1, "Name required"),
  biometricId: z.string().min(1, "biometricId required"),
});

/** Partial update for worker (PATCH) */
export const updateWorkerSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

/** Query params for attendance list: all optional, default to current month. Dates are ISO 8601 calendar dates (YYYY-MM-DD). */
export const attendanceQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use ISO 8601 date YYYY-MM-DD").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use ISO 8601 date YYYY-MM-DD").optional(),
  workerId: z.uuid().optional(),
});

/** Pagination for GET /workers */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SupervisorAuth = z.infer<typeof supervisorAuthSchema>;
export type BiometricScan = z.infer<typeof biometricScanSchema>;
export type CreateWorker = z.infer<typeof createWorkerSchema>;
export type UpdateWorker = z.infer<typeof updateWorkerSchema>;
export type AttendanceQuery = z.infer<typeof attendanceQuerySchema>;
export type Pagination = z.infer<typeof paginationSchema>;