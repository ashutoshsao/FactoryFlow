import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import statusCodes from "../statusCodes";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";

/** JWT payload: id = supervisor id, set on req.userId by requireAuth. */
export interface JwtPayload {
  id: string;
  email: string;
}

/** Verifies JWT and sets req.userId (supervisor id). Use for dashboard routes. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(statusCodes.UNAUTHORIZED).json({ message: "Missing or invalid Authorization header" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.userId = decoded.id;
    next();
  } catch {
    res.status(statusCodes.UNAUTHORIZED).json({ message: "Invalid or expired token" });
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(
    payload,
    JWT_SECRET
  );
}
