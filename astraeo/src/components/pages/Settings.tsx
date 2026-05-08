"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAstraeo } from "@/store/astraeo";
import type { AppSettings } from "@/lib/types";

const models = [
  {
    id:   "claude-opus-4-7",
    icon: "🔮",
    label: "Claude Opus 4.7",
    sub:   "Máxima inteligencia",
    desc:  "Ideal para: razonamiento complejo, análisis profundo",
    badge: "#CC785C",
  },
  {
    id:   "claude-sonnet-4-6",
    icon: "⚡",
    label: "Claude Sonnet 4.6",
    sub:   "Balance calidad / velocidad",
    desc:  "Ideal para: tareas generales, desarrollo, análisis",
    badge: "#00D4FF",
  },
  {
    id:   "claude-haiku-4-5-20251001",
    icon: "🌿",
    label: "Claude Haiku 4.5",
    sub:   "Rápido y económico",
    desc:  "Ideal para: respuestas rápidas, agentes frecuentes",
    badge: "#00E5A0",
  },
];

const COMPANY_DEFAULT = `CLIENDER — Consultora Tecnológica de Ventas
Ubicación: Puerto de Sagunto (Valencia, España) | Equipo: ~12 profesionales

MISIÓN: No gestiona marketing. Reconstruye sistemas de ventas completos para empresas con mínimo 5 empleados, estructura comercial activa y capacidad de inversión.

TRES PILARES:
1. Captación de clientes — Meta Ads, Google Ads, optimización de CPL, creatividades IA, calidad de leads.
2. Sistema comercial y automatización — CRM Go High Level, WhatsApp/email automation, flujos de cualificación de leads, reducción de carga manual del equipo comercial.
3. Visibilidad digital — SEO, redes sociales, web, reputación online (reseñas), imagen de marca.

METODOLOGÍA (4 fases):
1. Auditoría estratégica — análisis completo del sistema actual del cliente.
2. Diseño del sistema — rediseño del flujo comercial + arquitectura de automatizaciones.
3. Implementación — CRM, automatizaciones, campañas en marcha.
4. Optimización continua — mejora de conversión, ajuste de campañas, refinamiento.`;

type Section = "api" | "profile" | "appearance" | "company" | "notifications" | "danger";

const NAV_SECTIONS: { id: Section; label: string; icon: string; color: string }[] = [
  { id: "api",           label: "API & Modelos",   icon: "🤖", color: "#CC785C" },
  { id: "profile",       label: "Perfil",           icon: "◉",  color: "#00D4FF" },
  { id: "appearance",    label: "Apariencia",       icon: "◈",  color: "#FF6B9D" },
  { id: "company",       label: "Empresa",          icon: "🏢", color: "#00E5A0" },
  { id: "notifications", label: "Notificaciones",   icon: "⬡",  color: "#7B61FF" },
  { id: "danger",        label: "Zona de Peligro",  icon: "⚠",  color: "#FF4757" },
];

type ApiStatus = "idle" | "verifying" | "valid" | "invalid";

export default function SettingsPage() {
  const {
    settings, updateSettings, integrations,
    connectIntegration, showToast,
    memory, chatSessions,
  } = useAstraeo();

  const [apiKeyVisible,  setApiKeyVisible]  = useState(false);
  const [localSettings,  setLocalSettings]  = useState<AppSettings>({ ...settings });
  const [saved,          setSaved]          = useState(false);
  const [activeSection,  setActiveSection]  = useState<Section>("api");
  const [apiStatus,      setApiStatus]      = useState<ApiStatus>("idle");
  const [verifying,      setVerifying]      = useState(false);
  const [clearConfirm,   setClearConfirm]   = useState(false);
  const sectionRefs = useRef<Partial<Record<Section, HTMLElement>>>({});

  const claudeIntg = integrations.find((i) => i.id === "int-1");
  const companyLen = (localSettings.companyContext ?? "").length;

  const patch = useCallback((p: Partial<AppSettings>) => setLocalSettings((s) => ({ ...s, ...p })), []);

  const handleSave = () => {
    updateSettings(localSettings);
    if (localSettings.claudeApiKey && localSettings.claudeApiKey !== settings.claudeApiKey) {
      connectIntegration("int-1", localSettings.claudeApiKey);
    }
    setSaved(true);
    showToast("Ajustes guardados", "success");
    setTimeout(() => setSaved(false), 2000);
  };

  // ── Verify API key ─────────────────────────────────────────────────────────
  const verifyApiKey = async () => {
    if (!localSettings.claudeApiKey) return;
    setVerifying(true);
    setApiStatus("verifying");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages:     [{ role: "user", content: "hola" }],
          systemPrompt: "Responde solo con 'ok'.",
          model:        "claude-haiku-4-5-20251001",
          apiKey:       localSettings.claudeApiKey,
        }),
      });
      if (res.ok) {
        setApiStatus("valid");
        showToast("API key válida ✓", "success");
      } else {
        setApiStatus("invalid");
        showToast("API key inválida", "error");
      }
    } catch {
      setApiStatus("invalid");
      showToast("No se pudo verificar la API key", "error");
    } finally {
      setVerifying(false);
    }
  };

  // ── Scroll to section ──────────────────────────────────────────────────────
  const scrollToSection = (id: Section) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Export config ──────────────────────────────────────────────────────────
  const exportConfig = () => {
    const data = JSON.stringify({ settings: localSettings }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `astraeo-config-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Clear conversations ─────────────────────────────────────────────────────
  const clearConversations = () => {
    // Leverages chatSessions but we use the store directly
    const store = useAstraeo.getState();
    chatSessions.forEach((s) => store.deleteChat(s.id));
    showToast("Todas las conversaciones eliminadas", "info");
    setClearConfirm(false);
  };

  // ── Restore demo data ──────────────────────────────────────────────────────
  const restoreDemo = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("astraeo-store");
      window.location.reload();
    }
  };

  const apiStatusMeta = {
    idle:      { color: claudeIntg?.connected ? "#00E5A0" : "#6B7A99", label: claudeIntg?.connected ? "Conectada" : "No configurada" },
    verifying: { color: "#FFB800", label: "Verificando..." },
    valid:     { color: "#00E5A0", label: "Válida ✓" },
    invalid:   { color: "#FF4757", label: "Inválida" },
  };

  const currentApiMeta = apiStatusMeta[apiStatus];

  return (
    <div className="flex h-full overflow-hidden animate-fade-in">

      {/* ── Left sidebar nav ──────────────────────────────────────────────── */}
      <div className="w-52 border-r border-[#1A2744]/60 flex flex-col flex-shrink-0 py-4">
        <div className="px-4 mb-4">
          <h2 className="text-[14px] font-bold tracking-wide text-[#E8ECF4]">Ajustes</h2>
          <p className="text-[10px] text-[#6B7A99] font-mono">Personaliza ASTRAEO</p>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV_SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => scrollToSection(sec.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all text-[12px] font-medium"
              style={{
                background: activeSection === sec.id ? `${sec.color}10` : "transparent",
                color:      activeSection === sec.id ? sec.color : "#6B7A99",
                border:     `1px solid ${activeSection === sec.id ? sec.color + "20" : "transparent"}`,
              }}
            >
              <span style={{ fontSize: 14 }}>{sec.icon}</span>
              {sec.label}
            </button>
          ))}
        </nav>

        {/* Save + Restore in sidebar bottom */}
        <div className="px-2 pt-3 border-t border-[#1A2744]/50 space-y-2">
          <button
            onClick={() => setLocalSettings({ ...settings })}
            className="btn-ghost w-full text-[11px] py-2 justify-center"
          >
            Restaurar
          </button>
          <button
            onClick={handleSave}
            className="btn-primary w-full text-[11px] py-2 justify-center"
          >
            {saved ? "✓ Guardado" : "Guardar"}
          </button>
        </div>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6 pb-10">

          {/* ── API & Models ──────────────────────────────────────────────── */}
          <Section
            id="api"
            title="API & Modelos"
            icon="🤖"
            color="#CC785C"
            refCallback={(el) => { if (el) sectionRefs.current.api = el; }}
          >
            {/* API Key */}
            <div>
              <label className="text-[11px] text-[#6B7A99] mb-1.5 block tracking-wide">
                Claude API Key
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    className="astraeo-input pr-10"
                    type={apiKeyVisible ? "text" : "password"}
                    placeholder="sk-ant-..."
                    value={localSettings.claudeApiKey}
                    onChange={(e) => {
                      patch({ claudeApiKey: e.target.value });
                      setApiStatus("idle");
                    }}
                  />
                  <button
                    onClick={() => setApiKeyVisible((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A99] hover:text-[#E8ECF4] transition-colors text-[13px]"
                    type="button"
                  >
                    {apiKeyVisible ? "◑" : "◐"}
                  </button>
                </div>
                <button
                  onClick={verifyApiKey}
                  disabled={!localSettings.claudeApiKey || verifying}
                  className="btn-ghost text-[11px] py-2 px-3 whitespace-nowrap disabled:opacity-40"
                >
                  {verifying ? "..." : "Verificar"}
                </button>
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: currentApiMeta.color }}
                />
                <span className="text-[11px] font-semibold" style={{ color: currentApiMeta.color }}>
                  {currentApiMeta.label}
                </span>
              </div>
            </div>

            {/* Model selector — cards */}
            <div>
              <label className="text-[11px] text-[#6B7A99] mb-2 block tracking-wide">
                Modelo predeterminado
              </label>
              <div className="space-y-2">
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => patch({ claudeModel: m.id })}
                    className="w-full text-left p-4 rounded-xl transition-all border"
                    style={{
                      background:  localSettings.claudeModel === m.id ? `${m.badge}08` : "rgba(10,15,31,0.5)",
                      borderColor: localSettings.claudeModel === m.id ? `${m.badge}40` : "#1A2744",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{m.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-[#E8ECF4]">{m.label}</p>
                          {localSettings.claudeModel === m.id && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                              style={{ background: `${m.badge}20`, color: m.badge }}
                            >
                              activo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6B7A99]">{m.sub}</p>
                        <p className="text-[10px] text-[#6B7A99]/60 mt-0.5">{m.desc}</p>
                      </div>
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{
                          borderColor: localSettings.claudeModel === m.id ? m.badge : "#1A2744",
                          background:  localSettings.claudeModel === m.id ? m.badge : "transparent",
                        }}
                      >
                        {localSettings.claudeModel === m.id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Profile ───────────────────────────────────────────────────── */}
          <Section
            id="profile"
            title="Perfil"
            icon="◉"
            color="#00D4FF"
            refCallback={(el) => { if (el) sectionRefs.current.profile = el; }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">
                  Nombre de usuario
                </label>
                <input
                  className="astraeo-input"
                  placeholder="Comandante"
                  value={localSettings.userName}
                  onChange={(e) => patch({ userName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">
                  Rol / Título
                </label>
                <input
                  className="astraeo-input"
                  placeholder="Admin Level 5"
                  value={localSettings.userRole}
                  onChange={(e) => patch({ userRole: e.target.value })}
                />
              </div>
            </div>
          </Section>

          {/* ── Appearance ────────────────────────────────────────────────── */}
          <Section
            id="appearance"
            title="Apariencia"
            icon="◈"
            color="#FF6B9D"
            refCallback={(el) => { if (el) sectionRefs.current.appearance = el; }}
          >
            <div>
              <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">
                Densidad del starfield:{" "}
                <span className="text-[#E8ECF4] font-mono">{localSettings.starfieldDensity}</span>
              </label>
              <input
                type="range"
                min={20}
                max={200}
                value={localSettings.starfieldDensity}
                onChange={(e) => patch({ starfieldDensity: Number(e.target.value) })}
                className="w-full accent-[#FF6B9D]"
              />
              <div className="flex justify-between mt-0.5">
                <span className="text-[10px] text-[#6B7A99]">Mínimo</span>
                <span className="text-[10px] text-[#6B7A99]">Máximo</span>
              </div>
            </div>
            <ToggleSetting
              label="Modo compacto"
              sub="Reduce el espaciado de la interfaz"
              value={localSettings.compactMode}
              onChange={(v) => patch({ compactMode: v })}
            />
          </Section>

          {/* ── Company context ───────────────────────────────────────────── */}
          <Section
            id="company"
            title="Contexto de Empresa"
            icon="🏢"
            color="#00E5A0"
            refCallback={(el) => { if (el) sectionRefs.current.company = el; }}
          >
            <div>
              <p className="text-[11px] text-[#6B7A99] mb-3 leading-relaxed">
                Este contexto se inyecta en todos los agentes y el Comandante, permitiéndoles operar con pleno conocimiento del negocio.
              </p>
              <textarea
                className="astraeo-input resize-none leading-relaxed"
                rows={12}
                placeholder="Ej: Somos una consultora de ventas especializada en..."
                value={localSettings.companyContext ?? ""}
                onChange={(e) => {
                  if (e.target.value.length <= 2000) patch({ companyContext: e.target.value });
                }}
                style={{
                  fontFamily:  "'JetBrains Mono', monospace",
                  fontSize:    "12px",
                  lineHeight:  "1.7",
                }}
              />
              <div className="flex items-center justify-between mt-2">
                <p
                  className="text-[10px] font-mono"
                  style={{ color: companyLen > 1800 ? "#FFB800" : "#6B7A99" }}
                >
                  {companyLen} / 2000
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => patch({ companyContext: COMPANY_DEFAULT })}
                    className="text-[10px] text-[#6B7A99] hover:text-[#E8ECF4] transition-colors underline underline-offset-2"
                  >
                    Restaurar default
                  </button>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] animate-pulse" />
                    <span className="text-[10px] text-[#00E5A0] font-semibold">
                      Activo en Commander + Agentes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Notifications & System ────────────────────────────────────── */}
          <Section
            id="notifications"
            title="Notificaciones"
            icon="⬡"
            color="#7B61FF"
            refCallback={(el) => { if (el) sectionRefs.current.notifications = el; }}
          >
            <div className="space-y-4">
              <ToggleSetting
                label="Actualizaciones en tiempo real"
                sub="Métricas y estado actualizados automáticamente"
                value={localSettings.realtimeUpdates}
                onChange={(v) => patch({ realtimeUpdates: v })}
              />
              <ToggleSetting
                label="Notificaciones"
                sub="Alertas y eventos del sistema"
                value={localSettings.notifications}
                onChange={(v) => patch({ notifications: v })}
              />
              <ToggleSetting
                label="Efectos de sonido"
                sub="Sonidos para eventos importantes"
                value={localSettings.soundEffects}
                onChange={(v) => patch({ soundEffects: v })}
              />
            </div>
          </Section>

          {/* ── Danger zone ───────────────────────────────────────────────── */}
          <Section
            id="danger"
            title="Zona de Peligro"
            icon="⚠"
            color="#FF4757"
            refCallback={(el) => { if (el) sectionRefs.current.danger = el; }}
            danger
          >
            <div className="space-y-3">

              {/* Clear conversations */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#FF4757]/15 bg-[#FF4757]/[0.04]">
                <div>
                  <p className="text-[13px] text-[#E8ECF4] font-medium">
                    Limpiar conversaciones
                  </p>
                  <p className="text-[11px] text-[#6B7A99]">
                    Elimina las {chatSessions.length} conversaciones del historial
                  </p>
                </div>
                {clearConfirm ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setClearConfirm(false)}
                      className="btn-ghost text-[11px] py-1.5 px-3"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={clearConversations}
                      className="btn-danger text-[11px] py-1.5 px-3"
                    >
                      Confirmar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setClearConfirm(true)}
                    className="btn-danger text-[11px] py-1.5 px-3"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Restore demo */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#1A2744]/50 bg-transparent">
                <div>
                  <p className="text-[13px] text-[#E8ECF4] font-medium">
                    Restaurar datos de demo
                  </p>
                  <p className="text-[11px] text-[#6B7A99]">
                    Recarga los datos semilla originales (borra cambios)
                  </p>
                </div>
                <button
                  onClick={restoreDemo}
                  className="btn-ghost text-[11px] py-1.5 px-3"
                >
                  Restaurar demo
                </button>
              </div>

              {/* Export config */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#1A2744]/50 bg-transparent">
                <div>
                  <p className="text-[13px] text-[#E8ECF4] font-medium">
                    Exportar configuración
                  </p>
                  <p className="text-[11px] text-[#6B7A99]">
                    Descarga todos los ajustes como JSON
                  </p>
                </div>
                <button
                  onClick={exportConfig}
                  className="btn-ghost text-[11px] py-1.5 px-3"
                >
                  ↑ Exportar
                </button>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({
  id,
  title,
  icon,
  color,
  children,
  refCallback,
  danger,
}: {
  id: Section;
  title: string;
  icon: string;
  color: string;
  children: React.ReactNode;
  refCallback?: (el: HTMLElement | null) => void;
  danger?: boolean;
}) {
  return (
    <div
      ref={refCallback}
      className="glass-card rounded-2xl border overflow-hidden scroll-mt-6"
      style={{
        borderColor: danger ? "rgba(255,71,87,0.2)" : "rgba(26,39,68,0.5)",
      }}
      id={`section-${id}`}
    >
      <div
        className="px-5 py-3 border-b flex items-center gap-2"
        style={{ borderColor: danger ? "rgba(255,71,87,0.15)" : "rgba(26,39,68,0.5)" }}
      >
        <span style={{ color }}>{icon}</span>
        <h3 className="text-[13px] font-semibold text-[#E8ECF4] tracking-wide">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ── Toggle setting ─────────────────────────────────────────────────────────────
function ToggleSetting({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[13px] text-[#E8ECF4] font-medium">{label}</p>
        <p className="text-[11px] text-[#6B7A99]">{sub}</p>
      </div>
      <input
        type="checkbox"
        className="toggle flex-shrink-0"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}
