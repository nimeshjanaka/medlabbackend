import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const C = {
  navy:       "#1B2D6B",
  red:        "#C0392B",
  skyBlue:    "#2E86C1",
  lightBlue:  "#EBF5FB",
  grey:       "#5D6D7E",
  lightGrey:  "#F2F3F4",
  white:      "#FFFFFF",
  black:      "#1A1A1A",
  green:      "#1E8449",
  orange:     "#D35400",
  borderGrey: "#D5D8DC",
};

interface SubTest {
  key:    string;
  label:  string;
  unit:   string;
  range:  string;
  low?:   number;
  high?:  number;
}

interface TestConfig {
  title:       string;
  sampleType:  string;
  subTests:    SubTest[];
  calculated?: Array<{ key: string; formula: (vals: Record<string, number>) => number | null }>;
  riskTable?:  Array<{ label: string; desirable: string; borderline: string; high: string }>;
  prematureCHD?: boolean;
}

const TEST_CONFIGS: Record<string, TestConfig> = {
  "LIPID": {
    title: "BLOOD FOR LIPID PROFILE",
    sampleType: "BLOOD",
    subTests: [
      { key: "TOTAL_CHOLESTEROL",  label: "TOTAL CHOLESTEROL",          unit: "mg/dl", range: "< 200 mg/dl",   low: 0,  high: 200  },
      { key: "HDL_CHOLESTEROL",    label: "HDL CHOLESTEROL",            unit: "mg/dl", range: ">= 45 mg/dl",   low: 45, high: 9999 },
      { key: "TRIGLYCERIDES",      label: "TRIGLYCERIDES",              unit: "mg/dl", range: "< 150 mg/dl",   low: 0,  high: 150  },
      { key: "LDL_CHOLESTEROL",    label: "LDL CHOLESTEROL",            unit: "mg/dl", range: "< 160 mg/dl",   low: 0,  high: 160  },
      { key: "VLDL_CHOLESTEROL",   label: "VLDL CHOLESTEROL",           unit: "mg/dl", range: "< 40 mg/dl",    low: 0,  high: 40   },
      { key: "TOTAL_HDL_RATIO",    label: "TOTAL CHOLESTEROL/HDL RATIO",unit: "",      range: "2.0 - 5.0",     low: 2,  high: 5    },
    ],
    calculated: [
      { key: "LDL_CHOLESTEROL",  formula: (v) => v["TOTAL_CHOLESTEROL"] != null && v["HDL_CHOLESTEROL"] != null && v["TRIGLYCERIDES"] != null ? +(v["TOTAL_CHOLESTEROL"] - v["HDL_CHOLESTEROL"] - v["TRIGLYCERIDES"] / 5).toFixed(1) : null },
      { key: "VLDL_CHOLESTEROL", formula: (v) => v["TRIGLYCERIDES"] != null ? +(v["TRIGLYCERIDES"] / 5).toFixed(1) : null },
      { key: "TOTAL_HDL_RATIO",  formula: (v) => v["TOTAL_CHOLESTEROL"] != null && v["HDL_CHOLESTEROL"] != null && v["HDL_CHOLESTEROL"] > 0 ? +(v["TOTAL_CHOLESTEROL"] / v["HDL_CHOLESTEROL"]).toFixed(1) : null },
    ],
    riskTable: [
      { label: "TOTAL CHOLESTEROL", desirable: "< 200",  borderline: "200 - 240", high: "> 240 mg/dl" },
      { label: "HDL CHOLESTEROL",   desirable: ">= 45",  borderline: "35 - 45",   high: "< 35 mg/dl"  },
      { label: "LDL CHOLESTEROL",   desirable: "< 130",  borderline: "130 - 160", high: "> 160 mg/dl" },
      { label: "TRIGLYCERIDES",     desirable: "< 100",  borderline: "< 150",     high: "> 150 mg/dl" },
    ],
    prematureCHD: true,
  },
  "FBS": {
    title: "FASTING BLOOD SUGAR (FBS)",
    sampleType: "BLOOD",
    subTests: [{ key: "FBS", label: "FASTING BLOOD SUGAR", unit: "mg/dl", range: "70 - 99 mg/dl", low: 70, high: 99 }],
    riskTable: [{ label: "Blood Glucose", desirable: "70 - 99", borderline: "100 - 125", high: ">= 126 mg/dl" }],
  },
  "RBS": {
    title: "RANDOM BLOOD SUGAR (RBS)",
    sampleType: "BLOOD",
    subTests: [{ key: "RBS", label: "RANDOM BLOOD SUGAR", unit: "mg/dl", range: "< 200 mg/dl", low: 0, high: 200 }],
  },
  "PPBS": {
    title: "POST PRANDIAL BLOOD SUGAR (PPBS)",
    sampleType: "BLOOD",
    subTests: [{ key: "PPBS", label: "POST PRANDIAL BLOOD SUGAR", unit: "mg/dl", range: "< 140 mg/dl", low: 0, high: 140 }],
  },
  "HBA1C": {
    title: "GLYCATED HAEMOGLOBIN (HbA1c)",
    sampleType: "BLOOD",
    subTests: [{ key: "HBA1C", label: "HbA1c", unit: "%", range: "< 5.7%", low: 0, high: 5.7 }],
    riskTable: [{ label: "HbA1c", desirable: "< 5.7%", borderline: "5.7 - 6.4%", high: ">= 6.5%" }],
  },
  "OGTT": {
    title: "ORAL GLUCOSE TOLERANCE TEST (OGTT)",
    sampleType: "BLOOD",
    subTests: [
      { key: "FASTING", label: "FASTING GLUCOSE",  unit: "mg/dl", range: "70 - 99 mg/dl",  low: 70, high: 99  },
      { key: "1HR",     label: "1 HOUR GLUCOSE",   unit: "mg/dl", range: "< 180 mg/dl",    low: 0,  high: 180 },
      { key: "2HR",     label: "2 HOUR GLUCOSE",   unit: "mg/dl", range: "< 140 mg/dl",    low: 0,  high: 140 },
    ],
  },
  "LIVER PROFILE": {
    title: "LIVER FUNCTION TESTS",
    sampleType: "BLOOD",
    subTests: [
      { key: "TOTAL_BILIRUBIN",     label: "TOTAL BILIRUBIN",     unit: "mg/dl", range: "0.2 - 1.2",  low: 0.2,  high: 1.2  },
      { key: "DIRECT_BILIRUBIN",    label: "DIRECT BILIRUBIN",    unit: "mg/dl", range: "0.0 - 0.3",  low: 0,    high: 0.3  },
      { key: "INDIRECT_BILIRUBIN",  label: "INDIRECT BILIRUBIN",  unit: "mg/dl", range: "0.2 - 0.9",  low: 0.2,  high: 0.9  },
      { key: "SGOT",                label: "SGOT (AST)",          unit: "U/L",   range: "10 - 40",     low: 10,   high: 40   },
      { key: "SGPT",                label: "SGPT (ALT)",          unit: "U/L",   range: "7 - 56",      low: 7,    high: 56   },
      { key: "ALP",                 label: "ALKALINE PHOSPHATASE",unit: "U/L",   range: "44 - 147",    low: 44,   high: 147  },
      { key: "TOTAL_PROTEIN",       label: "TOTAL PROTEIN",       unit: "g/dl",  range: "6.0 - 8.3",  low: 6.0,  high: 8.3  },
      { key: "ALBUMIN",             label: "ALBUMIN",             unit: "g/dl",  range: "3.5 - 5.0",  low: 3.5,  high: 5.0  },
      { key: "GLOBULIN",            label: "GLOBULIN",            unit: "g/dl",  range: "2.3 - 3.5",  low: 2.3,  high: 3.5  },
    ],
  },
  "CRE": {
    title: "SERUM CREATININE",
    sampleType: "BLOOD",
    subTests: [{ key: "CREATININE", label: "SERUM CREATININE", unit: "mg/dl", range: "0.7 - 1.3 (M) / 0.5 - 1.1 (F)", low: 0.7, high: 1.3 }],
  },
  "UREA": {
    title: "BLOOD UREA",
    sampleType: "BLOOD",
    subTests: [{ key: "UREA", label: "BLOOD UREA", unit: "mg/dl", range: "15 - 45 mg/dl", low: 15, high: 45 }],
  },
  "TSH": {
    title: "THYROID STIMULATING HORMONE (TSH)",
    sampleType: "BLOOD",
    subTests: [{ key: "TSH", label: "TSH", unit: "μIU/mL", range: "0.4 - 4.0 μIU/mL", low: 0.4, high: 4.0 }],
    riskTable: [{ label: "TSH", desirable: "0.4 - 4.0", borderline: "4.0 - 10.0", high: "> 10.0 μIU/mL" }],
  },
  "ESR": {
    title: "ERYTHROCYTE SEDIMENTATION RATE (ESR)",
    sampleType: "BLOOD",
    subTests: [{ key: "ESR", label: "ESR", unit: "mm/hr", range: "M: 0-15 / F: 0-20 mm/hr", low: 0, high: 15 }],
  },
  "UFR": {
    title: "URINE FULL REPORT",
    sampleType: "URINE",
    subTests: [
      { key: "COLOUR",          label: "COLOUR",           unit: "",     range: "Pale Yellow"   },
      { key: "TURBIDITY",       label: "TURBIDITY",        unit: "",     range: "Clear"         },
      { key: "PH",              label: "pH",               unit: "",     range: "4.6 - 8.0",    low: 4.6, high: 8.0 },
      { key: "SPECIFIC_GRAVITY",label: "SPECIFIC GRAVITY", unit: "",     range: "1.005 - 1.030" },
      { key: "PROTEIN",         label: "PROTEIN",          unit: "",     range: "Nil / Negative"},
      { key: "GLUCOSE",         label: "GLUCOSE",          unit: "",     range: "Nil / Negative"},
      { key: "BLOOD",           label: "BLOOD",            unit: "",     range: "Nil / Negative"},
      { key: "KETONE",          label: "KETONE",           unit: "",     range: "Nil / Negative"},
      { key: "BILIRUBIN",       label: "BILIRUBIN",        unit: "",     range: "Nil / Negative"},
      { key: "WBC",             label: "WBC",              unit: "/HPF", range: "0 - 5 /HPF",   low: 0, high: 5 },
      { key: "RBC",             label: "RBC",              unit: "/HPF", range: "0 - 3 /HPF",   low: 0, high: 3 },
      { key: "EPITHELIAL",      label: "EPITHELIAL CELLS", unit: "/HPF", range: "Occasional"    },
      { key: "CASTS",           label: "CASTS",            unit: "",     range: "Nil"           },
      { key: "CRYSTALS",        label: "CRYSTALS",         unit: "",     range: "Nil"           },
      { key: "BACTERIA",        label: "BACTERIA",         unit: "",     range: "Nil"           },
    ],
  },
  "ELECTROLYTES": {
    title: "SERUM ELECTROLYTES",
    sampleType: "BLOOD",
    subTests: [
      { key: "SODIUM",      label: "SODIUM (Na+)",       unit: "mEq/L", range: "136 - 145", low: 136, high: 145 },
      { key: "POTASSIUM",   label: "POTASSIUM (K+)",     unit: "mEq/L", range: "3.5 - 5.0", low: 3.5, high: 5.0 },
      { key: "CHLORIDE",    label: "CHLORIDE (Cl-)",     unit: "mEq/L", range: "98 - 107",  low: 98,  high: 107 },
      { key: "BICARBONATE", label: "BICARBONATE (HCO3-)",unit: "mEq/L", range: "22 - 29",   low: 22,  high: 29  },
    ],
  },
};

function getConfig(testName: string): TestConfig | null {
  const name = testName.toUpperCase().trim();
  if (TEST_CONFIGS[name]) return TEST_CONFIGS[name];
  for (const k of Object.keys(TEST_CONFIGS)) {
    if (name.includes(k) || k.includes(name)) return TEST_CONFIGS[k];
  }
  return null;
}

function parseSubResults(result: string | undefined, cfg?: TestConfig): Record<string, number | string> {
  if (!result) return {};
  // Always try JSON first — all modern saves use JSON {"KEY": value}
  try {
    const parsed = JSON.parse(result);
    if (typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {}
  // Pipe-separated KEY:VALUE (legacy)
  const out: Record<string, number | string> = {};
  for (const part of result.split("|")) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) { const n = parseFloat(v); out[k] = isNaN(n) ? v : n; }
  }
  if (Object.keys(out).length > 0) return out;
  // Plain value (legacy single-field — map to first subTest key)
  if (cfg && cfg.subTests.length === 1) {
    const n = parseFloat(result.trim());
    out[cfg.subTests[0].key] = isNaN(n) ? result.trim() : n;
  }
  return out;
}

function flagResult(val: number | string | undefined, sub: SubTest): "normal" | "low" | "high" | "unknown" {
  if (val == null || val === "") return "unknown";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n) || sub.low == null || sub.high == null) return "unknown";
  if (sub.key === "HDL_CHOLESTEROL") return n >= sub.low ? "normal" : "high";
  if (n < sub.low)  return "low";
  if (n > sub.high) return "high";
  return "normal";
}

function calcAge(dob?: Date | string): string {
  if (!dob) return "";
  const d = new Date(dob); const t = new Date();
  let age = t.getFullYear() - d.getFullYear();
  if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) age--;
  return `${age}Y`;
}

function drawLine(doc: PDFKit.PDFDocument, y: number, x1 = 50, x2 = 545, color = C.borderGrey, lw = 0.5) {
  doc.save().moveTo(x1, y).lineTo(x2, y).strokeColor(color).lineWidth(lw).stroke().restore();
}

function drawEcgLine(doc: PDFKit.PDFDocument, y: number, pageW: number) {
  const mid = y + 8;
  doc.save().strokeColor(C.red).lineWidth(1);
  doc.moveTo(30, mid);
  let x = 30;
  for (; x < 110; x += 6) doc.lineTo(x, mid);
  doc.lineTo(x, mid - 5); x += 5; doc.lineTo(x, mid + 5); x += 5; doc.lineTo(x, mid); x += 5;
  for (; x < 190; x += 6) doc.lineTo(x, mid);
  doc.lineTo(x, mid + 3); x += 4; doc.lineTo(x, mid - 20); x += 5;
  doc.lineTo(x, mid + 7); x += 4; doc.lineTo(x, mid - 2); x += 4; doc.lineTo(x, mid); x += 4;
  for (; x < 360; x += 6) doc.lineTo(x, mid);
  doc.lineTo(x, mid - 4); x += 5; doc.lineTo(x, mid + 4); x += 5; doc.lineTo(x, mid); x += 5;
  for (; x < pageW - 30; x += 6) doc.lineTo(x, mid);
  doc.stroke().restore();
}

interface SessionTestData { testName: string; facility: string; price: number; result?: string; unit?: string; normalRange?: string; remarks?: string; }
interface PatientData { fullName: string; nic?: string; dob?: Date | string; gender?: string; phone?: string; address?: string; }
interface SessionData { _id: string; refNo?: string; doctorName?: string; notes?: string; sampleType?: string; status?: string; tests: SessionTestData[]; totalPrice: number; createdAt: Date | string; patient?: PatientData; }

export const pdfService = {
  async generateSessionReport(patient: PatientData, session: SessionData): Promise<string> {
    return new Promise((resolve, reject) => {
      const filename = `session_${session._id}_${Date.now()}.pdf`;
      const filepath = path.join(UPLOADS_DIR, filename);
      const doc = new PDFDocument({ margin: 0, size: "A4", info: { Title: "Medical Laboratory Report" } });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      const PAGE_W = 595.28, PAGE_H = 841.89;
      const ML = 50, MR = 50, CW = PAGE_W - ML - MR;

      // ── Blank space for pre-printed letterhead (top) ───────────────────────
      // HEADER_H = how many points to leave blank at the top for your letterhead.
      // 200pt ≈ 70mm. Measure your printed paper and adjust this one number.
      const HEADER_H = 200;

      // ── Blank space for pre-printed footer (bottom) ────────────────────────
      // Your letterhead already has the ECG line, tagline & signature printed.
      // We just need a bottom margin so content doesn't overlap them.
      // 110pt ≈ 39mm from bottom.
      const FOOTER_H = 110;

      const CONTENT_BOT = PAGE_H - FOOTER_H;

      // ── Patient info — sits right below the letterhead area ────────────────
      const refNo = `FC-${session._id.toString().slice(-6).toUpperCase()}`;
      // Left block: Name, Ref No, Ref By Dr
      // Right block: Gender, Age, Date  — pushed to right half, no box
      const LBL_X  = ML;          // left label x
      const LBL_W  = 72;          // label column width
      const VAL_X  = ML + 75;     // left value x
      const VAL_W  = 195;         // left value width
      const R_LBL_X = 360;        // right label x  (further right)
      const R_LBL_W = 55;         // right label width
      const R_VAL_X = 418;        // right value x
      const R_VAL_W = PAGE_W - MR - 418; // right value width — never overflows

      let iy = HEADER_H;
      const rows: [string, string, string, string][] = [
        ["Name",       `${(patient.fullName ?? "").toUpperCase()}`, "Gender", `${(patient.gender ?? "").toUpperCase()}`],
        ["Ref.No",     `${refNo}`,                                  "Age",    `${calcAge(patient.dob)}`                ],
        ["Ref: By Dr", `${session.doctorName ?? ""}`,               "Date",   `${new Date(session.createdAt).toLocaleDateString("en-GB").replace(/\//g, ".")}`],
      ];
      for (const [l1, v1, l2, v2] of rows) {
        doc.save();
        // Left label
        doc.fontSize(9).font("Helvetica").fillColor(C.black)
          .text(l1, LBL_X, iy, { width: LBL_W, lineBreak: false });
        // Left colon + value — regular weight, no bold
        doc.fontSize(9).font("Helvetica").fillColor(C.black)
          .text(`: ${v1}`, VAL_X, iy, { width: VAL_W, lineBreak: false });
        // Right label
        doc.fontSize(9).font("Helvetica").fillColor(C.black)
          .text(l2, R_LBL_X, iy, { width: R_LBL_W, lineBreak: false });
        // Right value — regular weight, strictly within right margin
        doc.fontSize(9).font("Helvetica").fillColor(C.black)
          .text(`: ${v2}`, R_VAL_X, iy, { width: R_VAL_W, lineBreak: false });
        doc.restore();
        iy += 15;
      }

      // Thin separator line between patient info and test results
      let y = iy + 8;
      doc.save();
      doc.moveTo(ML, y).lineTo(PAGE_W - MR, y)
        .strokeColor(C.black).lineWidth(0.5).stroke();
      doc.restore();
      y += 12;

      // ── Tests ──────────────────────────────────────────────────────────────
      for (const test of session.tests) {
        const cfg = getConfig(test.testName);
        if (cfg) {
          y = drawStructuredTest(doc, test, cfg, y, ML, PAGE_W, CONTENT_BOT, HEADER_H, CW);
        } else {
          y = drawGenericTest(doc, test, y, ML, PAGE_W, CONTENT_BOT, HEADER_H, CW);
        }
        y += 14;
      }

      // ── Total price omitted from patient report (shown in admin portal only) ──

      // ── Footer: intentionally blank — already printed on your letterhead ───

      doc.end();
      stream.on("finish", () => { logger.info(`📄 PDF: ${filename}`); resolve(`/uploads/${filename}`); });
      stream.on("error", reject);
    });
  },

  async generateHistoryReport(patient: PatientData, sessions: SessionData[], rangeLabel: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const filename = `history_${Date.now()}.pdf`;
      const filepath = path.join(UPLOADS_DIR, filename);
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);
      doc.fontSize(18).fillColor(C.navy).text("Family Care Medical Laboratory", { align: "center" });
      doc.fontSize(10).fillColor(C.grey).text(`Patient History – ${rangeLabel}`, { align: "center" });
      doc.moveDown(0.5);
      drawLine(doc, doc.y, 50, 545, C.navy, 1);
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica-Bold").fillColor(C.black).text("Patient Details");
      doc.fontSize(9).font("Helvetica").fillColor(C.grey);
      doc.text(`Name: ${patient.fullName}`);
      if (patient.nic) doc.text(`NIC: ${patient.nic}`);
      doc.moveDown(0.5);
      let gt = 0;
      for (const s of sessions) {
        drawLine(doc, doc.y, 50, 545, C.borderGrey);
        doc.moveDown(0.3);
        doc.fontSize(9).font("Helvetica-Bold").fillColor(C.navy)
          .text(`${new Date(s.createdAt).toLocaleDateString("en-GB")} | ${s.status} | Rs. ${s.totalPrice.toFixed(2)}`);
        for (const t of s.tests) {
          doc.fontSize(8).font("Helvetica").fillColor(C.black)
            .text(`  • ${t.testName} — ${t.result ?? "Pending"} — Rs. ${t.price.toFixed(2)}`);
        }
        gt += s.totalPrice;
        doc.moveDown(0.3);
      }
      doc.moveDown(0.5);
      drawLine(doc, doc.y, 50, 545, C.navy, 0.7);
      doc.fontSize(11).font("Helvetica-Bold").fillColor(C.navy)
        .text(`Grand Total: Rs. ${gt.toFixed(2)}`, { align: "right" });
      doc.end();
      stream.on("finish", () => resolve(`/uploads/${filename}`));
      stream.on("error", reject);
    });
  },
};

function drawStructuredTest(
  doc: PDFKit.PDFDocument, test: SessionTestData, cfg: TestConfig,
  startY: number, ML: number, pageW: number, contentBot: number, headerH: number, CW: number,
): number {
  let y = startY;

  // ── Parse & auto-calculate ─────────────────────────────────────────────────
  const storedVals = parseSubResults(test.result, cfg);
  const numVals: Record<string, number> = {};
  for (const [k, v] of Object.entries(storedVals)) {
    const n = parseFloat(String(v)); if (!isNaN(n)) numVals[k] = n;
  }
  if (cfg.calculated) {
    for (const calc of cfg.calculated) {
      const r = calc.formula(numVals);
      if (r !== null) { storedVals[calc.key] = r; numVals[calc.key] = r; }
    }
  }

  // ── Layout constants ───────────────────────────────────────────────────────
  const TITLE_H   = 20;
  const HDR_H     = 17;
  const ROW_H     = 18;

  // Column x positions and widths  (TEST | RESULT | UNITS | REF. RANGE)
  // Columns must sum within CW=495: TEST|RESULT|UNITS|REF.RANGE
  const cT   = ML + 4;    const wT   = 240;  // 244
  const cR   = ML + 252;  const wR   = 80;   // 332→382
  const cU   = ML + 338;  const wU   = 42;   // 388→430
  const cRng = ML + 386;  const wRng = CW - 386 - 4; // fills to right edge exactly

  // helper: draw a hairline separator — always grey, no color bleed
  const hairline = (atY: number) => {
    doc.save();
    doc.moveTo(ML, atY).lineTo(ML + CW, atY);
    doc.strokeColor("#D5D8DC").lineWidth(0.25).stroke();
    doc.restore();
  };

  // ── Section title bar ──────────────────────────────────────────────────────
  if (y + TITLE_H > contentBot) { doc.addPage(); y = headerH; }
  doc.rect(ML, y, CW, TITLE_H).fillColor(C.navy).fill();
  doc.save();
  doc.fontSize(9).font("Helvetica-Bold").fillColor(C.white)
    .text(cfg.title, ML, y + 6, { width: CW, align: "center", lineBreak: false });
  doc.restore();
  y += TITLE_H;

  // ── Column header row ──────────────────────────────────────────────────────
  if (y + HDR_H > contentBot) { doc.addPage(); y = headerH; }
  doc.rect(ML, y, CW, HDR_H).fillColor(C.lightBlue).fill();
  doc.save();
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(C.navy);
  doc.text("TEST",       cT,   y + 5, { width: wT,   lineBreak: false });
  doc.text("RESULT",     cR,   y + 5, { width: wR,   align: "center", lineBreak: false });
  doc.text("UNITS",      cU,   y + 5, { width: wU,   lineBreak: false });
  doc.text("REF. RANGE", cRng, y + 5, { width: wRng, lineBreak: false });
  doc.restore();
  y += HDR_H;

  // ── Data rows ──────────────────────────────────────────────────────────────
  for (let i = 0; i < cfg.subTests.length; i++) {
    const sub = cfg.subTests[i];
    if (y + ROW_H > contentBot) { doc.addPage(); y = headerH; }

    const raw  = storedVals[sub.key];
    const disp = (raw != null && String(raw).trim() !== "") ? String(raw) : "—";
    const flag = flagResult(raw, sub);

    // Alternating stripe
    if (i % 2 === 1) { doc.rect(ML, y, CW, ROW_H).fillColor("#F4F7FC").fill(); }

    // Flag colour: HDL high = good (no flag); HDL low = orange L
    let valColor = C.black;
    let badge    = "";
    if (sub.key === "HDL_CHOLESTEROL") {
      if (flag === "low") { valColor = C.orange; badge = "  L"; }
    } else {
      if (flag === "high") { valColor = C.red;    badge = "  H"; }
      if (flag === "low")  { valColor = C.orange; badge = "  L"; }
    }

    const ry = y + 5;
    doc.save();
    doc.fontSize(8).font("Helvetica").fillColor(C.black)
      .text(sub.label,    cT,   ry, { width: wT,   lineBreak: false });
    doc.fontSize(8).font("Helvetica").fillColor(valColor)
      .text(disp + badge, cR,   ry, { width: wR,   align: "center", lineBreak: false });
    doc.fontSize(8).font("Helvetica").fillColor(C.grey)
      .text(sub.unit,     cU,   ry, { width: wU,   lineBreak: false });
    doc.fontSize(7.5).font("Helvetica").fillColor(C.grey)
      .text(sub.range,    cRng, ry, { width: wRng, lineBreak: false });
    doc.restore();

    hairline(y + ROW_H);
    y += ROW_H;
  }

  // ── Risk reference table ───────────────────────────────────────────────────
  if (cfg.riskTable && cfg.riskTable.length) {
    y += 18;   // breathing gap between result table and risk table

    // Risk table columns — all widths sum to CW exactly, no overflow
    // CW = 495.28  (595.28 - 50 - 50)
    const RISK_HDR_H  = 30;
    const RISK_ROW_H  = 17;
    const rcL  = ML;             const rwL  = 150;   // label col
    const rcD  = ML + 154;       const rwD  = 112;   // desirable
    const rcB  = ML + 270;       const rwB  = 112;   // borderline
    const rcH  = ML + 386;       const rwH  = CW - 386; // high — fills exactly to right edge

    if (y + RISK_HDR_H + cfg.riskTable.length * RISK_ROW_H > contentBot) {
      doc.addPage(); y = headerH;
    }

    // Risk header background
    doc.rect(ML, y, CW, RISK_HDR_H).fillColor(C.lightBlue).fill();
    doc.save();
    doc.fontSize(7).font("Helvetica").fillColor(C.navy);
    doc.text("",                   rcL, y + 5,  { width: rwL,  lineBreak: false });
    doc.text("Desirable Levels",   rcD, y + 5,  { width: rwD,  align: "center", lineBreak: false });
    doc.text("Borderline Levels",  rcB, y + 5,  { width: rwB,  align: "center", lineBreak: false });
    doc.text("High Levels",        rcH, y + 5,  { width: rwH,  align: "center", lineBreak: false });
    doc.text("(low risk) CHD",     rcD, y + 16, { width: rwD,  align: "center", lineBreak: false });
    doc.text("(Average risk) CHD", rcB, y + 16, { width: rwB,  align: "center", lineBreak: false });
    doc.text("(high risk) CHD",    rcH, y + 16, { width: rwH,  align: "center", lineBreak: false });
    doc.restore();
    y += RISK_HDR_H;

    // Risk data rows
    for (let i = 0; i < cfg.riskTable.length; i++) {
      const row = cfg.riskTable[i];
      if (y + RISK_ROW_H > contentBot) { doc.addPage(); y = headerH; }
      if (i % 2 === 1) { doc.rect(ML, y, CW, RISK_ROW_H).fillColor("#FAFBFD").fill(); }

      const ry = y + 5;
      doc.save();
      doc.fontSize(7.5).font("Helvetica").fillColor(C.black)
        .text(row.label,      rcL, ry, { width: rwL,  lineBreak: false });
      doc.fontSize(7.5).font("Helvetica").fillColor(C.green)
        .text(row.desirable,  rcD, ry, { width: rwD,  align: "center", lineBreak: false });
      doc.fontSize(7.5).font("Helvetica").fillColor(C.orange)
        .text(row.borderline, rcB, ry, { width: rwB,  align: "center", lineBreak: false });
      doc.fontSize(7.5).font("Helvetica").fillColor(C.red)
        .text(row.high,       rcH, ry, { width: rwH,  align: "center", lineBreak: false });
      doc.restore();   // ← restore BEFORE drawing line — prevents color bleed

      hairline(y + RISK_ROW_H);
      y += RISK_ROW_H;
    }

    // ── Premature CHD footnote ───────────────────────────────────────────────
    if (cfg.prematureCHD) {
      y += 10;
      if (y + 10 + 2 * RISK_ROW_H > contentBot) { doc.addPage(); y = headerH; }

      doc.save();
      doc.fontSize(6.5).font("Helvetica-Oblique").fillColor(C.grey)
        .text(
          "LIPID LEVELS FOR INDIVIDUALS WITH PREMATURE CHD (MALE < 55 YRS, FEMALE < 65 YRS).",
          ML + 4, y, { width: CW - 8, lineBreak: false }
        );
      doc.restore();
      y += 12;

      const prem = [
        { label: "TOTAL CHOLESTEROL", des: "< 170",  bord: "170 - 200", high: ">= 200 mg/dl" },
        { label: "LDL CHOLESTEROL",   des: "< 110",  bord: "110 - 130", high: ">= 130 mg/dl" },
      ];
      for (let i = 0; i < prem.length; i++) {
        const row = prem[i];
        if (y + RISK_ROW_H > contentBot) { doc.addPage(); y = headerH; }
        if (i % 2 === 1) { doc.rect(ML, y, CW, RISK_ROW_H).fillColor("#FAFBFD").fill(); }

        const ry = y + 5;
        doc.save();
        doc.fontSize(7.5).font("Helvetica").fillColor(C.black)
          .text(row.label, rcL, ry, { width: rwL,  lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.green)
          .text(row.des,   rcD, ry, { width: rwD,  align: "center", lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.orange)
          .text(row.bord,  rcB, ry, { width: rwB,  align: "center", lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.red)
          .text(row.high,  rcH, ry, { width: rwH,  align: "center", lineBreak: false });
        doc.restore();

        hairline(y + RISK_ROW_H);
        y += RISK_ROW_H;
      }
    }
  }

  // ── Remarks ────────────────────────────────────────────────────────────────
  if (test.remarks) {
    y += 8;
    doc.save();
    doc.fontSize(7.5).font("Helvetica-Oblique").fillColor(C.grey)
      .text("Remarks: " + test.remarks, ML + 4, y, { width: CW - 8 });
    doc.restore();
    y += 14;
  }
  return y;
}

function drawGenericTest(
  doc: PDFKit.PDFDocument, test: SessionTestData,
  startY: number, ML: number, pageW: number, contentBot: number, headerH: number, CW: number,
): number {
  let y = startY;
  if (y + 70 > contentBot) { doc.addPage(); y = headerH; }

  const TITLE_H = 20;
  const HDR_H   = 17;
  const ROW_H   = 18;

  const cT   = ML + 4;    const wT   = 240;
  const cR   = ML + 252;  const wR   = 80;
  const cU   = ML + 338;  const wU   = 42;
  const cRng = ML + 386;  const wRng = CW - 386 - 4;

  const hairline = (atY: number) => {
    doc.save();
    doc.moveTo(ML, atY).lineTo(ML + CW, atY);
    doc.strokeColor("#D5D8DC").lineWidth(0.25).stroke();
    doc.restore();
  };

  // Title bar
  doc.rect(ML, y, CW, TITLE_H).fillColor(C.navy).fill();
  doc.save();
  doc.fontSize(9).font("Helvetica-Bold").fillColor(C.white)
    .text(test.testName.toUpperCase(), ML, y + 6, { width: CW, align: "center", lineBreak: false });
  doc.restore();
  y += TITLE_H;

  // Column headers
  doc.rect(ML, y, CW, HDR_H).fillColor(C.lightBlue).fill();
  doc.save();
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(C.navy);
  doc.text("TEST",       cT,   y + 5, { width: wT,   lineBreak: false });
  doc.text("RESULT",     cR,   y + 5, { width: wR,   align: "center", lineBreak: false });
  doc.text("UNITS",      cU,   y + 5, { width: wU,   lineBreak: false });
  doc.text("REF. RANGE", cRng, y + 5, { width: wRng, lineBreak: false });
  doc.restore();
  y += HDR_H;

  // Data row
  // Parse result in case it is JSON (single-key schema stored as JSON)
  let displayResult = test.result ?? "—";
  let displayUnit   = test.unit   ?? "";
  let displayRange  = test.normalRange ?? "";
  try {
    const p = JSON.parse(test.result ?? "");
    if (typeof p === "object" && !Array.isArray(p)) {
      const vals = Object.values(p);
      if (vals.length === 1) displayResult = String(vals[0]);
    }
  } catch {}

  doc.save();
  doc.fontSize(8).font("Helvetica").fillColor(C.black)
    .text(test.testName.toUpperCase(), cT,   y + 5, { width: wT,   lineBreak: false });
  doc.fontSize(8).font("Helvetica").fillColor(C.black)
    .text(displayResult,               cR,   y + 5, { width: wR,   align: "center", lineBreak: false });
  doc.fontSize(8).font("Helvetica").fillColor(C.grey)
    .text(displayUnit,                 cU,   y + 5, { width: wU,   lineBreak: false });
  doc.fontSize(7.5).font("Helvetica").fillColor(C.grey)
    .text(displayRange,                cRng, y + 5, { width: wRng, lineBreak: false });
  doc.restore();

  hairline(y + ROW_H);
  y += ROW_H;

  if (test.remarks) {
    y += 8;
    doc.save();
    doc.fontSize(7.5).font("Helvetica-Oblique").fillColor(C.grey)
      .text("Remarks: " + test.remarks, ML + 4, y, { width: CW - 8 });
    doc.restore();
    y += 14;
  }
  return y;
}