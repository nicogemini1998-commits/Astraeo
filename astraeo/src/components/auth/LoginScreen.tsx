"use client";
import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAstraeo } from "@/store/astraeo";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const GOLD = "#B8A06A";

export default function LoginScreen() {
  const { login } = useAstraeo();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || success) return;
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: user.trim(), pass }),
      });

      if (res.ok) {
        // Server validated → reflect in client store for routing/UI gates
        login(user.trim(), pass); // best-effort client-side mirror
        setSuccess(true);
        return;
      }

      if (res.status === 429) {
        setErr("Demasiados intentos — espera unos segundos");
      } else {
        setErr("Credenciales inválidas");
      }
    } catch {
      // Server unreachable — graceful fallback to client-side check so the
      // dashboard remains usable in dev / offline. In production behind real
      // auth this fallback should be removed.
      const ok = login(user.trim(), pass);
      if (ok) { setSuccess(true); return; }
      setErr("No se pudo verificar — revisa la red");
    } finally {
      if (!success) setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {!success && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: EASE } }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--bg-base)",
            overflow: "hidden",
          }}
        >
          {/* Background gradient orbs */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: EASE }}
            style={{
              position: "absolute", top: "20%", left: "10%",
              width: 420, height: 420, borderRadius: "50%",
              background: `radial-gradient(circle, ${GOLD}14 0%, transparent 70%)`,
              filter: "blur(40px)", pointerEvents: "none",
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.15, ease: EASE }}
            style={{
              position: "absolute", bottom: "15%", right: "8%",
              width: 360, height: 360, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(122,48,64,0.08) 0%, transparent 70%)",
              filter: "blur(50px)", pointerEvents: "none",
            }}
          />

          {/* Subtle grain */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)",
          }} />

          {/* Login card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={mounted ? { opacity: 1, y: 0, scale: 1 } : undefined}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
            style={{
              position: "relative", width: "min(420px, 90vw)",
              padding: "44px 38px",
              borderRadius: 20,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px ${GOLD}10`,
              zIndex: 1,
            }}
          >
            {/* Top accent gradient */}
            <div style={{
              position: "absolute", top: 0, left: "20%", right: "20%",
              height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD}80, transparent)`,
            }} />

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
              style={{
                width: 56, height: 56, margin: "0 auto 22px",
                borderRadius: 14,
                background: `linear-gradient(135deg, ${GOLD}1A 0%, ${GOLD}05 100%)`,
                border: `1px solid ${GOLD}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28">
                <motion.polygon
                  points="14,2 26,9 26,19 14,26 2,19 2,9"
                  fill="none"
                  stroke={GOLD}
                  strokeWidth="1.5"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.2, delay: 0.5, ease: EASE }}
                />
                <motion.circle
                  cx="14" cy="14" r="3"
                  fill={GOLD}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4, delay: 1.4, ease: EASE }}
                />
              </svg>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
              style={{ textAlign: "center", marginBottom: 32 }}
            >
              <p style={{
                fontSize: 9, letterSpacing: "0.32em", textTransform: "uppercase",
                color: "var(--text-muted)", fontFamily: "var(--font-mono)",
                marginBottom: 8, fontWeight: 600,
              }}>
                Mision Control · v2
              </p>
              <h1 style={{
                fontSize: 28, fontFamily: "var(--font-display)", fontWeight: 500,
                color: "var(--text-primary)", letterSpacing: "-0.01em",
                lineHeight: 1.1,
              }}>
                Bienvenido
              </h1>
              <p style={{
                fontSize: 12, color: "var(--text-muted)", marginTop: 8,
              }}>
                Acceso al sistema de agentes
              </p>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.65, ease: EASE }}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{
                  fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em",
                  fontWeight: 600, textTransform: "uppercase",
                }}>
                  Usuario
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={user}
                  onChange={(e) => { setUser(e.target.value); setErr(null); }}
                  disabled={loading}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 10,
                    background: "var(--bg-base)",
                    border: `1px solid ${err ? "rgba(122,48,64,0.4)" : "var(--border-subtle)"}`,
                    color: "var(--text-primary)", fontSize: 13, outline: "none",
                    fontFamily: "inherit", boxSizing: "border-box",
                    transition: "border-color 0.18s",
                  }}
                  placeholder="nicolas"
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{
                  fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em",
                  fontWeight: 600, textTransform: "uppercase",
                }}>
                  Contraseña
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={pass}
                  onChange={(e) => { setPass(e.target.value); setErr(null); }}
                  disabled={loading}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 10,
                    background: "var(--bg-base)",
                    border: `1px solid ${err ? "rgba(122,48,64,0.4)" : "var(--border-subtle)"}`,
                    color: "var(--text-primary)", fontSize: 13, outline: "none",
                    fontFamily: "inherit", boxSizing: "border-box",
                    transition: "border-color 0.18s",
                  }}
                  placeholder="••••••••"
                />
              </div>

              <AnimatePresence>
                {err && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      padding: "8px 12px", borderRadius: 8,
                      background: "rgba(122,48,64,0.08)",
                      border: "1px solid rgba(122,48,64,0.25)",
                      color: "#A85060", fontSize: 11, fontWeight: 500,
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 13 }}>⚠</span>
                    {err}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={loading || !user || !pass}
                style={{
                  marginTop: 6, padding: "12px 0", borderRadius: 10,
                  background: loading
                    ? `${GOLD}20`
                    : `linear-gradient(135deg, ${GOLD} 0%, #A89058 100%)`,
                  border: `1px solid ${GOLD}50`,
                  color: loading ? GOLD : "#0A0908",
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  cursor: loading || !user || !pass ? "not-allowed" : "pointer",
                  opacity: !user || !pass ? 0.55 : 1,
                  transition: "all 0.18s",
                  fontFamily: "inherit",
                }}
              >
                {loading ? (
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    Verificando…
                  </motion.span>
                ) : "Iniciar sesión"}
              </motion.button>
            </motion.form>

            {/* Bottom hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.85 }}
              style={{
                fontSize: 9, color: "var(--text-muted)",
                textAlign: "center", marginTop: 24,
                letterSpacing: "0.12em", textTransform: "uppercase",
                fontFamily: "var(--font-mono)",
              }}
            >
              Acceso restringido · Sistema seguro
            </motion.p>
          </motion.div>

          {/* Success transition flash */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
                style={{
                  position: "absolute", inset: 0, zIndex: 10,
                  background: `radial-gradient(circle at center, ${GOLD}30 0%, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
