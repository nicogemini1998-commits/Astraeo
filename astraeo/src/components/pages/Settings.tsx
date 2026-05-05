"use client";
import { useState } from "react";
import { useAstraeo } from "@/store/astraeo";
import type { AppSettings } from "@/lib/types";

const models = [
  { id: "claude-opus-4-7", label: "Opus 4.7", sub: "Máximo razonamiento" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", sub: "Balance calidad/velocidad" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", sub: "Más rápido, económico" },
];

export default function SettingsPage() {
  const { settings, updateSettings, integrations, connectIntegration, showToast } = useAstraeo();
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  const claudeIntg = integrations.find((i) => i.id === "int-1");

  const handleSave = () => {
    updateSettings(localSettings);
    if (localSettings.claudeApiKey && localSettings.claudeApiKey !== settings.claudeApiKey) {
      connectIntegration("int-1", localSettings.claudeApiKey);
    }
    setSaved(true);
    showToast("Ajustes guardados", "success");
    setTimeout(() => setSaved(false), 2000);
  };

  const patch = (p: Partial<AppSettings>) => setLocalSettings((s) => ({ ...s, ...p }));

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-y-auto p-6">
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-[15px] font-bold tracking-wide text-[#E8ECF4]">Ajustes</h2>
          <p className="text-[11px] text-[#6B7A99] font-mono">Personaliza tu experiencia ASTRAEO</p>
        </div>

        {/* Claude API */}
        <Section title="Claude API" icon="🤖" color="#CC785C">
          <div>
            <label className="text-[11px] text-[#6B7A99] mb-1.5 block tracking-wide">API Key</label>
            <div className="relative">
              <input
                className="astraeo-input pr-12"
                type={apiKeyVisible ? "text" : "password"}
                placeholder="sk-ant-..."
                value={localSettings.claudeApiKey}
                onChange={(e) => patch({ claudeApiKey: e.target.value })}
              />
              <button
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A99] hover:text-[#E8ECF4] text-[12px]"
              >
                {apiKeyVisible ? "◑" : "◐"}
              </button>
            </div>
            {claudeIntg?.connected && (
              <p className="text-[11px] text-[#00E5A0] mt-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] animate-pulse inline-block" />
                API conectada
              </p>
            )}
          </div>
          <div>
            <label className="text-[11px] text-[#6B7A99] mb-2 block tracking-wide">Modelo predeterminado</label>
            <div className="space-y-2">
              {models.map((m) => (
                <label key={m.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: localSettings.claudeModel === m.id ? "rgba(0,212,255,0.06)" : "transparent",
                    border: `1px solid ${localSettings.claudeModel === m.id ? "rgba(0,212,255,0.2)" : "#1A2744"}`,
                  }}>
                  <input type="radio" name="model" value={m.id} checked={localSettings.claudeModel === m.id}
                    onChange={() => patch({ claudeModel: m.id })} className="accent-[#00D4FF]" />
                  <div>
                    <p className="text-[12px] font-semibold text-[#E8ECF4]">{m.label}</p>
                    <p className="text-[10px] text-[#6B7A99]">{m.sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </Section>

        {/* Perfil */}
        <Section title="Perfil" icon="◉" color="#00D4FF">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">Nombre de usuario</label>
              <input className="astraeo-input" placeholder="Comandante" value={localSettings.userName}
                onChange={(e) => patch({ userName: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">Rol / Título</label>
              <input className="astraeo-input" placeholder="Admin Level 5" value={localSettings.userRole}
                onChange={(e) => patch({ userRole: e.target.value })} />
            </div>
          </div>
        </Section>

        {/* Sistema */}
        <Section title="Sistema" icon="⬡" color="#7B61FF">
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
            <ToggleSetting
              label="Modo compacto"
              sub="Reduce el espaciado del interfaz"
              value={localSettings.compactMode}
              onChange={(v) => patch({ compactMode: v })}
            />
          </div>
        </Section>

        {/* Visual */}
        <Section title="Visual" icon="◈" color="#FF6B9D">
          <div>
            <label className="text-[11px] text-[#6B7A99] mb-1 block tracking-wide">
              Densidad del starfield: {localSettings.starfieldDensity}
            </label>
            <input
              type="range" min={20} max={200} value={localSettings.starfieldDensity}
              onChange={(e) => patch({ starfieldDensity: Number(e.target.value) })}
              className="w-full accent-[#FF6B9D]"
            />
          </div>
        </Section>

        {/* Contexto de Empresa */}
        <Section title="Contexto de Empresa" icon="🏢" color="#00E5A0">
          <div>
            <p className="text-[11px] text-[#6B7A99] mb-3 leading-relaxed">
              Define quién es tu empresa y en qué trabaja. Este contexto se inyecta automáticamente en el sistema prompt del Comandante y los agentes, permitiéndoles operar con pleno conocimiento del negocio.
            </p>
            <textarea
              className="astraeo-input resize-none leading-relaxed"
              rows={12}
              placeholder="Ej: Somos una consultora de ventas especializada en..."
              value={localSettings.companyContext ?? ""}
              onChange={(e) => patch({ companyContext: e.target.value })}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", lineHeight: "1.7" }}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-[#6B7A99] font-mono">
                {(localSettings.companyContext ?? "").length} caracteres
              </p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] animate-pulse" />
                <span className="text-[10px] text-[#00E5A0] font-semibold">Activo en Commander + Agentes</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Save */}
        <div className="flex gap-3 pb-6">
          <button onClick={() => setLocalSettings({ ...settings })} className="btn-ghost">
            Restaurar
          </button>
          <button onClick={handleSave} className="btn-primary px-8">
            {saved ? "✓ Guardado" : "Guardar ajustes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, color, children }: { title: string; icon: string; color: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl border border-[#1A2744]/50 overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1A2744]/50 flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <h3 className="text-[13px] font-semibold text-[#E8ECF4] tracking-wide">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function ToggleSetting({ label, sub, value, onChange }: {
  label: string; sub: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[13px] text-[#E8ECF4] font-medium">{label}</p>
        <p className="text-[11px] text-[#6B7A99]">{sub}</p>
      </div>
      <input type="checkbox" className="toggle flex-shrink-0" checked={value}
        onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}
