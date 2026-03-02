import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { createWorkerSchema, updateWorkerSchema, paginationSchema } from "../types/types";
import { requireAuth } from "../middleware/jwtAuth";
import { asyncHandler } from "../middleware/asyncHandler";
import statusCodes from "../statusCodes";

const router = Router();

router.use(requireAuth);

/** GET /workers — List all workers with pagination */
router.get("/", asyncHandler(async (req: Request, res: Response) => {
  const parsed = paginationSchema.safeParse({
    page: req.query.page,
    limit: req.query.limit,
  });
  const { page, limit } = parsed.success ? parsed.data : { page: 1, limit: 20 };
  const skip = (page - 1) * limit;

  const [workers, total] = await Promise.all([
    prisma.worker.findMany({
      where: { isActive: true },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        biometricId: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.worker.count({ where: { isActive: true } }),
  ]);

  return res.status(statusCodes.OK).json({
    workers,
    pagination: { page, limit, total },
  });
}));

/** POST /workers — Create worker (name + biometricId). Required before they can scan. */
router.post("/", asyncHandler(async (req: Request, res: Response) => {
  const parsed = createWorkerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(statusCodes.BAD_REQUEST).json({
      message: "Invalid body",
      errors: parsed.error.flatten(),
    });
  }
  const { name, biometricId } = parsed.data;
  const existing = await prisma.worker.findUnique({ where: { biometricId } });
  if (existing) {
    return res.status(statusCodes.BAD_REQUEST).json({
      message: "Worker with this biometric ID already exists",
    });
  }
  const worker = await prisma.worker.create({
    data: { name, biometricId },
  });
  return res.status(statusCodes.CREATED).json({
    message: "Worker created",
    worker,
  });
}));

/** PATCH /workers/:id — Update worker */
router.patch("/:id", asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateWorkerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(statusCodes.BAD_REQUEST).json({
      message: "Invalid body",
      errors: parsed.error.flatten(),
    });
  }

  const worker = await prisma.worker.update({
    where: { id: req.params.id as string },
    data: parsed.data,
  }).catch(() => null);

  if (!worker) {
    return res.status(statusCodes.NOT_FOUND).json({ message: "Worker not found" });
  }

  return res.status(statusCodes.OK).json({ message: "Worker updated", worker });
}));

/** GET /workers/:id/attendance — Worker's attendance for calendar view */
router.get("/:id/attendance", asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const start = startDate && typeof startDate === "string" ? new Date(startDate) : null;
  const end = endDate && typeof endDate === "string" ? new Date(endDate) : null;

  const records = await prisma.attendanceRecord.findMany({
    where: {
      workerId: req.params.id as string,
      ...(start && end && {
        date: { gte: start, lte: end },
      }),
    },
    orderBy: { date: "asc" },
  });

  return res.status(statusCodes.OK).json({ records });
}));

export default router;
