import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const dashboardRoutes = Router();

dashboardRoutes.use(authMiddleware);

dashboardRoutes.get("/stats",           dashboardController.getStats);
dashboardRoutes.get("/recent-sessions", dashboardController.getRecentSessions);
