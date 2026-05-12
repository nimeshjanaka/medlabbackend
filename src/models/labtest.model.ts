import mongoose, { Schema, Document } from "mongoose";

export interface ILabTest extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  category: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LabTestSchema = new Schema<ILabTest>(
  {
    name:        { type: String, required: true, unique: true, trim: true },
    category:    { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

LabTestSchema.index({ name: "text" });

export const LabTest = mongoose.model<ILabTest>("LabTest", LabTestSchema);

export const PREDEFINED_TESTS = [
  { name: "FBS",               category: "Blood Sugar" },
  { name: "Lipid",             category: "Lipid Profile" },
  { name: "OT",                category: "Liver" },
  { name: "PT",                category: "Liver" },
  { name: "CRE",               category: "Kidney" },
  { name: "ESR",               category: "Blood" },
  { name: "UFR",               category: "Urine" },
  { name: "OGTT",              category: "Blood Sugar" },
  { name: "PPBS",              category: "Blood Sugar" },
  { name: "RBS",               category: "Blood Sugar" },
  { name: "RH FACTOR",         category: "Blood Group" },
  { name: "VDRL",              category: "Serology" },
  { name: "HIV",               category: "Serology" },
  { name: "U.HCG",             category: "Hormone" },
  { name: "SFR",               category: "Other" },
  { name: "UREA",              category: "Kidney" },
  { name: "U.ACR",             category: "Kidney" },
  { name: "HBA1C",             category: "Blood Sugar" },
  { name: "TSH",               category: "Thyroid" },
  { name: "BETA HCG",          category: "Hormone" },
  { name: "CA 125",            category: "Tumor Marker" },
  { name: "CA2+",              category: "Electrolytes" },
  { name: "CULTURE ABST",      category: "Microbiology" },
  { name: "DENGUE NS1",        category: "Serology" },
  { name: "ELECTROLYTES",      category: "Electrolytes" },
  { name: "TROP I",            category: "Cardiac" },
  { name: "LIVER PROFILE",     category: "Liver" },
  { name: "OCCULT BLOOD TEST", category: "Stool" },
  { name: "BLOOD GROUP",       category: "Blood Group" },
  { name: "BLOOD PICTURE",     category: "Blood" },
];
