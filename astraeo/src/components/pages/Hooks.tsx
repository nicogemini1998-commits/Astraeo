"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ZapIcon, PlusIcon, XIcon, CheckIcon, PlayIcon,
  ActivityIcon, ClockIcon, AlertTriangleIcon,
  ChevronRightIcon, CodeIcon, BellIcon,
  GitBranchIcon, SendIcon, MailIcon, HashIcon,
  StopCircleIcon, RotateCcwIcon, SearchIcon,
} from "lucide-react";
import { useAstraeo } from "@/store/astraeo";
import type { Hook, HookTrigger, HookAction } from "@/lib/types";

// ─── Config maps ──────────────────────────────────────────────────────────────

const TRIGGER_CONFIG: Record<HookTrigger, { label: string; desc: string; color: string; icon: typeof ZapIcon; group: string }> = {
  "pre-message":      { label: "Pre-Mensaje",      desc: "Antes de enviar un mensaje",        color: "#6655CC", icon: ChevronRightIcon, group: "Mensajes" },
  "post-message":     { label: "Post-Mensaje",     desc: "Después de recibir respuesta",      color: "#6655CC", icon: SendIcon,         group: "Mensajes" },
  "agent-start":      { label: "Agente Iniciado",  desc: "Al activar un agente",              color: "#4A8EB8", icon: PlayIcon,         group: "Agentes" },
  "agent-end":        { label: "Agente Terminado", desc: "Al finalizar sesión de agente",     color: "#4A8EB8", icon: StopCircleIcon,   group: "Agentes" },
  "workflow-start":   { label: "Workflow Inicia",  desc: "Al comenzar un workflow",           color: "#3D8A60", icon: GitBranchIcon,    group: "Workflows" },
  "workflow-end":     { label: "Workflow Completa",desc: "Al terminar un workflow",           color: "#3D8A60", icon: CheckIcon,        group: "Workflows" },
  "schedule":         { label: "Programado",       desc: "En fecha/hora definida (cron)",     color: "#B88530", icon: ClockIcon,        group: "Tiempo" },
  "webhook":          { label: "Webhook Entrante", desc: "Al recibir petición HTTP externa",  color: "#B04858", icon: HashIcon,         group: "Externo" },
  "error":            { label: "Error",            desc: "Cuando ocurre un error",            color: "#A83C50", icon: AlertTriangleIcon,group: "Sistema" },
  "success":          { label: "Éxito",            desc: "Cuando una acción tiene éxito",     color: "#3D8A60", icon: CheckIcon,        group: "Sistema" },
};

const ACTION_CONFIG: Record<HookAction, { label: string; desc: string; color: string; icon: typeof ZapIcon }> = {
  notify:    { label: "Notificar",    desc: "Envía notificación in-app",        color: "#4A8EB8", icon: BellIcon },
  log:       { label: "Registrar",   desc: "Guarda en logs del sistema",        color: "#6655CC", icon: CodeIcon },
  transform: { label: "Transformar", desc: "Modifica datos del payload",        color: "#B88530", icon: RotateCcwIcon },
  webhook:   { label: "Webhook",     desc: "Envía datos a URL externa",         color: "#3D8A60", icon: SendIcon },
  email:     { label: "Email",       desc: "Envía email al destinatario",       color: "#B04858", icon: MailIcon },
  slack:     { label: "Slack",       desc: "Publica mensaje en canal Slack",    color: "#4A154B", icon: HashIcon },
  stop:      { label: "Detener",     desc: "Para la ejecución del flujo",       color: "#A83C50", icon: StopCircleIcon },
  branch:    { label: "Bifurcar",    desc: "Dirige a rama condicional",         color: "#B88530", icon: GitBranchIcon },
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function relTime(ts?: string): string {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return "hace unos segundos";
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)}h`;
  return `hace ${Math.floor(diff / 86_400_000)}d`;
}

// ─── Hook List Item ───────────────────────────────────────────────────────────

function HookItem({ hook, active, onSelect, onToggle }: {
  hook: Hook;
  active: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const trig = TRIGGER_CONFIG[hook.trigger];
  const act = ACTION_CONFIG[hook.action];
  const TrigIcon = trig.icon;
  const ActIcon = act.icon;
  const successRate = hook.runCount > 0 ? Math.round((hook.successCount / hook.runCount) * 100) : 100;

  return (
    <motion.div
      onClick={onSelect}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.12 }}
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${active ? `${hook.color}35` : "rgba(26,39,68,0.4)"}`,
        background: active ? `${hook.color}05` : "rgba(8,12,26,0.5)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 4,
        transition: "border-color 0.2s, background 0.2s",
        position: "relative",
      }}
    >
      {/* Active indicator */}
      <div style={{
        width: 3, height: "100%",
        position: "absolute", left: 0, top: 0, bottom: 0,
        borderRadius: "3px 0 0 3px",
        background: active ? hook.color : "transparent",
        boxShadow: active ? `0 0 6px ${hook.color}` : "none",
      }} />

      {/* Status dot */}
      <div style={{ paddingLeft: 6, flexShrink: 0 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: hook.active ? hook.color : "#4A5568",
          boxShadow: hook.active ? `0 0 6px ${hook.color}` : "none",
          animation: hook.active ? "pulse 2s infinite" : "none",
        }} />
      </div>

      {/* Trigger badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "3px 7px", borderRadius: 5, flexShrink: 0,
        background: `${trig.color}10`,
        border: `1px solid ${trig.color}22`,
      }}>
        <TrigIcon size={9} color={trig.color} />
        <span style={{ fontSize: 9, color: trig.color, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
          {trig.label}
        </span>
      </div>

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 12, fontWeight: 600, color: active ? "#F0EDE6" : "#B0BAD4",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          marginBottom: 2,
        }}>
          {hook.name}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, color: "#4A5568", fontFamily: "var(--font-mono)" }}>
            {hook.runCount.toLocaleString()} runs
          </span>
          <span style={{ fontSize: 8, color: "#4A4A5A" }}>·</span>
          <span style={{ fontSize: 9, color: successRate >= 95 ? "#3D8A60" : successRate >= 80 ? "#B88530" : "#A83C50", fontFamily: "var(--font-mono)" }}>
            {successRate}%
          </span>
        </div>
      </div>

      {/* Arrow + Action */}
      <ChevronRightIcon size={10} color="#4A4A5A" style={{ flexShrink: 0 }} />
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "3px 7px", borderRadius: 5, flexShrink: 0,
        background: `${act.color}10`,
        border: `1px solid ${act.color}22`,
      }}>
        <ActIcon size={9} color={act.color} />
        <span style={{ fontSize: 9, color: act.color, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
          {act.label}
        </span>
      </div>

      {/* Toggle */}
      <motion.button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        whileTap={{ scale: 0.85 }}
        style={{
          width: 30, height: 17, borderRadius: 8.5, flexShrink: 0,
          background: hook.active ? `${hook.color}25` : "rgba(26,39,68,0.8)",
          border: `1px solid ${hook.active ? `${hook.color}50` : "rgba(26,39,68,0.9)"}`,
          position: "relative", cursor: "pointer", padding: 0,
          transition: "all 0.2s",
        }}
      >
        <motion.div
          animate={{ x: hook.active ? 13 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{
            position: "absolute", top: 2,
            width: 11, height: 11, borderRadius: "50%",
            background: hook.active ? hook.color : "#4A5568",
          }}
        />
      </motion.button>
    </motion.div>
  );
}

// ─── Hook Detail Panel ────────────────────────────────────────────────────────

function HookDetail({ hook, onClose, onToggle, onDelete }: {
  hook: Hook;
  onClose: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const trig = TRIGGER_CONFIG[hook.trigger];
  const act = ACTION_CONFIG[hook.action];
  const TrigIcon = trig.icon;
  const ActIcon = act.icon;
  const successRate = hook.runCount > 0 ? ((hook.successCount / hook.runCount) * 100).toFixed(1) : "100.0";
  const failRate = hook.runCount > 0 ? ((hook.failCount / hook.runCount) * 100).toFixed(1) : "0.0";

  return (
    <motion.div
      key={hook.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.22, ease: EASE }}
      style={{
        flex: 1, display: "flex", flexDirection: "column",
        background: "rgba(8,12,26,0.5)",
        borderRadius: 14,
        border: `1px solid ${hook.color}20`,
        overflow: "hidden",
      }}
    >
      {/* Detail header */}
      <div style={{
        padding: "16px 20px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: `linear-gradient(135deg, ${hook.color}08 0%, transparent 60%)`,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: hook.active ? hook.color : "#4A5568",
                boxShadow: hook.active ? `0 0 8px ${hook.color}` : "none",
                animation: hook.active ? "pulse 2s infinite" : "none",
              }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#F0EDE6" }}>{hook.name}</h3>
            </div>
            <p style={{ fontSize: 12, color: "#6A7898", lineHeight: 1.5 }}>{hook.description}</p>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer", color: "#6A7898",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <XIcon size={12} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

        {/* Trigger → Action flow */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "14px 16px", borderRadius: 10,
          background: "rgba(10,15,31,0.6)",
          border: "1px solid rgba(26,39,68,0.5)",
          marginBottom: 16,
        }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px", borderRadius: 8,
            background: `${trig.color}0C`,
            border: `1px solid ${trig.color}25`,
          }}>
            <TrigIcon size={15} color={trig.color} />
            <div>
              <p style={{ fontSize: 10, color: trig.color, fontWeight: 700, letterSpacing: "0.05em" }}>{trig.label}</p>
              <p style={{ fontSize: 9, color: "#4A5568" }}>{trig.desc}</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <div style={{ width: 16, height: 1, background: "rgba(255,255,255,0.1)" }} />
            <ZapIcon size={10} color="#4A5568" />
            <div style={{ width: 16, height: 1, background: "rgba(255,255,255,0.1)" }} />
          </div>

          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px", borderRadius: 8,
            background: `${act.color}0C`,
            border: `1px solid ${act.color}25`,
          }}>
            <ActIcon size={15} color={act.color} />
            <div>
              <p style={{ fontSize: 10, color: act.color, fontWeight: 700, letterSpacing: "0.05em" }}>{act.label}</p>
              <p style={{ fontSize: 9, color: "#4A5568" }}>{act.desc}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[
            { label: "EJECUCIONES",   value: hook.runCount.toLocaleString(), color: hook.color },
            { label: "TASA ÉXITO",    value: `${successRate}%`,              color: "#3D8A60" },
            { label: "TASA FALLO",    value: `${failRate}%`,                 color: Number(failRate) > 5 ? "#A83C50" : "#4A5568" },
          ].map((s) => (
            <div key={s.label} style={{
              padding: "10px 12px", borderRadius: 8,
              background: `${s.color}08`,
              border: `1px solid ${s.color}15`,
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              <span style={{ fontSize: 8, color: "#4A5568", letterSpacing: "0.08em" }}>{s.label}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Last run */}
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: "rgba(10,15,31,0.5)",
          border: "1px solid rgba(26,39,68,0.4)",
          display: "flex", alignItems: "center", gap: 8,
          marginBottom: 16,
        }}>
          <ClockIcon size={12} color="#4A5568" />
          <span style={{ fontSize: 11, color: "#6A7898" }}>
            Última ejecución: <span style={{ color: "#F0EDE6", fontFamily: "var(--font-mono)" }}>{relTime(hook.lastRun)}</span>
          </span>
        </div>

        {/* Config preview */}
        {(Object.keys(hook.triggerConfig).length > 0 || Object.keys(hook.actionConfig).length > 0) && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: "#4A5568", letterSpacing: "0.06em", marginBottom: 8 }}>CONFIGURACIÓN</p>
            <pre style={{
              fontSize: 11, color: "#6A7898",
              background: "rgba(10,15,31,0.7)",
              border: "1px solid rgba(26,39,68,0.5)",
              borderRadius: 8, padding: "12px 14px",
              overflow: "auto", margin: 0,
              fontFamily: "var(--font-mono)",
              lineHeight: 1.6,
              maxHeight: 160,
            }}>
              {JSON.stringify({ trigger: hook.triggerConfig, action: hook.actionConfig }, null, 2)}
            </pre>
          </div>
        )}

        {/* Success bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: "#4A5568", letterSpacing: "0.06em" }}>FIABILIDAD</span>
            <span style={{ fontSize: 10, color: "#3D8A60", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{successRate}%</span>
          </div>
          <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${successRate}%` }}
              transition={{ duration: 0.8, ease: EASE }}
              style={{
                height: "100%", borderRadius: 2,
                background: "linear-gradient(90deg, #3D8A60, #4A8EB8)",
                boxShadow: "0 0 6px rgba(0,229,160,0.5)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{
        padding: "12px 20px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        display: "flex", gap: 8,
      }}>
        <motion.button
          onClick={onToggle}
          whileTap={{ scale: 0.96 }}
          style={{
            flex: 2, padding: "9px 0", borderRadius: 9,
            border: `1px solid ${hook.active ? "rgba(255,71,87,0.3)" : `${hook.color}35`}`,
            background: hook.active ? "rgba(255,71,87,0.08)" : `${hook.color}10`,
            color: hook.active ? "#A83C50" : hook.color,
            fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}
        >
          {hook.active ? "⏸ Pausar" : "▶ Activar"}
        </motion.button>
        <motion.button
          onClick={onDelete}
          whileTap={{ scale: 0.96 }}
          style={{
            flex: 1, padding: "9px 0", borderRadius: 9,
            border: "1px solid rgba(255,71,87,0.25)",
            background: "rgba(255,71,87,0.06)",
            color: "#A83C50", fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}
        >
          Eliminar
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── New Hook Wizard ──────────────────────────────────────────────────────────

const HOOK_COLORS = ["#4A8EB8", "#6655CC", "#3D8A60", "#B88530", "#B04858", "#A83C50"];

function NewHookWizard({ onClose, onSave }: {
  onClose: () => void;
  onSave: (data: Omit<Hook, "id" | "createdAt" | "runCount" | "successCount" | "failCount">) => void;
}) {
  const [step, setStep] = useState(0);
  const [trigger, setTrigger] = useState<HookTrigger | null>(null);
  const [action, setAction] = useState<HookAction | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState("#4A8EB8");

  const canProceed = [
    trigger !== null,
    action !== null,
    name.trim().length > 0,
  ];

  const steps = ["Trigger", "Acción", "Nombre"];

  type TrigEntry = [HookTrigger, typeof TRIGGER_CONFIG[HookTrigger]];
  const groups: [string, TrigEntry[]][] = Object.entries(
    (Object.entries(TRIGGER_CONFIG) as TrigEntry[]).reduce<Record<string, TrigEntry[]>>(
      (acc, [k, v]) => {
        if (!acc[v.group]) acc[v.group] = [];
        acc[v.group].push([k, v]);
        return acc;
      },
      {}
    )
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(5,8,16,0.88)", backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520,
          borderRadius: 20,
          border: "1px solid rgba(0,212,255,0.2)",
          background: "rgba(8,12,26,0.98)",
          backdropFilter: "blur(40px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Wizard header */}
        <div style={{
          padding: "18px 24px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#F0EDE6", marginBottom: 3 }}>Nuevo Hook</h3>
            <p style={{ fontSize: 11, color: "#4A5568" }}>Paso {step + 1} de {steps.length} — {steps[step]}</p>
          </div>
          {/* Step pills */}
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {steps.map((s, i) => (
              <div key={s} style={{
                width: i === step ? 24 : 8, height: 8, borderRadius: 4,
                background: i < step ? "#3D8A60" : i === step ? "#4A8EB8" : "rgba(26,39,68,0.8)",
                transition: "all 0.25s",
              }} />
            ))}
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer", color: "#6A7898",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <XIcon size={12} />
          </button>
        </div>

        {/* Steps */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", minHeight: 320 }}>
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-trigger"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                <p style={{ fontSize: 11, color: "#4A5568", marginBottom: 14, letterSpacing: "0.04em" }}>
                  ¿QUÉ EVENTO DISPARA ESTE HOOK?
                </p>
                {groups.map(([group, items]) => (
                  <div key={group} style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 9, color: "#4A4A5A", letterSpacing: "0.1em", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
                      {group.toUpperCase()}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {(items as TrigEntry[]).map(([k, v]) => {
                        const Icon = v.icon;
                        const sel = trigger === k;
                        return (
                          <motion.button
                            key={k}
                            onClick={() => setTrigger(k)}
                            whileTap={{ scale: 0.98 }}
                            style={{
                              padding: "10px 12px", borderRadius: 8,
                              border: `1px solid ${sel ? `${v.color}40` : "rgba(26,39,68,0.5)"}`,
                              background: sel ? `${v.color}0C` : "rgba(10,15,31,0.4)",
                              cursor: "pointer", textAlign: "left",
                              display: "flex", alignItems: "center", gap: 10,
                              transition: "all 0.15s",
                            }}
                          >
                            <Icon size={14} color={sel ? v.color : "#4A5568"} />
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: sel ? "#F0EDE6" : "#6A7898" }}>{v.label}</p>
                              <p style={{ fontSize: 10, color: "#4A5568" }}>{v.desc}</p>
                            </div>
                            {sel && <CheckIcon size={13} color={v.color} />}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-action"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                <p style={{ fontSize: 11, color: "#4A5568", marginBottom: 14, letterSpacing: "0.04em" }}>
                  ¿QUÉ DEBE HACER AL ACTIVARSE?
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(Object.entries(ACTION_CONFIG) as [HookAction, typeof ACTION_CONFIG[HookAction]][]).map(([k, v]) => {
                    const Icon = v.icon;
                    const sel = action === k;
                    return (
                      <motion.button
                        key={k}
                        onClick={() => setAction(k)}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          padding: "14px",
                          borderRadius: 10,
                          border: `1px solid ${sel ? `${v.color}40` : "rgba(26,39,68,0.5)"}`,
                          background: sel ? `${v.color}0C` : "rgba(10,15,31,0.4)",
                          cursor: "pointer", textAlign: "left",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, marginBottom: 8,
                          background: `${v.color}12`,
                          border: `1px solid ${v.color}22`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Icon size={15} color={sel ? v.color : "#4A5568"} />
                        </div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: sel ? "#F0EDE6" : "#6A7898", marginBottom: 2 }}>{v.label}</p>
                        <p style={{ fontSize: 10, color: "#4A5568", lineHeight: 1.4 }}>{v.desc}</p>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-name"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div>
                  <label style={{ fontSize: 10, color: "#4A5568", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>NOMBRE DEL HOOK *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    placeholder="Ej: Log automático de conversaciones..."
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      background: "rgba(10,15,31,0.6)",
                      border: "1px solid rgba(26,39,68,0.7)",
                      color: "#F0EDE6", fontSize: 13, boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#4A5568", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>DESCRIPCIÓN</label>
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Describe para qué sirve este hook..."
                    rows={3}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      background: "rgba(10,15,31,0.6)",
                      border: "1px solid rgba(26,39,68,0.7)",
                      color: "#F0EDE6", fontSize: 12, lineHeight: 1.5, resize: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#4A5568", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>COLOR</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {HOOK_COLORS.map((c) => (
                      <button key={c} onClick={() => setColor(c)} style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: c,
                        border: color === c ? `2.5px solid #fff` : "2px solid transparent",
                        cursor: "pointer",
                        boxShadow: color === c ? `0 0 10px ${c}70` : "none",
                        transition: "all 0.15s",
                      }} />
                    ))}
                  </div>
                </div>

                {/* Summary */}
                {trigger && action && (
                  <div style={{
                    padding: "12px 14px", borderRadius: 10,
                    background: "rgba(10,15,31,0.5)",
                    border: "1px solid rgba(26,39,68,0.5)",
                  }}>
                    <p style={{ fontSize: 10, color: "#4A5568", letterSpacing: "0.05em", marginBottom: 8 }}>RESUMEN DEL HOOK</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{
                        padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                        background: `${TRIGGER_CONFIG[trigger].color}10`,
                        color: TRIGGER_CONFIG[trigger].color,
                        border: `1px solid ${TRIGGER_CONFIG[trigger].color}25`,
                      }}>
                        {TRIGGER_CONFIG[trigger].label}
                      </span>
                      <ChevronRightIcon size={12} color="#4A4A5A" />
                      <span style={{
                        padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                        background: `${ACTION_CONFIG[action].color}10`,
                        color: ACTION_CONFIG[action].color,
                        border: `1px solid ${ACTION_CONFIG[action].color}25`,
                      }}>
                        {ACTION_CONFIG[action].label}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 24px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "flex", gap: 8,
        }}>
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} style={{
              flex: 1, padding: "10px 0", borderRadius: 9,
              border: "1px solid rgba(26,39,68,0.7)",
              background: "transparent", color: "#6A7898",
              fontSize: 12, fontWeight: 500, cursor: "pointer",
            }}>
              ← Atrás
            </button>
          )}
          {step < 2 ? (
            <motion.button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed[step]}
              whileTap={{ scale: 0.97 }}
              style={{
                flex: 2, padding: "10px 0", borderRadius: 9,
                border: "1px solid rgba(0,212,255,0.35)",
                background: "rgba(0,212,255,0.1)",
                color: "#4A8EB8", fontSize: 12, fontWeight: 700, cursor: "pointer",
                opacity: canProceed[step] ? 1 : 0.4,
              }}
            >
              Siguiente →
            </motion.button>
          ) : (
            <motion.button
              onClick={() => {
                if (!trigger || !action || !name.trim()) return;
                onSave({
                  name, description: desc, trigger, triggerConfig: {},
                  action, actionConfig: {}, active: true, color,
                  lastRun: undefined,
                });
              }}
              disabled={!canProceed[2]}
              whileTap={{ scale: 0.97 }}
              style={{
                flex: 2, padding: "10px 0", borderRadius: 9,
                border: "1px solid rgba(0,229,160,0.35)",
                background: "rgba(0,229,160,0.1)",
                color: "#3D8A60", fontSize: 12, fontWeight: 700, cursor: "pointer",
                opacity: canProceed[2] ? 1 : 0.4,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              }}
            >
              <CheckIcon size={13} />
              Crear Hook
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HooksPage() {
  const { hooks, toggleHook, addHook, deleteHook } = useAstraeo();
  const [selected, setSelected] = useState<Hook | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTrigger, setFilterTrigger] = useState<HookTrigger | "all">("all");

  const activeCount = hooks.filter((h) => h.active).length;
  const totalRuns = hooks.reduce((s, h) => s + h.runCount, 0);

  const filtered = hooks.filter((h) => {
    const matchSearch = !search || h.name.toLowerCase().includes(search.toLowerCase()) || h.description.toLowerCase().includes(search.toLowerCase());
    const matchTrigger = filterTrigger === "all" || h.trigger === filterTrigger;
    return matchSearch && matchTrigger;
  });

  const triggerGroups = Object.entries(
    hooks.reduce<Partial<Record<HookTrigger, number>>>((acc, h) => {
      acc[h.trigger] = (acc[h.trigger] ?? 0) + 1;
      return acc;
    }, {})
  );

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: "transparent", overflow: "hidden",
    }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        padding: "18px 24px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(5,8,20,0.6)",
        backdropFilter: "blur(20px)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "linear-gradient(135deg, rgba(0,229,160,0.15), rgba(0,212,255,0.1))",
                border: "1px solid rgba(0,229,160,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ActivityIcon size={15} color="#3D8A60" />
              </div>
              <h1 style={{
                fontSize: 20, fontWeight: 800, color: "#F0EDE6",
                letterSpacing: "0.08em",
                background: "linear-gradient(135deg, #E8ECF8 0%, #3D8A60 50%, #4A8EB8 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                HOOKS
              </h1>
            </div>
            <p style={{ fontSize: 12, color: "#6A7898" }}>
              Automatizaciones por eventos · {activeCount} activos de {hooks.length} totales
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{
              padding: "6px 12px", borderRadius: 8,
              background: "rgba(0,229,160,0.08)",
              border: "1px solid rgba(0,229,160,0.18)",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <PlayIcon size={10} color="#3D8A60" />
              <span style={{ fontSize: 11, color: "#3D8A60", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                {totalRuns.toLocaleString()} runs
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowWizard(true)}
              style={{
                padding: "7px 16px", borderRadius: 8,
                background: "linear-gradient(135deg, rgba(0,229,160,0.15), rgba(0,212,255,0.1))",
                border: "1px solid rgba(0,229,160,0.3)",
                color: "#3D8A60", fontSize: 12, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <PlusIcon size={13} />
              Nuevo Hook
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", gap: 0, overflow: "hidden" }}>

        {/* Left: List */}
        <div style={{
          width: 400, flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.04)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Search + filter */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <SearchIcon size={12} color="#4A5568" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar hooks..."
                style={{
                  width: "100%", padding: "7px 10px 7px 28px",
                  borderRadius: 7,
                  background: "rgba(10,15,31,0.6)",
                  border: "1px solid rgba(26,39,68,0.7)",
                  color: "#F0EDE6", fontSize: 12, boxSizing: "border-box",
                }}
              />
            </div>

            {/* Trigger filter chips */}
            <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2 }}>
              <button onClick={() => setFilterTrigger("all")} style={{
                padding: "3px 9px", borderRadius: 5, flexShrink: 0,
                background: filterTrigger === "all" ? "rgba(232,236,248,0.1)" : "transparent",
                border: `1px solid ${filterTrigger === "all" ? "rgba(232,236,248,0.2)" : "rgba(26,39,68,0.4)"}`,
                color: filterTrigger === "all" ? "#F0EDE6" : "#4A5568",
                fontSize: 10, fontWeight: 600, cursor: "pointer",
              }}>
                Todos ({hooks.length})
              </button>
              {triggerGroups.map(([k, count]) => {
                const cfg = TRIGGER_CONFIG[k as HookTrigger];
                const sel = filterTrigger === k;
                return (
                  <button key={k} onClick={() => setFilterTrigger(k as HookTrigger)} style={{
                    padding: "3px 9px", borderRadius: 5, flexShrink: 0,
                    background: sel ? `${cfg.color}12` : "transparent",
                    border: `1px solid ${sel ? `${cfg.color}30` : "rgba(26,39,68,0.4)"}`,
                    color: sel ? cfg.color : "#4A5568",
                    fontSize: 10, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <cfg.icon size={8} />
                    {cfg.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hook list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
            <AnimatePresence>
              {filtered.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center" }}>
                  <ZapIcon size={24} color="#4A4A5A" style={{ margin: "0 auto 10px" }} />
                  <p style={{ color: "#4A4A5A", fontSize: 12 }}>No hay hooks que coincidan</p>
                </div>
              ) : (
                filtered.map((hook) => (
                  <motion.div
                    key={hook.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <HookItem
                      hook={hook}
                      active={selected?.id === hook.id}
                      onSelect={() => setSelected(hook)}
                      onToggle={() => toggleHook(hook.id)}
                    />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Detail or empty state */}
        <div style={{ flex: 1, padding: "16px", overflow: "hidden", display: "flex" }}>
          <AnimatePresence mode="wait">
            {selected ? (
              <HookDetail
                key={selected.id}
                hook={selected}
                onClose={() => setSelected(null)}
                onToggle={() => {
                  toggleHook(selected.id);
                  setSelected((prev) => prev ? { ...prev, active: !prev.active } : null);
                }}
                onDelete={() => {
                  deleteHook(selected.id);
                  setSelected(null);
                }}
              />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 16,
                  background: "rgba(8,12,26,0.3)",
                  borderRadius: 14,
                  border: "1px solid rgba(26,39,68,0.3)",
                }}
              >
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: "rgba(0,229,160,0.06)",
                  border: "1px solid rgba(0,229,160,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <ActivityIcon size={28} color="#1E3040" />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#4A4A5A", marginBottom: 5 }}>
                    Selecciona un hook
                  </p>
                  <p style={{ fontSize: 12, color: "#2A3550", maxWidth: 220 }}>
                    Haz clic en cualquier hook de la lista para ver sus detalles y configuración
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowWizard(true)}
                  style={{
                    padding: "9px 18px", borderRadius: 9,
                    border: "1px solid rgba(0,229,160,0.3)",
                    background: "rgba(0,229,160,0.07)",
                    color: "#3D8A60", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <PlusIcon size={13} />
                  Crear primer hook
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Wizard Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showWizard && (
          <NewHookWizard
            key="wizard"
            onClose={() => setShowWizard(false)}
            onSave={(data) => {
              addHook(data);
              setShowWizard(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
