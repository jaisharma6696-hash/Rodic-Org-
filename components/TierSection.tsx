import React, { useState } from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';

interface TierSectionProps {
  title: string;
  subtitle: string;
  badge: React.ReactNode;
  onAdd: () => void;
  onBulkEdit?: () => void;
  onDrop?: (e: React.DragEvent, targetKey: string) => void;
  targetKey: string;
  children: React.ReactNode;
}

export const TierSection: React.FC<TierSectionProps> = ({ title, subtitle, badge, onAdd, onBulkEdit, onDrop, targetKey, children }) => {
  const [isOver, setIsOver] = useState(false);
  const hasChildren = React.Children.count(children) > 0;

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
    onDrop?.(e, targetKey);
  };

  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start transition-colors duration-200 p-2 rounded-2xl break-inside-avoid
        ${isOver ? "bg-indigo-50/50 ring-2 ring-indigo-300 ring-dashed" : "ring-2 ring-transparent"}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="lg:sticky lg:top-[180px]">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm group/card">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                 {badge}
                 <div className="text-sm font-black text-slate-900">{title}</div>
              </div>
              {onBulkEdit && (
                  <button 
                    onClick={onBulkEdit}
                    className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover/card:opacity-100"
                    title="Bulk Edit Work Mix"
                  >
                    <SlidersHorizontal size={14} />
                  </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-snug mt-1">{subtitle}</p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 print:hidden">
            <button
              onClick={onAdd}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-600 text-[11px] font-black transition-all group"
            >
              <Plus size={14} className="group-hover:scale-110 transition-transform" /> Add Role
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 min-w-0">
        {hasChildren ? (
          children
        ) : (
          <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs font-bold bg-slate-50/50">
            Drop roles here to move to {title}
          </div>
        )}
      </div>
    </div>
  );
};