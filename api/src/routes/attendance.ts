import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/jwtAuth";
import { asyncHandler } from "../middleware/asyncHandler";
import statusCodes from "../statusCodes";

const router = Router();

router.use(requireAuth);

function getDefaultMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/** GET /attendance — List attendance; optional ?startDate=&endDate=&workerId=; default current month */
router.get("/", asyncHandler(async (req: Request, res: Response) => {
  let start: Date;
  let end: Date;
  const startParam = req.query.startDate;
  const endParam = req.query.endDate;
  const workerId = typeof req.query.workerId === "string" ? req.query.workerId : undefined;

  if (startParam && endParam && typeof startParam === "string" && typeof endParam === "string") {
    start = new Date(startParam);
    end = new Date(endParam);
  } else {
    const def = getDefaultMonthRange();
    start = def.start;
    end = def.end;
  }

  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: { gte: start, lte: end },
      ...(workerId && { workerId }),
    },
    include: {
      worker: {
        select: { id: true, biometricId: true, name: true },
      },
    },
    orderBy: [{ date: "asc" }, { checkInTime: "asc" }],
  });

  return res.status(statusCodes.OK).json({
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    records,
  });
}));

export default router;
