import type { Request, Response, NextFunction } from "express";

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;

/** Wraps async route handlers so thrown errors are passed to the global error middleware. */
export function asyncHandler(fn: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
