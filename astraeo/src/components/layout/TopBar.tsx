"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboardIcon,
  Building2Icon,
  TerminalIcon,
  BotIcon,
  Share2Icon,
  MessageCircleIcon,
  BarChart2Icon,
  DatabaseIcon,
  PlugIcon,
  SettingsIcon,
  SearchIcon,
  BellIcon,
  MenuIcon,
  ZapIcon,
  KeyIcon,
  SwordsIcon,
  SparklesIcon,
  WebhookIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAstraeo } from "@/store/astraeo";
import type { Page } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────

interface SearchResult {
  type: string;
  label: string;
  sub: string;
  page: Page;
}

// ─── Page metadata ───────────────────────────────────────────────────

const PAGE_META: Record<Page, { label: string; icon: LucideIcon; color: string }> = {
  overview:      { label: "Overview",       icon: LayoutDashboardIcon, color: "#00E5A0" },
  "pixel-stage": { label: "NEXUS",          icon: Building2Icon,       color: "#00D4FF" },
  commander:     { label: "Commander",      icon: TerminalIcon,        color: "#7B61FF" },
  agents:        { label: "Agentes",        icon: BotIcon,             color: "#FFB800" },
  workflows:     { label: "Workflows",      icon: Share2Icon,          color: "#7B61FF" },
  chat:          { label: "Chat",           icon: MessageCircleIcon,   color: "#FF6B9D" },
  analytics:     { label: "Analytics",      icon: BarChart2Icon,       color: "#00D4FF" },
  memory:        { label: "Memory",         icon: DatabaseIcon,        color: "#00E5A0" },
  integrations:  { label: "Integraciones",  icon: PlugIcon,            color: "#FFB800" },
  settings:      { label: "Config",         icon: SettingsIcon,        color: "#6A7898" },
  missions:      { label: "Misiones",       icon: SwordsIcon,          color: "#FF4757" },
  skills:        { label: "Skills",         icon: SparklesIcon,        color: "#00E5A0" },
  hooks:         { label: "Hooks",          icon: WebhookIcon,         color: "#FF6B9D" },
};

const SEARCH_PLACEHOLDERS = [
  "Buscar agentes, workflows, memoria…",
  "Buscar misiones activas…",
  "Buscar integraciones…",
  "⌘K para búsqueda rápida",
];

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

// ─── Sub-components ──────────────────────────────────────────────────

function Breadcrumb({ page }: { page: Page }) {
  const meta = PAGE_META[page];
  const Icon = meta?.icon ?? LayoutDashboardIcon;
  const color = meta?.color ?? "#6A7898";

  return (
    <div className="flex items-center gap-2 select-none">
      <span className="text-[#3A4560] text-[12px] font-medium tracking-widest uppercase font-mono">
        ASTRAEO
      </span>
      <span className="text-[#1A2744] text-[16px] leading-none">›</span>
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, x: -6, filter: "blur(4px)" }}
          animate={{ opacity: 1, x: 0,  filter: "blur(0px)" }}
          exit={  { opacity: 0, x:  6,  filter: "blur(4px)" }}
          transition={{ duration: 0.18, ease: EASE }}
          className="flex items-center gap-1.5"
        >
          <Icon
            size={14}
            style={{ color, filter: `drop-shadow(0 0 4px ${color}80)` }}
          />
          <span
            className="font-semibold text-[13px] tracking-wide"
            style={{ color: "#E8ECF8" }}
          >
            {meta?.label ?? page}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SearchBar() {
  const { agents, setPage } = useAstraeo();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [phIdx, setPhIdx] = useState(0);
  const [phVisible, setPhVisible] = useState(true);

  // Rotate placeholder
  useEffect(() => {
    if (query.length > 0 || focused) return;
    const id = setInterval(() => {
      setPhVisible(false);
      setTimeout(() => {
        setPhIdx((i) => (i + 1) % SEARCH_PLACEHOLDERS.length);
        setPhVisible(true);
      }, 180);
    }, 3200);
    return () => clearInterval(id);
  }, [query, focused]);

  const results: SearchResult[] = query.length > 1
    ? agents
        .filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
        .map((a) => ({ type: "Agente", label: a.name, sub: a.role, page: "agents" as Page }))
    : [];

  return (
    <div className="relative hidden md:block w-72">
      {/* Input */}
      <div className="relative flex items-center">
        <SearchIcon
          size={13}
          className="absolute left-3 text-[#6A7898] pointer-events-none"
        />
        <motion.input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          animate={{ opacity: phVisible ? 1 : 0.7 }}
          transition={{ duration: 0.15 }}
          placeholder={SEARCH_PLACEHOLDERS[phIdx]}
          className="astraeo-input pl-8 pr-16 py-2 text-[12px] h-8"
          style={{
            borderColor: focused ? "rgba(0,212,255,0.4)" : undefined,
            boxShadow: focused ? "0 0 16px rgba(0,212,255,0.08)" : undefined,
          }}
          aria-label="Search"
        />
        <kbd className="absolute right-3 text-[9px] font-mono text-[#3A4560] bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
          ⌘K
        </kbd>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {focused && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: EASE }}
            className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl border border-white/[0.08] z-50 overflow-hidden shadow-2xl"
          >
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => { setPage(r.page); setQuery(""); }}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0 text-left"
              >
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold font-mono"
                  style={{ background: "rgba(0,212,255,0.12)", color: "#00D4FF", border: "1px solid rgba(0,212,255,0.2)" }}>
                  {r.type}
                </span>
                <span className="text-[13px] font-medium text-[#E8ECF8]">{r.label}</span>
                <span className="text-[11px] text-[#6A7898] ml-auto">{r.sub}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotifBell() {
  const { notifications, toggleNotifPanel } = useAstraeo();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <motion.button
      onClick={toggleNotifPanel}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      className="relative w-8 h-8 rounded-xl glass border border-white/[0.08] hover:border-[#00D4FF]/30 flex items-center justify-center text-[#6A7898] hover:text-[#E8ECF8] transition-colors"
      aria-label="Notifications"
    >
      <BellIcon size={15} />
      <AnimatePresence>
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-[#FF6B9D] rounded-full text-[9px] flex items-center justify-center text-white font-bold px-0.5 shadow-lg font-mono"
            style={{ boxShadow: "0 0 8px rgba(255,107,157,0.5)" }}
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function ConnectionDot() {
  const { integrations } = useAstraeo();
  const connected = !!integrations.find((i) => i.id === "int-1")?.connected;

  return (
    <div className="relative flex items-center justify-center w-5 h-5">
      {connected && (
        <motion.span
          className="absolute w-4 h-4 rounded-full"
          style={{ background: "rgba(0,229,160,0.25)" }}
          animate={{ scale: [1, 1.9, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span
        className="w-2 h-2 rounded-full"
        style={{
          background: connected ? "#00E5A0" : "#FF4757",
          boxShadow: connected ? "0 0 6px rgba(0,229,160,0.6)" : "0 0 6px rgba(255,71,87,0.4)",
        }}
      />
    </div>
  );
}

function ApiKeyBadge() {
  const { settings } = useAstraeo();
  if (!settings.claudeApiKey) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] font-semibold"
      style={{
        background: "rgba(0,229,160,0.08)",
        border: "1px solid rgba(0,229,160,0.25)",
        color: "#00E5A0",
      }}
    >
      <KeyIcon size={9} />
      API KEY ✓
    </motion.div>
  );
}

function AgentsBadge() {
  const { agents } = useAstraeo();
  const online = agents.filter((a) => a.status === "online").length;

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full glass border border-white/[0.07]">
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ background: "#00E5A0", boxShadow: "0 0 5px #00E5A0" }}
      />
      <span className="text-[#00E5A0] font-bold font-mono text-[12px] leading-none">{online}</span>
      <span className="text-[#6A7898] text-[10px]">agentes</span>
    </div>
  );
}

function UserAvatar() {
  const { settings } = useAstraeo();
  const initials = settings.userName.slice(0, 3).toUpperCase();

  return (
    <div className="flex items-center gap-2.5 pl-3 border-l border-white/[0.06]">
      <div className="text-right hidden sm:block">
        <p className="text-[12px] font-semibold tracking-wide text-[#E8ECF8]">{settings.userName}</p>
        <p className="text-[9px] text-[#6A7898] font-mono tracking-widest uppercase">{settings.userRole}</p>
      </div>
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[10px] border-2 border-[#1A2744] cursor-pointer hover:border-[#00D4FF]/50 transition-all font-mono flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #7B61FF, #FF6B9D)",
          boxShadow: "0 0 14px rgba(123,97,255,0.3)",
        }}
        aria-label={`User: ${settings.userName}`}
      >
        {initials}
      </motion.div>
    </div>
  );
}

// ─── Main TopBar ──────────────────────────────────────────────────────

export default function TopBar() {
  const { currentPage, toggleSidebar, metrics } = useAstraeo();

  return (
    <header
      className="h-[52px] flex items-center justify-between px-5 z-40 flex-shrink-0 relative"
      style={{
        background: "rgba(8,12,26,0.88)",
        backdropFilter: "blur(28px) saturate(1.3)",
        WebkitBackdropFilter: "blur(28px) saturate(1.3)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 1px 0 rgba(0,212,255,0.08)",
      }}
    >
      {/* ── Left: hamburger + breadcrumb ─────────────────────────── */}
      <div className="flex items-center gap-3">
        <motion.button
          onClick={toggleSidebar}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6A7898] hover:text-[#E8ECF8] hover:bg-white/[0.05] transition-colors"
          aria-label="Toggle sidebar"
        >
          <MenuIcon size={15} />
        </motion.button>

        <Breadcrumb page={currentPage} />
      </div>

      {/* ── Center: search ────────────────────────────────────────── */}
      <SearchBar />

      {/* ── Right: status + controls ──────────────────────────────── */}
      <div className="flex items-center gap-2.5">
        {/* Live latency chip */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-full font-mono text-[10px]"
          style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.12)", color: "#6A7898" }}>
          <ZapIcon size={9} style={{ color: "#00D4FF" }} />
          <motion.span
            key={metrics.apiLatency}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            style={{ color: metrics.apiLatency > 1200 ? "#FFB800" : "#00D4FF" }}
          >
            {metrics.apiLatency > 0 ? `${metrics.apiLatency}ms` : "--ms"}
          </motion.span>
        </div>

        <AgentsBadge />
        <ApiKeyBadge />
        <ConnectionDot />
        <NotifBell />
        <UserAvatar />
      </div>
    </header>
  );
}
