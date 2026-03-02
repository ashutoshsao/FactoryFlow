import cors from "cors";
import express, { type Request, type Response } from "express";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import scanRoutes from "./routes/scan";
import workersRoutes from "./routes/workers";
import attendanceRoutes from "./routes/attendance";
import { startLeaveCron } from "./jobs/leaveCron";

const app = express();
const PORT = Bun.env.PORT ?? 8080;

app.use(cors({ origin: Bun.env.CORS_ORIGIN ?? "http://localhost:5173", credentials: true }));
app.use(express.json());

// Auth (public)
app.use("/auth", authRoutes);

// Biometric scanner (allowed devices only via x-device-id in DB)
app.use("/api/scan", scanRoutes);

// Dashboard routes (JWT required)
app.use("/workers", workersRoutes);
app.use("/attendance", attendanceRoutes);

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Not found" });
});

app.use(errorHandler);

startLeaveCron();

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
