import React, { useMemo } from 'react';
import { OrgNode } from '../types';
import { computeStats, computeDataHealth, computeHealthScore } from '../utils';

interface PrintReportProps {
  nodes: OrgNode[];
  selectedBU: string;
  generatedAtISO: string;
}

export const PrintReport: React.FC<PrintReportProps> = ({ nodes, selectedBU, generatedAtISO }) => {
  const stats = useMemo(() => computeStats(nodes), [nodes]);
  const dataHealth = useMemo(() => computeDataHealth(nodes, stats), [nodes, stats]);
  const healthScore = useMemo(() => computeHealthScore(stats, dataHealth), [stats, dataHealth]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 flex justify-center overflow-y-auto pt-10 pb-10 backdrop-blur-sm">
      <div id="print-report-content" className="bg-white w-[210mm] min-h-[297mm] p-10 shadow-2xl text-black">
        <div className="mb-8 border-b border-black pb-4">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-3xl font-black uppercase tracking-tight text-slate-900">Organization Report</div>
              <div className="text-sm font-bold text-slate-600 mt-1">
                {selectedBU === "ALL" ? "Enterprise Structure" : `${selectedBU} Division`}
              </div>
            </div>
            <div className="text-right">
                <div className="text-xs font-mono text-slate-500">Generated</div>
                <div className="text-sm font-bold">{new Date(generatedAtISO).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: "Headcount", val: stats.totalRoles },
            { label: "Vacancy", val: `${stats.vacancyRate}%` },
            { label: "Span of Control", val: stats.spanOfControl },
            { label: "Leadership %", val: `${stats.leadershipRatio}%` },
            { label: "Health Score", val: `${healthScore}/100` },
          ].map((m) => (
            <div key={m.label} className="border-2 border-slate-100 rounded-xl p-3 bg-slate-50">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">{m.label}</div>
              <div className="text-xl font-black text-slate-900">{m.val}</div>
            </div>
          ))}
        </div>

        <div className="mb-2 text-[10px] text-slate-500 italic">
          * Reports To uses exact Role Title matching.
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="p-2 font-black uppercase text-[10px] tracking-wider text-slate-900">Grade</th>
              <th className="p-2 font-black uppercase text-[10px] tracking-wider text-slate-900">Role Title</th>
              <th className="p-2 font-black uppercase text-[10px] tracking-wider text-slate-900">Incumbent</th>
              <th className="p-2 font-black uppercase text-[10px] tracking-wider text-slate-900">Reports To</th>
              <th className="p-2 font-black uppercase text-[10px] tracking-wider text-slate-900">Dual</th>
              <th className="p-2 font-black uppercase text-[10px] tracking-wider text-slate-900">BU</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {nodes.map((n) => (
              <tr key={n.id} className="break-inside-avoid hover:bg-slate-50">
                <td className="p-2 font-bold text-slate-700">{n.grade}</td>
                <td className="p-2 font-bold text-slate-900">{n.title}</td>
                <td className="p-2 text-slate-600">{n.incumbentName || <span className="text-slate-300 italic">Vacant</span>}</td>
                <td className="p-2 text-slate-600">{n.reporting?.up || "-"}</td>
                <td className="p-2 text-slate-600">{n.reporting?.dual || "-"}</td>
                <td className="p-2"><span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">{n.buName}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between">
             <span>RODIC Organization Manager</span>
             <span>Confidential</span>
        </div>
      </div>
      
      <div className="fixed top-6 right-6 bg-white text-indigo-600 px-6 py-3 rounded-full text-sm font-black shadow-xl animate-pulse z-[101] flex items-center gap-2">
         <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
         Generating PDF...
      </div>
    </div>
  );
};