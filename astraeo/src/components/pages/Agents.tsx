"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAstraeo } from "@/store/astraeo";
import type { Agent, AgentStatus } from "@/lib/types";

// ── Color palette — CSS variables (tokens v3) ─────────────────────────────────
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

// ── Static data ────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<AgentStatus, string> = {
  online:  C.emerald,
  busy:    C.amber,
  offline: C.muted,
  error:   C.red,
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  online:  "Online",
  busy:    "Ocupado",
  offline: "Offline",
  error:   "Error",
};

const MODELS = [
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5",  sub: "Rápido y económico",   badge: C.emerald },
  { id: "claude-sonnet-4-6",         label: "Sonnet 4.6", sub: "Equilibrado",           badge: C.cyan    },
  { id: "claude-opus-4-7",           label: "Opus 4.7",   sub: "Máxima inteligencia",   badge: "#8A6A55" },
];

const AGENT_COLORS = [C.cyan, C.purple, C.coral, C.emerald, C.amber, C.red];

// Success rates per agent slot (decorative, stable)
const SUCCESS_RATES = [97, 94, 98, 91, 96, 93, 95, 92];

const ACTIVITY_LOG = [
  "Procesó análisis de campaña Meta Ads",
  "Generó informe de conversiones Q2",
  "Optimizó flujo de cualificación de leads",
  "Ejecutó segmentación de audiencia",
  "Actualizó sistema de puntuación CRM",
];

// ── Utility ────────────────────────────────────────────────────────────────────
function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function emptyAgent(): Omit<Agent, "id" | "createdAt" | "tasksCompleted" | "tokensUsed" | "avgResponseMs"> {
  return {
    name: "", role: "", status: "offline", model: "claude-sonnet-4-6",
    systemPrompt: "", skills: [], color: C.cyan, icon: "◉", active: false,
  };
}

// ── Custom hooks ───────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let startTs: number | null = null;
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * ease));
      if (progress < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return value;
}

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

// ── Status dot ─────────────────────────────────────────────────────────────────
function StatusDot({ status, size = 8 }: { status: AgentStatus; size?: number }) {
  const color = STATUS_COLORS[status];
  return (
    <motion.div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        boxShadow: status === "online" ? `0 0 6px ${color}` : "none",
      }}
      animate={status === "online" ? { boxShadow: [`0 0 4px ${color}`, `0 0 12px ${color}`, `0 0 4px ${color}`] } : {}}
      transition={{ duration: 1.6, repeat: Infinity }}
    />
  );
}

// ── Token bar (10 segments) ────────────────────────────────────────────────────
function TokenBar({ pct, color }: { pct: number; color: string }) {
  const filled = Math.round((pct / 100) * 10);
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 3,
            borderRadius: 1,
            background: i < filled ? color : "rgba(255,255,255,0.08)",
            transition: "background 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

// ── Animated performance bar ───────────────────────────────────────────────────
function PerfBar({
  label,
  pct,
  color,
  value,
}: {
  label: string;
  pct: number;
  color: string;
  value: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: C.muted, letterSpacing: "0.03em" }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color, fontWeight: 600 }}>
          {value}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: "rgba(255,255,255,0.05)",
          overflow: "hidden",
        }}
      >
        <motion.div
          style={{
            height: "100%",
            borderRadius: 3,
            background: `linear-gradient(90deg, ${color}60, ${color})`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        />
      </div>
    </div>
  );
}

// ── Agent list card ────────────────────────────────────────────────────────────
interface AgentListCardProps {
  agent: Agent;
  isSelected: boolean;
  index: number;
  onSelect: () => void;
  onStatusChange: (s: AgentStatus) => void;
}

function AgentListCard({ agent, isSelected, index, onSelect, onStatusChange }: AgentListCardProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  useOutsideClick(dropRef, () => setStatusOpen(false));

  const tokenPct = Math.min((agent.tokensUsed / 100_000) * 100, 100);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      onClick={onSelect}
      style={{
        position: "relative",
        borderRadius: 14,
        cursor: "pointer",
        padding: "12px 14px",
        border: isSelected ? `1px solid ${agent.color}35` : `1px solid ${C.border}`,
        background: isSelected
          ? `linear-gradient(135deg, ${agent.color}08 0%, ${C.surface} 100%)`
          : C.surface,
        boxShadow: isSelected ? `0 0 20px ${agent.color}12, inset 0 0 20px ${agent.color}05` : "none",
        transition: "all 0.2s ease",
        overflow: "hidden",
      }}
      whileHover={{ scale: 1.01, boxShadow: `0 4px 20px rgba(0,0,0,0.4)` }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          borderRadius: "14px 0 0 14px",
          background: agent.color,
          opacity: isSelected ? 1 : 0.35,
          transition: "opacity 0.2s ease",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Avatar */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
            background: `${agent.color}14`,
            border: `1px solid ${agent.color}28`,
          }}
        >
          {agent.icon}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: isSelected ? agent.color : C.text,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                transition: "color 0.2s ease",
              }}
            >
              {agent.name}
            </span>
          </div>
          <div
            style={{
              fontSize: 10,
              color: C.muted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginBottom: 6,
            }}
          >
            {agent.role}
          </div>
          <TokenBar pct={tokenPct} color={agent.color} />
        </div>

        {/* Status control */}
        <div
          ref={dropRef}
          style={{ position: "relative", flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setStatusOpen((v) => !v)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "4px 6px",
              borderRadius: 8,
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            title={`Estado: ${STATUS_LABELS[agent.status]}`}
          >
            <StatusDot status={agent.status} size={8} />
            <span
              style={{
                fontSize: 8,
                color: STATUS_COLORS[agent.status],
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {agent.status}
            </span>
          </button>

          <AnimatePresence>
            {statusOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: -4 }}
                transition={{ duration: 0.14 }}
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: 4,
                  zIndex: 50,
                  background: "var(--bg-elevated)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  minWidth: 110,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  padding: "4px 0",
                }}
              >
                {(["online", "busy", "offline", "error"] as AgentStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { onStatusChange(s); setStatusOpen(false); }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    <StatusDot status={s} size={6} />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: agent.status === s ? STATUS_COLORS[s] : C.muted,
                        textTransform: "capitalize",
                      }}
                    >
                      {STATUS_LABELS[s]}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ── Agent detail panel ─────────────────────────────────────────────────────────
interface AgentDetailProps {
  agent: Agent;
  agentIndex: number;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: AgentStatus) => void;
  onDuplicate: () => void;
}

function AgentDetail({ agent, agentIndex, onEdit, onDelete, onStatusChange, onDuplicate }: AgentDetailProps) {
  const tasks   = useCountUp(agent.tasksCompleted);
  const tokens  = useCountUp(agent.tokensUsed);
  const latency = useCountUp(agent.avgResponseMs > 0 ? agent.avgResponseMs : 420);

  const modelMeta = MODELS.find((m) => m.id === agent.model) ?? MODELS[1];
  const successRate = SUCCESS_RATES[agentIndex % SUCCESS_RATES.length];
  const latencyPct = Math.max(0, 100 - Math.min((latency / 2000) * 100, 100));

  const maxTasks  = 500;
  const maxTokens = 1_000_000;
  const tasksPct  = Math.min((agent.tasksCompleted / maxTasks) * 100, 100);
  const tokensPct = Math.min((agent.tokensUsed / maxTokens) * 100, 100);

  // Stable activity log items for this agent
  const activities = ACTIVITY_LOG.slice(0, 3).map((log, i) => {
    const minsAgo = (i + 1) * 14 + agentIndex * 3;
    return { log, minsAgo };
  });

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "28px 32px" }}>
      {/* ── Agent header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: `linear-gradient(135deg, ${agent.color}0A 0%, ${C.surface} 60%)`,
          border: `1px solid ${agent.color}20`,
          borderRadius: 20,
          padding: "24px 28px",
          marginBottom: 20,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: `${agent.color}08`,
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, position: "relative" }}>
          {/* Large avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              flexShrink: 0,
              background: `${agent.color}14`,
              border: `1.5px solid ${agent.color}35`,
              boxShadow: `0 0 24px ${agent.color}20`,
            }}
          >
            {agent.icon}
          </motion.div>

          {/* Name + role + badges */}
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: agent.color,
                margin: 0,
                marginBottom: 4,
              }}
            >
              {agent.name}
            </h2>
            <p style={{ fontSize: 13, color: C.muted, margin: 0, marginBottom: 10 }}>{agent.role}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 10,
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  background: `${modelMeta.badge}18`,
                  color: modelMeta.badge,
                  border: `1px solid ${modelMeta.badge}30`,
                  letterSpacing: "0.04em",
                }}
              >
                {modelMeta.label}
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontWeight: 600,
                  background: `${STATUS_COLORS[agent.status]}18`,
                  color: STATUS_COLORS[agent.status],
                  border: `1px solid ${STATUS_COLORS[agent.status]}30`,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <StatusDot status={agent.status} size={6} />
                {STATUS_LABELS[agent.status]}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <motion.button
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (typeof window !== "undefined") {
                  const { setPage, createChatSession, setActiveChat } = useAstraeo.getState();
                  const sessionId = createChatSession(agent.id);
                  setActiveChat(sessionId);
                  setPage("chat");
                }
              }}
              style={{
                padding: "8px 18px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: `linear-gradient(135deg, ${agent.color}, ${agent.color}99)`,
                color: "#0A0908",
                boxShadow: `0 4px 16px ${agent.color}40`,
              }}
            >
              ◉ Iniciar Chat
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onDuplicate}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                background: "rgba(255,255,255,0.04)",
                color: C.muted,
              }}
            >
              ⊕ Duplicar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onEdit}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                background: "rgba(255,255,255,0.04)",
                color: C.muted,
              }}
            >
              ✎ Config
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onDelete}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: `1px solid ${C.red}25`,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                background: `${C.red}08`,
                color: C.red,
              }}
            >
              ✕
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ── Status control ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: "16px 20px",
          marginBottom: 16,
        }}
      >
        <p
          style={{
            fontSize: 10,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          Estado del agente
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {(["online", "busy", "offline"] as AgentStatus[]).map((s) => {
            const active = agent.status === s;
            return (
              <motion.button
                key={s}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onStatusChange(s)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "7px 14px",
                  borderRadius: 10,
                  border: active ? `1px solid ${STATUS_COLORS[s]}40` : `1px solid ${C.border}`,
                  background: active ? `${STATUS_COLORS[s]}12` : "transparent",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                  color: active ? STATUS_COLORS[s] : C.muted,
                  transition: "all 0.18s ease",
                }}
              >
                <StatusDot status={s} size={7} />
                {STATUS_LABELS[s]}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Performance section ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: "20px 24px",
          marginBottom: 16,
        }}
      >
        <p
          style={{
            fontSize: 10,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          Performance
        </p>
        <PerfBar
          label="Tokens usados"
          pct={tokensPct}
          color={C.purple}
          value={formatTokens(tokens)}
        />
        <PerfBar
          label="Tareas completadas"
          pct={tasksPct}
          color={agent.color}
          value={String(tasks)}
        />
        <PerfBar
          label="Tasa de éxito"
          pct={successRate}
          color={C.emerald}
          value={`${successRate}%`}
        />
        <PerfBar
          label="Latencia promedio"
          pct={latencyPct}
          color={C.amber}
          value={agent.avgResponseMs > 0 ? `${latency}ms` : "420ms"}
        />
      </motion.div>

      {/* ── Skills ── */}
      {agent.skills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: "20px 24px",
            marginBottom: 16,
          }}
        >
          <p
            style={{
              fontSize: 10,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            Skills
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {agent.skills.map((sk, i) => {
              const skillColor = AGENT_COLORS[i % AGENT_COLORS.length];
              return (
                <motion.span
                  key={sk}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  style={{
                    fontSize: 11,
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontWeight: 600,
                    background: `${skillColor}12`,
                    color: skillColor,
                    border: `1px solid ${skillColor}28`,
                    letterSpacing: "0.03em",
                  }}
                >
                  {sk}
                </motion.span>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Model selector ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: "20px 24px",
          marginBottom: 16,
        }}
      >
        <p
          style={{
            fontSize: 10,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          Modelo activo
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {MODELS.map((m) => {
            const active = agent.model === m.id;
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: active ? `1px solid ${m.badge}35` : `1px solid ${C.border}`,
                  background: active ? `${m.badge}08` : "rgba(255,255,255,0.01)",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    background: `${m.badge}18`,
                    color: m.badge,
                    flexShrink: 0,
                  }}
                >
                  {m.label}
                </span>
                <span style={{ fontSize: 11, color: active ? C.text : C.muted, flex: 1 }}>{m.sub}</span>
                {active && (
                  <span style={{ fontSize: 14, color: m.badge }}>✓</span>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Activity log ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: "20px 24px",
        }}
      >
        <p
          style={{
            fontSize: 10,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          Actividad reciente
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {activities.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 14,
                position: "relative",
                paddingBottom: i < activities.length - 1 ? 14 : 0,
              }}
            >
              {/* Timeline line */}
              {i < activities.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: 5,
                    top: 12,
                    bottom: 0,
                    width: 1,
                    background: `linear-gradient(180deg, ${agent.color}40, transparent)`,
                  }}
                />
              )}
              {/* Dot */}
              <div
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: i === 0 ? agent.color : "rgba(255,255,255,0.1)",
                  border: `1px solid ${i === 0 ? agent.color : C.border}`,
                  flexShrink: 0,
                  marginTop: 1,
                  boxShadow: i === 0 ? `0 0 8px ${agent.color}60` : "none",
                }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: C.text, margin: 0, marginBottom: 2, lineHeight: 1.4 }}>
                  {item.log}
                </p>
                <p
                  style={{
                    fontSize: 10,
                    color: C.muted,
                    margin: 0,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {item.minsAgo}m ago
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ── Agent form ─────────────────────────────────────────────────────────────────
type AgentFormData = Omit<Agent, "id" | "createdAt" | "tasksCompleted" | "tokensUsed" | "avgResponseMs">;

interface AgentFormProps {
  form: AgentFormData;
  setForm: React.Dispatch<React.SetStateAction<AgentFormData>>;
  skillInput: string;
  setSkillInput: (v: string) => void;
  addSkill: () => void;
  removeSkill: (sk: string) => void;
  promptChars: number;
  setPromptChars: (n: number) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew: boolean;
}

function AgentForm({
  form, setForm, skillInput, setSkillInput, addSkill, removeSkill,
  promptChars, setPromptChars, onSave, onCancel, isNew,
}: AgentFormProps) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.03)",
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 12,
    color: C.text,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: C.muted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    fontWeight: 700,
    display: "block",
    marginBottom: 6,
  };

  return (
    <div style={{ maxWidth: 520, padding: "28px 32px" }}>
      <h3
        style={{
          fontSize: 16,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: C.text,
          marginBottom: 24,
        }}
      >
        {isNew ? "Nuevo Agente" : "Editar Agente"}
      </h3>

      {/* Name + Role */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Nombre *</label>
          <input
            style={inputStyle}
            placeholder="NEXUS"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label style={labelStyle}>Rol</label>
          <input
            style={inputStyle}
            placeholder="Especialista en..."
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          />
        </div>
      </div>

      {/* Icon */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Icono</label>
        <input
          style={{ ...inputStyle, width: 80 }}
          placeholder="◉"
          value={form.icon}
          onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
        />
      </div>

      {/* Model */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Modelo</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setForm((f) => ({ ...f, model: m.id }))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 10,
                textAlign: "left",
                cursor: "pointer",
                background: form.model === m.id ? `${m.badge}08` : "rgba(255,255,255,0.02)",
                border: `1px solid ${form.model === m.id ? `${m.badge}40` : C.border}`,
                transition: "all 0.16s ease",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 5,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  background: `${m.badge}15`,
                  color: m.badge,
                  flexShrink: 0,
                }}
              >
                {m.label}
              </span>
              <span style={{ fontSize: 11, color: form.model === m.id ? C.text : C.muted }}>{m.sub}</span>
              {form.model === m.id && (
                <span style={{ marginLeft: "auto", color: m.badge, fontSize: 13 }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Color</label>
        <div style={{ display: "flex", gap: 8 }}>
          {AGENT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setForm((f) => ({ ...f, color: c }))}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: c,
                border: "none",
                cursor: "pointer",
                outline: form.color === c ? `2px solid ${c}` : "none",
                outlineOffset: 3,
                transition: "outline 0.15s ease",
              }}
            />
          ))}
        </div>
      </div>

      {/* Skills */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Skills</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Analytics, CRM, SEO..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); }}}
          />
          <button
            onClick={addSkill}
            style={{
              padding: "9px 14px",
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: "rgba(255,255,255,0.04)",
              color: C.text,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            +
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {form.skills.map((sk) => (
            <span
              key={sk}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 20,
                fontWeight: 600,
                background: `${form.color}12`,
                color: form.color,
                border: `1px solid ${form.color}28`,
              }}
            >
              {sk}
              <button
                onClick={() => removeSkill(sk)}
                style={{ background: "none", border: "none", cursor: "pointer", color: form.color, opacity: 0.7, fontSize: 13, lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* System prompt */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <label style={labelStyle}>System Prompt</label>
          <span
            style={{
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              color: promptChars > 3000 ? C.red : C.muted,
            }}
          >
            {promptChars} / 4000
          </span>
        </div>
        <textarea
          style={{
            ...inputStyle,
            resize: "vertical",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            minHeight: 100,
          }}
          rows={5}
          placeholder="Eres un agente especializado en..."
          maxLength={4000}
          value={form.systemPrompt}
          onChange={(e) => {
            setForm((f) => ({ ...f, systemPrompt: e.target.value }));
            setPromptChars(e.target.value.length);
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onCancel}
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: "rgba(255,255,255,0.03)",
            color: C.muted,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Cancelar
        </button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onSave}
          style={{
            padding: "9px 22px",
            borderRadius: 10,
            border: "none",
            background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`,
            color: "#0A0908",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            boxShadow: `0 4px 16px ${C.cyan}30`,
          }}
        >
          {isNew ? "Crear agente" : "Guardar cambios"}
        </motion.button>
      </div>
    </div>
  );
}

// ── Filter tabs ────────────────────────────────────────────────────────────────
type FilterTab = "all" | AgentStatus;

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all",     label: "Todos"   },
  { id: "online",  label: "Online"  },
  { id: "busy",    label: "Ocupado" },
  { id: "offline", label: "Offline" },
];

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const { agents, addAgent, updateAgent, deleteAgent, setAgentStatus, showToast } = useAstraeo();

  const [selected,    setSelected]    = useState<Agent | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editing,     setEditing]     = useState(false);
  const [creating,    setCreating]    = useState(false);
  const [listSearch,  setListSearch]  = useState("");
  const [filterTab,   setFilterTab]   = useState<FilterTab>("all");
  const [form,        setForm]        = useState<AgentFormData>(emptyAgent());
  const [skillInput,  setSkillInput]  = useState("");
  const [promptChars, setPromptChars] = useState(0);

  const filteredAgents = agents.filter((a) => {
    const matchSearch = !listSearch
      || a.name.toLowerCase().includes(listSearch.toLowerCase())
      || a.role.toLowerCase().includes(listSearch.toLowerCase());
    const matchTab = filterTab === "all" || a.status === filterTab;
    return matchSearch && matchTab;
  });

  const onlineCount = agents.filter((a) => a.status === "online").length;

  const handleCreate = () => {
    setForm(emptyAgent());
    setPromptChars(0);
    setCreating(true);
    setEditing(false);
    setSelected(null);
  };

  const handleEdit = (a: Agent) => {
    setForm({
      name: a.name, role: a.role, status: a.status,
      model: a.model, systemPrompt: a.systemPrompt,
      skills: [...a.skills], color: a.color, icon: a.icon, active: a.active,
    });
    setPromptChars(a.systemPrompt.length);
    setEditing(true);
    setCreating(false);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing && selected) {
      updateAgent(selected.id, form);
      showToast(`${form.name} actualizado`, "success");
      setSelected({ ...selected, ...form });
    } else {
      addAgent(form);
      showToast(`${form.name} creado`, "success");
    }
    setEditing(false);
    setCreating(false);
  };

  const addSkill = () => {
    const val = skillInput.trim();
    if (!val || form.skills.includes(val)) return;
    setForm((f) => ({ ...f, skills: [...f.skills, val] }));
    setSkillInput("");
  };

  const removeSkill = (sk: string) =>
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== sk) }));

  const cancelForm = () => { setEditing(false); setCreating(false); };

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        overflow: "hidden",
        background: C.bg,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <div
        style={{
          width: 280,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: `1px solid ${C.border}`,
          background: C.surface,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 16px 14px",
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: C.text,
                  margin: 0,
                  marginBottom: 3,
                }}
              >
                Agentes
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: 10,
                    padding: "1px 7px",
                    borderRadius: 10,
                    background: `${C.emerald}15`,
                    color: C.emerald,
                    border: `1px solid ${C.emerald}25`,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600,
                  }}
                >
                  {agents.length}
                </span>
                <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                  {onlineCount}/{agents.length} online
                </span>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreate}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`,
                color: "#0A0908",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.06em",
                boxShadow: `0 2px 10px ${C.cyan}30`,
              }}
            >
              + Nuevo
            </motion.button>
          </div>

          {/* Search */}
          <input
            placeholder="Buscar agente..."
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 11,
              color: C.text,
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
            {FILTER_TABS.map((tab) => {
              const active = filterTab === tab.id;
              const count = tab.id === "all"
                ? agents.length
                : agents.filter((a) => a.status === tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    borderRadius: 7,
                    border: active ? `1px solid ${C.cyan}30` : "1px solid transparent",
                    background: active ? `${C.cyan}10` : "transparent",
                    color: active ? C.cyan : C.muted,
                    cursor: "pointer",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                  {count > 0 && (
                    <span style={{ marginLeft: 3, opacity: 0.7 }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Agent list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
          <AnimatePresence>
            {filteredAgents.map((a, i) => (
              <div key={a.id} style={{ marginBottom: 6 }}>
                <AgentListCard
                  agent={a}
                  isSelected={selected?.id === a.id}
                  index={i}
                  onSelect={() => {
                    const globalIdx = agents.findIndex((ag) => ag.id === a.id);
                    setSelected(a);
                    setSelectedIdx(globalIdx >= 0 ? globalIdx : 0);
                    setEditing(false);
                    setCreating(false);
                  }}
                  onStatusChange={(s) => {
                    setAgentStatus(a.id, s);
                    if (selected?.id === a.id) setSelected({ ...a, status: s });
                    showToast(`${a.name} → ${s}`, "info");
                  }}
                />
              </div>
            ))}
          </AnimatePresence>

          {filteredAgents.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 0",
                gap: 8,
                opacity: 0.3,
              }}
            >
              <span style={{ fontSize: 28 }}>◉</span>
              <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>Sin resultados</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", background: C.bg }}>
        <AnimatePresence mode="wait">
          {(editing || creating) ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.22 }}
            >
              <AgentForm
                form={form}
                setForm={setForm}
                skillInput={skillInput}
                setSkillInput={setSkillInput}
                addSkill={addSkill}
                removeSkill={removeSkill}
                promptChars={promptChars}
                setPromptChars={setPromptChars}
                onSave={handleSave}
                onCancel={cancelForm}
                isNew={creating}
              />
            </motion.div>
          ) : selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.22 }}
              style={{ height: "100%" }}
            >
              <AgentDetail
                agent={selected}
                agentIndex={selectedIdx}
                onEdit={() => handleEdit(selected)}
                onDelete={() => {
                  deleteAgent(selected.id);
                  setSelected(null);
                  showToast(`${selected.name} eliminado`, "info");
                }}
                onStatusChange={(s) => {
                  setAgentStatus(selected.id, s);
                  setSelected({ ...selected, status: s });
                  showToast(`${selected.name} → ${s}`, "info");
                }}
                onDuplicate={() => {
                  addAgent({
                    name: `${selected.name} (copia)`,
                    role: selected.role,
                    status: "offline",
                    model: selected.model,
                    systemPrompt: selected.systemPrompt,
                    skills: [...selected.skills],
                    color: selected.color,
                    icon: selected.icon,
                    active: false,
                  });
                  showToast(`${selected.name} duplicado`, "success");
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 16,
                opacity: 0.3,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 36,
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${C.border}`,
                }}
              >
                ◉
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, color: C.muted, margin: 0, marginBottom: 4, fontWeight: 600 }}>
                  Selecciona un agente
                </p>
                <p style={{ fontSize: 11, color: C.muted, margin: 0, opacity: 0.7 }}>
                  para ver su perfil y estadísticas
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
