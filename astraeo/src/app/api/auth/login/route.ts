import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { verifyCredentials, issueSession, AUTH_COOKIE } from "@/lib/auth";
import { checkRateLimit, LIMITS, requestKey } from "@/lib/rate-limit";
import { err, validationError, handleRouteError } from "@/lib/errors";
import { audit } from "@/lib/audit";

const Body = z.object({
  user: z.string().min(1).max(64),
  pass: z.string().min(1).max(256),
});

export async function POST(req: NextRequest) {
  // Rate limit by IP — protects against credential stuffing
  try {
    const rl = await checkRateLimit(requestKey(req, "auth-login"), LIMITS.auth);
    if (!rl.allowed) return err("Demasiados intentos — espera un momento", 429, "RATE_LIMITED");
  } catch {
    // Redis unavailable — fail-open, but log
    console.warn("[auth/login] rate limit unavailable");
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    if (e instanceof ZodError) return validationError(e);
    return handleRouteError(e);
  }

  // Constant-time check inside verifyCredentials (bcrypt is constant-time)
  const ok = await verifyCredentials(body.user, body.pass);
  if (!ok) {
    await audit({ action: "auth.login.fail", entity: "session", req, meta: { user: body.user } });
    // Generic error — never leak which field was wrong
    return err("Credenciales inválidas", 401, "INVALID_CREDENTIALS");
  }

  const token = await issueSession(body.user);
  await audit({ action: "auth.login.success", entity: "session", entityId: body.user, req });

  const res = NextResponse.json({ ok: true, user: body.user });
  res.cookies.set(AUTH_COOKIE.name, token, AUTH_COOKIE.options);
  return res;
}
