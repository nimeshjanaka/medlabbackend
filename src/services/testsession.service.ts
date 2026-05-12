import mongoose from "mongoose";
import { TestSession } from "../models/testsession.model";
import { LabTest } from "../models/labtest.model";
import { Patient } from "../models/patient.model";

interface AddTestInput {
  testId: string;
  facility: string;
  price: number;
}

interface CreateSessionInput {
  patientId: string;
  doctorName?: string;
  notes?: string;
  sampleType?: string;
  tests?: AddTestInput[];
  createdBy: string;
}

interface AddResultInput {
  sessionId: string;
  sessionTestId: string;
  value: string;
  unit?: string;
  normalRange?: string;
  remarks?: string;
  enteredBy: string;
}

export const testSessionService = {
  // ── Create a new test session for a patient ─────────────────────────────────
  async create(input: CreateSessionInput) {
    const patient = await Patient.findById(input.patientId);
    if (!patient) throw new Error("Patient not found");

    // Resolve test names from catalogue
    const testsData = [];
    for (const t of input.tests ?? []) {
      const labTest = await LabTest.findById(t.testId);
      if (!labTest) throw new Error(`Lab test not found: ${t.testId}`);
      testsData.push({
        testId:   new mongoose.Types.ObjectId(t.testId),
        testName: labTest.name,
        facility: t.facility,
        price:    t.price,
      });
    }

    const session = new TestSession({
      patientId:  input.patientId,
      doctorName: input.doctorName,
      notes:      input.notes,
      sampleType: input.sampleType ?? "BLOOD",
      tests:      testsData,
      createdBy:  input.createdBy,
    });

    await session.save(); // triggers totalPrice auto-calc
    return session.populate([
      { path: "patientId", select: "fullName phone gender dob nic" },
      { path: "createdBy", select: "name email" },
    ]);
  },

  // ── Get all sessions (with filters) ────────────────────────────────────────
  async getAll(filters: { status?: string; patientId?: string; page?: number; limit?: number }) {
    const page  = filters.page  ?? 1;
    const limit = filters.limit ?? 20;
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filters.status)    query["status"]    = filters.status;
    if (filters.patientId) query["patientId"] = filters.patientId;

    const [data, total] = await Promise.all([
      TestSession.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate("patientId", "fullName phone gender dob nic")
        .populate("createdBy", "name email"),
      TestSession.countDocuments(query),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  },

  // ── Get single session by ID ────────────────────────────────────────────────
  async getById(id: string) {
    const session = await TestSession.findById(id)
      .populate("patientId", "fullName phone gender dob nic address")
      .populate("createdBy", "name email")
      .populate("tests.resultEnteredBy", "name email");
    if (!session) throw new Error("Test session not found");
    return session;
  },

  // ── Add more tests to an existing session ───────────────────────────────────
  async addTests(sessionId: string, tests: AddTestInput[]) {
    const session = await TestSession.findById(sessionId);
    if (!session) throw new Error("Test session not found");
    if (session.status === "COMPLETED" || session.status === "CANCELLED") {
      throw new Error(`Cannot add tests to a ${session.status} session`);
    }

    for (const t of tests) {
      const labTest = await LabTest.findById(t.testId);
      if (!labTest) throw new Error(`Lab test not found: ${t.testId}`);

      session.tests.push({
        _id:      new mongoose.Types.ObjectId(),
        testId:   new mongoose.Types.ObjectId(t.testId),
        testName: labTest.name,
        facility: t.facility,
        price:    t.price,
      });
    }

    await session.save(); // re-calculates totalPrice
    return session.populate([
      { path: "patientId", select: "fullName phone gender dob nic" },
      { path: "createdBy", select: "name email" },
    ]);
  },

  // ── Remove a test from a session ────────────────────────────────────────────
  async removeTest(sessionId: string, sessionTestId: string) {
    const session = await TestSession.findById(sessionId);
    if (!session) throw new Error("Test session not found");
    if (session.status === "COMPLETED") {
      throw new Error("Cannot remove tests from a completed session");
    }

    const idx = session.tests.findIndex((t) => t._id.toString() === sessionTestId);
    if (idx === -1) throw new Error("Test not found in session");

    session.tests.splice(idx, 1);
    await session.save();
    return session;
  },

  // ── Update a single test's price / facility ─────────────────────────────────
  async updateTest(
    sessionId: string,
    sessionTestId: string,
    update: { facility?: string; price?: number }
  ) {
    const session = await TestSession.findById(sessionId);
    if (!session) throw new Error("Test session not found");

    const test = session.tests.find((t) => t._id.toString() === sessionTestId);
    if (!test) throw new Error("Test not found in session");

    if (update.facility !== undefined) test.facility = update.facility;
    if (update.price    !== undefined) test.price    = update.price;

    await session.save();
    return session;
  },

  // ── Enter / update result for a test ────────────────────────────────────────
  async addResult(input: AddResultInput) {
    const session = await TestSession.findById(input.sessionId);
    if (!session) throw new Error("Test session not found");

    const test = session.tests.find((t) => t._id.toString() === input.sessionTestId);
    if (!test) throw new Error("Test not found in session");

    test.result          = input.value;
    test.unit            = input.unit;
    test.normalRange     = input.normalRange;
    test.remarks         = input.remarks;
    test.resultEnteredBy = new mongoose.Types.ObjectId(input.enteredBy);
    test.resultEnteredAt = new Date();

    // Auto-update session status
    const allDone = session.tests.every((t) => t.result);
    if (allDone) {
      session.status = "COMPLETED";
    } else if (session.status === "PENDING") {
      session.status = "IN_PROGRESS";
    }

    await session.save();
    return session;
  },

  // ── Update session status ───────────────────────────────────────────────────
  async updateStatus(sessionId: string, status: string) {
    const session = await TestSession.findByIdAndUpdate(
      sessionId,
      { status },
      { new: true }
    );
    if (!session) throw new Error("Test session not found");
    return session;
  },

  // ── Get sessions for a specific patient ────────────────────────────────────
  async getByPatient(patientId: string) {
    return TestSession.find({ patientId })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");
  },

  // ── Delete session ──────────────────────────────────────────────────────────
  async delete(sessionId: string) {
    const session = await TestSession.findById(sessionId);
    if (!session) throw new Error("Test session not found");
    await TestSession.findByIdAndDelete(sessionId);
  },
};