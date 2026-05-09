import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, err, handleRouteError } from "@/lib/errors";
import { z } from "zod";

const SETTINGS_ID = "default"; // Single-user app

const SettingsSchema = z.object({
  claudeModel:             z.string().min(1).optional(),
  userName:                z.string().min(1).max(60).optional(),
  userRole:                z.string().max(80).optional(),
  language:                z.enum(["es", "en"]).optional(),
  timezone:                z.string().max(50).optional(),
  maxTokens:               z.number().int().min(256).max(16384).optional(),
  temperature:             z.number().min(0).max(1).optional(),
  streamingEnabled:        z.boolean().optional(),
  systemBehavior:          z.enum(["precise", "balanced", "creative"]).optional(),
  agentTimeout:            z.number().int().min(5).max(300).optional(),
  agentRetries:            z.number().int().min(0).max(5).optional(),
  maxConcurrentAgents:     z.number().int().min(1).max(10).optional(),
  memoryRetentionDays:     z.number().int().min(1).max(365).optional(),
  autoSaveMemory:          z.boolean().optional(),
  companyName:             z.string().max(100).optional(),
  companyIndustry:         z.string().max(50).optional(),
  companyContext:          z.string().max(4000).optional(),
  brandValues:             z.array(z.string().max(40)).max(20).optional(),
  animationSpeed:          z.enum(["fast", "normal", "slow"]).optional(),
  compactMode:             z.boolean().optional(),
  starfieldDensity:        z.number().int().min(0).max(300).optional(),
  fontSize:                z.enum(["small", "normal", "large"]).optional(),
  notifications:           z.boolean().optional(),
  soundEffects:            z.boolean().optional(),
  notifyOnAgentComplete:   z.boolean().optional(),
  notifyOnError:           z.boolean().optional(),
  notifyOnWorkflowEnd:     z.boolean().optional(),
  analyticsEnabled:        z.boolean().optional(),
  webhookUrl:              z.string().url().or(z.literal("")).optional(),
  realtimeUpdates:         z.boolean().optional(),
});

export async function GET() {
  try {
    const row = await db.settings.findUnique({ where: { id: SETTINGS_ID } });
    if (!row) return ok(null);
    // Never expose the API key through this route
    const { anthropicApiKey: _key, ...data } = row;
    return ok(data);
  } catch (e) {
    return handleRouteError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return err("Invalid JSON", 400); }

    const parsed = SettingsSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Validation error", 422);

    // Never accept API key through this route — stored client-side only
    const { companyName, companyContext, language } = parsed.data;

    // Only persist fields that exist on the Settings model
    const dbFields: Record<string, unknown> = {};
    if (companyName   !== undefined) dbFields.companyName   = companyName;
    if (companyContext !== undefined) dbFields.companyContext = companyContext;
    if (language       !== undefined) dbFields.language       = language;

    const row = await db.settings.upsert({
      where:  { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...dbFields },
      update: { ...dbFields },
    });

    return ok({ saved: true, updatedAt: row.updatedAt });
  } catch (e) {
    return handleRouteError(e);
  }
}
