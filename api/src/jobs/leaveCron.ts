import cron from "node-cron";
import { prisma } from "../lib/prisma";

/** Runs daily at 00:05 AM to check for the day that just ended. */
export function startLeaveCron(): void {
  cron.schedule("5 0 * * *", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // 1. Find workers who ARE active but DO NOT have a record for yesterday
    const workersMissingAttendance = await prisma.worker.findMany({
      where: {
        isActive: true,
        attendance: {
          none: { date: yesterday },
        },
      },
      select: { id: true },
    });

    if (workersMissingAttendance.length === 0) return;

    // 2. Bulk insert all absent records in ONE database call
    await prisma.attendanceRecord.createMany({
      data: workersMissingAttendance.map((worker) => ({
        workerId: worker.id,
        date: yesterday,
        status: "ABSENT",
      })),
      skipDuplicates: true,
    });

    console.log(`Marked ${workersMissingAttendance.length} workers as ABSENT for ${yesterday.toDateString()}`);
  });
}
