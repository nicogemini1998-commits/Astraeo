"use client";
import { useState, useMemo, useEffect, useRef } from "react";
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

// ─── Types ────────────────────────────────────────────────────────────────────
type Period = "7d" | "30d" | "90d";

interface KpiData {
  label: string;
  value: number;
  display: string;
  sub: string;
  color: string;
  unit: string;
}

interface AgentBar {
  name: string;
  tokens: number;
  tasks: number;
}

interface MissionPie {
  name: string;
  value: number;
}

interface TimelinePoint {
  v: number;
  t: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_COLORS = [
  "#4A8EB8",
  "#6655CC",
  "#3D8A60",
  "#B88530",
  "#B04858",
  "#A83C50",
  "#64B5F6",
];

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: "7d", label: "7 días", days: 7 },
  { key: "30d", label: "30 días", days: 30 },
  { key: "90d", label: "90 días", days: 90 },
];

const GLASS_TOOLTIP: React.CSSProperties = {
  background: "rgba(6,11,26,0.92)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(0,212,255,0.15)",
  borderRadius: 10,
  fontSize: 11,
  color: "#C8D0E0",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  padding: "8px 12px",
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function makeGlassTooltip(suffix: string) {
  return function GlassTooltipInner(props: Record<string, unknown>) {
    const active = props.active as boolean | undefined;
    const label = props.label as string | undefined;
    const payload = props.payload as { value: number; name: string; color: string }[] | undefined;
    if (!active || !payload?.length) return null;
    return (
      <div style={GLASS_TOOLTIP}>
        <p className="text-[10px] text-[#6B7A99] font-mono mb-1">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} className="text-[12px] font-semibold font-mono" style={{ color: entry.color }}>
            {entry.value}
            {suffix}
          </p>
        ))}
      </div>
    );
  };
}

// ─── Count-up Hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900): number {
  const [count, setCount] = useState(0);
  const raf = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * ease));
      if (progress < 1) {
        raf.current = requestAnimationFrame(step);
      }
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [target, duration]);

  return count;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  kpi: KpiData;
  index: number;
}

function KpiCard({ kpi, index }: KpiCardProps) {
  const animated = useCountUp(kpi.value);
  const display =
    kpi.unit === "k" && kpi.value > 999
      ? `${(animated / 1000).toFixed(1)}k`
      : kpi.unit === "ms"
      ? `${animated}ms`
      : kpi.unit === "%"
      ? `${animated}%`
      : animated.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl p-5 border border-white/[0.06]"
      style={{
        background: "linear-gradient(135deg, rgba(10,15,31,0.9) 0%, rgba(6,11,26,0.95) 100%)",
        boxShadow: `0 1px 0 0 ${kpi.color}18 inset, 0 0 40px -12px ${kpi.color}20`,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${kpi.color}40, transparent)` }}
      />
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.06] blur-2xl"
        style={{ background: kpi.color }}
      />
      <div className="text-[11px] font-semibold text-[#6B7A99] tracking-widest uppercase mb-3">
        {kpi.label}
      </div>
      <div
        className="text-[28px] font-bold font-mono tabular-nums leading-none mb-2"
        style={{ color: kpi.color }}
      >
        {kpi.value === 0 ? "—" : display}
      </div>
      <div className="text-[10px] text-[#4A5570] font-mono">{kpi.sub}</div>
    </motion.div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  sub?: string;
  accent?: string;
}

function SectionHeader({ title, sub, accent = "#4A8EB8" }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex items-start gap-2.5">
      <div
        className="w-0.5 h-full min-h-[28px] rounded-full mt-0.5 flex-shrink-0"
        style={{ background: `linear-gradient(180deg, ${accent}, transparent)` }}
      />
      <div>
        <h3 className="text-[13px] font-semibold text-[#E8ECF4] tracking-wide">{title}</h3>
        {sub && <p className="text-[10px] text-[#6B7A99] font-mono mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Pie Legend ───────────────────────────────────────────────────────────────
interface PieLegendProps {
  data: MissionPie[];
  total: number;
}

function PieLegend({ data, total }: PieLegendProps) {
  return (
    <div className="flex flex-col gap-2 justify-center min-w-[120px]">
      {data.map((d, i) => {
        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
        return (
          <div key={d.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="text-[11px] text-[#6B7A99] truncate">{d.name}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className="text-[12px] font-bold font-mono"
                style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
              >
                {d.value}
              </span>
              <span className="text-[9px] text-[#4A5570] font-mono">{pct}%</span>
            </div>
          </div>
        );
      })}
      <div className="pt-2 border-t border-white/[0.06]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#6B7A99]">Total</span>
          <span className="text-[13px] font-bold font-mono text-[#E8ECF4]">{total}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Timeline Item ────────────────────────────────────────────────────────────
const NOTIF_CFG = {
  success: { dot: "#3D8A60", bg: "#3D8A6018", label: "OK" },
  info: { dot: "#4A8EB8", bg: "#4A8EB818", label: "INF" },
  warning: { dot: "#B88530", bg: "#B8853018", label: "WAR" },
  error: { dot: "#A83C50", bg: "#A83C5018", label: "ERR" },
} as const;

type NotifType = keyof typeof NOTIF_CFG;

interface TimelineItemProps {
  title: string;
  message: string;
  type: NotifType;
  timestamp: string;
  index: number;
}

function TimelineItem({ title, message, type, timestamp, index }: TimelineItemProps) {
  const cfg = NOTIF_CFG[type];
  const d = new Date(timestamp);
  const hhmm = d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  const mmdd = d.toLocaleDateString("es", { day: "2-digit", month: "2-digit" });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.05 + index * 0.035, ease: [0.16, 1, 0.3, 1] }}
      className="flex-shrink-0 w-56 rounded-xl p-3.5 border border-white/[0.05]"
      style={{ background: "rgba(10,15,31,0.85)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold font-mono flex-shrink-0"
          style={{ background: cfg.bg, color: cfg.dot, border: `1px solid ${cfg.dot}30` }}
        >
          {cfg.label}
        </div>
        <span className="text-[10px] text-[#4A5570] font-mono ml-auto flex-shrink-0">
          {mmdd} {hhmm}
        </span>
      </div>
      <p className="text-[12px] font-semibold text-[#E8ECF4] leading-tight mb-0.5 line-clamp-1">
        {title}
      </p>
      <p className="text-[10px] text-[#6B7A99] leading-snug line-clamp-2">{message}</p>
    </motion.div>
  );
}

// ─── Period Selector ──────────────────────────────────────────────────────────
interface PeriodSelectorProps {
  value: Period;
  onChange: (p: Period) => void;
}

function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex gap-0.5 p-1 rounded-xl border border-white/[0.07] bg-[#060B1A]/70">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className="relative px-3.5 py-1.5 rounded-lg text-[11px] font-mono transition-all duration-200"
          style={{
            color: value === p.key ? "#4A8EB8" : "#8A8A97",
          }}
        >
          {value === p.key && (
            <motion.div
              layoutId="period-pill"
              className="absolute inset-0 rounded-lg"
              style={{
                background: "rgba(0,212,255,0.1)",
                border: "1px solid rgba(0,212,255,0.2)",
              }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
            />
          )}
          <span className="relative z-10">{p.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Chart Card Wrapper ───────────────────────────────────────────────────────
interface ChartCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

function ChartCard({ children, delay = 0, className = "" }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl p-5 border border-white/[0.06] ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(10,15,31,0.9) 0%, rgba(6,11,26,0.95) 100%)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Analytics Page ───────────────────────────────────────────────────────────
export default function Analytics() {
  const { agents, missions, metrics, memory, workflows, notifications } = useAstraeo();
  const [period, setPeriod] = useState<Period>("7d");

  // ── Derived scalars ───────────────────────────────────────────────────────
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

  const onlineCount = useMemo(
    () => agents.filter((a) => a.status === "online").length,
    [agents]
  );

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis: KpiData[] = useMemo(
    () => [
      {
        label: "Total Tareas",
        value: totalTasks,
        display: totalTasks.toLocaleString(),
        sub: `${onlineCount} agentes online`,
        color: "#4A8EB8",
        unit: "n",
      },
      {
        label: "Tokens Usados",
        value: totalTokens,
        display:
          totalTokens > 999
            ? `${(totalTokens / 1000).toFixed(1)}k`
            : totalTokens.toLocaleString(),
        sub: `${metrics.tokensPerMinute > 0 ? metrics.tokensPerMinute : "—"} tok/min`,
        color: "#6655CC",
        unit: "k",
      },
      {
        label: "Tasa Éxito",
        value: Math.round(metrics.successRate),
        display: `${metrics.successRate}%`,
        sub: `${metrics.requestsToday.toLocaleString()} req hoy`,
        color: "#3D8A60",
        unit: "%",
      },
      {
        label: "Latencia Media",
        value: avgLatency,
        display: `${avgLatency}ms`,
        sub: "objetivo < 1000ms",
        color: "#B88530",
        unit: "ms",
      },
    ],
    [totalTasks, onlineCount, totalTokens, metrics, avgLatency]
  );

  // ── Chart data ────────────────────────────────────────────────────────────
  const tokensData: TimelinePoint[] = useMemo(
    () =>
      metrics.tokensHistory.map((p) => ({
        v: Math.round(p.value),
        t: new Date(p.time).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
      })),
    [metrics.tokensHistory]
  );

  const latencyData: TimelinePoint[] = useMemo(
    () =>
      metrics.latencyHistory.map((p) => ({
        v: Math.round(p.value),
        t: new Date(p.time).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
      })),
    [metrics.latencyHistory]
  );

  const agentBars: AgentBar[] = useMemo(
    () =>
      [...agents]
        .filter((a) => a.tokensUsed > 0 || a.tasksCompleted > 0)
        .sort((a, b) => b.tokensUsed - a.tokensUsed)
        .slice(0, 7)
        .map((a) => ({
          name: a.name.length > 9 ? `${a.name.slice(0, 8)}…` : a.name,
          tokens: Math.round(a.tokensUsed / 1000),
          tasks: a.tasksCompleted,
        })),
    [agents]
  );

  const missionPie: MissionPie[] = useMemo(
    () => [
      { name: "Backlog", value: missions.filter((m) => m.status === "backlog").length },
      { name: "Activas", value: missions.filter((m) => m.status === "active").length },
      { name: "Revisión", value: missions.filter((m) => m.status === "review").length },
      { name: "Listas", value: missions.filter((m) => m.status === "done").length },
    ],
    [missions]
  );

  // ── Period-filtered notifications ─────────────────────────────────────────
  const periodMs = useMemo(() => {
    const days = PERIODS.find((p) => p.key === period)?.days ?? 7;
    return days * 86_400_000;
  }, [period]);

  const filteredNotifs = useMemo(() => {
    const now = Date.now();
    return notifications
      .filter((n) => now - new Date(n.timestamp).getTime() <= periodMs)
      .slice(0, 15);
  }, [notifications, periodMs]);

  // ── Period-scoped summary stats ───────────────────────────────────────────
  const summaryStats = useMemo(
    () => [
      { label: "Eficiencia", value: `${metrics.efficiency}%`, color: "#3D8A60" },
      { label: "Agentes totales", value: agents.length, color: "#4A8EB8" },
      { label: "Memorias", value: memory.length, color: "#6655CC" },
      { label: "Workflows activos", value: workflows.filter((w) => w.active).length, color: "#B04858" },
      {
        label: "Workflow runs",
        value: workflows.reduce((s, w) => s + w.runs, 0),
        color: "#B88530",
      },
    ],
    [metrics.efficiency, agents.length, memory.length, workflows]
  );

  const lastSync = new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-6 space-y-5 overflow-y-auto h-full animate-fade-in">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-bold tracking-wide text-[#E8ECF4]">
            Mission Analytics
          </h2>
          <p className="text-[11px] text-[#6B7A99] font-mono">
            Real-time Intelligence Dashboard · sync {lastSync}
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} kpi={k} index={i} />
        ))}
      </div>

      {/* ── Token usage — full-width area chart ──────────────────────────── */}
      <ChartCard delay={0.12}>
        <SectionHeader
          title="Token Usage"
          sub={`${metrics.tokensPerMinute > 0 ? metrics.tokensPerMinute : "—"} tok/min · live stream`}
          accent="#4A8EB8"
        />
        <ResponsiveContainer width="100%" height={148}>
          <AreaChart data={tokensData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="tokGradPremium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4A8EB8" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#4A8EB8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="t"
              tick={{ fill: "#4A5570", fontSize: 9, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fill: "#4A5570", fontSize: 9, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              width={38}
            />
            <Tooltip content={makeGlassTooltip(" tok/min")} />
            <Area
              type="monotone"
              dataKey="v"
              stroke="#4A8EB8"
              strokeWidth={1.5}
              fill="url(#tokGradPremium)"
              dot={false}
              name="Tokens/min"
              activeDot={{ r: 4, fill: "#4A8EB8", stroke: "rgba(0,212,255,0.3)", strokeWidth: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Agent performance + Task distribution ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Agent bar chart */}
        <ChartCard delay={0.18}>
          <SectionHeader
            title="Agent Performance"
            sub="tokens (k) por agente · top 7"
            accent="#6655CC"
          />
          {agentBars.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[12px] text-[#4A5570] font-mono">
              Sin datos de agentes
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(120, agentBars.length * 38)}>
              <BarChart
                data={agentBars}
                layout="vertical"
                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "#4A5570", fontSize: 9, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#C8D0E0", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                />
                <Tooltip
                  contentStyle={GLASS_TOOLTIP}
                  formatter={(v: unknown) => [`${v}k tokens`]}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar dataKey="tokens" radius={[0, 4, 4, 0]} name="Tokens (k)" maxBarSize={18}>
                  {agentBars.map((_, i) => (
                    <Cell
                      key={`agent-cell-${i}`}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Mission distribution pie */}
        <ChartCard delay={0.22}>
          <SectionHeader
            title="Task Distribution"
            sub="misiones por estado · actual"
            accent="#3D8A60"
          />
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <ResponsiveContainer width={148} height={148}>
                <PieChart>
                  <defs>
                    {CHART_COLORS.map((c, i) => (
                      <radialGradient key={`pie-grad-${i}`} id={`pieGrad${i}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={c} stopOpacity={1} />
                        <stop offset="100%" stopColor={c} stopOpacity={0.7} />
                      </radialGradient>
                    ))}
                  </defs>
                  <Pie
                    data={missionPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={64}
                    dataKey="value"
                    paddingAngle={3}
                    labelLine={false}
                    strokeWidth={0}
                  >
                    {missionPie.map((_, i) => (
                      <Cell
                        key={`pie-cell-${i}`}
                        fill={`url(#pieGrad${i % CHART_COLORS.length})`}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={GLASS_TOOLTIP} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <PieLegend data={missionPie} total={missions.length} />
          </div>
        </ChartCard>
      </div>

      {/* ── API Latency area + Summary stats ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Latency area — spans 2 cols */}
        <ChartCard delay={0.26} className="lg:col-span-2">
          <SectionHeader
            title="API Latency"
            sub={`${metrics.apiLatency > 0 ? `${metrics.apiLatency}ms` : "—"} actual · objetivo < 1000ms`}
            accent="#6655CC"
          />
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={latencyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="latGradPremium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6655CC" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#6655CC" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="t"
                tick={{ fill: "#4A5570", fontSize: 9, fontFamily: "JetBrains Mono" }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: "#4A5570", fontSize: 9, fontFamily: "JetBrains Mono" }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={makeGlassTooltip("ms")} />
              <Area
                type="monotone"
                dataKey="v"
                stroke="#6655CC"
                strokeWidth={1.5}
                fill="url(#latGradPremium)"
                dot={false}
                name="Latencia"
                activeDot={{ r: 4, fill: "#6655CC", stroke: "rgba(123,97,255,0.3)", strokeWidth: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Summary stats */}
        <ChartCard delay={0.3}>
          <SectionHeader title="System Summary" accent="#B88530" />
          <div className="space-y-2.5">
            {summaryStats.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#6B7A99]">{s.label}</span>
                <span
                  className="text-[13px] font-bold font-mono tabular-nums"
                  style={{ color: s.color }}
                >
                  {s.value}
                </span>
              </div>
            ))}
            <div className="pt-2.5 border-t border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#6B7A99]">Success rate</span>
                <span className="text-[13px] font-bold font-mono text-[#4A8EB8]">
                  {metrics.successRate}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#6B7A99]">Req hoy</span>
                <span className="text-[13px] font-bold font-mono text-[#E8ECF4]">
                  {metrics.requestsToday.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ── Activity Timeline — horizontal scroll ─────────────────────────── */}
      <ChartCard delay={0.34}>
        <SectionHeader
          title="Activity Timeline"
          sub={`Últimos ${filteredNotifs.length} eventos · periodo ${PERIODS.find((p) => p.key === period)?.label}`}
          accent="#B04858"
        />
        {filteredNotifs.length === 0 ? (
          <div className="flex items-center justify-center py-8 gap-2 opacity-40">
            <span className="text-2xl">◌</span>
            <p className="text-[12px] text-[#6B7A99] font-mono">Sin eventos en este periodo</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {filteredNotifs.map((n, i) => (
              <TimelineItem
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
      </ChartCard>
    </div>
  );
}
