import mongoose, { Schema, Document } from "mongoose";

// ── Embedded sub-document: one test inside a session ─────────────────────────
export interface ISessionTest {
  _id: mongoose.Types.ObjectId;
  testId: mongoose.Types.ObjectId;    // ref to LabTest catalogue
  testName: string;                   // denormalized for quick display
  facility: string;                   // e.g. "Lab A", "External Lab", etc.
  price: number;                      // price entered by the staff at time of adding
  result?: string;
  unit?: string;
  normalRange?: string;
  remarks?: string;
  resultEnteredBy?: mongoose.Types.ObjectId;
  resultEnteredAt?: Date;
}

// ── Main TestSession document ─────────────────────────────────────────────────
export interface ITestSession extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorName?: string;
  notes?: string;
  sampleType: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  tests: ISessionTest[];
  totalPrice: number;               // auto-calculated sum of all test prices
  createdBy: mongoose.Types.ObjectId;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SessionTestSchema = new Schema<ISessionTest>(
  {
    testId:            { type: Schema.Types.ObjectId, ref: "LabTest", required: true },
    testName:          { type: String, required: true, trim: true },
    facility:          { type: String, required: true, trim: true },
    price:             { type: Number, required: true, min: 0 },
    result:            { type: String, trim: true },
    unit:              { type: String, trim: true },
    normalRange:       { type: String, trim: true },
    remarks:           { type: String, trim: true },
    resultEnteredBy:   { type: Schema.Types.ObjectId, ref: "User" },
    resultEnteredAt:   { type: Date },
  }
);

const TestSessionSchema = new Schema<ITestSession>(
  {
    patientId:  { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    doctorName: { type: String, trim: true },
    notes:      { type: String, trim: true },
    sampleType: {
      type:    String,
      enum:    ["BLOOD", "URINE", "STOOL", "SPUTUM", "SWAB", "OTHER"],
      default: "BLOOD",
    },
    status: {
      type:    String,
      enum:    ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "PENDING",
      index:   true,
    },
    tests:      { type: [SessionTestSchema], default: [] },
    totalPrice: { type: Number, default: 0 },
    createdBy:  { type: Schema.Types.ObjectId, ref: "User", required: true },
    pdfUrl:     { type: String },
  },
  { timestamps: true }
);

// ── Auto-recalculate totalPrice before every save ─────────────────────────────
TestSessionSchema.pre("save", function (next) {
  this.totalPrice = this.tests.reduce((sum, t) => sum + (t.price ?? 0), 0);
  next();
});

export const TestSession = mongoose.model<ITestSession>("TestSession", TestSessionSchema);
