"use client";
import { useAstraeo } from "@/store/astraeo";

const icons = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };
const colors = {
  success: { bg: "rgba(0,229,160,0.08)", border: "rgba(0,229,160,0.25)", text: "#00E5A0" },
  error: { bg: "rgba(255,71,87,0.08)", border: "rgba(255,71,87,0.25)", text: "#FF4757" },
  warning: { bg: "rgba(255,184,0,0.08)", border: "rgba(255,184,0,0.25)", text: "#FFB800" },
  info: { bg: "rgba(0,212,255,0.08)", border: "rgba(0,212,255,0.25)", text: "#00D4FF" },
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useAstraeo();
  return (
    <div className="fixed bottom-6 right-6 z-[100] space-y-2 pointer-events-none">
      {toasts.map((t) => {
        const c = colors[t.type];
        return (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl animate-slide-up pointer-events-auto"
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              backdropFilter: "blur(20px)",
              minWidth: 280,
            }}
          >
            <span className="font-bold" style={{ color: c.text }}>{icons[t.type]}</span>
            <span className="text-[13px] text-[#E8ECF4] flex-1">{t.message}</span>
            <button onClick={() => dismissToast(t.id)} className="text-[#6B7A99] hover:text-[#E8ECF4] ml-2">✕</button>
          </div>
        );
      })}
    </div>
  );
}
