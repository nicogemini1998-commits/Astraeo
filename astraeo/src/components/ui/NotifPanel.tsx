"use client";
import { motion, AnimatePresence } from "framer-motion";
import { BellIcon, CheckCheckIcon, XIcon, InfoIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon, ZapIcon } from "lucide-react";
import { useAstraeo } from "@/store/astraeo";

const TYPE_CONFIG = {
  info:    { icon: InfoIcon,          color: "#00D4FF", bg: "rgba(0,212,255,0.08)",   border: "rgba(0,212,255,0.20)"   },
  success: { icon: CheckCircleIcon,   color: "#00E5A0", bg: "rgba(0,229,160,0.08)",   border: "rgba(0,229,160,0.20)"   },
  warning: { icon: AlertTriangleIcon, color: "#FFB800", bg: "rgba(255,184,0,0.08)",   border: "rgba(255,184,0,0.20)"   },
  error:   { icon: XCircleIcon,       color: "#FF4757", bg: "rgba(255,71,87,0.08)",   border: "rgba(255,71,87,0.20)"   },
} as const;

function relativeTime(ts: string | number): string {
  const diff = Date.now() - (typeof ts === "string" ? new Date(ts).getTime() : ts);
  if (diff < 60_000) return "ahora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

export default function NotifPanel() {
  const { notifPanelOpen, notifications, markNotificationRead, markAllRead, toggleNotifPanel } = useAstraeo();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <AnimatePresence>
      {notifPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="notif-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={toggleNotifPanel}
            style={{
              position: "fixed", inset: 0, zIndex: 49,
              background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)",
            }}
          />

          {/* Panel */}
          <motion.div
            key="notif-panel"
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            style={{
              position: "fixed", right: 0, top: 52,
              width: 380, height: "calc(100vh - 52px)",
              background: "rgba(7,9,22,0.97)",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(40px) saturate(1.5)",
              zIndex: 50, display: "flex", flexDirection: "column",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <BellIcon size={15} color="#00D4FF" />
                </div>
                <div>
                  <div style={{ color: "#E8ECF8", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em" }}>
                    Notificaciones
                  </div>
                  {unread > 0 && (
                    <div style={{ color: "#3A4560", fontSize: 10, fontFamily: "var(--font-mono)" }}>
                      {unread} sin leer
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {unread > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={markAllRead}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 10px", borderRadius: 6,
                      background: "rgba(0,229,160,0.08)", border: "1px solid rgba(0,229,160,0.2)",
                      color: "#00E5A0", fontSize: 10, fontFamily: "var(--font-mono)",
                      cursor: "pointer", letterSpacing: "0.05em",
                    }}
                  >
                    <CheckCheckIcon size={11} />
                    TODO LEÍDO
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                  onClick={toggleNotifPanel}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "#6A7898",
                  }}
                >
                  <XIcon size={13} />
                </motion.button>
              </div>
            </div>

            {/* Notification list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
              <AnimatePresence>
                {notifications.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      justifyContent: "center", height: 200, gap: 12,
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <ZapIcon size={20} color="#3A4560" />
                    </div>
                    <div style={{ color: "#3A4560", fontSize: 12, textAlign: "center" }}>
                      Sin notificaciones recientes
                    </div>
                  </motion.div>
                ) : (
                  notifications.map((n, i) => {
                    const cfg = TYPE_CONFIG[n.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.info;
                    const Icon = cfg.icon;
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: n.read ? 0.5 : 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: i * 0.04, duration: 0.25 }}
                        onClick={() => markNotificationRead(n.id)}
                        style={{
                          padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                          marginBottom: 8,
                          background: n.read ? "rgba(255,255,255,0.02)" : cfg.bg,
                          border: `1px solid ${n.read ? "rgba(255,255,255,0.04)" : cfg.border}`,
                          transition: "all 0.2s",
                        }}
                      >
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                            background: `${cfg.color}12`, border: `1px solid ${cfg.color}25`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <Icon size={13} color={cfg.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <p style={{ color: "#E8ECF8", fontSize: 12, fontWeight: 600, margin: 0 }}>
                                {n.title}
                              </p>
                              <span style={{ color: "#3A4560", fontSize: 10, fontFamily: "var(--font-mono)", flexShrink: 0, marginLeft: 8 }}>
                                {relativeTime(n.timestamp)}
                              </span>
                            </div>
                            <p style={{ color: "#6A7898", fontSize: 11, margin: "3px 0 0", lineHeight: 1.4 }}>
                              {n.message}
                            </p>
                          </div>
                          {!n.read && (
                            <div style={{
                              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                              background: cfg.color, boxShadow: `0 0 6px ${cfg.color}`,
                              marginTop: 4,
                            }} />
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div style={{
              padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#1E2840", fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>
                ASTRAEO · SISTEMA DE NOTIFICACIONES
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
