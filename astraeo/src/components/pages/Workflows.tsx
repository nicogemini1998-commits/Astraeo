"use client";

import { useReducer, useRef, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { nanoid } from "nanoid";
import { useAstraeo } from "@/store/astraeo";
import type { Workflow, WorkflowNode, WorkflowEdge, Agent, AppSettings } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_W = 160;
const NODE_H = 64;
const PORT_R = 6;

const NODE_STYLES: Record<WorkflowNode["type"], { color: string; bg: string; icon: string; label: string }> = {
  trigger:   { color: "#00E5A0", bg: "rgba(0,229,160,0.08)",   icon: "⚡", label: "Trigger" },
  agent:     { color: "#00D4FF", bg: "rgba(0,212,255,0.08)",   icon: "◉",  label: "Agente" },
  condition: { color: "#FFB800", bg: "rgba(255,184,0,0.08)",   icon: "◇",  label: "Condición" },
  action:    { color: "#7B61FF", bg: "rgba(123,97,255,0.08)",  icon: "▶",  label: "Acción" },
  output:    { color: "#FF6B9D", bg: "rgba(255,107,157,0.08)", icon: "◎",  label: "Salida" },
};

// ─── Canvas Types ──────────────────────────────────────────────────────────────

interface CanvasState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedId: string | null;
  dragging: { nodeId: string; offsetX: number; offsetY: number } | null;
  connecting: { fromNodeId: string; mouseX: number; mouseY: number } | null;
  pan: { x: number; y: number };
  zoom: number;
  isPanning: boolean;
  panStart: { mouseX: number; mouseY: number; panX: number; panY: number } | null;
}

type CanvasAction =
  | { type: "MOVE_NODE"; nodeId: string; x: number; y: number }
  | { type: "SELECT"; id: string | null }
  | { type: "START_CONNECT"; fromNodeId: string; mouseX: number; mouseY: number }
  | { type: "UPDATE_CONNECT_POS"; mouseX: number; mouseY: number }
  | { type: "FINISH_CONNECT"; toNodeId: string }
  | { type: "CANCEL_CONNECT" }
  | { type: "SET_PAN"; x: number; y: number }
  | { type: "START_PAN"; mouseX: number; mouseY: number }
  | { type: "END_PAN" }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "START_DRAG"; nodeId: string; offsetX: number; offsetY: number }
  | { type: "END_DRAG" }
  | { type: "ADD_NODE"; node: WorkflowNode }
  | { type: "ADD_EDGE"; edge: WorkflowEdge }
  | { type: "DELETE_SELECTED" }
  | { type: "UPDATE_NODE"; nodeId: string; patch: Partial<WorkflowNode> }
  | { type: "LOAD"; nodes: WorkflowNode[]; edges: WorkflowEdge[] };

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case "LOAD":
      return { ...state, nodes: action.nodes, edges: action.edges, selectedId: null };
    case "MOVE_NODE":
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, x: action.x, y: action.y } : n
        ),
      };
    case "SELECT":
      return { ...state, selectedId: action.id };
    case "START_DRAG":
      return { ...state, dragging: { nodeId: action.nodeId, offsetX: action.offsetX, offsetY: action.offsetY } };
    case "END_DRAG":
      return { ...state, dragging: null };
    case "START_CONNECT":
      return { ...state, connecting: { fromNodeId: action.fromNodeId, mouseX: action.mouseX, mouseY: action.mouseY } };
    case "UPDATE_CONNECT_POS":
      if (!state.connecting) return state;
      return { ...state, connecting: { ...state.connecting, mouseX: action.mouseX, mouseY: action.mouseY } };
    case "FINISH_CONNECT": {
      if (!state.connecting) return state;
      const { fromNodeId } = state.connecting;
      const toNodeId = action.toNodeId;
      if (fromNodeId === toNodeId) return { ...state, connecting: null };
      const alreadyExists = state.edges.some(
        (e) => e.from === fromNodeId && e.to === toNodeId
      );
      if (alreadyExists) return { ...state, connecting: null };
      const newEdge: WorkflowEdge = { id: `e-${nanoid(6)}`, from: fromNodeId, to: toNodeId };
      return { ...state, connecting: null, edges: [...state.edges, newEdge] };
    }
    case "CANCEL_CONNECT":
      return { ...state, connecting: null };
    case "START_PAN":
      return {
        ...state,
        isPanning: true,
        panStart: { mouseX: action.mouseX, mouseY: action.mouseY, panX: state.pan.x, panY: state.pan.y },
      };
    case "SET_PAN":
      return { ...state, pan: { x: action.x, y: action.y } };
    case "END_PAN":
      return { ...state, isPanning: false, panStart: null };
    case "SET_ZOOM":
      return { ...state, zoom: Math.min(2.0, Math.max(0.4, action.zoom)) };
    case "ADD_NODE":
      return { ...state, nodes: [...state.nodes, action.node] };
    case "ADD_EDGE":
      return { ...state, edges: [...state.edges, action.edge] };
    case "DELETE_SELECTED": {
      if (!state.selectedId) return state;
      const isNode = state.nodes.some((n) => n.id === state.selectedId);
      if (isNode) {
        return {
          ...state,
          nodes: state.nodes.filter((n) => n.id !== state.selectedId),
          edges: state.edges.filter(
            (e) => e.from !== state.selectedId && e.to !== state.selectedId
          ),
          selectedId: null,
        };
      }
      return {
        ...state,
        edges: state.edges.filter((e) => e.id !== state.selectedId),
        selectedId: null,
      };
    }
    case "UPDATE_NODE":
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, ...action.patch } : n
        ),
      };
    default:
      return state;
  }
}

// ─── Execution Types ───────────────────────────────────────────────────────────

type NodeExecState = "pending" | "running" | "done" | "error" | "skipped";

interface NodeExecResult {
  nodeId: string;
  state: NodeExecState;
  output: string;
  elapsed?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOutputPortPos(node: WorkflowNode) {
  return { x: node.x + NODE_W, y: node.y + NODE_H / 2 };
}

function getInputPortPos(node: WorkflowNode) {
  return { x: node.x, y: node.y + NODE_H / 2 };
}

function getEdgePath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = Math.abs(to.x - from.x);
  const cp1x = from.x + Math.max(dx * 0.6, 60);
  const cp2x = to.x - Math.max(dx * 0.6, 60);
  return `M ${from.x} ${from.y} C ${cp1x} ${from.y} ${cp2x} ${to.y} ${to.x} ${to.y}`;
}

function evaluateCondition(expression: string, prevOutput: string): boolean {
  if (!expression) return true;
  try {
    // Safe-ish eval using Function constructor with sandboxed output
    const fn = new Function("output", `"use strict"; return !!(${expression});`);
    return fn(prevOutput) as boolean;
  } catch {
    return true;
  }
}

// ─── Execution Engine ──────────────────────────────────────────────────────────

async function executeWorkflow(
  workflow: Workflow,
  triggerInput: string,
  agents: Agent[],
  settings: AppSettings,
  onNodeStateChange: (nodeId: string, execState: NodeExecState) => void,
  onNodeOutput: (nodeId: string, output: string) => void
): Promise<{ success: boolean; finalOutput: string; results: NodeExecResult[] }> {
  const context: Record<string, string> = {};
  const results: NodeExecResult[] = workflow.nodes.map((n) => ({
    nodeId: n.id,
    state: "pending",
    output: "",
  }));

  // Topological sort (simple BFS from trigger)
  const triggerNode = workflow.nodes.find((n) => n.type === "trigger");
  if (!triggerNode) {
    return { success: false, finalOutput: "No se encontró nodo trigger.", results };
  }

  const adjacency: Record<string, string[]> = {};
  for (const node of workflow.nodes) adjacency[node.id] = [];
  for (const edge of workflow.edges) {
    if (adjacency[edge.from]) adjacency[edge.from].push(edge.to);
  }

  const visited = new Set<string>();
  const queue: string[] = [triggerNode.id];
  const ordered: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    ordered.push(current);
    const neighbors = adjacency[current] ?? [];
    queue.push(...neighbors);
  }

  let finalOutput = "";

  for (const nodeId of ordered) {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    onNodeStateChange(nodeId, "running");
    const startTime = Date.now();

    try {
      let output = "";

      if (node.type === "trigger") {
        output = triggerInput;
        context[nodeId] = output;

      } else if (node.type === "agent") {
        const agentId = node.config.agentId as string | undefined;
        const agent = agents.find((a) => a.id === agentId) ?? agents[0];

        if (!settings.claudeApiKey) {
          output = `[Sin API Key] Nodo: ${node.label}. Agente: ${agent?.name ?? "desconocido"}.`;
        } else {
          // Build context string from upstream outputs
          const prevOutputs = Object.entries(context)
            .map(([id, out]) => {
              const n = workflow.nodes.find((nd) => nd.id === id);
              return `[${n?.label ?? id}]: ${out}`;
            })
            .join("\n");

          const messages = [
            {
              role: "user" as const,
              content: `Contexto de nodos anteriores:\n${prevOutputs}\n\nTarea: ${(node.config.prompt as string) || node.label}`,
            },
          ];

          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages,
              systemPrompt:
                (agent?.systemPrompt ?? "Eres un asistente útil.") +
                "\n\nEres parte de un workflow automatizado. Responde de forma concisa y estructurada.",
              model: agent?.model ?? settings.claudeModel,
              apiKey: settings.claudeApiKey,
            }),
          });

          if (!res.ok) throw new Error(`API Error ${res.status}`);

          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let accumulated = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const data = JSON.parse(line.slice(6)) as
                  | { type: "text"; delta: string }
                  | { type: "done"; tokens: number }
                  | { type: "error"; message: string };
                if (data.type === "text") {
                  accumulated += data.delta;
                  onNodeOutput(nodeId, accumulated);
                } else if (data.type === "error") {
                  throw new Error(data.message);
                }
              } catch {
                // skip malformed SSE lines
              }
            }
          }
          output = accumulated;
        }
        context[nodeId] = output;

      } else if (node.type === "condition") {
        const incomingEdge = workflow.edges.find((e) => e.to === nodeId);
        const prevOutput = incomingEdge ? (context[incomingEdge.from] ?? "") : "";
        const expression = (node.config.expression as string) || "";
        const passed = evaluateCondition(expression, prevOutput);
        output = passed ? `✓ Condición cumplida` : `✗ Condición no cumplida`;
        context[nodeId] = prevOutput; // pass through

        if (!passed) {
          // Mark downstream nodes as skipped
          const downstream = adjacency[nodeId] ?? [];
          for (const dId of downstream) {
            onNodeStateChange(dId, "skipped");
          }
        }

      } else if (node.type === "action") {
        const actionType = node.config.actionType as string | undefined;
        output = `Acción ejecutada: ${actionType ?? node.label}`;
        context[nodeId] = context[Object.keys(context).at(-1) ?? ""] ?? "";

      } else if (node.type === "output") {
        const incomingEdge = workflow.edges.find((e) => e.to === nodeId);
        const prevOutput = incomingEdge ? (context[incomingEdge.from] ?? "") : "";
        output = prevOutput;
        finalOutput = output;
        context[nodeId] = output;
      }

      const elapsed = Date.now() - startTime;
      onNodeOutput(nodeId, output);
      onNodeStateChange(nodeId, "done");
      results[results.findIndex((r) => r.nodeId === nodeId)] = {
        nodeId,
        state: "done",
        output,
        elapsed,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      onNodeOutput(nodeId, `Error: ${msg}`);
      onNodeStateChange(nodeId, "error");
      results[results.findIndex((r) => r.nodeId === nodeId)] = {
        nodeId,
        state: "error",
        output: `Error: ${msg}`,
      };
    }
  }

  return { success: true, finalOutput, results };
}

// ─── Run Modal ─────────────────────────────────────────────────────────────────

interface RunModalProps {
  workflow: Workflow;
  agents: Agent[];
  settings: AppSettings;
  onClose: () => void;
  onComplete: () => void;
}

function RunModal({ workflow, agents, settings, onClose, onComplete }: RunModalProps) {
  const [phase, setPhase] = useState<"input" | "running" | "done">("input");
  const [triggerInput, setTriggerInput] = useState("");
  const [nodeStates, setNodeStates] = useState<Record<string, NodeExecState>>({});
  const [nodeOutputs, setNodeOutputs] = useState<Record<string, string>>({});
  const [nodeElapsed, setNodeElapsed] = useState<Record<string, number>>({});
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [finalOutput, setFinalOutput] = useState("");
  const startTimeRef = useRef<number>(0);
  const [totalTime, setTotalTime] = useState(0);
  const { runWorkflow } = useAstraeo();

  const handleStart = async () => {
    setPhase("running");
    startTimeRef.current = Date.now();
    const initialStates: Record<string, NodeExecState> = {};
    for (const n of workflow.nodes) initialStates[n.id] = "pending";
    setNodeStates(initialStates);

    const result = await executeWorkflow(
      workflow,
      triggerInput,
      agents,
      settings,
      (nodeId, execState) => {
        setNodeStates((prev) => ({ ...prev, [nodeId]: execState }));
        if (execState === "done") {
          setNodeElapsed((prev) => ({
            ...prev,
            [nodeId]: Date.now() - startTimeRef.current,
          }));
        }
      },
      (nodeId, output) => {
        setNodeOutputs((prev) => ({ ...prev, [nodeId]: output }));
      }
    );

    setTotalTime(Date.now() - startTimeRef.current);
    setFinalOutput(result.finalOutput);
    setPhase("done");
    runWorkflow(workflow.id);
    onComplete();
  };

  const stateIcon: Record<NodeExecState, string> = {
    pending: "⏱",
    running: "◌",
    done: "✓",
    error: "✕",
    skipped: "⊘",
  };
  const stateColor: Record<NodeExecState, string> = {
    pending: "#6B7A99",
    running: "#00D4FF",
    done: "#00E5A0",
    error: "#FF4757",
    skipped: "#1A2744",
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(5,8,16,0.85)", backdropFilter: "blur(8px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="glass-strong rounded-2xl border border-[#1A2744]/80 w-full max-w-xl mx-4 flex flex-col"
        style={{ maxHeight: "85vh" }}
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1A2744]/60 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-[14px] font-bold text-[#E8ECF4]">Ejecutar Workflow</h3>
            <p className="text-[11px] text-[#6B7A99]">{workflow.name}</p>
          </div>
          <button onClick={onClose} className="text-[#6B7A99] hover:text-[#E8ECF4] transition-colors text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Input phase */}
          {phase === "input" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-[#6B7A99] uppercase tracking-wider block mb-2">
                  Input del Trigger
                </label>
                <textarea
                  className="astraeo-input resize-none"
                  rows={4}
                  placeholder="Describe el input inicial para este workflow..."
                  value={triggerInput}
                  onChange={(e) => setTriggerInput(e.target.value)}
                />
              </div>
              {!settings.claudeApiKey && (
                <div
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{ background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.2)" }}
                >
                  <span className="text-[#FFB800] mt-0.5">⚠</span>
                  <p className="text-[11px] text-[#FFB800]">
                    Sin Claude API Key. Los nodos de agente usarán respuestas simuladas. Configura en Ajustes.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Running / done phase */}
          {(phase === "running" || phase === "done") && (
            <div className="space-y-2">
              {workflow.nodes.map((node) => {
                const execState = nodeStates[node.id] ?? "pending";
                const output = nodeOutputs[node.id] ?? "";
                const elapsed = nodeElapsed[node.id];
                const isExpanded = expandedNodes.has(node.id);
                const cfg = NODE_STYLES[node.type];

                return (
                  <motion.div
                    key={node.id}
                    className="rounded-xl overflow-hidden"
                    style={{
                      border: `1px solid ${execState === "running" ? cfg.color + "60" : "#1A2744"}`,
                      background: execState === "running" ? cfg.bg : "rgba(10,15,31,0.6)",
                    }}
                    animate={execState === "running" ? { boxShadow: [`0 0 0px ${cfg.color}00`, `0 0 12px ${cfg.color}30`, `0 0 0px ${cfg.color}00`] } : {}}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                  >
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      onClick={() => {
                        if (!output) return;
                        setExpandedNodes((prev) => {
                          const next = new Set(prev);
                          if (next.has(node.id)) next.delete(node.id);
                          else next.add(node.id);
                          return next;
                        });
                      }}
                    >
                      <span
                        className="text-[14px] w-5 flex-shrink-0"
                        style={{
                          color: stateColor[execState],
                          animation: execState === "running" ? "spin 1.2s linear infinite" : "none",
                        }}
                      >
                        {stateIcon[execState]}
                      </span>
                      <span className="text-[12px] font-semibold text-[#E8ECF4] flex-1">{node.label}</span>
                      <span className="text-[10px] font-mono" style={{ color: cfg.color }}>{cfg.label}</span>
                      {elapsed !== undefined && (
                        <span className="text-[10px] font-mono text-[#6B7A99]">{(elapsed / 1000).toFixed(1)}s</span>
                      )}
                      {output && (
                        <span className="text-[10px] text-[#6B7A99]">{isExpanded ? "▲" : "▼"}</span>
                      )}
                    </button>
                    <AnimatePresence>
                      {isExpanded && output && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 border-t border-[#1A2744]/40 pt-3">
                            <p className="text-[11px] text-[#6B7A99] font-mono whitespace-pre-wrap leading-relaxed">
                              {output.slice(0, 600)}{output.length > 600 ? "…" : ""}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Final output */}
          {phase === "done" && finalOutput && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-4 space-y-2"
              style={{ background: "rgba(0,229,160,0.06)", border: "1px solid rgba(0,229,160,0.2)" }}
            >
              <p className="text-[11px] font-semibold text-[#00E5A0] uppercase tracking-wider">
                ✓ Resultado Final · {(totalTime / 1000).toFixed(1)}s
              </p>
              <p className="text-[12px] text-[#E8ECF4] leading-relaxed whitespace-pre-wrap">
                {finalOutput.slice(0, 800)}
              </p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1A2744]/60 flex justify-end gap-3 flex-shrink-0">
          {phase === "input" && (
            <>
              <button onClick={onClose} className="btn-ghost text-[12px]">Cancelar</button>
              <button onClick={handleStart} className="btn-primary text-[12px]">
                ▶ Iniciar Ejecución
              </button>
            </>
          )}
          {phase === "running" && (
            <span className="text-[11px] text-[#6B7A99] font-mono flex items-center gap-2">
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span>
              Ejecutando…
            </span>
          )}
          {phase === "done" && (
            <button onClick={onClose} className="btn-primary text-[12px]">Cerrar</button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Node Inspector ────────────────────────────────────────────────────────────

interface InspectorProps {
  nodeId: string;
  nodes: WorkflowNode[];
  agents: Agent[];
  dispatch: React.Dispatch<CanvasAction>;
  onDelete: () => void;
}

function NodeInspector({ nodeId, nodes, agents, dispatch, onDelete }: InspectorProps) {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const cfg = NODE_STYLES[node.type];

  const update = (patch: Partial<WorkflowNode>) =>
    dispatch({ type: "UPDATE_NODE", nodeId, patch });

  const updateConfig = (key: string, value: unknown) =>
    update({ config: { ...node.config, [key]: value } });

  return (
    <div className="w-60 flex-shrink-0 border-l border-[#1A2744]/60 flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-[#1A2744]/60 flex-shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span style={{ color: cfg.color }}>{cfg.icon}</span>
          <p className="text-[11px] font-bold text-[#E8ECF4] uppercase tracking-wider">Inspector</p>
        </div>
        <p className="text-[10px] text-[#6B7A99]" style={{ color: cfg.color + "aa" }}>{cfg.label}</p>
      </div>

      <div className="p-4 space-y-4 flex-1">
        <div>
          <label className="text-[10px] text-[#6B7A99] uppercase tracking-wider font-semibold block mb-1.5">
            Nombre
          </label>
          <input
            className="astraeo-input text-[12px]"
            value={node.label}
            onChange={(e) => update({ label: e.target.value })}
          />
        </div>

        {node.type === "agent" && (
          <div>
            <label className="text-[10px] text-[#6B7A99] uppercase tracking-wider font-semibold block mb-1.5">
              Agente asignado
            </label>
            <select
              className="astraeo-input text-[12px]"
              value={(node.config.agentId as string) ?? ""}
              onChange={(e) => updateConfig("agentId", e.target.value)}
            >
              <option value="">— Seleccionar —</option>
              {agents.filter((a) => a.active).map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {a.role}</option>
              ))}
            </select>
          </div>
        )}

        {(node.type === "agent" || node.type === "action") && (
          <div>
            <label className="text-[10px] text-[#6B7A99] uppercase tracking-wider font-semibold block mb-1.5">
              Prompt del nodo
            </label>
            <textarea
              className="astraeo-input text-[12px] resize-none"
              rows={4}
              placeholder="Instrucción específica para este nodo..."
              value={(node.config.prompt as string) ?? ""}
              onChange={(e) => updateConfig("prompt", e.target.value)}
            />
          </div>
        )}

        {node.type === "condition" && (
          <div>
            <label className="text-[10px] text-[#6B7A99] uppercase tracking-wider font-semibold block mb-1.5">
              Expresión de condición
            </label>
            <input
              className="astraeo-input text-[12px]"
              placeholder='output.includes("válido")'
              value={(node.config.expression as string) ?? ""}
              onChange={(e) => updateConfig("expression", e.target.value)}
            />
            <p className="text-[9px] text-[#6B7A99] mt-1 font-mono">Variable disponible: output</p>
          </div>
        )}

        {node.type === "action" && (
          <div>
            <label className="text-[10px] text-[#6B7A99] uppercase tracking-wider font-semibold block mb-1.5">
              Tipo de acción
            </label>
            <select
              className="astraeo-input text-[12px]"
              value={(node.config.actionType as string) ?? ""}
              onChange={(e) => updateConfig("actionType", e.target.value)}
            >
              <option value="">— Seleccionar —</option>
              <option value="createMission">Crear Misión</option>
              <option value="addMemory">Guardar Memoria</option>
              <option value="addNotification">Enviar Notificación</option>
            </select>
          </div>
        )}

        <div>
          <label className="text-[10px] text-[#6B7A99] uppercase tracking-wider font-semibold block mb-1.5">
            Config JSON
          </label>
          <textarea
            className="astraeo-input text-[11px] font-mono resize-none"
            rows={3}
            placeholder="{}"
            value={JSON.stringify(node.config, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value) as Record<string, unknown>;
                update({ config: parsed });
              } catch {
                // ignore invalid JSON while typing
              }
            }}
          />
        </div>
      </div>

      <div className="p-4 border-t border-[#1A2744]/60 flex-shrink-0">
        <button onClick={onDelete} className="btn-danger text-[11px] py-2 w-full justify-center">
          ✕ Eliminar nodo
        </button>
      </div>
    </div>
  );
}

// ─── Canvas ────────────────────────────────────────────────────────────────────

interface WorkflowCanvasProps {
  workflow: Workflow;
  agents: Agent[];
  settings: AppSettings;
  onSave: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  onBack: () => void;
}

function WorkflowCanvas({ workflow, agents, settings, onSave, onBack }: WorkflowCanvasProps) {
  const [canvasState, dispatch] = useReducer(canvasReducer, {
    nodes: workflow.nodes,
    edges: workflow.edges,
    selectedId: null,
    dragging: null,
    connecting: null,
    pan: { x: 60, y: 40 },
    zoom: 1,
    isPanning: false,
    panStart: null,
  });

  const [showRunModal, setShowRunModal] = useState(false);
  const [dirty, setDirty] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reload when workflow changes
  useEffect(() => {
    dispatch({ type: "LOAD", nodes: workflow.nodes, edges: workflow.edges });
    setDirty(false);
  }, [workflow.id]);

  const markDirty = useCallback(() => setDirty(true), []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        dispatch({ type: "DELETE_SELECTED" });
        markDirty();
      }
      if (e.key === "Escape") {
        dispatch({ type: "SELECT", id: null });
        dispatch({ type: "CANCEL_CONNECT" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [markDirty]);

  const getSVGCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const svgX = (clientX - rect.left - canvasState.pan.x) / canvasState.zoom;
      const svgY = (clientY - rect.top - canvasState.pan.y) / canvasState.zoom;
      return { x: svgX, y: svgY };
    },
    [canvasState.pan, canvasState.zoom]
  );

  // Mouse move on SVG
  const handleSVGMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (canvasState.dragging) {
        const coords = getSVGCoords(e.clientX, e.clientY);
        dispatch({
          type: "MOVE_NODE",
          nodeId: canvasState.dragging.nodeId,
          x: coords.x - canvasState.dragging.offsetX,
          y: coords.y - canvasState.dragging.offsetY,
        });
        markDirty();
      }
      if (canvasState.connecting) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        dispatch({
          type: "UPDATE_CONNECT_POS",
          mouseX: e.clientX - rect.left,
          mouseY: e.clientY - rect.top,
        });
      }
      if (canvasState.isPanning && canvasState.panStart) {
        const dx = e.clientX - canvasState.panStart.mouseX;
        const dy = e.clientY - canvasState.panStart.mouseY;
        dispatch({
          type: "SET_PAN",
          x: canvasState.panStart.panX + dx,
          y: canvasState.panStart.panY + dy,
        });
      }
    },
    [canvasState, getSVGCoords, markDirty]
  );

  const handleSVGMouseUp = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (canvasState.dragging) dispatch({ type: "END_DRAG" });
      if (canvasState.isPanning) dispatch({ type: "END_PAN" });
      if (canvasState.connecting) dispatch({ type: "CANCEL_CONNECT" });
      e.stopPropagation();
    },
    [canvasState.dragging, canvasState.isPanning, canvasState.connecting]
  );

  const handleSVGMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.target === svgRef.current || (e.target as SVGElement).tagName === "g") {
        dispatch({ type: "SELECT", id: null });
        dispatch({
          type: "START_PAN",
          mouseX: e.clientX,
          mouseY: e.clientY,
        });
      }
    },
    []
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const coords = getSVGCoords(e.clientX, e.clientY);
      const newNode: WorkflowNode = {
        id: `n-${nanoid(6)}`,
        type: "trigger",
        label: "Nuevo Nodo",
        x: coords.x - NODE_W / 2,
        y: coords.y - NODE_H / 2,
        config: {},
        color: NODE_STYLES.trigger.color,
      };
      dispatch({ type: "ADD_NODE", node: newNode });
      dispatch({ type: "SELECT", id: newNode.id });
      markDirty();
    },
    [getSVGCoords, markDirty]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      dispatch({ type: "SET_ZOOM", zoom: canvasState.zoom + delta });
    },
    [canvasState.zoom]
  );

  // Drag from palette
  const handleDragOver = useCallback((e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<SVGSVGElement>) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData("nodeType") as WorkflowNode["type"];
      if (!nodeType) return;
      const coords = getSVGCoords(e.clientX, e.clientY);
      const cfg = NODE_STYLES[nodeType];
      const newNode: WorkflowNode = {
        id: `n-${nanoid(6)}`,
        type: nodeType,
        label: cfg.label,
        x: coords.x - NODE_W / 2,
        y: coords.y - NODE_H / 2,
        config: {},
        color: cfg.color,
      };
      dispatch({ type: "ADD_NODE", node: newNode });
      dispatch({ type: "SELECT", id: newNode.id });
      markDirty();
    },
    [getSVGCoords, markDirty]
  );

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      const coords = getSVGCoords(e.clientX, e.clientY);
      const node = canvasState.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      dispatch({ type: "SELECT", id: nodeId });
      dispatch({
        type: "START_DRAG",
        nodeId,
        offsetX: coords.x - node.x,
        offsetY: coords.y - node.y,
      });
    },
    [getSVGCoords, canvasState.nodes]
  );

  const handleOutputPortMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      dispatch({
        type: "START_CONNECT",
        fromNodeId: nodeId,
        mouseX: e.clientX - rect.left,
        mouseY: e.clientY - rect.top,
      });
    },
    []
  );

  const handleInputPortMouseUp = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (canvasState.connecting) {
        dispatch({ type: "FINISH_CONNECT", toNodeId: nodeId });
        markDirty();
      }
    },
    [canvasState.connecting, markDirty]
  );

  const handleSave = useCallback(() => {
    onSave(canvasState.nodes, canvasState.edges);
    setDirty(false);
  }, [canvasState.nodes, canvasState.edges, onSave]);

  const handleCenter = useCallback(() => {
    dispatch({ type: "SET_PAN", x: 60, y: 40 });
    dispatch({ type: "SET_ZOOM", zoom: 1 });
  }, []);

  const selectedNode = canvasState.selectedId
    ? canvasState.nodes.find((n) => n.id === canvasState.selectedId) ?? null
    : null;

  const zoomPct = Math.round(canvasState.zoom * 100);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Toolbar */}
      <div
        className="px-4 py-2.5 border-b border-[#1A2744]/60 flex items-center gap-3 flex-shrink-0"
        style={{ background: "rgba(5,8,16,0.8)" }}
      >
        <button onClick={onBack} className="btn-ghost text-[11px] py-1.5 px-3">← Volver</button>
        <div className="h-4 w-px bg-[#1A2744]" />
        <span className="text-[13px] font-bold text-[#E8ECF4] truncate max-w-48">{workflow.name}</span>
        {dirty && <span className="text-[10px] text-[#FFB800] font-mono">● sin guardar</span>}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button onClick={handleCenter} className="btn-ghost text-[11px] py-1.5 px-2.5" title="Centrar">🎯</button>
          <button
            onClick={() => dispatch({ type: "SET_ZOOM", zoom: canvasState.zoom - 0.1 })}
            className="btn-ghost text-[11px] py-1 px-2"
          >−</button>
          <span className="text-[11px] font-mono text-[#6B7A99] w-10 text-center">{zoomPct}%</span>
          <button
            onClick={() => dispatch({ type: "SET_ZOOM", zoom: canvasState.zoom + 0.1 })}
            className="btn-ghost text-[11px] py-1 px-2"
          >+</button>
          <div className="h-4 w-px bg-[#1A2744]" />
          <button
            onClick={() => {
              dispatch({ type: "LOAD", nodes: [], edges: [] });
              markDirty();
            }}
            className="btn-ghost text-[11px] py-1.5 px-3"
          >
            ⌀ Limpiar
          </button>
          <button onClick={handleSave} className="btn-primary text-[11px] py-1.5 px-3">
            ✓ Guardar
          </button>
          <button
            onClick={() => setShowRunModal(true)}
            className="text-[11px] py-1.5 px-4 rounded-xl font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, rgba(0,229,160,0.15), rgba(0,212,255,0.1))",
              border: "1px solid rgba(0,229,160,0.3)",
              color: "#00E5A0",
            }}
          >
            ▶ Ejecutar
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Canvas area */}
        <div
          ref={containerRef}
          className="flex-1 relative min-w-0 overflow-hidden"
          style={{
            background: "#050810",
            backgroundImage: "radial-gradient(rgba(26,39,68,0.8) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            cursor: canvasState.isPanning
              ? "grabbing"
              : canvasState.connecting
              ? "crosshair"
              : "default",
          }}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ display: "block" }}
            onMouseDown={handleSVGMouseDown}
            onMouseMove={handleSVGMouseMove}
            onMouseUp={handleSVGMouseUp}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="rgba(0,212,255,0.5)" />
              </marker>
              <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#00D4FF" />
              </marker>
            </defs>

            <g transform={`translate(${canvasState.pan.x}, ${canvasState.pan.y}) scale(${canvasState.zoom})`}>
              {/* Edges */}
              {canvasState.edges.map((edge) => {
                const fromNode = canvasState.nodes.find((n) => n.id === edge.from);
                const toNode = canvasState.nodes.find((n) => n.id === edge.to);
                if (!fromNode || !toNode) return null;
                const from = getOutputPortPos(fromNode);
                const to = getInputPortPos(toNode);
                const path = getEdgePath(from, to);
                const isSelected = canvasState.selectedId === edge.id;
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2 - 10;
                return (
                  <g key={edge.id}>
                    {/* Invisible wide hit area */}
                    <path
                      d={path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={12}
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: "SELECT", id: edge.id });
                      }}
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke={isSelected ? "#00D4FF" : "rgba(0,212,255,0.4)"}
                      strokeWidth={isSelected ? 3 : 2}
                      markerEnd={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)"}
                      style={{ pointerEvents: "none", transition: "stroke 0.2s" }}
                    />
                    {edge.label && (
                      <text
                        x={midX}
                        y={midY}
                        textAnchor="middle"
                        style={{ fill: "#FFB800", fontSize: 10, fontFamily: "Space Grotesk", pointerEvents: "none" }}
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Temporary connection line */}
              {canvasState.connecting && (() => {
                const fromNode = canvasState.nodes.find(
                  (n) => n.id === canvasState.connecting!.fromNodeId
                );
                if (!fromNode) return null;
                const from = getOutputPortPos(fromNode);
                // Convert mouse screen coords to SVG coords
                const toX = (canvasState.connecting.mouseX - canvasState.pan.x) / canvasState.zoom;
                const toY = (canvasState.connecting.mouseY - canvasState.pan.y) / canvasState.zoom;
                const path = getEdgePath(from, { x: toX, y: toY });
                return (
                  <path
                    d={path}
                    fill="none"
                    stroke="rgba(0,212,255,0.4)"
                    strokeWidth={2}
                    strokeDasharray="6,4"
                    style={{ pointerEvents: "none" }}
                  />
                );
              })()}

              {/* Nodes */}
              {canvasState.nodes.map((node) => {
                const cfg = NODE_STYLES[node.type];
                const isSelected = canvasState.selectedId === node.id;
                const outPort = getOutputPortPos(node);
                const inPort = getInputPortPos(node);

                return (
                  <g key={node.id}>
                    <foreignObject
                      x={node.x}
                      y={node.y}
                      width={NODE_W}
                      height={NODE_H}
                      style={{ overflow: "visible" }}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    >
                      <div
                        style={{
                          width: NODE_W,
                          height: NODE_H,
                          borderRadius: 10,
                          background: cfg.bg,
                          border: `1.5px solid ${isSelected ? cfg.color : cfg.color + "40"}`,
                          boxShadow: isSelected
                            ? `0 0 0 1px ${cfg.color}30, 0 0 20px ${cfg.color}20, inset 0 0 10px ${cfg.color}08`
                            : "none",
                          cursor: "grab",
                          userSelect: "none",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          padding: "0 16px 0 14px",
                          position: "relative",
                          overflow: "hidden",
                          transition: "border-color 0.15s, box-shadow 0.15s",
                        }}
                      >
                        {/* Top color strip */}
                        <div
                          style={{
                            position: "absolute",
                            top: 0, left: 0, right: 0,
                            height: 2,
                            background: cfg.color,
                            opacity: 0.7,
                            borderRadius: "10px 10px 0 0",
                          }}
                        />
                        {/* Content */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, lineHeight: 1 }}>{cfg.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#E8ECF4",
                              fontFamily: "Space Grotesk",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {node.label}
                            </div>
                            <div style={{
                              fontSize: 9,
                              color: cfg.color,
                              fontFamily: "Space Grotesk",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              marginTop: 1,
                              opacity: 0.8,
                            }}>
                              {cfg.label}
                            </div>
                          </div>
                        </div>
                      </div>
                    </foreignObject>

                    {/* Input port (left) */}
                    <circle
                      cx={inPort.x}
                      cy={inPort.y}
                      r={PORT_R}
                      fill="#050810"
                      stroke={cfg.color}
                      strokeWidth={1.5}
                      style={{ cursor: "crosshair" }}
                      onMouseUp={(e) => handleInputPortMouseUp(e, node.id)}
                    />

                    {/* Output port (right) */}
                    <circle
                      cx={outPort.x}
                      cy={outPort.y}
                      r={PORT_R}
                      fill="#050810"
                      stroke={cfg.color}
                      strokeWidth={1.5}
                      style={{ cursor: "crosshair" }}
                      onMouseDown={(e) => handleOutputPortMouseDown(e, node.id)}
                    />
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Canvas hint */}
          {canvasState.nodes.length === 0 && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{ opacity: 0.25 }}
            >
              <div className="text-5xl mb-3">◫</div>
              <p className="text-[13px] text-[#6B7A99]">Doble click para agregar nodo</p>
              <p className="text-[11px] text-[#6B7A99] mt-1">o arrastra desde la paleta</p>
            </div>
          )}
        </div>

        {/* Inspector */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <NodeInspector
                nodeId={selectedNode.id}
                nodes={canvasState.nodes}
                agents={agents}
                dispatch={dispatch}
                onDelete={() => {
                  dispatch({ type: "DELETE_SELECTED" });
                  markDirty();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Run Modal */}
      <AnimatePresence>
        {showRunModal && (
          <RunModal
            workflow={{ ...workflow, nodes: canvasState.nodes, edges: canvasState.edges }}
            agents={agents}
            settings={settings}
            onClose={() => setShowRunModal(false)}
            onComplete={() => {}}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const {
    workflows,
    agents,
    settings,
    toggleWorkflow,
    deleteWorkflow,
    addWorkflow,
    updateWorkflow,
    showToast,
  } = useAstraeo();

  const [editorWorkflowId, setEditorWorkflowId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const editorWorkflow = editorWorkflowId
    ? workflows.find((w) => w.id === editorWorkflowId) ?? null
    : null;

  const handleCreate = () => {
    if (!newName.trim()) return;
    addWorkflow({
      name: newName,
      description: newDesc,
      nodes: [
        { id: `n-${nanoid(6)}`, type: "trigger", label: "Inicio", x: 80, y: 120, config: {}, color: "#00E5A0" },
        { id: `n-${nanoid(6)}`, type: "output", label: "Resultado", x: 420, y: 120, config: {}, color: "#FF6B9D" },
      ],
      edges: [],
      active: false,
      lastRun: undefined,
    });
    showToast(`${newName} creado`, "success");
    setCreating(false);
    setNewName("");
    setNewDesc("");
  };

  const handleSave = useCallback(
    (workflowId: string, nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
      updateWorkflow(workflowId, { nodes, edges });
      showToast("Workflow guardado", "success");
    },
    [updateWorkflow, showToast]
  );

  // ── Editor layout ──
  if (editorWorkflow) {
    return (
      <div className="flex h-full">
        {/* Node palette + workflow list */}
        <div
          className="w-52 flex-shrink-0 border-r border-[#1A2744]/60 flex flex-col glass"
          style={{ zIndex: 1 }}
        >
          {/* Palette header */}
          <div className="px-4 py-3 border-b border-[#1A2744]/60 flex-shrink-0">
            <p className="text-[10px] font-bold text-[#6B7A99] uppercase tracking-widest">Tipos de nodo</p>
          </div>

          {/* Draggable node types */}
          <div className="p-3 space-y-1.5 flex-shrink-0 border-b border-[#1A2744]/60">
            {(Object.entries(NODE_STYLES) as [WorkflowNode["type"], typeof NODE_STYLES[WorkflowNode["type"]]][]).map(
              ([type, cfg]) => (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("nodeType", type)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-grab transition-all select-none"
                  style={{
                    border: `1px solid ${cfg.color}25`,
                    background: cfg.bg,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = cfg.color + "60";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = cfg.color + "25";
                  }}
                >
                  <span style={{ fontSize: 12 }}>{cfg.icon}</span>
                  <span style={{ fontSize: 11, color: cfg.color, fontFamily: "Space Grotesk", fontWeight: 600 }}>
                    {cfg.label}
                  </span>
                </div>
              )
            )}
          </div>

          {/* Workflow list */}
          <div className="px-4 py-3 border-b border-[#1A2744]/60 flex items-center justify-between flex-shrink-0">
            <p className="text-[10px] font-bold text-[#6B7A99] uppercase tracking-widest">Workflows</p>
            <button
              onClick={() => setCreating(true)}
              className="text-[10px] font-semibold"
              style={{ color: "#00D4FF" }}
            >
              + Nuevo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {creating && (
              <div
                className="rounded-xl p-3 space-y-2 border border-[#00D4FF]/20"
                style={{ background: "rgba(0,212,255,0.04)" }}
              >
                <input
                  className="astraeo-input text-[11px]"
                  placeholder="Nombre"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                />
                <div className="flex gap-1.5">
                  <button onClick={() => setCreating(false)} className="btn-ghost text-[10px] py-1 flex-1">✕</button>
                  <button onClick={handleCreate} className="btn-primary text-[10px] py-1 flex-1 justify-center">Crear</button>
                </div>
              </div>
            )}
            {workflows.map((wf) => (
              <button
                key={wf.id}
                onClick={() => setEditorWorkflowId(wf.id)}
                className="w-full text-left px-3 py-2 rounded-lg transition-all"
                style={{
                  background: wf.id === editorWorkflowId ? "rgba(0,212,255,0.08)" : "transparent",
                  border: `1px solid ${wf.id === editorWorkflowId ? "rgba(0,212,255,0.25)" : "transparent"}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: wf.active ? "#00E5A0" : "#1A2744" }}
                  />
                  <span
                    className="text-[11px] font-medium truncate"
                    style={{ color: wf.id === editorWorkflowId ? "#E8ECF4" : "#6B7A99" }}
                  >
                    {wf.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <WorkflowCanvas
          workflow={editorWorkflow}
          agents={agents}
          settings={settings}
          onSave={(nodes, edges) => handleSave(editorWorkflow.id, nodes, edges)}
          onBack={() => setEditorWorkflowId(null)}
        />
      </div>
    );
  }

  // ── List layout ──
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 border-r border-[#1A2744]/60 flex flex-col flex-shrink-0">
        <div className="px-5 py-4 border-b border-[#1A2744]/60 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-[14px] font-bold tracking-wide text-[#E8ECF4]">Workflows</h2>
            <p className="text-[10px] text-[#6B7A99] font-mono">
              {workflows.filter((w) => w.active).length} activos
            </p>
          </div>
          <button onClick={() => setCreating(true)} className="btn-primary text-[11px] py-1.5 px-3">
            + Nuevo
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {creating && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl p-3.5 border border-[#00D4FF]/20 space-y-2"
            >
              <input
                className="astraeo-input text-[12px]"
                placeholder="Nombre del workflow"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                autoFocus
              />
              <input
                className="astraeo-input text-[12px]"
                placeholder="Descripción (opcional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => setCreating(false)} className="btn-ghost text-[11px] py-1.5 flex-1">✕</button>
                <button onClick={handleCreate} className="btn-primary text-[11px] py-1.5 flex-1 justify-center">
                  Crear
                </button>
              </div>
            </motion.div>
          )}
          {workflows.map((wf) => (
            <motion.div
              key={wf.id}
              layout
              className="p-3.5 rounded-xl cursor-pointer transition-all border"
              style={{
                borderColor: "rgba(26,39,68,0.5)",
                background: "rgba(10,15,31,0.7)",
              }}
              whileHover={{ borderColor: "rgba(0,212,255,0.2)" }}
              onClick={() => setEditorWorkflowId(wf.id)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[12px] font-semibold text-[#E8ECF4]">{wf.name}</p>
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                  style={{
                    background: wf.active ? "#00E5A0" : "#1A2744",
                    boxShadow: wf.active ? "0 0 8px #00E5A0" : "none",
                  }}
                />
              </div>
              <p className="text-[10px] text-[#6B7A99] mb-2.5 line-clamp-1">{wf.description}</p>
              <div className="flex items-center justify-between text-[9px] text-[#6B7A99] font-mono mb-2.5">
                <span>{wf.nodes.length} nodos · {wf.runs} runs</span>
                {wf.lastRun && (
                  <span>
                    {new Date(wf.lastRun).toLocaleDateString("es", { day: "2-digit", month: "short" })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditorWorkflowId(wf.id);
                  }}
                  className="btn-primary text-[10px] py-1 px-2.5 flex-1 justify-center"
                >
                  ✎ Editar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWorkflow(wf.id);
                  }}
                  className="btn-ghost text-[10px] py-1 px-2.5"
                  title={wf.active ? "Desactivar" : "Activar"}
                >
                  {wf.active ? "⏸" : "▶"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteWorkflow(wf.id);
                    showToast("Workflow eliminado", "info");
                  }}
                  className="btn-danger text-[10px] py-1 px-2.5"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-30">
        <span className="text-6xl">◫</span>
        <div className="text-center">
          <p className="text-[15px] font-semibold text-[#E8ECF4] mb-1">Editor de Workflows</p>
          <p className="text-[12px] text-[#6B7A99]">Selecciona un workflow para editar</p>
          <p className="text-[11px] text-[#6B7A99] mt-1">o crea uno nuevo con + Nuevo</p>
        </div>
      </div>
    </div>
  );
}
