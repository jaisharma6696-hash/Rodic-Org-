
import React, { useState } from 'react';
import { GitMerge, Plus, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { OrgNode } from '../types';
import { GRADE_STYLES } from '../constants';

interface OrgChartNodeProps {
  node: OrgNode;
  childNodes?: OrgNode[];
  depth?: number;
  descendantCount?: number;
  onNodeDrop: (draggedId: string, parentTitle: string, isMatrix: boolean) => void;
  onEdit: (node: OrgNode) => void;
  onAddChild?: (parentId: string, parentTitle: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const OrgChartNode: React.FC<OrgChartNodeProps> = ({ 
  node, childNodes = [], depth = 0, descendantCount = 0, onNodeDrop, onEdit, onAddChild, isCollapsed = false, onToggleCollapse 
}) => {
  const style = GRADE_STYLES[node.grade] || GRADE_STYLES.G1;
  const gradeLabel = style.label;
  const hasChildren = childNodes.length > 0;
  const [isOver, setIsOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("draggedId", node.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const draggedId = e.dataTransfer.getData("draggedId");
    const isMatrix = e.shiftKey;
    if (draggedId) onNodeDrop(draggedId, node.title, isMatrix);
  };

  return (
    <div className="flex flex-col items-center group/node">
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={(e) => {
          e.stopPropagation();
          onEdit(node);
        }}
        className={`
          relative w-64 flex flex-col bg-white rounded-xl shadow-sm transition-all duration-200 cursor-pointer select-none z-20
          ${isOver ? "ring-4 ring-indigo-200 scale-105 shadow-xl" : "hover:shadow-md hover:-translate-y-0.5 border border-slate-200"}
          ${depth === 0 ? "border-t-4 border-t-slate-800" : ""}
        `}
      >
        {/* Color Stripe based on Grade */}
        <div className={`h-1.5 w-full rounded-t-xl ${style.badge.split(' ')[0]}`} />

        <div className="p-3 flex flex-col gap-2">
            {/* Header: Grade & Level Badge + BU */}
            <div className="flex items-center justify-between gap-2">
                <div className={`flex items-center rounded overflow-hidden border border-slate-100 ${style.light}`}>
                    <span className="text-[10px] font-black px-1.5 py-0.5 bg-white/50">{node.grade}</span>
                    {node.level ? (
                       <span className="text-[10px] font-black px-1.5 py-0.5 bg-slate-800 text-white font-mono">{node.level}</span>
                    ) : (
                       <span className="text-[10px] font-bold px-1.5 py-0.5 opacity-50">-</span>
                    )}
                </div>
                <div className="flex-1 text-center">
                   <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{style.label}</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0 bg-slate-50 px-1.5 py-0.5 rounded">{node.buName}</span>
            </div>

            {/* Content: Title & Name */}
            <div>
                <h4 className="text-xs font-black text-slate-800 leading-snug break-words mb-1" title={node.title}>
                    {node.title}
                </h4>
                {node.incumbentName ? (
                    <div className="text-[11px] font-medium text-indigo-700 truncate" title={node.incumbentName}>
                        {node.incumbentName}
                    </div>
                ) : (
                    <div className="text-[11px] font-medium text-slate-400 italic">Vacant</div>
                )}
            </div>

            {/* Footer: Role Type or Dual */}
            <div className="flex flex-wrap gap-1 mt-1">
                {node.reporting?.dual && (
                     <div className="text-[9px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-1 w-full">
                        <GitMerge size={8} />
                        <span className="truncate flex-1">{node.reporting.dual}</span>
                     </div>
                )}
            </div>
        </div>

        {/* Hover Action: Add Child (Floating Right) */}
        <button 
           onClick={(e) => {
             e.stopPropagation();
             onAddChild?.(node.id, node.title);
           }}
           className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white text-indigo-600 border border-slate-200 rounded-full flex items-center justify-center opacity-0 group-hover/node:opacity-100 hover:bg-indigo-50 hover:scale-110 shadow-sm transition-all z-30"
           title="Add Subordinate"
        >
          <Plus size={14} strokeWidth={3} />
        </button>

        {/* Collapse Toggle (Bottom Center) */}
        {hasChildren && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapse?.();
                }}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center bg-white border border-slate-300 rounded-full w-6 h-6 text-slate-500 shadow-sm hover:text-indigo-600 hover:border-indigo-300 z-30"
            >
                {isCollapsed ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronUp size={14} strokeWidth={3} />}
            </button>
        )}

        {/* Collapsed Count Indicator */}
        {hasChildren && isCollapsed && (
             <div 
               className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 z-20 whitespace-nowrap"
               title={`Hiding ${descendantCount} total roles below`}
             >
                <Users size={12} />
                <span>{descendantCount}</span>
             </div>
        )}
      </div>
    </div>
  );
};
