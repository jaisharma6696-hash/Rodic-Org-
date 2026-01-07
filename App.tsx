
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Layout, Network, PieChart, Search, Printer, Download, Plus,
  ChevronLeft, ChevronRight, Cloud, Loader2, ShieldCheck, X, FileUp, FileDown,
  ZoomIn, ZoomOut, Maximize, Layers, Briefcase, TrainFront, Droplets, Zap, Cpu, 
  Building2, Globe, Activity, Users, CircleDollarSign, ShieldAlert, FileText, Scale, Clock
} from "lucide-react";

import { OrgNode, ActivityLogEntry, StoreData, Grade, WorkMix } from "./types";
import { STORAGE_KEY, STORE_VERSION, AUTOSAVE_DEBOUNCE_MS, BUSINESS_UNITS, BU_CLASS, GRADE_STYLES, DEFAULT_COLUMNS, COLUMN_LABELS, GRADE_LEVELS } from "./constants";
import { safeNowISO, generateId, seedNodes, migrateToV4, safeParseJSON, toCSV, parseCSV, downloadFile, defaultMixForGrade, isTierGrade, trackIdFromGrade, getDefaultLevel } from "./utils";
import { syncToBackend, SyncResult } from "./services/api";

import { PrintReport } from "./components/PrintReport";
import { TierSection } from "./components/TierSection";
import { NodeRow } from "./components/NodeRow";
import { OrgStructureBuilder } from "./components/OrgStructureBuilder";
import { AnalysisDashboard } from "./components/AnalysisDashboard";
import { EditNodeModal } from "./components/EditNodeModal";
import { BulkWorkMixModal } from "./components/BulkWorkMixModal";
import { Badge } from "./components/Badge";
import { TierLevelGroup } from "./components/TierLevelGroup";
import { TimesheetDashboard } from "./components/TimesheetDashboard";

// Map IDs to specific Lucide icons
const BU_ICONS: Record<string, React.ElementType> = {
  ALL: Layers,
  GL: Globe,          // Group Leadership
  HBT: Briefcase,     // Highway/Infra
  Rail: TrainFront,   // Railways
  Water: Droplets,    // Water
  Power: Zap,         // Energy
  TI: Cpu,            // Tech
  RDA: Building2,     // Real Estate
  PC: Users,          // People & Culture
  Fin: CircleDollarSign, // Finance
  Admin: Building2,   // Admin
  Comp: ShieldAlert,  // Compliance
  Legal: Scale,       // Legal
  Cont: FileText,     // Contracts
};

// Helper to remove reporting references (Pure function)
const cleanReferences = (currentNodes: OrgNode[], titleToRemove: string): OrgNode[] => {
    const t = (titleToRemove || "").trim();
    if (!t) return currentNodes;
    
    let changed = false;
    const nextNodes = currentNodes.map((n) => {
        const up = (n.reporting?.up || "").trim();
        const dual = (n.reporting?.dual || "").trim();
        if (up !== t && dual !== t) return n;
        
        changed = true;
        const reporting = { ...(n.reporting || { up: "", down: "", dual: "" }) };
        if (up === t) reporting.up = "";
        if (dual === t) reporting.dual = "";
        return { ...n, reporting, updatedAt: safeNowISO() };
    });
    
    return changed ? nextNodes : currentNodes;
};

export default function App() {
  const [selectedBU, setSelectedBU] = useState("ALL");
  const [viewMode, setViewMode] = useState<"hierarchy" | "chart" | "analysis" | "timesheet">("hierarchy");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editNode, setEditNode] = useState<OrgNode | null>(null);
  const [bulkMixGrade, setBulkMixGrade] = useState<Grade | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [zoom, setZoom] = useState(1);

  const [dirty, setDirty] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [backendStatus, setBackendStatus] = useState<SyncResult | null>(null);

  const [printNodes, setPrintNodes] = useState<OrgNode[] | null>(null);
  const [printGeneratedAt, setPrintGeneratedAt] = useState<string | null>(null);

  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

  const logAction = useCallback((action: string, detail = "") => {
    const entry = { id: generateId(), at: safeNowISO(), action, detail };
    setActivityLog((prev) => [entry, ...prev].slice(0, 20));
  }, []);

  const [nodes, setNodes] = useState<OrgNode[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedNodes();
    const parsed = safeParseJSON(raw);
    const migrated = migrateToV4(parsed);
    return migrated?.data?.nodes?.length ? migrated.data.nodes : seedNodes();
  });

  const backendBadge = useMemo(() => {
    if (!backendStatus) return null;
    if (backendStatus.skipped) return { text: "Backend sync off", cls: "text-slate-400" };
    if (backendStatus.ok) return { text: "Backend synced", cls: "text-emerald-600" };
    return { text: "Backend sync failed", cls: "text-rose-600" };
  }, [backendStatus]);

  const visibleForBU = useCallback(
    (n: OrgNode) => {
      if (selectedBU === "ALL") return true;
      // Always show Board/CMD
      if (n.grade === "G7") return true;
      // For G6 (Group Leadership/Sector Heads):
      // Show if they belong to GL (likely common parents) OR the selected BU.
      // Hide G6s from OTHER specialized BUs to prevent "extra roots" in the chart.
      if (n.grade === "G6") {
          return n.buName === "GL" || n.buName === selectedBU;
      }
      return n.buName === selectedBU;
    },
    [selectedBU]
  );

  const allRoleTitles = useMemo(() => nodes.map((n) => n.title), [nodes]);
  const activeNodes = useMemo(() => nodes.filter((n) => !n.archived && visibleForBU(n)), [nodes, visibleForBU]);

  useEffect(() => {
    setDirty(true);
    const timer = setTimeout(async () => {
      setIsAutosaving(true);
      const store: StoreData = { version: STORE_VERSION, updatedAt: safeNowISO(), data: { nodes } };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      } catch {}
      const res = await syncToBackend(store);
      setBackendStatus(res);
      setDirty(false);
      setTimeout(() => setIsAutosaving(false), 350);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [nodes]);

  useEffect(() => {
    if (!printNodes) return;
    
    // Wait for the render to complete
    const raf = requestAnimationFrame(() => {
        const element = document.getElementById('print-report-content');
        if (element) {
          const opt = {
            margin:       0.4,
            filename:     `rodic-report-${selectedBU}-${safeNowISO().slice(0,10)}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 3, useCORS: true }, // Increased scale for quality
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
          };
          
          const html2pdf = (window as any).html2pdf;
          if (html2pdf) {
            html2pdf().set(opt).from(element).save().then(() => {
               setPrintNodes(null);
               setPrintGeneratedAt(null);
            }).catch((err: any) => {
               console.error("PDF Export failed", err);
               alert("Failed to generate PDF");
               setPrintNodes(null);
            });
          } else {
            console.error("html2pdf library not found");
            alert("PDF library not loaded");
            setPrintNodes(null);
          }
        }
    });

    return () => cancelAnimationFrame(raf);
  }, [printNodes, selectedBU]);

  const exportPDF = useCallback(
    (scopeNodes: OrgNode[]) => {
      setPrintGeneratedAt(safeNowISO());
      setPrintNodes(scopeNodes);
      logAction("Download Report", `Rows: ${scopeNodes.length}`);
    },
    [logAction]
  );

  const downloadOrganogram = useCallback(async () => {
    const element = document.getElementById('org-chart-content');
    if (!element) {
        alert("Chart content not found.");
        return;
    }

    const previousZoom = zoom;
    setZoom(1);
    await new Promise(resolve => setTimeout(resolve, 300));

    const width = element.scrollWidth + 100;
    const height = element.scrollHeight + 100;

    const opt = {
      margin:       20,
      filename:     `rodic-organogram-${selectedBU}-${safeNowISO().slice(0,10)}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { 
        scale: 3,
        useCORS: true,
        width: width,
        height: height
      },
      jsPDF: { 
        unit: 'px', 
        format: [width, height],
        orientation: width > height ? 'landscape' : 'portrait' 
      }
    };

    const html2pdf = (window as any).html2pdf;
    if (html2pdf) {
        logAction("Download Organogram", `BU: ${selectedBU}`);
        try {
          await html2pdf().set(opt).from(element).save();
        } catch(err) {
            console.error("Organogram Export failed", err);
            alert("Failed to generate Organogram PDF");
        } finally {
          setZoom(previousZoom);
        }
    } else {
        alert("PDF library not loaded");
        setZoom(previousZoom);
    }
  }, [selectedBU, logAction, zoom]);

  const patchNode = useCallback(
    (updated: OrgNode) => {
      setNodes((prev) => prev.map((n) => (n.id === updated.id ? { ...updated, updatedAt: safeNowISO() } : n)));
      logAction("Edit role", updated.title);
    },
    [logAction]
  );
  
  const bulkUpdateMix = useCallback((grade: Grade, mix: WorkMix) => {
    setNodes(prev => prev.map(n => {
        if (n.grade !== grade || n.archived) return n;
        return { ...n, workMix: mix, updatedAt: safeNowISO() };
    }));
    logAction("Bulk Mix Update", `Applied to ${grade}`);
    setBulkMixGrade(null);
  }, [logAction]);

  const addRole = useCallback(() => {
    const grade = "G4";
    const now = safeNowISO();
    const node: OrgNode = {
      id: generateId(),
      grade,
      level: getDefaultLevel(grade),
      title: "New Role Title",
      buName: selectedBU === "ALL" ? "GL" : selectedBU,
      tierLabel: "Standard",
      purpose: "",
      archetype: "Standard",
      roles: [],
      incumbentName: "",
      kpi: [],
      reporting: { up: "", down: "", dual: "" },
      accountability: "",
      yoe: "3–5 yrs",
      ctc: "Standard",
      workMix: defaultMixForGrade(grade),
      costObject: "Project",
      chargeRule: "Direct",
      location: "tier",
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    setNodes((prev) => [node, ...prev]);
    setEditNode(node);
    logAction("Add role", `${node.title} (${node.grade})`);
  }, [selectedBU, logAction]);

  const addChildRole = useCallback((parentId: string, parentTitle: string) => {
    const grade = "G4";
    const now = safeNowISO();
    const node: OrgNode = {
      id: generateId(),
      grade,
      level: getDefaultLevel(grade),
      title: "New Role Title",
      buName: selectedBU === "ALL" ? "GL" : selectedBU,
      tierLabel: "Standard",
      purpose: "",
      archetype: "Standard",
      roles: [],
      incumbentName: "",
      kpi: [],
      reporting: { up: parentTitle, down: "", dual: "" },
      accountability: "",
      yoe: "3–5 yrs",
      ctc: "Standard",
      workMix: defaultMixForGrade(grade),
      costObject: "Project",
      chargeRule: "Direct",
      location: "tier",
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    setNodes((prev) => [node, ...prev]);
    setEditNode(node);
    logAction("Add child role", `Under ${parentTitle}`);
  }, [selectedBU, logAction]);

  const duplicateRole = useCallback(
    (node: OrgNode) => {
      const now = safeNowISO();
      const copy = { ...node, id: generateId(), title: `${node.title} (Copy)`, createdAt: now, updatedAt: now };
      setNodes((prev) => [copy, ...prev]);
      logAction("Duplicate role", copy.title);
    },
    [logAction]
  );

  const archiveRole = useCallback(
    (node: OrgNode) => {
      if (!window.confirm(`Archive role "${node.title}"?`)) return;
      
      setNodes((prev) => {
          // 1. Clean references first
          let next = cleanReferences(prev, node.title);
          // 2. Archive the node
          next = next.map((n) => (n.id === node.id ? { ...n, archived: true, updatedAt: safeNowISO() } : n));
          return next;
      });

      logAction("Archive role", node.title);
      setEditNode(null);
    },
    [logAction]
  );

  const restoreRole = useCallback(
    (node: OrgNode) => {
      setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, archived: false, updatedAt: safeNowISO() } : n)));
      logAction("Restore role", node.title);
    },
    [logAction]
  );

  const deleteHard = useCallback(
    (node: OrgNode) => {
      if (!window.confirm(`Delete permanently "${node.title}"? This cannot be undone.`)) return;
      
      setNodes((prev) => {
          // 1. Clean references
          let next = cleanReferences(prev, node.title);
          // 2. Remove the node
          next = next.filter((n) => n.id !== node.id);
          return next;
      });

      logAction("Delete role (hard)", node.title);
      setEditNode(null);
    },
    [logAction]
  );

  const handleNodeAction = useCallback(
    (action: string, node: OrgNode) => {
      if (action === "edit") return setEditNode(node);
      if (action === "duplicate") return duplicateRole(node);
      if (action === "archive") return archiveRole(node);
      if (action === "restore") return restoreRole(node);
      if (action === "delete") return deleteHard(node);
    },
    [duplicateRole, archiveRole, restoreRole, deleteHard]
  );

  const moveNodeToGrade = useCallback(
    (nodeId: string, grade: Grade, level?: string) => {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== nodeId) return n;
          const location = isTierGrade(grade) ? "tier" : `track:${trackIdFromGrade(grade)}`;
          return { ...n, grade, level: level || getDefaultLevel(grade) || n.level, location, updatedAt: safeNowISO() };
        })
      );
      logAction("Move role", `→ ${GRADE_STYLES[grade]?.label || grade} ${level ? `(${level})` : ''}`);
    },
    [logAction]
  );

  const handleDropToSection = useCallback(
    (e: React.DragEvent, sectionKey: string) => {
      const nodeId = e.dataTransfer.getData("nodeId") || e.dataTransfer.getData("draggedId");
      if (!nodeId) return;
      moveNodeToGrade(nodeId, sectionKey as Grade);
    },
    [moveNodeToGrade]
  );
  
  const handleDropToLevel = useCallback(
    (e: React.DragEvent, sectionKey: string, level: string) => {
      e.stopPropagation(); // Prevent duplicate drop event on parent
      const nodeId = e.dataTransfer.getData("nodeId") || e.dataTransfer.getData("draggedId");
      if (!nodeId) return;
      moveNodeToGrade(nodeId, sectionKey as Grade, level);
    },
    [moveNodeToGrade]
  );

  const handleStructureChange = useCallback(
    (draggedId: string, newParentTitle: string, isMatrix: boolean) => {
      const parentTitle = (newParentTitle || "").trim();
      if (!parentTitle) return;
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== draggedId) return n;
          const reporting = { ...(n.reporting || { up: "", down: "", dual: "" }) };
          if (isMatrix) reporting.dual = parentTitle;
          else reporting.up = parentTitle;
          return { ...n, reporting, updatedAt: safeNowISO() };
        })
      );
      logAction("Update reporting", `${isMatrix ? "Dual →" : "Reports To →"} ${parentTitle}`);
    },
    [logAction]
  );

  const exportCSV = useCallback(() => {
    const csv = toCSV(activeNodes);
    downloadFile(csv, `rodic_org_export_${safeNowISO().slice(0, 10)}.csv`, "text/csv;charset=utf-8;");
    logAction("Export CSV", `Rows: ${activeNodes.length}`);
  }, [activeNodes, logAction]);

  const importCSVText = useCallback(
    (csvText: string) => {
      try {
        const rows = parseCSV(csvText);
        if (!rows.length) throw new Error("Empty CSV");
        const header = rows[0].map((h) => (h || "").trim());
        const idx = (name: string) => header.findIndex((h) => h === name);
        const required = ["grade", "title", "buName"];
        for (const r of required) if (idx(r) < 0) throw new Error(`Missing column: ${r}`);
        const next: OrgNode[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length < 3) continue;
          const grade = ((r[idx("grade")] || "G1").trim() || "G1") as Grade;
          const title = (r[idx("title")] || "").trim();
          const buName = (r[idx("buName")] || "GL").trim() || "GL";
          if (!title) continue;
          next.push({
            id: (r[idx("id")] || "").trim() || generateId(),
            archived: String(r[idx("archived")] || "").toLowerCase() === "true",
            grade,
            level: (r[idx("level")] || "").trim() || getDefaultLevel(grade),
            title,
            buName,
            incumbentName: (r[idx("incumbentName")] || "").trim(),
            reporting: {
              up: (r[idx("reportsToUp")] || "").trim(),
              dual: (r[idx("reportsToDual")] || "").trim(),
              down: (r[idx("responsibleForDown")] || "").trim(),
            },
            workMix: { strategic: 0, tactical: 0, operational: 0, admin: 0 },
            ctc: (r[idx("ctc")] || "").trim(),
            yoe: (r[idx("yoe")] || "").trim(),
            chargeRule: (r[idx("chargeRule")] || "Direct").trim(),
            costObject: (r[idx("costObject")] || "Project").trim(),
            roles: String(r[idx("roles")] || "").split("|").map((s) => s.trim()).filter(Boolean),
            kpi: String(r[idx("kpi")] || "").split("|").map((s) => s.trim()).filter(Boolean),
            purpose: (r[idx("purpose")] || "").trim(),
            accountability: (r[idx("accountability")] || "").trim(),
            archetype: "Standard",
            tierLabel: "Imported",
            location: isTierGrade(grade) ? "tier" : `track:${trackIdFromGrade(grade)}`,
            createdAt: safeNowISO(),
            updatedAt: safeNowISO(),
          });
        }
        if (!next.length) throw new Error("No valid rows found.");
        setNodes(next);
        logAction("Import CSV", `Rows: ${next.length}`);
        alert(`Imported ${next.length} roles successfully.`);
      } catch (e: any) {
        alert(`CSV import failed: ${String(e.message || e)}`);
      }
    },
    [logAction]
  );

  const exportJSONBackup = useCallback(() => {
    const store = { version: STORE_VERSION, exportedAt: safeNowISO(), data: { nodes } };
    downloadFile(JSON.stringify(store, null, 2), `rodic_org_backup_${safeNowISO().slice(0, 10)}.json`, "application/json");
    logAction("Export JSON backup", `Rows: ${nodes.length}`);
  }, [nodes, logAction]);

  const importJSONBackup = useCallback(
    (jsonText: string) => {
      try {
        const parsed = safeParseJSON(jsonText);
        if (!parsed) throw new Error("Invalid JSON");
        const migrated = migrateToV4(parsed);
        const next = migrated?.data?.nodes;
        if (!Array.isArray(next) || !next.length) throw new Error("Invalid backup structure.");
        setNodes(next);
        logAction("Restore JSON backup", `Rows: ${next.length}`);
        alert("Backup restored successfully.");
      } catch (e: any) {
        alert(`Invalid JSON backup: ${String(e.message || e)}`);
      }
    },
    [logAction]
  );

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ grade: "" });
  const [columns, setColumns] = useState({ ...DEFAULT_COLUMNS });
  const [showArchived, setShowArchived] = useState(false);

  const visibleNodes = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    return nodes.filter((n) => {
      if (!showArchived && n.archived) return false;
      if (!visibleForBU(n)) return false;
      if (filters.grade && n.grade !== filters.grade) return false;
      if (!q) return true;
      const blob = [
        n.title, n.incumbentName, n.buName, n.grade, n.level,
        (n.kpi || []).join(" "), (n.roles || []).join(" "),
        n.reporting?.up, n.reporting?.dual, n.reporting?.down,
        n.purpose, n.accountability,
      ].join(" | ").toLowerCase();
      return blob.includes(q);
    });
  }, [nodes, showArchived, visibleForBU, search, filters]);

  const grouped = useMemo(() => {
    const by: Record<string, OrgNode[]> = { G7: [], G6: [], G5: [], G4: [], G3: [], G2: [], G1: [] };
    for (const n of visibleNodes) by[n.grade]?.push(n);
    for (const k of Object.keys(by)) by[k].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    return by;
  }, [visibleNodes]);

  const onExportPDF = useCallback(() => exportPDF(activeNodes), [exportPDF, activeNodes]);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const handleJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => importJSONBackup(String(evt.target?.result || ""));
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
      {printNodes && <PrintReport nodes={printNodes} selectedBU={selectedBU} generatedAtISO={printGeneratedAt || safeNowISO()} />}

      <div className={`${isSidebarCollapsed ? "w-20" : "w-64"} bg-slate-900 flex-shrink-0 flex flex-col justify-between transition-all duration-300 print:hidden z-20 shadow-xl relative`}>
        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="absolute -right-3 top-20 bg-indigo-600 text-white p-1 rounded-full shadow-lg hover:bg-indigo-700 z-50">
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <div>
          <div className={`h-16 flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-start px-6"} border-b border-slate-800 transition-all`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-900/50">R</div>
            {!isSidebarCollapsed && <span className="ml-3 font-black text-white tracking-wider">RODIC<span className="text-indigo-400">ORG</span></span>}
          </div>
          <div className="p-4 space-y-2">
            {!isSidebarCollapsed && <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Business Units</div>}
            {BUSINESS_UNITS.map((bu) => {
              const style = BU_CLASS[bu.color];
              const isActive = selectedBU === bu.id;
              const Icon = BU_ICONS[bu.id] || Activity;
              return (
                <button
                  key={bu.id}
                  onClick={() => setSelectedBU(bu.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200 group relative ${isActive ? style.active : "text-slate-400 hover:bg-slate-800 hover:text-white"} ${isSidebarCollapsed ? "justify-center" : ""}`}
                >
                  <Icon size={isSidebarCollapsed ? 20 : 16} className={isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"} />
                  {!isSidebarCollapsed && <div className="text-left"><div className="text-xs font-bold">{bu.label}</div></div>}
                  
                  {isSidebarCollapsed && (
                    <div className="absolute left-16 top-0 bg-slate-800 text-white text-xs px-2 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none shadow-xl border border-slate-700 font-bold">
                      {bu.label}
                      <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-slate-800"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-4 border-t border-slate-800">
          <div className={`mt-1 flex items-center gap-3 px-2 ${isSidebarCollapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-400 to-orange-400 border-2 border-slate-800 shadow-md flex items-center justify-center">
               <Users size={14} className="text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-300" /> HR Admin</div>
                <div className="text-[10px] text-slate-500">Edit Enabled</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 relative">
        <div className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6 flex-shrink-0 z-30 print:hidden">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-black text-slate-800 tracking-tight hidden md:block">Organization Manager</h1>
            <div className="h-6 w-px bg-slate-200 hidden md:block" />
            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
              {[
                { id: "hierarchy", icon: Layout, label: "Hierarchy" },
                { id: "chart", icon: Network, label: "Org Chart" },
                { id: "analysis", icon: PieChart, label: "Analysis" },
                { id: "timesheet", icon: Clock, label: "Timesheets" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id as any)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === mode.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <mode.icon size={14} />
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              {isAutosaving ? (
                <>
                  <Loader2 size={12} className="animate-spin text-indigo-500" />
                  <span className="text-indigo-600">Autosaving…</span>
                </>
              ) : (
                <>
                  <Cloud size={12} />
                  <span>{dirty ? "Pending save" : "Saved locally"}</span>
                </>
              )}
              {backendBadge && <span className={`ml-2 ${backendBadge.cls}`}>• {backendBadge.text}</span>}
            </div>

            <input ref={jsonInputRef} type="file" className="hidden" accept=".json" onChange={handleJsonFile} />
            <button onClick={() => jsonInputRef.current?.click()} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600" title="Restore Backup (JSON)">
              <FileUp size={18} />
            </button>
            <button onClick={exportJSONBackup} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-600" title="Save Backup (JSON)">
              <FileDown size={18} />
            </button>
            <button onClick={addRole} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md">
              <Plus size={14} /> Add Role
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {viewMode === "hierarchy" && (
            <div className="pb-20 print:hidden">
              <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm px-6 py-4 mb-6">
                <div className="flex flex-col gap-4 max-w-7xl mx-auto">
                  <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                    <div className="flex-1 flex items-center gap-2 bg-slate-100/80 border border-slate-200/50 hover:border-slate-300 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50/50 rounded-xl px-3 py-2.5 transition-all max-w-lg shadow-inner">
                      <Search size={16} className="text-slate-400" />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search roles, incumbents, KPIs..." className="w-full bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400" />
                      {search.length > 0 && (
                        <button onClick={() => setSearch("")} className="p-1 rounded hover:bg-slate-200 text-slate-500">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2 justify-end items-center flex-wrap">
                      <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hidden sm:inline ml-1">Grade:</span>
                        <select value={filters.grade || "ALL"} onChange={(e) => setFilters({ ...filters, grade: e.target.value === "ALL" ? "" : e.target.value })} className="text-xs font-bold bg-transparent text-slate-700 outline-none cursor-pointer hover:text-indigo-600 transition-colors">
                          <option value="ALL">All</option>
                          {Object.keys(GRADE_STYLES).sort().reverse().map((g) => (
                            <option key={g} value={g}>{GRADE_STYLES[g].label} ({g})</option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700">
                        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
                      </label>
                      <button onClick={onExportPDF} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-sm flex items-center gap-2"><Printer size={14} /> Download PDF</button>
                      <button onClick={exportCSV} className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-sm flex items-center gap-2"><Download size={14} /> CSV</button>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-2">Showing {visibleNodes.length} roles</div>
                    </div>
                  </div>
                  <div className="flex flex-col xl:flex-row gap-4 xl:items-start justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Layout size={14} className="text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Columns</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.keys(DEFAULT_COLUMNS).map((k) => (
                          <button
                            key={k}
                            onClick={() => setColumns((prev) => ({ ...prev, [k]: !prev[k as keyof typeof DEFAULT_COLUMNS] }))}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border transition-all ${columns[k as keyof typeof DEFAULT_COLUMNS] ? "bg-slate-800 text-white border-slate-800 shadow-sm" : "bg-transparent text-slate-400 border-transparent hover:bg-slate-100"}`}
                          >
                            {COLUMN_LABELS[k as keyof typeof COLUMN_LABELS]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tip: Drag roles between grade sections • Use Org Chart to set reporting • Shift+Drop sets dual reporting</div>
                  </div>
                </div>
              </div>
              <div className="space-y-12 px-6 max-w-7xl mx-auto">
                {[
                  { g: "G7", title: "Board / CMD", sub: "Strategic Vision & Governance", badge: "bg-slate-900" },
                  { g: "G6", title: "Group Leadership", sub: "Enterprise Wide • Strategic Direction", badge: "bg-slate-800" },
                  { g: "G5", title: "Senior Management", sub: "P&L Ownership", badge: "bg-indigo-700" },
                  { g: "G4", title: "Mid Management", sub: "Operational Excellence", badge: "bg-blue-600" },
                  { g: "G3", title: "Lead", sub: "Team Leads & PMs", badge: "bg-sky-500" },
                  { g: "G2", title: "Specialists", sub: "SMEs & Experts", badge: "bg-teal-500" },
                  { g: "G1", title: "Associates", sub: "Execution & Support", badge: "bg-slate-400" },
                ].map((sec) => {
                    const gradeNodes = grouped[sec.g] || [];
                    const levels = GRADE_LEVELS[sec.g];

                    return (
                        <TierSection
                            key={sec.g}
                            title={`${sec.title} (${sec.g})`}
                            subtitle={sec.sub}
                            badge={<Badge cls={`${sec.badge} text-white`}>{sec.g}</Badge>}
                            onAdd={addRole}
                            onDrop={handleDropToSection}
                            onBulkEdit={() => setBulkMixGrade(sec.g as Grade)}
                            targetKey={sec.g}
                        >
                            {/* If Grade has Levels, render grouped sub-sections */}
                            {levels ? (
                                <div className="space-y-6">
                                    {levels.map(level => {
                                        const levelNodes = gradeNodes.filter(n => n.level === level || (!n.level && level === levels[levels.length - 1]));
                                        return (
                                            <TierLevelGroup
                                              key={level}
                                              level={level}
                                              grade={sec.g}
                                              nodes={levelNodes}
                                              onDrop={handleDropToLevel}
                                              expandedId={expandedId}
                                              onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                                              onAction={handleNodeAction}
                                              columns={columns}
                                            />
                                        );
                                    })}
                                    {/* Handle nodes with invalid levels */}
                                    {gradeNodes.some(n => n.level && !levels.includes(n.level)) && (
                                        <div className="opacity-70 grayscale">
                                            <div className="text-xs font-bold text-rose-500 mb-2">Unassigned Levels</div>
                                            {gradeNodes.filter(n => n.level && !levels.includes(n.level)).map(n => (
                                                <NodeRow key={n.id} data={n} isExpanded={expandedId === n.id} onToggle={() => setExpandedId(expandedId === n.id ? null : n.id)} onAction={handleNodeAction} columns={columns} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Standard non-tiered rendering
                                gradeNodes.map((n) => (
                                    <NodeRow
                                        key={n.id}
                                        data={n}
                                        isExpanded={expandedId === n.id}
                                        onToggle={() => setExpandedId(expandedId === n.id ? null : n.id)}
                                        onAction={handleNodeAction}
                                        columns={columns}
                                    />
                                ))
                            )}
                        </TierSection>
                    );
                })}
                {visibleNodes.length === 0 && (
                  <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                    <Search size={48} className="text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-500">No Roles Found</h3>
                    <p className="text-sm text-slate-400">Try adjusting filters or search terms.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {viewMode === "chart" && (
            <div className="p-6 h-full flex flex-col print:hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{selectedBU === "ALL" ? "Enterprise Org Chart" : `${selectedBU} Org Chart`}</h2>
                  <p className="text-sm text-slate-500">Drag & Drop to restructure reporting. Shift+Drop sets dual reporting.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 mr-2 shadow-sm">
                      <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-1.5 rounded hover:bg-slate-100 text-slate-600" title="Zoom Out">
                        <ZoomOut size={16} />
                      </button>
                      <span className="text-xs font-mono font-bold w-12 text-center">{Math.round(zoom * 100)}%</span>
                      <button onClick={() => setZoom(z => Math.min(2.0, z + 0.1))} className="p-1.5 rounded hover:bg-slate-100 text-slate-600" title="Zoom In">
                        <ZoomIn size={16} />
                      </button>
                      <button onClick={() => setZoom(1)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600 border-l border-slate-100 ml-1" title="Reset Zoom">
                        <Maximize size={16} />
                      </button>
                    </div>

                    <button onClick={downloadOrganogram} className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-sm flex items-center gap-2">
                        <Network size={14} /> Download Organogram
                    </button>
                    <button onClick={onExportPDF} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-sm flex items-center gap-2">
                        <Printer size={14} /> Download Report
                    </button>
                </div>
              </div>
              <OrgStructureBuilder nodes={activeNodes} onEdit={setEditNode} onStructureChange={handleStructureChange} onAddChild={addChildRole} scale={zoom} />
            </div>
          )}

          {viewMode === "analysis" && (
            <div className="pt-8">
              <AnalysisDashboard
                nodes={activeNodes}
                selectedBU={selectedBU}
                onAddRole={addRole}
                onExportCSV={exportCSV}
                onImportCSVText={importCSVText}
                onExportPDF={onExportPDF}
                activityLog={activityLog}
              />
            </div>
          )}

          {viewMode === "timesheet" && (
            <div className="pt-2">
              <TimesheetDashboard 
                 nodes={activeNodes}
                 selectedBU={selectedBU}
              />
            </div>
          )}
        </div>
      </div>

      <EditNodeModal
        node={editNode}
        isOpen={!!editNode}
        onClose={() => setEditNode(null)}
        onPatch={patchNode}
        onArchive={archiveRole}
        onRestore={restoreRole}
        onDeleteHard={deleteHard}
        buList={BUSINESS_UNITS}
        allRoleTitles={allRoleTitles}
      />

      <BulkWorkMixModal
        grade={bulkMixGrade}
        isOpen={!!bulkMixGrade}
        onClose={() => setBulkMixGrade(null)}
        onSave={bulkUpdateMix}
      />
    </div>
  );
}
