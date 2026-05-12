import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "ADMIN" | "LAB_ASSISTANT";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  resetToken?: string;
  resetTokenExp?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name:          { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:      { type: String, required: true },
    role:          { type: String, enum: ["ADMIN", "LAB_ASSISTANT"], default: "LAB_ASSISTANT" },
    isActive:      { type: Boolean, default: true },
    resetToken:    { type: String },
    resetTokenExp: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
