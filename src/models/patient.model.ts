import mongoose, { Schema, Document } from "mongoose";

export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface IPatient extends Document {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  nic?: string;
  dob: Date;
  gender: Gender;
  phone: string;
  address?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    fullName:  { type: String, required: true, trim: true, index: true },
    nic:       { type: String, trim: true, index: true },
    dob:       { type: Date, required: true },
    gender:    { type: String, enum: ["MALE", "FEMALE", "OTHER"], required: true },
    phone:     { type: String, required: true, trim: true, index: true },
    address:   { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Text search index
PatientSchema.index({ fullName: "text", nic: "text", phone: "text" });

export const Patient = mongoose.model<IPatient>("Patient", PatientSchema);
