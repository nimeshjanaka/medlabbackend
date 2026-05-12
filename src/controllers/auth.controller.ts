import type { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { sendSuccess, sendError } from "../utils/responseHelper";
import type { AuthRequest } from "../types/index";

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, role } = req.body as {
        name: string; email: string; password: string; role?: string;
      };
      const result = await authService.register(name, email, password, role);
      sendSuccess(res, result, "User registered", 201);
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const result = await authService.login(email, password);
      sendSuccess(res, result, "Login successful");
    } catch (err) {
      sendError(res, (err as Error).message, 401);
    }
  },

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      await authService.forgotPassword(req.body.email as string);
      sendSuccess(res, null, "If this email is registered, a reset link has been sent.");
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body as { token: string; newPassword: string };
      await authService.resetPassword(token, newPassword);
      sendSuccess(res, null, "Password reset successful");
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await authService.getProfile(req.user!.userId);
      sendSuccess(res, user);
    } catch (err) {
      sendError(res, (err as Error).message, 404);
    }
  },

  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { oldPassword, newPassword } = req.body as { oldPassword: string; newPassword: string };
      await authService.changePassword(req.user!.userId, oldPassword, newPassword);
      sendSuccess(res, null, "Password changed");
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },
};
