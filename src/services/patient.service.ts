import { Patient } from "../models/patient.model";
import { TestSession } from "../models/testsession.model";
import type { PaginatedResult } from "../types/index";

interface CreatePatientInput {
  fullName: string;
  nic?: string;
  dob: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone: string;
  address?: string;
  createdBy: string;
}

interface SearchFilters {
  query?: string;
  page?: number;
  limit?: number;
}

interface HistoryFilters {
  query?: string;
  dateRange?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

function getDateRange(dateRange?: string, fromDate?: string, toDate?: string) {
  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date = now;

  if (dateRange === "weekly") {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
  } else if (dateRange === "monthly") {
    startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 1);
  } else if (dateRange === "3months") {
    startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 3);
  } else if (dateRange === "1year") {
    startDate = new Date(now);
    startDate.setFullYear(now.getFullYear() - 1);
  } else if (dateRange === "custom" && fromDate && toDate) {
    startDate = new Date(fromDate);
    endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
  }
  return { startDate, endDate };
}

export const patientService = {
  // ── Create ──────────────────────────────────────────────────────────────────
  async create(input: CreatePatientInput) {
    return Patient.create({
      ...input,
      dob: new Date(input.dob),
    });
  },

  // ── Get All ──────────────────────────────────────────────────────────────────
  async getAll(filters: SearchFilters): Promise<PaginatedResult<unknown>> {
    const page  = filters.page  ?? 1;
    const limit = filters.limit ?? 20;
    const skip  = (page - 1) * limit;

    const query = filters.query
      ? {
          $or: [
            { fullName: { $regex: filters.query, $options: "i" } },
            { nic:      { $regex: filters.query, $options: "i" } },
            { phone:    { $regex: filters.query, $options: "i" } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      Patient.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate("createdBy", "name email"),
      Patient.countDocuments(query),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  },

  // ── Get by ID (with sessions) ────────────────────────────────────────────────
  async getById(id: string) {
    const patient = await Patient.findById(id).populate("createdBy", "name email");
    if (!patient) throw new Error("Patient not found");

    const sessions = await TestSession.find({ patientId: id })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .populate("tests.testId", "name category");

    return { ...patient.toObject(), sessions };
  },

  // ── Update ───────────────────────────────────────────────────────────────────
  async update(id: string, input: Partial<CreatePatientInput>) {
    const patient = await Patient.findById(id);
    if (!patient) throw new Error("Patient not found");

    return Patient.findByIdAndUpdate(
      id,
      { ...input, ...(input.dob ? { dob: new Date(input.dob) } : {}) },
      { new: true }
    );
  },

  // ── Delete ───────────────────────────────────────────────────────────────────
  async delete(id: string) {
    const patient = await Patient.findById(id);
    if (!patient) throw new Error("Patient not found");
    await Patient.findByIdAndDelete(id);
  },

  // ── Search History ───────────────────────────────────────────────────────────
  async searchHistory(filters: HistoryFilters) {
    const { query, dateRange, fromDate, toDate, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const { startDate, endDate } = getDateRange(dateRange, fromDate, toDate);

    const patientQuery = query
      ? {
          $or: [
            { fullName: { $regex: query, $options: "i" } },
            { nic:      { $regex: query, $options: "i" } },
            { phone:    { $regex: query, $options: "i" } },
          ],
        }
      : {};

    const [patients, total] = await Promise.all([
      Patient.find(patientQuery)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate("createdBy", "name email"),
      Patient.countDocuments(patientQuery),
    ]);

    // Attach sessions for each patient filtered by date
    const sessionFilter: Record<string, unknown> = {
      patientId: { $in: patients.map((p) => p._id) },
    };
    if (startDate) {
      sessionFilter["createdAt"] = { $gte: startDate, $lte: endDate };
    }

    const sessions = await TestSession.find(sessionFilter)
      .sort({ createdAt: -1 })
      .populate("tests.testId", "name category");

    const sessionsByPatient = sessions.reduce<Record<string, unknown[]>>((acc, s) => {
      const key = s.patientId.toString();
      if (!acc[key]) acc[key] = [];
      acc[key]!.push(s.toObject());
      return acc;
    }, {});

    const data = patients.map((p) => ({
      ...p.toObject(),
      sessions: sessionsByPatient[p._id.toString()] ?? [],
    }));

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      appliedFilters: {
        query,
        dateRange,
        from: startDate?.toISOString(),
        to:   endDate.toISOString(),
      },
    };
  },
};
