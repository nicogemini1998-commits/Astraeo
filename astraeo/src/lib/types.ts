export type Page =
  | "overview"
  | "chat"
  | "pixel-stage"
  | "missions"
  | "commander"
  | "agents"
  | "workflows"
  | "memory"
  | "analytics"
  | "integrations"
  | "settings"
  | "skills"
  | "hooks";

export type AgentStatus = "online" | "busy" | "offline" | "error";

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  model: string;
  systemPrompt: string;
  skills: string[];
  color: string;
  icon: string;
  tasksCompleted: number;
  tokensUsed: number;
  avgResponseMs: number;
  createdAt: string;
  active: boolean;
  pixelSprite?: number[][];
}

export type MissionStatus = "backlog" | "active" | "review" | "done";
export type MissionPriority = "low" | "medium" | "high" | "critical";

export interface Mission {
  id: string;
  title: string;
  description: string;
  status: MissionStatus;
  priority: MissionPriority;
  assignedTo: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  progress: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  agentId?: string;
  timestamp: string;
  tokens?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  agentId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export type MemoryType = "user" | "feedback" | "project" | "reference" | "fact";

export interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  type: MemoryType;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}

export interface WorkflowNode {
  id: string;
  type: "trigger" | "agent" | "condition" | "action" | "output";
  label: string;
  x: number;
  y: number;
  config: Record<string, unknown>;
  color: string;
}

export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  active: boolean;
  runs: number;
  lastRun?: string;
  createdAt: string;
}

export interface Integration {
  id: string;
  name: string;
  icon: string;
  category: string;
  connected: boolean;
  apiKey?: string;
  config: Record<string, string>;
  color: string;
}

export interface MetricPoint {
  time: string;
  value: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  timestamp: string;
}

export interface AppSettings {
  // Perfil
  claudeApiKey: string;
  claudeModel: string;
  userName: string;
  userRole: string;
  language: string;
  timezone: string;
  // IA
  maxTokens: number;
  temperature: number;
  streamingEnabled: boolean;
  systemBehavior: "precise" | "balanced" | "creative";
  // Agentes
  agentTimeout: number;
  agentRetries: number;
  maxConcurrentAgents: number;
  memoryRetentionDays: number;
  autoSaveMemory: boolean;
  // Empresa
  companyName: string;
  companyIndustry: string;
  companyContext: string;
  brandValues: string[];
  // Interfaz
  theme: "dark" | "light";
  animationSpeed: "fast" | "normal" | "slow";
  compactMode: boolean;
  starfieldDensity: number;
  fontSize: "small" | "normal" | "large";
  sidebarCollapsed: boolean;
  // Notificaciones
  notifications: boolean;
  soundEffects: boolean;
  notifyOnAgentComplete: boolean;
  notifyOnError: boolean;
  notifyOnWorkflowEnd: boolean;
  // Privacidad
  analyticsEnabled: boolean;
  // Webhook
  webhookUrl: string;
  realtimeUpdates: boolean;
}

// ─── Skills ───────────────────────────────────────────────────────────────────
export type SkillCategory = "ai" | "research" | "writing" | "code" | "data" | "visual" | "communication" | "automation" | "sales" | "strategy";
export type SkillDifficulty = "beginner" | "intermediate" | "advanced";

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  difficulty: SkillDifficulty;
  icon: string;
  tags: string[];
  agentIds: string[];
  usageCount: number;
  successRate: number;
  avgDurationMs: number;
  active: boolean;
  builtIn: boolean;
  createdAt: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
export type HookTrigger = "pre-message" | "post-message" | "agent-start" | "agent-end" | "workflow-start" | "workflow-end" | "schedule" | "webhook" | "error" | "success";
export type HookAction = "notify" | "log" | "transform" | "webhook" | "email" | "slack" | "stop" | "branch";

export interface Hook {
  id: string;
  name: string;
  description: string;
  trigger: HookTrigger;
  triggerConfig: Record<string, unknown>;
  action: HookAction;
  actionConfig: Record<string, unknown>;
  active: boolean;
  runCount: number;
  lastRun?: string;
  successCount: number;
  failCount: number;
  color: string;
  createdAt: string;
}
