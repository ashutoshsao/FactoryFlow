import type { PrismaClient } from "../../generated/prisma/client.js";

declare global {
  var prisma: PrismaClient | undefined;
}

export {};
