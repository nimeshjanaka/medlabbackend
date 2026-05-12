import { Router } from "express";
import { body } from "express-validator";
import { patientController } from "../controllers/patient.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";

export const patientRoutes = Router();

patientRoutes.use(authMiddleware);

// History search
patientRoutes.get("/history/search", patientController.searchHistory);

patientRoutes.get("/",    patientController.getAll);
patientRoutes.get("/:id", patientController.getById);

patientRoutes.post(
  "/",
  [
    body("fullName").notEmpty().withMessage("Full name required"),
    body("dob").isISO8601().withMessage("Valid date of birth required (ISO8601)"),
    body("gender").isIn(["MALE", "FEMALE", "OTHER"]).withMessage("Gender must be MALE, FEMALE, or OTHER"),
    body("phone").notEmpty().withMessage("Phone number required"),
    validate,
  ],
  patientController.create
);

patientRoutes.put("/:id",    patientController.update);
patientRoutes.delete("/:id", patientController.delete);
