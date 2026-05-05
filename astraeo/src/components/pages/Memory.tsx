"use client";
import { useState } from "react";
import { useAstraeo } from "@/store/astraeo";
import type { MemoryEntry, MemoryType } from "@/lib/types";

const typeConfig: Record<MemoryType, { label: string; color: string; icon: string }> = {
  user: { label: "Usuario", color: "#00D4FF", icon: "◉" },
  feedback: { label: "Feedback", color: "#FF6B9D", icon: "◈" },
  project: { label: "Proyecto", color: "#FFB800", icon: "◆" },
  reference: { label: "Referencia", color: "#7B61FF", icon: "◍" },
  fact: { label: "Hecho", color: "#00E5A0", icon: "◎" },
};

export default function MemoryPage() {
  const { memory, addMemory, updateMemory, deleteMemory, togglePinMemory, showToast } = useAstraeo();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<MemoryType | "all">("all");
  const [editing, setEditing] = useState<MemoryEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", type: "fact" as MemoryType, tags: "", pinned: false });

  const filtered = memory.filter((m) => {
    const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.content.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || m.type === filterType;
    return matchSearch && matchType;
  }).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (editing) {
      updateMemory(editing.id, { ...form, tags });
      showToast("Memoria actualizada", "success");
    } else {
      addMemory({ ...form, tags });
      showToast("Memoria guardada", "success");
    }
    setEditing(null);
    setCreating(false);
    setForm({ title: "", content: "", type: "fact", tags: "", pinned: false });
  };

  const openEdit = (m: MemoryEntry) => {
    setEditing(m);
    setForm({ title: m.title, content: m.content, type: m.type, tags: m.tags.join(", "), pinned: m.pinned });
    setCreating(false);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1A2744]/60 flex items-center gap-4 flex-shrink-0">
        <div className="flex-1">
          <h2 className="text-[15px] font-bold tracking-wide text-[#E8ECF4]">Memory Hub</h2>
          <p className="text-[11px] text-[#6B7A99] font-mono">{memory.length} entradas · {memory.filter((m) => m.pinned).length} fijadas</p>
        </div>
        <input
          className="astraeo-input w-64 py-2 text-[13px]"
          placeholder="Buscar memorias..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1">
          <button
            onClick={() => setFilterType("all")}
            className={`text-[10px] px-2.5 py-1.5 rounded-lg font-medium transition-all ${filterType === "all" ? "bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/25" : "text-[#6B7A99] border border-[#1A2744]"}`}
          >
            Todas
          </button>
          {(Object.keys(typeConfig) as MemoryType[]).map((t) => {
            const cfg = typeConfig[t];
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className="text-[10px] px-2.5 py-1.5 rounded-lg font-medium transition-all"
                style={{
                  background: filterType === t ? `${cfg.color}12` : "transparent",
                  color: filterType === t ? cfg.color : "#6B7A99",
                  border: `1px solid ${filterType === t ? cfg.color + "30" : "#1A2744"}`,
                }}
              >
                {cfg.icon}
              </button>
            );
          })}
        </div>
        <button onClick={() => { setCreating(true); setEditing(null); setForm({ title: "", content: "", type: "fact", tags: "", pinned: false }); }}
          className="btn-primary text-[12px] py-2 px-4">
          + Nueva
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(creating || editing) && (
            <div className="glass-card rounded-2xl p-5 border border-[#00D4FF]/25 col-span-full md:col-span-2 xl:col-span-1 animate-scale-in">
              <h4 className="text-[13px] font-bold mb-4 text-[#E8ECF4]">{editing ? "Editar memoria" : "Nueva memoria"}</h4>
              <div className="space-y-3">
                <input className="astraeo-input" placeholder="Título" value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                <textarea className="astraeo-input resize-none" rows={4} placeholder="Contenido..."
                  value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#6B7A99] mb-1 block">Tipo</label>
                    <select className="astraeo-input text-[12px]" value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as MemoryType }))}
                      style={{ background: "#0A0F1F" }}>
                      {(Object.keys(typeConfig) as MemoryType[]).map((t) => (
                        <option key={t} value={t}>{typeConfig[t].icon} {typeConfig[t].label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#6B7A99] mb-1 block">Tags (separados por coma)</label>
                    <input className="astraeo-input text-[12px]" placeholder="cliente, crm..." value={form.tags}
                      onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="toggle" checked={form.pinned}
                    onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))} id="pin-toggle" />
                  <label htmlFor="pin-toggle" className="text-[12px] text-[#6B7A99]">Fijar memoria</label>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setEditing(null); setCreating(false); }} className="btn-ghost flex-1 justify-center text-[12px]">Cancelar</button>
                  <button onClick={handleSave} className="btn-primary flex-1 justify-center text-[12px]">
                    {editing ? "Guardar" : "Crear"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {filtered.map((m) => {
            const cfg = typeConfig[m.type];
            return (
              <div
                key={m.id}
                className="glass-card rounded-2xl p-4 border border-[#1A2744]/50 card-hover group flex flex-col"
                style={{ borderLeftColor: m.pinned ? cfg.color : undefined, borderLeftWidth: m.pinned ? 2 : undefined }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: cfg.color }}>{cfg.icon}</span>
                    <span
                      className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: `${cfg.color}12`, color: cfg.color, border: `1px solid ${cfg.color}25` }}
                    >
                      {cfg.label}
                    </span>
                    {m.pinned && <span className="text-[#FFB800] text-[11px]">📌</span>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => togglePinMemory(m.id)} className="text-[11px] text-[#6B7A99] hover:text-[#FFB800]">📌</button>
                    <button onClick={() => openEdit(m)} className="text-[11px] text-[#6B7A99] hover:text-[#00D4FF]">✎</button>
                    <button onClick={() => { deleteMemory(m.id); showToast("Memoria eliminada", "info"); }} className="text-[11px] text-[#6B7A99] hover:text-[#FF4757]">✕</button>
                  </div>
                </div>
                <h4 className="text-[13px] font-semibold text-[#E8ECF4] mb-1.5 leading-snug">{m.title}</h4>
                <p className="text-[12px] text-[#6B7A99] line-clamp-3 leading-relaxed flex-1">{m.content}</p>
                {m.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {m.tags.map((tag) => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded text-[#6B7A99] border border-[#1A2744]/80">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[9px] text-[#6B7A99]/50 mt-2 font-mono">
                  {new Date(m.updatedAt).toLocaleDateString("es", { day: "2-digit", month: "short", year: "2-digit" })}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
