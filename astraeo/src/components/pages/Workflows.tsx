"use client";
import { useState, useRef, useCallback } from "react";
import { useAstraeo } from "@/store/astraeo";
import type { Workflow, WorkflowNode } from "@/lib/types";

const nodeTypeConfig: Record<WorkflowNode["type"], { label: string; color: string; icon: string }> = {
  trigger: { label: "Trigger", color: "#00E5A0", icon: "⚡" },
  agent: { label: "Agente", color: "#00D4FF", icon: "◉" },
  condition: { label: "Condición", color: "#FFB800", icon: "◇" },
  action: { label: "Acción", color: "#7B61FF", icon: "▶" },
  output: { label: "Salida", color: "#FF6B9D", icon: "◎" },
};

export default function WorkflowsPage() {
  const { workflows, toggleWorkflow, runWorkflow, deleteWorkflow, addWorkflow, showToast } = useAstraeo();
  const [selected, setSelected] = useState<Workflow | null>(workflows[0] ?? null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const handleRun = (wf: Workflow) => {
    runWorkflow(wf.id);
    showToast(`${wf.name} ejecutado`, "success");
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    addWorkflow({
      name: newName,
      description: newDesc,
      nodes: [
        { id: "n1", type: "trigger", label: "Inicio", x: 60, y: 120, config: {}, color: "#00E5A0" },
        { id: "n2", type: "output", label: "Fin", x: 400, y: 120, config: {}, color: "#FF6B9D" },
      ],
      edges: [{ id: "e1", from: "n1", to: "n2" }],
      active: false,
      lastRun: undefined,
    });
    showToast(`${newName} creado`, "success");
    setCreating(false);
    setNewName("");
    setNewDesc("");
  };

  return (
    <div className="flex h-full animate-fade-in">
      {/* Sidebar */}
      <div className="w-72 border-r border-[#1A2744]/60 flex flex-col flex-shrink-0">
        <div className="px-5 py-4 border-b border-[#1A2744]/60 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-[14px] font-bold tracking-wide text-[#E8ECF4]">Workflows</h2>
            <p className="text-[10px] text-[#6B7A99] font-mono">{workflows.filter((w) => w.active).length} activos</p>
          </div>
          <button onClick={() => setCreating(true)} className="btn-primary text-[11px] py-1.5 px-3">+ Nuevo</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {creating && (
            <div className="glass-card rounded-xl p-3.5 border border-[#00D4FF]/20 animate-fade-in space-y-2">
              <input className="astraeo-input text-[12px]" placeholder="Nombre del workflow" value={newName}
                onChange={(e) => setNewName(e.target.value)} />
              <input className="astraeo-input text-[12px]" placeholder="Descripción" value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={() => setCreating(false)} className="btn-ghost text-[11px] py-1.5 flex-1">✕</button>
                <button onClick={handleCreate} className="btn-primary text-[11px] py-1.5 flex-1 justify-center">Crear</button>
              </div>
            </div>
          )}
          {workflows.map((wf) => (
            <div
              key={wf.id}
              onClick={() => setSelected(wf)}
              className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                selected?.id === wf.id
                  ? "border-[#00D4FF]/30 bg-[#00D4FF]/05"
                  : "border-[#1A2744]/50 glass-card hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[12px] font-semibold text-[#E8ECF4]">{wf.name}</p>
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                  style={{ background: wf.active ? "#00E5A0" : "#1A2744", boxShadow: wf.active ? "0 0 8px #00E5A0" : "none" }}
                />
              </div>
              <p className="text-[10px] text-[#6B7A99] mb-2 line-clamp-1">{wf.description}</p>
              <div className="flex items-center justify-between text-[9px] text-[#6B7A99] font-mono">
                <span>{wf.nodes.length} nodos · {wf.runs} runs</span>
                {wf.lastRun && (
                  <span>{new Date(wf.lastRun).toLocaleDateString("es", { day: "2-digit", month: "short" })}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            <div className="px-5 py-3 border-b border-[#1A2744]/60 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-[14px] font-bold text-[#E8ECF4]">{selected.name}</h3>
                <p className="text-[11px] text-[#6B7A99]">{selected.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-[#6B7A99]">Activo</span>
                  <input
                    type="checkbox"
                    checked={selected.active}
                    onChange={() => { toggleWorkflow(selected.id); setSelected((s) => s ? { ...s, active: !s.active } : s); }}
                    className="toggle"
                  />
                </div>
                <button
                  onClick={() => handleRun(selected)}
                  className="btn-primary text-[12px] py-2 px-4"
                >
                  ▶ Ejecutar
                </button>
                <button
                  onClick={() => { deleteWorkflow(selected.id); setSelected(workflows.filter((w) => w.id !== selected.id)[0] ?? null); showToast("Workflow eliminado", "info"); }}
                  className="btn-danger text-[12px] py-2 px-3"
                >
                  ✕
                </button>
              </div>
            </div>
            <WorkflowCanvas workflow={selected} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <span className="text-5xl">◫</span>
            <p className="text-[14px] text-[#6B7A99]">Selecciona un workflow</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowCanvas({ workflow }: { workflow: Workflow }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodeW = 130;
  const nodeH = 52;

  const getCenter = (node: WorkflowNode) => ({
    x: node.x + nodeW / 2,
    y: node.y + nodeH / 2,
  });

  const getEdgePath = (from: WorkflowNode, to: WorkflowNode) => {
    const a = getCenter(from);
    const b = getCenter(to);
    const mx = (a.x + b.x) / 2;
    return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
  };

  return (
    <div className="flex-1 overflow-auto relative grid-bg">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minWidth: 800, minHeight: 400 }}
        viewBox="0 0 800 400"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="rgba(0,212,255,0.4)" />
          </marker>
        </defs>

        {/* Edges */}
        {workflow.edges.map((edge) => {
          const from = workflow.nodes.find((n) => n.id === edge.from);
          const to = workflow.nodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;
          const path = getEdgePath(from, to);
          const mid = getCenter(from);
          const toMid = getCenter(to);
          const labelX = (mid.x + toMid.x) / 2;
          const labelY = (mid.y + toMid.y) / 2 - 8;
          return (
            <g key={edge.id}>
              <path
                d={path}
                fill="none"
                stroke="rgba(0,212,255,0.2)"
                strokeWidth="1.5"
                markerEnd="url(#arrow)"
                strokeDasharray="4,3"
              />
              {edge.label && (
                <text x={labelX} y={labelY} textAnchor="middle"
                  style={{ fill: "#FFB800", fontSize: 10, fontFamily: "Space Grotesk" }}>
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {workflow.nodes.map((node) => {
          const cfg = nodeTypeConfig[node.type];
          const isHovered = hoveredNode === node.id;
          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: "pointer" }}
            >
              <rect
                width={nodeW}
                height={nodeH}
                rx={10}
                ry={10}
                fill="rgba(13,27,62,0.9)"
                stroke={isHovered ? cfg.color : `${cfg.color}40`}
                strokeWidth={isHovered ? 1.5 : 1}
                style={{ filter: isHovered ? `drop-shadow(0 0 8px ${cfg.color}40)` : "none" }}
              />
              <rect
                width={4}
                height={nodeH}
                rx={2}
                fill={cfg.color}
                opacity={0.7}
              />
              <text x={20} y={20}
                style={{ fill: cfg.color, fontSize: 12, fontFamily: "Space Grotesk", fontWeight: 600 }}>
                {cfg.icon} {cfg.label}
              </text>
              <text x={20} y={38}
                style={{ fill: "#E8ECF4", fontSize: 11, fontFamily: "Space Grotesk" }}>
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 glass-card rounded-xl p-3 border border-[#1A2744]/50 space-y-1.5">
        <p className="text-[9px] text-[#6B7A99] uppercase tracking-widest font-semibold mb-2">Leyenda</p>
        {Object.entries(nodeTypeConfig).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
            <span className="text-[10px] text-[#6B7A99]">{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
