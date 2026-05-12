import type { Response } from "express";
import { patientService } from "../services/patient.service";
import { sendSuccess, sendError } from "../utils/responseHelper";
import type { AuthRequest } from "../types/index";

export const patientController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const patient = await patientService.create({
        ...(req.body as Parameters<typeof patientService.create>[0]),
        createdBy: req.user!.userId,
      });
      sendSuccess(res, patient, "Patient created", 201);
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { query, page, limit } = req.query as {
        query?: string; page?: string; limit?: string;
      };
      const result = await patientService.getAll({
        query,
        page:  page  ? Number(page)  : 1,
        limit: limit ? Number(limit) : 20,
      });
      sendSuccess(res, result);
    } catch (err) {
      sendError(res, (err as Error).message);
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const patient = await patientService.getById(req.params["id"] ?? "");
      sendSuccess(res, patient);
    } catch (err) {
      sendError(res, (err as Error).message, 404);
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const patient = await patientService.update(
        req.params["id"] ?? "",
        req.body as Parameters<typeof patientService.update>[1]
      );
      sendSuccess(res, patient, "Patient updated");
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await patientService.delete(req.params["id"] ?? "");
      sendSuccess(res, null, "Patient deleted");
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  async searchHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { q: query, range: dateRange, from: fromDate, to: toDate, page, limit } =
        req.query as Record<string, string>;
      const result = await patientService.searchHistory({
        query,
        dateRange,
        fromDate,
        toDate,
        page:  Number(page  ?? 1),
        limit: Number(limit ?? 20),
      });
      sendSuccess(res, result);
    } catch (err) {
      sendError(res, (err as Error).message);
    }
  },
};
