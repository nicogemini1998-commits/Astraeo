import type { NextRequest } from "next/server";
import { db } from "./db";
import { getSessionFromCookies } from "./auth";

interface AuditArgs {
  action: string;
  entity: string;
  entityId?: string;
  req?: NextRequest;
  meta?: Record<string, unknown>;
  userId?: string;
}

/**
 * Persist a security-relevant event to audit_log.
 *
 * Best-effort and non-blocking from the caller's POV: any DB error is logged
 * but never thrown, so audit failures don't break the request path.
 */
export async function audit(args: AuditArgs): Promise<void> {
  try {
    let userId = args.userId;
    if (!userId) {
      const session = await getSessionFromCookies().catch(() => null);
      userId = session?.sub;
    }
    const ip = args.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            ?? args.req?.headers.get("x-real-ip")
            ?? null;
    const userAgent = args.req?.headers.get("user-agent") ?? null;

    await db.auditLog.create({
      data: {
        action: args.action,
        entity: args.entity,
        entityId: args.entityId ?? null,
        userId: userId ?? null,
        ip,
        userAgent,
        meta: args.meta ? (args.meta as object) : undefined,
      },
    });
  } catch (e) {
    // Never let audit failures break the caller — log and move on
    console.warn("[audit] persist failed:", e instanceof Error ? e.message : e);
  }
}
