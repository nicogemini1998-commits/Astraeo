"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SearchIcon, PlusIcon, ZapIcon, XIcon, CheckIcon,
  TrendingUpIcon, ClockIcon, StarIcon, FilterIcon, ToggleLeftIcon,
} from "lucide-react";
import { useAstraeo } from "@/store/astraeo";
import type { Skill, SkillCategory } from "@/lib/types";

// ─── Design tokens ────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<SkillCategory | "all", { label: string; color: string; bg: string; emoji: string }> = {
  all:           { label: "Todas",          color: "var(--text-primary)",  bg: "rgba(240,237,230,0.06)", emoji: "◈" },
  research:      { label: "Investigación",  color: "#4A8EB8",              bg: "rgba(74,142,184,0.08)",  emoji: "🔍" },
  writing:       { label: "Escritura",      color: "#6655CC",              bg: "rgba(102,85,204,0.08)", emoji: "✍️" },
  code:          { label: "Código",         color: "#3D8A60",              bg: "rgba(61,138,96,0.08)",  emoji: "💻" },
  data:          { label: "Datos",          color: "#B88530",              bg: "rgba(184,133,48,0.08)", emoji: "📊" },
  visual:        { label: "Visual",         color: "#B04858",              bg: "rgba(176,72,88,0.08)",  emoji: "🎨" },
  communication: { label: "Comunicación",   color: "#4A8EB8",              bg: "rgba(74,142,184,0.08)", emoji: "💬" },
  automation:    { label: "Automatización", color: "#6655CC",              bg: "rgba(102,85,204,0.08)", emoji: "⚙️" },
};

const DIFFICULTY_CONFIG = {
  beginner:     { label: "Básico",     color: "#3D8A60", bg: "rgba(61,138,96,0.1)"  },
  intermediate: { label: "Intermedio", color: "#B88530", bg: "rgba(184,133,48,0.1)" },
  advanced:     { label: "Avanzado",   color: "#A83C50", bg: "rgba(168,60,80,0.1)"  },
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ─── Utils ────────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1000) {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);
  useEffect(() => {
    start.current = null;
    const tick = (ts: number) => {
      if (!start.current) start.current = ts;
      const p = Math.min((ts - start.current) / duration, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return val;
}

// ─── StatBar ──────────────────────────────────────────────────────────────────

function StatBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
        style={{ height: "100%", background: color, borderRadius: 1 }}
      />
    </div>
  );
}

// ─── AgentDots ────────────────────────────────────────────────────────────────

function AgentDots({ agentIds, agents }: { agentIds: string[]; agents: { id: string; color: string; name: string }[] }) {
  const matched = agentIds.slice(0, 4).map((id) => agents.find((a) => a.id === id)).filter(Boolean);
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {matched.map((agent, i) => (
        <div key={agent!.id} title={agent!.name} style={{
          width: 18, height: 18, borderRadius: "50%",
          background: `${agent!.color}18`,
          border: `1.5px solid ${agent!.color}60`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 8, color: agent!.color, fontWeight: 700,
          marginLeft: i > 0 ? -5 : 0,
          zIndex: matched.length - i, position: "relative",
        }}>
          {agent!.name[0]}
        </div>
      ))}
      {agentIds.length > 4 && (
        <div style={{
          width: 18, height: 18, borderRadius: "50%",
          background: "var(--bg-surface-2)", border: "1.5px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 8, color: "var(--text-muted)", fontWeight: 700,
          marginLeft: -5, zIndex: 0, position: "relative",
        }}>
          +{agentIds.length - 4}
        </div>
      )}
    </div>
  );
}

// ─── SkillCard ────────────────────────────────────────────────────────────────

interface SkillCardProps {
  skill: Skill;
  agents: { id: string; color: string; name: string }[];
  onSelect: () => void;
  onToggle: () => void;
  index: number;
}

function SkillCard({ skill, agents, onSelect, onToggle, index }: SkillCardProps) {
  const cat = CATEGORY_CONFIG[skill.category];
  const diff = DIFFICULTY_CONFIG[skill.difficulty];
  const usage = useCountUp(skill.usageCount, 900 + index * 80);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.3, ease: EASE }}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16,
        border: `1px solid ${hovered ? `${cat.color}35` : skill.active ? `${cat.color}22` : "var(--border-subtle)"}`,
        background: hovered
          ? `${cat.color}06`
          : skill.active
          ? `${cat.color}03`
          : "var(--bg-surface)",
        cursor: "pointer",
        overflow: "hidden",
        transition: "border-color 0.2s, background 0.2s, transform 0.15s",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? `0 8px 24px rgba(0,0,0,0.25), 0 0 0 1px ${cat.color}15` : "none",
      }}
    >
      {/* Accent top line */}
      <div style={{
        height: 2,
        background: skill.active
          ? `linear-gradient(90deg, transparent, ${cat.color}80, ${cat.color}cc, ${cat.color}80, transparent)`
          : "var(--border-subtle)",
        opacity: skill.active ? 1 : 0.4,
      }} />

      <div style={{ padding: "16px 16px 14px" }}>
        {/* Icon + badges */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 13, flexShrink: 0,
            background: cat.bg,
            border: `1px solid ${cat.color}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
            filter: skill.active ? "none" : "grayscale(0.5) opacity(0.7)",
          }}>
            {skill.icon}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
            <span style={{
              fontSize: 8, padding: "2px 7px", borderRadius: 4,
              background: cat.bg, color: cat.color,
              border: `1px solid ${cat.color}25`,
              fontWeight: 700, letterSpacing: "0.08em",
              fontFamily: "var(--font-mono)",
            }}>
              {cat.label.toUpperCase()}
            </span>
            <span style={{
              fontSize: 8, padding: "2px 7px", borderRadius: 4,
              background: diff.bg, color: diff.color,
              fontWeight: 600, letterSpacing: "0.04em",
              fontFamily: "var(--font-mono)",
            }}>
              {diff.label.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Name */}
        <h3 style={{
          fontSize: 13, fontWeight: 700,
          color: skill.active ? "var(--text-primary)" : "var(--text-secondary)",
          marginBottom: 5, letterSpacing: "0.01em",
          fontFamily: "var(--font-sans)",
        }}>
          {skill.name}
        </h3>

        {/* Description */}
        <p style={{
          fontSize: 11, color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 14,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {skill.description}
        </p>

        {/* Stats row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <TrendingUpIcon size={9} color={cat.color} />
              <span style={{
                fontSize: 10, color: cat.color,
                fontFamily: "var(--font-mono)", fontWeight: 700,
              }}>
                {usage.toLocaleString()}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <StarIcon size={9} color="#B88530" />
              <span style={{
                fontSize: 10, color: "#B88530",
                fontFamily: "var(--font-mono)", fontWeight: 700,
              }}>
                {skill.successRate.toFixed(0)}%
              </span>
            </div>
          </div>
          <AgentDots agentIds={skill.agentIds} agents={agents} />
        </div>

        {/* Success bar */}
        <StatBar value={skill.successRate} color={cat.color} />

        {/* Footer: tags + toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {skill.tags.slice(0, 2).map((tag) => (
              <span key={tag} style={{
                fontSize: 9, padding: "2px 6px", borderRadius: 3,
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
              }}>
                {tag}
              </span>
            ))}
          </div>

          <motion.button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            whileTap={{ scale: 0.88 }}
            title={skill.active ? "Desactivar" : "Activar"}
            style={{
              width: 34, height: 19, borderRadius: 9.5,
              background: skill.active ? `${cat.color}22` : "var(--bg-surface-2)",
              border: `1px solid ${skill.active ? `${cat.color}45` : "var(--border-subtle)"}`,
              position: "relative", cursor: "pointer", padding: 0, flexShrink: 0,
              transition: "all 0.2s",
            }}
          >
            <motion.div
              animate={{ x: skill.active ? 15 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              style={{
                position: "absolute", top: 2.5,
                width: 12, height: 12, borderRadius: "50%",
                background: skill.active ? cat.color : "var(--text-muted)",
              }}
            />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── SkillDetail ──────────────────────────────────────────────────────────────

function SkillDetail({ skill, agents, onClose, onToggle }: {
  skill: Skill;
  agents: { id: string; color: string; name: string; role: string }[];
  onClose: () => void;
  onToggle: () => void;
}) {
  const cat = CATEGORY_CONFIG[skill.category];
  const diff = DIFFICULTY_CONFIG[skill.difficulty];
  const usageVal = useCountUp(skill.usageCount, 900);
  const successVal = useCountUp(Math.round(skill.successRate * 10), 700);
  const assignedAgents = skill.agentIds.map((id) => agents.find((a) => a.id === id)).filter(Boolean);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(10,9,8,0.85)", backdropFilter: "blur(16px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520, maxHeight: "82vh",
          borderRadius: 20,
          border: `1px solid ${cat.color}28`,
          background: "var(--bg-surface)",
          boxShadow: `0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(240,237,230,0.04)`,
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "22px 24px 18px",
          background: `linear-gradient(135deg, ${cat.color}0A 0%, transparent 70%)`,
          borderBottom: "1px solid var(--border-subtle)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{
              width: 58, height: 58, borderRadius: 15, flexShrink: 0,
              background: cat.bg, border: `1px solid ${cat.color}28`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30,
            }}>
              {skill.icon}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <h2 style={{
                  fontSize: 18, fontWeight: 700, color: "var(--text-primary)",
                  fontFamily: "var(--font-display)",
                }}>
                  {skill.name}
                </h2>
                {skill.builtIn && (
                  <span style={{
                    fontSize: 8, padding: "2px 7px", borderRadius: 4,
                    background: "rgba(74,142,184,0.1)", color: "#4A8EB8",
                    border: "1px solid rgba(74,142,184,0.2)", fontWeight: 700,
                    letterSpacing: "0.08em", fontFamily: "var(--font-mono)",
                  }}>
                    SISTEMA
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{
                  fontSize: 10, padding: "3px 8px", borderRadius: 5,
                  background: cat.bg, color: cat.color,
                  border: `1px solid ${cat.color}25`, fontWeight: 600,
                }}>
                  {cat.emoji} {cat.label}
                </span>
                <span style={{
                  fontSize: 10, padding: "3px 8px", borderRadius: 5,
                  background: diff.bg, color: diff.color, fontWeight: 600,
                }}>
                  {diff.label}
                </span>
              </div>
            </div>

            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)",
              cursor: "pointer", color: "var(--text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <XIcon size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 20 }}>
            {skill.description}
          </p>

          {/* Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { icon: TrendingUpIcon, label: "Usos totales",  value: usageVal.toLocaleString(),           color: cat.color },
              { icon: StarIcon,       label: "Tasa de éxito", value: `${(successVal / 10).toFixed(1)}%`,  color: "#B88530" },
              { icon: ClockIcon,      label: "Duración media",value: `${(skill.avgDurationMs / 1000).toFixed(1)}s`, color: "#6655CC" },
            ].map((m) => (
              <div key={m.label} style={{
                padding: "12px 14px", borderRadius: 10,
                background: `${m.color}08`, border: `1px solid ${m.color}18`,
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <m.icon size={12} color={m.color} />
                <div style={{
                  fontSize: 18, fontWeight: 700, color: m.color,
                  fontFamily: "var(--font-display)",
                }}>
                  {m.value}
                </div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.07em", fontFamily: "var(--font-mono)" }}>
                  {m.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>

          {/* Success rate */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.07em", fontFamily: "var(--font-mono)" }}>TASA DE ÉXITO</span>
              <span style={{ fontSize: 10, color: cat.color, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                {skill.successRate.toFixed(1)}%
              </span>
            </div>
            <StatBar value={skill.successRate} color={cat.color} />
          </div>

          {/* Assigned agents */}
          {assignedAgents.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.07em", marginBottom: 10, fontFamily: "var(--font-mono)" }}>
                AGENTES ASIGNADOS ({assignedAgents.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {assignedAgents.map((agent) => (
                  <div key={agent!.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 9,
                    background: `${agent!.color}06`, border: `1px solid ${agent!.color}18`,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: `${agent!.color}18`, border: `1.5px solid ${agent!.color}50`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, color: agent!.color, fontWeight: 700,
                    }}>
                      {agent!.name[0]}
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{agent!.name}</p>
                      <p style={{ fontSize: 10, color: "var(--text-muted)" }}>{agent!.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {skill.tags.length > 0 && (
            <div>
              <p style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.07em", marginBottom: 8, fontFamily: "var(--font-mono)" }}>
                ETIQUETAS
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {skill.tags.map((tag) => (
                  <span key={tag} style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 6,
                    background: cat.bg, color: cat.color,
                    border: `1px solid ${cat.color}20`, fontWeight: 500,
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid var(--border-subtle)",
          display: "flex", gap: 10,
        }}>
          <motion.button
            onClick={onToggle}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              border: `1px solid ${skill.active ? "rgba(168,60,80,0.3)" : `${cat.color}32`}`,
              background: skill.active ? "rgba(168,60,80,0.07)" : `${cat.color}0C`,
              color: skill.active ? "#A83C50" : cat.color,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
          >
            <ToggleLeftIcon size={14} />
            {skill.active ? "Desactivar" : "Activar"}
          </motion.button>
          <motion.button
            onClick={onClose}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: "10px 22px", borderRadius: 10,
              border: "1px solid var(--border-subtle)",
              background: "transparent", color: "var(--text-muted)",
              fontSize: 12, fontWeight: 500, cursor: "pointer",
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
  onSave: (data: Omit<Skill, "id" | "createdAt" | "usageCount" | "successRate" | "avgDurationMs">) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState<SkillCategory>("research");
  const [difficulty, setDifficulty] = useState<Skill["difficulty"]>("beginner");
  const [icon, setIcon] = useState("⚡");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const addTag = () => {
    const t = tagInput.trim().slice(0, 32);
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags((p) => [...p, t]);
      setTagInput("");
    }
  };

  const catColor = CATEGORY_CONFIG[category].color;

  const FIELD: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 9,
    background: "var(--bg-base)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)", fontSize: 13,
    boxSizing: "border-box", outline: "none",
    fontFamily: "var(--font-sans)",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(10,9,8,0.88)", backdropFilter: "blur(18px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480, borderRadius: 20,
          border: `1px solid ${catColor}22`,
          background: "var(--bg-surface)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px", borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `${catColor}12`, border: `1px solid ${catColor}22`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <PlusIcon size={14} color={catColor} />
            </div>
            <h3 style={{
              fontSize: 15, fontWeight: 700, color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
            }}>
              Nueva Habilidad
            </h3>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 7,
            background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)",
            cursor: "pointer", color: "var(--text-muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <XIcon size={13} />
          </button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, maxHeight: "60vh", overflowY: "auto" }}>
          {/* Icon + Name */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div>
              <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.08em", display: "block", marginBottom: 5, fontFamily: "var(--font-mono)" }}>ICONO</label>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value.slice(0, 2))}
                style={{ ...FIELD, width: 52, height: 44, textAlign: "center", fontSize: 22 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.08em", display: "block", marginBottom: 5, fontFamily: "var(--font-mono)" }}>NOMBRE *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                placeholder="Nombre de la habilidad…"
                autoFocus
                style={FIELD}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.08em", display: "block", marginBottom: 5, fontFamily: "var(--font-mono)" }}>DESCRIPCIÓN</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value.slice(0, 400))}
              placeholder="Qué hace esta habilidad…"
              rows={3}
              style={{ ...FIELD, lineHeight: 1.55, resize: "none" }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.08em", display: "block", marginBottom: 8, fontFamily: "var(--font-mono)" }}>CATEGORÍA</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {(Object.keys(CATEGORY_CONFIG) as (SkillCategory | "all")[]).filter((k) => k !== "all").map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const sel = category === cat;
                return (
                  <button key={cat} onClick={() => setCategory(cat as SkillCategory)} style={{
                    padding: "5px 11px", borderRadius: 7,
                    background: sel ? cfg.bg : "var(--bg-base)",
                    border: `1px solid ${sel ? `${cfg.color}38` : "var(--border-subtle)"}`,
                    color: sel ? cfg.color : "var(--text-muted)",
                    fontSize: 11, fontWeight: sel ? 700 : 500, cursor: "pointer",
                    transition: "all 0.12s",
                  }}>
                    {cfg.emoji} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.08em", display: "block", marginBottom: 8, fontFamily: "var(--font-mono)" }}>DIFICULTAD</label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["beginner", "intermediate", "advanced"] as const).map((d) => {
                const cfg = DIFFICULTY_CONFIG[d];
                const sel = difficulty === d;
                return (
                  <button key={d} onClick={() => setDifficulty(d)} style={{
                    flex: 1, padding: "8px 0", borderRadius: 8,
                    background: sel ? cfg.bg : "var(--bg-base)",
                    border: `1px solid ${sel ? `${cfg.color}38` : "var(--border-subtle)"}`,
                    color: sel ? cfg.color : "var(--text-muted)",
                    fontSize: 11, fontWeight: sel ? 700 : 500, cursor: "pointer",
                    transition: "all 0.12s",
                  }}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.08em", display: "block", marginBottom: 8, fontFamily: "var(--font-mono)" }}>ETIQUETAS</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
              {tags.map((t) => (
                <span key={t} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 5,
                  background: `${catColor}0C`, color: catColor,
                  border: `1px solid ${catColor}22`, fontSize: 11,
                }}>
                  {t}
                  <button
                    onClick={() => setTags((p) => p.filter((x) => x !== t))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: `${catColor}80`, fontSize: 12, padding: 0, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Añadir etiqueta…"
                style={{ ...FIELD, flex: 1 }}
              />
              <button onClick={addTag} style={{
                padding: "0 14px", borderRadius: 8,
                background: `${catColor}0C`, border: `1px solid ${catColor}22`,
                color: catColor, fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>
                +
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid var(--border-subtle)",
          display: "flex", gap: 10,
        }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px 0", borderRadius: 10,
            border: "1px solid var(--border-subtle)", background: "transparent",
            color: "var(--text-muted)", fontSize: 12, fontWeight: 500, cursor: "pointer",
          }}>
            Cancelar
          </button>
          <motion.button
            onClick={() => {
              if (!name.trim()) return;
              onSave({ name: name.trim(), description: desc.trim(), category, difficulty, icon, tags, agentIds: [], active: true, builtIn: false });
            }}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 2, padding: "10px 0", borderRadius: 10,
              border: `1px solid ${catColor}32`,
              background: `${catColor}10`,
              color: catColor, fontSize: 12, fontWeight: 700, cursor: "pointer",
              opacity: name.trim() ? 1 : 0.4,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
          >
            <CheckIcon size={13} />
            Crear Habilidad
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const { skills, agents, toggleSkill, addSkill } = useAstraeo();
  const [activeCategory, setActiveCategory] = useState<SkillCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Skill | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = skills.filter((s) => {
    const matchCat = activeCategory === "all" || s.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const activeCount = skills.filter((s) => s.active).length;
  const totalUsage = skills.reduce((sum, s) => sum + s.usageCount, 0);
  const avgSuccess = skills.length > 0 ? skills.reduce((sum, s) => sum + s.successRate, 0) / skills.length : 0;

  const categoryCounts = (Object.keys(CATEGORY_CONFIG) as (SkillCategory | "all")[]).reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = cat === "all" ? skills.length : skills.filter((s) => s.category === cat).length;
    return acc;
  }, {});

  const agentsMeta = agents.map((a) => ({ id: a.id, color: a.color, name: a.name, role: a.role }));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{
        padding: "18px 24px 14px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-base)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: "rgba(74,142,184,0.1)", border: "1px solid rgba(74,142,184,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ZapIcon size={14} color="#4A8EB8" />
              </div>
              <h1 style={{
                fontSize: 22, fontWeight: 600,
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.01em",
              }}>
                Habilidades
              </h1>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              Centro de capacidades · {activeCount} activas de {skills.length}
            </p>
          </div>

          {/* Stats + CTA */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <div style={{
              padding: "5px 11px", borderRadius: 8,
              background: "rgba(74,142,184,0.08)", border: "1px solid rgba(74,142,184,0.16)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <TrendingUpIcon size={10} color="#4A8EB8" />
              <span style={{ fontSize: 11, color: "#4A8EB8", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                {totalUsage.toLocaleString()} usos
              </span>
            </div>
            <div style={{
              padding: "5px 11px", borderRadius: 8,
              background: "rgba(184,133,48,0.08)", border: "1px solid rgba(184,133,48,0.16)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <StarIcon size={10} color="#B88530" />
              <span style={{ fontSize: 11, color: "#B88530", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                {avgSuccess.toFixed(1)}%
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowForm(true)}
              style={{
                padding: "7px 14px", borderRadius: 9,
                background: "rgba(74,142,184,0.1)", border: "1px solid rgba(74,142,184,0.28)",
                color: "#4A8EB8", fontSize: 12, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <PlusIcon size={13} />
              Nueva
            </motion.button>
          </div>
        </div>

        {/* Search + category filters */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
            <SearchIcon size={12} color="var(--text-muted)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar habilidades…"
              style={{
                width: "100%", padding: "8px 12px 8px 30px",
                borderRadius: 8, background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)", fontSize: 12, boxSizing: "border-box", outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 4, overflowX: "auto", flexShrink: 0 }}>
            {(Object.keys(CATEGORY_CONFIG) as (SkillCategory | "all")[]).map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const isActive = activeCategory === cat;
              const count = categoryCounts[cat] ?? 0;
              if (cat !== "all" && count === 0) return null;
              return (
                <motion.button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    padding: "5px 10px", borderRadius: 7, flexShrink: 0,
                    background: isActive ? cfg.bg : "transparent",
                    border: `1px solid ${isActive ? `${cfg.color}30` : "var(--border-subtle)"}`,
                    color: isActive ? cfg.color : "var(--text-muted)",
                    fontSize: 11, fontWeight: isActive ? 700 : 500, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4, transition: "all 0.12s",
                  }}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cat === "all" ? "Todas" : cfg.label}</span>
                  <span style={{
                    fontSize: 9, padding: "1px 4px", borderRadius: 3,
                    background: isActive ? `${cfg.color}18` : "rgba(255,255,255,0.04)",
                    color: isActive ? cfg.color : "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}>
                    {count}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: 260, gap: 14,
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
            }}>
              {search ? <FilterIcon size={22} color="var(--text-muted)" /> : "⚡"}
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
              {search ? `Sin resultados para "${search}"` : "No hay habilidades en esta categoría"}
            </p>
          </motion.div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}>
            <AnimatePresence mode="popLayout">
              {filtered.map((skill, i) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  agents={agentsMeta}
                  index={i}
                  onSelect={() => setSelected(skill)}
                  onToggle={() => toggleSkill(skill.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selected && (
          <SkillDetail
            key={selected.id}
            skill={selected}
            agents={agentsMeta}
            onClose={() => setSelected(null)}
            onToggle={() => {
              toggleSkill(selected.id);
              setSelected((prev) => prev ? { ...prev, active: !prev.active } : null);
            }}
          />
        )}
        {showForm && (
          <NewSkillForm
            key="new-skill"
            onClose={() => setShowForm(false)}
            onSave={(data) => { addSkill(data); setShowForm(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
