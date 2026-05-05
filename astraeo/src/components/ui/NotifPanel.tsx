"use client";
import { useAstraeo } from "@/store/astraeo";

const typeIcon: Record<string, string> = { info: "ℹ", success: "✓", warning: "⚠", error: "✕" };
const typeColor: Record<string, string> = {
  info: "#00D4FF", success: "#00E5A0", warning: "#FFB800", error: "#FF4757",
};

export default function NotifPanel() {
  const { notifPanelOpen, notifications, markNotificationRead, markAllRead, toggleNotifPanel } = useAstraeo();

  return (
    <div
      className={`fixed right-0 top-14 w-88 h-[calc(100vh-3.5rem)] glass-strong border-l border-[#1A2744]/60 z-50 transition-transform duration-300 flex flex-col`}
      style={{
        width: 360,
        transform: notifPanelOpen ? "translateX(0)" : "translateX(100%)",
      }}
    >
      <div className="px-5 py-4 border-b border-[#1A2744]/60 flex items-center justify-between flex-shrink-0">
        <h3 className="font-bold text-[14px] tracking-wide">Notificaciones</h3>
        <div className="flex gap-3 items-center">
          <button onClick={markAllRead} className="text-[11px] text-[#00D4FF] hover:underline tracking-wide">
            Marcar todo
          </button>
          <button onClick={toggleNotifPanel} className="w-7 h-7 rounded-lg glass flex items-center justify-center text-[#6B7A99] hover:text-[#E8ECF4] transition-all text-[12px]">
            ✕
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => markNotificationRead(n.id)}
            className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
              n.read
                ? "glass border-[#1A2744]/40 opacity-60"
                : "glass-card border-[#1A2744] hover:border-[#00D4FF]/25"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
                style={{ background: `${typeColor[n.type]}12`, color: typeColor[n.type], border: `1px solid ${typeColor[n.type]}25` }}
              >
                {typeIcon[n.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#E8ECF4] truncate">{n.title}</p>
                <p className="text-[11px] text-[#6B7A99] mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-[#6B7A99]/60 mt-1 font-mono">
                  {new Date(n.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {!n.read && (
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: typeColor[n.type] }} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
