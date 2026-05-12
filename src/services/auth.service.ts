import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User } from "../models/user.model";
import { signToken } from "../config/jwt";
import { sendEmail } from "../utils/sendEmail";
import { logger } from "../utils/logger";

export const authService = {
  // ── Register ────────────────────────────────────────────────────────────────
  async register(name: string, email: string, password: string, role?: string) {
    const existing = await User.findOne({ email });
    if (existing) throw new Error("Email already registered");

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role === "ADMIN" ? "ADMIN" : "LAB_ASSISTANT",
    });

    const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });
    const { password: _pw, resetToken: _rt, resetTokenExp: _rte, ...safeUser } = user.toObject();
    return { user: safeUser, token };
  },

  // ── Login ───────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    const user = await User.findOne({ email });
    if (!user || !user.isActive) throw new Error("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });
    const { password: _pw, resetToken: _rt, resetTokenExp: _rte, ...safeUser } = user.toObject();
    return { user: safeUser, token };
  },

  // ── Forgot Password ─────────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await User.findOne({ email });
    if (!user) return; 

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await User.findByIdAndUpdate(user._id, {
      resetToken: hashedToken,
      resetTokenExp: expiry,
    });

    const resetUrl = `${process.env["FRONTEND_URL"] ?? "http://localhost:5173"}/reset-password?token=${rawToken}`;

    await sendEmail({
      to: email,
      subject: "Family Care MedLab – Password Reset",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2 style="color:#1E40AF;">Family Care Medical Laboratory</h2>
          <p>You requested a password reset. Click the link below (valid for 1 hour):</p>
          <a href="${resetUrl}" style="background:#1E40AF;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0;">
            Reset Password
          </a>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    logger.info(`🔑 Reset token sent to ${email}`);
  },

  // ── Reset Password ──────────────────────────────────────────────────────────
  async resetPassword(rawToken: string, newPassword: string) {
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExp: { $gt: new Date() },
    });

    if (!user) throw new Error("Reset token is invalid or has expired");

    const hashed = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(user._id, {
      password: hashed,
      resetToken: undefined,
      resetTokenExp: undefined,
    });
  },

  // ── Get Profile ─────────────────────────────────────────────────────────────
  async getProfile(userId: string) {
    const user = await User.findById(userId).select("-password -resetToken -resetTokenExp");
    if (!user) throw new Error("User not found");
    return user;
  },

  // ── Change Password ─────────────────────────────────────────────────────────
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new Error("Current password is incorrect");

    const hashed = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(userId, { password: hashed });
  },
};
