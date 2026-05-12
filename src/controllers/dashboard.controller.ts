import type { Request, Response } from "express";
import { Patient } from "../models/patient.model";
import { TestSession } from "../models/testsession.model";
import { sendSuccess, sendError } from "../utils/responseHelper";

export const dashboardController = {
  async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const now = new Date();
      const startOfDay   = new Date(now.setHours(0, 0, 0, 0));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalPatients,
        totalSessions,
        todayPatients,
        todaySessions,
        monthSessions,
        pendingSessions,
        completedSessions,
      ] = await Promise.all([
        Patient.countDocuments(),
        TestSession.countDocuments(),
        Patient.countDocuments({ createdAt: { $gte: startOfDay } }),
        TestSession.countDocuments({ createdAt: { $gte: startOfDay } }),
        TestSession.countDocuments({ createdAt: { $gte: startOfMonth } }),
        TestSession.countDocuments({ status: "PENDING" }),
        TestSession.countDocuments({ status: "COMPLETED" }),
      ]);

      // Total revenue this month
      const revenueAgg = await TestSession.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, status: { $ne: "CANCELLED" } } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]);
      const monthlyRevenue = revenueAgg[0]?.total ?? 0;

      sendSuccess(res, {
        totalPatients,
        totalSessions,
        todayPatients,
        todaySessions,
        monthSessions,
        pendingSessions,
        completedSessions,
        monthlyRevenue,
      });
    } catch (err) {
      sendError(res, (err as Error).message);
    }
  },

  async getRecentSessions(_req: Request, res: Response): Promise<void> {
    try {
      const sessions = await TestSession.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("patientId", "fullName phone gender")
        .populate("createdBy", "name");

      sendSuccess(res, sessions);
    } catch (err) {
      sendError(res, (err as Error).message);
    }
  },
};
