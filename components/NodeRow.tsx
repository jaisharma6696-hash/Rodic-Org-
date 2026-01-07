
import React, { useRef, useState, useEffect } from 'react';
import {
  GripVertical, ArrowUpCircle, GitMerge, Edit3, MoreHorizontal,
  Copy, Archive, RotateCcw, Trash2, ChevronDown, ArrowDownCircle,
  BarChart3
} from 'lucide-react';
import { OrgNode } from '../types';
import { GRADE_STYLES, DEFAULT_COLUMNS } from '../constants';
import { Badge } from './Badge';
import { WorkMixBar } from './WorkMixBar';

interface NodeRowProps {
  data: OrgNode;
  isExpanded: boolean;
  onToggle: () => void;
  onAction: (action: string, node: OrgNode) => void;
  columns: typeof DEFAULT_COLUMNS;
}

function useOnClickOutside(ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

export const NodeRow: React.FC<NodeRowProps> = ({ data, isExpanded, onToggle, onAction, columns }) => {
  const style = GRADE_STYLES[data.grade] || GRADE_STYLES.G1;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(menuRef, () => setMenuOpen(false));

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("nodeId", data.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`group bg-white border border-slate-200 rounded-xl transition-all duration-200 mb-3 relative overflow-visible break-inside-avoid
      ${isExpanded ? "shadow-lg shadow-indigo-100 border-indigo-200 ring-1 ring-indigo-50" : "hover:border-slate-300 hover:shadow-md"}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 z-20 rounded-l-xl ${style.badge.split(" ")[0]}`} />

      <div className="pl-5 pr-4 py-3 flex items-center gap-4 cursor-pointer" onClick={onToggle}>
        <div className="text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 print:hidden">
          <GripVertical size={16} />
        </div>

        {columns.role && (
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 mb-1">
              <Badge cls={`${style.badge} uppercase tracking-wider`}>{style.label}</Badge>
              {data.level && <Badge cls="bg-slate-800 text-white font-mono">{data.level}</Badge>}
              <Badge cls="bg-slate-100 text-slate-600 border border-slate-200">{data.buName}</Badge>
              {data.archived && <Badge cls="bg-slate-200 text-slate-700">ARCHIVED</Badge>}
            </div>

            <h4 className="text-sm font-black text-slate-900 truncate" title={data.title}>
              {data.title}
            </h4>

            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 mb-1">
              {style.tagline}
            </div>
          </div>
        )}

        {columns.incumbent && (
          <div className="hidden lg:block w-48">
            <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Incumbent</div>
            {data.incumbentName ? (
              <div className="text-xs font-bold text-indigo-700 truncate" title={data.incumbentName}>
                {data.incumbentName}
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 italic">Vacant</div>
            )}
          </div>
        )}

        {columns.reporting && (
          <div className="hidden md:block w-56 border-l border-slate-100 pl-4">
            <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Reports To</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium truncate" title={data.reporting?.up}>
              <ArrowUpCircle size={12} className="text-slate-400" /> {data.reporting?.up || "-"}
            </div>
            {data.reporting?.dual && (
              <div className="flex items-center gap-1.5 text-[10px] text-orange-600 mt-0.5 truncate">
                <GitMerge size={10} /> {data.reporting.dual}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 print:hidden" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onAction("edit", data)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
            title="Edit"
          >
            <Edit3 size={16} />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              title="More"
            >
              <MoreHorizontal size={16} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onAction("duplicate", data);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Copy size={14} /> Duplicate
                </button>

                {!data.archived ? (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onAction("archive", data);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                  >
                    <Archive size={14} /> Archive
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onAction("restore", data);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                  >
                    <RotateCcw size={14} /> Restore
                  </button>
                )}

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onAction("delete", data);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2"
                >
                  <Trash2 size={14} /> Delete Permanently
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onToggle}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
            title="Expand"
          >
            <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      <div className={`bg-slate-50/50 border-t border-slate-100 transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? "max-h-[640px]" : "max-h-0"}`}>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="space-y-2">
            <h5 className="font-bold text-slate-900 uppercase text-[10px]">Strategic Purpose</h5>
            <p className="text-slate-600 leading-relaxed italic">"{data.purpose || "—"}"</p>

            <h5 className="font-bold text-slate-900 uppercase text-[10px] mt-3">Accountability</h5>
            <p className="text-slate-700">{data.accountability || "—"}</p>
          </div>

          <div className="space-y-4">
            {columns.workMix && (
              <div>
                <h5 className="font-bold text-slate-900 uppercase text-[10px] mb-2">Work Function Mix</h5>
                <WorkMixBar mix={data.workMix} />
              </div>
            )}

            <div>
              <h5 className="font-bold text-slate-900 uppercase text-[10px] mb-1 flex items-center gap-1">
                <ArrowDownCircle size={12} className="text-emerald-500" /> Responsible For
              </h5>
              <p className="text-slate-700 font-medium">{data.reporting?.down || "—"}</p>
            </div>

            {columns.metrics && (
              <div>
                <h5 className="font-bold text-slate-900 uppercase text-[10px] mb-1 flex items-center gap-1">
                  <BarChart3 size={12} className="text-indigo-600" /> KPIs
                </h5>
                <p className="text-slate-700 font-medium">
                  {(data.kpi || []).length ? data.kpi.join(" • ") : "—"}
                </p>
              </div>
            )}
          </div>

          {columns.financials && (
            <div>
              <h5 className="font-bold text-slate-900 uppercase text-[10px] mb-2">Financials</h5>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="block text-[9px] text-slate-400">Band</span>
                  <span className="font-mono font-bold text-slate-700">{data.ctc || "—"}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="block text-[9px] text-slate-400">YoE</span>
                  <span className="font-mono font-bold text-slate-700">{data.yoe || "—"}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="block text-[9px] text-slate-400">Cost</span>
                  <span className="font-mono font-bold text-slate-700">{data.costObject || "—"}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="block text-[9px] text-slate-400">Rule</span>
                  <span className="font-mono font-bold text-slate-700">{data.chargeRule || "—"}</span>
                </div>
              </div>
            </div>
          )}

          {columns.designations && (
            <div className="md:col-span-3">
              <h5 className="font-bold text-slate-900 uppercase text-[10px] mb-2">Mapped Titles</h5>
              <div className="text-slate-700">
                {(data.roles || []).length ? data.roles.join(" • ") : "—"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
