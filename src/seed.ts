import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./models/user.model";
import { LabTest, PREDEFINED_TESTS } from "./models/labtest.model";
import { logger } from "./utils/logger";

const MONGODB_URI = process.env["MONGODB_URI"] ?? "mongodb://localhost:27017/medlab";

// ── Called automatically on every server start ────────────────────────────────
// Safe to run multiple times — only creates data if it doesn't already exist.
export async function autoSeed() {
  try {
    // Seed admin user
    const existing = await User.findOne({ email: "admin@medlab.com" });
    if (!existing) {
      const hashed = await bcrypt.hash("Admin@123", 12);
      await User.create({
        name:     "Admin User",
        email:    "admin@medlab.com",
        password: hashed,
        role:     "ADMIN",
        isActive: true,
      });
      logger.info("✅ Admin user created: admin@medlab.com / Admin@123");
    } else {
      logger.info("ℹ️  Admin user already exists");
    }

    // Seed predefined lab tests
    const testCount = await LabTest.countDocuments();
    if (testCount === 0) {
      await LabTest.insertMany(PREDEFINED_TESTS);
      logger.info(`✅ Seeded ${PREDEFINED_TESTS.length} predefined lab tests`);
    } else {
      logger.info(`ℹ️  Lab tests already seeded (${testCount} tests)`);
    }
  } catch (err) {
    logger.error("⚠️  Auto-seed error:", err);
    // Don't crash the server — just log and continue
  }
}

// ── CLI entry point: npm run seed ─────────────────────────────────────────────
async function runCLI() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");
  await autoSeed();
  await mongoose.disconnect();
  console.log("✅ Seed complete");
}

// Only run CLI logic when executed directly (not imported)
if (require.main === module) {
  runCLI().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}