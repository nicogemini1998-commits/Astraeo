"use client";
import { useAstraeo } from "@/store/astraeo";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

const EASE_STANDARD: [number, number, number, number] = [0.4, 0, 0.2, 1];

const priorityColors: Record<string, string> = {
  critical: "#FF4757", high: "#FFB800", medium: "#7B61FF", low: "#6B7A99",
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_STANDARD } },
};

const kpiIconGradients: Record<string, string> = {
  "#00E5A0": "linear-gradient(135deg, rgba(0,229,160,0.2), rgba(0,229,160,0.05))",
  "#00D4FF": "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,212,255,0.05))",
  "#7B61FF": "linear-gradient(135deg, rgba(123,97,255,0.2), rgba(123,97,255,0.05))",
  "#FF6B9D": "linear-gradient(135deg, rgba(255,107,157,0.2), rgba(255,107,157,0.05))",
  "#FFB800": "linear-gradient(135deg, rgba(255,184,0,0.2), rgba(255,184,0,0.05))",
};

// Simulated sparkline data per KPI index
const sparklineData = [
  [3, 5, 4, 6, 5],
  [8, 10, 7, 11, 9],
  [60, 75, 68, 82, 79],
  [2, 3, 2, 4, 3],
  [120, 145, 130, 160, 155],
  [14, 16, 15, 18, 17],
];

// Simulated trend deltas per KPI index (positive = up, negative = down)
const trendDeltas = ["+2", "+1", "+12%", "0", "+8%", "+3"];
const trendPositive = [true, true, true, false, true, true];

function SparklineBar({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-0.5 h-6 mt-3">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-300"
          style={{
            height: `${Math.round((v / max) * 100)}%`,
            background: i === data.length - 1 ? color : `${color}50`,
            boxShadow: i === data.length - 1 ? `0 0 6px ${color}80` : "none",
          }}
        />
      ))}
    </div>
  );
}

export default function Overview() {
  const { agents, missions, metrics, memory, workflows, setPage } = useAstraeo();

  const onlineAgents = agents.filter((a) => a.status === "online").length;
  const activeMissions = missions.filter((m) => m.status === "active").length;
  const doneMissions = missions.filter((m) => m.status === "done").length;
  const totalTokens = agents.reduce((s, a) => s + a.tokensUsed, 0);
  const activeWorkflows = workflows.filter((w) => w.active).length;
  const recentMissions = missions.slice(0, 4);

  const kpis = [
    {
      label: "Agentes Online",
      value: `${onlineAgents}/${agents.length}`,
      sub: "activos ahora",
      color: "#00E5A0",
      icon: "◉",
    },
    {
      label: "Misiones Activas",
      value: activeMissions,
      sub: `${doneMissions} completadas`,
      color: "#00D4FF",
      icon: "◆",
    },
    {
      label: "Tokens Totales",
      value: formatTokens(totalTokens),
      sub: `${metrics.tokensPerMinute > 0 ? metrics.tokensPerMinute : "—"}/min`,
      color: "#7B61FF",
      icon: "◷",
    },
    {
      label: "Workflows Activos",
      value: `${activeWorkflows}/${workflows.length}`,
      sub: `${workflows.reduce((s, w) => s + w.runs, 0)} ejecuciones`,
      color: "#FF6B9D",
      icon: "◫",
    },
    {
      label: "Requests Hoy",
      value: metrics.requestsToday.toLocaleString(),
      sub: `${metrics.successRate}% éxito`,
      color: "#FFB800",
      icon: "◷",
    },
    {
      label: "Memorias",
      value: memory.length,
      sub: `${memory.filter((m) => m.pinned).length} fijadas`,
      color: "#00D4FF",
      icon: "◍",
    },
  ];

  const latAvg = metrics.latencyHistory.length > 0
    ? Math.round(metrics.latencyHistory.reduce((s, p) => s + p.value, 0) / metrics.latencyHistory.length)
    : 0;
  const tokAvg = metrics.tokensHistory.length > 0
    ? Math.round(metrics.tokensHistory.reduce((s, p) => s + p.value, 0) / metrics.tokensHistory.length)
    : 0;

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_STANDARD }}
      >
        <h2 className="text-xl font-bold tracking-wide text-[#E8ECF4]">
          Centro de Control
        </h2>
        <p className="text-[12px] text-[#6B7A99] mt-0.5 font-mono tracking-widest uppercase">
          {new Date().toLocaleDateString("es", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </motion.div>

      {/* KPI Grid */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {kpis.map((k, idx) => (
          <motion.div
            key={k.label}
            variants={itemVariants}
            className="premium-card p-4 scanline-effect"
          >
            <div className="flex items-start justify-between mb-1">
              <span className="text-[11px] text-[#6B7A99] uppercase tracking-[0.15em] font-semibold">
                {k.label}
              </span>
              {/* Icon with unique gradient bg */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                style={{
                  background: kpiIconGradients[k.color] ?? `${k.color}15`,
                  border: `1px solid ${k.color}30`,
                  color: k.color,
                  boxShadow: `0 0 12px ${k.color}20`,
                }}
              >
                {k.icon}
              </div>
            </div>

            <div className="flex items-end justify-between mt-2">
              <div
                className="text-3xl font-bold font-display tracking-tight metric-value"
                style={{ color: k.color }}
              >
                {k.value}
              </div>
              {/* Trend badge */}
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold mb-1"
                style={{
                  background: trendPositive[idx] ? "rgba(0,229,160,0.1)" : "rgba(255,71,87,0.1)",
                  color: trendPositive[idx] ? "#00E5A0" : "#FF4757",
                  border: `1px solid ${trendPositive[idx] ? "rgba(0,229,160,0.25)" : "rgba(255,71,87,0.25)"}`,
                }}
              >
                {trendPositive[idx] ? "↑" : "↓"} {trendDeltas[idx]}
              </span>
            </div>

            <div className="text-[11px] text-[#6B7A99] font-mono">{k.sub}</div>

            {/* Sparkline */}
            <SparklineBar data={sparklineData[idx] ?? [1, 2, 1, 3, 2]} color={k.color} />
          </motion.div>
        ))}
      </motion.div>

      {/* Charts row */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25, ease: EASE_STANDARD }}
      >
        {/* Latency chart */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-[13px] font-semibold text-[#E8ECF4] tracking-wide">Latencia API</h3>
              <p className="text-[22px] font-bold font-mono text-[#00D4FF] leading-tight mt-0.5">
                {metrics.apiLatency}
                <span className="text-[12px] text-[#6B7A99] ml-1 font-normal">ms</span>
              </p>
            </div>
            <div className="text-[10px] px-2 py-1 rounded-full bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20 border-glow">
              LIVE
            </div>
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={metrics.latencyHistory.map((p) => ({ value: Math.round(p.value) }))}>
              <defs>
                <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              {latAvg > 0 && (
                <ReferenceLine
                  y={latAvg}
                  stroke="#00D4FF"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                  label={{ value: `avg ${latAvg}ms`, fill: "#6B7A99", fontSize: 9, position: "insideTopRight" }}
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke="#00D4FF"
                strokeWidth={2}
                fill="url(#latGrad)"
                dot={{ r: 2, fill: "#00D4FF", strokeWidth: 0 }}
                activeDot={{ r: 4, fill: "#00D4FF", strokeWidth: 0, filter: "drop-shadow(0 0 4px #00D4FF)" }}
              />
              <Tooltip
                contentStyle={{ background: "rgba(13,27,62,0.95)", border: "1px solid #1A2744", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ display: "none" }}
                formatter={(v) => [`${v}ms`, ""]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tokens chart */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-[13px] font-semibold text-[#E8ECF4] tracking-wide">Tokens / min</h3>
              <p className="text-[22px] font-bold font-mono text-[#7B61FF] leading-tight mt-0.5">
                {metrics.tokensPerMinute}
                <span className="text-[12px] text-[#6B7A99] ml-1 font-normal">tok/min</span>
              </p>
            </div>
            <div className="text-[10px] px-2 py-1 rounded-full bg-[#7B61FF]/10 text-[#7B61FF] border border-[#7B61FF]/20">
              LIVE
            </div>
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={metrics.tokensHistory.map((p) => ({ value: p.value }))}>
              <defs>
                <linearGradient id="tokGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7B61FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7B61FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              {tokAvg > 0 && (
                <ReferenceLine
                  y={tokAvg}
                  stroke="#7B61FF"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                  label={{ value: `avg ${tokAvg}`, fill: "#6B7A99", fontSize: 9, position: "insideTopRight" }}
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke="#7B61FF"
                strokeWidth={2}
                fill="url(#tokGrad)"
                dot={{ r: 2, fill: "#7B61FF", strokeWidth: 0 }}
                activeDot={{ r: 4, fill: "#7B61FF", strokeWidth: 0, filter: "drop-shadow(0 0 4px #7B61FF)" }}
              />
              <Tooltip
                contentStyle={{ background: "rgba(13,27,62,0.95)", border: "1px solid #1A2744", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ display: "none" }}
                formatter={(v) => [`${v} tok`, ""]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Bottom row */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35, ease: EASE_STANDARD }}
      >
        {/* Agent status */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold text-[#E8ECF4] tracking-wide">Estado de Agentes</h3>
            <button onClick={() => setPage("agents")} className="text-[11px] text-[#00D4FF] hover:underline tracking-wide transition-opacity hover:opacity-80">
              Ver todos →
            </button>
          </div>
          <div className="space-y-1.5">
            {agents.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 group cursor-default"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = `${a.color}08`;
                  (e.currentTarget as HTMLDivElement).style.borderLeft = `2px solid ${a.color}40`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  (e.currentTarget as HTMLDivElement).style.borderLeft = "2px solid transparent";
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: `${a.color}15`, border: `1px solid ${a.color}30`, color: a.color }}
                >
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#E8ECF4] tracking-wide">{a.name}</p>
                  {/* Progress bar in width proportional to tokensUsed */}
                  <div className="w-full h-0.5 bg-[#1A2744]/50 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, Math.round((a.tokensUsed / 5000) * 100))}%`,
                        background: `linear-gradient(90deg, ${a.color}90, ${a.color})`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 status-${a.status}`}
                    style={a.status === "online" ? { animation: "pulseGlow 2s ease-in-out infinite" } : undefined}
                  />
                  <span className="text-[10px] text-[#6B7A99] capitalize font-mono">{a.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent missions */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold text-[#E8ECF4] tracking-wide">Misiones Recientes</h3>
            <button onClick={() => setPage("missions")} className="text-[11px] text-[#00D4FF] hover:underline tracking-wide transition-opacity hover:opacity-80">
              Ver tablero →
            </button>
          </div>
          <div className="space-y-2">
            {recentMissions.map((m) => (
              <div key={m.id} className="p-2.5 rounded-xl hover:bg-white/[0.03] transition-all duration-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider"
                    style={{
                      background: `${priorityColors[m.priority]}15`,
                      color: priorityColors[m.priority],
                      border: `1px solid ${priorityColors[m.priority]}30`,
                    }}
                  >
                    {m.priority}
                  </span>
                  <span className="text-[12px] font-medium text-[#E8ECF4] truncate">{m.title}</span>
                </div>
                <div className="w-full h-1.5 bg-[#1A2744]/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 data-bar"
                    style={{
                      width: `${m.progress}%`,
                      background: m.status === "done"
                        ? "linear-gradient(90deg, #00E5A0, #00D4FF)"
                        : "linear-gradient(90deg, #7B61FF, #00D4FF)",
                      boxShadow: m.status === "done"
                        ? "0 0 6px rgba(0,229,160,0.4)"
                        : "0 0 6px rgba(123,97,255,0.4)",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-[#6B7A99] capitalize">{m.status}</span>
                  <span className="text-[10px] text-[#6B7A99] font-mono">{m.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}
