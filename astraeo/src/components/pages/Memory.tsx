"use client";
import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAstraeo } from "@/store/astraeo";
import type { MemoryEntry, MemoryType } from "@/lib/types";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  cyan:    "var(--accent-sky)",
  purple:  "var(--accent-indigo)",
  emerald: "var(--accent-emerald)",
  amber:   "var(--accent-amber)",
  coral:   "var(--accent-rose)",
  red:     "var(--danger)",
  bg:      "var(--bg-base)",
  surface: "var(--bg-surface)",
  border:  "var(--border-subtle)",
  text:    "var(--text-primary)",
  muted:   "var(--text-muted)",
} as const;

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<MemoryType, { label: string; color: string; icon: string }> = {
  user:      { label: "Usuario",    color: C.cyan,    icon: "◉" },
  feedback:  { label: "Feedback",   color: C.amber,   icon: "◈" },
  project:   { label: "Proyecto",   color: C.purple,  icon: "◆" },
  reference: { label: "Referencia", color: C.emerald, icon: "◍" },
  fact:      { label: "Hecho",      color: C.coral,   icon: "◎" },
};

type SortMode = "recent" | "oldest" | "pinned" | "alpha";

const SORT_LABELS: Record<SortMode, string> = {
  pinned: "Pinneadas primero",
  recent: "Más reciente",
  oldest: "Más antigua",
  alpha:  "Alfabético",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
            background: "rgba(74,142,184,0.22)",
            color: C.cyan,
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
  const now  = Date.now();
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

// ─── MemoryForm ───────────────────────────────────────────────────────────────
interface MemoryFormData {
  title: string;
  content: string;
  type: MemoryType;
  tags: string;
  pinned: boolean;
}

interface MemoryFormProps {
  initialData: MemoryFormData;
  isEditing: boolean;
  onChange: (data: MemoryFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}

function MemoryForm({ initialData, isEditing, onChange, onSave, onCancel }: MemoryFormProps) {
  return (
    <motion.div
      layout
      key="form"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl p-5 col-span-full md:col-span-2 xl:col-span-1"
      style={{
        background: C.surface,
        border: `1px solid rgba(74,142,184,0.2)`,
        boxShadow: `0 1px 4px rgba(74,142,184,0.06)`,
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: C.cyan }}>◈</span>
        <h4 className="text-[13px] font-bold" style={{ color: C.text }}>
          {isEditing ? "Editar memoria" : "Nueva memoria"}
        </h4>
      </div>
      <div className="space-y-3">
        <input
          className="w-full text-[13px] outline-none rounded-lg px-3 py-2.5 transition-all"
          style={{
            background: C.bg,
            border: `1px solid rgba(255,255,255,0.07)`,
            color: C.text,
          }}
          placeholder="Título"
          value={initialData.title}
          onChange={(e) => onChange({ ...initialData, title: e.target.value })}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = `rgba(74,142,184,0.3)`; }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
        />
        <textarea
          className="w-full text-[13px] outline-none rounded-lg px-3 py-2.5 resize-none transition-all"
          rows={4}
          style={{
            background: C.bg,
            border: `1px solid rgba(255,255,255,0.07)`,
            color: C.text,
          }}
          placeholder="Contenido..."
          value={initialData.content}
          onChange={(e) => onChange({ ...initialData, content: e.target.value })}
          onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = `rgba(74,142,184,0.3)`; }}
          onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] font-semibold tracking-wider uppercase mb-1 block" style={{ color: C.muted }}>Tipo</label>
            <select
              className="w-full text-[12px] rounded-lg px-3 py-2 outline-none"
              style={{ background: C.bg, border: `1px solid rgba(255,255,255,0.07)`, color: C.text }}
              value={initialData.type}
              onChange={(e) => onChange({ ...initialData, type: e.target.value as MemoryType })}
            >
              {(Object.keys(TYPE_CONFIG) as MemoryType[]).map((t) => (
                <option key={t} value={t} style={{ background: C.bg }}>
                  {TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-semibold tracking-wider uppercase mb-1 block" style={{ color: C.muted }}>
              Tags (separados por coma)
            </label>
            <input
              className="w-full text-[12px] rounded-lg px-3 py-2 outline-none"
              style={{ background: C.bg, border: `1px solid rgba(255,255,255,0.07)`, color: C.text }}
              placeholder="cliente, crm..."
              value={initialData.tags}
              onChange={(e) => onChange({ ...initialData, tags: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <input
            type="checkbox"
            className="w-3.5 h-3.5 cursor-pointer accent-[#B88530]"
            checked={initialData.pinned}
            onChange={(e) => onChange({ ...initialData, pinned: e.target.checked })}
            id="memory-pin"
          />
          <label htmlFor="memory-pin" className="text-[12px] cursor-pointer" style={{ color: C.muted }}>
            Fijar memoria
          </label>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-[12px] font-semibold rounded-xl transition-all"
            style={{ background: "transparent", border: `1px solid rgba(255,255,255,0.08)`, color: C.muted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.text; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.muted; }}
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="flex-1 py-2 text-[12px] font-semibold rounded-xl transition-all text-white"
            style={{ background: `linear-gradient(135deg, ${C.purple}cc, ${C.cyan}99)` }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            {isEditing ? "Guardar" : "Crear"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── MemoryCard ───────────────────────────────────────────────────────────────
interface MemoryCardProps {
  entry: MemoryEntry;
  search: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  index: number;
}

function MemoryCard({ entry, search, isSelected, onToggleSelect, onEdit, onDelete, onTogglePin, index }: MemoryCardProps) {
  const cfg = TYPE_CONFIG[entry.type];
  const rel = relativeDate(entry.updatedAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, delay: index < 9 ? index * 0.025 : 0 }}
      className="relative flex flex-col rounded-2xl p-4 group"
      style={{
        background: C.surface,
        border: `1px solid rgba(255,255,255,0.06)`,
        borderLeft: `2px solid ${cfg.color}`,
        outline: isSelected ? `2px solid ${cfg.color}50` : "none",
        outlineOffset: 1,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.background = "var(--bg-surface-2)";
          (e.currentTarget as HTMLDivElement).style.borderColor = `${cfg.color}40`;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.background = C.surface;
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)";
        }
      }}
    >
      {/* Checkbox — appears on hover or when selected */}
      <div
        className={`absolute top-3 left-3 z-10 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-3.5 h-3.5 cursor-pointer accent-[#4A8EB8]"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 pl-5">
          <span className="text-sm" style={{ color: cfg.color }}>{cfg.icon}</span>
          <span
            className="text-[9px] px-2 py-0.5 rounded-full font-semibold tracking-wider"
            style={{
              background: `${cfg.color}12`,
              color: cfg.color,
              border: `1px solid ${cfg.color}25`,
            }}
          >
            {cfg.label}
          </span>
          {entry.pinned && (
            <span className="text-[11px]" style={{ color: C.amber }}>📌</span>
          )}
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onTogglePin}
            className="text-[11px] transition-colors p-0.5"
            style={{ color: entry.pinned ? C.amber : C.muted }}
            title="Fijar / desfijar"
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.amber; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = entry.pinned ? C.amber : C.muted; }}
          >
            📌
          </button>
          <button
            onClick={onEdit}
            className="text-[11px] transition-colors p-0.5"
            style={{ color: C.muted }}
            title="Editar"
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.cyan; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.muted; }}
          >
            ✎
          </button>
          <button
            onClick={onDelete}
            className="text-[11px] transition-colors p-0.5"
            style={{ color: C.muted }}
            title="Eliminar"
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.red; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.muted; }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-[13px] font-semibold mb-1.5 leading-snug" style={{ color: C.text }}>
        {highlightText(entry.title, search)}
      </h4>

      {/* Content preview */}
      <p className="text-[12px] line-clamp-3 leading-relaxed flex-1" style={{ color: "var(--text-muted)" }}>
        {highlightText(entry.content, search)}
      </p>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded font-medium"
              style={{
                background: `${cfg.color}0e`,
                color: cfg.color,
                border: `1px solid ${cfg.color}1e`,
              }}
            >
              #{highlightText(tag, search)}
            </span>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <p
        className="text-[9px] mt-2 font-mono cursor-help"
        style={{ color: `${C.muted}70` }}
        title={rel.full}
      >
        {rel.short}
      </p>
    </motion.div>
  );
}

// ─── StatBadge ────────────────────────────────────────────────────────────────
function StatBadge({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
      style={{ background: `${color}0c`, border: `1px solid ${color}20` }}
    >
      <span className="text-[14px] font-bold font-mono" style={{ color }}>{value}</span>
      <span className="text-[9px] font-semibold" style={{ color: `${color}90` }}>{label}</span>
    </div>
  );
}

// ─── Main Memory Page ─────────────────────────────────────────────────────────
export default function MemoryPage() {
  const { memory, addMemory, updateMemory, deleteMemory, togglePinMemory, showToast } = useAstraeo();

  const [search,     setSearch]     = useState("");
  const [filterType, setFilterType] = useState<MemoryType | "all">("all");
  const [sortMode,   setSortMode]   = useState<SortMode>("pinned");
  const [editing,    setEditing]    = useState<MemoryEntry | null>(null);
  const [creating,   setCreating]   = useState(false);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{
    title: string; content: string; type: MemoryType; tags: string; pinned: boolean;
  }>({ title: "", content: "", type: "fact", tags: "", pinned: false });
  const importRef = useRef<HTMLInputElement>(null);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const byType = (t: MemoryType) => memory.filter((m) => m.type === t).length;
    return {
      total:     memory.length,
      pinned:    memory.filter((m) => m.pinned).length,
      project:   byType("project"),
      reference: byType("reference"),
      feedback:  byType("feedback"),
      user:      byType("user"),
      fact:      byType("fact"),
      lastUpdated: memory.length > 0
        ? [...memory].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0].updatedAt
        : null,
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
        return [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      case "oldest":
        return [...list].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
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
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
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
            addMemory({ title: entry.title, content: entry.content, type: entry.type, tags: entry.tags ?? [], pinned: entry.pinned ?? false });
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
    exportMemory(memory.filter((m) => selected.has(m.id)));
    setSelected(new Set());
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: C.bg }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        className="px-5 py-3.5 flex-shrink-0"
        style={{ borderBottom: `1px solid rgba(255,255,255,0.06)`, background: "rgba(5,8,16,0.9)" }}
      >
        {/* Top row: title + actions */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(102,85,204,0.1)",
                border: `1px solid rgba(102,85,204,0.25)`,
                boxShadow: `0 0 16px rgba(102,85,204,0.12)`,
              }}
            >
              <span style={{ fontSize: 14 }}>◍</span>
            </div>
            <div>
              <h2
                className="text-[12px] font-bold tracking-widest uppercase"
                style={{ color: C.text, letterSpacing: "0.14em" }}
              >
                Memoria del Sistema
              </h2>
              <p className="text-[9px] font-mono" style={{ color: C.muted }}>
                Vector store · {stats.total} entradas
                {stats.lastUpdated && ` · actualizado ${relativeDate(stats.lastUpdated).short}`}
              </p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Export / Import / Nueva */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportMemory(memory)}
              className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{ color: C.muted, border: `1px solid rgba(255,255,255,0.06)`, background: "transparent" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.color = C.text;
                el.style.borderColor = "rgba(255,255,255,0.14)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.color = C.muted;
                el.style.borderColor = "rgba(255,255,255,0.06)";
              }}
              title="Exportar todas"
            >
              ↑ Exportar
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{ color: C.muted, border: `1px solid rgba(255,255,255,0.06)`, background: "transparent" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.color = C.text;
                el.style.borderColor = "rgba(255,255,255,0.14)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.color = C.muted;
                el.style.borderColor = "rgba(255,255,255,0.06)";
              }}
              title="Importar JSON"
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
              onClick={() => { setCreating(true); setEditing(null); setForm({ title: "", content: "", type: "fact", tags: "", pinned: false }); }}
              className="text-[11px] font-semibold px-4 py-2 rounded-xl transition-all text-white"
              style={{ background: `linear-gradient(135deg, ${C.purple}cc, ${C.cyan}99)` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              + Nueva
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <StatBadge value={stats.total}     label="total"        color={C.cyan} />
          <StatBadge value={stats.pinned}    label="pinneadas"    color={C.amber} />
          <StatBadge value={stats.project}   label="proyectos"    color={C.purple} />
          <StatBadge value={stats.reference} label="referencias"  color={C.emerald} />
          <StatBadge value={stats.feedback}  label="feedback"     color={C.coral} />
          <StatBadge value={stats.user}      label="usuario"      color={C.cyan} />
          <StatBadge value={stats.fact}      label="hechos"       color={C.muted} />
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48 max-w-72">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] pointer-events-none"
              style={{ color: C.muted }}
            >
              ◎
            </span>
            <input
              className="w-full text-[12px] rounded-lg pl-7 pr-3 py-2 outline-none transition-all"
              style={{
                background: C.surface,
                border: `1px solid rgba(255,255,255,0.07)`,
                color: C.text,
              }}
              placeholder="Buscar memorias..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = `rgba(74,142,184,0.3)`; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
            />
          </div>

          {/* Sort */}
          <select
            className="text-[11px] rounded-lg px-3 py-2 outline-none cursor-pointer"
            style={{ background: C.surface, border: `1px solid rgba(255,255,255,0.07)`, color: C.muted }}
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
          >
            {(Object.keys(SORT_LABELS) as SortMode[]).map((k) => (
              <option key={k} value={k} style={{ background: C.surface }}>{SORT_LABELS[k]}</option>
            ))}
          </select>

          {/* Type filters */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilterType("all")}
              className="text-[9px] px-2.5 py-1.5 rounded-lg font-semibold tracking-wider uppercase transition-all"
              style={{
                background: filterType === "all" ? "rgba(74,142,184,0.1)" : "transparent",
                color: filterType === "all" ? C.cyan : C.muted,
                border: `1px solid ${filterType === "all" ? "rgba(74,142,184,0.25)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              Todas
            </button>
            {(Object.keys(TYPE_CONFIG) as MemoryType[]).map((t) => {
              const cfg = TYPE_CONFIG[t];
              return (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-all"
                  style={{
                    background: filterType === t ? `${cfg.color}12` : "transparent",
                    color: filterType === t ? cfg.color : C.muted,
                    border: `1px solid ${filterType === t ? cfg.color + "30" : "rgba(255,255,255,0.06)"}`,
                  }}
                  title={cfg.label}
                >
                  {cfg.icon}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bulk actions floating bar ─────────────────────────────────────── */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="mx-5 mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl flex-shrink-0"
            style={{
              background: "rgba(74,142,184,0.06)",
              border: `1px solid rgba(74,142,184,0.18)`,
            }}
          >
            <span className="text-[12px] font-semibold" style={{ color: C.cyan }}>
              {selected.size} seleccionadas
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setSelected(new Set())}
              className="text-[11px] transition-colors"
              style={{ color: C.muted }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.text; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.muted; }}
            >
              Deseleccionar
            </button>
            <button
              onClick={exportSelected}
              className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all"
              style={{ color: C.muted, border: `1px solid rgba(255,255,255,0.08)` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.text; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.muted; }}
            >
              ↑ Exportar seleccionadas
            </button>
            <button
              onClick={deleteSelected}
              className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all"
              style={{
                background: "rgba(255,71,87,0.1)",
                border: `1px solid rgba(255,71,87,0.25)`,
                color: C.red,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,71,87,0.18)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,71,87,0.1)"; }}
            >
              ✕ Eliminar {selected.size}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cards grid ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5">
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Create / Edit form */}
          <AnimatePresence>
            {(creating || editing) && (
              <MemoryForm
                initialData={form}
                isEditing={editing !== null}
                onChange={setForm}
                onSave={handleSave}
                onCancel={closeForm}
              />
            )}
          </AnimatePresence>

          {/* Cards */}
          <AnimatePresence mode="popLayout">
            {filtered.map((m, idx) => (
              <MemoryCard
                key={m.id}
                entry={m}
                search={search}
                isSelected={selected.has(m.id)}
                onToggleSelect={() => toggleSelect(m.id)}
                onEdit={() => openEdit(m)}
                onDelete={() => { deleteMemory(m.id); showToast("Memoria eliminada", "info"); }}
                onTogglePin={() => togglePinMemory(m.id)}
                index={idx}
              />
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {filtered.length === 0 && !creating && !editing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full flex flex-col items-center justify-center py-24 gap-4"
              style={{ opacity: 0.4 }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.07)` }}
              >
                ◎
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                  {search ? `Sin resultados para "${search}"` : "No hay memorias"}
                </p>
                {!search && (
                  <p className="text-[12px]" style={{ color: C.muted }}>
                    Crea tu primera memoria con el botón + Nueva
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
