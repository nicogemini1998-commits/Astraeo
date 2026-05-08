"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAstraeo } from "@/store/astraeo";
import type { Agent, AgentStatus } from "@/lib/types";

const statusColors: Record<AgentStatus, string> = {
  online:  "#00E5A0",
  busy:    "#FFB800",
  offline: "#6B7A99",
  error:   "#FF4757",
};

const statusLabels: Record<AgentStatus, string> = {
  online:  "Online",
  busy:    "Ocupado",
  offline: "Offline",
  error:   "Error",
};

const models = [
  { id: "claude-opus-4-7",           label: "Opus 4.7",   sub: "Máxima inteligencia",     badge: "#CC785C" },
  { id: "claude-sonnet-4-6",         label: "Sonnet 4.6", sub: "Equilibrado",              badge: "#00D4FF" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5",  sub: "Rápido y económico",       badge: "#00E5A0" },
];

const AGENT_COLORS = ["#00D4FF", "#7B61FF", "#FF6B9D", "#00E5A0", "#FFB800", "#FF4757"];

function emptyAgent(): Omit<Agent, "id" | "createdAt" | "tasksCompleted" | "tokensUsed" | "avgResponseMs"> {
  return {
    name: "", role: "", status: "offline", model: "claude-sonnet-4-6",
    systemPrompt: "", skills: [], color: "#00D4FF", icon: "◉", active: false,
  };
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

// Animated counter hook
function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const initial = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(initial + (target - initial) * ease));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

export default function AgentsPage() {
  const { agents, addAgent, updateAgent, deleteAgent, setAgentStatus, showToast } = useAstraeo();

  const [selected,    setSelected]    = useState<Agent | null>(null);
  const [editing,     setEditing]     = useState(false);
  const [creating,    setCreating]    = useState(false);
  const [listSearch,  setListSearch]  = useState("");
  const [form,        setForm]        = useState<ReturnType<typeof emptyAgent>>(emptyAgent());
  const [skillInput,  setSkillInput]  = useState("");
  const [promptChars, setPromptChars] = useState(0);

  const filteredAgents = agents.filter((a) =>
    !listSearch ||
    a.name.toLowerCase().includes(listSearch.toLowerCase()) ||
    a.role.toLowerCase().includes(listSearch.toLowerCase())
  );

  const handleCreate = () => {
    const draft = emptyAgent();
    setForm(draft);
    setPromptChars(0);
    setCreating(true);
    setEditing(false);
    setSelected(null);
  };

  const handleEdit = (a: Agent) => {
    setForm({ ...a });
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

  const cancelForm = () => {
    setEditing(false);
    setCreating(false);
  };

  const onlineCount = agents.filter((a) => a.status === "online").length;

  return (
    <div className="flex h-full animate-fade-in overflow-hidden">

      {/* ── Left panel: agent list (w-72) ─────────────────────────────────── */}
      <div className="w-72 border-r border-[#1A2744]/60 flex flex-col flex-shrink-0">
        {/* List header */}
        <div className="px-4 py-3.5 border-b border-[#1A2744]/60 flex-shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h2 className="text-[14px] font-bold tracking-wide text-[#E8ECF4]">Agentes</h2>
              <p className="text-[10px] text-[#6B7A99] font-mono">
                {onlineCount} online · {agents.length} total
              </p>
            </div>
            <button onClick={handleCreate} className="btn-primary text-[11px] py-1.5 px-3">
              + Nuevo
            </button>
          </div>
          <input
            className="astraeo-input text-[12px] py-1.5"
            placeholder="Buscar agente..."
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
          />
        </div>

        {/* Agent list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredAgents.map((a) => (
            <AgentListCard
              key={a.id}
              agent={a}
              isSelected={selected?.id === a.id}
              onSelect={() => { setSelected(a); setEditing(false); setCreating(false); }}
              onStatusChange={(s) => {
                setAgentStatus(a.id, s);
                if (selected?.id === a.id) setSelected({ ...a, status: s });
                showToast(`${a.name} → ${s}`, "info");
              }}
            />
          ))}
          {filteredAgents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-30">
              <span className="text-3xl">◉</span>
              <p className="text-[12px] text-[#6B7A99]">Sin resultados</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: detail / form ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {(editing || creating) ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.22 }}
              className="p-6"
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
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22 }}
              className="p-6"
            >
              <AgentDetail
                agent={selected}
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
                    name:         `${selected.name} (copia)`,
                    role:         selected.role,
                    status:       "offline",
                    model:        selected.model,
                    systemPrompt: selected.systemPrompt,
                    skills:       [...selected.skills],
                    color:        selected.color,
                    icon:         selected.icon,
                    active:       false,
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
              className="flex flex-col items-center justify-center h-full gap-4 opacity-30"
            >
              <span className="text-5xl">◉</span>
              <p className="text-[14px] text-[#6B7A99]">Selecciona un agente</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Agent list card ────────────────────────────────────────────────────────────
function AgentListCard({
  agent,
  isSelected,
  onSelect,
  onStatusChange,
}: {
  agent: Agent;
  isSelected: boolean;
  onSelect: () => void;
  onStatusChange: (s: AgentStatus) => void;
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setStatusOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const modelShort = agent.model.includes("opus")
    ? "opus"
    : agent.model.includes("haiku")
    ? "haiku"
    : "sonnet";

  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-xl cursor-pointer transition-all border group ${
        isSelected
          ? "border-[#00D4FF]/30 bg-[#00D4FF]/[0.04]"
          : "border-[#1A2744]/50 glass-card hover:border-[#1A2744] hover:bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `${agent.color}12`, border: `1px solid ${agent.color}25` }}
        >
          {agent.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-[#E8ECF4] truncate">{agent.name}</p>
          <p className="text-[10px] text-[#6B7A99] truncate font-mono">
            {agent.role} · {modelShort}
          </p>
          <p className="text-[9px] text-[#6B7A99]/60 font-mono">
            {agent.tasksCompleted} tasks · {formatTokens(agent.tokensUsed)}
          </p>
        </div>

        {/* Status dot + inline dropdown */}
        <div
          ref={ref}
          className="relative flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setStatusOpen((v) => !v)}
            className="flex flex-col items-center gap-0.5 p-1 rounded-lg hover:bg-white/5 transition-colors"
            title={`Estado: ${statusLabels[agent.status]}`}
          >
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: statusColors[agent.status] }}
              animate={
                agent.status === "online"
                  ? { boxShadow: ["0 0 4px " + statusColors.online, "0 0 10px " + statusColors.online, "0 0 4px " + statusColors.online] }
                  : {}
              }
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[8px] text-[#6B7A99] font-mono capitalize leading-none">
              {agent.status}
            </span>
          </button>

          <AnimatePresence>
            {statusOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1 z-50 glass-strong rounded-xl border border-[#1A2744] overflow-hidden min-w-[110px] py-1"
              >
                {(["online", "busy", "offline", "error"] as AgentStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { onStatusChange(s); setStatusOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: statusColors[s] }}
                    />
                    <span
                      className="text-[11px] font-medium capitalize"
                      style={{ color: agent.status === s ? statusColors[s] : "#6B7A99" }}
                    >
                      {statusLabels[s]}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Agent detail panel ─────────────────────────────────────────────────────────
function AgentDetail({
  agent,
  onEdit,
  onDelete,
  onStatusChange,
  onDuplicate,
}: {
  agent: Agent;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: AgentStatus) => void;
  onDuplicate: () => void;
}) {
  const tasks   = useCountUp(agent.tasksCompleted);
  const tokens  = useCountUp(agent.tokensUsed);

  const modelMeta = models.find((m) => m.id === agent.model);

  const statItems = [
    { label: "Tareas",      value: String(tasks),                         color: agent.color  },
    { label: "Tokens",      value: formatTokens(tokens),                  color: "#7B61FF"    },
    { label: "Latencia",    value: agent.avgResponseMs > 0 ? `${agent.avgResponseMs}ms` : "—", color: "#00E5A0" },
    { label: "Uptime est.", value: agent.status === "online" ? "99.9%" : agent.status === "busy" ? "95%" : "—", color: "#FFB800" },
  ];

  // Progress bars (normalized, decorative)
  const maxTasks   = 500;
  const maxTokens  = 1_000_000;
  const perfItems = [
    { label: "Tareas completadas",  pct: Math.min((agent.tasksCompleted / maxTasks) * 100, 100),  color: agent.color },
    { label: "Tokens consumidos",   pct: Math.min((agent.tokensUsed / maxTokens) * 100, 100),     color: "#7B61FF"   },
    { label: "Eficiencia estimada", pct: agent.status === "online" ? 94 : agent.status === "busy" ? 72 : 30,         color: "#00E5A0"  },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      {/* ── Top header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: `${agent.color}12`, border: `1px solid ${agent.color}25` }}
          >
            {agent.icon}
          </div>
          <div>
            <h2
              className="text-[22px] font-bold tracking-wide"
              style={{ color: agent.color }}
            >
              {agent.name}
            </h2>
            <p className="text-[13px] text-[#6B7A99]">{agent.role}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono"
                style={{
                  background: `${modelMeta?.badge ?? "#6B7A99"}15`,
                  color:       modelMeta?.badge ?? "#6B7A99",
                  border:      `1px solid ${modelMeta?.badge ?? "#6B7A99"}30`,
                }}
              >
                {agent.model}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                const { setPage, createChatSession, setActiveChat } = useAstraeo.getState();
                const sessionId = createChatSession(agent.id);
                setActiveChat(sessionId);
                setPage("chat");
              }
            }}
            className="btn-primary text-[12px] py-2 px-3"
          >
            ◉ Chat
          </button>
          <button onClick={onEdit}      className="btn-ghost   text-[12px] py-2 px-3">✎ Editar</button>
          <button onClick={onDuplicate} className="btn-ghost   text-[12px] py-2 px-3">⊕ Duplicar</button>
          <button onClick={onDelete}    className="btn-danger  text-[12px] py-2 px-3">✕</button>
        </div>
      </div>

      {/* ── Status control ──────────────────────────────────────────────── */}
      <div className="glass-card rounded-xl p-4 border border-[#1A2744]/50">
        <p className="text-[11px] text-[#6B7A99] uppercase tracking-[0.15em] mb-3 font-semibold">
          Estado
        </p>
        <div className="flex gap-2">
          {(["online", "busy", "offline"] as AgentStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all"
              style={{
                background:  agent.status === s ? `${statusColors[s]}15` : "transparent",
                color:       agent.status === s ? statusColors[s] : "#6B7A99",
                border:      `1px solid ${agent.status === s ? statusColors[s] + "30" : "#1A2744"}`,
              }}
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: statusColors[s] }}
                animate={
                  agent.status === s && s === "online"
                    ? { scale: [1, 1.4, 1] }
                    : {}
                }
                transition={{ duration: 1, repeat: Infinity }}
              />
              {statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats 2x2 grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statItems.map((s) => (
          <div
            key={s.label}
            className="glass-card rounded-xl p-4 border border-[#1A2744]/50 text-center"
          >
            <div
              className="text-[20px] font-bold font-mono metric-value"
              style={{ color: s.color }}
            >
              {s.value}
            </div>
            <div className="text-[10px] text-[#6B7A99] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Performance bars ────────────────────────────────────────────── */}
      <div className="glass-card rounded-xl p-4 border border-[#1A2744]/50">
        <p className="text-[11px] text-[#6B7A99] uppercase tracking-[0.15em] mb-4 font-semibold">
          Rendimiento
        </p>
        <div className="space-y-3">
          {perfItems.map((p) => (
            <div key={p.label}>
              <div className="flex justify-between mb-1">
                <span className="text-[11px] text-[#6B7A99]">{p.label}</span>
                <span className="text-[11px] font-mono" style={{ color: p.color }}>
                  {Math.round(p.pct)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#1A2744]/60 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${p.color}80, ${p.color})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${p.pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── System prompt ───────────────────────────────────────────────── */}
      <div className="glass-card rounded-xl p-4 border border-[#1A2744]/50">
        <p className="text-[11px] text-[#6B7A99] uppercase tracking-[0.15em] mb-2 font-semibold">
          System Prompt
        </p>
        <p className="text-[12px] text-[#E8ECF4] leading-relaxed whitespace-pre-wrap font-mono">
          {agent.systemPrompt || "Sin system prompt configurado."}
        </p>
      </div>

      {/* ── Skills ──────────────────────────────────────────────────────── */}
      {agent.skills.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-[#1A2744]/50">
          <p className="text-[11px] text-[#6B7A99] uppercase tracking-[0.15em] mb-3 font-semibold">
            Skills
          </p>
          <div className="flex flex-wrap gap-2">
            {agent.skills.map((sk) => (
              <span
                key={sk}
                className="text-[11px] px-3 py-1 rounded-full font-medium"
                style={{
                  background: `${agent.color}10`,
                  color:       agent.color,
                  border:      `1px solid ${agent.color}25`,
                }}
              >
                {sk}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Agent form ─────────────────────────────────────────────────────────────────
function AgentForm({
  form,
  setForm,
  skillInput,
  setSkillInput,
  addSkill,
  removeSkill,
  promptChars,
  setPromptChars,
  onSave,
  onCancel,
  isNew,
}: {
  form: ReturnType<typeof emptyAgent>;
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyAgent>>>;
  skillInput: string;
  setSkillInput: (v: string) => void;
  addSkill: () => void;
  removeSkill: (sk: string) => void;
  promptChars: number;
  setPromptChars: (n: number) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew: boolean;
}) {
  return (
    <div className="space-y-4 max-w-lg">
      <h3 className="text-[16px] font-bold tracking-wide text-[#E8ECF4]">
        {isNew ? "Nuevo Agente" : "Editar Agente"}
      </h3>

      {/* Name + Role in same row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">Nombre *</label>
          <input
            className="astraeo-input"
            placeholder="NEXUS"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">Rol</label>
          <input
            className="astraeo-input"
            placeholder="Especialista en..."
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          />
        </div>
      </div>

      {/* Icon */}
      <div>
        <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">Icono</label>
        <input
          className="astraeo-input w-24"
          placeholder="◉"
          value={form.icon}
          onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
        />
      </div>

      {/* Model selector — card style */}
      <div>
        <label className="text-[11px] text-[#6B7A99] mb-2 block tracking-wide">Modelo</label>
        <div className="space-y-2">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => setForm((f) => ({ ...f, model: m.id }))}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border"
              style={{
                background:  form.model === m.id ? `${m.badge}08` : "rgba(10,15,31,0.5)",
                borderColor: form.model === m.id ? `${m.badge}40` : "#1A2744",
              }}
            >
              <span
                className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold flex-shrink-0"
                style={{ background: `${m.badge}15`, color: m.badge }}
              >
                {m.label}
              </span>
              <span className="text-[11px] text-[#6B7A99]">{m.sub}</span>
              {form.model === m.id && (
                <span className="ml-auto text-[#00D4FF] text-[12px]">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="text-[11px] text-[#6B7A99] mb-2 block tracking-wide">Color</label>
        <div className="flex gap-2">
          {AGENT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setForm((f) => ({ ...f, color: c }))}
              className="w-7 h-7 rounded-full transition-all"
              style={{
                background:  c,
                outline:     form.color === c ? `2px solid ${c}` : "none",
                outlineOffset: "3px",
              }}
            />
          ))}
        </div>
      </div>

      {/* Skills */}
      <div>
        <label className="text-[11px] text-[#6B7A99] mb-2 block tracking-wide">Skills</label>
        <div className="flex gap-2 mb-2">
          <input
            className="astraeo-input flex-1"
            placeholder="Analytics, CRM, SEO..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
          />
          <button onClick={addSkill} className="btn-ghost px-3">+</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {form.skills.map((sk) => (
            <span
              key={sk}
              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
              style={{
                background: `${form.color}10`,
                color:       form.color,
                border:      `1px solid ${form.color}25`,
              }}
            >
              {sk}
              <button
                onClick={() => removeSkill(sk)}
                className="opacity-60 hover:opacity-100 leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* System prompt with char counter */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] text-[#6B7A99] tracking-wide">System Prompt</label>
          <span className="text-[10px] font-mono" style={{ color: promptChars > 3000 ? "#FF4757" : "#6B7A99" }}>
            {promptChars} / 4000
          </span>
        </div>
        <textarea
          className="astraeo-input resize-y"
          rows={5}
          placeholder="Eres un agente especializado en..."
          maxLength={4000}
          value={form.systemPrompt}
          onChange={(e) => {
            setForm((f) => ({ ...f, systemPrompt: e.target.value }));
            setPromptChars(e.target.value.length);
          }}
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-ghost">Cancelar</button>
        <button onClick={onSave} className="btn-primary">
          {isNew ? "Crear agente" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
