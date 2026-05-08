"use client";
import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAstraeo } from "@/store/astraeo";
import type { MemoryEntry, MemoryType } from "@/lib/types";

const typeConfig: Record<MemoryType, { label: string; color: string; icon: string }> = {
  user:      { label: "Usuario",    color: "#00D4FF", icon: "◉" },
  feedback:  { label: "Feedback",   color: "#FFB800", icon: "◈" },
  project:   { label: "Proyecto",   color: "#7B61FF", icon: "◆" },
  reference: { label: "Referencia", color: "#00E5A0", icon: "◍" },
  fact:      { label: "Hecho",      color: "#FF6B9D", icon: "◎" },
};

type SortMode = "recent" | "oldest" | "pinned" | "alpha";

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? (
        <mark
          key={i}
          style={{
            background: "rgba(0,212,255,0.22)",
            color: "#00D4FF",
            borderRadius: 2,
            padding: "0 2px",
          }}
        >
          {part}
        </mark>
      )
      : part
  );
}

function relativeDate(iso: string): { short: string; full: string } {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const full  = new Date(iso).toLocaleString("es", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  if (mins < 1)   return { short: "ahora mismo", full };
  if (mins < 60)  return { short: `hace ${mins}m`, full };
  if (hours < 24) return { short: `hace ${hours}h`, full };
  if (days < 7)   return { short: `hace ${days}d`, full };
  return { short: full.slice(0, 10), full };
}

export default function MemoryPage() {
  const { memory, addMemory, updateMemory, deleteMemory, togglePinMemory, showToast } =
    useAstraeo();

  const [search,     setSearch]     = useState("");
  const [filterType, setFilterType] = useState<MemoryType | "all">("all");
  const [sortMode,   setSortMode]   = useState<SortMode>("pinned");
  const [editing,    setEditing]    = useState<MemoryEntry | null>(null);
  const [creating,   setCreating]   = useState(false);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [form,       setForm]       = useState({
    title: "", content: "", type: "fact" as MemoryType, tags: "", pinned: false,
  });
  const importRef = useRef<HTMLInputElement>(null);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const byType = (t: MemoryType) => memory.filter((m) => m.type === t).length;
    return {
      total:    memory.length,
      pinned:   memory.filter((m) => m.pinned).length,
      project:  byType("project"),
      reference:byType("reference"),
      feedback: byType("feedback"),
      user:     byType("user"),
      fact:     byType("fact"),
    };
  }, [memory]);

  // ── Filtered + sorted ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = memory.filter((m) => {
      const matchSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q));
      const matchType = filterType === "all" || m.type === filterType;
      return matchSearch && matchType;
    });

    switch (sortMode) {
      case "recent":
        return [...list].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      case "oldest":
        return [...list].sort(
          (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        );
      case "alpha":
        return [...list].sort((a, b) => a.title.localeCompare(b.title, "es"));
      case "pinned":
      default:
        return [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    }
  }, [memory, search, filterType, sortMode]);

  // ── Form helpers ───────────────────────────────────────────────────────────
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
    closeForm();
  };

  const openEdit = (m: MemoryEntry) => {
    setEditing(m);
    setForm({ title: m.title, content: m.content, type: m.type, tags: m.tags.join(", "), pinned: m.pinned });
    setCreating(false);
  };

  const closeForm = () => {
    setEditing(null);
    setCreating(false);
    setForm({ title: "", content: "", type: "fact", tags: "", pinned: false });
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const exportMemory = useCallback((entries: MemoryEntry[]) => {
    const data = JSON.stringify(entries, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `memoria-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ── Import ─────────────────────────────────────────────────────────────────
  const importMemory = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const entries = JSON.parse(e.target?.result as string) as MemoryEntry[];
          if (!Array.isArray(entries)) throw new Error("Formato inválido");
          entries.forEach((entry) => {
            addMemory({
              title:   entry.title,
              content: entry.content,
              type:    entry.type,
              tags:    entry.tags ?? [],
              pinned:  entry.pinned ?? false,
            });
          });
          showToast(`${entries.length} memorias importadas`, "success");
        } catch {
          showToast("Error al importar el archivo", "error");
        }
      };
      reader.readAsText(file);
    },
    [addMemory, showToast]
  );

  // ── Bulk selection ─────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const deleteSelected = () => {
    selected.forEach((id) => deleteMemory(id));
    showToast(`${selected.size} memorias eliminadas`, "info");
    setSelected(new Set());
  };

  const exportSelected = () => {
    const entries = memory.filter((m) => selected.has(m.id));
    exportMemory(entries);
    setSelected(new Set());
  };

  const sortLabels: Record<SortMode, string> = {
    pinned:  "Pinneadas primero",
    recent:  "Más reciente",
    oldest:  "Más antigua",
    alpha:   "Alfabético",
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-[#1A2744]/60 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h2 className="text-[15px] font-bold tracking-wide text-[#E8ECF4]">Memory Hub</h2>
            {/* Stats bar */}
            <p className="text-[11px] text-[#6B7A99] font-mono mt-0.5">
              Total:{" "}
              <span className="text-[#E8ECF4]">{stats.total}</span>
              {" "}·{" "}
              <span className="text-[#FFB800]">{stats.pinned} pinneadas</span>
              {" "}·{" "}
              <span style={{ color: typeConfig.project.color }}>{stats.project} proyectos</span>
              {" "}·{" "}
              <span style={{ color: typeConfig.reference.color }}>{stats.reference} referencias</span>
              {" "}·{" "}
              <span style={{ color: typeConfig.feedback.color }}>{stats.feedback} feedback</span>
            </p>
          </div>

          {/* Search */}
          <input
            className="astraeo-input w-60 py-2 text-[13px]"
            placeholder="Buscar memorias..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Sort */}
          <select
            className="astraeo-input w-44 py-2 text-[12px] cursor-pointer"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            style={{ background: "#0A0F1F" }}
          >
            {(Object.keys(sortLabels) as SortMode[]).map((k) => (
              <option key={k} value={k}>{sortLabels[k]}</option>
            ))}
          </select>

          {/* Type filters */}
          <div className="flex gap-1">
            <button
              onClick={() => setFilterType("all")}
              className="text-[10px] px-2.5 py-1.5 rounded-lg font-medium transition-all"
              style={{
                background: filterType === "all" ? "rgba(0,212,255,0.10)" : "transparent",
                color:      filterType === "all" ? "#00D4FF" : "#6B7A99",
                border:     `1px solid ${filterType === "all" ? "rgba(0,212,255,0.25)" : "#1A2744"}`,
              }}
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
                    color:      filterType === t ? cfg.color : "#6B7A99",
                    border:     `1px solid ${filterType === t ? cfg.color + "30" : "#1A2744"}`,
                  }}
                  title={cfg.label}
                >
                  {cfg.icon}
                </button>
              );
            })}
          </div>

          {/* Export / Import / Nueva */}
          <div className="flex gap-2">
            <button
              onClick={() => exportMemory(memory)}
              className="btn-ghost text-[11px] py-2 px-3"
              title="Exportar todas las memorias como JSON"
            >
              ↑ Exportar
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="btn-ghost text-[11px] py-2 px-3"
              title="Importar memorias desde JSON"
            >
              ↓ Importar
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importMemory(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => {
                setCreating(true);
                setEditing(null);
                setForm({ title: "", content: "", type: "fact", tags: "", pinned: false });
              }}
              className="btn-primary text-[12px] py-2 px-4"
            >
              + Nueva
            </button>
          </div>
        </div>
      </div>

      {/* ── Bulk actions toolbar ───────────────────────────────────────────── */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="mx-6 mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[#00D4FF]/20 flex-shrink-0"
            style={{ background: "rgba(0,212,255,0.06)" }}
          >
            <span className="text-[12px] text-[#00D4FF] font-semibold">
              {selected.size} seleccionadas
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setSelected(new Set())}
              className="text-[11px] text-[#6B7A99] hover:text-[#E8ECF4] transition-colors"
            >
              Deseleccionar
            </button>
            <button
              onClick={exportSelected}
              className="btn-ghost text-[11px] py-1.5 px-3"
            >
              ↑ Exportar seleccionadas
            </button>
            <button
              onClick={deleteSelected}
              className="btn-danger text-[11px] py-1.5 px-3"
            >
              ✕ Eliminar {selected.size}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cards grid ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5">
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Create / Edit inline form */}
          <AnimatePresence>
            {(creating || editing) && (
              <motion.div
                layout
                key="form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="glass-card rounded-2xl p-5 border border-[#00D4FF]/25 col-span-full md:col-span-2 xl:col-span-1"
              >
                <h4 className="text-[13px] font-bold mb-4 text-[#E8ECF4]">
                  {editing ? "Editar memoria" : "Nueva memoria"}
                </h4>
                <div className="space-y-3">
                  <input
                    className="astraeo-input"
                    placeholder="Título"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                  <textarea
                    className="astraeo-input resize-none"
                    rows={4}
                    placeholder="Contenido..."
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#6B7A99] mb-1 block">Tipo</label>
                      <select
                        className="astraeo-input text-[12px]"
                        value={form.type}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, type: e.target.value as MemoryType }))
                        }
                        style={{ background: "#0A0F1F" }}
                      >
                        {(Object.keys(typeConfig) as MemoryType[]).map((t) => (
                          <option key={t} value={t}>
                            {typeConfig[t].icon} {typeConfig[t].label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6B7A99] mb-1 block">
                        Tags (separados por coma)
                      </label>
                      <input
                        className="astraeo-input text-[12px]"
                        placeholder="cliente, crm..."
                        value={form.tags}
                        onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={form.pinned}
                      onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
                      id="pin-toggle"
                    />
                    <label htmlFor="pin-toggle" className="text-[12px] text-[#6B7A99]">
                      Fijar memoria
                    </label>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={closeForm} className="btn-ghost flex-1 justify-center text-[12px]">
                      Cancelar
                    </button>
                    <button onClick={handleSave} className="btn-primary flex-1 justify-center text-[12px]">
                      {editing ? "Guardar" : "Crear"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Memory cards */}
          <AnimatePresence mode="popLayout">
            {filtered.map((m, idx) => {
              const cfg       = typeConfig[m.type];
              const isSelected = selected.has(m.id);
              const rel       = relativeDate(m.updatedAt);

              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: idx < 9 ? idx * 0.03 : 0 }}
                  className="premium-card p-4 group flex flex-col relative"
                  style={{
                    borderLeftColor: cfg.color,
                    borderLeftWidth: 2,
                    outline: isSelected ? `2px solid ${cfg.color}60` : "none",
                  }}
                >
                  {/* Checkbox — appears on hover or when selected */}
                  <div
                    className={`absolute top-3 left-3 z-10 transition-opacity ${
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(m.id)}
                      className="w-3.5 h-3.5 cursor-pointer accent-[#00D4FF]"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 pl-5">
                      <span className="text-sm" style={{ color: cfg.color }}>
                        {cfg.icon}
                      </span>
                      <span
                        className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          background: `${cfg.color}12`,
                          color:       cfg.color,
                          border:      `1px solid ${cfg.color}25`,
                        }}
                      >
                        {cfg.label}
                      </span>
                      {m.pinned && <span className="text-[#FFB800] text-[11px]">📌</span>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => togglePinMemory(m.id)}
                        className="text-[11px] text-[#6B7A99] hover:text-[#FFB800] transition-colors"
                        title="Fijar / desfijar"
                      >
                        📌
                      </button>
                      <button
                        onClick={() => openEdit(m)}
                        className="text-[11px] text-[#6B7A99] hover:text-[#00D4FF] transition-colors"
                        title="Editar"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => {
                          deleteMemory(m.id);
                          showToast("Memoria eliminada", "info");
                        }}
                        className="text-[11px] text-[#6B7A99] hover:text-[#FF4757] transition-colors"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <h4 className="text-[13px] font-semibold text-[#E8ECF4] mb-1.5 leading-snug">
                    {highlightText(m.title, search)}
                  </h4>
                  <p className="text-[12px] text-[#6B7A99] line-clamp-3 leading-relaxed flex-1">
                    {highlightText(m.content, search)}
                  </p>

                  {/* Tags as colored pills */}
                  {m.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {m.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                          style={{
                            background: `${cfg.color}10`,
                            color:       cfg.color,
                            border:      `1px solid ${cfg.color}20`,
                          }}
                        >
                          #{highlightText(tag, search)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Relative date with tooltip */}
                  <p
                    className="text-[9px] text-[#6B7A99]/50 mt-2 font-mono cursor-help"
                    title={rel.full}
                  >
                    {rel.short}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Empty state */}
          {filtered.length === 0 && !creating && !editing && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3 opacity-40">
              <span className="text-4xl">◎</span>
              <p className="text-[14px] text-[#6B7A99]">
                {search ? `Sin resultados para "${search}"` : "No hay memorias"}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
