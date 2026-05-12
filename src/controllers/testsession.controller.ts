import type { Response } from "express";
import { testSessionService } from "../services/testsession.service";
import { pdfService } from "../services/pdf.service";
import { sendSuccess, sendError } from "../utils/responseHelper";
import type { AuthRequest } from "../types/index";

export const testSessionController = {
  // ── Create a new session for a patient ──────────────────────────────────────
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { patientId, doctorName, notes, sampleType, tests } = req.body as {
        patientId: string;
        doctorName?: string;
        notes?: string;
        sampleType?: string;
        tests?: Array<{ testId: string; facility: string; price: number }>;
      };

      const session = await testSessionService.create({
        patientId,
        doctorName,
        notes,
        sampleType,
        tests: tests ?? [],
        createdBy: req.user!.userId,
      });

      sendSuccess(res, session, "Test session created", 201);
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  // ── List all sessions (filterable) ─────────────────────────────────────────
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status, patientId, page, limit } = req.query as {
        status?: string; patientId?: string; page?: string; limit?: string;
      };
      const result = await testSessionService.getAll({
        status,
        patientId,
        page:  page  ? Number(page)  : 1,
        limit: limit ? Number(limit) : 20,
      });
      sendSuccess(res, result);
    } catch (err) {
      sendError(res, (err as Error).message);
    }
  },

  // ── Get single session ─────────────────────────────────────────────────────
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const session = await testSessionService.getById(req.params["id"] ?? "");
      sendSuccess(res, session);
    } catch (err) {
      sendError(res, (err as Error).message, 404);
    }
  },

  // ── Get sessions for a patient ─────────────────────────────────────────────
  async getByPatient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const sessions = await testSessionService.getByPatient(req.params["patientId"] ?? "");
      sendSuccess(res, sessions);
    } catch (err) {
      sendError(res, (err as Error).message);
    }
  },

  // ── Add more tests to an existing session ──────────────────────────────────
  async addTests(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tests } = req.body as {
        tests: Array<{ testId: string; facility: string; price: number }>;
      };
      const session = await testSessionService.addTests(req.params["id"] ?? "", tests);
      sendSuccess(res, session, "Tests added to session");
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  // ── Remove a test from a session ───────────────────────────────────────────
  async removeTest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const session = await testSessionService.removeTest(
        req.params["id"] ?? "",
        req.params["testId"] ?? ""
      );
      sendSuccess(res, session, "Test removed from session");
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  // ── Update test price / facility ───────────────────────────────────────────
  async updateTest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { facility, price } = req.body as { facility?: string; price?: number };
      const session = await testSessionService.updateTest(
        req.params["id"]     ?? "",
        req.params["testId"] ?? "",
        { facility, price }
      );
      sendSuccess(res, session, "Test updated");
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  // ── Enter result for a test ────────────────────────────────────────────────
  async addResult(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { sessionTestId, value, unit, normalRange, remarks } = req.body as {
        sessionTestId: string;
        value: string;
        unit?: string;
        normalRange?: string;
        remarks?: string;
      };

      const session = await testSessionService.addResult({
        sessionId:     req.params["id"] ?? "",
        sessionTestId,
        value,
        unit,
        normalRange,
        remarks,
        enteredBy: req.user!.userId,
      });

      sendSuccess(res, session, "Result saved");
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  // ── Update session status ──────────────────────────────────────────────────
  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.body as { status: string };
      const session = await testSessionService.updateStatus(req.params["id"] ?? "", status);
      sendSuccess(res, session, "Status updated");
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  // ── Generate PDF for session ──────────────────────────────────────────────
  async generatePdf(req: AuthRequest, res: Response): Promise<void> {
    try {
      const session = await testSessionService.getById(req.params["id"] ?? "");
      const sessionObj = session.toObject();

      const patient = sessionObj.patientId as unknown as {
        fullName: string; nic?: string; dob?: Date; gender?: string; phone?: string; address?: string;
      };

      const relativePdfUrl = await pdfService.generateSessionReport(patient, {
        _id:        sessionObj._id.toString(),
        doctorName: sessionObj.doctorName,
        notes:      sessionObj.notes,
        sampleType: sessionObj.sampleType,
        status:     sessionObj.status,
        tests:      sessionObj.tests as never,
        totalPrice: sessionObj.totalPrice,
        createdAt:  sessionObj.createdAt,
      });

      // Build absolute URL so the browser can open it directly
      const proto    = req.headers["x-forwarded-proto"] ?? req.protocol ?? "http";
      const host     = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:5000";
      const pdfUrl   = `${proto}://${host}${relativePdfUrl}`;

      sendSuccess(res, { pdfUrl, relativePdfUrl }, "PDF generated");
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },

  // ── Delete session ─────────────────────────────────────────────────────────
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await testSessionService.delete(req.params["id"] ?? "");
      sendSuccess(res, null, "Session deleted");
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  },
};
