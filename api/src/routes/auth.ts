import { Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { supervisorAuthSchema } from "../types/types";
import { signToken } from "../middleware/jwtAuth";
import { asyncHandler } from "../middleware/asyncHandler";
import statusCodes from "../statusCodes";

const router = Router();

/** POST /auth/login — Supervisor login, returns JWT */
router.post("/login", asyncHandler(async (req: Request, res: Response) => {
  const parsed = supervisorAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(statusCodes.BAD_REQUEST).json({
      message: "Invalid email or password",
      errors: parsed.error.flatten(),
    });
  }

  const { email, password } = parsed.data;
  const supervisor = await prisma.supervisor.findUnique({
    where: { email },
  });

  if (!supervisor || !(await bcrypt.compare(password, supervisor.passwordHash))
  ) {
    return res.status(statusCodes.UNAUTHORIZED).json({
      message: "Invalid email or password",
    });
  }

  const token = signToken({
    id: supervisor.id,
    email: supervisor.email,
  });

  return res.status(statusCodes.OK).json({
    token,
    supervisor: { id: supervisor.id, email: supervisor.email, name: supervisor.name },
  });
}));

export default router;
