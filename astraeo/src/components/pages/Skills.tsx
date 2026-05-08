"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SearchIcon, PlusIcon, ZapIcon, XIcon, CheckIcon,
  TrendingUpIcon, ClockIcon, UsersIcon, StarIcon,
  FilterIcon, ChevronRightIcon, ToggleLeftIcon,
} from "lucide-react";
import { useAstraeo } from "@/store/astraeo";
import type { Skill, SkillCategory } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<SkillCategory | "all", { label: string; color: string; bg: string; emoji: string }> = {
  all:           { label: "Todas",        color: "#F0EDE6", bg: "rgba(232,236,248,0.08)", emoji: "✨" },
  research:      { label: "Investigación",color: "#4A8EB8", bg: "rgba(0,212,255,0.08)",   emoji: "🔍" },
  writing:       { label: "Escritura",    color: "#6655CC", bg: "rgba(123,97,255,0.08)",  emoji: "✍️" },
  code:          { label: "Código",       color: "#3D8A60", bg: "rgba(0,229,160,0.08)",   emoji: "💻" },
  data:          { label: "Datos",        color: "#B88530", bg: "rgba(255,184,0,0.08)",   emoji: "📊" },
  visual:        { label: "Visual",       color: "#B04858", bg: "rgba(255,107,157,0.08)", emoji: "🎨" },
  communication: { label: "Comunicación", color: "#4A8EB8", bg: "rgba(0,212,255,0.08)",   emoji: "💬" },
  automation:    { label: "Automatización",color: "#6655CC",bg: "rgba(123,97,255,0.08)",  emoji: "⚙️" },
};

const DIFFICULTY_CONFIG = {
  beginner:     { label: "Básico",       color: "#3D8A60", bg: "rgba(0,229,160,0.1)"   },
  intermediate: { label: "Intermedio",   color: "#B88530", bg: "rgba(255,184,0,0.1)"   },
  advanced:     { label: "Avanzado",     color: "#A83C50", bg: "rgba(255,71,87,0.1)"   },
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);
  useEffect(() => {
    start.current = null;
    const tick = (ts: number) => {
      if (!start.current) start.current = ts;
      const p = Math.min((ts - start.current) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * ease));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return val;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
        style={{ height: "100%", background: color, borderRadius: 2, boxShadow: `0 0 4px ${color}80` }}
      />
    </div>
  );
}

function AgentDots({ agentIds, agents }: { agentIds: string[]; agents: { id: string; color: string; name: string }[] }) {
  const matched = agentIds.slice(0, 4).map((id) => agents.find((a) => a.id === id)).filter(Boolean);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: -4 }}>
      {matched.map((agent, i) => (
        <div
          key={agent!.id}
          title={agent!.name}
          style={{
            width: 20, height: 20, borderRadius: "50%",
            background: `${agent!.color}22`,
            border: `1.5px solid ${agent!.color}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, color: agent!.color, fontWeight: 700,
            marginLeft: i > 0 ? -6 : 0,
            zIndex: matched.length - i,
            position: "relative",
          }}
        >
          {agent!.name[0]}
        </div>
      ))}
      {agentIds.length > 4 && (
        <div style={{
          width: 20, height: 20, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          border: "1.5px solid rgba(255,255,255,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, color: "#6A7898", fontWeight: 700,
          marginLeft: -6, zIndex: 0, position: "relative",
        }}>
          +{agentIds.length - 4}
        </div>
      )}
    </div>
  );
}

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
  const usage = useCountUp(skill.usageCount, 1000 + index * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: EASE }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      onClick={onSelect}
      style={{
        borderRadius: 14,
        border: `1px solid ${skill.active ? `${cat.color}28` : "rgba(26,39,68,0.5)"}`,
        background: skill.active ? `${cat.color}05` : "rgba(8,12,26,0.6)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        overflow: "hidden",
        transition: "box-shadow 0.2s, border-color 0.2s",
        boxShadow: skill.active ? `0 4px 24px ${cat.color}12` : "none",
      }}
    >
      {/* Top color bar */}
      <div style={{ height: 3, background: skill.active ? cat.color : "rgba(26,39,68,0.4)", opacity: skill.active ? 0.7 : 0.3 }} />

      <div style={{ padding: "16px 16px 14px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: cat.bg,
            border: `1px solid ${cat.color}22`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
            filter: skill.active ? "none" : "grayscale(0.6)",
          }}>
            {skill.icon}
          </div>

          {/* Badges */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
            <span style={{
              fontSize: 9, padding: "2px 8px", borderRadius: 4,
              background: cat.bg, color: cat.color,
              border: `1px solid ${cat.color}28`,
              fontWeight: 700, letterSpacing: "0.06em",
              fontFamily: "var(--font-mono)",
            }}>
              {cat.label.toUpperCase()}
            </span>
            <span style={{
              fontSize: 9, padding: "2px 7px", borderRadius: 4,
              background: diff.bg, color: diff.color,
              fontWeight: 600, letterSpacing: "0.04em",
            }}>
              {diff.label}
            </span>
          </div>
        </div>

        {/* Name + desc */}
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#F0EDE6", marginBottom: 5, letterSpacing: "0.01em" }}>
          {skill.name}
        </h3>
        <p style={{
          fontSize: 11, color: "#6A7898", lineHeight: 1.55,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden", marginBottom: 14,
        }}>
          {skill.description}
        </p>

        {/* Stats row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <TrendingUpIcon size={10} color={cat.color} />
              <span style={{ fontSize: 10, color: cat.color, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                {usage.toLocaleString()}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <StarIcon size={10} color="#B88530" />
              <span style={{ fontSize: 10, color: "#B88530", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                {skill.successRate.toFixed(1)}%
              </span>
            </div>
          </div>
          <AgentDots agentIds={skill.agentIds} agents={agents} />
        </div>

        {/* Success rate bar */}
        <StatBar value={skill.successRate} color={cat.color} />

        {/* Footer: tags + toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {skill.tags.slice(0, 2).map((tag) => (
              <span key={tag} style={{
                fontSize: 9, padding: "2px 6px", borderRadius: 3,
                background: "rgba(255,255,255,0.05)",
                color: "#4A5568",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                {tag}
              </span>
            ))}
          </div>
          <motion.button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 32, height: 18, borderRadius: 9,
              background: skill.active ? `${cat.color}25` : "rgba(26,39,68,0.8)",
              border: `1px solid ${skill.active ? `${cat.color}50` : "rgba(26,39,68,0.9)"}`,
              position: "relative", cursor: "pointer", padding: 0, flexShrink: 0,
              transition: "all 0.2s",
            }}
          >
            <motion.div
              animate={{ x: skill.active ? 14 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              style={{
                position: "absolute", top: 2,
                width: 12, height: 12, borderRadius: "50%",
                background: skill.active ? cat.color : "#4A5568",
              }}
            />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function SkillDetail({ skill, agents, onClose, onToggle }: {
  skill: Skill;
  agents: { id: string; color: string; name: string; role: string }[];
  onClose: () => void;
  onToggle: () => void;
}) {
  const cat = CATEGORY_CONFIG[skill.category];
  const diff = DIFFICULTY_CONFIG[skill.difficulty];
  const usageVal = useCountUp(skill.usageCount, 1000);
  const successVal = useCountUp(Math.round(skill.successRate * 10), 800);
  const assignedAgents = skill.agentIds.map((id) => agents.find((a) => a.id === id)).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(5,8,16,0.85)",
        backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.22, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 540, maxHeight: "80vh",
          borderRadius: 20,
          border: `1px solid ${cat.color}30`,
          background: "rgba(8,12,26,0.98)",
          backdropFilter: "blur(40px)",
          boxShadow: `0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px ${cat.color}08`,
          overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header gradient */}
        <div style={{
          padding: "24px 24px 20px",
          background: `linear-gradient(135deg, ${cat.color}0A 0%, transparent 60%)`,
          borderBottom: `1px solid rgba(255,255,255,0.05)`,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: cat.bg, border: `1px solid ${cat.color}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 30, flexShrink: 0,
            }}>
              {skill.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#F0EDE6" }}>{skill.name}</h2>
                {skill.builtIn && (
                  <span style={{
                    fontSize: 9, padding: "2px 7px", borderRadius: 4,
                    background: "rgba(0,212,255,0.1)", color: "#4A8EB8",
                    border: "1px solid rgba(0,212,255,0.2)", fontWeight: 700,
                    letterSpacing: "0.06em",
                  }}>SISTEMA</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{
                  fontSize: 10, padding: "3px 8px", borderRadius: 4,
                  background: cat.bg, color: cat.color,
                  border: `1px solid ${cat.color}28`, fontWeight: 600,
                }}>
                  {cat.emoji} {cat.label}
                </span>
                <span style={{
                  fontSize: 10, padding: "3px 8px", borderRadius: 4,
                  background: diff.bg, color: diff.color,
                  fontWeight: 600,
                }}>
                  {diff.label}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer", color: "#6A7898",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <XIcon size={14} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {/* Description */}
          <p style={{ fontSize: 13, color: "#9BA8C0", lineHeight: 1.65, marginBottom: 20 }}>
            {skill.description}
          </p>

          {/* Metrics grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { icon: TrendingUpIcon, label: "Usos totales", value: usageVal.toLocaleString(), color: cat.color },
              { icon: StarIcon, label: "Tasa éxito", value: `${(successVal / 10).toFixed(1)}%`, color: "#B88530" },
              { icon: ClockIcon, label: "Tiempo medio", value: `${(skill.avgDurationMs / 1000).toFixed(1)}s`, color: "#6655CC" },
            ].map((m) => (
              <div key={m.label} style={{
                padding: "12px 14px", borderRadius: 10,
                background: `${m.color}08`,
                border: `1px solid ${m.color}18`,
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <m.icon size={13} color={m.color} />
                <div style={{ fontSize: 16, fontWeight: 700, color: m.color, fontFamily: "var(--font-mono)" }}>
                  {m.value}
                </div>
                <div style={{ fontSize: 9, color: "#4A5568", letterSpacing: "0.05em" }}>{m.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Success bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: "#4A5568", letterSpacing: "0.06em" }}>TASA DE ÉXITO</span>
              <span style={{ fontSize: 10, color: cat.color, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                {skill.successRate.toFixed(1)}%
              </span>
            </div>
            <StatBar value={skill.successRate} color={cat.color} />
          </div>

          {/* Agents */}
          {assignedAgents.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 10, color: "#4A5568", letterSpacing: "0.06em", marginBottom: 10 }}>
                AGENTES ASIGNADOS ({assignedAgents.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {assignedAgents.map((agent) => (
                  <div key={agent!.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 8,
                    background: `${agent!.color}08`,
                    border: `1px solid ${agent!.color}20`,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: `${agent!.color}20`,
                      border: `1.5px solid ${agent!.color}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, color: agent!.color, fontWeight: 700,
                    }}>
                      {agent!.name[0]}
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#F0EDE6" }}>{agent!.name}</p>
                      <p style={{ fontSize: 10, color: "#6A7898" }}>{agent!.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <p style={{ fontSize: 10, color: "#4A5568", letterSpacing: "0.06em", marginBottom: 8 }}>ETIQUETAS</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {skill.tags.map((tag) => (
                <span key={tag} style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 6,
                  background: cat.bg, color: cat.color,
                  border: `1px solid ${cat.color}22`,
                  fontWeight: 500,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", gap: 10,
        }}>
          <motion.button
            onClick={onToggle}
            whileTap={{ scale: 0.96 }}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              border: `1px solid ${skill.active ? "rgba(255,71,87,0.3)" : `${cat.color}35`}`,
              background: skill.active ? "rgba(255,71,87,0.08)" : `${cat.color}10`,
              color: skill.active ? "#A83C50" : cat.color,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
          >
            <ToggleLeftIcon size={14} />
            {skill.active ? "Desactivar habilidad" : "Activar habilidad"}
          </motion.button>
          <motion.button
            onClick={onClose}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: "10px 20px", borderRadius: 10,
              border: "1px solid rgba(26,39,68,0.7)",
              background: "transparent",
              color: "#6A7898", fontSize: 12, fontWeight: 500, cursor: "pointer",
            }}
          >
            Cerrar
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── New Skill Form ───────────────────────────────────────────────────────────

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

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags((p) => [...p, t]); setTagInput(""); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(5,8,16,0.85)", backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          borderRadius: 20,
          border: "1px solid rgba(0,212,255,0.2)",
          background: "rgba(8,12,26,0.98)",
          backdropFilter: "blur(40px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(0,212,255,0.1)",
              border: "1px solid rgba(0,212,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <PlusIcon size={14} color="#4A8EB8" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#F0EDE6" }}>Nueva Habilidad</h3>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 7,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer", color: "#6A7898",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <XIcon size={13} />
          </button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Icon + Name row */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div>
              <label style={{ fontSize: 10, color: "#4A5568", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>ICONO</label>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                style={{
                  width: 52, height: 44, borderRadius: 10, textAlign: "center",
                  background: "rgba(10,15,31,0.6)",
                  border: "1px solid rgba(26,39,68,0.7)",
                  color: "#F0EDE6", fontSize: 22, cursor: "pointer", boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: "#4A5568", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>NOMBRE *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre de la habilidad..."
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  background: "rgba(10,15,31,0.6)",
                  border: "1px solid rgba(26,39,68,0.7)",
                  color: "#F0EDE6", fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 10, color: "#4A5568", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>DESCRIPCIÓN</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe qué hace esta habilidad..."
              rows={3}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                background: "rgba(10,15,31,0.6)",
                border: "1px solid rgba(26,39,68,0.7)",
                color: "#F0EDE6", fontSize: 12, lineHeight: 1.5, resize: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ fontSize: 10, color: "#4A5568", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>CATEGORÍA</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(Object.keys(CATEGORY_CONFIG) as (SkillCategory | "all")[]).filter((k) => k !== "all").map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const sel = category === cat;
                return (
                  <button key={cat} onClick={() => setCategory(cat as SkillCategory)} style={{
                    padding: "5px 11px", borderRadius: 6,
                    background: sel ? cfg.bg : "rgba(10,15,31,0.4)",
                    border: `1px solid ${sel ? `${cfg.color}40` : "rgba(26,39,68,0.6)"}`,
                    color: sel ? cfg.color : "#6A7898",
                    fontSize: 11, fontWeight: sel ? 700 : 500, cursor: "pointer",
                    transition: "all 0.15s",
                  }}>
                    {cfg.emoji} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label style={{ fontSize: 10, color: "#4A5568", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>DIFICULTAD</label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["beginner", "intermediate", "advanced"] as const).map((d) => {
                const cfg = DIFFICULTY_CONFIG[d];
                const sel = difficulty === d;
                return (
                  <button key={d} onClick={() => setDifficulty(d)} style={{
                    flex: 1, padding: "7px 0", borderRadius: 7,
                    background: sel ? cfg.bg : "rgba(10,15,31,0.4)",
                    border: `1px solid ${sel ? `${cfg.color}40` : "rgba(26,39,68,0.6)"}`,
                    color: sel ? cfg.color : "#6A7898",
                    fontSize: 11, fontWeight: sel ? 700 : 500, cursor: "pointer",
                  }}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label style={{ fontSize: 10, color: "#4A5568", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>ETIQUETAS</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
              {tags.map((t) => (
                <span key={t} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 5,
                  background: "rgba(0,212,255,0.08)", color: "#4A8EB8",
                  border: "1px solid rgba(0,212,255,0.2)", fontSize: 11,
                }}>
                  {t}
                  <button onClick={() => setTags((p) => p.filter((x) => x !== t))} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(0,212,255,0.5)", fontSize: 11, padding: 0, lineHeight: 1,
                  }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTag(); }}
                placeholder="Añadir etiqueta..."
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 7,
                  background: "rgba(10,15,31,0.6)",
                  border: "1px solid rgba(26,39,68,0.7)",
                  color: "#F0EDE6", fontSize: 12, boxSizing: "border-box",
                }}
              />
              <button onClick={addTag} style={{
                padding: "0 14px", borderRadius: 7,
                background: "rgba(0,212,255,0.08)",
                border: "1px solid rgba(0,212,255,0.2)",
                color: "#4A8EB8", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>+</button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", gap: 10,
        }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px 0", borderRadius: 10,
            border: "1px solid rgba(26,39,68,0.7)",
            background: "transparent", color: "#6A7898",
            fontSize: 12, fontWeight: 500, cursor: "pointer",
          }}>
            Cancelar
          </button>
          <motion.button
            onClick={() => {
              if (!name.trim()) return;
              onSave({
                name, description: desc, category,
                difficulty, icon, tags,
                agentIds: [], active: true, builtIn: false,
              });
            }}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 2, padding: "10px 0", borderRadius: 10,
              border: "1px solid rgba(0,212,255,0.35)",
              background: "rgba(0,212,255,0.1)",
              color: "#4A8EB8", fontSize: 12, fontWeight: 700, cursor: "pointer",
              opacity: name.trim() ? 1 : 0.4,
            }}
          >
            <CheckIcon size={13} style={{ display: "inline", marginRight: 6 }} />
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
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()) || s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const activeCount = skills.filter((s) => s.active).length;
  const totalUsage = skills.reduce((sum, s) => sum + s.usageCount, 0);
  const avgSuccess = skills.length > 0 ? skills.reduce((sum, s) => sum + s.successRate, 0) / skills.length : 0;

  const categoryCounts = (Object.keys(CATEGORY_CONFIG) as (SkillCategory | "all")[]).reduce<Record<string, number>>(
    (acc, cat) => {
      acc[cat] = cat === "all" ? skills.length : skills.filter((s) => s.category === cat).length;
      return acc;
    },
    {}
  );

  const agentsMeta = agents.map((a) => ({ id: a.id, color: a.color, name: a.name, role: a.role }));

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: "transparent", overflow: "hidden",
    }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        padding: "18px 24px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(5,8,20,0.6)",
        backdropFilter: "blur(20px)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(123,97,255,0.1))",
                border: "1px solid rgba(0,212,255,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ZapIcon size={15} color="#4A8EB8" />
              </div>
              <h1 style={{
                fontSize: 20, fontWeight: 800, color: "#F0EDE6",
                letterSpacing: "0.08em",
                background: "linear-gradient(135deg, #E8ECF8 0%, #4A8EB8 50%, #6655CC 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                HABILIDADES
              </h1>
            </div>
            <p style={{ fontSize: 12, color: "#6A7898" }}>
              Centro de capacidades · {activeCount} activas de {skills.length} totales
            </p>
          </div>

          {/* Stats pills */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <div style={{
              padding: "6px 12px", borderRadius: 8,
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.18)",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <TrendingUpIcon size={11} color="#4A8EB8" />
              <span style={{ fontSize: 11, color: "#4A8EB8", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                {totalUsage.toLocaleString()} usos
              </span>
            </div>
            <div style={{
              padding: "6px 12px", borderRadius: 8,
              background: "rgba(255,184,0,0.08)",
              border: "1px solid rgba(255,184,0,0.18)",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <StarIcon size={11} color="#B88530" />
              <span style={{ fontSize: 11, color: "#B88530", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                {avgSuccess.toFixed(1)}%
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowForm(true)}
              style={{
                padding: "7px 16px", borderRadius: 8,
                background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(123,97,255,0.1))",
                border: "1px solid rgba(0,212,255,0.3)",
                color: "#4A8EB8", fontSize: 12, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <PlusIcon size={13} />
              Nueva
            </motion.button>
          </div>
        </div>

        {/* Search + filter row */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
            <SearchIcon size={13} color="#4A5568" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar habilidades..."
              style={{
                width: "100%", padding: "8px 12px 8px 32px",
                borderRadius: 8,
                background: "rgba(10,15,31,0.6)",
                border: "1px solid rgba(26,39,68,0.7)",
                color: "#F0EDE6", fontSize: 12, boxSizing: "border-box",
              }}
            />
          </div>

          {/* Category tabs */}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", flexShrink: 0 }}>
            {(Object.keys(CATEGORY_CONFIG) as (SkillCategory | "all")[]).map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const active = activeCategory === cat;
              const count = categoryCounts[cat] ?? 0;
              if (cat !== "all" && count === 0) return null;
              return (
                <motion.button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    padding: "6px 12px", borderRadius: 7, flexShrink: 0,
                    background: active ? cfg.bg : "transparent",
                    border: `1px solid ${active ? `${cfg.color}35` : "rgba(26,39,68,0.5)"}`,
                    color: active ? cfg.color : "#4A5568",
                    fontSize: 11, fontWeight: active ? 700 : 500,
                    cursor: "pointer", transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cat === "all" ? "Todas" : cfg.label}</span>
                  <span style={{
                    fontSize: 9, padding: "1px 5px", borderRadius: 3,
                    background: active ? `${cfg.color}20` : "rgba(255,255,255,0.05)",
                    color: active ? cfg.color : "#4A4A5A",
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

      {/* ── Skills Grid ────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: 240, gap: 14,
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26,
            }}>
              {search ? <FilterIcon size={24} color="#4A4A5A" /> : "⚡"}
            </div>
            <p style={{ color: "#4A4A5A", fontSize: 13, textAlign: "center" }}>
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

      {/* ── Modals ─────────────────────────────────────────── */}
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
            onSave={(data) => {
              addSkill(data);
              setShowForm(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
