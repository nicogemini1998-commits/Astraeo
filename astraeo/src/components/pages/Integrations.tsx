"use client";
import { useState } from "react";
import { useAstraeo } from "@/store/astraeo";
import type { Integration } from "@/lib/types";

const categories = ["Todas", "AI", "Comunicación", "Productividad", "Dev", "Analytics", "Pagos", "CRM", "Automatización"];

export default function Integrations() {
  const { integrations, connectIntegration, disconnectIntegration, showToast } = useAstraeo();
  const [filterCat, setFilterCat] = useState("Todas");
  const [configuring, setConfiguring] = useState<Integration | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [config, setConfig] = useState<Record<string, string>>({});

  const filtered = integrations.filter((i) => filterCat === "Todas" || i.category === filterCat);

  const handleConnect = () => {
    if (!configuring || !apiKey.trim()) return;
    connectIntegration(configuring.id, apiKey, config);
    showToast(`${configuring.name} conectado`, "success");
    setConfiguring(null);
    setApiKey("");
    setConfig({});
  };

  const handleDisconnect = (i: Integration) => {
    disconnectIntegration(i.id);
    showToast(`${i.name} desconectado`, "info");
  };

  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="px-6 py-4 border-b border-[#1A2744]/60 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-[15px] font-bold tracking-wide text-[#E8ECF4]">Integraciones</h2>
          <p className="text-[11px] text-[#6B7A99] font-mono">{connectedCount} conectadas de {integrations.length}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className="text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all"
              style={{
                background: filterCat === c ? "rgba(0,212,255,0.12)" : "transparent",
                color: filterCat === c ? "#00D4FF" : "#6B7A99",
                border: `1px solid ${filterCat === c ? "rgba(0,212,255,0.25)" : "#1A2744"}`,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((intg) => (
            <div key={intg.id}
              className="glass-card rounded-2xl p-5 border card-hover"
              style={{ borderColor: intg.connected ? `${intg.color}30` : "rgba(26,39,68,0.5)" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: `${intg.color}12`, border: `1px solid ${intg.color}25` }}
                  >
                    {intg.icon}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#E8ECF4]">{intg.name}</p>
                    <p className="text-[10px] text-[#6B7A99]">{intg.category}</p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border`}
                  style={intg.connected
                    ? { background: "rgba(0,229,160,0.08)", borderColor: "rgba(0,229,160,0.25)", color: "#00E5A0" }
                    : { background: "rgba(107,122,153,0.08)", borderColor: "#1A2744", color: "#6B7A99" }
                  }
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${intg.connected ? "bg-[#00E5A0] animate-pulse" : "bg-[#6B7A99]"}`} />
                  {intg.connected ? "Conectado" : "Offline"}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                {intg.connected ? (
                  <button onClick={() => handleDisconnect(intg)} className="btn-danger flex-1 text-[11px] py-2 justify-center">
                    Desconectar
                  </button>
                ) : (
                  <button onClick={() => { setConfiguring(intg); setApiKey(""); setConfig({}); }}
                    className="btn-primary flex-1 text-[11px] py-2 justify-center">
                    Conectar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Config modal */}
      {configuring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(5,8,16,0.85)", backdropFilter: "blur(16px)" }}>
          <div className="glass-strong rounded-2xl w-full max-w-md border border-[#1A2744] animate-scale-in p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{configuring.icon}</span>
                <div>
                  <h3 className="font-bold text-[16px]">Configurar {configuring.name}</h3>
                  <p className="text-[11px] text-[#6B7A99]">{configuring.category}</p>
                </div>
              </div>
              <button onClick={() => setConfiguring(null)} className="text-[#6B7A99] hover:text-[#E8ECF4]">✕</button>
            </div>
            <div>
              <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">API Key *</label>
              <input
                className="astraeo-input"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            {Object.keys(configuring.config).map((key) => (
              <div key={key}>
                <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide capitalize">{key}</label>
                <input
                  className="astraeo-input"
                  placeholder={key}
                  value={config[key] ?? ""}
                  onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfiguring(null)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={handleConnect} disabled={!apiKey.trim()} className="btn-primary flex-1 justify-center disabled:opacity-40">
                Conectar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
