import type { Request, Response } from "express";
import { labTestService } from "../services/labtest.service";
import { sendSuccess, sendError } from "../utils/responseHelper";

export const labTestController = {
  async seed(req: Request, res: Response): Promise<void> {
    try {
      const result = await labTestService.seedPredefined();
      sendSuccess(res, result, result.message);
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const test = await labTestService.create(req.body as { name: string; category: string; description?: string });
      sendSuccess(res, test, "Lab test created", 201);
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { category, search, includeInactive } = req.query as {
        category?: string; search?: string; includeInactive?: string;
      };
      const tests = await labTestService.getAll({
        category,
        search,
        includeInactive: includeInactive === "true",
      });
      sendSuccess(res, tests);
    } catch (err) {
      sendError(res, (err as Error).message);
    }
  },

  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await labTestService.getCategories();
      sendSuccess(res, categories);
    } catch (err) {
      sendError(res, (err as Error).message);
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const test = await labTestService.getById(req.params["id"] ?? "");
      sendSuccess(res, test);
    } catch (err) {
      sendError(res, (err as Error).message, 404);
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const test = await labTestService.update(
        req.params["id"] ?? "",
        req.body as { name?: string; category?: string; description?: string; isActive?: boolean }
      );
      sendSuccess(res, test, "Lab test updated");
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  async deactivate(req: Request, res: Response): Promise<void> {
    try {
      await labTestService.deactivate(req.params["id"] ?? "");
      sendSuccess(res, null, "Lab test deactivated");
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },
};
