import React from 'react';
import { WorkMix } from '../types';
import { normalizeMix } from '../utils';

interface WorkMixBarProps {
  mix?: WorkMix;
  showLabels?: boolean;
  height?: string;
  className?: string;
}

export const WorkMixBar: React.FC<WorkMixBarProps> = ({ mix, showLabels = true, height = "h-2", className = "" }) => {
  const m = normalizeMix(mix);
  return (
    <div className={`w-full ${className}`}>
      <div className={`flex w-full rounded-full overflow-hidden ${height} bg-slate-100 shadow-inner`}>
        <div style={{ width: `${m.strategic}%` }} className="bg-purple-500" />
        <div style={{ width: `${m.tactical}%` }} className="bg-blue-500" />
        <div style={{ width: `${m.operational}%` }} className="bg-emerald-500" />
        <div style={{ width: `${m.admin}%` }} className="bg-slate-300" />
      </div>
      {showLabels && (
        <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-semibold">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Strat
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Tac
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Ops
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            Admin
          </div>
        </div>
      )}
    </div>
  );
};