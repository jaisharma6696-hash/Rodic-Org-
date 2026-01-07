import React, { useState, useEffect } from 'react';
import { WorkMix, Grade } from '../types';
import { WorkMixBar } from './WorkMixBar';
import { normalizeMix, clamp, defaultMixForGrade } from '../utils';
import { Activity, X, CheckCircle2, RotateCcw } from 'lucide-react';

interface BulkWorkMixModalProps {
  grade: Grade | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (grade: Grade, mix: WorkMix) => void;
}

export const BulkWorkMixModal: React.FC<BulkWorkMixModalProps> = ({ grade, isOpen, onClose, onSave }) => {
  const [mix, setMix] = useState<WorkMix>({ strategic: 0, tactical: 0, operational: 0, admin: 0 });

  useEffect(() => {
    if (grade && isOpen) {
      setMix(defaultMixForGrade(grade));
    }
  }, [grade, isOpen]);

  if (!isOpen || !grade) return null;

  const updateMix = (k: keyof WorkMix, val: number) => {
    setMix(prev => ({ ...prev, [k]: clamp(val, 0, 100) }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
           <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
             <Activity size={16} className="text-indigo-600" /> Bulk Update Work Mix
           </h3>
           <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-700" /></button>
        </div>
        
        <div className="p-6 space-y-6">
           <div>
             <div className="text-lg font-black text-slate-900 mb-1">Grade: {grade}</div>
             <p className="text-xs text-slate-500">
               This will update the Work Function Mix for <strong>ALL</strong> active roles in this grade.
             </p>
           </div>

           <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <WorkMixBar mix={mix} height="h-4" className="mb-4" />
              <div className="grid grid-cols-2 gap-4">
                {["strategic", "tactical", "operational", "admin"].map((k) => (
                    <div key={k}>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">{k} (%)</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={mix[k as keyof WorkMix]}
                        onChange={(e) => updateMix(k as keyof WorkMix, Number(e.target.value))}
                        className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                    </div>
                ))}
              </div>
           </div>
           
           <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setMix(defaultMixForGrade(grade))}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg flex items-center gap-2"
              >
                <RotateCcw size={14} /> Reset Default
              </button>
              <button 
                onClick={() => {
                    if (window.confirm(`Apply this Work Mix to all ${grade} roles?`)) {
                        onSave(grade, normalizeMix(mix));
                    }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md flex items-center gap-2"
              >
                <CheckCircle2 size={14} /> Apply to All
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};