"use client";
import { useAstraeo } from "@/store/astraeo";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

const COLORS = ["#00D4FF", "#7B61FF", "#FF6B9D", "#00E5A0", "#FFB800"];

export default function Analytics() {
  const { agents, missions, metrics, memory, workflows } = useAstraeo();

  const missionsByStatus = [
    { name: "Backlog", value: missions.filter((m) => m.status === "backlog").length },
    { name: "Activas", value: missions.filter((m) => m.status === "active").length },
    { name: "Revisión", value: missions.filter((m) => m.status === "review").length },
    { name: "Listas", value: missions.filter((m) => m.status === "done").length },
  ];

  const agentTokens = agents.map((a) => ({
    name: a.name,
    tokens: Math.round(a.tokensUsed / 1000),
    tasks: a.tasksCompleted,
  }));

  const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      day: d.toLocaleDateString("es", { weekday: "short" }),
      requests: Math.floor(80 + Math.random() * 120),
      tokens: Math.floor(40000 + Math.random() * 60000),
    };
  });

  const kpis = [
    { label: "Total Requests", value: metrics.requestsToday.toLocaleString(), color: "#00D4FF", sub: "hoy" },
    { label: "Tasa de éxito", value: `${metrics.successRate}%`, color: "#00E5A0", sub: "promedio" },
    { label: "Latencia media", value: metrics.apiLatency > 0 ? `${metrics.apiLatency}ms` : "—", color: "#7B61FF", sub: "API" },
    { label: "Eficiencia", value: `${metrics.efficiency}%`, color: "#FFB800", sub: "sistema" },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full animate-fade-in">
      <div>
        <h2 className="text-[15px] font-bold tracking-wide text-[#E8ECF4]">Analytics</h2>
        <p className="text-[11px] text-[#6B7A99] font-mono">Métricas en tiempo real del sistema</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass-card rounded-2xl p-4 border border-[#1A2744]/50 text-center card-hover">
            <div className="text-3xl font-bold font-mono mb-1" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[12px] font-semibold text-[#E8ECF4]">{k.label}</div>
            <div className="text-[10px] text-[#6B7A99] mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-[#1A2744]/50">
          <h3 className="text-[13px] font-semibold mb-1 text-[#E8ECF4]">Actividad Semanal</h3>
          <p className="text-[10px] text-[#6B7A99] mb-4 font-mono">Requests últimos 7 días</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={weeklyActivity}>
              <defs>
                <linearGradient id="wkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,39,68,0.5)" />
              <XAxis dataKey="day" tick={{ fill: "#6B7A99", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6B7A99", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "rgba(13,27,62,0.95)", border: "1px solid #1A2744", borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="requests" stroke="#00D4FF" strokeWidth={2} fill="url(#wkGrad)" dot={false} name="Requests" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-[#1A2744]/50">
          <h3 className="text-[13px] font-semibold mb-1 text-[#E8ECF4]">Tokens por Agente</h3>
          <p className="text-[10px] text-[#6B7A99] mb-4 font-mono">Miles de tokens usados</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={agentTokens}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,39,68,0.5)" />
              <XAxis dataKey="name" tick={{ fill: "#6B7A99", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6B7A99", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "rgba(13,27,62,0.95)", border: "1px solid #1A2744", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="tokens" radius={[4, 4, 0, 0]} name="Tokens (k)">
                {agentTokens.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Missions pie */}
        <div className="glass-card rounded-2xl p-5 border border-[#1A2744]/50">
          <h3 className="text-[13px] font-semibold mb-1 text-[#E8ECF4]">Estado de Misiones</h3>
          <p className="text-[10px] text-[#6B7A99] mb-2 font-mono">Distribución actual</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={missionsByStatus} cx="50%" cy="50%" innerRadius={30} outerRadius={55}
                  dataKey="value" paddingAngle={3}>
                  {missionsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "rgba(13,27,62,0.95)", border: "1px solid #1A2744", borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 flex-1">
              {missionsByStatus.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-[#6B7A99]">{d.name}</span>
                  </div>
                  <span className="font-bold font-mono" style={{ color: COLORS[i] }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Realtime latency */}
        <div className="glass-card rounded-2xl p-5 border border-[#1A2744]/50">
          <h3 className="text-[13px] font-semibold mb-1 text-[#E8ECF4]">Latencia Live</h3>
          <p className="text-[10px] text-[#6B7A99] mb-2 font-mono">{metrics.apiLatency}ms actual</p>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={metrics.latencyHistory.map((p) => ({ v: Math.round(p.value) }))}>
              <defs>
                <linearGradient id="liveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7B61FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7B61FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="#7B61FF" strokeWidth={2} fill="url(#liveGrad)" dot={false} />
              <Tooltip contentStyle={{ background: "rgba(13,27,62,0.95)", border: "1px solid #1A2744", borderRadius: 8, fontSize: 11 }} formatter={(v) => [`${v}ms`]} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Summary stats */}
        <div className="glass-card rounded-2xl p-5 border border-[#1A2744]/50 space-y-3">
          <h3 className="text-[13px] font-semibold text-[#E8ECF4]">Resumen General</h3>
          {[
            { label: "Total agentes", value: agents.length, color: "#00D4FF" },
            { label: "Tareas completadas", value: agents.reduce((s, a) => s + a.tasksCompleted, 0), color: "#00E5A0" },
            { label: "Memorias guardadas", value: memory.length, color: "#7B61FF" },
            { label: "Workflows creados", value: workflows.length, color: "#FF6B9D" },
            { label: "Total runs", value: workflows.reduce((s, w) => s + w.runs, 0), color: "#FFB800" },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-[12px] text-[#6B7A99]">{s.label}</span>
              <span className="text-[13px] font-bold font-mono" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
