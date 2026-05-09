"use client";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon, XIcon, SearchIcon, PinIcon, TrashIcon,
  FolderIcon, FolderOpenIcon, ChevronDownIcon, CheckIcon,
  DatabaseIcon, TagIcon, ClockIcon,
} from "lucide-react";
import { useAstraeo } from "@/store/astraeo";
import type { MemoryEntry, MemoryType } from "@/lib/types";

// ─── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<MemoryType, { label: string; color: string; icon: string; desc: string }> = {
  user:      { label: "Usuario",    color: "#4A8EB8", icon: "◉", desc: "Preferencias y perfil" },
  feedback:  { label: "Feedback",   color: "#B88530", icon: "◈", desc: "Correcciones y ajustes" },
  project:   { label: "Proyecto",   color: "#6655CC", icon: "◆", desc: "Contexto de proyectos" },
  reference: { label: "Referencia", color: "#3D8A60", icon: "◍", desc: "Recursos externos" },
  fact:      { label: "Hecho",      color: "#B04858", icon: "◎", desc: "Datos verificados" },
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days < 7) return `hace ${days}d`;
  return new Date(iso).toLocaleDateString("es", { day: "2-digit", month: "short" });
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${esc})`, "gi"));
  return parts.map((p, i) =>
    new RegExp(esc, "gi").test(p)
      ? <mark key={i} style={{ background: "rgba(74,142,184,0.22)", color: "#4A8EB8", borderRadius: 2, padding: "0 2px" }}>{p}</mark>
      : p
  );
}

// ─── MemoryCard ────────────────────────────────────────────────────────────────

function MemoryCard({ entry, selected, search, onSelect, onPin, onDelete }: {
  entry: MemoryEntry;
  selected: boolean;
  search: string;
  onSelect: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const [hov, setHov] = useState(false);
  const cfg = TYPE_CONFIG[entry.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      onClick={onSelect}
      style={{
        borderRadius: 14,
        border: `1px solid ${selected ? `${cfg.color}40` : hov ? `${cfg.color}22` : "var(--border-subtle)"}`,
        background: selected ? `${cfg.color}08` : hov ? `${cfg.color}04` : "var(--bg-surface)",
        transform: hov || selected ? "translateY(-1px)" : "translateY(0)",
        boxShadow: hov || selected ? `0 6px 20px rgba(0,0,0,0.2)` : "none",
        transition: "all 0.16s ease",
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Accent */}
      <div style={{
        height: 2,
        background: selected
          ? `linear-gradient(90deg, transparent, ${cfg.color}70, ${cfg.color}cc, ${cfg.color}70, transparent)`
          : "var(--border-subtle)",
        transition: "background 0.2s",
      }} />

      <div style={{ padding: "12px 14px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: cfg.color, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 12, fontWeight: 700,
              color: "var(--text-primary)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              marginBottom: 2,
            }}>
              {highlightText(entry.title, search)}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                fontSize: 9, fontWeight: 600, color: cfg.color,
                padding: "1px 5px", borderRadius: 3,
                background: `${cfg.color}12`, border: `1px solid ${cfg.color}20`,
              }}>
                {cfg.label}
              </span>
              {entry.pinned && (
                <span style={{
                  fontSize: 9, color: "#B88530",
                  padding: "1px 5px", borderRadius: 3,
                  background: "rgba(184,133,48,0.1)", border: "1px solid rgba(184,133,48,0.2)",
                }}>
                  📌 Fijada
                </span>
              )}
            </div>
          </div>
          {/* Actions */}
          <AnimatePresence>
            {hov && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{ display: "flex", gap: 4, flexShrink: 0 }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onPin(); }}
                  style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: entry.pinned ? "rgba(184,133,48,0.15)" : "var(--bg-surface-2)",
                    border: `1px solid ${entry.pinned ? "rgba(184,133,48,0.3)" : "var(--border-subtle)"}`,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <PinIcon size={10} color={entry.pinned ? "#B88530" : "var(--text-muted)"} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border-subtle)",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <TrashIcon size={10} color="var(--text-muted)" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content preview */}
        <p style={{
          fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
          marginBottom: 8,
        }}>
          {highlightText(entry.content, search)}
        </p>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {entry.tags.slice(0, 3).map((tag) => (
            <span key={tag} style={{
              fontSize: 9, color: "var(--text-muted)",
              padding: "1px 6px", borderRadius: 4,
              background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)",
            }}>#{tag}</span>
          ))}
          {entry.tags.length > 3 && (
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>+{entry.tags.length - 3}</span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {relativeDate(entry.updatedAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── MemoryDetail ──────────────────────────────────────────────────────────────

function MemoryDetail({ entry, onClose, onPin, onDelete, onEdit }: {
  entry: MemoryEntry;
  onClose: () => void;
  onPin: () => void;
  onDelete: () => void;
  onEdit: (patch: Partial<MemoryEntry>) => void;
}) {
  const cfg = TYPE_CONFIG[entry.type];

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <motion.div
      key={entry.id}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.22, ease: EASE }}
      style={{
        flex: 1, display: "flex", flexDirection: "column",
        background: "var(--bg-surface)",
        borderRadius: 16,
        border: `1px solid ${cfg.color}20`,
        overflow: "hidden",
      }}
    >
      {/* Accent */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, transparent, ${cfg.color}60, ${cfg.color}cc, ${cfg.color}60, transparent)`,
      }} />

      {/* Header */}
      <div style={{
        padding: "16px 20px 14px",
        borderBottom: "1px solid var(--border-subtle)",
        background: `linear-gradient(135deg, ${cfg.color}06 0%, transparent 60%)`,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `${cfg.color}12`, border: `1px solid ${cfg.color}25`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>
            {cfg.icon}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: 15, fontWeight: 700, color: "var(--text-primary)",
              fontFamily: "var(--font-display)", letterSpacing: "0.01em", marginBottom: 4,
            }}>
              {entry.title}
            </h3>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: cfg.color,
                padding: "2px 7px", borderRadius: 4,
                background: `${cfg.color}10`, border: `1px solid ${cfg.color}22`,
              }}>
                {cfg.label}
              </span>
              {entry.pinned && (
                <span style={{
                  fontSize: 10, color: "#B88530",
                  padding: "2px 7px", borderRadius: 4,
                  background: "rgba(184,133,48,0.1)", border: "1px solid rgba(184,133,48,0.2)",
                }}>
                  📌 Fijada
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)",
              cursor: "pointer", color: "var(--text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <XIcon size={12} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <div style={{
          padding: "14px 16px", borderRadius: 10,
          background: "var(--bg-base)", border: "1px solid var(--border-subtle)",
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
            {entry.content}
          </p>
        </div>

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
              <TagIcon size={10} color="var(--text-muted)" />
              <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em" }}>ETIQUETAS</span>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {entry.tags.map((tag) => (
                <span key={tag} style={{
                  fontSize: 11, color: cfg.color,
                  padding: "3px 9px", borderRadius: 5,
                  background: `${cfg.color}10`, border: `1px solid ${cfg.color}22`,
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            { label: "Creada", ts: entry.createdAt },
            { label: "Actualizada", ts: entry.updatedAt },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <ClockIcon size={11} color="var(--text-muted)" />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {item.label}:{" "}
                <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                  {relativeDate(item.ts)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "12px 20px",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex", gap: 8,
      }}>
        <motion.button
          onClick={onPin}
          whileTap={{ scale: 0.96 }}
          style={{
            flex: 1, padding: "8px 0", borderRadius: 8,
            border: `1px solid ${entry.pinned ? "rgba(184,133,48,0.4)" : "var(--border-subtle)"}`,
            background: entry.pinned ? "rgba(184,133,48,0.08)" : "transparent",
            color: entry.pinned ? "#B88530" : "var(--text-muted)",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}
        >
          <PinIcon size={11} />
          {entry.pinned ? "Desfijar" : "Fijar"}
        </motion.button>
        <motion.button
          onClick={onDelete}
          whileTap={{ scale: 0.96 }}
          style={{
            flex: 1, padding: "8px 0", borderRadius: 8,
            border: "1px solid rgba(168,60,80,0.25)",
            background: "rgba(168,60,80,0.06)",
            color: "#A83C50", fontSize: 11, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}
        >
          <TrashIcon size={11} />
          Eliminar
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── NewMemoryModal ────────────────────────────────────────────────────────────

function NewMemoryModal({ defaultType, onClose, onSave }: {
  defaultType?: MemoryType;
  onClose: () => void;
  onSave: (entry: Omit<MemoryEntry, "id" | "createdAt" | "updatedAt">) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<MemoryType>(defaultType ?? "fact");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const FIELD: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    background: "var(--bg-base)", border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box", outline: "none",
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((p) => [...p, t]);
    setTagInput("");
  };

  const currentCfg = TYPE_CONFIG[type];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(10,9,8,0.85)", backdropFilter: "blur(18px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 500,
          borderRadius: 20, overflow: "hidden",
          border: `1px solid ${currentCfg.color}25`,
          background: "var(--bg-surface)",
          boxShadow: "0 36px 80px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{
          height: 2,
          background: `linear-gradient(90deg, transparent, ${currentCfg.color}80, ${currentCfg.color}, ${currentCfg.color}80, transparent)`,
        }} />
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            Nueva Memoria
          </h3>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <XIcon size={12} />
          </button>
        </div>

        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Type selector */}
          <div>
            <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>TIPO</label>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {(Object.entries(TYPE_CONFIG) as [MemoryType, typeof TYPE_CONFIG[MemoryType]][]).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setType(k)}
                  style={{
                    padding: "5px 10px", borderRadius: 7, cursor: "pointer",
                    border: `1px solid ${type === k ? `${v.color}40` : "var(--border-subtle)"}`,
                    background: type === k ? `${v.color}0C` : "var(--bg-base)",
                    color: type === k ? v.color : "var(--text-secondary)",
                    fontSize: 11, fontWeight: type === k ? 700 : 400,
                    transition: "all 0.12s",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <span>{v.icon}</span>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>TÍTULO *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} placeholder="Título de la memoria..." style={FIELD} autoFocus />
          </div>
          <div>
            <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>CONTENIDO</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="Contenido..." style={{ ...FIELD, resize: "none", lineHeight: 1.5 } as React.CSSProperties} />
          </div>
          <div>
            <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>ETIQUETAS</label>
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} placeholder="Etiqueta y Enter..." style={FIELD} />
            {tags.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                {tags.map((t) => (
                  <span key={t} onClick={() => setTags((p) => p.filter((x) => x !== t))} style={{
                    fontSize: 11, color: currentCfg.color, padding: "2px 8px", borderRadius: 5,
                    background: `${currentCfg.color}10`, border: `1px solid ${currentCfg.color}25`,
                    cursor: "pointer",
                  }}>#{t} ×</span>
                ))}
              </div>
            )}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} style={{ accentColor: "#B88530" }} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Fijar esta memoria</span>
          </label>
        </div>

        <div style={{ padding: "12px 22px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
          <motion.button
            onClick={() => {
              if (!title.trim()) return;
              onSave({ title, content, type, tags, pinned });
              onClose();
            }}
            disabled={!title.trim()}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 2, padding: "9px 0", borderRadius: 9,
              border: `1px solid ${currentCfg.color}35`,
              background: `${currentCfg.color}10`,
              color: currentCfg.color, fontSize: 12, fontWeight: 700, cursor: "pointer",
              opacity: title.trim() ? 1 : 0.4,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <CheckIcon size={13} />
            Guardar Memoria
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── FolderPane ────────────────────────────────────────────────────────────────

function FolderPane({ memory, selected, onSelect }: {
  memory: MemoryEntry[];
  selected: MemoryType | "all" | "pinned";
  onSelect: (v: MemoryType | "all" | "pinned") => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const counts = (Object.keys(TYPE_CONFIG) as MemoryType[]).reduce<Record<string, number>>((acc, k) => {
    acc[k] = memory.filter((m) => m.type === k).length;
    return acc;
  }, {});

  const pinnedCount = memory.filter((m) => m.pinned).length;

  // All unique tags
  const tagCounts = memory.reduce<Record<string, number>>((acc, m) => {
    m.tags.forEach((t) => { acc[t] = (acc[t] ?? 0) + 1; });
    return acc;
  }, {});
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div style={{ width: 200, flexShrink: 0, borderRight: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* All + Pinned */}
      <div style={{ padding: "10px 8px 4px" }}>
        {([
          { key: "all", label: "Todas", icon: <DatabaseIcon size={12} />, count: memory.length, color: "var(--text-primary)" },
          { key: "pinned", label: "Fijadas", icon: <PinIcon size={12} />, count: pinnedCount, color: "#B88530" },
        ] as const).map((item) => (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            style={{
              width: "100%", padding: "7px 10px", borderRadius: 8, marginBottom: 2,
              border: `1px solid ${selected === item.key ? "rgba(240,237,230,0.12)" : "transparent"}`,
              background: selected === item.key ? "var(--bg-surface-2)" : "transparent",
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              transition: "all 0.12s",
            }}
          >
            <span style={{ color: selected === item.key ? item.color : "var(--text-muted)" }}>{item.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: selected === item.key ? "var(--text-primary)" : "var(--text-secondary)", flex: 1, textAlign: "left" }}>
              {item.label}
            </span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{item.count}</span>
          </button>
        ))}
      </div>

      {/* Folders */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{ margin: "4px 8px", padding: "4px 10px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
      >
        <motion.div animate={{ rotate: expanded ? 0 : -90 }} transition={{ duration: 0.18 }}>
          <ChevronDownIcon size={11} color="var(--text-muted)" />
        </motion.div>
        <span style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.09em", fontWeight: 700 }}>TIPOS</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", padding: "0 8px" }}
          >
            {(Object.entries(TYPE_CONFIG) as [MemoryType, typeof TYPE_CONFIG[MemoryType]][]).map(([k, v]) => {
              const isActive = selected === k;
              const FolderIco = isActive ? FolderOpenIcon : FolderIcon;
              return (
                <motion.button
                  key={k}
                  onClick={() => onSelect(k)}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: "100%", padding: "7px 10px", borderRadius: 8, marginBottom: 2,
                    border: `1px solid ${isActive ? `${v.color}30` : "transparent"}`,
                    background: isActive ? `${v.color}0A` : "transparent",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    transition: "all 0.12s",
                  }}
                >
                  <FolderIco size={12} color={isActive ? v.color : "var(--text-muted)"} />
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <span style={{ fontSize: 11, color: isActive ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: isActive ? 600 : 400 }}>
                      {v.label}
                    </span>
                    <p style={{ fontSize: 9, color: "var(--text-muted)", margin: 0 }}>{v.desc}</p>
                  </div>
                  <span style={{ fontSize: 9, color: isActive ? v.color : "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {counts[k] ?? 0}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top tags */}
      {topTags.length > 0 && (
        <>
          <div style={{ margin: "8px 8px 4px", padding: "0 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <TagIcon size={10} color="var(--text-muted)" />
            <span style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.09em", fontWeight: 700 }}>TAGS FRECUENTES</span>
          </div>
          <div style={{ padding: "0 8px 10px", display: "flex", flexWrap: "wrap", gap: 4 }}>
            {topTags.map(([tag, count]) => (
              <span key={tag} style={{
                fontSize: 9, color: "var(--text-secondary)",
                padding: "2px 6px", borderRadius: 4,
                background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)",
                cursor: "default",
              }}>
                #{tag} <span style={{ color: "var(--text-muted)" }}>{count}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MemoryPage() {
  const { memory, addMemory, updateMemory, deleteMemory } = useAstraeo();
  const [folder, setFolder] = useState<MemoryType | "all" | "pinned">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "pinned" | "alpha">("pinned");
  const [selected, setSelected] = useState<MemoryEntry | null>(null);
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    let items = memory;
    if (folder === "pinned") items = items.filter((m) => m.pinned);
    else if (folder !== "all") items = items.filter((m) => m.type === folder);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((m) =>
        m.title.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q) ||
        m.tags.some((t) => t.includes(q))
      );
    }
    if (sort === "pinned") items = [...items].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    else if (sort === "recent") items = [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    else items = [...items].sort((a, b) => a.title.localeCompare(b.title, "es"));
    return items;
  }, [memory, folder, search, sort]);

  const totalSize = memory.reduce((s, m) => s + m.content.length, 0);

  const handlePin = (id: string) => {
    const entry = memory.find((m) => m.id === id);
    if (!entry) return;
    updateMemory(id, { pinned: !entry.pinned });
    setSelected((prev) => prev?.id === id ? { ...prev, pinned: !prev.pinned } : prev);
  };

  const handleDelete = (id: string) => {
    deleteMemory(id);
    setSelected((prev) => prev?.id === id ? null : prev);
  };

  const folderLabel = folder === "all" ? "Todas" : folder === "pinned" ? "Fijadas" : TYPE_CONFIG[folder].label;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ─────────────────────────────────── */}
      <div style={{
        padding: "16px 22px 12px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
          <div>
            <h1 style={{
              fontSize: 20, fontWeight: 700, color: "var(--text-primary)",
              fontFamily: "var(--font-display)", letterSpacing: "0.01em", marginBottom: 2,
            }}>
              Memoria
            </h1>
            <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {memory.length} entradas · {(totalSize / 1000).toFixed(1)}KB almacenados
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <SearchIcon size={12} color="var(--text-muted)" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en memoria..."
                style={{
                  padding: "7px 10px 7px 26px", borderRadius: 8, width: 190,
                  background: "var(--bg-base)", border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)", fontSize: 12, outline: "none",
                }}
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              style={{
                padding: "7px 10px", borderRadius: 8,
                background: "var(--bg-base)", border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)", fontSize: 11, cursor: "pointer", outline: "none",
              }}
            >
              <option value="pinned">Fijadas primero</option>
              <option value="recent">Más reciente</option>
              <option value="alpha">Alfabético</option>
            </select>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowNew(true)}
              style={{
                padding: "7px 14px", borderRadius: 8,
                background: "rgba(74,142,184,0.1)",
                border: "1px solid rgba(74,142,184,0.28)",
                color: "#4A8EB8", fontSize: 12, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <PlusIcon size={13} />
              Nueva
            </motion.button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: "flex", gap: 8 }}>
          {(Object.entries(TYPE_CONFIG) as [MemoryType, typeof TYPE_CONFIG[MemoryType]][]).map(([k, v]) => {
            const count = memory.filter((m) => m.type === k).length;
            return (
              <div key={k} onClick={() => setFolder(k)} style={{
                flex: 1, padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                background: folder === k ? `${v.color}0A` : "var(--bg-base)",
                border: `1px solid ${folder === k ? `${v.color}28` : "var(--border-subtle)"}`,
                transition: "all 0.15s",
              }}>
                <p style={{ fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.07em", marginBottom: 3 }}>{v.label.toUpperCase()}</p>
                <p style={{ fontSize: 17, fontWeight: 700, color: v.color, fontFamily: "var(--font-display)" }}>{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <FolderPane memory={memory} selected={folder} onSelect={setFolder} />

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Cards column */}
          <div style={{ flex: selected ? "0 0 360px" : "1", display: "flex", flexDirection: "column", overflow: "hidden", borderRight: selected ? "1px solid var(--border-subtle)" : "none" }}>
            {/* Breadcrumb */}
            <div style={{
              padding: "8px 14px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex", alignItems: "center", gap: 6,
              flexShrink: 0,
            }}>
              <FolderOpenIcon size={11} color="var(--text-muted)" />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Memoria</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>/</span>
              <span style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 600 }}>{folderLabel}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {filtered.length}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ padding: "50px 20px", textAlign: "center" }}
                  >
                    <DatabaseIcon size={24} color="var(--text-muted)" style={{ margin: "0 auto 10px" }} />
                    <p style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Sin memorias</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 11 }}>
                      {search ? `Sin resultados para "${search}"` : "Esta carpeta está vacía"}
                    </p>
                  </motion.div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {filtered.map((entry) => (
                      <MemoryCard
                        key={entry.id}
                        entry={entry}
                        selected={selected?.id === entry.id}
                        search={search}
                        onSelect={() => setSelected(entry)}
                        onPin={() => handlePin(entry.id)}
                        onDelete={() => handleDelete(entry.id)}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Detail pane */}
          <AnimatePresence>
            {selected && (
              <div style={{ flex: 1, padding: "14px", overflow: "hidden", display: "flex" }}>
                <MemoryDetail
                  key={selected.id}
                  entry={selected}
                  onClose={() => setSelected(null)}
                  onPin={() => handlePin(selected.id)}
                  onDelete={() => handleDelete(selected.id)}
                  onEdit={(patch) => {
                    updateMemory(selected.id, patch);
                    setSelected((p) => p ? { ...p, ...patch } : null);
                  }}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── New Memory Modal ──────────────────────── */}
      <AnimatePresence>
        {showNew && (
          <NewMemoryModal
            key="new-mem"
            defaultType={folder !== "all" && folder !== "pinned" ? folder : undefined}
            onClose={() => setShowNew(false)}
            onSave={(data) => addMemory(data)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
