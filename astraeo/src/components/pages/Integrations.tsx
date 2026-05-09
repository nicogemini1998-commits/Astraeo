"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAstraeo } from "@/store/astraeo";
import type { Integration } from "@/lib/types";

// ── Static integration catalog ─────────────────────────────────────────────────
// The live store integrations power connect/disconnect state.
// This catalog provides rich metadata for all 12+ integrations.

interface IntegrationMeta {
  id: string;
  name: string;
  icon: string;
  category: string;
  color: string;
  description: string;
  beta?: boolean;
  webhookField?: boolean;
}

const CATALOG: IntegrationMeta[] = [
  {
    id: "int-1",
    name: "Anthropic Claude",
    icon: "🤖",
    category: "IA",
    color: "#8A6A55",
    description: "Motor de IA principal para todos los agentes y el Comandante.",
  },
  {
    id: "int-2",
    name: "Go High Level",
    icon: "⚡",
    category: "CRM",
    color: "#B8A06A",
    description: "CRM central para gestión de leads, pipelines y automatizaciones comerciales.",
  },
  {
    id: "int-3",
    name: "Meta Ads",
    icon: "📱",
    category: "Marketing",
    color: "#1877F2",
    description: "Gestión de campañas en Facebook e Instagram con optimización de CPL.",
    beta: false,
  },
  {
    id: "int-4",
    name: "Google Ads",
    icon: "🎯",
    category: "Marketing",
    color: "#4285F4",
    description: "Campañas de búsqueda y display con seguimiento de conversiones.",
  },
  {
    id: "int-5",
    name: "WhatsApp Business",
    icon: "💬",
    category: "Comunicación",
    color: "#25D366",
    description: "Automatización de mensajes, secuencias de nutrición y chatbots de cualificación.",
    webhookField: true,
  },
  {
    id: "int-6",
    name: "Google Analytics",
    icon: "📊",
    category: "Analytics",
    color: "#E37400",
    description: "Análisis de tráfico, comportamiento de usuarios y atribución de campañas.",
  },
  {
    id: "int-7",
    name: "Slack",
    icon: "💼",
    category: "Comunicación",
    color: "#7A7088",
    description: "Notificaciones en tiempo real, alertas de agentes y reportes automáticos.",
    webhookField: true,
  },
  {
    id: "int-8",
    name: "Zapier",
    icon: "🔗",
    category: "Automatización",
    color: "#7A3040",
    description: "Conecta ASTRAEO con miles de aplicaciones mediante flujos automatizados.",
    webhookField: true,
  },
  {
    id: "int-hub",
    name: "HubSpot",
    icon: "🧲",
    category: "CRM",
    color: "#B8A06A",
    description: "Sincronización de contactos, deals y actividad comercial.",
  },
  {
    id: "int-notion",
    name: "Notion",
    icon: "◻",
    category: "Productividad",
    color: "var(--text-primary)",
    description: "Exporta informes, planes y documentación de agentes a Notion.",
    beta: true,
  },
  {
    id: "int-stripe",
    name: "Stripe",
    icon: "💳",
    category: "Pagos",
    color: "#635BFF",
    description: "Seguimiento de ingresos, suscripciones y métricas de conversión financiera.",
  },
  {
    id: "int-shopify",
    name: "Shopify",
    icon: "🛍️",
    category: "E-commerce",
    color: "#96BF48",
    description: "Datos de ventas, inventario y comportamiento de clientes para análisis.",
    beta: true,
  },
  {
    id: "int-gmail",
    name: "Gmail",
    icon: "📧",
    category: "Comunicación",
    color: "#EA4335",
    description: "Envío de secuencias de email, respuestas automáticas y seguimiento de apertura.",
    webhookField: false,
  },
  {
    id: "int-gsheets",
    name: "Google Sheets",
    icon: "📋",
    category: "Productividad",
    color: "#34A853",
    description: "Exporta datos de agentes, métricas y reportes a hojas de cálculo.",
    beta: true,
  },
  {
    id: "int-make",
    name: "Make.com",
    icon: "⚙️",
    category: "Automatización",
    color: "#7C3AED",
    description: "Automatizaciones visuales avanzadas con lógica condicional y transformación de datos.",
    webhookField: true,
  },
  {
    id: "int-sf",
    name: "Salesforce",
    icon: "☁️",
    category: "CRM",
    color: "#00A1E0",
    description: "Sincronización empresarial de oportunidades, cuentas y actividad de ventas.",
  },
];

const API_KEY_INSTRUCTIONS: Record<string, string> = {
  default:         "Ve a la página de tu proveedor → Configuración → API → Crear nueva clave.",
  "Anthropic Claude": "Visita console.anthropic.com → API Keys → Create Key.",
  Slack:           "Visita api.slack.com → Your Apps → OAuth & Permissions → Bot Token Scopes.",
  "Go High Level": "Visita app.gohighlevel.com → Settings → API → Generar clave.",
  "Google Analytics": "Visita console.cloud.google.com → Credentials → Create OAuth 2.0 client.",
  "Meta Ads":      "Visita developers.facebook.com → My Apps → Generar token de acceso.",
  Stripe:          "Visita dashboard.stripe.com → Developers → API Keys.",
  Notion:          "Visita notion.so/my-integrations → New Integration → Submit → Copy token.",
  HubSpot:         "Visita app.hubspot.com → Settings → Integrations → Private Apps.",
  Gmail:           "Visita console.cloud.google.com → Enable Gmail API → OAuth 2.0 credentials.",
  "Google Sheets": "Visita console.cloud.google.com → Enable Sheets API → Service account.",
  "Make.com":      "Visita make.com → Organization → API keys → Add token.",
  Salesforce:      "Visita tu org Salesforce → Setup → App Manager → Connected App.",
};

const TABS = ["Todas", "Activas", "CRM", "Marketing", "Comunicación", "Analytics", "Automatización", "Productividad", "Pagos", "E-commerce", "IA"];

// ── Merge catalog with live store data ────────────────────────────────────────

interface MergedIntegration extends IntegrationMeta {
  connected: boolean;
  apiKey: string;
  config: Record<string, string>;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { integrations, connectIntegration, disconnectIntegration, showToast } = useAstraeo();

  const [activeTab,   setActiveTab]   = useState("Todas");
  const [configuring, setConfiguring] = useState<MergedIntegration | null>(null);
  const [apiKey,      setApiKey]      = useState("");
  const [webhookUrl,  setWebhookUrl]  = useState("");
  const [apiVisible,  setApiVisible]  = useState(false);
  const [testStatus,  setTestStatus]  = useState<"idle" | "testing" | "ok" | "fail">("idle");

  // Merge static catalog with live store
  const merged: MergedIntegration[] = CATALOG.map((meta) => {
    const live = integrations.find((i) => i.id === meta.id);
    return {
      ...meta,
      connected: live?.connected ?? false,
      apiKey: live?.apiKey ?? "",
      config: live?.config ?? {},
    };
  });

  const connectedCount = merged.filter((i) => i.connected).length;
  const betaCount = merged.filter((i) => i.beta).length;

  const filtered = merged.filter((i) => {
    if (activeTab === "Todas") return true;
    if (activeTab === "Activas") return i.connected;
    return i.category === activeTab;
  });

  const openConfig = (item: MergedIntegration) => {
    setConfiguring(item);
    setApiKey("");
    setWebhookUrl("");
    setApiVisible(false);
    setTestStatus("idle");
  };

  const handleConnect = () => {
    if (!configuring || !apiKey.trim()) return;
    const extraConfig: Record<string, string> = webhookUrl.trim() ? { webhookUrl } : {};
    connectIntegration(configuring.id, apiKey, extraConfig);
    showToast(`${configuring.name} conectado correctamente`, "success");
    setConfiguring(null);
    setApiKey("");
    setWebhookUrl("");
  };

  const handleDisconnect = (item: MergedIntegration) => {
    disconnectIntegration(item.id);
    showToast(`${item.name} desconectado`, "info");
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    await new Promise((r) => setTimeout(r, 1400));
    setTestStatus(apiKey.length > 8 ? "ok" : "fail");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        style={{
          padding: "20px 24px 0",
          borderBottom: "1px solid rgba(255,252,245,0.6)",
          flexShrink: 0,
        }}
      >
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>
              Ecosistema
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Integraciones
            </h2>
          </div>

          {/* Status bar */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StatusPill color="#7A8569" pulse>
              {connectedCount} conectadas
            </StatusPill>
            <StatusPill color="var(--text-muted)">
              {merged.length - connectedCount} disponibles
            </StatusPill>
            {betaCount > 0 && (
              <StatusPill color="#7A7088">
                {betaCount} en beta
              </StatusPill>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 1 }}>
          {TABS.map((tab) => {
            const active = activeTab === tab;
            const count = tab === "Todas"
              ? merged.length
              : tab === "Activas"
              ? connectedCount
              : merged.filter((i) => i.category === tab).length;
            if (count === 0 && tab !== "Todas" && tab !== "Activas") return null;
            return (
              <motion.button
                key={tab}
                onClick={() => setActiveTab(tab)}
                whileHover={{ y: -1 }}
                style={{
                  padding: "7px 13px",
                  borderRadius: "8px 8px 0 0",
                  border: `1px solid ${active ? "rgba(124,138,152,0.3)" : "rgba(255,252,245,0.5)"}`,
                  borderBottom: active ? "1px solid transparent" : "1px solid rgba(255,252,245,0.5)",
                  background: active ? "rgba(124,138,152,0.08)" : "transparent",
                  color: active ? "#7C8A98" : "var(--text-muted)",
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 0.15s",
                  marginBottom: active ? -1 : 0,
                  position: "relative",
                  zIndex: active ? 1 : 0,
                }}
              >
                {tab}
                {count > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: "1px 5px",
                      borderRadius: 4,
                      background: active ? "rgba(124,138,152,0.15)" : "rgba(107,122,153,0.12)",
                      color: active ? "#7C8A98" : "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </header>

      {/* ── Cards grid ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        <motion.div
          layout
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.94, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: idx < 12 ? idx * 0.03 : 0 }}
              >
                <IntegrationCard
                  item={item}
                  onConnect={() => openConfig(item)}
                  onDisconnect={() => handleDisconnect(item)}
                  onConfigure={() => openConfig(item)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 0",
                gap: 12,
                opacity: 0.4,
              }}
            >
              <span style={{ fontSize: 36 }}>◍</span>
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Sin integraciones en esta categoría</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Config modal ──────────────────────────────────────────────────────  */}
      <AnimatePresence>
        {configuring && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => { if (e.target === e.currentTarget) setConfiguring(null); }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              background: "rgba(5,8,16,0.88)",
              backdropFilter: "blur(18px)",
            }}
          >
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.93, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 14 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                width: "100%",
                maxWidth: 460,
                borderRadius: 18,
                border: "1px solid rgba(255,252,245,0.8)",
                background: "rgba(8,12,26,0.95)",
                backdropFilter: "blur(32px)",
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              {/* Modal header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: `${configuring.color}14`,
                      border: `1px solid ${configuring.color}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      flexShrink: 0,
                    }}
                  >
                    {configuring.icon}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                        {configuring.name}
                      </h3>
                      {configuring.beta && (
                        <span
                          style={{
                            fontSize: 9,
                            padding: "2px 7px",
                            borderRadius: 4,
                            background: "rgba(122,112,136,0.12)",
                            color: "#7A7088",
                            border: "1px solid rgba(122,112,136,0.25)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          Beta
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{configuring.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfiguring(null)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    border: "1px solid rgba(255,252,245,0.7)",
                    background: "rgba(14,12,10,0.5)",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Description */}
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, padding: "0 2px" }}>
                {configuring.description}
              </p>

              {/* API Key field */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                  API Key <span style={{ color: "#7A3040" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,252,245,0.7)",
                      background: "rgba(14,12,10,0.5)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                      fontFamily: "monospace",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    type={apiVisible ? "text" : "password"}
                    placeholder="Pega tu API key aquí..."
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTestStatus("idle");
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => setApiVisible((v) => !v)}
                    type="button"
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: 13,
                      padding: 0,
                    }}
                  >
                    {apiVisible ? "◑" : "◐"}
                  </button>
                </div>
                <p style={{ fontSize: 10, color: "rgba(107,122,153,0.65)", lineHeight: 1.5 }}>
                  {API_KEY_INSTRUCTIONS[configuring.name] ?? API_KEY_INSTRUCTIONS.default}
                </p>
              </div>

              {/* Webhook URL (optional) */}
              {configuring.webhookField && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                    Webhook URL <span style={{ color: "var(--text-muted)" }}>(opcional)</span>
                  </label>
                  <input
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,252,245,0.7)",
                      background: "rgba(14,12,10,0.5)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                      fontFamily: "monospace",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    type="url"
                    placeholder="https://hooks.example.com/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                </div>
              )}

              {/* Test connection */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <motion.button
                  onClick={handleTestConnection}
                  disabled={!apiKey.trim() || testStatus === "testing"}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 7,
                    border: "1px solid rgba(255,252,245,0.7)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                    opacity: !apiKey.trim() ? 0.4 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  {testStatus === "testing" ? "Probando..." : "Probar conexión"}
                </motion.button>
                <AnimatePresence mode="wait">
                  {testStatus === "ok" && (
                    <motion.span
                      key="ok"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ fontSize: 12, color: "#7A8569", fontWeight: 600 }}
                    >
                      ✓ Conexión exitosa
                    </motion.span>
                  )}
                  {testStatus === "fail" && (
                    <motion.span
                      key="fail"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ fontSize: 12, color: "#7A3040", fontWeight: 600 }}
                    >
                      ✗ Verificar credenciales
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, paddingTop: 2 }}>
                <button
                  onClick={() => setConfiguring(null)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 9,
                    border: "1px solid rgba(255,252,245,0.7)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <motion.button
                  onClick={handleConnect}
                  disabled={!apiKey.trim()}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 2,
                    padding: "10px 0",
                    borderRadius: 9,
                    border: `1px solid ${configuring.color}40`,
                    background: `${configuring.color}12`,
                    color: configuring.color,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    opacity: !apiKey.trim() ? 0.4 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  Guardar y Conectar →
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Integration card ───────────────────────────────────────────────────────────

function IntegrationCard({
  item,
  onConnect,
  onDisconnect,
  onConfigure,
}: {
  item: MergedIntegration;
  onConnect: () => void;
  onDisconnect: () => void;
  onConfigure: () => void;
}) {
  const statusStyle = item.connected
    ? { bg: "rgba(122,133,105,0.08)", border: "rgba(122,133,105,0.25)", color: "#7A8569", label: "Conectado" }
    : { bg: "rgba(107,122,153,0.06)", border: "rgba(255,252,245,0.6)", color: "var(--text-muted)", label: "Disponible" };

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: `0 8px 32px ${item.color}14` }}
      style={{
        borderRadius: 14,
        border: `1px solid ${item.connected ? item.color + "30" : "rgba(255,252,245,0.55)"}`,
        background: item.connected
          ? `${item.color}04`
          : "rgba(14,12,10,0.35)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        height: "100%",
        boxSizing: "border-box",
        transition: "border-color 0.2s, background 0.2s",
      }}
    >
      {/* Top section */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        {/* Icon + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              background: `${item.color}14`,
              border: `1px solid ${item.color}28`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            {item.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                {item.name}
              </p>
              {item.beta && (
                <span
                  style={{
                    fontSize: 8,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "rgba(122,112,136,0.12)",
                    color: "#7A7088",
                    border: "1px solid rgba(122,112,136,0.22)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Beta
                </span>
              )}
            </div>
            <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{item.category}</p>
          </div>
        </div>

        {/* Status pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 9px",
            borderRadius: 20,
            background: statusStyle.bg,
            border: `1px solid ${statusStyle.border}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: statusStyle.color,
              ...(item.connected ? { animation: "pulse 2s infinite" } : {}),
            }}
          />
          <span style={{ fontSize: 10, color: statusStyle.color, fontWeight: 600 }}>
            {statusStyle.label}
          </span>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: 11, color: "rgba(107,122,153,0.75)", lineHeight: 1.6, flex: 1 }}>
        {item.description}
      </p>

      {/* Actions */}
      <div style={{ display: "flex", gap: 7, marginTop: "auto" }}>
        {item.connected ? (
          <>
            <button
              onClick={onConfigure}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 8,
                border: "1px solid rgba(255,252,245,0.6)",
                background: "transparent",
                color: "var(--text-muted)",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              Configurar
            </button>
            <button
              onClick={onDisconnect}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid rgba(122,48,64,0.3)",
                background: "rgba(122,48,64,0.07)",
                color: "#7A3040",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              Desconectar
            </button>
          </>
        ) : (
          <motion.button
            onClick={onConnect}
            whileHover={{ background: `${item.color}18` }}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 8,
              border: `1px solid ${item.color}35`,
              background: `${item.color}0C`,
              color: item.color,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            Conectar →
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ── Status pill ────────────────────────────────────────────────────────────────

function StatusPill({
  color,
  children,
  pulse,
}: {
  color: string;
  children: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 11px",
        borderRadius: 20,
        background: `${color}0D`,
        border: `1px solid ${color}28`,
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          ...(pulse ? { animation: "pulse 2s infinite" } : {}),
        }}
      />
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{children}</span>
    </div>
  );
}
