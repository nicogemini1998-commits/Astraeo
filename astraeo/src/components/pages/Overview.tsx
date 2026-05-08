"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Zap, CheckCircle2, Clock, Activity,
  TrendingUp, MessageSquare, Cpu, Database, Users,
} from "lucide-react";
import { useAstraeo } from "@/store/astraeo";
import type { Agent, Notification } from "@/lib/types";

const COLORS = {
  cyan: "#00D4FF",
  purple: "#7B61FF",
  emerald: "#00E5A0",
  amber: "#FFB800",
  coral: "#FF6B9D",
  red: "#FF4757",
  bg: "#050810",
  surface: "#0D1120",
  border: "rgba(255,255,255,0.06)",
  text: "#E8ECF8",
  muted: "#3A4560",
} as const;

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function getDeptAbbr(role: string): string {
  const map: Record<string, string> = {
    "Chief": "CSO", "Paid": "ADS", "Especialista": "SPE",
    "Growth": "GRW", "Analytics": "ANL", "SEO": "SEO",
    "Content": "CNT", "Ventas": "VNT", "IA": "AI",
  };
  for (const key of Object.keys(map)) {
    if (role.includes(key)) return map[key];
  }
  return role.slice(0, 3).toUpperCase();
}

function getNotifColor(type: Notification["type"]): string {
  const map: Record<Notification["type"], string> = {
    success: COLORS.emerald,
    warning: COLORS.amber,
    error: COLORS.red,
    info: COLORS.cyan,
  };
  return map[type];
}

function getSystemStatus(onlineCount: number, total: number): { ok: boolean; label: string } {
  const ratio = total > 0 ? onlineCount / total : 0;
  return ratio >= 0.7
    ? { ok: true, label: "TODOS LOS SISTEMAS OPERATIVOS" }
    : { ok: false, label: "SISTEMA DEGRADADO" };
}

interface KpiCardProps {
  label: string;
  value: string | number;
  target: number;
  color: string;
  icon: React.ReactNode;
  trend: "up" | "flat" | "down";
  trendText: string;
  delay: number;
}

function KpiCard({ label, color, icon, trend, trendText, delay, target }: KpiCardProps) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    const end = target;

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * end));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  const trendColor = trend === "up" ? COLORS.emerald : trend === "down" ? COLORS.red : COLORS.muted;
  const trendSymbol = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: `linear-gradient(135deg, ${COLORS.surface} 0%, rgba(13,17,32,0.95) 100%)`,
        border: `1px solid ${color}22`,
        borderRadius: 16,
        padding: "20px 22px 16px",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
      }}
    >
      {/* ambient glow */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: 16,
        background: `radial-gradient(ellipse at top left, ${color}08 0%, transparent 60%)`,
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{
          fontSize: 10, letterSpacing: "0.18em", fontWeight: 700,
          color: COLORS.muted, textTransform: "uppercase",
        }}>{label}</p>
        <div style={{
          width: 36, height: 36, borderRadius: 10, display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
          background: `${color}12`, border: `1px solid ${color}30`, color,
        }}>
          {icon}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 6 }}>
        <span style={{
          fontSize: 36, fontWeight: 800, lineHeight: 1, color,
          fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
        }}>
          {displayed.toLocaleString()}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, color: trendColor,
          background: `${trendColor}18`, border: `1px solid ${trendColor}30`,
          borderRadius: 20, padding: "2px 8px", marginBottom: 4,
        }}>
          {trendSymbol} {trendText}
        </span>
      </div>

      {/* bottom accent bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 3, background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: 0.6,
      }} />
    </motion.div>
  );
}

interface AgentCardProps {
  agent: Agent;
  onChat: (agentId: string) => void;
  delay: number;
}

function AgentCard({ agent, onChat, delay }: AgentCardProps) {
  const [hovered, setHovered] = useState(false);
  const statusColors: Record<string, string> = {
    online: COLORS.emerald,
    busy: COLORS.amber,
    offline: COLORS.muted,
    error: COLORS.red,
  };
  const statusColor = statusColors[agent.status] ?? COLORS.muted;
  const tokenPct = Math.min(100, Math.round((agent.tokensUsed / 50000) * 100));
  const deptAbbr = getDeptAbbr(agent.role);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? `linear-gradient(135deg, ${agent.color}0D 0%, ${COLORS.surface} 100%)`
          : COLORS.surface,
        border: `1px solid ${hovered ? `${agent.color}40` : `${agent.color}1A`}`,
        borderRadius: 14,
        padding: "16px",
        cursor: "pointer",
        transition: "all 0.22s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onClick={() => onChat(agent.id)}
    >
      {/* Subtle corner accent */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 60, height: 60,
        background: `radial-gradient(circle at top right, ${agent.color}10 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
        <div style={{
          minWidth: 36, height: 36, borderRadius: 10, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: `${agent.color}15`, border: `1px solid ${agent.color}35`,
          fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
          color: agent.color, flexShrink: 0,
        }}>
          {deptAbbr}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{
              fontSize: 13, fontWeight: 700, color: COLORS.text,
              letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {agent.name}
            </span>
            {/* Status dot */}
            <div style={{
              width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
              background: statusColor,
              boxShadow: agent.status === "online" ? `0 0 8px ${statusColor}` : "none",
              animation: agent.status === "online" ? "pulseGlow 2s ease-in-out infinite" : "none",
            }} />
          </div>
          <p style={{
            fontSize: 10, color: COLORS.muted, letterSpacing: "0.02em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {agent.role.split("·")[0].trim()}
          </p>
        </div>
      </div>

      {/* Token bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginBottom: 4,
        }}>
          <span style={{ fontSize: 9, color: COLORS.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            TOKENS
          </span>
          <span style={{ fontSize: 9, color: agent.color, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
            {formatTokens(agent.tokensUsed)}
          </span>
        </div>
        <div style={{
          height: 3, borderRadius: 4,
          background: `${COLORS.muted}30`, overflow: "hidden",
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${tokenPct}%` }}
            transition={{ duration: 1.1, delay: delay + 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: "100%", borderRadius: 4,
              background: `linear-gradient(90deg, ${agent.color}80, ${agent.color})`,
              boxShadow: `0 0 6px ${agent.color}60`,
            }}
          />
        </div>
      </div>

      {/* Footer: tasks + chat button */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{
          fontSize: 10, color: COLORS.muted,
          fontVariantNumeric: "tabular-nums",
        }}>
          <span style={{ color: COLORS.text, fontWeight: 600 }}>{agent.tasksCompleted}</span> tareas
        </span>

        <AnimatePresence>
          {hovered && (
            <motion.button
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.18 }}
              style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                color: agent.color, background: `${agent.color}18`,
                border: `1px solid ${agent.color}40`, borderRadius: 6,
                padding: "4px 10px", cursor: "pointer",
              }}
              onClick={(e) => { e.stopPropagation(); onChat(agent.id); }}
            >
              CHAT →
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface ActivityFeedProps {
  notifications: Notification[];
}

function ActivityFeed({ notifications }: ActivityFeedProps) {
  const recent = useMemo(() => notifications.slice(0, 8), [notifications]);

  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 16, padding: "20px", height: "100%",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Activity size={14} color={COLORS.cyan} />
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
            color: COLORS.text, textTransform: "uppercase",
          }}>
            Actividad en Tiempo Real
          </span>
        </div>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: COLORS.emerald,
          boxShadow: `0 0 8px ${COLORS.emerald}`,
          animation: "pulseGlow 1.5s ease-in-out infinite",
        }} />
      </div>

      {recent.length === 0 ? (
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          color: COLORS.muted, fontSize: 12,
        }}>
          Sin actividad reciente
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, overflow: "hidden" }}>
          <AnimatePresence initial={false}>
            {recent.map((n, i) => {
              const nColor = getNotifColor(n.type);
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "8px 10px", borderRadius: 10,
                    background: n.read ? "transparent" : `${nColor}07`,
                    borderLeft: `2px solid ${n.read ? "transparent" : nColor}`,
                  }}
                >
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                    background: nColor,
                    boxShadow: n.read ? "none" : `0 0 6px ${nColor}`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 11, fontWeight: 600, color: COLORS.text,
                      marginBottom: 2, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {n.title}
                    </p>
                    <p style={{
                      fontSize: 10, color: COLORS.muted, lineHeight: 1.4,
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {n.message}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 9, color: COLORS.muted, flexShrink: 0,
                    marginTop: 1, fontVariantNumeric: "tabular-nums",
                  }}>
                    {relativeTime(n.timestamp)}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

interface HealthMetric {
  label: string;
  pct: number;
  color: string;
  suffix: string;
}

interface SystemHealthProps {
  metrics: HealthMetric[];
  agentsOnline: number;
  agentsTotal: number;
}

function SystemHealth({ metrics, agentsOnline, agentsTotal }: SystemHealthProps) {
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 16, padding: "20px", height: "100%",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Cpu size={14} color={COLORS.purple} />
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
          color: COLORS.text, textTransform: "uppercase",
        }}>
          Estado del Sistema
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        {metrics.map((m, i) => (
          <div key={m.label}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 6,
            }}>
              <span style={{ fontSize: 10, color: COLORS.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {m.label}
              </span>
              <span style={{ fontSize: 11, color: m.color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {m.pct}{m.suffix}
              </span>
            </div>
            <div style={{
              height: 6, borderRadius: 4,
              background: `${COLORS.muted}25`, overflow: "hidden",
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${m.pct}%` }}
                transition={{ duration: 1.2, delay: 0.4 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: "100%", borderRadius: 4,
                  background: `linear-gradient(90deg, ${m.color}70, ${m.color})`,
                  boxShadow: `0 0 8px ${m.color}50`,
                }}
              />
            </div>
          </div>
        ))}

        <div style={{
          marginTop: 8, padding: "12px 14px",
          background: `${COLORS.emerald}08`, border: `1px solid ${COLORS.emerald}20`,
          borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={12} color={COLORS.emerald} />
            <span style={{ fontSize: 10, color: COLORS.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Agentes
            </span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.emerald }}>
            {agentsOnline}/{agentsTotal} online
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Overview() {
  const {
    agents, missions, metrics, notifications,
    workflows, setPage, createChatSession, setActiveChat,
  } = useAstraeo();

  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Derived values
  const onlineAgents = useMemo(() => agents.filter((a) => a.status === "online").length, [agents]);
  const totalTokens = useMemo(() => agents.reduce((s, a) => s + a.tokensUsed, 0), [agents]);
  const doneMissions = useMemo(() => missions.filter((m) => m.status === "done").length, [missions]);
  const avgLatency = useMemo(() => {
    if (metrics.latencyHistory.length === 0) return 0;
    return Math.round(metrics.latencyHistory.reduce((s, p) => s + p.value, 0) / metrics.latencyHistory.length);
  }, [metrics.latencyHistory]);

  const sysStatus = useMemo(() => getSystemStatus(onlineAgents, agents.length), [onlineAgents, agents.length]);

  const healthMetrics = useMemo<HealthMetric[]>(() => [
    { label: "API", pct: Math.round(metrics.successRate), color: COLORS.cyan, suffix: "%" },
    { label: "Memoria", pct: Math.min(100, Math.round((totalTokens / 200000) * 100)), color: COLORS.purple, suffix: "%" },
    { label: "Tareas", pct: missions.length > 0 ? Math.round((doneMissions / missions.length) * 100) : 0, color: COLORS.emerald, suffix: "%" },
    { label: "Eficiencia", pct: Math.round(metrics.efficiency), color: COLORS.amber, suffix: "%" },
  ], [metrics.successRate, totalTokens, doneMissions, missions.length, metrics.efficiency]);

  const dateStr = useMemo(() => clock.toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  }), [clock]);

  const timeStr = clock.toLocaleTimeString("es-ES", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });

  function handleChatWithAgent(agentId: string) {
    const sessionId = createChatSession(agentId);
    setActiveChat(sessionId);
    setPage("chat");
  }

  return (
    <div style={{
      padding: "0",
      height: "100%",
      overflowY: "auto",
      overflowX: "hidden",
      display: "flex",
      flexDirection: "column",
      gap: 0,
      background: COLORS.bg,
    }}>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", flexWrap: "wrap", gap: 12,
          padding: "24px 28px 20px",
          background: `linear-gradient(180deg, rgba(0,212,255,0.04) 0%, transparent 100%)`,
          borderBottom: `1px solid ${COLORS.border}`,
          position: "relative",
        }}
      >
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.005) 2px, rgba(255,255,255,0.005) 4px)",
        }} />
        <div>
          <h1 style={{
            fontSize: 20, fontWeight: 800, letterSpacing: "0.12em",
            color: COLORS.text, textTransform: "uppercase", margin: 0,
            lineHeight: 1,
          }}>
            ASTRAEO{" "}
            <span style={{
              background: `linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.purple})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              CONTROL CENTER
            </span>
          </h1>
          <p style={{
            fontSize: 10, color: COLORS.muted, letterSpacing: "0.2em",
            textTransform: "uppercase", marginTop: 5, fontWeight: 500,
          }}>
            Sistema Operativo de Agentes IA
          </p>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 28, fontWeight: 800, letterSpacing: "0.08em",
            color: COLORS.cyan, fontVariantNumeric: "tabular-nums",
            lineHeight: 1, textShadow: `0 0 20px ${COLORS.cyan}60`,
          }}>
            {timeStr}
          </div>
          <div style={{
            fontSize: 10, color: COLORS.muted, letterSpacing: "0.14em",
            textTransform: "capitalize", marginTop: 4,
          }}>
            {dateStr}
          </div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 16px",
          background: sysStatus.ok ? `${COLORS.emerald}0C` : `${COLORS.amber}0C`,
          border: `1px solid ${sysStatus.ok ? `${COLORS.emerald}30` : `${COLORS.amber}30`}`,
          borderRadius: 30,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: sysStatus.ok ? COLORS.emerald : COLORS.amber,
            boxShadow: `0 0 10px ${sysStatus.ok ? COLORS.emerald : COLORS.amber}`,
            animation: "pulseGlow 1.8s ease-in-out infinite",
          }} />
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
            color: sysStatus.ok ? COLORS.emerald : COLORS.amber,
            textTransform: "uppercase",
          }}>
            {sysStatus.label}
          </span>
        </div>
      </motion.div>

      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}>
          <KpiCard
            label="Agentes Online"
            value={onlineAgents}
            target={onlineAgents}
            color={COLORS.emerald}
            icon={<Bot size={16} />}
            trend="up"
            trendText={`${onlineAgents}/${agents.length}`}
            delay={0.05}
          />
          <KpiCard
            label="Tokens Hoy"
            value={formatTokens(totalTokens)}
            target={Math.min(9999, Math.round(totalTokens / 1000))}
            color={COLORS.purple}
            icon={<Zap size={16} />}
            trend="up"
            trendText={formatTokens(totalTokens)}
            delay={0.1}
          />
          <KpiCard
            label="Tareas Completadas"
            value={doneMissions}
            target={doneMissions}
            color={COLORS.amber}
            icon={<CheckCircle2 size={16} />}
            trend={doneMissions > 0 ? "up" : "flat"}
            trendText={`${missions.length} total`}
            delay={0.15}
          />
          <KpiCard
            label="Latencia Media"
            value={`${avgLatency}ms`}
            target={avgLatency}
            color={COLORS.cyan}
            icon={<Clock size={16} />}
            trend={avgLatency < 1000 ? "up" : "down"}
            trendText={`${avgLatency}ms`}
            delay={0.2}
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Database size={13} color={COLORS.purple} />
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
                color: COLORS.text, textTransform: "uppercase",
              }}>
                Red de Agentes
              </span>
              <span style={{
                fontSize: 9, color: COLORS.purple, background: `${COLORS.purple}18`,
                border: `1px solid ${COLORS.purple}30`, borderRadius: 10,
                padding: "2px 8px", fontWeight: 700, letterSpacing: "0.1em",
              }}>
                {agents.length} NODOS
              </span>
            </div>
            <button
              onClick={() => setPage("agents")}
              style={{
                fontSize: 10, color: COLORS.cyan, background: "transparent",
                border: "none", cursor: "pointer", letterSpacing: "0.1em",
                textDecoration: "none", fontWeight: 600,
              }}
            >
              GESTIONAR →
            </button>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}>
            {agents.slice(0, 8).map((agent, i) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onChat={handleChatWithAgent}
                delay={0.32 + i * 0.05}
              />
            ))}
          </div>
        </motion.div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <ActivityFeed notifications={notifications} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <SystemHealth
              metrics={healthMetrics}
              agentsOnline={onlineAgents}
              agentsTotal={agents.length}
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.9 }}
          style={{
            display: "flex", gap: 10, flexWrap: "wrap",
            paddingBottom: 8,
          }}
        >
          {[
            { label: "Nueva Misión", page: "missions" as const, color: COLORS.amber, icon: <TrendingUp size={13} /> },
            { label: "Chat con Agente", page: "chat" as const, color: COLORS.cyan, icon: <MessageSquare size={13} /> },
            { label: "Ver Analytics", page: "analytics" as const, color: COLORS.purple, icon: <Activity size={13} /> },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => setPage(action.page)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 18px", borderRadius: 10, cursor: "pointer",
                background: `${action.color}10`, border: `1px solid ${action.color}30`,
                color: action.color, fontSize: 11, fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = `${action.color}20`;
                el.style.borderColor = `${action.color}60`;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = `${action.color}10`;
                el.style.borderColor = `${action.color}30`;
              }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}

          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginLeft: "auto", padding: "9px 14px",
            background: `${COLORS.emerald}08`, border: `1px solid ${COLORS.emerald}20`,
            borderRadius: 10, color: COLORS.muted, fontSize: 10,
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: COLORS.emerald,
              boxShadow: `0 0 6px ${COLORS.emerald}`,
            }} />
            <span style={{ color: COLORS.emerald, fontWeight: 700 }}>
              {workflows.filter((w) => w.active).length}
            </span>
            <span>workflows activos</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
