"use client";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAstraeo } from "@/store/astraeo";
import type { AppSettings } from "@/lib/types";
import type { Section } from "@/components/settings/types";
import {
  SectionCard, FieldGroup, ToggleRow, SliderField, SegmentedControl, DangerRow,
  INPUT, SELECT, GHOST, DANGER_BTN, EASE,
} from "@/components/settings/SettingsComponents";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODELS = [
  { id: "claude-haiku-4-5-20251001", icon: "◇", label: "Haiku 4.5",  sub: "Rápido · Económico",        badge: "#7A8A7A", speed: 3, cost: 1 },
  { id: "claude-sonnet-4-6",         icon: "◈", label: "Sonnet 4.6", sub: "Balanceado · Recomendado",  badge: "#B8A06A", speed: 2, cost: 2 },
  { id: "claude-opus-4-7",           icon: "◎", label: "Opus 4.7",   sub: "Máxima inteligencia",        badge: "#8A7070", speed: 1, cost: 3 },
] as const;

type ApiStatus = "idle" | "verifying" | "valid" | "invalid";

const INDUSTRIES = [
  "Consultoría", "Tecnología", "Marketing", "E-commerce",
  "SaaS", "Fintech", "Retail", "Salud", "Educación", "Otro",
];

// ─── Unified palette — no neon, everything near-black with single gold accent ──
const GOLD = "#B8A06A";
const MUTED_GOLD = "#8A7855";
const CRIMSON = "#7A3040";

const NAV: { id: Section; label: string; icon: string; color: string }[] = [
  { id: "perfil",         label: "Perfil",           icon: "◉",  color: GOLD },
  { id: "ia",             label: "IA & API",          icon: "◈",  color: GOLD },
  { id: "agentes",        label: "Agentes",           icon: "⬡",  color: GOLD },
  { id: "empresa",        label: "Empresa",           icon: "◎",  color: GOLD },
  { id: "interfaz",       label: "Interfaz",          icon: "◇",  color: GOLD },
  { id: "notificaciones", label: "Notificaciones",    icon: "◌",  color: GOLD },
  { id: "privacidad",     label: "Privacidad",        icon: "◐",  color: GOLD },
  { id: "peligro",        label: "Zona de Peligro",   icon: "△",  color: CRIMSON },
];

const COMPANY_DEFAULT = `CLIENDER — Consultora Tecnológica de Ventas
Ubicación: Puerto de Sagunto (Valencia, España) | Equipo: ~12 profesionales

MISIÓN: Reconstruye sistemas de ventas completos para empresas con mínimo 5 empleados, estructura comercial activa y capacidad de inversión.

TRES PILARES:
1. Captación — Meta Ads, Google Ads, optimización de CPL, creatividades IA.
2. Sistema comercial — CRM Go High Level, WhatsApp/email automation, flujos de cualificación.
3. Visibilidad digital — SEO, redes sociales, web, reputación online.`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const {
    settings, updateSettings, integrations,
    connectIntegration, showToast, chatSessions,
  } = useAstraeo();

  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const [active, setActive] = useState<Section>("perfil");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("idle");
  const [verifying, setVerifying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [brandTag, setBrandTag] = useState("");
  const refs = useRef<Partial<Record<Section, HTMLElement>>>({});

  const isDirty = JSON.stringify(local) !== JSON.stringify(settings);
  const claudeIntg = integrations.find((i) => i.id === "int-1");
  const ctxLen = (local.companyContext ?? "").length;

  const patch = useCallback(<K extends keyof AppSettings>(k: K, v: AppSettings[K]) => {
    setLocal((s) => ({ ...s, [k]: v }));
  }, []);

  const handleSave = async () => {
    updateSettings(local);
    if (local.claudeApiKey && local.claudeApiKey !== settings.claudeApiKey) {
      connectIntegration("int-1", local.claudeApiKey);
    }
    try {
      const { claudeApiKey: _k, ...payload } = local;
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch { /* non-fatal — settings still saved locally */ }
    setSaved(true);
    showToast("Ajustes guardados correctamente", "success");
    setTimeout(() => setSaved(false), 2500);
  };

  const verifyApiKey = async () => {
    if (!local.claudeApiKey) return;
    setVerifying(true);
    setApiStatus("verifying");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "hola" }],
          systemPrompt: "Responde solo con ok.",
          model: "claude-haiku-4-5-20251001",
          apiKey: local.claudeApiKey,
        }),
      });
      setApiStatus(res.ok ? "valid" : "invalid");
      showToast(res.ok ? "API key verificada ✓" : "API key inválida", res.ok ? "success" : "error");
    } catch {
      setApiStatus("invalid");
      showToast("No se pudo contactar el servidor", "error");
    } finally {
      setVerifying(false);
    }
  };

  const scrollTo = (id: Section) => {
    setActive(id);
    refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const exportConfig = () => {
    const { claudeApiKey: _omit, ...safe } = local;
    const blob = new Blob([JSON.stringify({ settings: safe }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `astraeo-config-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Configuración exportada (sin API key)", "success");
  };

  const clearConversations = () => {
    const store = useAstraeo.getState();
    chatSessions.forEach((s) => store.deleteChat(s.id));
    showToast("Conversaciones eliminadas", "info");
    setClearConfirm(false);
  };

  const restoreDemo = () => {
    localStorage.removeItem("astraeo-store");
    window.location.reload();
  };

  const addBrandTag = (tag: string) => {
    const t = tag.trim();
    if (t && !(local.brandValues ?? []).includes(t)) {
      patch("brandValues", [...(local.brandValues ?? []), t]);
    }
    setBrandTag("");
  };

  const apiMeta = {
    idle:      { color: claudeIntg?.connected ? GOLD : "var(--text-muted)", label: claudeIntg?.connected ? "Conectada" : "No configurada", bg: claudeIntg?.connected ? `${GOLD}10` : "rgba(74,85,104,0.08)" },
    verifying: { color: MUTED_GOLD, label: "Verificando...", bg: `${MUTED_GOLD}10` },
    valid:     { color: GOLD,       label: "Verificada ✓",   bg: `${GOLD}10` },
    invalid:   { color: CRIMSON,    label: "Inválida ✗",     bg: `${CRIMSON}10` },
  }[apiStatus];

  const ref = (id: Section) => (el: HTMLElement | null) => { if (el) refs.current[id] = el; };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Sidebar nav ───────────────────────────────────────────────────── */}
      <aside style={{ width: 220, flexShrink: 0, borderRight: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", padding: "20px 0" }}>
        <div style={{ padding: "0 16px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
          <p style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Sistema</p>
          <h2 style={{ fontSize: 20, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "0.01em" }}>Configuración</h2>
        </div>

        <nav style={{ flex: 1, padding: "8px 8px 0", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          {NAV.map((sec) => {
            const on = active === sec.id;
            return (
              <motion.button key={sec.id} onClick={() => scrollTo(sec.id)} whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: `1px solid ${on ? sec.color + "28" : "transparent"}`, background: on ? `${sec.color}0D` : "transparent", color: on ? sec.color : "var(--text-muted)", fontSize: 12, fontWeight: on ? 600 : 500, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                <span style={{ fontSize: 14, opacity: on ? 1 : 0.7 }}>{sec.icon}</span>
                <span>{sec.label}</span>
                {on && <motion.div layoutId="nav-dot" style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: sec.color }} />}
              </motion.button>
            );
          })}
        </nav>

        <div style={{ padding: "12px 8px 0", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={() => setLocal({ ...settings })} style={{ ...GHOST, width: "100%", textAlign: "center" as const }}>Descartar</button>
          <motion.button
            onClick={handleSave}
            whileTap={{ scale: 0.96 }}
            style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${saved ? `${GOLD}50` : isDirty ? `${GOLD}35` : "transparent"}`, background: saved ? `${GOLD}14` : isDirty ? `${GOLD}0E` : `${GOLD}04`, color: saved ? GOLD : isDirty ? GOLD : "var(--text-muted)", fontSize: 11, fontWeight: 600, cursor: "pointer", width: "100%", transition: "all 0.2s" }}
          >
            {saved ? "✓ Guardado" : isDirty ? "Guardar cambios" : "Sin cambios"}
          </motion.button>
        </div>
      </aside>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px", position: "relative" }}>
        <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 20, paddingBottom: 80 }}>

          {/* ── PERFIL ──────────────────────────────────────────────────── */}
          <SectionCard id="perfil" title="Perfil" icon="◉" color={GOLD} refCallback={ref("perfil")}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FieldGroup label="Nombre de usuario">
                <input style={INPUT} placeholder="Comandante" value={local.userName} onChange={(e) => patch("userName", e.target.value)} />
              </FieldGroup>
              <FieldGroup label="Rol / Título">
                <input style={INPUT} placeholder="Admin Level 5" value={local.userRole} onChange={(e) => patch("userRole", e.target.value)} />
              </FieldGroup>
            </div>
            <FieldGroup label="Idioma de la interfaz">
              <SegmentedControl
                options={[{ value: "es" as const, label: "Español" }, { value: "en" as const, label: "English" }]}
                value={local.language as "es" | "en"}
                onChange={(v) => patch("language", v)}
                color={GOLD}
              />
            </FieldGroup>
            <FieldGroup label="Zona horaria" hint="Detectada automáticamente del sistema">
              <div style={{ ...INPUT, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12 }}>{local.timezone || "Europe/Madrid"}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>UTC+2</span>
              </div>
            </FieldGroup>
          </SectionCard>

          {/* ── IA & API ────────────────────────────────────────────────── */}
          <SectionCard id="ia" title="IA & API" icon="◈" color={GOLD} badge="Principal" refCallback={ref("ia")}>
            <FieldGroup label="Claude API Key">
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    style={{ ...INPUT, paddingRight: 40 }}
                    type={apiKeyVisible ? "text" : "password"}
                    placeholder="sk-ant-api03-..."
                    value={local.claudeApiKey}
                    onChange={(e) => { patch("claudeApiKey", e.target.value); setApiStatus("idle"); }}
                  />
                  <button onClick={() => setApiKeyVisible((v) => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, padding: 0 }}>
                    {apiKeyVisible ? "◑" : "◐"}
                  </button>
                </div>
                <motion.button onClick={verifyApiKey} disabled={!local.claudeApiKey || verifying} whileTap={{ scale: 0.95 }} style={{ padding: "0 16px", borderRadius: 8, border: `1px solid ${GOLD}30`, background: `${GOLD}0C`, color: GOLD, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", opacity: !local.claudeApiKey || verifying ? 0.4 : 1 }}>
                  {verifying ? "···" : "Verificar"}
                </motion.button>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={apiStatus} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: apiMeta.bg, border: `1px solid ${apiMeta.color}28`, width: "fit-content" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: apiMeta.color, display: "inline-block" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: apiMeta.color }}>{apiMeta.label}</span>
                </motion.div>
              </AnimatePresence>
            </FieldGroup>

            <FieldGroup label="Modelo predeterminado">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {MODELS.map((m) => {
                  const sel = local.claudeModel === m.id;
                  return (
                    <motion.button key={m.id} onClick={() => patch("claudeModel", m.id)} whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.995 }} style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${sel ? m.badge + "45" : "var(--border-subtle)"}`, background: sel ? `${m.badge}09` : "var(--bg-base)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s" }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{m.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{m.label}</span>
                          {sel && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${m.badge}20`, color: m.badge, fontWeight: 700, letterSpacing: "0.06em" }}>ACTIVO</motion.span>}
                        </div>
                        <p style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.sub}</p>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ display: "flex", gap: 3 }}>
                          {[1, 2, 3].map((d) => <div key={d} style={{ width: 7, height: 7, borderRadius: 2, background: d <= m.speed ? m.badge : "var(--border-subtle)" }} />)}
                        </div>
                        <div style={{ display: "flex", gap: 3 }}>
                          {[1, 2, 3].map((d) => <div key={d} style={{ width: 7, height: 7, borderRadius: 2, background: d <= m.cost ? "rgba(255,71,87,0.5)" : "var(--border-subtle)" }} />)}
                        </div>
                      </div>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${sel ? m.badge : "var(--border-subtle)"}`, background: sel ? m.badge : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                        {sel && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </FieldGroup>

            <FieldGroup label="Comportamiento del sistema">
              <SegmentedControl
                options={[{ value: "precise" as const, label: "Preciso" }, { value: "balanced" as const, label: "Equilibrado" }, { value: "creative" as const, label: "Creativo" }]}
                value={local.systemBehavior}
                onChange={(v) => patch("systemBehavior", v)}
                color={GOLD}
              />
            </FieldGroup>

            <SliderField label="Temperatura" value={local.temperature ?? 0.7} min={0} max={1} step={0.1} color={GOLD} onChange={(v) => patch("temperature", v)} formatValue={(v) => (v ?? 0).toFixed(1)} />
            <SliderField label="Tokens máximos" value={local.maxTokens ?? 4096} min={512} max={8192} step={256} color={GOLD} onChange={(v) => patch("maxTokens", v)} />
            <ToggleRow label="Streaming" sub="Respuestas en tiempo real, token a token" value={local.streamingEnabled ?? true} onChange={(v) => patch("streamingEnabled", v)} color={GOLD} />
          </SectionCard>

          {/* ── AGENTES ─────────────────────────────────────────────────── */}
          <SectionCard id="agentes" title="Agentes" icon="⬡" color={GOLD} refCallback={ref("agentes")}>
            <SliderField label="Tiempo límite por agente" value={local.agentTimeout ?? 60} min={10} max={300} step={10} color={GOLD} onChange={(v) => patch("agentTimeout", v)} formatValue={(v) => `${v}s`} />
            <SliderField label="Reintentos por fallo" value={local.agentRetries ?? 2} min={0} max={5} step={1} color={GOLD} onChange={(v) => patch("agentRetries", v)} />
            <SliderField label="Agentes concurrentes" value={local.maxConcurrentAgents ?? 3} min={1} max={10} step={1} color={GOLD} onChange={(v) => patch("maxConcurrentAgents", v)} />
            <SliderField label="Retención de memoria" value={local.memoryRetentionDays ?? 30} min={1} max={365} step={1} color={GOLD} onChange={(v) => patch("memoryRetentionDays", v)} formatValue={(v) => v === 365 ? "∞ días" : `${v} días`} />
            <ToggleRow label="Guardar memoria automáticamente" sub="Los agentes almacenan el contexto de cada conversación" value={local.autoSaveMemory ?? true} onChange={(v) => patch("autoSaveMemory", v)} color={GOLD} />
          </SectionCard>

          {/* ── EMPRESA ─────────────────────────────────────────────────── */}
          <SectionCard id="empresa" title="Empresa" icon="◎" color={GOLD} badge="Inyectado en todos los agentes" refCallback={ref("empresa")}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FieldGroup label="Nombre de empresa">
                <input style={INPUT} placeholder="CLIENDER" value={local.companyName} onChange={(e) => patch("companyName", e.target.value)} />
              </FieldGroup>
              <FieldGroup label="Industria">
                <select style={SELECT} value={local.companyIndustry} onChange={(e) => patch("companyIndustry", e.target.value)}>
                  {INDUSTRIES.map((i) => <option key={i} value={i.toLowerCase()}>{i}</option>)}
                </select>
              </FieldGroup>
            </div>

            <FieldGroup label="Descripción completa de la empresa">
              <textarea
                style={{ ...INPUT, resize: "none", lineHeight: 1.7, fontFamily: "var(--font-mono)", fontSize: 11, minHeight: 180 } as React.CSSProperties}
                rows={9}
                placeholder="Describe la empresa, misión, productos, metodología..."
                value={local.companyContext ?? ""}
                onChange={(e) => { if (e.target.value.length <= 2000) patch("companyContext", e.target.value); }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <span style={{ fontSize: 10, color: ctxLen > 1800 ? "#B88530" : "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{ctxLen}/2000</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => patch("companyContext", COMPANY_DEFAULT)} style={{ ...GHOST, padding: "3px 10px", fontSize: 10 }}>Restaurar default</button>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, animation: "pulse 2s infinite" }} />
                    <span style={{ fontSize: 10, color: GOLD, fontWeight: 600 }}>Activo en agentes</span>
                  </div>
                </div>
              </div>
            </FieldGroup>

            <FieldGroup label="Valores de marca">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6, minHeight: 28 }}>
                <AnimatePresence>
                  {(local.brandValues ?? []).map((tag) => (
                    <motion.span key={tag} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: `${GOLD}0C`, border: `1px solid ${GOLD}25`, color: GOLD, fontSize: 11, fontWeight: 500 }}>
                      {tag}
                      <button onClick={() => patch("brandValues", (local.brandValues ?? []).filter((t) => t !== tag))} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(61,138,96,0.5)", fontSize: 10, padding: 0, lineHeight: 1 }}>✕</button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...INPUT, flex: 1 }} placeholder="Añadir valor de marca..." value={brandTag} onChange={(e) => setBrandTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBrandTag(brandTag); } }} />
                <button onClick={() => addBrandTag(brandTag)} style={{ ...GHOST, color: GOLD, borderColor: `${GOLD}30`, background: `${GOLD}08` }}>+</button>
              </div>
            </FieldGroup>
          </SectionCard>

          {/* ── INTERFAZ ────────────────────────────────────────────────── */}
          <SectionCard id="interfaz" title="Interfaz" icon="◇" color={GOLD} refCallback={ref("interfaz")}>
            <FieldGroup label="Tema de color">
              <SegmentedControl
                options={[{ value: "dark" as const, label: "Oscuro" }, { value: "light" as const, label: "Claro" }]}
                value={local.theme ?? "dark"}
                onChange={(v) => patch("theme", v)}
                color={GOLD}
              />
            </FieldGroup>
            <FieldGroup label="Tamaño de fuente">
              <SegmentedControl
                options={[{ value: "small" as const, label: "Pequeña" }, { value: "normal" as const, label: "Normal" }, { value: "large" as const, label: "Grande" }]}
                value={local.fontSize ?? "normal"}
                onChange={(v) => patch("fontSize", v)}
                color={GOLD}
              />
            </FieldGroup>
            <FieldGroup label="Velocidad de animación">
              <SegmentedControl
                options={[{ value: "fast" as const, label: "Rápida" }, { value: "normal" as const, label: "Normal" }, { value: "slow" as const, label: "Lenta" }]}
                value={local.animationSpeed ?? "normal"}
                onChange={(v) => patch("animationSpeed", v)}
                color={GOLD}
              />
            </FieldGroup>
            <SliderField label="Densidad del starfield" value={local.starfieldDensity ?? 80} min={20} max={200} step={10} color={GOLD} onChange={(v) => patch("starfieldDensity", v)} />
            <ToggleRow label="Modo compacto" sub="Reduce el espaciado para mayor densidad de información" value={local.compactMode ?? false} onChange={(v) => patch("compactMode", v)} color={GOLD} />
            <ToggleRow label="Sidebar colapsado" sub="Panel lateral minimizado por defecto al iniciar" value={local.sidebarCollapsed ?? false} onChange={(v) => patch("sidebarCollapsed", v)} color={GOLD} />
          </SectionCard>

          {/* ── NOTIFICACIONES ──────────────────────────────────────────── */}
          <SectionCard id="notificaciones" title="Notificaciones" icon="◌" color={GOLD} refCallback={ref("notificaciones")}>
            <ToggleRow label="Notificaciones del sistema" sub="Alertas, errores y eventos críticos de la plataforma" value={local.notifications ?? true} onChange={(v) => patch("notifications", v)} color={GOLD} />
            <ToggleRow label="Efectos de sonido" sub="Sonidos para eventos importantes y acciones del sistema" value={local.soundEffects ?? false} onChange={(v) => patch("soundEffects", v)} color={GOLD} />
            <ToggleRow label="Agente completado" sub="Notificar cuando un agente termina su tarea" value={local.notifyOnAgentComplete ?? true} onChange={(v) => patch("notifyOnAgentComplete", v)} color={GOLD} />
            <ToggleRow label="Errores críticos" sub="Alertas inmediatas ante fallos o errores graves" value={local.notifyOnError ?? true} onChange={(v) => patch("notifyOnError", v)} color={GOLD} />
            <ToggleRow label="Workflow finalizado" sub="Notificación al completar una ejecución de workflow" value={local.notifyOnWorkflowEnd ?? true} onChange={(v) => patch("notifyOnWorkflowEnd", v)} color={GOLD} />
          </SectionCard>

          {/* ── PRIVACIDAD ──────────────────────────────────────────────── */}
          <SectionCard id="privacidad" title="Privacidad & Datos" icon="◐" color={GOLD} refCallback={ref("privacidad")}>
            <ToggleRow label="Analytics de uso" sub="Enviar datos anónimos para mejorar la plataforma" value={local.analyticsEnabled ?? false} onChange={(v) => patch("analyticsEnabled", v)} color={GOLD} />
            <ToggleRow label="Actualizaciones en tiempo real" sub="Métricas y estado se actualizan automáticamente cada 3s" value={local.realtimeUpdates ?? true} onChange={(v) => patch("realtimeUpdates", v)} color={GOLD} />
            <FieldGroup label="URL de Webhook" hint="Endpoint para recibir eventos de la plataforma en tiempo real">
              <input style={INPUT} placeholder="https://hooks.example.com/astraeo" value={local.webhookUrl ?? ""} onChange={(e) => patch("webhookUrl", e.target.value)} />
            </FieldGroup>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: `${GOLD}04`, border: `1px solid ${GOLD}14` }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.65 }}>
                Las API keys se almacenan localmente en tu navegador. Nunca se transmiten a servidores de terceros excepto al hacer llamadas directas a la API de Anthropic.
              </p>
            </div>
          </SectionCard>

          {/* ── ZONA DE PELIGRO ─────────────────────────────────────────── */}
          <SectionCard id="peligro" title="Zona de Peligro" icon="△" color={CRIMSON} danger refCallback={ref("peligro")}>
            <DangerRow title="Limpiar conversaciones" desc={`Elimina permanentemente las ${chatSessions.length} conversaciones del historial. Esta acción no se puede deshacer.`}>
              <AnimatePresence mode="wait">
                {clearConfirm ? (
                  <motion.div key="c" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setClearConfirm(false)} style={GHOST}>Cancelar</button>
                    <button onClick={clearConversations} style={DANGER_BTN}>Confirmar</button>
                  </motion.div>
                ) : (
                  <motion.button key="t" onClick={() => setClearConfirm(true)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={DANGER_BTN}>Limpiar</motion.button>
                )}
              </AnimatePresence>
            </DangerRow>

            <DangerRow title="Restaurar datos de demo" desc="Recarga todos los datos semilla originales. Se perderán los cambios no guardados.">
              <AnimatePresence mode="wait">
                {restoreConfirm ? (
                  <motion.div key="rc" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", gap: 6 }}>
                    <button onClick={restoreDemo} style={{ ...GHOST, borderColor: "rgba(184,133,48,0.5)", color: "#B88530", background: "rgba(184,133,48,0.1)" }}>✓ Confirmar</button>
                    <button onClick={() => setRestoreConfirm(false)} style={GHOST}>Cancelar</button>
                  </motion.div>
                ) : (
                  <motion.button key="rb" onClick={() => setRestoreConfirm(true)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ ...GHOST, borderColor: "rgba(184,133,48,0.4)", color: "#B88530", background: "rgba(184,133,48,0.06)" }}>Restaurar demo</motion.button>
                )}
              </AnimatePresence>
            </DangerRow>

            <DangerRow title="Exportar configuración" desc="Descarga todos los ajustes actuales como archivo JSON para respaldo o migración (sin API key).">
              <button onClick={exportConfig} style={GHOST}>↑ Exportar JSON</button>
            </DangerRow>
          </SectionCard>

        </div>

        {/* ── Floating save bar ────────────────────────────────────────── */}
        <AnimatePresence>
          {isDirty && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.22, ease: EASE }}
              style={{ position: "sticky", bottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderRadius: 14, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", boxShadow: "0 8px 32px rgba(0,0,0,0.35)", backdropFilter: "blur(12px)", maxWidth: 680 }}
            >
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Tienes cambios sin guardar</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setLocal({ ...settings })} style={GHOST}>Descartar</button>
                <motion.button onClick={handleSave} whileTap={{ scale: 0.96 }} style={{ padding: "7px 20px", borderRadius: 8, border: `1px solid ${GOLD}40`, background: `${GOLD}14`, color: GOLD, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Guardar cambios
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
