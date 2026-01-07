import React, { useState } from 'react';
import { OrgNode } from '../types';
import { NodeRow } from './NodeRow';
import { DEFAULT_COLUMNS } from '../constants';

interface TierLevelGroupProps {
  level: string;
  grade: string;
  nodes: OrgNode[];
  onDrop: (e: React.DragEvent, grade: string, level: string) => void;
  expandedId: string | null;
  onToggle: (id: string) => void;
  onAction: (action: string, node: OrgNode) => void;
  columns: typeof DEFAULT_COLUMNS;
}

export const TierLevelGroup: React.FC<TierLevelGroupProps> = ({
  level,
  grade,
  nodes,
  onDrop,
  expandedId,
  onToggle,
  onAction,
  columns,
}) => {
  const [isOver, setIsOver] = useState(false);

  return (
    <div 
        className={`rounded-xl transition-colors duration-200 border-l-4 ${isOver ? 'bg-indigo-50/40 border-indigo-400' : 'border-slate-200 pl-4'}`}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsOver(false); }}
        onDrop={(e) => { 
            e.preventDefault(); 
            setIsOver(false); 
            onDrop(e, grade, level); 
        }}
    >
        <div className="flex items-center gap-2 mb-3 mt-2">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest border border-slate-200 px-2 py-0.5 rounded bg-slate-50">{level}</div>
            <div className="h-px bg-slate-100 flex-1"></div>
        </div>
        <div className="space-y-3 min-h-[40px]">
            {nodes.length > 0 ? (
                nodes.map((n) => (
                    <NodeRow
                        key={n.id}
                        data={n}
                        isExpanded={expandedId === n.id}
                        onToggle={() => onToggle(n.id)}
                        onAction={onAction}
                        columns={columns}
                    />
                ))
            ) : (
                <div className="text-[10px] text-slate-300 italic py-2 text-center border border-dashed border-slate-100 rounded">
                    Drag roles here for {level}
                </div>
            )}
        </div>
    </div>
  );
};