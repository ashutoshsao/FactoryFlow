import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import statusCodes from "../statusCodes";

const DEVICE_ID_HEADER = "x-device-id";

/** Allows scan only if x-device-id is sent and matches an allowed device in the DB. Sets req.deviceId. */
export function requireAllowedDevice(req: Request, res: Response, next: NextFunction): void {
  const deviceId = req.headers[DEVICE_ID_HEADER];
  if (typeof deviceId !== "string" || !deviceId.trim()) {
    res.status(statusCodes.UNAUTHORIZED).json({ message: "Missing or invalid x-device-id header" });
    return;
  }
  const id = deviceId.trim();
  prisma.device
    .findUnique({ where: { deviceId: id } })
    .then((device) => {
      if (!device) {
        res.status(statusCodes.UNAUTHORIZED).json({ message: "Device not allowed. Register this device in the dashboard." });
        return;
      }
      req.deviceId = id;
      next();
    })
    .catch(next);
}
