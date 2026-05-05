"use client";
import { useState } from "react";
import { useAstraeo } from "@/store/astraeo";
import type { Mission, MissionStatus, MissionPriority } from "@/lib/types";

const columns: { id: MissionStatus; label: string; color: string }[] = [
  { id: "backlog", label: "Backlog", color: "#6B7A99" },
  { id: "active", label: "En Progreso", color: "#00D4FF" },
  { id: "review", label: "En Revisión", color: "#FFB800" },
  { id: "done", label: "Completado", color: "#00E5A0" },
];

const priorityColors: Record<MissionPriority, string> = {
  critical: "#FF4757", high: "#FFB800", medium: "#7B61FF", low: "#6B7A99",
};

const emptyMission = (): Omit<Mission, "id" | "createdAt" | "updatedAt"> => ({
  title: "", description: "", status: "backlog", priority: "medium",
  assignedTo: [], tags: [], progress: 0,
});

export default function Missions() {
  const { missions, addMission, updateMission, deleteMission, moveMission, agents, showToast } = useAstraeo();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<MissionStatus | null>(null);
  const [editing, setEditing] = useState<Mission | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyMission());
  const [filter, setFilter] = useState<MissionPriority | "all">("all");

  const filtered = missions.filter((m) => filter === "all" || m.priority === filter);

  const handleDrop = (status: MissionStatus) => {
    if (dragging) { moveMission(dragging, status); setDragging(null); setDragOver(null); }
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editing) {
      updateMission(editing.id, form);
      showToast("Misión actualizada", "success");
    } else {
      addMission(form);
      showToast("Misión creada", "success");
    }
    setEditing(null);
    setCreating(false);
    setForm(emptyMission());
  };

  const openEdit = (m: Mission) => {
    setEditing(m);
    setForm({ ...m });
    setCreating(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyMission());
    setCreating(true);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1A2744]/60 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-[15px] font-bold tracking-wide text-[#E8ECF4]">Misiones</h2>
          <p className="text-[11px] text-[#6B7A99] font-mono">{missions.length} total · {missions.filter((m) => m.status === "active").length} activas</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex gap-1">
            {(["all", "critical", "high", "medium", "low"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className="text-[10px] px-2.5 py-1 rounded-lg capitalize font-semibold transition-all"
                style={{
                  background: filter === p
                    ? p === "all" ? "rgba(0,212,255,0.12)" : `${priorityColors[p as MissionPriority]}12`
                    : "transparent",
                  color: filter === p
                    ? p === "all" ? "#00D4FF" : priorityColors[p as MissionPriority]
                    : "#6B7A99",
                  border: `1px solid ${filter === p
                    ? p === "all" ? "rgba(0,212,255,0.25)" : `${priorityColors[p as MissionPriority]}30`
                    : "#1A2744"}`,
                }}
              >
                {p === "all" ? "Todas" : p}
              </button>
            ))}
          </div>
          <button onClick={openCreate} className="btn-primary text-[12px] py-2 px-4">
            + Nueva Misión
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map((col) => {
            const colMissions = filtered.filter((m) => m.status === col.id);
            return (
              <div
                key={col.id}
                className={`w-72 flex flex-col rounded-2xl border transition-all duration-200 ${
                  dragOver === col.id ? "kanban-drag-over" : "border-[#1A2744]/50 glass-card"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(col.id)}
              >
                {/* Column header */}
                <div className="px-4 py-3 border-b border-[#1A2744]/50 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: col.color, boxShadow: `0 0 6px ${col.color}` }} />
                    <span className="text-[12px] font-semibold text-[#E8ECF4] tracking-wide">{col.label}</span>
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: `${col.color}12`, color: col.color, border: `1px solid ${col.color}25` }}
                  >
                    {colMissions.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                  {colMissions.map((m) => (
                    <MissionCard
                      key={m.id}
                      mission={m}
                      agents={agents}
                      onDragStart={() => setDragging(m.id)}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                      onEdit={() => openEdit(m)}
                      onDelete={() => { deleteMission(m.id); showToast("Misión eliminada", "info"); }}
                    />
                  ))}
                  {colMissions.length === 0 && (
                    <div className="text-center py-8 text-[11px] text-[#6B7A99] opacity-50">
                      Arrastra aquí
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit/Create modal */}
      {(editing || creating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(5,8,16,0.85)", backdropFilter: "blur(16px)" }}>
          <div className="glass-strong rounded-2xl w-full max-w-lg border border-[#1A2744] animate-scale-in p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[16px] tracking-wide">{editing ? "Editar Misión" : "Nueva Misión"}</h3>
              <button onClick={() => { setEditing(null); setCreating(false); }} className="text-[#6B7A99] hover:text-[#E8ECF4]">✕</button>
            </div>
            <input className="astraeo-input" placeholder="Título de la misión" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <textarea className="astraeo-input resize-none" rows={2} placeholder="Descripción (opcional)"
              value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">Prioridad</label>
                <select className="astraeo-input" value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as MissionPriority }))}
                  style={{ background: "#0A0F1F" }}>
                  {(["low", "medium", "high", "critical"] as const).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">Estado</label>
                <select className="astraeo-input" value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MissionStatus }))}
                  style={{ background: "#0A0F1F" }}>
                  {columns.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">Progreso: {form.progress}%</label>
              <input type="range" min={0} max={100} value={form.progress}
                onChange={(e) => setForm((f) => ({ ...f, progress: Number(e.target.value) }))}
                className="w-full accent-[#00D4FF]" />
            </div>
            <div>
              <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">Asignar agentes</label>
              <div className="flex flex-wrap gap-2">
                {agents.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setForm((f) => ({
                      ...f,
                      assignedTo: f.assignedTo.includes(a.id)
                        ? f.assignedTo.filter((id) => id !== a.id)
                        : [...f.assignedTo, a.id],
                    }))}
                    className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all"
                    style={{
                      background: form.assignedTo.includes(a.id) ? `${a.color}15` : "transparent",
                      color: form.assignedTo.includes(a.id) ? a.color : "#6B7A99",
                      border: `1px solid ${form.assignedTo.includes(a.id) ? a.color + "35" : "#1A2744"}`,
                    }}
                  >
                    {a.icon} {a.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => { setEditing(null); setCreating(false); }} className="btn-ghost">Cancelar</button>
              <button onClick={handleSave} className="btn-primary">
                {editing ? "Guardar cambios" : "Crear misión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MissionCard({
  mission, agents, onDragStart, onDragEnd, onEdit, onDelete
}: {
  mission: Mission;
  agents: ReturnType<typeof useAstraeo.getState>["agents"];
  onDragStart: () => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pColor = priorityColors[mission.priority];
  const assignedAgents = agents.filter((a) => mission.assignedTo.includes(a.id));

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="glass-card rounded-xl p-3 border border-[#1A2744]/60 cursor-grab active:cursor-grabbing group transition-all hover:border-[#00D4FF]/20 hover:bg-white/[0.02]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest flex-shrink-0"
          style={{ background: `${pColor}12`, color: pColor, border: `1px solid ${pColor}25` }}
        >
          {mission.priority}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={onEdit} className="text-[11px] text-[#6B7A99] hover:text-[#00D4FF] transition-all">✎</button>
          <button onClick={onDelete} className="text-[11px] text-[#6B7A99] hover:text-[#FF4757] transition-all">✕</button>
        </div>
      </div>
      <p className="text-[12px] font-semibold text-[#E8ECF4] mb-1 leading-snug">{mission.title}</p>
      {mission.description && (
        <p className="text-[11px] text-[#6B7A99] line-clamp-2 mb-2">{mission.description}</p>
      )}
      {mission.progress > 0 && (
        <div className="mb-2">
          <div className="w-full h-1 bg-[#1A2744]/60 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${mission.progress}%`,
                background: mission.progress === 100
                  ? "linear-gradient(90deg, #00E5A0, #00D4FF)"
                  : "linear-gradient(90deg, #7B61FF, #00D4FF)",
              }}
            />
          </div>
          <p className="text-[9px] text-[#6B7A99] text-right mt-0.5 font-mono">{mission.progress}%</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-1">
          {assignedAgents.map((a) => (
            <div
              key={a.id}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] border"
              style={{
                background: `${a.color}15`,
                borderColor: `${a.color}40`,
                zIndex: 1,
              }}
              title={a.name}
            >
              {a.icon}
            </div>
          ))}
        </div>
        {mission.dueDate && (
          <span className="text-[9px] text-[#6B7A99] font-mono">
            {new Date(mission.dueDate).toLocaleDateString("es", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>
    </div>
  );
}
