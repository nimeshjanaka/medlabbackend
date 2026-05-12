import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/database";
import { logger } from "./utils/logger";
import { autoSeed } from "./seed";

const PORT = process.env["PORT"] ?? 5001;

async function start() {
  await connectDB();
  await autoSeed();          // ← auto-create admin + lab tests on first run
  app.listen(PORT, () => {
    logger.info(`🚀 MedLab API running on http://localhost:${PORT}`);
    logger.info(`🌍 Environment: ${process.env["NODE_ENV"] ?? "development"}`);
    logger.info(`📋 API Docs:`);
    logger.info(`   POST /api/auth/register`);
    logger.info(`   POST /api/auth/login`);
    logger.info(`   GET  /api/patients`);
    logger.info(`   POST /api/patients`);
    logger.info(`   GET  /api/lab-tests`);
    logger.info(`   POST /api/lab-tests/seed   (seed predefined tests)`);
    logger.info(`   POST /api/sessions         (create test session)`);
    logger.info(`   POST /api/sessions/:id/tests (add tests to session)`);
    logger.info(`   POST /api/sessions/:id/results (enter test result)`);
    logger.info(`   GET  /api/dashboard/stats`);
  });
}

start().catch((err) => {
  logger.error("Failed to start server:", err);
  process.exit(1);
});