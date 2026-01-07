
import React, { useState, useEffect, useMemo } from 'react';
import { Users, Network, Copy, BarChart3, Scale, Activity, CheckCircle2, X, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { OrgNode, BusinessUnit, WorkMix, Grade } from '../types';
import { GRADE_STYLES, GRADE_LEVELS } from '../constants';
import { safeNowISO, normalizeMix, clamp, isTierGrade, trackIdFromGrade, getDefaultLevel } from '../utils';
import { WorkMixBar } from './WorkMixBar';

interface EditNodeModalProps {
  node: OrgNode | null;
  isOpen: boolean;
  onClose: () => void;
  onPatch: (node: OrgNode) => void;
  onArchive: (node: OrgNode) => void;
  onRestore: (node: OrgNode) => void;
  onDeleteHard: (node: OrgNode) => void;
  buList: BusinessUnit[];
  allRoleTitles: string[];
}

export const EditNodeModal: React.FC<EditNodeModalProps> = ({
  node, isOpen, onClose, onPatch, onArchive, onRestore, onDeleteHard, buList, allRoleTitles
}) => {
  const [local, setLocal] = useState<OrgNode | null>(node);
  const [activeTab, setActiveTab] = useState("general");
  const [autoSaveTyping, setAutoSaveTyping] = useState(true);

  useEffect(() => setLocal(node), [node]);
  useEffect(() => {
    if (isOpen) setActiveTab("general");
  }, [isOpen]);

  const roleOptions = useMemo(() => {
    if (!local) return [];
    const titles = (allRoleTitles || []).map((t) => (t || "").trim()).filter((t) => !!t);
    const set = new Set<string>(titles);
    set.delete((local.title || "").trim());
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRoleTitles, local]);

  if (!isOpen || !local) return null;

  const safeGrade = local.grade || "G1";
  const style = GRADE_STYLES[safeGrade] || GRADE_STYLES.G1;
  const availableLevels = GRADE_LEVELS[safeGrade] || [];

  const patch = (delta: Partial<OrgNode>) => {
    const next = { ...local, ...delta, updatedAt: safeNowISO() };
    setLocal(next);
    if (autoSaveTyping) onPatch(next);
  };

  const patchReporting = (field: 'up' | 'down' | 'dual', value: string) => {
    const reporting = { ...(local.reporting || { up: "", down: "", dual: "" }), [field]: value };
    patch({ reporting });
  };

  const patchWorkMix = (k: keyof WorkMix, value: number) => {
    const workMix = { ...normalizeMix(local.workMix), [k]: clamp(value, 0, 100) };
    patch({ workMix });
  };

  const patchArrayItem = (field: 'roles' | 'kpi', idx: number, value: string) => {
    const arr = Array.isArray(local[field]) ? [...local[field]] : [];
    arr[idx] = value;
    patch({ [field]: arr });
  };

  const addArrayItem = (field: 'roles' | 'kpi') => {
    const arr = Array.isArray(local[field]) ? [...local[field]] : [];
    arr.push("");
    patch({ [field]: arr });
  };

  const removeArrayItem = (field: 'roles' | 'kpi', idx: number) => {
    const arr = Array.isArray(local[field]) ? [...local[field]] : [];
    arr.splice(idx, 1);
    patch({ [field]: arr });
  };

  const tabs = [
    { id: "general", label: "General", icon: Users },
    { id: "structure", label: "Structure", icon: Network },
    { id: "designations", label: "Designations", icon: Copy },
    { id: "metrics", label: "KPIs", icon: BarChart3 },
    { id: "financials", label: "Financials", icon: Scale },
    { id: "workmix", label: "Work Mix", icon: Activity },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 print:hidden animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-slate-900">Edit Role Profile</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span className="font-mono bg-slate-200 px-1 rounded text-[10px]">{String(local.id).slice(0, 8)}…</span>
              <span>•</span>
              <span className={`px-1.5 rounded text-[10px] font-bold ${style.light}`}>{local.grade}</span>
              {local.level && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200">
                    {local.level}
                  </span>
              )}
              {local.archived && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700">
                  ARCHIVED
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
              <input
                type="checkbox"
                checked={autoSaveTyping}
                onChange={(e) => setAutoSaveTyping(e.target.checked)}
              />
              Auto-save while typing
            </label>

            {!local.archived ? (
              <button
                onClick={() => onArchive(local)}
                className="flex items-center gap-2 px-3 py-2 bg-white text-amber-700 text-xs font-bold rounded-lg border border-amber-200 hover:bg-amber-50"
                title="Archive role"
              >
                <Archive size={14} /> Archive
              </button>
            ) : (
              <button
                onClick={() => onRestore(local)}
                className="flex items-center gap-2 px-3 py-2 bg-white text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 hover:bg-emerald-50"
                title="Restore role"
              >
                <RotateCcw size={14} /> Restore
              </button>
            )}

            <button
              onClick={() => onDeleteHard(local)}
              className="flex items-center gap-2 px-3 py-2 bg-white text-rose-700 text-xs font-bold rounded-lg border border-rose-200 hover:bg-rose-50"
              title="Delete permanently"
            >
              <Trash2 size={14} /> Delete
            </button>

            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} className="text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 bg-slate-50 border-r border-slate-200 flex flex-col py-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`text-left px-4 py-3 text-xs font-bold flex items-center gap-3 transition-colors relative
                ${activeTab === t.id ? "text-indigo-600 bg-white shadow-sm border-r-2 border-indigo-600" : "text-slate-500 hover:bg-slate-100"}`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === "general" && (
              <div className="space-y-5 max-w-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Role Title</label>
                    <input
                      value={local.title}
                      onChange={(e) => patch({ title: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Archetype</label>
                    <input
                      value={local.archetype}
                      onChange={(e) => patch({ archetype: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <label className="block text-[10px] font-black uppercase text-indigo-500 mb-1">Incumbent</label>
                  <input
                    value={local.incumbentName || ""}
                    onChange={(e) => patch({ incumbentName: e.target.value })}
                    placeholder="Name…"
                    className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Purpose</label>
                  <textarea
                    rows={2}
                    value={local.purpose || ""}
                    onChange={(e) => patch({ purpose: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Accountability</label>
                  <textarea
                    rows={3}
                    value={local.accountability || ""}
                    onChange={(e) => patch({ accountability: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            )}

            {activeTab === "structure" && (
              <div className="space-y-5 max-w-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Grade</label>
                    <select
                      value={local.grade}
                      onChange={(e) => {
                        const newGrade = e.target.value as Grade;
                        patch({
                          grade: newGrade,
                          level: getDefaultLevel(newGrade),
                          location: isTierGrade(newGrade) ? "tier" : `track:${trackIdFromGrade(newGrade)}`,
                        });
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      {Object.keys(GRADE_STYLES).map((g) => (
                        <option key={g} value={g}>
                          {GRADE_STYLES[g].label} ({g})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Business Unit</label>
                    <select
                      value={local.buName}
                      onChange={(e) => patch({ buName: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      {buList.filter((b) => b.id !== "ALL").map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {availableLevels.length > 0 && (
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Tier Level</label>
                        <select
                        value={local.level || ""}
                        onChange={(e) => patch({ level: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                        >
                        {availableLevels.map((l) => (
                            <option key={l} value={l}>
                            {l}
                            </option>
                        ))}
                        </select>
                    </div>
                )}

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-blue-500 mb-1">Reports To (Primary)</label>
                    <input
                      list="role-options"
                      value={local.reporting?.up || ""}
                      onChange={(e) => patchReporting("up", e.target.value)}
                      className="w-full border rounded px-3 py-2 text-xs font-bold outline-none focus:border-blue-400"
                      placeholder="Type to search roles…"
                    />
                    <datalist id="role-options">
                      {roleOptions.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-orange-500 mb-1">Dual Reporting (Dotted)</label>
                    <input
                      list="role-options"
                      value={local.reporting?.dual || ""}
                      onChange={(e) => patchReporting("dual", e.target.value)}
                      className="w-full border rounded px-3 py-2 text-xs font-bold outline-none focus:border-orange-400"
                      placeholder="Optional…"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-emerald-500 mb-1">Responsible For (Teams)</label>
                    <input
                      value={local.reporting?.down || ""}
                      onChange={(e) => patchReporting("down", e.target.value)}
                      className="w-full border rounded px-3 py-2 text-xs font-bold"
                      placeholder="e.g., Planning, Design, QS…"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "designations" && (
              <div className="max-w-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-700">Mapped Job Titles</h3>
                  <button onClick={() => addArrayItem("roles")} className="text-xs text-indigo-600 font-bold hover:underline">
                    + Add Title
                  </button>
                </div>
                <div className="space-y-2">
                  {(local.roles || []).map((r, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={r}
                        onChange={(e) => patchArrayItem("roles", idx, e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      />
                      <button onClick={() => removeArrayItem("roles", idx)} className="text-slate-400 hover:text-rose-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!local.roles || local.roles.length === 0) && (
                    <div className="text-xs text-slate-500">No mapped titles yet.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "metrics" && (
              <div className="max-w-2xl">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-[10px] font-black uppercase text-emerald-600">
                    Key Performance Indicators
                  </label>
                  <button onClick={() => addArrayItem("kpi")} className="text-xs text-indigo-600 font-bold hover:underline">
                    + Add KPI
                  </button>
                </div>
                <div className="space-y-2">
                  {(local.kpi || []).map((k, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={k}
                        onChange={(e) => patchArrayItem("kpi", idx, e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      />
                      <button onClick={() => removeArrayItem("kpi", idx)} className="text-slate-400 hover:text-rose-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!local.kpi || local.kpi.length === 0) && (
                    <div className="text-xs text-slate-500">No KPIs yet.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "workmix" && (
              <div className="max-w-xl">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <WorkMixBar mix={local.workMix} height="h-4" className="mb-6" />
                  <div className="grid grid-cols-2 gap-4">
                    {["strategic", "tactical", "operational", "admin"].map((k) => (
                      <div key={k}>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">{k} (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={normalizeMix(local.workMix)[k as keyof WorkMix] || 0}
                          onChange={(e) => patchWorkMix(k as keyof WorkMix, Number(e.target.value))}
                          className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-100 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-[11px] text-slate-500">
                    Tip: You don’t need to force 100%. The mix is used as a directional indicator.
                  </div>
                </div>
              </div>
            )}

            {activeTab === "financials" && (
              <div className="grid grid-cols-2 gap-4 max-w-xl">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">CTC Band</label>
                  <input
                    value={local.ctc || ""}
                    onChange={(e) => patch({ ctc: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Years of Exp</label>
                  <input
                    value={local.yoe || ""}
                    onChange={(e) => patch({ yoe: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Cost Object</label>
                  <input
                    value={local.costObject || ""}
                    onChange={(e) => patch({ costObject: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Charge Rule</label>
                  <input
                    value={local.chargeRule || ""}
                    onChange={(e) => patch({ chargeRule: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono text-slate-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          {!autoSaveTyping && local && (
            <button
              onClick={() => onPatch(local)}
              className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md flex items-center gap-2"
            >
              <CheckCircle2 size={16} /> Save Changes
            </button>
          )}
          <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
