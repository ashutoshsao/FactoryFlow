import { prisma } from "../src/lib/prisma";
import bcrypt from "bcrypt";

const DEFAULT_SUPERVISOR = {
  email: process.env.SEED_SUPERVISOR_EMAIL ?? "supervisor@factory.local",
  password: process.env.SEED_SUPERVISOR_PASSWORD ?? "changeme",
  name: process.env.SEED_SUPERVISOR_NAME ?? "Default Supervisor",
};

const WORKERS = [
  { biometricId: "f101", name: "Worker One" },
  { biometricId: "f102", name: "Worker Two" },
  { biometricId: "f103", name: "Worker Three" },
  { biometricId: "f104", name: "Worker Four" },
  { biometricId: "f105", name: "Worker Five" },
] as const;

const DEVICE_ID = "gate-1";
const ATTENDANCE_DAYS = 20;
const DAYS_BACK = 90;

type Status = "PRESENT" | "ABSENT" | "HALF_DAY";

function randomStatus(): Status {
  const r = Math.random();
  if (r < 0.5) return "PRESENT";
  if (r < 0.8) return "ABSENT";
  return "HALF_DAY";
}

function randomDates(count: number): Date[] {
  const set = new Set<number>();
  while (set.size < count) {
    // 1..DAYS_BACK so only past dates (yesterday and earlier), never today
    const dayOffset = 1 + Math.floor(Math.random() * DAYS_BACK);
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    d.setHours(0, 0, 0, 0);
    set.add(d.getTime());
  }
  return Array.from(set).map((t) => new Date(t));
}

async function main() {
  // Supervisor
  let supervisor = await prisma.supervisor.findUnique({
    where: { email: DEFAULT_SUPERVISOR.email },
  });
  if (!supervisor) {
    const passwordHash = await bcrypt.hash(DEFAULT_SUPERVISOR.password, 10);
    supervisor = await prisma.supervisor.create({
      data: {
        email: DEFAULT_SUPERVISOR.email,
        passwordHash,
        name: DEFAULT_SUPERVISOR.name,
      },
    });
    console.log("Created supervisor:", DEFAULT_SUPERVISOR.email);
  } else {
    console.log("Supervisor already exists:", supervisor.email);
  }

  // Device
  let device = await prisma.device.findUnique({ where: { deviceId: DEVICE_ID } });
  if (!device) {
    device = await prisma.device.create({
      data: { deviceId: DEVICE_ID, name: "Gate 1" },
    });
    console.log("Created default device:", DEVICE_ID);
  }

  // Workers (upsert by biometricId so re-run is safe)
  const workers: { id: string; biometricId: string; name: string }[] = [];
  for (const w of WORKERS) {
    const worker = await prisma.worker.upsert({
      where: { biometricId: w.biometricId },
      create: { biometricId: w.biometricId, name: w.name },
      update: { name: w.name },
    });
    workers.push(worker);
  }
  console.log("Upserted", workers.length, "workers");

  // Attendance: 20 random days per worker with random status
  for (const worker of workers) {
    const dates = randomDates(ATTENDANCE_DAYS);
    const records = dates.map((date) => {
      const status = randomStatus();
      const start = new Date(date);
      start.setHours(8, 0, 0, 0);
      const end = new Date(date);
      end.setHours(17, 0, 0, 0);
      return {
        workerId: worker.id,
        date,
        status,
        deviceId: status === "ABSENT" ? null : DEVICE_ID,
        checkInTime: status === "ABSENT" ? null : start,
        checkOutTime: status === "ABSENT" || status === "HALF_DAY" ? null : end,
      };
    });
    await prisma.attendanceRecord.createMany({
      data: records,
      skipDuplicates: true,
    });
  }
  console.log("Created up to", ATTENDANCE_DAYS, "attendance records per worker (skipDuplicates on re-run)");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
