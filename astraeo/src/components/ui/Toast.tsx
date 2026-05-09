"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircleIcon, XCircleIcon, AlertTriangleIcon, InfoIcon, XIcon } from "lucide-react";
import { useAstraeo } from "@/store/astraeo";

const TYPE_CONFIG = {
  success: {
    icon: CheckCircleIcon,
    color: "#00E5A0",
    bg: "rgba(0,229,160,0.08)",
    border: "rgba(0,229,160,0.22)",
    glow: "rgba(0,229,160,0.15)",
    bar: "#00E5A0",
  },
  error: {
    icon: XCircleIcon,
    color: "#FF4757",
    bg: "rgba(122,48,64,0.08)",
    border: "rgba(122,48,64,0.22)",
    glow: "rgba(122,48,64,0.15)",
    bar: "#FF4757",
  },
  warning: {
    icon: AlertTriangleIcon,
    color: "#FFB800",
    bg: "rgba(255,184,0,0.08)",
    border: "rgba(255,184,0,0.22)",
    glow: "rgba(255,184,0,0.15)",
    bar: "#FFB800",
  },
  info: {
    icon: InfoIcon,
    color: "#B8A06A",
    bg: "rgba(0,212,255,0.08)",
    border: "rgba(0,212,255,0.22)",
    glow: "rgba(0,212,255,0.15)",
    bar: "#B8A06A",
  },
} as const;

interface ToastItemProps {
  id: string;
  type: keyof typeof TYPE_CONFIG;
  message: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

function ToastItem({ id, type, message, duration = 4000, onDismiss }: ToastItemProps) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.info;
  const Icon = cfg.icon;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.88, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: "linear" }}
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: 2,
          background: cfg.bar,
          transformOrigin: "left center",
          opacity: 0.7,
        }}
      />

      <div
        style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: "13px 14px 15px",
          minWidth: 300, maxWidth: 400,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderRadius: 12,
          backdropFilter: "blur(24px) saturate(1.4)",
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}
      >
        {/* Icon */}
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: `${cfg.color}16`,
          border: `1px solid ${cfg.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 1,
        }}>
          <Icon size={14} color={cfg.color} />
        </div>

        {/* Message */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
          <p style={{
            color: "#E8ECF8",
            fontSize: 13,
            fontWeight: 500,
            margin: 0,
            lineHeight: 1.45,
            fontFamily: "var(--font-ui, 'Space Grotesk', sans-serif)",
          }}>
            {message}
          </p>
        </div>

        {/* Close */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onDismiss(id)}
          style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#6A7898",
            marginTop: 2,
          }}
        >
          <XIcon size={10} />
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useAstraeo();

  return (
    <div style={{
      position: "fixed",
      bottom: 24, right: 24,
      zIndex: 200,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      pointerEvents: "none",
    }}>
      <AnimatePresence mode="sync">
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: "auto" }}>
            <ToastItem
              id={t.id}
              type={t.type as keyof typeof TYPE_CONFIG}
              message={t.message}
              onDismiss={dismissToast}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
