"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type {
  Page, Agent, Mission, ChatSession, ChatMessage,
  MemoryEntry, Workflow, Integration, Notification,
  AppSettings, MetricPoint, AgentStatus, Skill, Hook
} from "@/lib/types";
import {
  seedAgents, seedMissions, seedMemory, seedWorkflows,
  seedIntegrations, seedNotifications, seedChatSessions,
  seedSkills, seedHooks
} from "@/lib/seeds";

interface RealtimeMetrics {
  apiLatency: number;
  efficiency: number;
  tokensPerMinute: number;
  activeSessions: number;
  requestsToday: number;
  successRate: number;
  latencyHistory: MetricPoint[];
  tokensHistory: MetricPoint[];
}

interface AstraeoState {
  currentPage: Page;
  sidebarOpen: boolean;
  agents: Agent[];
  missions: Mission[];
  chatSessions: ChatSession[];
  activeChatId: string | null;
  memory: MemoryEntry[];
  workflows: Workflow[];
  integrations: Integration[];
  notifications: Notification[];
  settings: AppSettings;
  metrics: RealtimeMetrics;
  notifPanelOpen: boolean;
  modalOpen: boolean;
  toasts: { id: string; message: string; type: "success" | "error" | "info" | "warning" }[];
  isAuthenticated: boolean;

  // Auth
  login: (user: string, pass: string) => boolean;
  logout: () => void;

  // Navigation
  setPage: (page: Page) => void;
  toggleSidebar: () => void;

  // Agents
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  addAgent: (agent: Omit<Agent, "id" | "createdAt" | "tasksCompleted" | "tokensUsed" | "avgResponseMs">) => void;
  deleteAgent: (id: string) => void;
  setAgentStatus: (id: string, status: AgentStatus) => void;

  // Missions
  addMission: (m: Omit<Mission, "id" | "createdAt" | "updatedAt">) => void;
  updateMission: (id: string, patch: Partial<Mission>) => void;
  deleteMission: (id: string) => void;
  moveMission: (id: string, status: Mission["status"]) => void;

  // Chat
  sendMessage: (sessionId: string, content: string, agentId: string) => Promise<void>;
  createChatSession: (agentId: string) => string;
  setActiveChat: (id: string) => void;
  deleteChat: (id: string) => void;

  // Memory
  addMemory: (m: Omit<MemoryEntry, "id" | "createdAt" | "updatedAt">) => void;
  updateMemory: (id: string, patch: Partial<MemoryEntry>) => void;
  deleteMemory: (id: string) => void;
  togglePinMemory: (id: string) => void;

  // Workflows
  toggleWorkflow: (id: string) => void;
  runWorkflow: (id: string) => void;
  updateWorkflow: (id: string, patch: Partial<Workflow>) => void;
  addWorkflow: (w: Omit<Workflow, "id" | "createdAt" | "runs">) => void;
  deleteWorkflow: (id: string) => void;

  // Integrations
  connectIntegration: (id: string, apiKey: string, config?: Record<string, string>) => void;
  disconnectIntegration: (id: string) => void;

  // Notifications
  addNotification: (n: Omit<Notification, "id" | "timestamp">) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  toggleNotifPanel: () => void;

  // Settings
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Metrics (real-time)
  tickMetrics: () => void;

  skills: Skill[];
  hooks: Hook[];

  // Skills
  addSkill: (s: Omit<Skill, "id" | "createdAt" | "usageCount" | "successRate" | "avgDurationMs">) => void;
  updateSkill: (id: string, patch: Partial<Skill>) => void;
  deleteSkill: (id: string) => void;
  toggleSkill: (id: string) => void;

  // Hooks
  addHook: (h: Omit<Hook, "id" | "createdAt" | "runCount" | "successCount" | "failCount">) => void;
  updateHook: (id: string, patch: Partial<Hook>) => void;
  deleteHook: (id: string) => void;
  toggleHook: (id: string) => void;

  // Toasts
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  dismissToast: (id: string) => void;
}

const defaultSettings: AppSettings = {
  claudeApiKey: "",
  claudeModel: "claude-sonnet-4-6",
  userName: "Comandante",
  userRole: "Director de Operaciones",
  language: "es",
  timezone: "Europe/Madrid",
  maxTokens: 4096,
  temperature: 0.7,
  streamingEnabled: true,
  systemBehavior: "balanced",
  agentTimeout: 30,
  agentRetries: 2,
  maxConcurrentAgents: 4,
  memoryRetentionDays: 30,
  autoSaveMemory: true,
  companyName: "CLIENDER",
  companyIndustry: "consultoria",
  companyContext: `CLIENDER — Consultora Tecnológica de Ventas\nUbicación: Puerto de Sagunto (Valencia, España) | Equipo: ~12 profesionales\n\nMISIÓN: Reconstruye sistemas de ventas completos para empresas con mínimo 5 empleados, estructura comercial activa y capacidad de inversión.\n\nTRES PILARES:\n1. Captación de clientes — Meta Ads, Google Ads, optimización de CPL, creatividades IA.\n2. Sistema comercial — CRM Go High Level, WhatsApp/email automation, flujos de cualificación.\n3. Visibilidad digital — SEO, redes sociales, web, reputación online.`,
  brandValues: ["Precisión", "Resultados", "Automatización"],
  theme: "dark",
  animationSpeed: "normal",
  compactMode: false,
  starfieldDensity: 80,
  fontSize: "normal",
  sidebarCollapsed: false,
  notifications: true,
  soundEffects: false,
  notifyOnAgentComplete: true,
  notifyOnError: true,
  notifyOnWorkflowEnd: true,
  analyticsEnabled: false,
  webhookUrl: "",
  realtimeUpdates: true,
};

const makeLatencyHistory = (): MetricPoint[] => {
  const now = Date.now();
  return Array.from({ length: 20 }, (_, i) => ({
    time: new Date(now - (19 - i) * 3000).toISOString(),
    value: 800 + Math.random() * 600,
  }));
};

const makeTokensHistory = (): MetricPoint[] => {
  const now = Date.now();
  return Array.from({ length: 20 }, (_, i) => ({
    time: new Date(now - (19 - i) * 3000).toISOString(),
    value: Math.floor(1200 + Math.random() * 800),
  }));
};

export const useAstraeo = create<AstraeoState>()(
  persist(
    (set, get) => ({
      currentPage: "overview",
      sidebarOpen: true,
      agents: seedAgents,
      missions: seedMissions,
      chatSessions: seedChatSessions,
      activeChatId: "chat-1",
      memory: seedMemory,
      workflows: seedWorkflows,
      integrations: seedIntegrations,
      notifications: seedNotifications,
      settings: defaultSettings,
      notifPanelOpen: false,
      modalOpen: false,
      toasts: [],
      isAuthenticated: false,

      // Auth — demo-grade only (creds visible in bundle). Replace with real
      // auth (NextAuth + hashed creds) before production.
      login: (user, pass) => {
        const ok = user === "nicolas" && pass === "Master123";
        if (ok) set({ isAuthenticated: true });
        return ok;
      },
      logout: () => set({ isAuthenticated: false }),

      skills: seedSkills,
      hooks: seedHooks,
      metrics: {
        apiLatency: 0,
        efficiency: 92,
        tokensPerMinute: 0,
        activeSessions: 0,
        requestsToday: 847,
        successRate: 98.7,
        latencyHistory: makeLatencyHistory(),
        tokensHistory: makeTokensHistory(),
      },

      setPage: (page) => set({ currentPage: page }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      updateAgent: (id, patch) =>
        set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      addAgent: (agent) =>
        set((s) => ({
          agents: [...s.agents, {
            ...agent, id: `agent-${nanoid(6)}`,
            createdAt: new Date().toISOString(),
            tasksCompleted: 0, tokensUsed: 0, avgResponseMs: 0,
          }],
        })),
      deleteAgent: (id) => set((s) => ({ agents: s.agents.filter((a) => a.id !== id) })),
      setAgentStatus: (id, status) =>
        set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, status } : a)) })),

      addMission: (m) =>
        set((s) => ({
          missions: [...s.missions, {
            ...m, id: `m-${nanoid(6)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }],
        })),
      updateMission: (id, patch) =>
        set((s) => ({
          missions: s.missions.map((m) =>
            m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m
          ),
        })),
      deleteMission: (id) => set((s) => ({ missions: s.missions.filter((m) => m.id !== id) })),
      moveMission: (id, status) =>
        set((s) => ({
          missions: s.missions.map((m) =>
            m.id === id ? { ...m, status, updatedAt: new Date().toISOString() } : m
          ),
        })),

      createChatSession: (agentId) => {
        const agent = get().agents.find((a) => a.id === agentId);
        const id = `chat-${nanoid(6)}`;
        set((s) => ({
          chatSessions: [...s.chatSessions, {
            id, agentId,
            title: `Chat con ${agent?.name ?? "Agente"}`,
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }],
          activeChatId: id,
        }));
        return id;
      },
      setActiveChat: (id) => set({ activeChatId: id }),
      deleteChat: (id) => set((s) => {
        const remaining = s.chatSessions.filter((c) => c.id !== id);
        return {
          chatSessions: remaining,
          activeChatId: s.activeChatId === id ? (remaining[0]?.id ?? null) : s.activeChatId,
        };
      }),

      sendMessage: async (sessionId, content, agentId) => {
        const state = get();
        const userMsg: ChatMessage = {
          id: nanoid(), role: "user", content,
          timestamp: new Date().toISOString(),
        };
        const addMsg = (msg: ChatMessage) =>
          set((s) => ({
            chatSessions: s.chatSessions.map((c) =>
              c.id === sessionId
                ? { ...c, messages: [...c.messages, msg], updatedAt: new Date().toISOString() }
                : c
            ),
          }));

        addMsg(userMsg);

        const agent = state.agents.find((a) => a.id === agentId);
        const apiKey = state.settings.claudeApiKey;

        if (!apiKey) {
          const noKeyMsg: ChatMessage = {
            id: nanoid(), role: "system",
            content: "⚠️ Configura tu Claude API Key en Ajustes para habilitar respuestas reales.",
            timestamp: new Date().toISOString(),
          };
          setTimeout(() => addMsg(noKeyMsg), 500);
          return;
        }

        try {
          const session = get().chatSessions.find((c) => c.id === sessionId);
          const history = (session?.messages ?? [])
            .filter((m) => m.role !== "system")
            .slice(-20)
            .map((m) => ({ role: m.role === "agent" ? "assistant" as const : "user" as const, content: m.content }));

          const systemPrompt = [
            agent?.systemPrompt ?? "Eres un asistente útil.",
            state.settings.companyContext?.trim()
              ? `\n\nContexto de la empresa:\n${state.settings.companyContext}`
              : "",
          ].join("");

          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: history,
              systemPrompt,
              model: state.settings.claudeModel,
              apiKey,
            }),
          });

          if (!res.ok) throw new Error(`API Error ${res.status}`);

          if (!res.body) throw new Error("Response body is null");
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let replyText = "";
          let tokens = 0;

          const assistantMsgId = nanoid();
          addMsg({ id: assistantMsgId, role: "agent", agentId, content: "", timestamp: new Date().toISOString() });

          const updateContent = (text: string) =>
            set((s) => ({
              chatSessions: s.chatSessions.map((c) =>
                c.id === sessionId
                  ? {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMsgId ? { ...m, content: text } : m
                      ),
                      updatedAt: new Date().toISOString(),
                    }
                  : c
              ),
            }));

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = JSON.parse(line.slice(6)) as
                | { type: "text"; delta: string }
                | { type: "done"; tokens: number }
                | { type: "error"; message: string };

              if (data.type === "text") {
                replyText += data.delta;
                updateContent(replyText);
              } else if (data.type === "done") {
                tokens = data.tokens;
              } else if (data.type === "error") {
                throw new Error(data.message);
              }
            }
          }

          set((s) => ({
            chatSessions: s.chatSessions.map((c) =>
              c.id === sessionId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMsgId ? { ...m, tokens } : m
                    ),
                  }
                : c
            ),
            agents: s.agents.map((a) =>
              a.id === agentId
                ? { ...a, tokensUsed: a.tokensUsed + tokens, tasksCompleted: a.tasksCompleted + 1 }
                : a
            ),
          }));
        } catch (err) {
          const errMsg: ChatMessage = {
            id: nanoid(), role: "system",
            content: `Error al contactar Claude: ${err instanceof Error ? err.message : "Error desconocido"}`,
            timestamp: new Date().toISOString(),
          };
          addMsg(errMsg);
        }
      },

      addMemory: (m) =>
        set((s) => ({
          memory: [...s.memory, {
            ...m, id: `mem-${nanoid(6)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }],
        })),
      updateMemory: (id, patch) =>
        set((s) => ({
          memory: s.memory.map((m) =>
            m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m
          ),
        })),
      deleteMemory: (id) => set((s) => ({ memory: s.memory.filter((m) => m.id !== id) })),
      togglePinMemory: (id) =>
        set((s) => ({
          memory: s.memory.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)),
        })),

      toggleWorkflow: (id) =>
        set((s) => ({ workflows: s.workflows.map((w) => (w.id === id ? { ...w, active: !w.active } : w)) })),
      runWorkflow: (id) =>
        set((s) => ({
          workflows: s.workflows.map((w) =>
            w.id === id ? { ...w, runs: w.runs + 1, lastRun: new Date().toISOString() } : w
          ),
        })),
      updateWorkflow: (id, patch) =>
        set((s) => ({ workflows: s.workflows.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
      addWorkflow: (w) =>
        set((s) => ({
          workflows: [...s.workflows, { ...w, id: `wf-${nanoid(6)}`, createdAt: new Date().toISOString(), runs: 0 }],
        })),
      deleteWorkflow: (id) => set((s) => ({ workflows: s.workflows.filter((w) => w.id !== id) })),

      connectIntegration: (id, apiKey, config) =>
        set((s) => ({
          integrations: s.integrations.map((i) =>
            i.id === id ? { ...i, connected: true, apiKey, config: config ?? i.config } : i
          ),
        })),
      disconnectIntegration: (id) =>
        set((s) => ({
          integrations: s.integrations.map((i) =>
            i.id === id ? { ...i, connected: false, apiKey: "" } : i
          ),
        })),

      addNotification: (n) =>
        set((s) => ({
          notifications: [{ ...n, id: nanoid(), timestamp: new Date().toISOString() }, ...s.notifications],
        })),
      markNotificationRead: (id) =>
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      toggleNotifPanel: () => set((s) => ({ notifPanelOpen: !s.notifPanelOpen })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      tickMetrics: () => {
        set((s) => {
          const now = new Date().toISOString();
          const lat = 600 + Math.random() * 700;
          const tok = Math.floor(1000 + Math.random() * 1200);
          const newLatHistory = [...s.metrics.latencyHistory.slice(-19), { time: now, value: lat }];
          const newTokHistory = [...s.metrics.tokensHistory.slice(-19), { time: now, value: tok }];
          return {
            metrics: {
              ...s.metrics,
              apiLatency: Math.round(lat),
              tokensPerMinute: tok,
              efficiency: parseFloat((90 + Math.random() * 8).toFixed(1)),
              activeSessions: Math.floor(Math.random() * 5) + 1,
              requestsToday: s.metrics.requestsToday + Math.floor(Math.random() * 3),
              successRate: parseFloat((97 + Math.random() * 2.5).toFixed(1)),
              latencyHistory: newLatHistory,
              tokensHistory: newTokHistory,
            },
          };
        });
      },

      addSkill: (s) => set((state) => ({
        skills: [{ ...s, id: nanoid(), createdAt: new Date().toISOString(), usageCount: 0, successRate: 100, avgDurationMs: 0 }, ...state.skills]
      })),
      updateSkill: (id, patch) => set((state) => ({ skills: state.skills.map((s) => s.id === id ? { ...s, ...patch } : s) })),
      deleteSkill: (id) => set((state) => ({ skills: state.skills.filter((s) => s.id !== id) })),
      toggleSkill: (id) => set((state) => ({ skills: state.skills.map((s) => s.id === id ? { ...s, active: !s.active } : s) })),

      addHook: (h) => set((state) => ({
        hooks: [{ ...h, id: nanoid(), createdAt: new Date().toISOString(), runCount: 0, successCount: 0, failCount: 0 }, ...state.hooks]
      })),
      updateHook: (id, patch) => set((state) => ({ hooks: state.hooks.map((h) => h.id === id ? { ...h, ...patch } : h) })),
      deleteHook: (id) => set((state) => ({ hooks: state.hooks.filter((h) => h.id !== id) })),
      toggleHook: (id) => set((state) => ({ hooks: state.hooks.map((h) => h.id === id ? { ...h, active: !h.active } : h) })),

      showToast: (message, type = "info") => {
        const id = nanoid();
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => get().dismissToast(id), 4000);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: "astraeo-store",
      version: 3,
      // Migración v2 → v3: re-aplica seeds de skills/hooks preservando los
      // creados por el usuario (no built-in). Garantiza que catálogos elite
      // estén disponibles aunque el usuario tenga state antiguo en localStorage.
      migrate: (persisted: unknown, version: number) => {
        const ps = (persisted ?? {}) as Partial<AstraeoState>;
        if (version < 3) {
          const userSkills = (ps.skills ?? []).filter((s) => !s.builtIn);
          const seedIds = new Set(seedSkills.map((s) => s.id));
          const userSkillsDeduped = userSkills.filter((s) => !seedIds.has(s.id));
          ps.skills = [...seedSkills, ...userSkillsDeduped];

          const userHooks = (ps.hooks ?? []).filter((h) => h.id.startsWith("hook-user-"));
          const hookSeedIds = new Set(seedHooks.map((h) => h.id));
          const userHooksDeduped = userHooks.filter((h) => !hookSeedIds.has(h.id));
          ps.hooks = [...seedHooks, ...userHooksDeduped];
        }
        return ps as AstraeoState;
      },
      partialize: (s) => ({
        agents: s.agents,
        missions: s.missions,
        chatSessions: s.chatSessions,
        activeChatId: s.activeChatId,
        memory: s.memory,
        workflows: s.workflows,
        skills: s.skills,
        hooks: s.hooks,
        integrations: s.integrations,
        notifications: s.notifications,
        settings: s.settings,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
);
