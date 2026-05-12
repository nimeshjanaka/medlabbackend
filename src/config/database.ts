import mongoose from "mongoose";
import { logger } from "../utils/logger";

const MONGODB_URI = process.env["MONGODB_URI"] ?? "mongodb://localhost:27017/medlab";

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info("✅ MongoDB connected successfully");
  } catch (error) {
    logger.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  logger.warn("⚠️  MongoDB disconnected");
});

export default mongoose;
