"use client";
import { useState, useRef, useEffect } from "react";
import { useAstraeo } from "@/store/astraeo";
import { nanoid } from "nanoid";
import type { AgentStatus, MissionPriority, MissionStatus, MemoryType } from "@/lib/types";

// ─── Tool definitions for Claude ─────────────────────────────────────────────
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
        color: { type: "string", description: "Color hex del agente, ej. #00D4FF" },
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
      const colors = ["#00D4FF", "#7B61FF", "#FF6B9D", "#00E5A0", "#FFB800"];
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
        color: { trigger: "#00E5A0", agent: "#00D4FF", condition: "#FFB800", action: "#7B61FF", output: "#FF6B9D" }[step.type] ?? "#6B7A99",
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
      let data: unknown;
      if (r === "agents" || r === "all") data = s.agents.map((a) => ({ id: a.id, name: a.name, role: a.role, status: a.status }));
      if (r === "missions" || r === "all") data = { ...(data as object ?? {}), missions: s.missions.map((m) => ({ id: m.id, title: m.title, status: m.status, priority: m.priority })) };
      if (r === "memory" || r === "all") data = { ...(data as object ?? {}), memory: s.memory.map((m) => ({ id: m.id, title: m.title, type: m.type })) };
      if (r === "workflows" || r === "all") data = { ...(data as object ?? {}), workflows: s.workflows.map((w) => ({ id: w.id, name: w.name, active: w.active })) };
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

// ─── Markdown renderer simple ───────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code style="background:rgba(0,212,255,0.1);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:11px">$1</code>')
    .replace(/^- (.+)$/gm, "• $1")
    .replace(/\n/g, "<br/>");
}

// ─── Component ───────────────────────────────────────────────────────────────
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

  const suggestions = [
    "Crea un agente llamado ZEUS especializado en ventas B2B con modelo Opus",
    "Nueva misión crítica: preparar demo para cliente enterprise esta semana",
    "Guarda en memoria: los clientes enterprise prefieren demos los jueves",
    "Crea un workflow de seguimiento post-demo con LYRA y ORION",
    "Lista todos los agentes y misiones activas del sistema",
    "Actualiza el sistema prompt de ORION para incluir análisis de competencia",
  ];

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

    // Build message history for API (last 10 exchanges)
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
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: settings.claudeModel,
            max_tokens: 2048,
            system: buildSystemPrompt(),
            tools: COMMANDER_TOOLS,
            messages: iterMessages,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`API ${res.status}: ${err}`);
        }

        const data = await res.json();

        if (data.stop_reason === "tool_use") {
          // Execute all tool calls
          const toolUseBlocks = data.content.filter((b: { type: string }) => b.type === "tool_use");
          const toolResults: Array<{ type: string; tool_use_id: string; content: string }> = [];

          for (const block of toolUseBlocks) {
            const result = executeTool(block.name, block.input as Record<string, unknown>);
            toolCallsAccum?.push({ name: block.name, input: block.input as Record<string, unknown>, result });
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify({ success: result.success, message: result.message, data: result.data }),
            });
          }

          // Add assistant message + tool results to context
          iterMessages = [
            ...iterMessages,
            { role: "assistant", content: data.content },
            { role: "user", content: toolResults },
          ] as typeof iterMessages;

        } else {
          // Final response
          const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
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

  return (
    <div className="flex h-full animate-fade-in overflow-hidden">
      {/* Left: chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1A2744]/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)" }}>
              🌟
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-[#E8ECF4] tracking-wide">Comandante ASTRAEO</h2>
              <p className="text-[10px] text-[#6B7A99] font-mono">Control total del sistema · Claude {settings.claudeModel.split("-")[1]}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border ${
            settings.claudeApiKey
              ? "bg-[#00E5A0]/08 border-[#00E5A0]/25 text-[#00E5A0]"
              : "bg-[#FF4757]/08 border-[#FF4757]/25 text-[#FF4757]"
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${settings.claudeApiKey ? "bg-[#00E5A0] animate-pulse" : "bg-[#FF4757]"}`} />
            {settings.claudeApiKey ? "Activo" : "Sin API Key"}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => (
            <MessageRow key={msg.id} msg={msg} />
          ))}

          {/* Suggestions */}
          {showSuggestions && (
            <div className="space-y-2 animate-fade-in">
              <p className="text-[11px] text-[#6B7A99] tracking-widest uppercase font-semibold">Sugerencias</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendToCommander(s)}
                    className="text-left text-[12px] p-3 rounded-xl transition-all group"
                    style={{ background: "rgba(10,15,31,0.6)", border: "1px solid #1A2744" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,212,255,0.2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1A2744"; }}
                  >
                    <span className="text-[#6B7A99] group-hover:text-[#E8ECF4] transition-colors">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)" }}>
                🌟
              </div>
              <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3 border border-[#1A2744]/60">
                <div className="flex gap-1.5 items-center h-4">
                  {[0, 0.16, 0.32].map((d, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]"
                      style={{ animation: `bounceTyping 1.4s infinite ease-in-out both`, animationDelay: `-${d}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#1A2744]/60 flex-shrink-0">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Dime qué construir... (agentes, misiones, workflows, memorias)"
              rows={1}
              className="astraeo-input flex-1 resize-none"
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={() => sendToCommander(input)}
              disabled={!input.trim() || loading}
              className="btn-primary px-4 py-2.5 flex-shrink-0 disabled:opacity-40"
            >
              ▶
            </button>
          </div>
          <p className="text-[10px] text-[#6B7A99] mt-1.5 ml-1">Enter para enviar · Shift+Enter nueva línea</p>
        </div>
      </div>

      {/* Right: action log */}
      <ActionLog messages={messages} />
    </div>
  );
}

// ─── Message Row ─────────────────────────────────────────────────────────────
function MessageRow({ msg }: { msg: CmdMessage }) {
  if (msg.role === "system") {
    return (
      <div className="glass-card rounded-xl p-3.5 border border-[#1A2744]/40">
        <div className="text-[12px] text-[#E8ECF4] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
      </div>
    );
  }

  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[72%] px-4 py-3 rounded-2xl rounded-br-sm text-[13px] leading-relaxed text-white"
          style={{ background: "linear-gradient(135deg, #7B61FF, #00D4FF)" }}>
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1"
        style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)" }}>
        🌟
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {/* Tool calls */}
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="space-y-1.5">
            {msg.toolCalls.map((tc, i) => (
              <ToolCallBadge key={i} name={tc.name} result={tc.result} />
            ))}
          </div>
        )}
        {/* Text response */}
        <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3 border border-[#1A2744]/60 text-[13px] leading-relaxed text-[#E8ECF4]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
        <p className="text-[9px] text-[#6B7A99] ml-1 font-mono">
          {new Date(msg.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

const TOOL_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  create_agent: { label: "Agente creado", icon: "◉", color: "#00D4FF" },
  create_mission: { label: "Misión creada", icon: "◆", color: "#FFB800" },
  create_memory: { label: "Memoria guardada", icon: "◍", color: "#7B61FF" },
  create_workflow: { label: "Workflow creado", icon: "◫", color: "#FF6B9D" },
  update_agent: { label: "Agente actualizado", icon: "✎", color: "#00E5A0" },
  update_mission: { label: "Misión actualizada", icon: "✎", color: "#FFB800" },
  delete_mission: { label: "Misión eliminada", icon: "✕", color: "#FF4757" },
  list_resources: { label: "Recursos consultados", icon: "◷", color: "#6B7A99" },
};

function ToolCallBadge({ name, result }: { name: string; result: ToolResult }) {
  const cfg = TOOL_LABELS[name] ?? { label: name, icon: "⚙", color: "#6B7A99" };
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
      style={{
        background: result.success ? `${cfg.color}10` : "rgba(255,71,87,0.1)",
        border: `1px solid ${result.success ? cfg.color + "25" : "rgba(255,71,87,0.25)"}`,
        color: result.success ? cfg.color : "#FF4757",
      }}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
      <span className="ml-auto opacity-60">
        {result.success ? "✓" : "✗"}
      </span>
    </div>
  );
}

// ─── Action Log (right panel) ─────────────────────────────────────────────────
function ActionLog({ messages }: { messages: CmdMessage[] }) {
  const allActions = messages.flatMap((m) =>
    (m.toolCalls ?? []).map((tc) => ({ ...tc, timestamp: m.timestamp }))
  );

  return (
    <div className="w-64 border-l border-[#1A2744]/60 flex flex-col flex-shrink-0">
      <div className="px-4 py-4 border-b border-[#1A2744]/60 flex-shrink-0">
        <h3 className="text-[11px] font-semibold text-[#E8ECF4] tracking-widest uppercase">Log de Acciones</h3>
        <p className="text-[10px] text-[#6B7A99] mt-0.5">{allActions.length} acciones ejecutadas</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {allActions.length === 0 && (
          <div className="text-center pt-8 opacity-30">
            <p className="text-[11px] text-[#6B7A99]">Sin acciones aún</p>
          </div>
        )}
        {[...allActions].reverse().map((a, i) => {
          const cfg = TOOL_LABELS[a.name] ?? { label: a.name, icon: "⚙", color: "#6B7A99" };
          return (
            <div key={i} className="p-2.5 rounded-xl glass-card border border-[#1A2744]/40">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px]" style={{ color: cfg.color }}>{cfg.icon}</span>
                <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                {a.result.success
                  ? <span className="ml-auto text-[#00E5A0] text-[9px]">✓</span>
                  : <span className="ml-auto text-[#FF4757] text-[9px]">✗</span>}
              </div>
              <p className="text-[10px] text-[#6B7A99] line-clamp-2">{a.result.message}</p>
              <p className="text-[9px] text-[#6B7A99]/50 mt-1 font-mono">
                {new Date(a.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
