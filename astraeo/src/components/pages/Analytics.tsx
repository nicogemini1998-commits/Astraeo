"use client";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAstraeo } from "@/store/astraeo";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_COLORS = ["#00D4FF", "#7B61FF", "#00E5A0", "#FFB800", "#FF6B9D", "#FF4757", "#64B5F6"];

const TOOLTIP_STYLE = {
  background: "rgba(10,15,31,0.97)",
  border: "1px solid #1A2744",
  borderRadius: 8,
  fontSize: 11,
  color: "#C8D0E0",
};

type Period = "today" | "7d" | "30d" | "all";

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  color: string;
  index: number;
}

function KpiCard({ label, value, sub, color, index }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className="glass-card rounded-2xl p-5 border border-[#1A2744]/50 card-hover"
    >
      <div
        className="text-3xl font-bold font-mono mb-1 tabular-nums"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[12px] font-semibold text-[#E8ECF4] mb-0.5">{label}</div>
      <div className="text-[10px] text-[#6B7A99] font-mono">{sub}</div>
    </motion.div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-[13px] font-semibold text-[#E8ECF4] tracking-wide">{title}</h3>
      {sub && <p className="text-[10px] text-[#6B7A99] font-mono mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Custom Pie Label ─────────────────────────────────────────────────────────
interface PieLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
}

function CustomPieLabel({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0, name = "" }: PieLabelProps) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.06) return null;
  return (
    <text x={x} y={y} fill="#E8ECF4" textAnchor="middle" dominantBaseline="central" fontSize={9} fontFamily="JetBrains Mono">
      {`${(percent * 100).toFixed(0)}%`}
      {"\n"}
      {name}
    </text>
  );
}

// ─── Activity Item ────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  success: { dot: "#00E5A0", icon: "✓" },
  info: { dot: "#00D4FF", icon: "ℹ" },
  warning: { dot: "#FFB800", icon: "⚠" },
  error: { dot: "#FF4757", icon: "✕" },
};

interface ActivityItemProps {
  title: string;
  message: string;
  type: keyof typeof TYPE_CONFIG;
  timestamp: string;
  index: number;
}

function ActivityItem({ title, message, type, timestamp, index }: ActivityItemProps) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.info;
  const d = new Date(timestamp);
  const hhmm = d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.05 + index * 0.04 }}
      className="flex items-start gap-3 py-2.5 border-b border-[#1A2744]/40 last:border-0"
    >
      <div
        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] mt-0.5"
        style={{ background: `${cfg.dot}18`, border: `1px solid ${cfg.dot}40`, color: cfg.dot }}
      >
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-[#E8ECF4] truncate">{title}</p>
        <p className="text-[11px] text-[#6B7A99] truncate">{message}</p>
      </div>
      <span className="text-[10px] text-[#4A5570] font-mono flex-shrink-0 mt-0.5">{hhmm}</span>
    </motion.div>
  );
}

// ─── Period Selector ──────────────────────────────────────────────────────────
const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "all", label: "Todos" },
];

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl border border-[#1A2744]/60 bg-[#060B1A]/50">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className="px-3 py-1 rounded-lg text-[11px] font-mono transition-all"
          style={{
            background: value === p.key ? "rgba(0,212,255,0.12)" : "transparent",
            color: value === p.key ? "#00D4FF" : "#6B7A99",
            border: value === p.key ? "1px solid rgba(0,212,255,0.2)" : "1px solid transparent",
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ─── Analytics Page ───────────────────────────────────────────────────────────
export default function Analytics() {
  const { agents, missions, metrics, memory, workflows, notifications } = useAstraeo();
  const [period, setPeriod] = useState<Period>("today");

  // ── Derived metrics from real store data ──────────────────────────────────
  const totalTokens = useMemo(
    () => agents.reduce((s, a) => s + a.tokensUsed, 0),
    [agents]
  );
  const totalTasks = useMemo(
    () => agents.reduce((s, a) => s + a.tasksCompleted, 0),
    [agents]
  );
  const avgLatency = useMemo(() => {
    const active = agents.filter((a) => a.avgResponseMs > 0);
    if (active.length === 0) return metrics.apiLatency;
    return Math.round(active.reduce((s, a) => s + a.avgResponseMs, 0) / active.length);
  }, [agents, metrics.apiLatency]);
  const onlineAgents = useMemo(() => agents.filter((a) => a.status === "online").length, [agents]);
  const activeMissions = useMemo(
    () => missions.filter((m) => m.status === "active").length,
    [missions]
  );
  const totalWorkflowRuns = useMemo(
    () => workflows.reduce((s, w) => s + w.runs, 0),
    [workflows]
  );
  const pinnedMemory = useMemo(() => memory.filter((m) => m.pinned).length, [memory]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = [
    {
      label: "Tokens usados",
      value: totalTokens > 1000
        ? `${(totalTokens / 1000).toFixed(1)}k`
        : totalTokens.toLocaleString(),
      sub: "acumulado",
      color: "#00D4FF",
    },
    {
      label: "Requests hoy",
      value: metrics.requestsToday.toLocaleString(),
      sub: `éxito ${metrics.successRate}%`,
      color: "#00E5A0",
    },
    {
      label: "Latencia media",
      value: avgLatency > 0 ? `${avgLatency}ms` : "—",
      sub: "última medición",
      color: "#7B61FF",
    },
    {
      label: "Agentes online",
      value: `${onlineAgents}/${agents.length}`,
      sub: `${activeMissions} misiones activas`,
      color: "#FFB800",
    },
  ];

  // ── Mission distribution ──────────────────────────────────────────────────
  const missionsByStatus = [
    { name: "Backlog", value: missions.filter((m) => m.status === "backlog").length },
    { name: "Activas", value: missions.filter((m) => m.status === "active").length },
    { name: "Revisión", value: missions.filter((m) => m.status === "review").length },
    { name: "Listas", value: missions.filter((m) => m.status === "done").length },
  ];

  // ── Agent usage (sorted by tokens) ───────────────────────────────────────
  const agentUsage = useMemo(
    () =>
      [...agents]
        .sort((a, b) => b.tokensUsed - a.tokensUsed)
        .map((a) => ({
          name: a.name.length > 8 ? a.name.slice(0, 8) : a.name,
          tokens: Math.round(a.tokensUsed / 1000),
          tasks: a.tasksCompleted,
          latency: a.avgResponseMs,
        })),
    [agents]
  );

  // ── Latency history from store ────────────────────────────────────────────
  const latencyData = useMemo(
    () =>
      metrics.latencyHistory.map((p) => ({
        v: Math.round(p.value),
        t: new Date(p.time).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
      })),
    [metrics.latencyHistory]
  );

  const tokensData = useMemo(
    () =>
      metrics.tokensHistory.map((p) => ({
        v: Math.round(p.value),
        t: new Date(p.time).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
      })),
    [metrics.tokensHistory]
  );

  // ── Notifications filtered by period ─────────────────────────────────────
  const filteredNotifs = useMemo(() => {
    const now = Date.now();
    const msMap: Record<Period, number> = {
      today: 86_400_000,
      "7d": 7 * 86_400_000,
      "30d": 30 * 86_400_000,
      all: Infinity,
    };
    const cutoff = msMap[period];
    return notifications
      .filter((n) => now - new Date(n.timestamp).getTime() <= cutoff)
      .slice(0, 10);
  }, [notifications, period]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const summaryStats = [
    { label: "Total agentes", value: agents.length, color: "#00D4FF" },
    { label: "Tareas completadas", value: totalTasks, color: "#00E5A0" },
    { label: "Memorias guardadas", value: memory.length, color: "#7B61FF" },
    { label: "Memorias fijadas", value: pinnedMemory, color: "#A78BFA" },
    { label: "Workflows activos", value: workflows.filter((w) => w.active).length, color: "#FF6B9D" },
    { label: "Total workflow runs", value: totalWorkflowRuns, color: "#FFB800" },
  ];

  const lastSync = new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold tracking-wide text-[#E8ECF4]">
            Analytics · Centro de Comando
          </h2>
          <p className="text-[11px] text-[#6B7A99] font-mono">
            Métricas en tiempo real del sistema · última sync {lastSync}
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} {...k} index={i} />
        ))}
      </div>

      {/* Charts row 1: tokens + latency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass-card rounded-2xl p-5 border border-[#1A2744]/50"
        >
          <SectionHeader
            title="Tokens por minuto"
            sub={`${metrics.tokensPerMinute > 0 ? metrics.tokensPerMinute : "—"} tok/min live`}
          />
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={tokensData}>
              <defs>
                <linearGradient id="tokGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,39,68,0.4)" />
              <XAxis dataKey="t" tick={{ fill: "#6B7A99", fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: "#6B7A99", fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => [`${v} tok/min`]} />
              <Area
                type="monotone"
                dataKey="v"
                stroke="#00D4FF"
                strokeWidth={2}
                fill="url(#tokGrad)"
                dot={false}
                name="Tokens/min"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          className="glass-card rounded-2xl p-5 border border-[#1A2744]/50"
        >
          <SectionHeader
            title="Latencia API"
            sub={`${metrics.apiLatency > 0 ? `${metrics.apiLatency}ms` : "—"} actual · objetivo &lt;1000ms`}
          />
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={latencyData}>
              <defs>
                <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7B61FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7B61FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,39,68,0.4)" />
              <XAxis dataKey="t" tick={{ fill: "#6B7A99", fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: "#6B7A99", fontSize: 9 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => [`${v}ms`]} />
              <Area
                type="monotone"
                dataKey="v"
                stroke="#7B61FF"
                strokeWidth={2}
                fill="url(#latGrad)"
                dot={false}
                name="Latencia"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Charts row 2: agent bar + missions pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.24 }}
          className="glass-card rounded-2xl p-5 border border-[#1A2744]/50"
        >
          <SectionHeader title="Uso por agente" sub="miles de tokens usados" />
          {agentUsage.length === 0 ? (
            <p className="text-[11px] text-[#6B7A99] text-center py-8">Sin datos de agentes</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(120, agentUsage.length * 36)}>
              <BarChart data={agentUsage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,39,68,0.4)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "#6B7A99", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#C8D0E0", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: unknown) => [`${v}k tokens`]}
                />
                <Bar dataKey="tokens" radius={[0, 4, 4, 0]} name="Tokens (k)">
                  {agentUsage.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="glass-card rounded-2xl p-5 border border-[#1A2744]/50"
        >
          <SectionHeader title="Distribución de misiones" sub="por estado actual" />
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie
                  data={missionsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={60}
                  dataKey="value"
                  paddingAngle={3}
                  labelLine={false}
                  label={(props) => <CustomPieLabel {...props} />}
                >
                  {missionsByStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {missionsByStatus.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-[11px] text-[#6B7A99]">{d.name}</span>
                  </div>
                  <span
                    className="text-[12px] font-bold font-mono"
                    style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
                  >
                    {d.value}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-[#1A2744]/40">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#6B7A99]">Total</span>
                  <span className="text-[12px] font-bold font-mono text-[#E8ECF4]">
                    {missions.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Summary stats + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.35 }}
          className="glass-card rounded-2xl p-5 border border-[#1A2744]/50 space-y-3"
        >
          <SectionHeader title="Resumen del sistema" />
          {summaryStats.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-[12px] text-[#6B7A99]">{s.label}</span>
              <span
                className="text-[13px] font-bold font-mono"
                style={{ color: s.color }}
              >
                {s.value}
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-[#1A2744]/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#6B7A99]">Eficiencia</span>
              <span className="text-[13px] font-bold font-mono text-[#00E5A0]">
                {metrics.efficiency}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#6B7A99]">Tasa éxito</span>
              <span className="text-[13px] font-bold font-mono text-[#00D4FF]">
                {metrics.successRate}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Activity timeline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.4 }}
          className="glass-card rounded-2xl p-5 border border-[#1A2744]/50 lg:col-span-2"
        >
          <SectionHeader
            title="Actividad reciente"
            sub={`Últimos ${filteredNotifs.length} eventos · periodo: ${PERIODS.find((p) => p.key === period)?.label}`}
          />
          {filteredNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 opacity-50">
              <span className="text-3xl">◌</span>
              <p className="text-[12px] text-[#6B7A99]">
                Sin eventos en este periodo
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-64">
              {filteredNotifs.map((n, i) => (
                <ActivityItem
                  key={n.id}
                  title={n.title}
                  message={n.message}
                  type={n.type}
                  timestamp={n.timestamp}
                  index={i}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
