
import React, { useMemo, useState } from 'react';
import { OrgNode, WorkMix } from '../types';
import { normalizeMix } from '../utils';
import { Badge } from './Badge';
import { 
  Clock, CheckCircle2, AlertCircle, Search, X, Calendar, 
  Briefcase, ChevronRight, LayoutList, CheckSquare, ChevronDown, 
  Building, AlertTriangle, XCircle, DollarSign, UserX, Filter,
  PieChart, BarChart3, TrendingUp, Users, ArrowRightCircle, Target,
  FolderOpen, FileText, Hash, Bookmark
} from 'lucide-react';

interface ActivityLogItem {
  id: string;
  timeRange: string; // e.g. "09:00 - 11:30"
  duration: number;
  activity: string;
  category: WorkType;
  project: string;
  costCode: string; // New: Cost Booking Code
  description: string;
  isCVBooking?: boolean; // New: Flag for Intermittent In-house CV
}

interface DailyLog {
  date: string;
  fullDate: string; // YYYY-MM-DD
  totalHours: number;
  items: ActivityLogItem[];
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Holiday' | 'Leave';
}

type WorkType = 'Strategic' | 'Tactical' | 'Operational' | 'Administrative';

interface TimesheetEntry {
  nodeId: string;
  name: string;
  role: string;
  grade: string;
  bu: string;
  status: 'Submitted' | 'Draft' | 'Overdue' | 'Vacant';
  weekEnding: string;
  
  // Project Info
  primaryProject: string;
  primaryCostCode: string;

  // Hours
  totalHours: number;
  billableHours: number;
  cvHours: number; // New: Internal CV hours
  utilization: number;
  
  // Mix
  targetMix: WorkMix;
  actualMix: WorkMix;
  
  // Logs
  dailyLogs: DailyLog[];
}

interface TimesheetDashboardProps {
  nodes: OrgNode[];
  selectedBU: string;
}

const WORK_TYPE_COLORS: Record<WorkType, string> = {
    Strategic: "bg-purple-100 text-purple-700 border-purple-200",
    Tactical: "bg-blue-100 text-blue-700 border-blue-200",
    Operational: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Administrative: "bg-slate-100 text-slate-700 border-slate-200"
};

const STOA_DEFINITIONS: Record<WorkType, string> = {
    Strategic: "Long-term value, Innovation, Planning",
    Tactical: "Process management, Resource alloc, Optimization",
    Operational: "Execution, Delivery, Client interaction",
    Administrative: "Internal compliance, Reporting, Routine"
};

// Activities Library mapped to STOA with In-House CV variants
const ACTIVITIES: Record<WorkType, string[]> = {
    Strategic: ["Q3 Roadmap Planning", "Market Expansion Strategy", "Board Deck Prep", "Innovation Workshop", "Competitor Analysis", "Vision Setting"],
    Tactical: ["Sprint Planning", "Client Negotiation", "Resource Allocation", "Process Optimization", "Code Review", "Architecture Design"],
    Operational: ["Client Meeting", "Development / Coding", "QA Testing", "Site Inspection", "Report Generation", "Customer Support"],
    Administrative: ["Email / Slack", "HR Compliance Training", "Timesheet Entry", "Internal Townhall", "Leave Management", "IT Troubleshooting"]
};

const CV_ACTIVITIES = [
    "Skill Certification Study", "Internal Knowledge Transfer", "Center of Excellence Workshop", 
    "Proposal / Bid Support", "Tech Stack Research", "Mentoring Juniors"
];

// Helper: Generate a week of dates based on a reference date
const getWeekRange = (endDateStr: string) => {
    const end = new Date(endDateStr);
    const start = new Date(end);
    start.setDate(end.getDate() - 4); // Mon-Fri
    
    const dates: { label: string; full: string }[] = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push({
            label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
            full: d.toISOString().split('T')[0]
        });
    }
    return dates;
};

// Helper: Create realistic daily schedule summing to 8.5 hours
const generateDailySchedule = (date: string, mix: WorkMix, seed: number, primaryProject: string, primaryCostCode: string): DailyLog => {
    const isLeave = seed % 20 === 0;
    if (isLeave) {
        return { date, fullDate: date, totalHours: 0, items: [], status: 'Leave' };
    }

    const items: ActivityLogItem[] = [];
    let currentTime = 9 * 60; // 09:00 in minutes
    
    // Break day into 3-4 chunks
    const chunks = [2.5, 2, 2.5, 1.5]; // Standard 8.5h distribution
    
    chunks.forEach((durationHrs, idx) => {
        const durationMins = durationHrs * 60;
        
        // Determine Category based on Mix probability
        const roll = (seed + idx) % 100;
        let category: WorkType = 'Administrative';
        let isCVBooking = false;

        // Logic for Intermittent In-House CV Booking
        // If it falls into Admin/Ops but not primarily billable, treat as CV/Bench time occasionally
        const isIntermittentGap = (idx === 3 && seed % 3 === 0); // Last slot of day, sometimes

        if (roll < mix.strategic) category = 'Strategic';
        else if (roll < mix.strategic + mix.tactical) category = 'Tactical';
        else if (roll < mix.strategic + mix.tactical + mix.operational) category = 'Operational';
        
        // Override for CV Booking
        if (isIntermittentGap) {
            category = 'Operational'; // It is operational work, but internal
            isCVBooking = true;
        }

        // Format Time String
        const startH = Math.floor(currentTime / 60);
        const startM = currentTime % 60;
        const endTime = currentTime + durationMins;
        const endH = Math.floor(endTime / 60);
        const endM = endTime % 60;
        
        const timeStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')} - ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

        // Project & Cost Logic
        let project = primaryProject;
        let costCode = primaryCostCode;
        let activityName = ACTIVITIES[category][(seed + idx) % ACTIVITIES[category].length];

        if (category === 'Administrative') {
            project = 'Internal Admin';
            costCode = 'OVH-100-GEN'; // Overhead
        } else if (isCVBooking) {
            project = 'In-House Capability';
            costCode = 'INT-900-BNCH'; // Internal Bench/CV Code
            activityName = CV_ACTIVITIES[(seed + idx) % CV_ACTIVITIES.length];
        } else if ((seed + idx) % 5 === 0) {
            // Occasional cross-functional project
            project = 'Cross-Func Initiative';
            costCode = 'PRJ-X99-SPL'; 
        }

        items.push({
            id: `log-${seed}-${idx}`,
            timeRange: timeStr,
            duration: durationHrs,
            category,
            project,
            costCode,
            activity: activityName,
            isCVBooking,
            description: isCVBooking 
                ? "Intermittent in-house utilization for skill enhancement." 
                : `Mapped to ${category} workflow.`
        });

        currentTime = endTime;
        // Add lunch break after 2nd chunk
        if (idx === 1) currentTime += 60; 
    });

    return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        fullDate: date,
        totalHours: 8.5,
        items,
        status: 'Submitted'
    };
};

// Main Data Generator
const generateTimesheetData = (nodes: OrgNode[], weekEndingDate: string): TimesheetEntry[] => {
  const dates = getWeekRange(weekEndingDate);

  return nodes
    .filter(n => !n.archived)
    .map((n) => {
      const hasIncumbent = !!n.incumbentName;
      const seed = n.id.charCodeAt(n.id.length - 1) + n.title.length;
      
      // Determine overall status
      let status: TimesheetEntry['status'] = 'Submitted';
      if (!hasIncumbent) status = 'Vacant';
      else if ((seed % 100) > 90) status = 'Overdue';
      else if ((seed % 100) > 80) status = 'Draft';

      const targetMix = normalizeMix(n.workMix);
      const primaryProject = n.costObject || "PRJ-Alpha-001";
      const primaryCostCode = `CC-${(seed % 500) + 1000}`;

      // Generate Daily Logs
      const dailyLogs: DailyLog[] = hasIncumbent ? dates.map((d, i) => {
          // If overdue, days 3-5 are missing
          if (status === 'Overdue' && i > 1) {
              return { date: d.label, fullDate: d.full, totalHours: 0, items: [], status: 'Draft' };
          }
          if (status === 'Draft' && i > 2) {
             return { date: d.label, fullDate: d.full, totalHours: 0, items: [], status: 'Draft' };
          }
          
          return generateDailySchedule(d.full, targetMix, seed + i, primaryProject, primaryCostCode);
      }) : [];

      // Aggregations
      let totalHours = 0;
      let billable = 0;
      let cvHours = 0;
      let strat = 0, tac = 0, ops = 0, admin = 0;

      dailyLogs.forEach(day => {
          totalHours += day.totalHours;
          day.items.forEach(item => {
               if (item.category !== 'Administrative' && !item.isCVBooking) billable += item.duration;
               if (item.isCVBooking) cvHours += item.duration;

               if (item.category === 'Strategic') strat += item.duration;
               if (item.category === 'Tactical') tac += item.duration;
               if (item.category === 'Operational') ops += item.duration;
               if (item.category === 'Administrative') admin += item.duration;
          });
      });

      const utilization = totalHours > 0 ? Math.round((billable / totalHours) * 100) : 0;

      // Actual Mix calc
      const actualMix: WorkMix = totalHours ? {
          strategic: Math.round((strat / totalHours) * 100),
          tactical: Math.round((tac / totalHours) * 100),
          operational: Math.round((ops / totalHours) * 100),
          admin: Math.round((admin / totalHours) * 100),
      } : { strategic: 0, tactical: 0, operational: 0, admin: 0 };

      return {
        nodeId: n.id,
        name: hasIncumbent ? n.incumbentName : "Vacant Position",
        role: n.title,
        grade: n.grade,
        bu: n.buName,
        status,
        weekEnding: weekEndingDate,
        primaryProject,
        primaryCostCode,
        totalHours,
        billableHours: billable,
        cvHours,
        utilization,
        targetMix,
        actualMix,
        dailyLogs
      };
    });
};

const getAlignmentStatus = (target: WorkMix, actual: WorkMix, isVacant: boolean) => {
    if (isVacant) return { label: 'Unfilled', color: 'text-slate-400 bg-slate-50 border-slate-200' };

    const stratDiff = actual.strategic - target.strategic;
    const adminDiff = actual.admin - target.admin;

    if (Math.abs(stratDiff) < 10 && Math.abs(adminDiff) < 10) return { label: 'Aligned', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
    
    if (adminDiff > 15) return { label: 'Admin Overload', color: 'text-rose-600 bg-rose-50 border-rose-100' };
    if (stratDiff < -15) return { label: 'Strategy Deficit', color: 'text-amber-600 bg-amber-50 border-amber-100' };
    if (actual.operational > target.operational + 20) return { label: 'Ops Heavy', color: 'text-blue-600 bg-blue-50 border-blue-100' };
    
    return { label: 'Drifting', color: 'text-slate-500 bg-slate-50 border-slate-200' };
}

const StoaComparison: React.FC<{ target: WorkMix; actual: WorkMix; isVacant: boolean }> = ({ target, actual, isVacant }) => {
    if (isVacant) {
        return (
            <div className="flex flex-col gap-1.5 w-full max-w-[180px] opacity-40">
                <div className="w-full h-3 rounded-sm bg-slate-100 border border-slate-200" />
                <div className="text-[9px] text-slate-400 font-medium italic">No Data</div>
            </div>
        );
    }
    
    // Clearer visualization: Two stacked bars with full labels
    return (
      <div className="flex flex-col gap-2 w-full max-w-[200px]">
         {/* Actual Bar */}
         <div>
            <div className="flex justify-between text-[9px] text-slate-500 font-bold mb-0.5">
                <span>Actual</span>
            </div>
            <div className="w-full h-3 flex rounded-sm overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                <div style={{ width: `${actual.strategic}%` }} className="bg-purple-500" title={`Strategic: ${actual.strategic}%`} />
                <div style={{ width: `${actual.tactical}%` }} className="bg-blue-500" title={`Tactical: ${actual.tactical}%`} />
                <div style={{ width: `${actual.operational}%` }} className="bg-emerald-500" title={`Operational: ${actual.operational}%`} />
                <div style={{ width: `${actual.admin}%` }} className="bg-slate-400" title={`Admin: ${actual.admin}%`} />
            </div>
         </div>
         
         {/* Target Bar */}
         <div>
            <div className="flex justify-between text-[9px] text-slate-400 font-bold mb-0.5">
                <span>Target</span>
            </div>
            <div className="w-full h-3 flex rounded-sm overflow-hidden bg-slate-50 border border-slate-200 opacity-80">
                <div style={{ width: `${target.strategic}%` }} className="bg-purple-400" title={`Target Strat: ${target.strategic}%`} />
                <div style={{ width: `${target.tactical}%` }} className="bg-blue-400" title={`Target Tac: ${target.tactical}%`} />
                <div style={{ width: `${target.operational}%` }} className="bg-emerald-400" title={`Target Ops: ${target.operational}%`} />
                <div style={{ width: `${target.admin}%` }} className="bg-slate-300" title={`Target Admin: ${target.admin}%`} />
            </div>
         </div>
      </div>
    )
}

export const TimesheetDashboard: React.FC<TimesheetDashboardProps> = ({ nodes, selectedBU }) => {
  // State for Filters
  const [weekEnding, setWeekEnding] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Submitted' | 'Overdue' | 'Draft' | 'Vacant'>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [focusFilter, setFocusFilter] = useState<WorkType | 'ALL'>('ALL'); // Filter by Primary STOA
  const [search, setSearch] = useState('');
  
  // UI State
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewLogId, setViewLogId] = useState<string | null>(null);

  // 1. Generate Data based on Date
  const allData = useMemo(() => generateTimesheetData(nodes, weekEnding), [nodes, weekEnding]);

  // 2. Apply Filters
  const filteredData = useMemo(() => {
    return allData.filter(d => {
      // BU Filter
      if (selectedBU !== 'ALL' && d.bu !== selectedBU) return false;
      // Status Filter
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      // Grade Filter
      if (gradeFilter !== 'ALL' && d.grade !== gradeFilter) return false;
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (!d.name.toLowerCase().includes(q) && !d.role.toLowerCase().includes(q)) return false;
      }
      // Focus Filter (Primary Work Type)
      if (focusFilter !== 'ALL') {
         const m = d.actualMix;
         const primary = Object.keys(m).reduce((a, b) => m[a as keyof WorkMix] > m[b as keyof WorkMix] ? a : b);
         // Map lowercase keys to Capitalized WorkType
         const primaryType = primary.charAt(0).toUpperCase() + primary.slice(1);
         if (primaryType !== focusFilter) return false;
      }
      return true;
    });
  }, [allData, selectedBU, statusFilter, gradeFilter, focusFilter, search]);

  // 3. Compute Company Pulse (Aggregates)
  const pulse = useMemo(() => {
     const filled = filteredData.filter(d => d.status !== 'Vacant');
     const count = filled.length || 1;
     
     // Top Projects
     const projectCounts: Record<string, number> = {};
     filled.forEach(d => {
         const p = d.primaryProject || 'Unassigned';
         projectCounts[p] = (projectCounts[p] || 0) + d.totalHours;
     });
     
     const topProjects = Object.entries(projectCounts)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, hours]) => ({ name, hours }));

     // Avg Mix
     const avgMix: WorkMix = {
         strategic: Math.round(filled.reduce((acc, d) => acc + d.actualMix.strategic, 0) / count),
         tactical: Math.round(filled.reduce((acc, d) => acc + d.actualMix.tactical, 0) / count),
         operational: Math.round(filled.reduce((acc, d) => acc + d.actualMix.operational, 0) / count),
         admin: Math.round(filled.reduce((acc, d) => acc + d.actualMix.admin, 0) / count),
     };

     return { avgMix, count, topProjects };
  }, [filteredData]);

  const toggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id);
  const selectedLogEntry = viewLogId ? allData.find(d => d.nodeId === viewLogId) : null;

  return (
    <div className="max-w-7xl mx-auto px-6 pb-20 pt-6 font-sans">
      
      {/* HEADER */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Clock className="text-indigo-600" />
                Timesheet & Work Analysis
            </h2>
            <p className="text-sm text-slate-500 mt-1">
                Cost booking, In-House CV tracking, and STOA alignment.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
              <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-500 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Billable
                  <div className="w-2 h-2 rounded-full bg-amber-400 ml-2"></div> In-House CV
                  <div className="w-2 h-2 rounded-full bg-slate-300 ml-2"></div> Admin
              </div>
          </div>
      </div>

      {/* STOA LEGEND */}
      <div className="mb-6 bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex flex-wrap gap-4 md:gap-8 justify-center">
          {(Object.keys(STOA_DEFINITIONS) as WorkType[]).map(type => (
              <div key={type} className="flex items-center gap-2">
                  <Badge cls={`${WORK_TYPE_COLORS[type]} uppercase tracking-wider`}>{type}</Badge>
                  <span className="text-[10px] text-slate-600 font-medium">{STOA_DEFINITIONS[type]}</span>
              </div>
          ))}
      </div>

      {/* COMPANY PULSE SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* 1. Work Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
             <div className="flex justify-between items-start mb-4">
                <div className="z-10">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Company Work Pulse</div>
                    <div className="text-xl font-black text-slate-900 mt-1">Where are we working?</div>
                    <div className="text-xs text-slate-500">Aggregated from {pulse.count} roles</div>
                </div>
                <PieChart className="text-slate-100 absolute -right-4 -top-4" size={100} />
             </div>
             <div className="space-y-3 relative z-10">
                 {/* Progress Bars for Pulse */}
                 <div className="space-y-1">
                     <div className="flex justify-between text-[10px] font-bold text-slate-600"><span>Strategic</span> <span>{pulse.avgMix.strategic}%</span></div>
                     <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden"><div style={{width: `${pulse.avgMix.strategic}%`}} className="h-full bg-purple-500"/></div>
                 </div>
                 <div className="space-y-1">
                     <div className="flex justify-between text-[10px] font-bold text-slate-600"><span>Tactical</span> <span>{pulse.avgMix.tactical}%</span></div>
                     <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden"><div style={{width: `${pulse.avgMix.tactical}%`}} className="h-full bg-blue-500"/></div>
                 </div>
                 <div className="space-y-1">
                     <div className="flex justify-between text-[10px] font-bold text-slate-600"><span>Operational</span> <span>{pulse.avgMix.operational}%</span></div>
                     <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden"><div style={{width: `${pulse.avgMix.operational}%`}} className="h-full bg-emerald-500"/></div>
                 </div>
             </div>
          </div>

          {/* 2. Project Allocation */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
             <div className="flex justify-between items-start mb-6">
                <div className="z-10">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Top Projects (Hours)</div>
                    <div className="text-xl font-black text-slate-900 mt-1">Project Mapping</div>
                    <div className="text-xs text-slate-500">Highest effort allocation this week</div>
                </div>
                <Briefcase className="text-slate-100 absolute -right-4 -top-4" size={100} />
             </div>
             <div className="space-y-4 relative z-10 border-t border-slate-100 pt-4">
                 {pulse.topProjects.length > 0 ? pulse.topProjects.map((p, i) => (
                     <div key={i} className="flex justify-between items-center">
                         <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                 {i + 1}
                             </div>
                             <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{p.name}</span>
                         </div>
                         <span className="text-xs font-mono font-bold text-slate-500">{p.hours.toFixed(0)}h</span>
                     </div>
                 )) : (
                     <div className="text-xs text-slate-400 italic">No project data available</div>
                 )}
             </div>
          </div>

          {/* 3. Filter Context */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg text-white relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Filters</div>
                  <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm border-b border-slate-700 pb-2">
                          <span className="text-slate-400">Week Ending</span>
                          <span className="font-bold font-mono">{weekEnding}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm border-b border-slate-700 pb-2">
                          <span className="text-slate-400">Business Unit</span>
                          <span className="font-bold">{selectedBU === 'ALL' ? 'Entire Org' : selectedBU}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Showing</span>
                          <span className="font-bold text-emerald-400">{filteredData.length} Roles</span>
                      </div>
                  </div>
              </div>
              <Filter className="text-slate-800 absolute -right-4 -bottom-4" size={120} />
          </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
        
        {/* Date Picker */}
        <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold uppercase text-slate-400">Week Ending</label>
            <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input 
                    type="date" 
                    value={weekEnding}
                    onChange={(e) => setWeekEnding(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
                />
            </div>
        </div>

        <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

        {/* Grade Filter */}
        <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold uppercase text-slate-400">Grade</label>
            <select 
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="pl-2 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
            >
                <option value="ALL">All Grades</option>
                {['G7','G6','G5','G4','G3','G2','G1'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
        </div>

        {/* Focus Filter */}
        <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold uppercase text-slate-400">Primary Focus</label>
            <select 
                value={focusFilter}
                onChange={(e) => setFocusFilter(e.target.value as any)}
                className="pl-2 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
            >
                <option value="ALL">All Work Types</option>
                <option value="Strategic">Strategic</option>
                <option value="Tactical">Tactical</option>
                <option value="Operational">Operational</option>
                <option value="Administrative">Administrative</option>
            </select>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-col gap-1 flex-1 min-w-[300px]">
             <label className="text-[9px] font-bold uppercase text-slate-400">Status</label>
             <div className="flex gap-1">
                {(['ALL', 'Submitted', 'Draft', 'Overdue', 'Vacant'] as const).map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            statusFilter === s 
                            ? 'bg-slate-800 text-white shadow-md' 
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        {s}
                    </button>
                ))}
             </div>
        </div>

        {/* Search */}
        <div className="flex flex-col gap-1 w-full md:w-auto">
             <label className="text-[9px] font-bold uppercase text-slate-400">Search</label>
             <div className="relative w-full md:w-48">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Role or Name..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
                />
            </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
         <div className="bg-slate-50 border-b border-slate-200 grid grid-cols-12 gap-4 px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider sticky top-0 z-20">
             <div className="col-span-4">Employee / Role</div>
             <div className="col-span-2 text-right">Hours (Wk)</div>
             <div className="col-span-3">Work Mix (Actual vs Target)</div>
             <div className="col-span-1">Alignment</div>
             <div className="col-span-2 text-right">Actions</div>
         </div>

         <div className="divide-y divide-slate-100 overflow-y-auto">
             {filteredData.length === 0 ? (
                 <div className="p-10 text-center text-slate-400">
                     <Filter size={48} className="mx-auto mb-2 opacity-20"/>
                     <p className="font-bold">No records found matching filters</p>
                 </div>
             ) : filteredData.map(entry => {
                 const isExpanded = expandedId === entry.nodeId;
                 const isVacant = entry.status === 'Vacant';
                 const alignment = getAlignmentStatus(entry.targetMix, entry.actualMix, isVacant);
                 
                 return (
                    <div key={entry.nodeId} className="group transition-all hover:bg-indigo-50/30">
                        {/* Row Header */}
                        <div 
                            onClick={() => toggleExpand(entry.nodeId)}
                            className={`grid grid-cols-12 gap-4 px-4 py-3 items-center cursor-pointer border-l-4 transition-all ${isExpanded ? 'border-l-indigo-500 bg-indigo-50/50' : 'border-l-transparent'}`}
                        >
                            <div className="col-span-4 flex items-center gap-3">
                                <div className={`p-1 rounded-md transition-colors ${isExpanded ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-400 group-hover:bg-white'}`}>
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </div>
                                <div>
                                    <div className={`font-bold text-sm flex items-center gap-2 ${isVacant ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                                        {isVacant && <UserX size={14} />}
                                        {entry.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-medium flex gap-1 mt-0.5">
                                        <span className="bg-slate-100 px-1.5 rounded border border-slate-200">{entry.grade}</span>
                                        <span className="truncate max-w-[180px]" title={entry.role}>{entry.role}</span>
                                        <span className="text-slate-300">•</span>
                                        <span>{entry.bu}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-2 text-right">
                                <div className={`font-mono text-sm font-bold ${isVacant ? 'text-slate-300' : 'text-slate-700'}`}>{entry.totalHours.toFixed(1)}h</div>
                                <div className="text-[10px]">
                                    {!isVacant && entry.billableHours > 0 ? (
                                        <span className="text-emerald-600 font-bold">{entry.utilization}% Billable</span>
                                    ) : <span className="text-slate-300">--</span>}
                                </div>
                            </div>

                            <div className="col-span-3">
                                <StoaComparison target={entry.targetMix} actual={entry.actualMix} isVacant={isVacant} />
                            </div>

                            <div className="col-span-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block border ${alignment.color}`}>
                                    {alignment.label}
                                </span>
                            </div>

                            <div className="col-span-2 text-right">
                                {!isVacant && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setViewLogId(entry.nodeId); }}
                                        className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-indigo-100 transition-all"
                                    >
                                        View Daily Log
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && !isVacant && (
                            <div className="col-span-12 bg-slate-50 border-y border-slate-200 p-6 pl-14 shadow-inner">
                                <div className="flex gap-8">
                                    <div className="flex-1">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">Work Type Breakdown</h4>
                                        <div className="grid grid-cols-4 gap-4">
                                            {Object.keys(entry.actualMix).map(k => (
                                                <div key={k} className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                                                    <div className="text-[10px] uppercase font-bold text-slate-400">{k}</div>
                                                    <div className="text-lg font-black text-slate-800">
                                                        {entry.actualMix[k as keyof WorkMix]}%
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="w-px bg-slate-200"></div>
                                    <div className="w-64">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">Project & Cost Booking</h4>
                                        <div className="space-y-2">
                                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <FolderOpen size={14} className="text-indigo-600" />
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Primary Project</span>
                                                </div>
                                                <div className="text-sm font-black text-slate-900">{entry.primaryProject}</div>
                                            </div>
                                            
                                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Hash size={14} className="text-emerald-600" />
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Cost Object Code</span>
                                                </div>
                                                <div className="text-sm font-mono font-bold text-slate-700">{entry.primaryCostCode}</div>
                                            </div>

                                            {entry.cvHours > 0 && (
                                                <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-amber-800">In-House CV Booking</span>
                                                    <span className="text-sm font-black text-amber-700">{entry.cvHours.toFixed(1)}h</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                 );
             })}
         </div>
      </div>

      {/* DRAWER: DAILY ACTIVITY DETAIL */}
      {selectedLogEntry && (
        <div className="fixed inset-0 z-[60] flex justify-end">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setViewLogId(null)}></div>
            <div className="relative w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Drawer Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-xl font-black text-slate-900">{selectedLogEntry.name}</h3>
                            <Badge cls="bg-slate-200 text-slate-600">{selectedLogEntry.grade}</Badge>
                        </div>
                        <div className="text-sm text-slate-500 font-medium">
                            Timesheet for Week Ending <span className="text-slate-900 font-bold">{weekEnding}</span>
                        </div>
                    </div>
                    <button onClick={() => setViewLogId(null)} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Daily Logs List */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-8">
                     {selectedLogEntry.dailyLogs.length === 0 ? (
                         <div className="text-center text-slate-400 mt-20">No logs available for this period.</div>
                     ) : selectedLogEntry.dailyLogs.map((day, idx) => (
                         <div key={idx} className="relative pl-8 border-l-2 border-slate-200">
                             {/* Day Header */}
                             <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-200 border-2 border-white"></div>
                             <div className="flex justify-between items-center mb-4">
                                 <div>
                                     <div className="text-sm font-black text-slate-900">{day.date}</div>
                                     <div className="text-xs text-slate-500">{day.fullDate}</div>
                                 </div>
                                 <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                     day.totalHours >= 8.5 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                 }`}>
                                     {day.totalHours} Hrs
                                 </div>
                             </div>

                             {/* Activities Table */}
                             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                 <table className="w-full text-left">
                                     <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500">
                                         <tr>
                                             <th className="px-4 py-2 w-24">Time</th>
                                             <th className="px-4 py-2">Activity / Task</th>
                                             <th className="px-4 py-2 w-32">Type (STOA)</th>
                                             <th className="px-4 py-2 w-24">Booking</th>
                                             <th className="px-4 py-2 w-16 text-right">Hrs</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                        {day.items.length > 0 ? day.items.map(item => (
                                            <tr key={item.id} className={`hover:bg-slate-50 ${item.isCVBooking ? 'bg-amber-50/50' : ''}`}>
                                                <td className="px-4 py-3 font-mono text-slate-500 font-bold whitespace-nowrap">{item.timeRange}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-slate-900">{item.activity}</div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5">{item.description}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${WORK_TYPE_COLORS[item.category]}`}>
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-mono font-bold text-[10px] text-slate-600">{item.costCode}</div>
                                                    <div className="text-[9px] text-slate-400 truncate max-w-[80px]" title={item.project}>{item.project}</div>
                                                    {item.isCVBooking && (
                                                        <div className="text-[9px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                                                            <Bookmark size={8} /> In-House
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold">{item.duration}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No activity logged (Leave/Holiday)</td>
                                            </tr>
                                        )}
                                     </tbody>
                                 </table>
                             </div>
                         </div>
                     ))}
                </div>

                <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
                    <button onClick={() => setViewLogId(null)} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800">
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
