"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAstraeo } from "@/store/astraeo";
import type { Integration } from "@/lib/types";

const TAB_CATEGORIES = ["Todas", "AI", "Comunicación", "Productividad", "Dev", "Analytics", "Pagos", "CRM", "Automatización"];

const API_KEY_INSTRUCTIONS: Record<string, string> = {
  default:       "Ve a la página de tu proveedor → Configuración → API → Crear nueva clave.",
  Claude:        "Visita console.anthropic.com → API Keys → Create Key.",
  OpenAI:        "Visita platform.openai.com → API Keys → Create new secret key.",
  Slack:         "Visita api.slack.com → Your Apps → OAuth & Permissions → Bot Token Scopes.",
  HubSpot:       "Visita app.hubspot.com → Settings → Integrations → API Key.",
  "Google Analytics": "Visita console.cloud.google.com → Credentials → Create OAuth 2.0 client.",
  "Meta Ads":    "Visita developers.facebook.com → My Apps → Generar token de acceso.",
  "Stripe":      "Visita dashboard.stripe.com → Developers → API Keys.",
  Notion:        "Visita notion.so/my-integrations → New Integration → Submit → Copy token.",
  GitHub:        "Visita github.com → Settings → Developer settings → Personal access tokens.",
};

function getInstructions(name: string): string {
  return API_KEY_INSTRUCTIONS[name] ?? API_KEY_INSTRUCTIONS.default;
}

export default function Integrations() {
  const { integrations, connectIntegration, disconnectIntegration, showToast } = useAstraeo();

  const [filterCat,   setFilterCat]   = useState("Todas");
  const [configuring, setConfiguring] = useState<Integration | null>(null);
  const [apiKey,      setApiKey]      = useState("");
  const [apiVisible,  setApiVisible]  = useState(false);
  const [config,      setConfig]      = useState<Record<string, string>>({});

  const filtered       = integrations.filter((i) => filterCat === "Todas" || i.category === filterCat);
  const connectedCount = integrations.filter((i) => i.connected).length;

  const handleConnect = () => {
    if (!configuring || !apiKey.trim()) return;
    connectIntegration(configuring.id, apiKey, config);
    showToast(`${configuring.name} conectado`, "success");
    setConfiguring(null);
    setApiKey("");
    setApiVisible(false);
    setConfig({});
  };

  const handleDisconnect = (i: Integration) => {
    disconnectIntegration(i.id);
    showToast(`${i.name} desconectado`, "info");
  };

  const openConfig = (i: Integration) => {
    setConfiguring(i);
    setApiKey("");
    setApiVisible(false);
    setConfig({});
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-[#1A2744]/60 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[15px] font-bold tracking-wide text-[#E8ECF4]">Integraciones</h2>
            <p className="text-[11px] text-[#6B7A99] font-mono mt-0.5">
              <span className="text-[#00E5A0]">{connectedCount}</span>
              {" "}de{" "}
              <span className="text-[#E8ECF4]">{integrations.length}</span>
              {" "}integraciones activas
            </p>
          </div>

          {/* Active indicator pills */}
          <div className="flex items-center gap-2">
            <div
              className="px-3 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5"
              style={{
                background:  "rgba(0,229,160,0.08)",
                borderColor: "rgba(0,229,160,0.25)",
                color:       "#00E5A0",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] inline-block animate-pulse" />
              {connectedCount} activas
            </div>
            <div
              className="px-3 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5"
              style={{
                background:  "rgba(107,122,153,0.08)",
                borderColor: "#1A2744",
                color:       "#6B7A99",
              }}
            >
              {integrations.length - connectedCount} inactivas
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1">
          {TAB_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className="text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all"
              style={{
                background:  filterCat === c ? "rgba(0,212,255,0.12)" : "transparent",
                color:       filterCat === c ? "#00D4FF" : "#6B7A99",
                border:      `1px solid ${filterCat === c ? "rgba(0,212,255,0.25)" : "#1A2744"}`,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards grid ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5">
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((intg, idx) => (
              <motion.div
                key={intg.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: idx < 9 ? idx * 0.04 : 0 }}
              >
                <IntegrationCard
                  intg={intg}
                  onConnect={() => openConfig(intg)}
                  onDisconnect={() => handleDisconnect(intg)}
                  onConfigure={() => openConfig(intg)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3 opacity-40">
              <span className="text-4xl">◍</span>
              <p className="text-[14px] text-[#6B7A99]">Sin integraciones en esta categoría</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Config modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {configuring && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(5,8,16,0.85)", backdropFilter: "blur(16px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setConfiguring(null); }}
          >
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2 }}
              className="glass-strong rounded-2xl w-full max-w-md border border-[#1A2744] p-6 space-y-5"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{
                      background: `${configuring.color}12`,
                      border:     `1px solid ${configuring.color}30`,
                    }}
                  >
                    {configuring.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-[16px] text-[#E8ECF4]">
                      Configurar {configuring.name}
                    </h3>
                    <p className="text-[11px] text-[#6B7A99]">{configuring.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfiguring(null)}
                  className="text-[#6B7A99] hover:text-[#E8ECF4] transition-colors text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              {/* API Key field */}
              <div>
                <label className="text-[11px] text-[#6B7A99] mb-1.5 block tracking-wide">
                  API Key <span className="text-[#FF4757]">*</span>
                </label>
                <div className="relative">
                  <input
                    className="astraeo-input pr-10"
                    type={apiVisible ? "text" : "password"}
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoFocus
                  />
                  <button
                    onClick={() => setApiVisible((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A99] hover:text-[#E8ECF4] transition-colors text-[13px]"
                    type="button"
                  >
                    {apiVisible ? "◑" : "◐"}
                  </button>
                </div>
                {/* Instructions */}
                <p className="text-[10px] text-[#6B7A99]/70 mt-1.5 leading-relaxed">
                  {getInstructions(configuring.name)}
                </p>
              </div>

              {/* Extra config fields */}
              {Object.keys(configuring.config).map((key) => (
                <div key={key}>
                  <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide capitalize">
                    {key}
                  </label>
                  <input
                    className="astraeo-input"
                    placeholder={key}
                    value={config[key] ?? ""}
                    onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                  />
                </div>
              ))}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setConfiguring(null)}
                  className="btn-ghost flex-1 justify-center"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConnect}
                  disabled={!apiKey.trim()}
                  className="btn-primary flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Guardar y Conectar
                </button>
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
  intg,
  onConnect,
  onDisconnect,
  onConfigure,
}: {
  intg: Integration;
  onConnect: () => void;
  onDisconnect: () => void;
  onConfigure: () => void;
}) {
  return (
    <div
      className="premium-card p-5 flex flex-col gap-4 h-full"
      style={{
        borderColor: intg.connected ? `${intg.color}35` : undefined,
      }}
    >
      {/* Top: icon + name + status badge */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              background:   `${intg.color}18`,
              border:       `1px solid ${intg.color}30`,
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              fontSize:     22,
              flexShrink:   0,
            }}
          >
            {intg.icon}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#E8ECF4]">{intg.name}</p>
            <p className="text-[10px] text-[#6B7A99]">{intg.category}</p>
          </div>
        </div>

        {/* Status pill */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border flex-shrink-0"
          style={
            intg.connected
              ? { background: "rgba(0,229,160,0.08)", borderColor: "rgba(0,229,160,0.25)", color: "#00E5A0" }
              : { background: "rgba(107,122,153,0.08)", borderColor: "#1A2744",            color: "#6B7A99" }
          }
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${intg.connected ? "bg-[#00E5A0] animate-pulse" : "bg-[#6B7A99]"}`}
          />
          {intg.connected ? "Conectado" : "Offline"}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        {intg.connected ? (
          <>
            <button
              onClick={onConfigure}
              className="btn-ghost flex-1 text-[11px] py-2 justify-center"
            >
              Configurar →
            </button>
            <button
              onClick={onDisconnect}
              className="btn-danger text-[11px] py-2 px-3 justify-center"
            >
              Desconectar
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="btn-primary flex-1 text-[11px] py-2 justify-center"
          >
            Conectar →
          </button>
        )}
      </div>
    </div>
  );
}
