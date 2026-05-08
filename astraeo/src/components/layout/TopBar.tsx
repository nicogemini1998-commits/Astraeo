"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const EASE_STANDARD: [number, number, number, number] = [0.4, 0, 0.2, 1];
import { useAstraeo } from "@/store/astraeo";
import type { Page } from "@/lib/types";

const pageLabels: Record<Page, string> = {
  overview: "Overview",
  chat: "Chat Central",
  "pixel-stage": "Pixel Stage",
  missions: "Misiones",
  agents: "Agentes",
  workflows: "Workflows",
  memory: "Memory Hub",
  analytics: "Analytics",
  integrations: "Integraciones",
  settings: "Ajustes",
  commander: "Comandante",
};

const searchPlaceholders = [
  "Buscar agentes...",
  "Buscar misiones...",
  "Buscar workflows...",
];

export default function TopBar() {
  const {
    currentPage, toggleSidebar, toggleNotifPanel,
    notifications, settings, agents, setPage,
  } = useAstraeo();
  const [search, setSearch] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const onlineAgents = agents.filter((a) => a.status === "online").length;

  const searchResults = search.length > 1
    ? [
        ...agents.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
          .map((a) => ({ type: "Agente", label: a.name, sub: a.role, page: "agents" as Page })),
      ].slice(0, 5)
    : [];

  // Cycle placeholder every 3 seconds when search is empty and not focused
  useEffect(() => {
    if (search.length > 0 || searchFocus) return;
    const interval = setInterval(() => {
      setPlaceholderVisible(false);
      setTimeout(() => {
        setPlaceholderIdx((i) => (i + 1) % searchPlaceholders.length);
        setPlaceholderVisible(true);
      }, 200);
    }, 3000);
    return () => clearInterval(interval);
  }, [search, searchFocus]);

  return (
    <header className="h-14 glass border-b border-[#1A2744]/60 flex items-center justify-between px-6 z-40 flex-shrink-0">
      {/* Left: toggle + breadcrumb */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 rounded-lg hover:bg-white/[0.05] transition-all flex items-center justify-center text-[#6B7A99] hover:text-[#E8ECF4]"
        >
          ☰
        </button>
        <div className="flex items-center gap-2 text-sm select-none">
          <span className="text-[#6B7A99] tracking-wide text-[12px]">ASTRAEO</span>
          <span className="text-[#1A2744] text-[14px]">›</span>
          <motion.span
            key={currentPage}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: EASE_STANDARD }}
            className="text-[#E8ECF4] font-medium tracking-wide text-[13px]"
          >
            {pageLabels[currentPage]}
          </motion.span>
        </div>
      </div>

      {/* Center: search */}
      <div className="relative hidden md:block w-80">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7A99] text-[13px] pointer-events-none">
          ⌕
        </span>
        <motion.input
          type="text"
          placeholder={placeholderVisible ? searchPlaceholders[placeholderIdx] : ""}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setTimeout(() => setSearchFocus(false), 200)}
          animate={{ opacity: placeholderVisible ? 1 : 0.6 }}
          transition={{ duration: 0.2 }}
          className="astraeo-input pl-9 py-2 text-[13px]"
        />
        {searchFocus && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl border border-[#1A2744] z-50 overflow-hidden shadow-2xl animate-fade-in">
            {searchResults.map((r, i) => (
              <div
                key={i}
                onClick={() => setPage(r.page)}
                className="px-4 py-3 hover:bg-white/[0.04] cursor-pointer transition-all border-b border-[#1A2744]/40 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20 font-medium">
                    {r.type}
                  </span>
                  <span className="text-[13px] font-medium text-[#E8ECF4]">{r.label}</span>
                  <span className="text-[11px] text-[#6B7A99]">{r.sub}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Agent status badge — enhanced */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-[#1A2744]/60">
          <div
            className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] animate-pulse"
            style={{ boxShadow: "0 0 6px #00E5A0" }}
          />
          <span className="text-[#00E5A0] font-bold font-mono text-[13px] leading-none">
            {onlineAgents}
          </span>
          <span className="text-[#6B7A99] text-[11px]">agentes</span>
        </div>

        {/* Notif */}
        <motion.button
          onClick={toggleNotifPanel}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.1 }}
          className="relative w-8 h-8 rounded-xl glass border border-[#1A2744]/60 hover:border-[#00D4FF]/30 transition-colors flex items-center justify-center text-[#6B7A99] hover:text-[#E8ECF4]"
        >
          <span className="text-sm">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FF6B9D] rounded-full text-[9px] flex items-center justify-center text-white font-bold shadow-lg">
              {unreadCount}
            </span>
          )}
        </motion.button>

        {/* User */}
        <div className="flex items-center gap-3 pl-3 border-l border-[#1A2744]/60">
          <div className="text-right hidden sm:block">
            <p className="text-[12px] font-semibold tracking-wide text-[#E8ECF4]">{settings.userName}</p>
            <p className="text-[9px] text-[#6B7A99] font-mono tracking-widest uppercase">{settings.userRole}</p>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[10px] border-2 border-[#1A2744] cursor-pointer hover:border-[#00D4FF]/50 transition-all"
            style={{
              background: "linear-gradient(135deg, #7B61FF, #FF6B9D)",
              boxShadow: "0 0 12px rgba(123,97,255,0.3)",
            }}
          >
            {settings.userName.slice(0, 3).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
