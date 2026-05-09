import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getSessionFromCookies } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (session) {
    await audit({ action: "auth.logout", entity: "session", entityId: session.sub, req });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE.name, "", { ...AUTH_COOKIE.options, maxAge: 0 });
  return res;
}
