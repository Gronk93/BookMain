import { Router, type IRouter } from "express";
import { checkDatabaseHealth } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({
    status: "ok",
    version: "0.2.0",
    timestamp: new Date().toISOString(),
  });
});

router.get("/readyz", async (_req, res) => {
  const isHealthy = await checkDatabaseHealth();
  const dbStatus = isHealthy ? "connected" : process.env.DATABASE_URL ? "unreachable" : "in-memory-fallback";

  res.status(200).json({
    status: "ready",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

export default router;
