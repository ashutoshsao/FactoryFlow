import type { Request, Response, NextFunction } from "express";
import statusCodes from "../statusCodes";

/** Error with optional statusCode; use when calling next(err) so the handler returns a consistent { message } JSON. */
export interface AppError extends Error {
  statusCode?: number;
}

/** Global error handler (registered last). On next(err), responds with { message } and err.statusCode or 500. */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.statusCode ?? statusCodes.SERVER_ERROR;
  const message = err.message ?? "Internal server error";
  res.status(status).json({ message });
}
