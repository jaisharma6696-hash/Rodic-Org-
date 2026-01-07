import React, { useMemo, useState } from 'react';
import { Network, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { OrgNode } from '../types';
import { OrgChartNode } from './OrgChartNode';

interface OrgStructureBuilderProps {
  nodes: OrgNode[];
  onEdit: (node: OrgNode) => void;
  onStructureChange: (draggedId: string, parentTitle: string, isMatrix: boolean) => void;
  onAddChild: (parentId: string, parentTitle: string) => void;
  scale?: number;
}

// Helper to calculate total nodes in subtree
const getDescendantCount = (nodes: OrgNode[]): number => {
  if (!nodes || nodes.length === 0) return 0;
  return nodes.reduce((acc, child) => {
    // Count the child itself (1) + all its descendants
    return acc + 1 + getDescendantCount(child.childNodes || []);
  }, 0);
};

// Recursive Tree Node with Local Collapse State
const TreeNode: React.FC<{
  node: OrgNode;
  childNodes: OrgNode[];
  onEdit: (node: OrgNode) => void;
  onStructureChange: (draggedId: string, parentTitle: string, isMatrix: boolean) => void;
  onAddChild: (parentId: string, parentTitle: string) => void;
}> = ({ node, childNodes, onEdit, onStructureChange, onAddChild }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasChildren = childNodes.length > 0;

  // Calculate total descendants for the badge
  const totalDescendants = useMemo(() => getDescendantCount(childNodes), [childNodes]);

  return (
    <li className="flex flex-col items-center">
      <div className="z-20 relative">
        <OrgChartNode
          node={node}
          childNodes={childNodes}
          descendantCount={totalDescendants}
          onNodeDrop={onStructureChange}
          onEdit={onEdit}
          onAddChild={onAddChild}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </div>

      {hasChildren && !isCollapsed && (
        <ul className="flex justify-center relative animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Vertical line connector */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] bg-slate-300 h-[24px]"></div>

          {childNodes.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              childNodes={child.childNodes || []}
              onEdit={onEdit}
              onStructureChange={onStructureChange}
              onAddChild={onAddChild}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const OrgStructureBuilder: React.FC<OrgStructureBuilderProps> = ({ nodes, onEdit, onStructureChange, onAddChild, scale = 1 }) => {
  const [showOrphans, setShowOrphans] = useState(false);

  const { treeRoots, orphans } = useMemo(() => {
    const nodesByTitle: Record<string, OrgNode> = {};
    const workingNodes = nodes.map((n) => ({ ...n, childNodes: [] as OrgNode[] }));

    workingNodes.forEach((n) => {
      const t = (n.title || "").trim();
      if (t) nodesByTitle[t] = n;
    });

    const roots: OrgNode[] = [];
    const unlinked: OrgNode[] = [];

    workingNodes.forEach((n) => {
      const parentTitle = (n.reporting?.up || "").trim();
      if (parentTitle && nodesByTitle[parentTitle] && parentTitle !== n.title) {
        nodesByTitle[parentTitle].childNodes!.push(n);
      } else {
        const isStrategicRoot = n.grade === "G7" || n.grade === "G6";
        const hasNoParentDefinition = !parentTitle;
        if (isStrategicRoot || hasNoParentDefinition) {
          roots.push(n);
        } else {
          unlinked.push(n);
        }
      }
    });

    // Sort: High grades first, then alphabetical
    roots.sort((a, b) => {
        if (a.grade !== b.grade) return b.grade.localeCompare(a.grade);
        return a.title.localeCompare(b.title);
    });
    
    return { treeRoots: roots, orphans: unlinked };
  }, [nodes]);

  return (
    <div className="relative h-full flex flex-col bg-slate-50 overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
      {/* CSS for Tree Lines */}
      <style>{`
        .org-tree ul {
            padding-top: 24px;
            display: flex;
            position: relative;
        }
        .org-tree li {
            position: relative;
            padding: 24px 8px 0 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .org-tree li::before, .org-tree li::after {
            content: '';
            position: absolute;
            top: 0;
            right: 50%;
            border-top: 2px solid #cbd5e1;
            width: 50%;
            height: 24px;
        }
        .org-tree li::after {
            right: auto;
            left: 50%;
            border-left: 2px solid #cbd5e1;
            margin-left: -1px;
        }
        .org-tree li:first-child::before { border: 0 none; }
        .org-tree li:first-child::after { border-radius: 12px 0 0 0; }
        .org-tree li:last-child::after { border-top: 0 none; }
        .org-tree li:last-child::before { border-radius: 0 12px 0 0; }
        .org-tree li:only-child::after { border-top: 0 none; border-radius: 0; width: auto; }
        .org-tree li:only-child::before { border: 0 none; }
        .org-tree > ul > li::before, .org-tree > ul > li::after { border: 0 none; }
        .org-tree > ul > li { padding-top: 0; }
      `}</style>

      {/* Main Canvas */}
      <div 
        className="flex-1 overflow-auto cursor-grab active:cursor-grabbing relative custom-scrollbar"
        style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            backgroundColor: '#f8fafc'
        }}
      >
        <div
          id="org-chart-content"
          className="org-tree min-w-max min-h-full py-20 px-10 origin-top transition-transform duration-200 ease-out flex flex-col items-center"
          style={{ transform: `scale(${scale})` }}
        >
          {treeRoots.length === 0 && orphans.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-400 mt-32">
              <Network size={64} className="mb-4 opacity-20" />
              <h3 className="text-lg font-bold">Organization Structure Empty</h3>
              <p className="text-sm">Start by adding roles or fixing "Reports To" links.</p>
            </div>
          ) : (
            <ul>
              {treeRoots.map((root) => (
                <TreeNode
                  key={root.id}
                  node={root}
                  childNodes={root.childNodes || []}
                  onEdit={onEdit}
                  onStructureChange={onStructureChange}
                  onAddChild={onAddChild}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Floating Orphan Drawer */}
      {orphans.length > 0 && (
        <div className={`absolute bottom-4 left-4 right-4 z-40 transition-all duration-300 ease-in-out flex flex-col items-center pointer-events-none`}>
          <div className={`bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-5xl pointer-events-auto flex flex-col transition-all overflow-hidden ${showOrphans ? "max-h-[400px]" : "max-h-[60px]"}`}>
             
             {/* Header */}
             <button 
               onClick={() => setShowOrphans(!showOrphans)}
               className="flex items-center justify-between p-4 w-full hover:bg-slate-50 transition-colors border-b border-slate-100"
             >
                <div className="flex items-center gap-3">
                    <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600">
                        <AlertCircle size={18} />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-black text-slate-800">Unlinked Roles ({orphans.length})</div>
                        <div className="text-[10px] text-slate-500 font-medium">Roles with broken reporting lines</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                    {showOrphans ? "Hide" : "Review"}
                    {showOrphans ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
             </button>

             {/* Content */}
             <div className="overflow-x-auto overflow-y-hidden p-6 bg-slate-50/50">
                <div className="flex gap-4 pb-2">
                    {orphans.map(node => (
                        <div key={node.id} className="transform scale-90 origin-top-left">
                            <OrgChartNode
                                node={node}
                                childNodes={node.childNodes}
                                onNodeDrop={onStructureChange}
                                onEdit={onEdit}
                                onAddChild={onAddChild}
                            />
                        </div>
                    ))}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};