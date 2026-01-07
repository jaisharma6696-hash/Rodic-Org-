
import { Grade } from "./types";

export const STORAGE_KEY = "rodic_org_store_v4";
export const STORE_VERSION = 4;
export const AUTOSAVE_DEBOUNCE_MS = 700;

export const BUSINESS_UNITS = [
  { id: "ALL", label: "All Organization", color: "slate" },
  { id: "GL", label: "Group Leadership", color: "slate" }, // Moved up as generic
  { id: "PC", label: "People & Culture", color: "rose" },
  { id: "Fin", label: "Finance", color: "emerald" },
  { id: "Admin", label: "Admin & Facilities", color: "slate" },
  { id: "Comp", label: "Compliance & Risk", color: "amber" },
  { id: "Legal", label: "Legal", color: "violet" },
  { id: "Cont", label: "Contracts", color: "blue" },
  { id: "HBT", label: "HBT", color: "orange" },
  { id: "Rail", label: "Railways & Metro", color: "rose" },
  { id: "Water", label: "Urban Water & Hydro", color: "cyan" },
  { id: "Power", label: "Power & Energy", color: "amber" },
  { id: "TI", label: "Tech Innovation", color: "violet" },
  { id: "RDA", label: "RDA", color: "emerald" },
];

export const BU_CLASS: Record<string, { active: string; icon: string }> = {
  slate: {
    active: "bg-slate-900 text-white shadow-lg shadow-slate-900/20 ring-1 ring-slate-700",
    icon: "text-slate-200",
  },
  amber: {
    active: "bg-amber-100/50 border-amber-200 text-amber-900 ring-1 ring-amber-200 shadow-md",
    icon: "text-amber-600",
  },
  orange: {
    active: "bg-orange-100/50 border-orange-200 text-orange-900 ring-1 ring-orange-200 shadow-md",
    icon: "text-orange-600",
  },
  rose: {
    active: "bg-rose-100/50 border-rose-200 text-rose-900 ring-1 ring-rose-200 shadow-md",
    icon: "text-rose-600",
  },
  cyan: {
    active: "bg-cyan-100/50 border-cyan-200 text-cyan-900 ring-1 ring-cyan-200 shadow-md",
    icon: "text-cyan-600",
  },
  violet: {
    active: "bg-violet-100/50 border-violet-200 text-violet-900 ring-1 ring-violet-200 shadow-md",
    icon: "text-violet-600",
  },
  emerald: {
    active: "bg-emerald-100/50 border-emerald-200 text-emerald-900 ring-1 ring-emerald-200 shadow-md",
    icon: "text-emerald-600",
  },
  blue: {
    active: "bg-blue-100/50 border-blue-200 text-blue-900 ring-1 ring-blue-200 shadow-md",
    icon: "text-blue-600",
  },
};

export const GRADE_STYLES: Record<string, { label: string; tagline: string; badge: string; border: string; light: string }> = {
  G7: {
    label: "Board / CMD",
    tagline: "The Visionaries",
    badge: "bg-slate-900 text-white",
    border: "border-slate-900",
    light: "bg-slate-50 text-slate-900",
  },
  G6: {
    label: "Group Leadership",
    tagline: "The Architects",
    badge: "bg-slate-800 text-white",
    border: "border-slate-800",
    light: "bg-slate-50 text-slate-800",
  },
  G5: {
    label: "Senior Management",
    tagline: "The Strategists",
    badge: "bg-indigo-700 text-white",
    border: "border-indigo-700",
    light: "bg-indigo-50 text-indigo-700",
  },
  G4: {
    label: "Mid Management",
    tagline: "The Builders",
    badge: "bg-blue-600 text-white",
    border: "border-blue-600",
    light: "bg-blue-50 text-blue-600",
  },
  G3: {
    label: "Lead",
    tagline: "The Scalers",
    badge: "bg-sky-500 text-white",
    border: "border-sky-500",
    light: "bg-sky-50 text-sky-600",
  },
  G2: {
    label: "Specialist",
    tagline: "The Solvers",
    badge: "bg-teal-500 text-white",
    border: "border-teal-500",
    light: "bg-teal-50 text-teal-600",
  },
  G1: {
    label: "Associates",
    tagline: "The Executors",
    badge: "bg-slate-400 text-white",
    border: "border-slate-400",
    light: "bg-slate-50 text-slate-500",
  },
};

export const GRADE_LEVELS: Record<string, string[]> = {
  G3: ["L2", "L1"],
  G2: ["L2", "L1"],
  G1: ["L3", "L2", "L1"],
};

export const DEFAULT_COLUMNS = {
  role: true,
  incumbent: true,
  reporting: true,
  workMix: true,
  financials: true,
  metrics: false,
  designations: false,
};

export const COLUMN_LABELS: Record<keyof typeof DEFAULT_COLUMNS, string> = {
  role: "Role Profile",
  incumbent: "Incumbent",
  reporting: "Reporting",
  workMix: "Work Function Mix",
  financials: "Cost & Banding",
  metrics: "KPIs",
  designations: "Mapped Titles",
};
