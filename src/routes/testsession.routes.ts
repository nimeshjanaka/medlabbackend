import { Router } from "express";
import { body } from "express-validator";
import { testSessionController } from "../controllers/testsession.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";

export const testSessionRoutes = Router();

testSessionRoutes.use(authMiddleware);

// ── List & Create ─────────────────────────────────────────────────────────────
testSessionRoutes.get("/", testSessionController.getAll);

testSessionRoutes.post(
  "/",
  [
    body("patientId").notEmpty().withMessage("patientId is required"),
    body("tests").optional().isArray(),
    body("tests.*.testId").notEmpty().withMessage("Each test must have a testId"),
    body("tests.*.facility").notEmpty().withMessage("Each test must have a facility"),
    body("tests.*.price").isNumeric().withMessage("Each test must have a numeric price"),
    validate,
  ],
  testSessionController.create
);

// ── By patient ────────────────────────────────────────────────────────────────
testSessionRoutes.get("/patient/:patientId", testSessionController.getByPatient);

// ── Single session ────────────────────────────────────────────────────────────
testSessionRoutes.get("/:id",    testSessionController.getById);
testSessionRoutes.delete("/:id", testSessionController.delete);

// ── Add more tests to a session ───────────────────────────────────────────────
testSessionRoutes.post(
  "/:id/tests",
  [
    body("tests").isArray({ min: 1 }).withMessage("At least one test required"),
    body("tests.*.testId").notEmpty().withMessage("testId required"),
    body("tests.*.facility").notEmpty().withMessage("facility required"),
    body("tests.*.price").isNumeric().withMessage("price must be numeric"),
    validate,
  ],
  testSessionController.addTests
);

// ── Remove / update a specific test ──────────────────────────────────────────
testSessionRoutes.delete("/:id/tests/:testId", testSessionController.removeTest);
testSessionRoutes.put("/:id/tests/:testId",    testSessionController.updateTest);

// ── Enter result for a test ───────────────────────────────────────────────────
testSessionRoutes.post(
  "/:id/results",
  [
    body("sessionTestId").notEmpty().withMessage("sessionTestId required"),
    body("value").notEmpty().withMessage("Result value required"),
    validate,
  ],
  testSessionController.addResult
);

// ── Update status ──────────────────────────────────────────────────────────────
testSessionRoutes.put("/:id/status", testSessionController.updateStatus);

// ── Generate PDF ──────────────────────────────────────────────────────────────
testSessionRoutes.post("/:id/pdf", testSessionController.generatePdf);
