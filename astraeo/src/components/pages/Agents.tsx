"use client";
import { useState } from "react";
import { useAstraeo } from "@/store/astraeo";
import type { Agent, AgentStatus } from "@/lib/types";

const statusColors: Record<AgentStatus, string> = {
  online: "#00E5A0", busy: "#FFB800", offline: "#6B7A99", error: "#FF4757",
};

const models = [
  "claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001",
];

function emptyAgent(): Omit<Agent, "id" | "createdAt" | "tasksCompleted" | "tokensUsed" | "avgResponseMs"> {
  return {
    name: "", role: "", status: "offline", model: "claude-sonnet-4-6",
    systemPrompt: "", skills: [], color: "#00D4FF", icon: "◉", active: false,
  };
}

export default function AgentsPage() {
  const { agents, addAgent, updateAgent, deleteAgent, setAgentStatus, showToast } = useAstraeo();
  const [selected, setSelected] = useState<Agent | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ReturnType<typeof emptyAgent>>(emptyAgent());
  const [skillInput, setSkillInput] = useState("");

  const handleCreate = () => { setForm(emptyAgent()); setCreating(true); setEditing(false); setSelected(null); };
  const handleEdit = (a: Agent) => { setForm({ ...a }); setEditing(true); setCreating(false); };
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
    if (!skillInput.trim()) return;
    setForm((f) => ({ ...f, skills: [...f.skills, skillInput.trim()] }));
    setSkillInput("");
  };
  const removeSkill = (sk: string) => setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== sk) }));

  return (
    <div className="flex h-full animate-fade-in">
      {/* List */}
      <div className="w-80 border-r border-[#1A2744]/60 flex flex-col flex-shrink-0">
        <div className="px-5 py-4 border-b border-[#1A2744]/60 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-[14px] font-bold tracking-wide text-[#E8ECF4]">Agentes</h2>
            <p className="text-[10px] text-[#6B7A99] font-mono">{agents.filter((a) => a.status === "online").length} online</p>
          </div>
          <button onClick={handleCreate} className="btn-primary text-[11px] py-1.5 px-3">+ Nuevo</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {agents.map((a) => (
            <div
              key={a.id}
              onClick={() => { setSelected(a); setEditing(false); setCreating(false); }}
              className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                selected?.id === a.id
                  ? "border-[#00D4FF]/30 bg-[#00D4FF]/05"
                  : "border-[#1A2744]/50 glass-card hover:border-[#1A2744] hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: `${a.color}12`, border: `1px solid ${a.color}25` }}
                >
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#E8ECF4] tracking-wide">{a.name}</p>
                  <p className="text-[10px] text-[#6B7A99]">{a.role}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 status-${a.status}`} />
                  <span className="text-[9px] text-[#6B7A99] font-mono capitalize">{a.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail / Edit */}
      <div className="flex-1 overflow-y-auto p-6">
        {(editing || creating) ? (
          <AgentForm
            form={form}
            setForm={setForm}
            skillInput={skillInput}
            setSkillInput={setSkillInput}
            addSkill={addSkill}
            removeSkill={removeSkill}
            onSave={handleSave}
            onCancel={() => { setEditing(false); setCreating(false); }}
            isNew={creating}
          />
        ) : selected ? (
          <AgentDetail
            agent={selected}
            onEdit={() => handleEdit(selected)}
            onDelete={() => { deleteAgent(selected.id); setSelected(null); showToast(`${selected.name} eliminado`, "info"); }}
            onStatusChange={(s) => { setAgentStatus(selected.id, s); setSelected({ ...selected, status: s }); showToast(`${selected.name} → ${s}`, "info"); }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <span className="text-5xl">◉</span>
            <p className="text-[14px] text-[#6B7A99]">Selecciona un agente</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentDetail({ agent, onEdit, onDelete, onStatusChange }: {
  agent: Agent;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: AgentStatus) => void;
}) {
  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: `${agent.color}12`, border: `1px solid ${agent.color}25` }}
          >
            {agent.icon}
          </div>
          <div>
            <h2 className="text-[20px] font-bold tracking-wide" style={{ color: agent.color }}>{agent.name}</h2>
            <p className="text-[13px] text-[#6B7A99]">{agent.role}</p>
            <p className="text-[11px] text-[#6B7A99] font-mono mt-0.5">{agent.model}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="btn-ghost text-[12px] py-2 px-3">✎ Editar</button>
          <button onClick={onDelete} className="btn-danger text-[12px] py-2 px-3">✕ Eliminar</button>
        </div>
      </div>

      {/* Status control */}
      <div className="glass-card rounded-xl p-4 border border-[#1A2744]/50">
        <p className="text-[11px] text-[#6B7A99] uppercase tracking-[0.15em] mb-3 font-semibold">Estado</p>
        <div className="flex gap-2">
          {(["online", "busy", "offline"] as AgentStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all"
              style={{
                background: agent.status === s ? `${statusColors[s]}15` : "transparent",
                color: agent.status === s ? statusColors[s] : "#6B7A99",
                border: `1px solid ${agent.status === s ? statusColors[s] + "30" : "#1A2744"}`,
              }}
            >
              <div className={`w-1.5 h-1.5 rounded-full`} style={{ background: statusColors[s] }} />
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Tareas completadas", value: agent.tasksCompleted, color: agent.color },
          { label: "Tokens usados", value: formatTokens(agent.tokensUsed), color: "#7B61FF" },
          { label: "Resp. media", value: agent.avgResponseMs > 0 ? `${agent.avgResponseMs}ms` : "—", color: "#00E5A0" },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-xl p-4 border border-[#1A2744]/50 text-center">
            <div className="text-[22px] font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-[#6B7A99] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* System prompt */}
      <div className="glass-card rounded-xl p-4 border border-[#1A2744]/50">
        <p className="text-[11px] text-[#6B7A99] uppercase tracking-[0.15em] mb-2 font-semibold">System Prompt</p>
        <p className="text-[13px] text-[#E8ECF4] leading-relaxed">{agent.systemPrompt || "Sin system prompt configurado."}</p>
      </div>

      {/* Skills */}
      <div className="glass-card rounded-xl p-4 border border-[#1A2744]/50">
        <p className="text-[11px] text-[#6B7A99] uppercase tracking-[0.15em] mb-3 font-semibold">Skills</p>
        <div className="flex flex-wrap gap-2">
          {agent.skills.map((sk) => (
            <span key={sk}
              className="text-[11px] px-3 py-1 rounded-full font-medium"
              style={{ background: `${agent.color}10`, color: agent.color, border: `1px solid ${agent.color}25` }}>
              {sk}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentForm({ form, setForm, skillInput, setSkillInput, addSkill, removeSkill, onSave, onCancel, isNew }: {
  form: ReturnType<typeof emptyAgent>;
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyAgent>>>;
  skillInput: string;
  setSkillInput: (v: string) => void;
  addSkill: () => void;
  removeSkill: (sk: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew: boolean;
}) {
  const colors = ["#00D4FF", "#7B61FF", "#FF6B9D", "#00E5A0", "#FFB800", "#FF4757"];
  return (
    <div className="space-y-4 max-w-lg animate-fade-in">
      <h3 className="text-[16px] font-bold tracking-wide">{isNew ? "Nuevo Agente" : "Editar Agente"}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">Nombre *</label>
          <input className="astraeo-input" placeholder="NEXUS" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">Icono</label>
          <input className="astraeo-input" placeholder="◉" value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">Rol</label>
        <input className="astraeo-input" placeholder="Especialista en..." value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
      </div>
      <div>
        <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">Modelo</label>
        <select className="astraeo-input" value={form.model}
          onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
          style={{ background: "#0A0F1F" }}>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">System Prompt</label>
        <textarea className="astraeo-input resize-none" rows={4} placeholder="Eres un agente especializado en..."
          value={form.systemPrompt} onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))} />
      </div>
      <div>
        <label className="text-[11px] text-[#6B7A99] mb-2 block tracking-wide">Color</label>
        <div className="flex gap-2">
          {colors.map((c) => (
            <button key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
              className="w-7 h-7 rounded-full transition-all border-2"
              style={{ background: c, borderColor: form.color === c ? "#E8ECF4" : "transparent" }} />
          ))}
        </div>
      </div>
      <div>
        <label className="text-[11px] text-[#6B7A99] mb-2 block tracking-wide">Skills</label>
        <div className="flex gap-2 mb-2">
          <input className="astraeo-input flex-1" placeholder="Analytics, CRM..." value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSkill()} />
          <button onClick={addSkill} className="btn-ghost px-3">+</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {form.skills.map((sk) => (
            <span key={sk} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
              style={{ background: `${form.color}10`, color: form.color, border: `1px solid ${form.color}25` }}>
              {sk}
              <button onClick={() => removeSkill(sk)} className="opacity-60 hover:opacity-100">×</button>
            </span>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-ghost">Cancelar</button>
        <button onClick={onSave} className="btn-primary">{isNew ? "Crear agente" : "Guardar"}</button>
      </div>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}
