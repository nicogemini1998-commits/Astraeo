import { z } from "zod";

// ─── Shared primitives ────────────────────────────────────────────────────────

// cuid-like: starts with 'c', 10-30 chars of alphanumeric
const cuid = z.string().regex(/^c[a-z0-9]{9,29}$/, "Invalid ID format");
const nonEmpty = z.string().min(1).max(8000);
const shortString = z.string().min(1).max(255);
const jsonValue: z.ZodType<unknown> = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.record(z.string(), z.lazy(() => jsonValue)),
  z.array(z.lazy(() => jsonValue)),
]);

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: nonEmpty,
});

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(100),
  agentId: cuid.optional(),
  sessionId: cuid.optional(),
  stream: z.boolean().optional().default(false),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ─── Commander ────────────────────────────────────────────────────────────────

export const CommanderRequestSchema = z.object({
  prompt: nonEmpty,
  agentId: cuid.optional(),
  context: z.record(z.string(), jsonValue).optional(),
});

export type CommanderRequest = z.infer<typeof CommanderRequestSchema>;

// ─── Memory ───────────────────────────────────────────────────────────────────

export const MemoryWriteSchema = z.object({
  agentId: cuid,
  key: shortString,
  value: jsonValue,
  ttlSeconds: z.number().int().positive().max(60 * 60 * 24 * 30).optional(), // max 30 days
});

export const MemoryReadSchema = z.object({
  agentId: cuid,
  key: shortString.optional(),
});

export const SharedContextWriteSchema = z.object({
  key: shortString,
  value: jsonValue,
  writtenBy: cuid,
  ttlSeconds: z.number().int().positive().max(60 * 60 * 24 * 30).optional(),
});

export const AgentMessageSchema = z.object({
  fromAgent: cuid,
  toAgent: cuid,
  channel: z.enum(["general", "task", "memory", "alert"]).default("general"),
  content: z.record(z.string(), jsonValue),
});

export const TaskLogWriteSchema = z.object({
  agentId: cuid,
  taskHash: z.string().length(64), // SHA-256 hex
  description: nonEmpty,
  status: z.enum(["pending", "running", "done", "failed"]).default("pending"),
  result: z.record(z.string(), jsonValue).optional(),
});

export const TaskLogUpdateSchema = z.object({
  id: cuid,
  status: z.enum(["pending", "running", "done", "failed"]),
  result: z.record(z.string(), jsonValue).optional(),
  finishedAt: z.string().datetime().optional(),
});

export type MemoryWrite = z.infer<typeof MemoryWriteSchema>;
export type SharedContextWrite = z.infer<typeof SharedContextWriteSchema>;
export type AgentMessageWrite = z.infer<typeof AgentMessageSchema>;
export type TaskLogWrite = z.infer<typeof TaskLogWriteSchema>;

// ─── Workflows ────────────────────────────────────────────────────────────────

export const WorkflowExecuteSchema = z.object({
  workflowId: cuid,
  triggerData: z.record(z.string(), jsonValue).optional(),
  agentId: cuid.optional(),
});

export type WorkflowExecute = z.infer<typeof WorkflowExecuteSchema>;

// ─── Agents ───────────────────────────────────────────────────────────────────

export const AgentCreateSchema = z.object({
  name: shortString,
  skills: z.array(shortString).max(20).default([]),
  config: z.record(z.string(), jsonValue).optional(),
});

export const AgentUpdateSchema = z.object({
  name: shortString.optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  skills: z.array(shortString).max(20).optional(),
  config: z.record(z.string(), jsonValue).optional(),
});

export type AgentCreate = z.infer<typeof AgentCreateSchema>;
export type AgentUpdate = z.infer<typeof AgentUpdateSchema>;

// ─── Helper: parse request body ───────────────────────────────────────────────

export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<z.infer<T>> {
  const body: unknown = await req.json();
  return schema.parse(body);
}
