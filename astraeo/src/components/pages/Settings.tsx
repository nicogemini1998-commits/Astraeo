"use client";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAstraeo } from "@/store/astraeo";
import type { AppSettings } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────────

const MODELS = [
  {
    id: "claude-haiku-4-5-20251001",
    icon: "🌿",
    label: "Claude Haiku 4.5",
    sub: "Rápido · Económico",
    desc: "Respuestas rápidas, agentes frecuentes",
    badge: "#3D8A60",
    speedDots: 3,
    costDots: 1,
  },
  {
    id: "claude-sonnet-4-6",
    icon: "⚡",
    label: "Claude Sonnet 4.6",
    sub: "Balanceado · Recomendado",
    desc: "Tareas generales, desarrollo, análisis",
    badge: "#4A8EB8",
    speedDots: 2,
    costDots: 2,
  },
  {
    id: "claude-opus-4-7",
    icon: "🔮",
    label: "Claude Opus 4.7",
    sub: "Máxima inteligencia",
    desc: "Razonamiento profundo, análisis complejo",
    badge: "#CC785C",
    speedDots: 1,
    costDots: 3,
  },
] as const;

type ModelId = (typeof MODELS)[number]["id"];

const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];

const ANIMATION_SPEEDS = [
  { value: "fast", label: "Rápida" },
  { value: "normal", label: "Normal" },
  { value: "slow", label: "Lenta" },
];

type Section = "general" | "api" | "appearance" | "security" | "context" | "danger";

const NAV_SECTIONS: { id: Section; label: string; icon: string; color: string }[] = [
  { id: "general",    label: "General",         icon: "◉",  color: "#4A8EB8" },
  { id: "api",        label: "IA / API",         icon: "🤖", color: "#CC785C" },
  { id: "appearance", label: "Apariencia",       icon: "◈",  color: "#B04858" },
  { id: "security",   label: "Seguridad",        icon: "⬡",  color: "#6655CC" },
  { id: "context",    label: "Contexto Empresa", icon: "🏢", color: "#3D8A60" },
  { id: "danger",     label: "Zona de Peligro",  icon: "⚠",  color: "#A83C50" },
];

type ApiStatus = "idle" | "verifying" | "valid" | "invalid";

const COMPANY_DEFAULT = `CLIENDER — Consultora Tecnológica de Ventas
Ubicación: Puerto de Sagunto (Valencia, España) | Equipo: ~12 profesionales

MISIÓN: Reconstruye sistemas de ventas completos para empresas con mínimo 5 empleados, estructura comercial activa y capacidad de inversión.

TRES PILARES:
1. Captación de clientes — Meta Ads, Google Ads, optimización de CPL, creatividades IA.
2. Sistema comercial — CRM Go High Level, WhatsApp/email automation, flujos de cualificación.
3. Visibilidad digital — SEO, redes sociales, web, reputación online.`;

// ── Main component ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const {
    settings, updateSettings, integrations,
    connectIntegration, showToast, chatSessions,
  } = useAstraeo();

  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [activeSection, setActiveSection] = useState<Section>("general");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("idle");
  const [verifying, setVerifying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [brandTag, setBrandTag] = useState("");
  const [brandTags, setBrandTags] = useState<string[]>(["Precisión", "Resultados", "Automatización"]);

  const sectionRefs = useRef<Partial<Record<Section, HTMLElement>>>({});
  const claudeIntg = integrations.find((i) => i.id === "int-1");
  const companyLen = (localSettings.companyContext ?? "").length;

  const patch = useCallback(
    (p: Partial<AppSettings>) => setLocalSettings((s) => ({ ...s, ...p })),
    []
  );

  const handleSave = () => {
    updateSettings(localSettings);
    if (localSettings.claudeApiKey && localSettings.claudeApiKey !== settings.claudeApiKey) {
      connectIntegration("int-1", localSettings.claudeApiKey);
    }
    setSaved(true);
    showToast("Ajustes guardados correctamente", "success");
    setTimeout(() => setSaved(false), 2500);
  };

  const verifyApiKey = async () => {
    if (!localSettings.claudeApiKey) return;
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
          apiKey: localSettings.claudeApiKey,
        }),
      });
      if (res.ok) {
        setApiStatus("valid");
        showToast("API key verificada correctamente ✓", "success");
      } else {
        setApiStatus("invalid");
        showToast("API key inválida — revisa el valor", "error");
      }
    } catch {
      setApiStatus("invalid");
      showToast("No se pudo contactar el servidor", "error");
    } finally {
      setVerifying(false);
    }
  };

  const scrollToSection = (id: Section) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const exportConfig = () => {
    const data = JSON.stringify({ settings: localSettings }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `astraeo-config-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Configuración exportada", "success");
  };

  const clearConversations = () => {
    const store = useAstraeo.getState();
    chatSessions.forEach((s) => store.deleteChat(s.id));
    showToast("Todas las conversaciones eliminadas", "info");
    setClearConfirm(false);
  };

  const restoreDemo = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("astraeo-store");
      window.location.reload();
    }
  };

  const addBrandTag = () => {
    const trimmed = brandTag.trim();
    if (trimmed && !brandTags.includes(trimmed)) {
      setBrandTags((prev) => [...prev, trimmed]);
    }
    setBrandTag("");
  };

  const removeBrandTag = (tag: string) => {
    setBrandTags((prev) => prev.filter((t) => t !== tag));
  };

  const apiStatusMeta = {
    idle: {
      color: claudeIntg?.connected ? "#3D8A60" : "#4A5568",
      label: claudeIntg?.connected ? "Conectada" : "No configurada",
      bg: claudeIntg?.connected ? "rgba(0,229,160,0.08)" : "rgba(74,85,104,0.08)",
    },
    verifying: { color: "#B88530", label: "Verificando...", bg: "rgba(255,184,0,0.08)" },
    valid:     { color: "#3D8A60", label: "Verificada ✓",  bg: "rgba(0,229,160,0.08)" },
    invalid:   { color: "#A83C50", label: "Inválida ✗",    bg: "rgba(255,71,87,0.08)" },
  };

  const currentApiMeta = apiStatusMeta[apiStatus];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Sidebar nav ─────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: "1px solid rgba(26,39,68,0.6)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 0",
        }}
      >
        {/* Header */}
        <div style={{ padding: "0 16px 16px" }}>
          <p style={{ fontSize: 11, color: "#4A5568", fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Sistema
          </p>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#F0EDE6", marginTop: 2, letterSpacing: "-0.01em" }}>
            Configuración
          </h2>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_SECTIONS.map((sec) => {
            const active = activeSection === sec.id;
            return (
              <motion.button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: `1px solid ${active ? sec.color + "28" : "transparent"}`,
                  background: active ? `${sec.color}0D` : "transparent",
                  color: active ? sec.color : "#8A8A97",
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 14, opacity: active ? 1 : 0.7 }}>{sec.icon}</span>
                <span>{sec.label}</span>
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    style={{
                      marginLeft: "auto",
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: sec.color,
                    }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Save controls */}
        <div style={{ padding: "12px 8px 0", borderTop: "1px solid rgba(26,39,68,0.5)", display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            onClick={() => setLocalSettings({ ...settings })}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(26,39,68,0.7)",
              background: "transparent",
              color: "#8A8A97",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Restaurar
          </button>
          <motion.button
            onClick={handleSave}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid rgba(0,212,255,0.3)",
              background: saved ? "rgba(0,229,160,0.15)" : "rgba(0,212,255,0.1)",
              color: saved ? "#3D8A60" : "#4A8EB8",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
              transition: "all 0.2s",
            }}
          >
            {saved ? "✓ Guardado" : "Guardar cambios"}
          </motion.button>
        </div>
      </aside>

      {/* ── Scrollable content ───────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 20, paddingBottom: 48 }}>

          {/* ── GENERAL ─────────────────────────────────────────────────────── */}
          <SectionCard
            id="general"
            title="General"
            icon="◉"
            color="#4A8EB8"
            refCallback={(el) => { if (el) sectionRefs.current.general = el; }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* App info */}
              <div
                style={{
                  gridColumn: "span 2",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: "rgba(0,212,255,0.04)",
                  border: "1px solid rgba(0,212,255,0.1)",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(0,212,255,0.12)",
                    border: "1px solid rgba(0,212,255,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  ◎
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#F0EDE6", marginBottom: 2 }}>
                    {localSettings.userName || "ASTRAEO"}
                  </p>
                  <p style={{ fontSize: 11, color: "#8A8A97" }}>{localSettings.userRole}</p>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: "rgba(0,212,255,0.1)",
                    color: "#4A8EB8",
                    border: "1px solid rgba(0,212,255,0.2)",
                    fontFamily: "monospace",
                    fontWeight: 600,
                  }}
                >
                  v2.0.0
                </span>
              </div>

              {/* Name */}
              <FieldGroup label="Nombre de usuario">
                <input
                  style={inputStyle}
                  placeholder="Comandante"
                  value={localSettings.userName}
                  onChange={(e) => patch({ userName: e.target.value })}
                />
              </FieldGroup>

              {/* Role */}
              <FieldGroup label="Rol / Título">
                <input
                  style={inputStyle}
                  placeholder="Admin Level 5"
                  value={localSettings.userRole}
                  onChange={(e) => patch({ userRole: e.target.value })}
                />
              </FieldGroup>

              {/* Language */}
              <FieldGroup label="Idioma">
                <div style={{ display: "flex", gap: 6 }}>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => patch({ language: lang.code })}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: 8,
                        border: `1px solid ${localSettings.language === lang.code ? "rgba(0,212,255,0.4)" : "rgba(26,39,68,0.7)"}`,
                        background: localSettings.language === lang.code ? "rgba(0,212,255,0.1)" : "rgba(10,15,31,0.4)",
                        color: localSettings.language === lang.code ? "#4A8EB8" : "#8A8A97",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              {/* Timezone */}
              <FieldGroup label="Zona horaria">
                <div style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "#F0EDE6" }}>Europe/Madrid</span>
                  <span style={{ fontSize: 10, color: "#4A5568" }}>UTC+2</span>
                </div>
              </FieldGroup>

              {/* Realtime toggle */}
              <div style={{ gridColumn: "span 2" }}>
                <ToggleSetting
                  label="Actualizaciones en tiempo real"
                  sub="Métricas y estado se actualizan automáticamente cada 3 segundos"
                  value={localSettings.realtimeUpdates}
                  onChange={(v) => patch({ realtimeUpdates: v })}
                  color="#4A8EB8"
                />
              </div>
            </div>
          </SectionCard>

          {/* ── IA / API ─────────────────────────────────────────────────────── */}
          <SectionCard
            id="api"
            title="IA / API"
            icon="🤖"
            color="#CC785C"
            refCallback={(el) => { if (el) sectionRefs.current.api = el; }}
            badge="Principal"
          >
            {/* API Key */}
            <FieldGroup label="Claude API Key">
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    style={{ ...inputStyle, paddingRight: 40 }}
                    type={apiKeyVisible ? "text" : "password"}
                    placeholder="sk-ant-api03-..."
                    value={localSettings.claudeApiKey}
                    onChange={(e) => {
                      patch({ claudeApiKey: e.target.value });
                      setApiStatus("idle");
                    }}
                  />
                  <button
                    onClick={() => setApiKeyVisible((v) => !v)}
                    type="button"
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#8A8A97",
                      cursor: "pointer",
                      fontSize: 13,
                      padding: 0,
                    }}
                  >
                    {apiKeyVisible ? "◑" : "◐"}
                  </button>
                </div>
                <motion.button
                  onClick={verifyApiKey}
                  disabled={!localSettings.claudeApiKey || verifying}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: "0 16px",
                    borderRadius: 8,
                    border: "1px solid rgba(204,120,92,0.4)",
                    background: "rgba(204,120,92,0.1)",
                    color: "#CC785C",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    opacity: !localSettings.claudeApiKey || verifying ? 0.4 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  {verifying ? "..." : "Verificar"}
                </motion.button>
              </div>

              {/* Status indicator */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={apiStatus}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 8,
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: currentApiMeta.bg,
                    border: `1px solid ${currentApiMeta.color}28`,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: currentApiMeta.color,
                      display: "inline-block",
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 600, color: currentApiMeta.color }}>
                    {currentApiMeta.label}
                  </span>
                </motion.div>
              </AnimatePresence>
            </FieldGroup>

            {/* Model selector */}
            <FieldGroup label="Modelo predeterminado">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {MODELS.map((m) => {
                  const selected = localSettings.claudeModel === m.id;
                  return (
                    <motion.button
                      key={m.id}
                      onClick={() => patch({ claudeModel: m.id as ModelId })}
                      whileHover={{ scale: 1.005 }}
                      whileTap={{ scale: 0.995 }}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 12,
                        border: `1px solid ${selected ? m.badge + "45" : "rgba(26,39,68,0.7)"}`,
                        background: selected ? `${m.badge}09` : "rgba(10,15,31,0.4)",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        transition: "all 0.15s",
                      }}
                    >
                      {/* Icon */}
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{m.icon}</span>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#F0EDE6" }}>{m.label}</span>
                          {selected && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              style={{
                                fontSize: 9,
                                padding: "2px 7px",
                                borderRadius: 4,
                                background: `${m.badge}20`,
                                color: m.badge,
                                border: `1px solid ${m.badge}30`,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                              }}
                            >
                              Activo
                            </motion.span>
                          )}
                        </div>
                        <p style={{ fontSize: 11, color: "#8A8A97" }}>{m.sub}</p>
                        <p style={{ fontSize: 10, color: "rgba(107,122,153,0.6)", marginTop: 2 }}>{m.desc}</p>
                      </div>

                      {/* Speed/cost indicators */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, alignItems: "flex-end" }}>
                        <div style={{ display: "flex", gap: 3 }}>
                          {[1, 2, 3].map((d) => (
                            <div
                              key={d}
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 2,
                                background: d <= m.speedDots ? m.badge : "rgba(26,39,68,0.8)",
                                transition: "background 0.2s",
                              }}
                            />
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 3 }}>
                          {[1, 2, 3].map((d) => (
                            <div
                              key={d}
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 2,
                                background: d <= m.costDots ? "rgba(255,71,87,0.6)" : "rgba(26,39,68,0.8)",
                                transition: "background 0.2s",
                              }}
                            />
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ fontSize: 9, color: "#4A5568" }}>VEL</span>
                          <span style={{ fontSize: 9, color: "#4A5568" }}>€</span>
                        </div>
                      </div>

                      {/* Radio */}
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          border: `2px solid ${selected ? m.badge : "rgba(26,39,68,0.9)"}`,
                          background: selected ? m.badge : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "all 0.15s",
                        }}
                      >
                        {selected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </FieldGroup>

            {/* Max tokens */}
            <FieldGroup label={`Tokens máximos: ${(localSettings as AppSettings & { maxTokens?: number }).maxTokens ?? 4096}`}>
              <input
                type="range"
                min={512}
                max={8192}
                step={256}
                value={(localSettings as AppSettings & { maxTokens?: number }).maxTokens ?? 4096}
                onChange={(e) =>
                  setLocalSettings((s) => ({ ...s, maxTokens: Number(e.target.value) } as AppSettings & { maxTokens?: number }))
                }
                style={{ width: "100%", accentColor: "#CC785C", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "#4A5568", fontFamily: "monospace" }}>512</span>
                <span style={{ fontSize: 10, color: "#4A5568", fontFamily: "monospace" }}>8192</span>
              </div>
            </FieldGroup>

            {/* Temperature */}
            <FieldGroup label={`Temperatura: ${((localSettings as AppSettings & { temperature?: number }).temperature ?? 0.7).toFixed(1)}`}>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={Math.round(((localSettings as AppSettings & { temperature?: number }).temperature ?? 0.7) * 10)}
                onChange={(e) =>
                  setLocalSettings((s) => ({ ...s, temperature: Number(e.target.value) / 10 } as AppSettings & { temperature?: number }))
                }
                style={{ width: "100%", accentColor: "#CC785C", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "#4A5568", fontFamily: "monospace" }}>0.0 — Preciso</span>
                <span style={{ fontSize: 10, color: "#4A5568", fontFamily: "monospace" }}>1.0 — Creativo</span>
              </div>
            </FieldGroup>
          </SectionCard>

          {/* ── APARIENCIA ───────────────────────────────────────────────────── */}
          <SectionCard
            id="appearance"
            title="Apariencia"
            icon="◈"
            color="#B04858"
            refCallback={(el) => { if (el) sectionRefs.current.appearance = el; }}
          >
            {/* Starfield density */}
            <FieldGroup label={`Densidad del starfield: ${localSettings.starfieldDensity}`}>
              <input
                type="range"
                min={20}
                max={200}
                value={localSettings.starfieldDensity}
                onChange={(e) => patch({ starfieldDensity: Number(e.target.value) })}
                style={{ width: "100%", accentColor: "#B04858", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "#4A5568" }}>Mínimo</span>
                <span style={{ fontSize: 10, color: "#4A5568" }}>Máximo</span>
              </div>
            </FieldGroup>

            {/* Animation speed */}
            <FieldGroup label="Velocidad de animación">
              <div style={{ display: "flex", gap: 6 }}>
                {ANIMATION_SPEEDS.map((speed) => (
                  <button
                    key={speed.value}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 8,
                      border: `1px solid rgba(26,39,68,0.7)`,
                      background: "rgba(10,15,31,0.4)",
                      color: "#8A8A97",
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    {speed.label}
                  </button>
                ))}
              </div>
            </FieldGroup>

            <ToggleSetting
              label="Modo compacto"
              sub="Reduce el espaciado de la interfaz para más densidad"
              value={localSettings.compactMode}
              onChange={(v) => patch({ compactMode: v })}
              color="#B04858"
            />
          </SectionCard>

          {/* ── SEGURIDAD ────────────────────────────────────────────────────── */}
          <SectionCard
            id="security"
            title="Seguridad"
            icon="⬡"
            color="#6655CC"
            refCallback={(el) => { if (el) sectionRefs.current.security = el; }}
          >
            <ToggleSetting
              label="Notificaciones del sistema"
              sub="Alertas, errores y eventos críticos de la plataforma"
              value={localSettings.notifications}
              onChange={(v) => patch({ notifications: v })}
              color="#6655CC"
            />
            <ToggleSetting
              label="Efectos de sonido"
              sub="Sonidos para eventos importantes y acciones del sistema"
              value={localSettings.soundEffects}
              onChange={(v) => patch({ soundEffects: v })}
              color="#6655CC"
            />
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: "rgba(123,97,255,0.05)",
                border: "1px solid rgba(123,97,255,0.12)",
              }}
            >
              <p style={{ fontSize: 11, color: "#8A8A97", lineHeight: 1.6 }}>
                Las API keys se almacenan localmente en tu navegador. Nunca se transmiten a servidores de terceros excepto al hacer llamadas directas a la API de Anthropic.
              </p>
            </div>
          </SectionCard>

          {/* ── CONTEXTO EMPRESA ─────────────────────────────────────────────── */}
          <SectionCard
            id="context"
            title="Contexto Empresa"
            icon="🏢"
            color="#3D8A60"
            refCallback={(el) => { if (el) sectionRefs.current.context = el; }}
            badge="Inyectado en todos los agentes"
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(0,229,160,0.05)",
                border: "1px solid rgba(0,229,160,0.12)",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>💡</span>
              <p style={{ fontSize: 11, color: "#8A8A97", lineHeight: 1.7 }}>
                Este contexto se inyecta automáticamente en todos los prompts de agentes y el Comandante, permitiéndoles operar con pleno conocimiento del negocio.
              </p>
            </div>

            {/* Company name + Industry */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FieldGroup label="Nombre de empresa">
                <input
                  style={inputStyle}
                  placeholder="CLIENDER"
                  defaultValue="CLIENDER"
                />
              </FieldGroup>
              <FieldGroup label="Industria">
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="consultoria">Consultoría</option>
                  <option value="tecnologia">Tecnología</option>
                  <option value="marketing">Marketing</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="saas">SaaS</option>
                  <option value="retail">Retail</option>
                  <option value="otro">Otro</option>
                </select>
              </FieldGroup>
            </div>

            {/* Context textarea */}
            <FieldGroup label="Descripción completa de la empresa">
              <textarea
                style={{
                  ...inputStyle,
                  resize: "none",
                  lineHeight: 1.7,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  minHeight: 200,
                }}
                rows={10}
                placeholder="Describe la empresa, su misión, productos, metodología..."
                value={localSettings.companyContext ?? ""}
                onChange={(e) => {
                  if (e.target.value.length <= 2000) patch({ companyContext: e.target.value });
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "monospace",
                    color: companyLen > 1800 ? "#B88530" : "#4A5568",
                  }}
                >
                  {companyLen} / 2000
                </span>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button
                    onClick={() => patch({ companyContext: COMPANY_DEFAULT })}
                    style={{
                      fontSize: 10,
                      color: "#8A8A97",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                      textUnderlineOffset: 2,
                    }}
                  >
                    Restaurar default
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#3D8A60",
                        animation: "pulse 2s infinite",
                      }}
                    />
                    <span style={{ fontSize: 10, color: "#3D8A60", fontWeight: 600 }}>
                      Activo en agentes
                    </span>
                  </div>
                </div>
              </div>
            </FieldGroup>

            {/* Brand values tags */}
            <FieldGroup label="Valores de marca">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {brandTags.map((tag) => (
                  <motion.span
                    key={tag}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: "rgba(0,229,160,0.08)",
                      border: "1px solid rgba(0,229,160,0.2)",
                      color: "#3D8A60",
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => removeBrandTag(tag)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "rgba(0,229,160,0.5)",
                        fontSize: 10,
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </motion.span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="Añadir valor de marca..."
                  value={brandTag}
                  onChange={(e) => setBrandTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addBrandTag(); }}
                />
                <button
                  onClick={addBrandTag}
                  style={{
                    padding: "0 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(0,229,160,0.3)",
                    background: "rgba(0,229,160,0.08)",
                    color: "#3D8A60",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
              </div>
            </FieldGroup>
          </SectionCard>

          {/* ── ZONA DE PELIGRO ──────────────────────────────────────────────── */}
          <SectionCard
            id="danger"
            title="Zona de Peligro"
            icon="⚠"
            color="#A83C50"
            refCallback={(el) => { if (el) sectionRefs.current.danger = el; }}
            danger
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              {/* Clear conversations */}
              <DangerRow
                title="Limpiar conversaciones"
                desc={`Elimina permanentemente las ${chatSessions.length} conversaciones del historial. Esta acción no se puede deshacer.`}
              >
                <AnimatePresence mode="wait">
                  {clearConfirm ? (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ display: "flex", gap: 6 }}
                    >
                      <button
                        onClick={() => setClearConfirm(false)}
                        style={ghostBtnStyle}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={clearConversations}
                        style={dangerBtnStyle}
                      >
                        Confirmar
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="trigger"
                      onClick={() => setClearConfirm(true)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={dangerBtnStyle}
                    >
                      Limpiar
                    </motion.button>
                  )}
                </AnimatePresence>
              </DangerRow>

              {/* Restore demo */}
              <DangerRow
                title="Restaurar datos de demo"
                desc="Recarga todos los datos semilla originales. Se perderán los cambios no guardados."
              >
                <button
                  onClick={restoreDemo}
                  style={{
                    ...ghostBtnStyle,
                    borderColor: "rgba(255,184,0,0.4)",
                    color: "#B88530",
                    background: "rgba(255,184,0,0.06)",
                  }}
                >
                  Restaurar demo
                </button>
              </DangerRow>

              {/* Export config */}
              <DangerRow
                title="Exportar configuración"
                desc="Descarga todos los ajustes actuales como archivo JSON para respaldo o migración."
              >
                <button onClick={exportConfig} style={ghostBtnStyle}>
                  ↑ Exportar JSON
                </button>
              </DangerRow>
            </div>
          </SectionCard>

        </div>
      </main>
    </div>
  );
}

// ── Local style constants ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid rgba(26,39,68,0.7)",
  background: "rgba(10,15,31,0.5)",
  color: "#F0EDE6",
  fontSize: 12,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const ghostBtnStyle: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 7,
  border: "1px solid rgba(26,39,68,0.7)",
  background: "transparent",
  color: "#8A8A97",
  fontSize: 11,
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const dangerBtnStyle: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 7,
  border: "1px solid rgba(255,71,87,0.4)",
  background: "rgba(255,71,87,0.1)",
  color: "#A83C50",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({
  id,
  title,
  icon,
  color,
  children,
  refCallback,
  danger,
  badge,
}: {
  id: Section;
  title: string;
  icon: string;
  color: string;
  children: React.ReactNode;
  refCallback?: (el: HTMLElement | null) => void;
  danger?: boolean;
  badge?: string;
}) {
  return (
    <motion.div
      ref={refCallback}
      id={`section-${id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        borderRadius: 16,
        border: `1px solid ${danger ? "rgba(255,71,87,0.2)" : "rgba(26,39,68,0.5)"}`,
        background: danger ? "rgba(255,71,87,0.02)" : "rgba(10,15,31,0.3)",
        overflow: "hidden",
        scrollMarginTop: 24,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${danger ? "rgba(255,71,87,0.12)" : "rgba(26,39,68,0.5)"}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ color, fontSize: 16 }}>{icon}</span>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#F0EDE6", letterSpacing: "0.01em", flex: 1 }}>
          {title}
        </h3>
        {badge && (
          <span
            style={{
              fontSize: 9,
              padding: "3px 8px",
              borderRadius: 5,
              background: `${color}12`,
              color,
              border: `1px solid ${color}22`,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {children}
      </div>
    </motion.div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, color: "#8A8A97", letterSpacing: "0.04em", fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleSetting({
  label,
  sub,
  value,
  onChange,
  color,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div>
        <p style={{ fontSize: 13, color: "#F0EDE6", fontWeight: 500, marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 11, color: "#8A8A97" }}>{sub}</p>
      </div>
      <motion.button
        onClick={() => onChange(!value)}
        whileTap={{ scale: 0.9 }}
        style={{
          width: 42,
          height: 24,
          borderRadius: 12,
          border: `1px solid ${value ? color + "50" : "rgba(26,39,68,0.8)"}`,
          background: value ? `${color}20` : "rgba(10,15,31,0.5)",
          position: "relative",
          cursor: "pointer",
          flexShrink: 0,
          transition: "all 0.2s",
          padding: 0,
        }}
      >
        <motion.div
          animate={{ x: value ? 18 : 2 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          style={{
            position: "absolute",
            top: 3,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: value ? color : "#4A5568",
            transition: "background 0.2s",
          }}
        />
      </motion.button>
    </div>
  );
}

function DangerRow({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid rgba(26,39,68,0.4)",
        background: "rgba(10,15,31,0.2)",
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, color: "#F0EDE6", fontWeight: 500, marginBottom: 3 }}>{title}</p>
        <p style={{ fontSize: 11, color: "#8A8A97", lineHeight: 1.5 }}>{desc}</p>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}
