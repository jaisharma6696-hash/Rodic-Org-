
import { Grade, OrgNode, WorkMix, Stats, DataHealth, StoreData } from "./types";
import { STORE_VERSION, GRADE_LEVELS } from "./constants";

/* ---------------------------------- HELPERS ---------------------------------- */

export function safeNowISO(): string {
  return new Date().toISOString();
}

export function generateId(): string {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch {}
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function clamp(n: number | string, min: number, max: number): number {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

export function isTierGrade(grade: string): boolean {
  return ["G7", "G6", "G5", "G4"].includes(grade);
}

export function trackIdFromGrade(grade: string): string {
  if (grade === "G3") return "lead";
  if (grade === "G2") return "specialist";
  return "associate";
}

function getGradeFromBucket(bucket: string): Grade {
  switch (bucket) {
    case "Board": return "G7";
    case "Leadership": return "G6";
    case "Senior Management": return "G5";
    case "Mid Management": return "G4";
    case "Lead": return "G3";
    case "Specialist": return "G2";
    default: return "G1";
  }
}

export function defaultMixForGrade(grade: string): WorkMix {
  // G7: Board / CMD (Extrapolated from Leadership/Strategic definition)
  if (grade === "G7") return { strategic: 80, tactical: 15, operational: 5, admin: 0 };
  // G6: Leadership (65/20/10/5)
  if (grade === "G6") return { strategic: 65, tactical: 20, operational: 10, admin: 5 };
  // G5: Senior Management (45/30/15/10)
  if (grade === "G5") return { strategic: 45, tactical: 30, operational: 15, admin: 10 };
  // G4: Mid Management (30/35/25/10)
  if (grade === "G4") return { strategic: 30, tactical: 35, operational: 25, admin: 10 };
  // G3: Lead (20/30/30/20)
  if (grade === "G3") return { strategic: 20, tactical: 30, operational: 30, admin: 20 };
  // G2: Specialist (15/30/40/15)
  if (grade === "G2") return { strategic: 15, tactical: 30, operational: 40, admin: 15 };
  // G1: Associate (5/20/55/20)
  return { strategic: 5, tactical: 20, operational: 55, admin: 20 };
}

export function normalizeMix(mix: Partial<WorkMix> | undefined): WorkMix {
  const m = mix || { strategic: 0, tactical: 0, operational: 0, admin: 0 };
  const strategic = clamp(m.strategic ?? 0, 0, 100);
  const tactical = clamp(m.tactical ?? 0, 0, 100);
  const operational = clamp(m.operational ?? 0, 0, 100);
  const admin = clamp(m.admin ?? 0, 0, 100);
  return { strategic, tactical, operational, admin };
}

export function getDefaultLevel(grade: Grade): string | undefined {
  const levels = GRADE_LEVELS[grade];
  if (levels && levels.length > 0) return levels[levels.length - 1]; // Return lowest level (e.g. L1) as default
  return undefined;
}

/* ---------------------------------- SEED & MIGRATION ---------------------------------- */

const RAW_ROLES_DATA = [
  { bucket: "Board", title: "Chairman & Managing Director (CMD)", bu: "GL" },
  { bucket: "Leadership", title: "Chief Operating Officer (COO)", bu: "GL" },
  { bucket: "Leadership", title: "Chief Financial Officer (CFO)", bu: "GL" },
  { bucket: "Leadership", title: "Chief of Staff (CoS)", bu: "GL" },
  { bucket: "Senior Management", title: "Head – Business Development", bu: "GL" },
  { bucket: "Senior Management", title: "Head – Compliance & Risk", bu: "GL" },
  { bucket: "Mid Management", title: "Admin Operations Lead", bu: "GL" },
  { bucket: "Mid Management", title: "Controller – Finance", bu: "GL" },
  { bucket: "Lead", title: "Tendering Lead", bu: "GL" },
  { bucket: "Specialist", title: "Legal Manager", bu: "GL" },
  { bucket: "Associates", title: "Associate – Recruitment", bu: "GL" },
  { bucket: "Senior Management", title: "Project Director – Highways", bu: "HBT" },
  { bucket: "Mid Management", title: "Design Lead – Highway", bu: "HBT" },
  { bucket: "Mid Management", title: "Lead – QS (HBT)", bu: "HBT" },
  { bucket: "Lead", title: "Sr. Bridge Design Engineer", bu: "HBT" },
  { bucket: "Specialist", title: "Pavement Specialist", bu: "HBT" },
  { bucket: "Associates", title: "AutoCAD Draughtsman", bu: "HBT" },
  { bucket: "Leadership", title: "Sector Head – Railways & Metro", bu: "Rail" },
  { bucket: "Senior Management", title: "Project Director – Metro", bu: "Rail" },
  { bucket: "Mid Management", title: "Chief Signalling Expert", bu: "Rail" },
  { bucket: "Mid Management", title: "Lead – Track Alignment", bu: "Rail" },
  { bucket: "Lead", title: "Manager – Traction & E&M", bu: "Rail" },
  { bucket: "Specialist", title: "Signalling Design Engineer", bu: "Rail" },
  { bucket: "Associates", title: "Station Design Architect", bu: "Rail" },
];

const REAL_NAMES = [
  "Rajesh Kumar", "Priya Sharma", "Amit Patel", "Sneha Gupta", "Vikram Singh",
  "Anjali Verma", "Rahul Malhotra", "Kavita Reddy", "Suresh Nair", "Deepak Chopra",
  "Meera Iyer", "Arjun Rampal", "Nisha Desai", "Rohan Mehta", "Sanya Mirza",
  "Karan Johar", "Pooja Hegde", "Varun Dhawan", "Alia Bhatt", "Ranbir Kapoor",
  "Katrina Kaif", "Salman Khan", "Shahrukh Khan", "Aamir Khan"
];

export function seedNodes(): OrgNode[] {
  const now = safeNowISO();
  return RAW_ROLES_DATA.map((r, idx) => {
    const grade = getGradeFromBucket(r.bucket);
    return {
      id: `seed-${idx}`,
      grade,
      level: getDefaultLevel(grade),
      title: r.title,
      buName: r.bu || "GL",
      tierLabel: r.bucket,
      purpose: `Accountable for outcomes and delivery excellence in ${r.bu || "GL"}.`,
      archetype: "Standard",
      roles: [r.title],
      incumbentName: REAL_NAMES[idx % REAL_NAMES.length],
      kpi: ["Delivery", "Quality"],
      reporting: { up: "", down: "", dual: "" },
      accountability: "Deliver outcomes with quality, cost control, and governance.",
      yoe: grade === "G7" ? "20+ yrs" : grade === "G6" ? "15+ yrs" : grade === "G5" ? "10+ yrs" : "2–8 yrs",
      ctc: grade === "G7" ? "Board" : grade === "G6" ? "Executive" : "Standard",
      workMix: defaultMixForGrade(grade),
      costObject: "Project",
      chargeRule: "Direct",
      location: isTierGrade(grade) ? "tier" : `track:${trackIdFromGrade(grade)}`,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
  });
}

export function migrateToV4(rawParsed: any): StoreData {
  if (!rawParsed) {
    return { version: STORE_VERSION, updatedAt: safeNowISO(), data: { nodes: seedNodes() } };
  }

  // Already v4?
  const maybeV4Nodes = rawParsed?.data?.nodes || rawParsed?.nodes;
  if (Array.isArray(maybeV4Nodes)) {
    const nodes = maybeV4Nodes.map((n: any) => ({
      id: n.id || generateId(),
      grade: n.grade || "G1",
      level: n.level || getDefaultLevel(n.grade || "G1"),
      title: (n.title || "Untitled Role").trim() || "Untitled Role",
      buName: n.buName || "GL",
      tierLabel: n.tierLabel || "Standard",
      purpose: n.purpose || "",
      archetype: n.archetype || "Standard",
      roles: Array.isArray(n.roles) ? n.roles : [],
      incumbentName: n.incumbentName || "",
      kpi: Array.isArray(n.kpi) ? n.kpi : [],
      reporting: n.reporting || { up: "", down: "", dual: "" },
      accountability: n.accountability || "",
      yoe: n.yoe || "",
      ctc: n.ctc || "",
      workMix: normalizeMix(n.workMix),
      costObject: n.costObject || "Project",
      chargeRule: n.chargeRule || "Direct",
      location: isTierGrade(n.grade) ? "tier" : `track:${trackIdFromGrade(n.grade || "G1")}`,
      archived: !!n.archived,
      createdAt: n.createdAt || safeNowISO(),
      updatedAt: n.updatedAt || safeNowISO(),
    }));
    return { version: STORE_VERSION, updatedAt: safeNowISO(), data: { nodes } };
  }

  const data = rawParsed?.data || rawParsed;
  const tiers = data?.tiers;
  const tracks = data?.tracks;

  if (Array.isArray(tiers) && Array.isArray(tracks)) {
    const flat = [
      ...tiers.map((n: any) => ({ ...n, location: "tier" })),
      ...tracks.flatMap((t: any) => (t.nodes || []).map((n: any) => ({ ...n, location: `track:${t.id}` }))),
    ].map((n: any) => ({
      id: n.id || generateId(),
      grade: n.grade || "G1",
      level: n.level || getDefaultLevel(n.grade || "G1"),
      title: (n.title || "Untitled Role").trim() || "Untitled Role",
      buName: n.buName || "GL",
      tierLabel: n.tierLabel || n.track || "Standard",
      purpose: n.purpose || "",
      archetype: n.archetype || "Standard",
      roles: Array.isArray(n.roles) ? n.roles : [],
      incumbentName: n.incumbentName || "",
      kpi: Array.isArray(n.kpi) ? n.kpi : [],
      reporting: n.reporting || { up: "", down: "", dual: "" },
      accountability: n.accountability || "",
      yoe: n.yoe || "",
      ctc: n.ctc || "",
      workMix: normalizeMix(n.workMix),
      costObject: n.costObject || "Project",
      chargeRule: n.chargeRule || "Direct",
      location: isTierGrade(n.grade) ? "tier" : `track:${trackIdFromGrade(n.grade || "G1")}`,
      archived: !!n.archived,
      createdAt: n.createdAt || safeNowISO(),
      updatedAt: n.updatedAt || safeNowISO(),
    }));

    return { version: STORE_VERSION, updatedAt: safeNowISO(), data: { nodes: flat } };
  }

  // Unknown -> seed
  return { version: STORE_VERSION, updatedAt: safeNowISO(), data: { nodes: seedNodes() } };
}

export function safeParseJSON(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/* ------------------------------- CSV HELPERS ------------------------------ */

function csvEscape(v: any): string {
  const s = String(v ?? "");
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV(nodes: OrgNode[]): string {
  const header = [
    "id", "archived", "grade", "level", "title", "buName", "incumbentName",
    "reportsToUp", "reportsToDual", "responsibleForDown",
    "strategic", "tactical", "operational", "admin",
    "ctc", "yoe", "chargeRule", "costObject",
    "roles", "kpi", "purpose", "accountability",
  ];

  const body = nodes
    .map((n) => {
      const m = normalizeMix(n.workMix);
      const row = [
        n.id,
        n.archived ? "true" : "false",
        n.grade,
        n.level || "",
        n.title,
        n.buName,
        n.incumbentName,
        n.reporting?.up || "",
        n.reporting?.dual || "",
        n.reporting?.down || "",
        m.strategic ?? 0,
        m.tactical ?? 0,
        m.operational ?? 0,
        m.admin ?? 0,
        n.ctc,
        n.yoe,
        n.chargeRule,
        n.costObject,
        (n.roles || []).join(" | "),
        (n.kpi || []).join(" | "),
        n.purpose || "",
        n.accountability || "",
      ];
      return row.map(csvEscape).join(",");
    })
    .join("\n");

  return `\uFEFF${header.join(",")}\n${body}`;
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      pushField();
      i++;
      continue;
    }
    if (c === "\n") {
      pushField();
      pushRow();
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    field += c;
    i++;
  }

  pushField();
  if (row.length > 1 || (row[0] ?? "") !== "") pushRow();
  return rows;
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ----------------------------- ORG METRICS ----------------------------- */

export function computeStats(nodes: OrgNode[]): Stats {
  const totalRoles = nodes.length;
  const filled = nodes.filter((n) => (n.incumbentName || "").trim()).length;
  const vacancy = totalRoles - filled;
  const vacancyRate = totalRoles ? Number(((vacancy / totalRoles) * 100).toFixed(1)) : 0;

  const gradeDist: Record<string, number> = { G7: 0, G6: 0, G5: 0, G4: 0, G3: 0, G2: 0, G1: 0 };
  nodes.forEach((n) => {
    if (gradeDist[n.grade] !== undefined) gradeDist[n.grade]++;
  });

  const reportsCount: Record<string, number> = {};
  nodes.forEach((child) => {
    const up = (child.reporting?.up || "").trim();
    if (!up) return;
    reportsCount[up] = (reportsCount[up] || 0) + 1;
  });

  let totalReports = 0;
  let managers = 0;
  nodes.forEach((n) => {
    const c = reportsCount[n.title] || 0;
    if (c > 0) {
      totalReports += c;
      managers++;
    }
  });

  const spanOfControl = managers ? Number((totalReports / managers).toFixed(1)) : 0;
  const leadershipCount = gradeDist.G7 + gradeDist.G6 + gradeDist.G5;
  const leadershipRatio = totalRoles ? Number(((leadershipCount / totalRoles) * 100).toFixed(1)) : 0;

  return { totalRoles, filled, vacancy, vacancyRate, gradeDist, reportsCount, spanOfControl, leadershipRatio };
}

export function computeDataHealth(nodes: OrgNode[], stats: Stats): DataHealth {
  const titles = nodes.map((n) => (n.title || "").trim()).filter(Boolean);
  const titleCount = titles.reduce((acc, t) => ((acc[t] = (acc[t] || 0) + 1), acc), {} as Record<string, number>);
  const duplicates = Object.entries(titleCount).filter(([, c]) => c > 1).map(([t]) => t);

  const titleSet = new Set(titles);
  const orphans = nodes
    .filter((n) => {
      const up = (n.reporting?.up || "").trim();
      return up && !titleSet.has(up);
    })
    .map((n) => ({ title: n.title, reportsTo: n.reporting?.up }));

  const selfReports = nodes
    .filter((n) => (n.reporting?.up || "").trim() === (n.title || "").trim())
    .map((n) => n.title);

  const heavyManagers = Object.entries(stats.reportsCount || {})
    .filter(([, c]) => c >= 10)
    .map(([manager, reports]) => ({ manager, reports }));

  return { duplicates, orphans, selfReports, heavyManagers };
}

export function computeHealthScore(stats: Stats, dataHealth: DataHealth): number {
  let score = 100;
  if (stats.vacancyRate > 10) score -= (stats.vacancyRate - 10) * 1.2;
  if (stats.spanOfControl < 3) score -= 10;
  if (stats.spanOfControl > 10) score -= 10;
  if (stats.leadershipRatio > 20) score -= 10;
  if (dataHealth.duplicates.length) score -= 8;
  if (dataHealth.orphans.length) score -= 8;
  if (dataHealth.selfReports.length) score -= 6;
  return Math.max(0, Math.min(100, Math.round(score)));
}
