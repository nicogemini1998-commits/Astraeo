"use client";
import { useAstraeo } from "@/store/astraeo";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const priorityColors: Record<string, string> = {
  critical: "#FF4757", high: "#FFB800", medium: "#7B61FF", low: "#6B7A99",
};

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

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-wide text-[#E8ECF4]">
          Centro de Control
        </h2>
        <p className="text-[12px] text-[#6B7A99] mt-0.5 font-mono tracking-widest uppercase">
          {new Date().toLocaleDateString("es", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass-card rounded-2xl p-4 card-hover border border-[#1A2744]/50 scanline-effect">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] text-[#6B7A99] uppercase tracking-[0.15em] font-semibold">
                {k.label}
              </span>
              <span className="text-xl" style={{ color: k.color }}>{k.icon}</span>
            </div>
            <div className="text-3xl font-bold font-display tracking-tight" style={{ color: k.color }}>
              {k.value}
            </div>
            <div className="text-[11px] text-[#6B7A99] mt-1 font-mono">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latency chart */}
        <div className="glass-card rounded-2xl p-5 border border-[#1A2744]/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[13px] font-semibold text-[#E8ECF4] tracking-wide">Latencia API</h3>
              <p className="text-[10px] text-[#6B7A99] font-mono">{metrics.apiLatency}ms actual</p>
            </div>
            <div className="text-[10px] px-2 py-1 rounded-full bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20">
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
              <Area type="monotone" dataKey="value" stroke="#00D4FF" strokeWidth={2} fill="url(#latGrad)" dot={false} />
              <Tooltip
                contentStyle={{ background: "rgba(13,27,62,0.95)", border: "1px solid #1A2744", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ display: "none" }}
                formatter={(v) => [`${v}ms`, ""]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tokens chart */}
        <div className="glass-card rounded-2xl p-5 border border-[#1A2744]/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[13px] font-semibold text-[#E8ECF4] tracking-wide">Tokens / min</h3>
              <p className="text-[10px] text-[#6B7A99] font-mono">{metrics.tokensPerMinute} tokens</p>
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
              <Area type="monotone" dataKey="value" stroke="#7B61FF" strokeWidth={2} fill="url(#tokGrad)" dot={false} />
              <Tooltip
                contentStyle={{ background: "rgba(13,27,62,0.95)", border: "1px solid #1A2744", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ display: "none" }}
                formatter={(v) => [`${v} tok`, ""]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Agent status */}
        <div className="glass-card rounded-2xl p-5 border border-[#1A2744]/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold text-[#E8ECF4] tracking-wide">Estado de Agentes</h3>
            <button onClick={() => setPage("agents")} className="text-[11px] text-[#00D4FF] hover:underline tracking-wide">
              Ver todos →
            </button>
          </div>
          <div className="space-y-2.5">
            {agents.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-all">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: `${a.color}15`, border: `1px solid ${a.color}30`, color: a.color }}
                >
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#E8ECF4] tracking-wide">{a.name}</p>
                  <p className="text-[10px] text-[#6B7A99]">{a.role}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 status-${a.status}`} />
                  <span className="text-[10px] text-[#6B7A99] capitalize font-mono">{a.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent missions */}
        <div className="glass-card rounded-2xl p-5 border border-[#1A2744]/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold text-[#E8ECF4] tracking-wide">Misiones Recientes</h3>
            <button onClick={() => setPage("missions")} className="text-[11px] text-[#00D4FF] hover:underline tracking-wide">
              Ver tablero →
            </button>
          </div>
          <div className="space-y-2">
            {recentMissions.map((m) => (
              <div key={m.id} className="p-2.5 rounded-xl hover:bg-white/[0.03] transition-all">
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
                <div className="w-full h-1 bg-[#1A2744]/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${m.progress}%`,
                      background: m.status === "done"
                        ? "linear-gradient(90deg, #00E5A0, #00D4FF)"
                        : "linear-gradient(90deg, #7B61FF, #00D4FF)",
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
      </div>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}
