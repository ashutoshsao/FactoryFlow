import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      deviceId?: string;
      userId?: string; // JWT payload: supervisor id
    }
  }
}

export {};