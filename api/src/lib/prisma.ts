import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.ts";

const connectionString = Bun.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required. Set it in .env (see .env.example).");
}

const adapter = new PrismaPg({ connectionString });

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    adapter,
    log: Bun.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (Bun.env.NODE_ENV !== "production") globalThis.prisma = prisma;
