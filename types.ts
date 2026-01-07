
export type Grade = "G7" | "G6" | "G5" | "G4" | "G3" | "G2" | "G1";

export interface WorkMix {
  strategic: number;
  tactical: number;
  operational: number;
  admin: number;
}

export interface Reporting {
  up: string;
  down: string;
  dual: string;
}

export interface OrgNode {
  id: string;
  grade: Grade;
  level?: string; // e.g. "L1", "L2", "L3"
  title: string;
  buName: string;
  tierLabel: string;
  purpose: string;
  archetype: string;
  roles: string[];
  incumbentName: string;
  kpi: string[];
  reporting: Reporting;
  accountability: string;
  yoe: string;
  ctc: string;
  workMix: WorkMix;
  costObject: string;
  chargeRule: string;
  location: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  // Optional property for UI logic (e.g. childNodes in OrgChart)
  childNodes?: OrgNode[];
}

export interface BusinessUnit {
  id: string;
  label: string;
  color: string;
}

export interface Stats {
  totalRoles: number;
  filled: number;
  vacancy: number;
  vacancyRate: number;
  gradeDist: Record<string, number>;
  reportsCount: Record<string, number>;
  spanOfControl: number;
  leadershipRatio: number;
}

export interface DataHealth {
  duplicates: string[];
  orphans: { title: string; reportsTo: string }[];
  selfReports: string[];
  heavyManagers: { manager: string; reports: number }[];
}

export interface ActivityLogEntry {
  id: string;
  at: string;
  action: string;
  detail: string;
}

export interface StoreData {
  version: number;
  updatedAt: string;
  exportedAt?: string;
  data: {
    nodes: OrgNode[];
  };
}
