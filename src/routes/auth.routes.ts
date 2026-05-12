import { Router } from "express";
import { body } from "express-validator";
import { authController } from "../controllers/auth.controller";
import { authMiddleware, adminOnly } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";

export const authRoutes = Router();

// Register — only existing admins can create new users
authRoutes.post(
  "/register",
  [
    authMiddleware,
    adminOnly,
    body("name").notEmpty().withMessage("Name required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    validate,
  ],
  authController.register
);

authRoutes.post(
  "/login",
  [
    body("email").isEmail(),
    body("password").notEmpty(),
    validate,
  ],
  authController.login
);

authRoutes.post("/forgot-password", authController.forgotPassword);
authRoutes.post("/reset-password",  authController.resetPassword);
authRoutes.get("/profile",          authMiddleware, authController.getProfile);
authRoutes.put("/change-password",  authMiddleware, authController.changePassword);