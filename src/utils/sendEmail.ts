import nodemailer from "nodemailer";
import { logger } from "./logger";

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: MailOptions): Promise<void> => {
  const transporter = nodemailer.createTransport({
    host: process.env["SMTP_HOST"] ?? "smtp.gmail.com",
    port: Number(process.env["SMTP_PORT"] ?? 587),
    secure: false,
    auth: {
      user: process.env["SMTP_USER"],
      pass: process.env["SMTP_PASS"],
    },
  });

  try {
    await transporter.sendMail({
      from: process.env["EMAIL_FROM"] ?? "MedLab <noreply@medlab.com>",
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    logger.info(`📧 Email sent to ${options.to}`);
  } catch (err) {
    logger.error("Email send failed:", err);
    throw err;
  }
};
