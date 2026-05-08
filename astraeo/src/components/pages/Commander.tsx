"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAstraeo } from "@/store/astraeo";
import { nanoid } from "nanoid";
import type { AgentStatus, MissionPriority, MissionStatus, MemoryType } from "@/lib/types";

// ─── Design tokens ────────────────────────────────────────────────────────────
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

// ─── Tool definitions for Claude ──────────────────────────────────────────────
const COMMANDER_TOOLS = [
  {
    name: "create_agent",
    description: "Crea un nuevo agente en ASTRAEO con nombre, rol, modelo de Claude, system prompt y skills.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre del agente en mayúsculas (ej. ZEUS)" },
        role: { type: "string", description: "Rol descriptivo del agente" },
        model: { type: "string", enum: ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"] },
        systemPrompt: { type: "string", description: "System prompt completo para el agente" },
        skills: { type: "array", items: { type: "string" }, description: "Lista de skills del agente" },
        icon: { type: "string", description: "Emoji o símbolo para el agente" },
        color: { type: "string", description: "Color hex del agente, ej. #4A8EB8" },
      },
      required: ["name", "role", "model", "systemPrompt", "skills"],
    },
  },
  {
    name: "create_mission",
    description: "Crea una nueva misión en el tablero Kanban de ASTRAEO.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        status: { type: "string", enum: ["backlog", "active", "review", "done"] },
        assignedAgentIds: { type: "array", items: { type: "string" }, description: "IDs de agentes a asignar" },
        tags: { type: "array", items: { type: "string" } },
        dueDate: { type: "string", description: "Fecha límite ISO, opcional" },
      },
      required: ["title", "description", "priority"],
    },
  },
  {
    name: "create_memory",
    description: "Guarda una nueva entrada en el Memory Hub de ASTRAEO.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string", description: "Contenido completo de la memoria" },
        type: { type: "string", enum: ["user", "feedback", "project", "reference", "fact"] },
        tags: { type: "array", items: { type: "string" } },
        pinned: { type: "boolean" },
      },
      required: ["title", "content", "type"],
    },
  },
  {
    name: "create_workflow",
    description: "Crea un nuevo workflow de automatización en ASTRAEO.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              type: { type: "string", enum: ["trigger", "agent", "condition", "action", "output"] },
              agentId: { type: "string", description: "ID del agente si el tipo es agent" },
            },
            required: ["label", "type"],
          },
        },
      },
      required: ["name", "description", "steps"],
    },
  },
  {
    name: "update_agent",
    description: "Modifica un agente existente por ID.",
    input_schema: {
      type: "object",
      properties: {
        agentId: { type: "string" },
        changes: {
          type: "object",
          properties: {
            name: { type: "string" },
            role: { type: "string" },
            status: { type: "string", enum: ["online", "busy", "offline", "error"] },
            systemPrompt: { type: "string" },
            skills: { type: "array", items: { type: "string" } },
            active: { type: "boolean" },
          },
        },
      },
      required: ["agentId", "changes"],
    },
  },
  {
    name: "list_resources",
    description: "Lista los recursos actuales del sistema (agentes, misiones, memorias, workflows) para consultarlos.",
    input_schema: {
      type: "object",
      properties: {
        resource: { type: "string", enum: ["agents", "missions", "memory", "workflows", "all"] },
      },
      required: ["resource"],
    },
  },
  {
    name: "delete_mission",
    description: "Elimina una misión por ID.",
    input_schema: { type: "object", properties: { missionId: { type: "string" } }, required: ["missionId"] },
  },
  {
    name: "update_mission",
    description: "Actualiza el estado o datos de una misión existente.",
    input_schema: {
      type: "object",
      properties: {
        missionId: { type: "string" },
        changes: {
          type: "object",
          properties: {
            title: { type: "string" },
            status: { type: "string", enum: ["backlog", "active", "review", "done"] },
            priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
            progress: { type: "number" },
            description: { type: "string" },
          },
        },
      },
      required: ["missionId", "changes"],
    },
  },
];

// ─── Tool executor ─────────────────────────────────────────────────────────
interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

function executeTool(toolName: string, input: Record<string, unknown>): ToolResult {
  const store = useAstraeo.getState();

  switch (toolName) {
    case "create_agent": {
      const colors = [C.cyan, C.purple, C.coral, C.emerald, C.amber];
      store.addAgent({
        name: String(input.name ?? ""),
        role: String(input.role ?? ""),
        model: String(input.model ?? "claude-sonnet-4-6"),
        systemPrompt: String(input.systemPrompt ?? ""),
        skills: (input.skills as string[]) ?? [],
        icon: String(input.icon ?? "◉"),
        color: String(input.color ?? colors[Math.floor(Math.random() * colors.length)]),
        status: "offline",
        active: false,
      });
      store.addNotification({ title: `Agente ${input.name} creado`, message: `por Commander`, type: "success", read: false });
      return { success: true, message: `Agente **${input.name}** creado exitosamente.` };
    }

    case "create_mission": {
      store.addMission({
        title: String(input.title ?? ""),
        description: String(input.description ?? ""),
        priority: (input.priority as MissionPriority) ?? "medium",
        status: (input.status as MissionStatus) ?? "backlog",
        assignedTo: (input.assignedAgentIds as string[]) ?? [],
        tags: (input.tags as string[]) ?? [],
        dueDate: input.dueDate ? String(input.dueDate) : undefined,
        progress: 0,
      });
      store.addNotification({ title: `Misión creada`, message: String(input.title), type: "success", read: false });
      return { success: true, message: `Misión **${input.title}** creada con prioridad ${input.priority}.` };
    }

    case "create_memory": {
      store.addMemory({
        title: String(input.title ?? ""),
        content: String(input.content ?? ""),
        type: (input.type as MemoryType) ?? "fact",
        tags: (input.tags as string[]) ?? [],
        pinned: Boolean(input.pinned ?? false),
      });
      return { success: true, message: `Memoria **${input.title}** guardada en el Hub.` };
    }

    case "create_workflow": {
      const steps = (input.steps as Array<{ label: string; type: string; agentId?: string }>) ?? [];
      const nodes = steps.map((step, i) => ({
        id: `n${i + 1}`,
        type: step.type as "trigger" | "agent" | "condition" | "action" | "output",
        label: step.label,
        x: 60 + i * 160,
        y: 120,
        config: step.agentId ? { agentId: step.agentId } : {},
        color: ({ trigger: C.emerald, agent: C.cyan, condition: C.amber, action: C.purple, output: C.coral } as Record<string, string>)[step.type] ?? "#8A8A97",
      }));
      const edges = nodes.slice(0, -1).map((n, i) => ({ id: `e${i + 1}`, from: n.id, to: nodes[i + 1].id }));
      store.addWorkflow({
        name: String(input.name ?? ""),
        description: String(input.description ?? ""),
        nodes,
        edges,
        active: false,
        lastRun: undefined,
      });
      store.addNotification({ title: `Workflow creado`, message: String(input.name), type: "success", read: false });
      return { success: true, message: `Workflow **${input.name}** creado con ${nodes.length} nodos.` };
    }

    case "update_agent": {
      const changes = (input.changes as Record<string, unknown>) ?? {};
      store.updateAgent(String(input.agentId), {
        ...(changes.name ? { name: String(changes.name) } : {}),
        ...(changes.role ? { role: String(changes.role) } : {}),
        ...(changes.status ? { status: changes.status as AgentStatus } : {}),
        ...(changes.systemPrompt ? { systemPrompt: String(changes.systemPrompt) } : {}),
        ...(changes.skills ? { skills: changes.skills as string[] } : {}),
        ...(changes.active !== undefined ? { active: Boolean(changes.active) } : {}),
      });
      return { success: true, message: `Agente actualizado.` };
    }

    case "list_resources": {
      const r = input.resource as string;
      const s = useAstraeo.getState();
      let data: Record<string, unknown> = {};
      if (r === "agents" || r === "all") data.agents = s.agents.map((a) => ({ id: a.id, name: a.name, role: a.role, status: a.status }));
      if (r === "missions" || r === "all") data.missions = s.missions.map((m) => ({ id: m.id, title: m.title, status: m.status, priority: m.priority }));
      if (r === "memory" || r === "all") data.memory = s.memory.map((m) => ({ id: m.id, title: m.title, type: m.type }));
      if (r === "workflows" || r === "all") data.workflows = s.workflows.map((w) => ({ id: w.id, name: w.name, active: w.active }));
      return { success: true, message: `Recursos listados.`, data };
    }

    case "delete_mission": {
      store.deleteMission(String(input.missionId));
      return { success: true, message: `Misión eliminada.` };
    }

    case "update_mission": {
      const ch = (input.changes as Record<string, unknown>) ?? {};
      store.updateMission(String(input.missionId), {
        ...(ch.title ? { title: String(ch.title) } : {}),
        ...(ch.status ? { status: ch.status as MissionStatus } : {}),
        ...(ch.priority ? { priority: ch.priority as MissionPriority } : {}),
        ...(ch.progress !== undefined ? { progress: Number(ch.progress) } : {}),
        ...(ch.description ? { description: String(ch.description) } : {}),
      });
      return { success: true, message: `Misión actualizada.` };
    }

    default:
      return { success: false, message: `Herramienta desconocida: ${toolName}` };
  }
}

// ─── Message types ──────────────────────────────────────────────────────────
interface CmdMessage {
  id: string;
  role: "user" | "assistant" | "tool_result" | "system";
  content: string;
  toolCalls?: Array<{ name: string; input: Record<string, unknown>; result: ToolResult }>;
  timestamp: string;
}

const SYSTEM_PROMPT = `Eres el **Comandante ASTRAEO** — la IA central de control del sistema ASTRAEO Mission Control.

Tu rol es ayudar al usuario a gestionar y construir todos los elementos del sistema:
- **Agentes**: crea, modifica y gestiona agentes de IA especializados
- **Misiones**: crea y gestiona misiones en el tablero Kanban
- **Memorias**: guarda información importante en el Memory Hub
- **Workflows**: diseña flujos de automatización

Cuando el usuario te pida crear algo, usa las herramientas disponibles para hacerlo directamente en el sistema. Siempre confirma lo que hiciste.

Responde en español. Sé conciso pero informativo. Usa markdown para formatear tus respuestas.

**Contexto del sistema actual:**
`;

function buildSystemPrompt(): string {
  const s = useAstraeo.getState();
  const companyBlock = s.settings.companyContext?.trim()
    ? `\n\n**Contexto de la empresa:**\n${s.settings.companyContext}`
    : "";
  return SYSTEM_PROMPT + `
- Agentes: ${s.agents.map((a) => `${a.name} (${a.id}, ${a.status})`).join(", ")}
- Misiones activas: ${s.missions.filter((m) => m.status === "active").length}
- Memorias guardadas: ${s.memory.length}
- Workflows: ${s.workflows.map((w) => `${w.name} (activo: ${w.active})`).join(", ")}
${companyBlock}`.trim();
}

// ─── Inline markdown renderer ────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${C.text}">$1</strong>`)
    .replace(/\*(.+?)\*/g, `<em style="color:#A78BFA">$1</em>`)
    .replace(/`(.+?)`/g, `<code style="background:rgba(0,212,255,0.1);padding:1px 5px;border-radius:3px;font-family:'JetBrains Mono',monospace;font-size:11px;color:${C.cyan};border:1px solid rgba(0,212,255,0.15)">$1</code>`)
    .replace(/^### (.+)$/gm, `<strong style="display:block;color:${C.text};font-size:12px;margin:8px 0 3px;letter-spacing:0.05em">$1</strong>`)
    .replace(/^## (.+)$/gm, `<strong style="display:block;color:${C.cyan};font-size:12px;margin:10px 0 4px;padding-bottom:3px;border-bottom:1px solid rgba(0,212,255,0.15)">$1</strong>`)
    .replace(/^- (.+)$/gm, `<span style="display:block;padding-left:12px;color:#8A9BBF">• $1</span>`)
    .replace(/\n/g, "<br/>");
}

// ─── Tool meta ───────────────────────────────────────────────────────────────
const TOOL_META: Record<string, { label: string; icon: string; color: string }> = {
  create_agent:   { label: "Agente creado",      icon: "◉", color: C.cyan },
  create_mission: { label: "Misión creada",       icon: "◆", color: C.amber },
  create_memory:  { label: "Memoria guardada",    icon: "◍", color: C.purple },
  create_workflow:{ label: "Workflow creado",     icon: "◫", color: C.coral },
  update_agent:   { label: "Agente actualizado",  icon: "✎", color: C.emerald },
  update_mission: { label: "Misión actualizada",  icon: "✎", color: C.amber },
  delete_mission: { label: "Misión eliminada",    icon: "✕", color: C.red },
  list_resources: { label: "Recursos consultados",icon: "◷", color: C.muted },
};

// ─── ToolCallBadge ───────────────────────────────────────────────────────────
function ToolCallBadge({ name, result }: { name: string; result: ToolResult }) {
  const meta = TOOL_META[name] ?? { label: name, icon: "⚙", color: C.muted };
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
      style={{
        background: result.success ? `${meta.color}10` : "rgba(255,71,87,0.08)",
        border: `1px solid ${result.success ? meta.color + "28" : "rgba(255,71,87,0.25)"}`,
        color: result.success ? meta.color : C.red,
      }}
    >
      <span className="text-[12px]">{meta.icon}</span>
      <span>{meta.label}</span>
      <span className="ml-auto font-mono text-[9px] opacity-70">
        {result.success ? "✓ OK" : "✗ ERR"}
      </span>
    </motion.div>
  );
}

// ─── MessageRow ──────────────────────────────────────────────────────────────
function MessageRow({ msg }: { msg: CmdMessage }) {
  const time = new Date(msg.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

  if (msg.role === "system") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-xl px-4 py-3"
        style={{
          background: "rgba(0,212,255,0.04)",
          border: `1px solid rgba(0,212,255,0.12)`,
          borderLeft: `3px solid ${C.cyan}`,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-bold tracking-widest uppercase font-mono" style={{ color: C.cyan }}>
            SYS
          </span>
          <span className="text-[9px] font-mono" style={{ color: C.muted }}>{time}</span>
        </div>
        <div
          className="text-[12px] leading-relaxed"
          style={{ color: "#B0C0DC" }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
        />
      </motion.div>
    );
  }

  if (msg.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[72%]">
          <div
            className="px-4 py-3 rounded-2xl rounded-br-sm text-[13px] leading-relaxed text-white"
            style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.cyan})` }}
          >
            {msg.content}
          </div>
          <p className="text-right text-[9px] mt-1 mr-1 font-mono" style={{ color: C.muted }}>{time}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-3"
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1"
        style={{ background: "rgba(0,212,255,0.08)", border: `1px solid rgba(0,212,255,0.2)` }}
      >
        <span style={{ fontSize: 14 }}>🌟</span>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="space-y-1.5">
            {msg.toolCalls.map((tc, i) => (
              <ToolCallBadge key={i} name={tc.name} result={tc.result} />
            ))}
          </div>
        )}
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-3 border text-[13px] leading-relaxed"
          style={{
            background: C.surface,
            border: `1px solid rgba(255,255,255,0.06)`,
            color: "#C8D0E0",
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
        />
        <p className="text-[9px] ml-1 font-mono" style={{ color: C.muted }}>{time}</p>
      </div>
    </motion.div>
  );
}

// ─── ThinkingIndicator ───────────────────────────────────────────────────────
function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-3"
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
        style={{ background: "rgba(0,212,255,0.08)", border: `1px solid rgba(0,212,255,0.2)` }}
      >
        🌟
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-sm border"
        style={{ background: C.surface, border: `1px solid rgba(255,255,255,0.06)` }}
      >
        <div className="flex gap-1.5 items-center" style={{ height: 18 }}>
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: C.cyan }}
              animate={{ scale: [0.6, 1, 0.6], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── ActionLog ───────────────────────────────────────────────────────────────
function ActionLog({ messages }: { messages: CmdMessage[] }) {
  const allActions = messages.flatMap((m) =>
    (m.toolCalls ?? []).map((tc) => ({ ...tc, timestamp: m.timestamp }))
  );

  return (
    <div
      className="w-60 flex flex-col flex-shrink-0"
      style={{ borderLeft: `1px solid rgba(255,255,255,0.06)` }}
    >
      <div
        className="px-4 py-3.5 flex-shrink-0"
        style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold tracking-widest uppercase font-mono" style={{ color: C.cyan }}>
            LOG DE ACCIONES
          </span>
        </div>
        <p className="text-[10px] mt-0.5 font-mono" style={{ color: C.muted }}>
          {allActions.length} ejecutadas
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {allActions.length === 0 && (
          <div className="text-center pt-10">
            <div className="text-2xl mb-2" style={{ opacity: 0.2 }}>◎</div>
            <p className="text-[10px]" style={{ color: C.muted }}>Sin acciones aún</p>
          </div>
        )}
        {[...allActions].reverse().map((a, i) => {
          const meta = TOOL_META[a.name] ?? { label: a.name, icon: "⚙", color: C.muted };
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2.5 rounded-xl"
              style={{
                background: C.surface,
                border: `1px solid rgba(255,255,255,0.05)`,
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px]" style={{ color: meta.color }}>{meta.icon}</span>
                <span className="text-[10px] font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                {a.result.success
                  ? <span className="ml-auto text-[9px]" style={{ color: C.emerald }}>✓</span>
                  : <span className="ml-auto text-[9px]" style={{ color: C.red }}>✗</span>}
              </div>
              <p className="text-[10px] line-clamp-2" style={{ color: C.muted }}>{a.result.message}</p>
              <p className="text-[9px] mt-1 font-mono" style={{ color: `${C.muted}80` }}>
                {new Date(a.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SystemPromptPanel ────────────────────────────────────────────────────────
function SystemPromptPanel() {
  const [open, setOpen] = useState(false);
  const prompt = buildSystemPrompt();

  return (
    <div style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold transition-colors"
        style={{ color: C.muted }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.text; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.muted; }}
      >
        <span className="flex items-center gap-2">
          <span style={{ color: C.purple }}>◈</span>
          <span className="tracking-wider uppercase" style={{ fontSize: 10 }}>System Prompt</span>
        </span>
        <span style={{ fontSize: 9, fontFamily: "monospace" }}>{open ? "▲" : "▼"}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <pre
              className="px-4 pb-3 text-[10px] leading-relaxed overflow-x-auto"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "#8A8A97",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {prompt}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Commander Component ─────────────────────────────────────────────────
export default function Commander() {
  const { settings } = useAstraeo();
  const [messages, setMessages] = useState<CmdMessage[]>([
    {
      id: "welcome",
      role: "system",
      content: "**Comandante ASTRAEO activo.** Dime qué construir — agentes, misiones, memorias, workflows. Tengo control total del sistema.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Auto-grow textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const suggestions = [
    "Crea un agente llamado ZEUS especializado en ventas B2B con modelo Opus",
    "Nueva misión crítica: preparar demo para cliente enterprise esta semana",
    "Guarda en memoria: los clientes enterprise prefieren demos los jueves",
    "Crea un workflow de seguimiento post-demo con LYRA y ORION",
    "Lista todos los agentes y misiones activas del sistema",
    "Actualiza el system prompt de ORION para incluir análisis de competencia",
  ];

  const clearHistory = () => {
    setMessages([{
      id: nanoid(),
      role: "system",
      content: "**Historial limpiado.** Sesión reiniciada.",
      timestamp: new Date().toISOString(),
    }]);
    setShowSuggestions(true);
  };

  const sendToCommander = async (userText: string) => {
    if (!userText.trim() || loading) return;

    const apiKey = settings.claudeApiKey;
    if (!apiKey) {
      setMessages((m) => [...m, {
        id: nanoid(), role: "system",
        content: "⚠️ **API Key requerida.** Ve a **Ajustes** y configura tu Claude API Key para activar el Comandante.",
        timestamp: new Date().toISOString(),
      }]);
      return;
    }

    const userMsg: CmdMessage = { id: nanoid(), role: "user", content: userText, timestamp: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setShowSuggestions(false);
    setLoading(true);

    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    history.push({ role: "user", content: userText });

    try {
      let continueLoop = true;
      let iterMessages = [...history];
      const toolCallsAccum: CmdMessage["toolCalls"] = [];

      while (continueLoop) {
        const res = await fetch("/api/commander", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: iterMessages,
            systemPrompt: buildSystemPrompt(),
            tools: COMMANDER_TOOLS,
            model: settings.claudeModel,
            apiKey,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
          throw new Error(errData.error ?? `Error del servidor ${res.status}`);
        }

        const data = await res.json() as {
          stop_reason: string;
          content: Array<{ type: string; id?: string; name?: string; input?: Record<string, unknown>; text?: string }>;
        };

        if (data.stop_reason === "tool_use") {
          const toolUseBlocks = data.content.filter((b) => b.type === "tool_use");
          const toolResults: Array<{ type: string; tool_use_id: string; content: string }> = [];

          for (const block of toolUseBlocks) {
            const result = executeTool(block.name ?? "", block.input ?? {});
            toolCallsAccum?.push({ name: block.name ?? "", input: block.input ?? {}, result });
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id ?? "",
              content: JSON.stringify({ success: result.success, message: result.message, data: result.data }),
            });
          }

          iterMessages = [
            ...iterMessages,
            { role: "assistant", content: data.content },
            { role: "user", content: toolResults },
          ] as typeof iterMessages;
        } else {
          const textBlock = data.content?.find((b) => b.type === "text");
          const responseText = textBlock?.text ?? "Listo.";
          setMessages((m) => [...m, {
            id: nanoid(),
            role: "assistant",
            content: responseText,
            toolCalls: toolCallsAccum,
            timestamp: new Date().toISOString(),
          }]);
          continueLoop = false;
        }
      }
    } catch (err) {
      setMessages((m) => [...m, {
        id: nanoid(),
        role: "system",
        content: `Error: ${err instanceof Error ? err.message : "Error desconocido"}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendToCommander(input); }
  };

  const modelBadge = settings.claudeModel.includes("opus") ? "Opus" : settings.claudeModel.includes("haiku") ? "Haiku" : "Sonnet";

  return (
    <div className="flex h-full overflow-hidden" style={{ background: C.bg }}>
      {/* Scan-line texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
          backgroundSize: "100% 4px",
        }}
      />

      {/* ── Left: chat column ── */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <div
          className="px-5 py-3 flex items-center gap-4 flex-shrink-0"
          style={{ borderBottom: `1px solid rgba(255,255,255,0.06)`, background: "rgba(5,8,16,0.9)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "rgba(0,212,255,0.08)",
                border: `1px solid rgba(0,212,255,0.2)`,
                boxShadow: `0 0 16px rgba(0,212,255,0.12)`,
              }}
            >
              <span style={{ fontSize: 16 }}>🌟</span>
            </div>
            <div>
              <h2 className="text-[13px] font-bold tracking-widest uppercase" style={{ color: C.text, letterSpacing: "0.12em" }}>
                Commander
              </h2>
              <p className="text-[9px] font-mono" style={{ color: C.muted }}>
                Control total del sistema
              </p>
            </div>
          </div>

          {/* Model badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold font-mono"
            style={{
              background: "rgba(123,97,255,0.1)",
              border: `1px solid rgba(123,97,255,0.25)`,
              color: C.purple,
            }}
          >
            ◈ {modelBadge}
          </div>

          {/* Status dot */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
            style={{
              background: settings.claudeApiKey ? "rgba(0,229,160,0.08)" : "rgba(255,71,87,0.08)",
              border: `1px solid ${settings.claudeApiKey ? "rgba(0,229,160,0.25)" : "rgba(255,71,87,0.25)"}`,
              color: settings.claudeApiKey ? C.emerald : C.red,
            }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: settings.claudeApiKey ? C.emerald : C.red }}
              animate={settings.claudeApiKey ? { opacity: [1, 0.4, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {settings.claudeApiKey ? "Activo" : "Sin API Key"}
          </div>

          <div className="flex-1" />

          {/* Clear button */}
          <button
            onClick={clearHistory}
            className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{
              color: C.muted,
              border: `1px solid rgba(255,255,255,0.06)`,
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = C.text;
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = C.muted;
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.06)";
            }}
          >
            ✕ Limpiar
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg) => (
            <MessageRow key={msg.id} msg={msg} />
          ))}

          {/* Suggestions */}
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="space-y-2.5 pt-2"
              >
                <p className="text-[9px] tracking-widest uppercase font-bold font-mono" style={{ color: C.muted }}>
                  Sugerencias de comandos
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendToCommander(s)}
                      className="text-left text-[12px] px-3.5 py-2.5 rounded-xl transition-all"
                      style={{
                        background: C.surface,
                        border: `1px solid rgba(255,255,255,0.06)`,
                        color: C.muted,
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.borderColor = `rgba(0,212,255,0.25)`;
                        el.style.color = C.text;
                        el.style.background = "rgba(0,212,255,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.borderColor = "rgba(255,255,255,0.06)";
                        el.style.color = C.muted;
                        el.style.background = C.surface;
                      }}
                    >
                      <span className="font-mono text-[9px]" style={{ color: C.cyan, marginRight: 6 }}>›</span>
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loading && <ThinkingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* System prompt collapsible */}
        <SystemPromptPanel />

        {/* Input bar */}
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{
            borderTop: `1px solid rgba(255,255,255,0.06)`,
            background: "rgba(5,8,16,0.95)",
          }}
        >
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Dime qué construir... (agentes, misiones, workflows, memorias)"
              rows={1}
              className="flex-1 resize-none text-[13px] leading-relaxed outline-none transition-all"
              style={{
                background: C.surface,
                border: `1px solid rgba(255,255,255,0.08)`,
                borderRadius: 12,
                padding: "10px 14px",
                color: C.text,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                minHeight: 42,
                maxHeight: 120,
                caretColor: C.cyan,
              }}
              onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = `rgba(0,212,255,0.3)`; }}
              onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
            />
            <button
              onClick={() => sendToCommander(input)}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 flex items-center justify-center transition-all"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: input.trim() && !loading ? `linear-gradient(135deg, ${C.purple}, ${C.cyan})` : C.surface,
                border: `1px solid ${input.trim() && !loading ? "transparent" : "rgba(255,255,255,0.08)"}`,
                color: input.trim() && !loading ? "#fff" : C.muted,
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                fontSize: 14,
              }}
            >
              {loading ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  style={{ display: "block" }}
                >◌</motion.span>
              ) : "▶"}
            </button>
          </div>
          <p className="text-[9px] mt-1.5 ml-1 font-mono" style={{ color: `${C.muted}80` }}>
            Enter para enviar · Shift+Enter nueva línea
          </p>
        </div>
      </div>

      {/* ── Right: action log ── */}
      <div className="relative z-10">
        <ActionLog messages={messages} />
      </div>
    </div>
  );
}
