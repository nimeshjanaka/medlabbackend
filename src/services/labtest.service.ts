import { LabTest, PREDEFINED_TESTS } from "../models/labtest.model";

export const labTestService = {
  // ── Seed predefined tests ───────────────────────────────────────────────────
  async seedPredefined() {
    const existing = await LabTest.countDocuments();
    if (existing > 0) return { message: "Tests already seeded", count: existing };

    await LabTest.insertMany(PREDEFINED_TESTS);
    return { message: "Predefined tests seeded", count: PREDEFINED_TESTS.length };
  },

  // ── Create a new custom test ────────────────────────────────────────────────
  async create(input: { name: string; category: string; description?: string }) {
    const existing = await LabTest.findOne({ name: { $regex: new RegExp(`^${input.name}$`, "i") } });
    if (existing) throw new Error("A test with this name already exists");
    return LabTest.create(input);
  },

  // ── Get all active tests ────────────────────────────────────────────────────
  async getAll(filters: { category?: string; search?: string; includeInactive?: boolean }) {
    const query: Record<string, unknown> = {};
    if (!filters.includeInactive) query["isActive"] = true;
    if (filters.category) query["category"] = filters.category;
    if (filters.search)   query["name"] = { $regex: filters.search, $options: "i" };

    return LabTest.find(query).sort({ category: 1, name: 1 });
  },

  // ── Get by ID ───────────────────────────────────────────────────────────────
  async getById(id: string) {
    const test = await LabTest.findById(id);
    if (!test) throw new Error("Lab test not found");
    return test;
  },

  // ── Update ──────────────────────────────────────────────────────────────────
  async update(id: string, input: { name?: string; category?: string; description?: string; isActive?: boolean }) {
    const test = await LabTest.findByIdAndUpdate(id, input, { new: true });
    if (!test) throw new Error("Lab test not found");
    return test;
  },

  // ── Deactivate (soft delete) ────────────────────────────────────────────────
  async deactivate(id: string) {
    const test = await LabTest.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!test) throw new Error("Lab test not found");
    return test;
  },

  // ── Get all categories ──────────────────────────────────────────────────────
  async getCategories() {
    return LabTest.distinct("category", { isActive: true });
  },
};
