import type { Response, NextFunction } from "express";
import { verifyToken } from "../config/jwt";
import { sendError } from "../utils/responseHelper";
import type { AuthRequest } from "../types/index";

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    sendError(res, "Unauthorized – no token", 401);
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    sendError(res, "Unauthorized – no token", 401);
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    sendError(res, "Unauthorized – invalid or expired token", 401);
  }
};

export const adminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== "ADMIN") {
    sendError(res, "Forbidden – admins only", 403);
    return;
  }
  next();
};
