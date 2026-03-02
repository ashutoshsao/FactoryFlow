import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { biometricScanSchema } from "../types/types";
import { requireAllowedDevice } from "../middleware/hardwareAuth";
import { asyncHandler } from "../middleware/asyncHandler";
import statusCodes from "../statusCodes";

const router = Router();

/** First scan must be before this time (local); second scan must be after this time (local). */
const FIRST_SCAN_BEFORE_HOUR = 11; // before 11:00
const SECOND_SCAN_AFTER_HOUR = 16; // after 16:00 (4pm)

function getTimeInMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** POST /api/scan — Biometric scanner webhook. Requires x-device-id header matching an allowed device in DB. */
router.post("/", requireAllowedDevice, asyncHandler(async (req: Request, res: Response) => {
  const parsed = biometricScanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(statusCodes.BAD_REQUEST).json({
      message: "Invalid payload",
      errors: parsed.error.flatten(),
    });
  }

  const { biometricId, timestamp, deviceId: bodyDeviceId } = parsed.data;
  const deviceId = req.deviceId ?? bodyDeviceId ?? null;
  const scanTime = timestamp ? new Date(timestamp) : new Date();
  const date = new Date(scanTime);
  date.setHours(0, 0, 0, 0);
  const timeMinutes = getTimeInMinutes(scanTime);

  const worker = await prisma.worker.findUnique({ where: { biometricId } });

  if (worker && !worker.isActive) {
    return res.status(statusCodes.BAD_REQUEST).json({
      message: "Worker is inactive",
    });
  }

  if (!worker) {
    return res.status(statusCodes.BAD_REQUEST).json({
      message: "Worker not registered. Add this worker with name and biometric ID in the dashboard first.",
      biometricId,
    });
  }

  const existing = await prisma.attendanceRecord.findUnique({
    where: { workerId_date: { workerId: worker.id, date } },
  });

  const dateStr = date.toISOString().slice(0, 10);

  if (existing) {
    if (existing.status === "PRESENT") {
      return res.status(statusCodes.OK).json({
        message: "Attendance already recorded for today (present)",
        workerId: worker.id,
        date: dateStr,
      });
    }
    // existing.status === "HALF_DAY" → second scan
    if (timeMinutes < SECOND_SCAN_AFTER_HOUR * 60) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Second scan must be after ${SECOND_SCAN_AFTER_HOUR}:00`,
        workerId: worker.id,
        date: dateStr,
      });
    }
    await prisma.attendanceRecord.update({
      where: { workerId_date: { workerId: worker.id, date } },
      data: { checkOutTime: scanTime, status: "PRESENT" },
    });
    return res.status(statusCodes.OK).json({
      message: "Attendance logged for full day (present)",
      workerId: worker.id,
      date: dateStr,
    });
  }

  // First scan of the day
  if (timeMinutes >= FIRST_SCAN_BEFORE_HOUR * 60) {
    return res.status(statusCodes.BAD_REQUEST).json({
      message: `First scan must be before ${FIRST_SCAN_BEFORE_HOUR}:00`,
      workerId: worker.id,
      date: dateStr,
    });
  }
  await prisma.attendanceRecord.create({
    data: {
      workerId: worker.id,
      deviceId,
      date,
      checkInTime: scanTime,
      status: "HALF_DAY",
    },
  });
  return res.status(statusCodes.CREATED).json({
    message: "Attendance logged for half day",
    workerId: worker.id,
    date: dateStr,
  });
}));

export default router;
