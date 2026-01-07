import React, { useMemo, useRef } from 'react';
import { PieChart, Plus, Printer, Upload, Download, Activity, Users, Network, Scale, AlertCircle, BarChart3, CheckCircle2, Lightbulb } from 'lucide-react';
import { OrgNode, ActivityLogEntry } from '../types';
import { computeStats, computeDataHealth, computeHealthScore } from '../utils';

interface HealthCardProps {
  title: string;
  okText: string;
  badItems: string[];
  badColor: string;
}

const HealthCard: React.FC<HealthCardProps> = ({ title, okText, badItems, badColor }) => {
  const has = (badItems || []).length > 0;
  return (
    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
      <div className="text-[10px] font-black uppercase text-slate-400 mb-2">{title}</div>
      {has ? (
        <ul className="text-xs text-slate-700 space-y-1">
          {badItems.slice(0, 5).map((t, i) => (
            <li key={`${t}-${i}`} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${badColor}`} />
              {t}
            </li>
          ))}
          {badItems.length > 5 && <li className="text-[11px] text-slate-500">+{badItems.length - 5} more</li>}
        </ul>
      ) : (
        <div className="text-xs text-emerald-700 font-bold flex items-center gap-1">
          <CheckCircle2 size={12} /> {okText}
        </div>
      )}
    </div>
  );
};

interface AnalysisDashboardProps {
  nodes: OrgNode[];
  selectedBU: string;
  onAddRole: () => void;
  onExportCSV: () => void;
  onImportCSVText: (text: string) => void;
  onExportPDF: () => void;
  activityLog: ActivityLogEntry[];
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({
  nodes, selectedBU, onAddRole, onExportCSV, onImportCSVText, onExportPDF, activityLog
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => computeStats(nodes), [nodes]);
  const dataHealth = useMemo(() => computeDataHealth(nodes, stats), [nodes, stats]);
  const healthScore = useMemo(() => computeHealthScore(stats, dataHealth), [stats, dataHealth]);

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-rose-500";
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => onImportCSVText(String(evt.target?.result || ""));
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-8 pb-20 print:hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <PieChart className="text-indigo-600" />
            {selectedBU === "ALL" ? "Enterprise Analysis" : `${selectedBU} Analysis`}
          </h2>
          <p className="text-sm text-slate-500 mt-1">KPIs, data health, actions and export.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onAddRole} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md">
            <Plus size={16} /> Add Role
          </button>

          <button onClick={onExportPDF} className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md">
            <Printer size={16} /> Export PDF
          </button>

          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFile} />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-blue-50">
            <Upload size={16} /> Import CSV
          </button>

          <button onClick={onExportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50">
            <Download size={16} /> Export CSV
          </button>

          <div className="hidden lg:flex items-center gap-4 bg-white px-6 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Health Score</div>
              <div className={`text-2xl font-black ${scoreColor(healthScore)}`}>{healthScore}/100</div>
            </div>
            <div className="h-10 w-px bg-slate-100 mx-2" />
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center relative">
              <Activity size={24} className={scoreColor(healthScore)} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Headcount", val: stats.totalRoles, sub: `${stats.vacancy} Open`, icon: Users },
          { label: "Span of Control", val: stats.spanOfControl, sub: "Avg manager load", icon: Network },
          { label: "Leadership %", val: `${stats.leadershipRatio}%`, sub: "G7–G5 density", icon: Scale },
          { label: "Vacancy Rate", val: `${stats.vacancyRate}%`, sub: "Unfilled roles", icon: AlertCircle },
        ].map((m) => (
          <div key={m.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-slate-900">
              <m.icon size={64} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{m.label}</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{m.val}</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-indigo-600" /> Data Health
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HealthCard title="Duplicate Titles" okText="No duplicates found" badItems={dataHealth.duplicates} badColor="bg-rose-500" />
            <HealthCard
              title="Orphan Reporting"
              okText="All reporting lines valid"
              badItems={dataHealth.orphans.map((o) => `${o.title} → ${o.reportsTo}`)}
              badColor="bg-amber-500"
            />
            <HealthCard title="Self Reporting" okText="No self-reporting" badItems={dataHealth.selfReports} badColor="bg-rose-500" />
            <HealthCard
              title="Overloaded Managers (>=10)"
              okText="Spans within limits"
              badItems={dataHealth.heavyManagers.map((m) => `${m.manager} (${m.reports})`)}
              badColor="bg-indigo-500"
            />
          </div>

          <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-slate-50/60">
            <div className="text-[10px] font-black uppercase text-slate-500 mb-2 flex items-center gap-2">
              <Lightbulb size={14} className="text-amber-500" /> Recommendation
            </div>
            <div className="text-sm text-slate-700 font-medium">
              {stats.vacancyRate > 15
                ? `High vacancy (${stats.vacancyRate}%). Prioritize hiring for critical layers first.`
                : stats.spanOfControl > 10
                ? `Span of control is high (${stats.spanOfControl}). Add team lead layers or split teams.`
                : `Structure looks stable. Focus on role harmonization and KPI standardization.`}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-900 mb-4">Activity Log</h4>
          <div className="space-y-2 max-h-[420px] overflow-auto pr-2">
            {(activityLog || []).length ? (
              activityLog.map((a) => (
                <div key={a.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="text-[10px] font-black uppercase text-slate-400">{new Date(a.at).toLocaleString()}</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{a.action}</div>
                  {a.detail && <div className="text-xs text-slate-600 mt-0.5">{a.detail}</div>}
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500">No actions yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};