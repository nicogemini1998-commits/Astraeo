"use client";
import Image from "next/image";
import { useAstraeo } from "@/store/astraeo";
import type { Page } from "@/lib/types";

interface NavItem {
  page: Page;
  icon: string;
  label: string;
  badge?: string | number;
  badgeColor?: string;
  dot?: string;
}

const navSections = [
  {
    label: "Principal",
    items: [
      { page: "overview" as Page, icon: "⬡", label: "Overview", dot: "#00E5A0" },
      { page: "chat" as Page, icon: "◎", label: "Chat Central", badge: 3, badgeColor: "#FF6B9D" },
      { page: "pixel-stage" as Page, icon: "◈", label: "Pixel Stage", badge: "LIVE", badgeColor: "#00D4FF" },
      { page: "commander" as Page, icon: "✦", label: "Comandante", badge: "AI", badgeColor: "#7B61FF" },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { page: "missions" as Page, icon: "◆", label: "Misiones", badge: 12, badgeColor: "#FFB800" },
      { page: "agents" as Page, icon: "◉", label: "Agentes", badge: 8 },
      { page: "workflows" as Page, icon: "◫", label: "Workflows", badge: "BETA", badgeColor: "#7B61FF" },
      { page: "memory" as Page, icon: "◍", label: "Memory Hub" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { page: "analytics" as Page, icon: "◷", label: "Analytics" },
      { page: "integrations" as Page, icon: "◌", label: "Integraciones" },
      { page: "settings" as Page, icon: "◎", label: "Ajustes" },
    ],
  },
];

export default function Sidebar() {
  const { currentPage, setPage, metrics, settings, sidebarOpen, integrations } = useAstraeo();
  const claudeConnected = integrations.find((i) => i.id === "int-1")?.connected;

  if (!sidebarOpen) return null;

  return (
    <aside className="w-72 h-full glass-strong flex flex-col z-50 flex-shrink-0 transition-all duration-300">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#1A2744]/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
               style={{ filter: "drop-shadow(0 0 12px rgba(0,212,255,0.4))" }}>
            <Image src="/astraeo-logo.png" alt="ASTRAEO" width={40} height={40}
              className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="gradient-text-full font-semibold text-[18px] tracking-[6px] font-display">
              ASTRAEO
            </h1>
            <p className="text-[9px] text-[#6B7A99] tracking-[3px] uppercase font-medium">
              Mission Control
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 text-[9px] font-semibold text-[#6B7A99] uppercase tracking-[0.22em] mb-2">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavButton
                  key={item.page}
                  item={item}
                  active={currentPage === item.page}
                  onClick={() => setPage(item.page)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Claude API status */}
      <div className="px-4 pb-3">
        <div className="glass rounded-xl p-3.5 space-y-2.5 border border-[#1A2744]/40">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-[#6B7A99] uppercase tracking-[0.15em] font-semibold">
              Claude API
            </span>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              claudeConnected
                ? "bg-[#00E5A0]/08 border-[#00E5A0]/25 text-[#00E5A0]"
                : "bg-[#FF4757]/08 border-[#FF4757]/25 text-[#FF4757]"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${claudeConnected ? "bg-[#00E5A0] animate-pulse" : "bg-[#FF4757]"}`} />
              {claudeConnected ? "Conectado" : "Offline"}
            </div>
          </div>
          <button
            onClick={() => setPage("settings")}
            className="w-full py-2 text-[11px] bg-[#00D4FF]/08 border border-[#00D4FF]/20 rounded-lg text-[#00D4FF] hover:bg-[#00D4FF]/15 transition-all font-semibold tracking-wider"
          >
            {claudeConnected ? "⚙ Gestionar API" : "⚷ Configurar API Key"}
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="p-4 border-t border-[#1A2744]/60">
        <div className="glass rounded-xl p-3.5 space-y-2.5 border border-[#1A2744]/40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6B7A99] tracking-wide text-[11px]">Sistema</span>
            <span className="text-[#00E5A0] font-mono font-semibold tracking-widest text-[10px]">ONLINE</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6B7A99] text-[11px]">Latencia API</span>
            <span className="text-[#00D4FF] font-mono font-semibold text-[11px]">
              {metrics.apiLatency > 0 ? `${metrics.apiLatency}ms` : "--ms"}
            </span>
          </div>
          <div className="w-full h-1 bg-[#1A2744]/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${metrics.efficiency}%`,
                background: "linear-gradient(90deg, #00D4FF, #7B61FF, #00E5A0)",
                boxShadow: "0 0 8px rgba(0,212,255,0.3)",
              }}
            />
          </div>
          <div className="text-[9px] text-[#6B7A99] text-center tracking-widest uppercase">
            {settings.userName} · {metrics.efficiency}% Efficiency
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 relative group ${
        active
          ? "nav-active text-[#00D4FF]"
          : "text-[#6B7A99] hover:text-[#E8ECF4] hover:bg-white/[0.03]"
      }`}
    >
      <span className={`text-lg w-5 text-center flex-shrink-0 ${active ? "text-[#00D4FF]" : "group-hover:text-[#E8ECF4]"}`}>
        {item.icon}
      </span>
      <span className="font-medium tracking-wide text-[13px]">{item.label}</span>
      {item.dot && (
        <div className="ml-auto w-2 h-2 rounded-full animate-pulse flex-shrink-0"
          style={{ background: item.dot, boxShadow: `0 0 8px ${item.dot}` }} />
      )}
      {item.badge !== undefined && !item.dot && (
        <span
          className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
          style={{
            background: item.badgeColor ? `${item.badgeColor}18` : "rgba(107,122,153,0.15)",
            color: item.badgeColor ?? "#6B7A99",
            border: `1px solid ${item.badgeColor ? `${item.badgeColor}35` : "#1A2744"}`,
          }}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}
