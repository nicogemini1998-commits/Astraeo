"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SearchIcon, PlusIcon, XIcon, CheckIcon, ChevronDownIcon,
  ZapIcon, TrendingUpIcon, StarIcon, FolderIcon, FolderOpenIcon,
  GridIcon, ListIcon,
} from "lucide-react";
import { useAstraeo } from "@/store/astraeo";
import type { Skill, SkillCategory } from "@/lib/types";

// ─── Design system ────────────────────────────────────────────────────────────

const CAT: Record<SkillCategory, { label: string; color: string; emoji: string; desc: string }> = {
  ai:            { label: "IA & Prompting",      color: "#7C6FFF", emoji: "🧠", desc: "Técnicas avanzadas de LLM" },
  research:      { label: "Investigación",        color: "#4A8EB8", emoji: "🔍", desc: "Búsqueda y análisis" },
  writing:       { label: "Escritura",            color: "#6655CC", emoji: "✍️", desc: "Contenido y copy" },
  code:          { label: "Código",               color: "#3D8A60", emoji: "💻", desc: "Desarrollo y arquitectura" },
  data:          { label: "Datos",                color: "#B88530", emoji: "📊", desc: "Analytics y reportes" },
  visual:        { label: "Visual & Diseño",      color: "#B04858", emoji: "🎨", desc: "Creatividades e identidad" },
  communication: { label: "Comunicación",         color: "#4A9B8A", emoji: "💬", desc: "Outreach y mensajería" },
  automation:    { label: "Automatización",       color: "#8B5E9B", emoji: "⚙️", desc: "Workflows y CRM" },
  sales:         { label: "Ventas & CRM",         color: "#C06A2E", emoji: "🎯", desc: "Proceso comercial" },
  strategy:      { label: "Estrategia",           color: "#5B8A3C", emoji: "🔭", desc: "Planificación y negocio" },
};

const DIFF = {
  beginner:     { label: "Básico",     color: "#3D8A60" },
  intermediate: { label: "Medio",      color: "#B88530" },
  advanced:     { label: "Avanzado",   color: "#A83C50" },
} as const;

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ─── CountUp ──────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900) {
  const [v, setV] = useState(0);
  const raf = useRef<number | null>(null);
  const t0 = useRef<number | null>(null);
  useEffect(() => {
    t0.current = null;
    const tick = (ts: number) => {
      if (!t0.current) t0.current = ts;
      const p = Math.min((ts - t0.current) / duration, 1);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return v;
}

// ─── MiniBar ─────────────────────────────────────────────────────────────────

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ width: "100%", height: 2, background: "var(--bg-surface-2)", borderRadius: 1 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, ease: EASE, delay: 0.2 }}
        style={{ height: "100%", borderRadius: 1, background: color }}
      />
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, suffix = "" }: { label: string; value: number; color: string; suffix?: string }) {
  const n = useCountUp(Math.round(value));
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 10,
      background: `${color}07`,
      border: `1px solid ${color}18`,
      flex: 1,
    }}>
      <p style={{ fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "var(--font-display)", lineHeight: 1 }}>
        {n.toLocaleString()}{suffix}
      </p>
    </div>
  );
}

// ─── SkillCard ────────────────────────────────────────────────────────────────

function SkillCard({ skill, selected, onClick }: { skill: Skill; selected: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const cat = CAT[skill.category];
  const diff = DIFF[skill.difficulty];

  return (
    <motion.div
      onClick={onClick}
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      style={{
        borderRadius: 14,
        border: `1px solid ${selected ? `${cat.color}45` : hov ? `${cat.color}28` : "var(--border-subtle)"}`,
        background: selected ? `${cat.color}09` : hov ? `${cat.color}05` : "var(--bg-surface)",
        transform: hov || selected ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hov || selected ? `0 8px 24px rgba(0,0,0,0.22), 0 0 0 1px ${cat.color}12` : "none",
        transition: "all 0.18s ease",
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Accent line */}
      <div style={{
        height: 2,
        background: skill.active
          ? `linear-gradient(90deg, transparent, ${cat.color}70, ${cat.color}cc, ${cat.color}70, transparent)`
          : "var(--border-subtle)",
      }} />

      <div style={{ padding: "12px 14px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: `${cat.color}12`,
            border: `1px solid ${cat.color}22`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>
            {skill.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 12, fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.25, marginBottom: 2,
            }}>
              {skill.name}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, color: diff.color,
                padding: "1px 5px", borderRadius: 3,
                background: `${diff.color}12`,
                border: `1px solid ${diff.color}20`,
              }}>
                {diff.label}
              </span>
              {!skill.active && (
                <span style={{
                  fontSize: 9, color: "var(--text-muted)",
                  padding: "1px 5px", borderRadius: 3,
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-subtle)",
                }}>
                  Inactiva
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{
          fontSize: 11, color: "var(--text-secondary)",
          lineHeight: 1.45, marginBottom: 10,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {skill.description}
        </p>

        {/* Stats row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: cat.color, fontFamily: "var(--font-display)", fontWeight: 700 }}>
            {skill.usageCount.toLocaleString()}
          </span>
          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>usos</span>
          <div style={{ width: 1, height: 10, background: "var(--border-subtle)" }} />
          <span style={{ fontSize: 10, color: skill.successRate >= 95 ? "#3D8A60" : skill.successRate >= 85 ? "#B88530" : "#A83C50", fontFamily: "var(--font-display)", fontWeight: 700 }}>
            {skill.successRate.toFixed(0)}%
          </span>
          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>éxito</span>
        </div>

        <MiniBar value={skill.successRate} color={cat.color} />
      </div>
    </motion.div>
  );
}

// ─── SkillDetail ──────────────────────────────────────────────────────────────

function SkillDetail({ skill, onClose, onToggle }: { skill: Skill; onClose: () => void; onToggle: () => void }) {
  const cat = CAT[skill.category];
  const diff = DIFF[skill.difficulty];

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(10,9,8,0.82)", backdropFilter: "blur(18px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 12 }}
        transition={{ duration: 0.22, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520,
          borderRadius: 20,
          border: `1px solid ${cat.color}25`,
          background: "var(--bg-surface)",
          overflow: "hidden",
          boxShadow: `0 40px 90px rgba(0,0,0,0.55), 0 0 0 1px ${cat.color}12`,
        }}
      >
        {/* Color stripe */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, transparent, ${cat.color}80, ${cat.color}, ${cat.color}80, transparent)`,
        }} />

        {/* Header */}
        <div style={{
          padding: "18px 22px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          background: `linear-gradient(135deg, ${cat.color}07 0%, transparent 55%)`,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 13, flexShrink: 0,
              background: `${cat.color}14`,
              border: `1px solid ${cat.color}28`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24,
            }}>
              {skill.icon}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: 17, fontWeight: 700, color: "var(--text-primary)",
                fontFamily: "var(--font-display)", letterSpacing: "0.01em", marginBottom: 5,
              }}>
                {skill.name}
              </h2>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: cat.color,
                  padding: "2px 8px", borderRadius: 5,
                  background: `${cat.color}10`, border: `1px solid ${cat.color}22`,
                }}>
                  {cat.emoji} {cat.label}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: diff.color,
                  padding: "2px 8px", borderRadius: 5,
                  background: `${diff.color}10`, border: `1px solid ${diff.color}22`,
                }}>
                  {diff.label}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)",
                cursor: "pointer", color: "var(--text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <XIcon size={13} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px" }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 18 }}>
            {skill.description}
          </p>

          {/* Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
            {[
              { label: "USOS TOTALES", value: skill.usageCount.toLocaleString(), color: cat.color },
              { label: "TASA ÉXITO",   value: `${skill.successRate.toFixed(1)}%`, color: "#3D8A60" },
              { label: "DURACIÓN AVG", value: `${(skill.avgDurationMs / 1000).toFixed(1)}s`, color: "#B88530" },
            ].map((m) => (
              <div key={m.label} style={{
                padding: "10px 12px", borderRadius: 10,
                background: `${m.color}07`, border: `1px solid ${m.color}15`,
              }}>
                <p style={{ fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.07em", marginBottom: 4 }}>{m.label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: m.color, fontFamily: "var(--font-display)" }}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Tags */}
          {skill.tags.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
              {skill.tags.map((tag) => (
                <span key={tag} style={{
                  fontSize: 10, color: "var(--text-secondary)",
                  padding: "3px 8px", borderRadius: 5,
                  background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)",
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Reliability bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em" }}>FIABILIDAD</span>
              <span style={{ fontSize: 10, color: "#3D8A60", fontFamily: "var(--font-display)", fontWeight: 700 }}>{skill.successRate.toFixed(1)}%</span>
            </div>
            <div style={{ height: 4, background: "var(--bg-surface-2)", borderRadius: 2 }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${skill.successRate}%` }}
                transition={{ duration: 1, ease: EASE }}
                style={{
                  height: "100%", borderRadius: 2,
                  background: `linear-gradient(90deg, ${cat.color}80, ${cat.color})`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 22px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex", gap: 8,
        }}>
          <motion.button
            onClick={onToggle}
            whileTap={{ scale: 0.96 }}
            style={{
              flex: 2, padding: "9px 0", borderRadius: 9,
              border: `1px solid ${skill.active ? "rgba(168,60,80,0.3)" : `${cat.color}35`}`,
              background: skill.active ? "rgba(168,60,80,0.07)" : `${cat.color}10`,
              color: skill.active ? "#A83C50" : cat.color,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            {skill.active ? "⏸ Desactivar" : "▶ Activar"}
          </motion.button>
          <motion.button
            onClick={onClose}
            whileTap={{ scale: 0.96 }}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 9,
              border: "1px solid var(--border-subtle)",
              background: "transparent",
              color: "var(--text-muted)", fontSize: 12, cursor: "pointer",
            }}
          >
            Cerrar
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── NewSkillForm ─────────────────────────────────────────────────────────────

function NewSkillForm({ onClose, onSave }: {
  onClose: () => void;
  onSave: (s: Omit<Skill, "id" | "createdAt" | "usageCount" | "successRate" | "avgDurationMs">) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState<SkillCategory>("ai");
  const [diff, setDiff] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [icon, setIcon] = useState("⚡");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

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
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 500,
          borderRadius: 20,
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          overflow: "hidden",
          boxShadow: "0 36px 80px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ height: 2, background: "linear-gradient(90deg, transparent, #7C6FFF80, #7C6FFF, #7C6FFF80, transparent)" }} />
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Nueva Skill</h3>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <XIcon size={12} />
          </button>
        </div>
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 8 }}>
            <div>
              <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>ICONO</label>
              <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} style={{ ...FIELD, textAlign: "center", fontSize: 20 }} />
            </div>
            <div>
              <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>NOMBRE *</label>
              <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} placeholder="Nombre de la skill..." style={FIELD} autoFocus />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>DESCRIPCIÓN</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value.slice(0, 300))} placeholder="¿Qué hace esta skill?" rows={3} style={{ ...FIELD, resize: "none", lineHeight: 1.5 } as React.CSSProperties} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>CATEGORÍA</label>
              <select value={cat} onChange={(e) => setCat(e.target.value as SkillCategory)} style={{ ...FIELD, cursor: "pointer" } as React.CSSProperties}>
                {(Object.entries(CAT) as [SkillCategory, typeof CAT[SkillCategory]][]).map(([k, v]) => (
                  <option key={k} value={k} style={{ background: "var(--bg-surface)" }}>{v.emoji} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>DIFICULTAD</label>
              <select value={diff} onChange={(e) => setDiff(e.target.value as typeof diff)} style={{ ...FIELD, cursor: "pointer" } as React.CSSProperties}>
                <option value="beginner" style={{ background: "var(--bg-surface)" }}>Básico</option>
                <option value="intermediate" style={{ background: "var(--bg-surface)" }}>Intermedio</option>
                <option value="advanced" style={{ background: "var(--bg-surface)" }}>Avanzado</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>ETIQUETAS</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} placeholder="Tag y Enter..." style={{ ...FIELD, flex: 1 }} />
            </div>
            {tags.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                {tags.map((t) => (
                  <span key={t} onClick={() => setTags((p) => p.filter((x) => x !== t))} style={{
                    fontSize: 11, color: "#7C6FFF", padding: "2px 8px", borderRadius: 5,
                    background: "rgba(124,111,255,0.1)", border: "1px solid rgba(124,111,255,0.25)",
                    cursor: "pointer",
                  }}>#{t} ×</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: "12px 22px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
          <motion.button
            onClick={() => {
              if (!name.trim()) return;
              onSave({ name, description: desc, category: cat, difficulty: diff, icon, tags, agentIds: [], active: true, builtIn: false });
              onClose();
            }}
            disabled={!name.trim()}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 2, padding: "9px 0", borderRadius: 9,
              border: "1px solid rgba(124,111,255,0.35)", background: "rgba(124,111,255,0.1)",
              color: "#7C6FFF", fontSize: 12, fontWeight: 700, cursor: "pointer",
              opacity: name.trim() ? 1 : 0.4,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <CheckIcon size={13} />
            Crear Skill
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── FolderTree ───────────────────────────────────────────────────────────────

function FolderTree({ skills, selected, onSelect }: {
  skills: Skill[];
  selected: SkillCategory | "all";
  onSelect: (cat: SkillCategory | "all") => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const counts = (Object.keys(CAT) as SkillCategory[]).reduce<Record<string, { total: number; active: number }>>((acc, k) => {
    const group = skills.filter((s) => s.category === k);
    acc[k] = { total: group.length, active: group.filter((s) => s.active).length };
    return acc;
  }, {});

  const total = skills.length;
  const totalActive = skills.filter((s) => s.active).length;

  return (
    <div style={{ width: 210, flexShrink: 0, borderRight: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* All skills */}
      <button
        onClick={() => onSelect("all")}
        style={{
          margin: "10px 8px 4px",
          padding: "8px 10px",
          borderRadius: 9,
          border: `1px solid ${selected === "all" ? "rgba(240,237,230,0.12)" : "transparent"}`,
          background: selected === "all" ? "var(--bg-surface-2)" : "transparent",
          cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
          textAlign: "left",
          transition: "all 0.12s",
        }}
      >
        <GridIcon size={13} color={selected === "all" ? "var(--text-primary)" : "var(--text-muted)"} />
        <span style={{ fontSize: 12, fontWeight: 600, color: selected === "all" ? "var(--text-primary)" : "var(--text-secondary)", flex: 1 }}>
          Todas
        </span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{total}</span>
      </button>

      {/* Folder header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          margin: "8px 8px 4px",
          padding: "4px 10px",
          border: "none", background: "transparent", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <motion.div animate={{ rotate: expanded ? 0 : -90 }} transition={{ duration: 0.18 }}>
          <ChevronDownIcon size={11} color="var(--text-muted)" />
        </motion.div>
        <span style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.09em", fontWeight: 700 }}>CARPETAS</span>
        <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: "auto", fontFamily: "var(--font-mono)" }}>{totalActive}/{total}</span>
      </button>

      {/* Category folders */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflowY: "auto", flex: 1, padding: "0 8px 10px" }}
          >
            {(Object.entries(CAT) as [SkillCategory, typeof CAT[SkillCategory]][]).map(([k, v]) => {
              const count = counts[k];
              const isActive = selected === k;
              const FolderIco = isActive ? FolderOpenIcon : FolderIcon;
              return (
                <motion.button
                  key={k}
                  onClick={() => onSelect(k)}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: `1px solid ${isActive ? `${v.color}30` : "transparent"}`,
                    background: isActive ? `${v.color}0A` : "transparent",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    marginBottom: 2,
                    transition: "all 0.12s",
                  }}
                >
                  <FolderIco size={12} color={isActive ? v.color : "var(--text-muted)"} />
                  <span style={{ fontSize: 11, color: isActive ? "var(--text-primary)" : "var(--text-secondary)", flex: 1, textAlign: "left", fontWeight: isActive ? 600 : 400 }}>
                    {v.label}
                  </span>
                  <span style={{
                    fontSize: 9, fontFamily: "var(--font-mono)",
                    color: isActive ? v.color : "var(--text-muted)",
                    minWidth: 16, textAlign: "right",
                  }}>
                    {count?.total ?? 0}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const { skills, toggleSkill, addSkill } = useAstraeo();
  const [catFilter, setCatFilter] = useState<SkillCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Skill | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewMode] = useState<"grid" | "list">("grid");

  const filtered = skills.filter((s) => {
    const matchCat = catFilter === "all" || s.category === catFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some((t) => t.includes(q));
    return matchCat && matchSearch;
  });

  const totalUsage = skills.reduce((s, sk) => s + sk.usageCount, 0);
  const avgSuccess = skills.length > 0 ? skills.reduce((s, sk) => s + sk.successRate, 0) / skills.length : 0;
  const activeCount = skills.filter((s) => s.active).length;

  const catLabel = catFilter === "all" ? "Todas las Skills" : CAT[catFilter].label;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        padding: "16px 22px 12px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
          <div>
            <h1 style={{
              fontSize: 20, fontWeight: 700, color: "var(--text-primary)",
              fontFamily: "var(--font-display)", letterSpacing: "0.01em", marginBottom: 2,
            }}>
              Habilidades
            </h1>
            <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {skills.length} skills · {activeCount} activas · organizadas por categoría
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <SearchIcon size={12} color="var(--text-muted)" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar skills..."
                style={{
                  padding: "7px 10px 7px 26px",
                  borderRadius: 8, width: 180,
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)", fontSize: 12, outline: "none",
                }}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowForm(true)}
              style={{
                padding: "7px 14px", borderRadius: 8,
                background: "rgba(124,111,255,0.1)",
                border: "1px solid rgba(124,111,255,0.28)",
                color: "#7C6FFF", fontSize: 12, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <PlusIcon size={13} />
              Nueva
            </motion.button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 8 }}>
          <StatCard label="SKILLS TOTALES" value={skills.length} color="#7C6FFF" />
          <StatCard label="USOS TOTALES" value={totalUsage} color="#4A8EB8" />
          <StatCard label="ÉXITO PROMEDIO" value={Math.round(avgSuccess)} color="#3D8A60" suffix="%" />
          <StatCard label="ACTIVAS" value={activeCount} color="#B88530" />
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <FolderTree skills={skills} selected={catFilter} onSelect={setCatFilter} />

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Breadcrumb */}
          <div style={{
            padding: "8px 16px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex", alignItems: "center", gap: 6,
            flexShrink: 0,
          }}>
            <FolderOpenIcon size={12} color="var(--text-muted)" />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Skills</span>
            {catFilter !== "all" && (
              <>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>/</span>
                <span style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 600 }}>
                  {CAT[catFilter].emoji} {CAT[catFilter].label}
                </span>
              </>
            )}
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Cards grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ padding: "60px 20px", textAlign: "center" }}
              >
                <ZapIcon size={28} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
                <p style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, marginBottom: 5 }}>Sin resultados</p>
                <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  {search ? `No hay skills que coincidan con "${search}"` : `Carpeta "${catLabel}" vacía`}
                </p>
              </motion.div>
            ) : (
              <motion.div
                layout
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                <AnimatePresence>
                  {filtered.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      selected={selected?.id === skill.id}
                      onClick={() => setSelected(skill)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <SkillDetail
            key={selected.id}
            skill={selected}
            onClose={() => setSelected(null)}
            onToggle={() => {
              toggleSkill(selected.id);
              setSelected((p) => p ? { ...p, active: !p.active } : null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── New Skill Form ────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <NewSkillForm
            key="new-skill"
            onClose={() => setShowForm(false)}
            onSave={(data) => addSkill(data)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
