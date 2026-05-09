import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { db } from "@/lib/db";
import { getSessionFromCookies, verifyCredentials } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { checkRateLimit, LIMITS, requestKey } from "@/lib/rate-limit";
import { err, validationError, handleRouteError } from "@/lib/errors";

const Body = z.object({
  confirmation: z.string(),
  password: z.string().min(1).max(256),
});

const REQUIRED_PHRASE = "BORRAR TODO";

/**
 * Hard reset — wipes all client-specific data so the dashboard can be
 * handed to a new client.
 *
 * Double-auth: requires (1) valid session cookie, (2) exact confirmation
 * phrase, (3) re-entered password (bcrypt-verified server-side).
 *
 * Preserves: audit_log (forensic trail), schema itself.
 */
export async function POST(req: NextRequest) {
  // ── Rate limit ────────────────────────────────────────────────────────
  try {
    const rl = await checkRateLimit(requestKey(req, "admin-wipe"), LIMITS.auth);
    if (!rl.allowed) return err("Demasiados intentos", 429, "RATE_LIMITED");
  } catch {
    /* redis down — fail open */
  }

  // ── Session check ─────────────────────────────────────────────────────
  const session = await getSessionFromCookies();
  if (!session) return err("No autenticado", 401, "UNAUTHENTICATED");

  // ── Body parse ────────────────────────────────────────────────────────
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    if (e instanceof ZodError) return validationError(e);
    return handleRouteError(e);
  }

  // ── Confirmation phrase ───────────────────────────────────────────────
  if (body.confirmation !== REQUIRED_PHRASE) {
    await audit({
      action: "admin.wipe.fail",
      entity: "system",
      req,
      meta: { reason: "wrong_phrase" },
      userId: session.sub,
    });
    return err("Frase de confirmación incorrecta", 400, "BAD_CONFIRMATION");
  }

  // ── Password re-verification ──────────────────────────────────────────
  const passOk = await verifyCredentials(session.sub, body.password);
  if (!passOk) {
    await audit({
      action: "admin.wipe.fail",
      entity: "system",
      req,
      meta: { reason: "wrong_password" },
      userId: session.sub,
    });
    return err("Contraseña incorrecta", 401, "BAD_PASSWORD");
  }

  // ── Wipe — single transaction ─────────────────────────────────────────
  // Order respects FK constraints. AuditLog is preserved deliberately.
  let counts: Record<string, number> = {};
  try {
    await db.$transaction(async (tx) => {
      counts = {
        agentMessages: (await tx.agentMessage.deleteMany()).count,
        chatSessions:  (await tx.chatSession.deleteMany()).count,
        agentMemory:   (await tx.agentMemory.deleteMany()).count,
        sharedContext: (await tx.sharedContext.deleteMany()).count,
        taskLog:       (await tx.taskLog.deleteMany()).count,
        missions:      (await tx.mission.deleteMany()).count,
        agents:        (await tx.agent.deleteMany()).count,
        settings:      (await tx.settings.deleteMany()).count,
      };
    });
  } catch (e) {
    await audit({
      action: "admin.wipe.error",
      entity: "system",
      req,
      meta: { error: e instanceof Error ? e.message : "unknown" },
      userId: session.sub,
    });
    return err("Error al limpiar la base de datos", 500, "WIPE_FAILED");
  }

  await audit({
    action: "admin.wipe.success",
    entity: "system",
    req,
    meta: counts,
    userId: session.sub,
  });

  return NextResponse.json({ ok: true, counts });
}
