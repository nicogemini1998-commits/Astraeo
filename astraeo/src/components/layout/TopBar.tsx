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

interface SearchResult {
  type: string;
  label: string;
  sub: string;
  page: Page;
}

const PAGE_META: Record<Page, { label: string; icon: LucideIcon; color: string }> = {
  overview:      { label: "Overview",       icon: LayoutDashboardIcon, color: "var(--accent-emerald)" },
  "pixel-stage": { label: "NEXUS",          icon: Building2Icon,       color: "var(--accent-sky)" },
  commander:     { label: "Commander",      icon: TerminalIcon,        color: "var(--accent-violet)" },
  agents:        { label: "Agentes",        icon: BotIcon,             color: "var(--accent-amber)" },
  workflows:     { label: "Workflows",      icon: Share2Icon,          color: "var(--accent-indigo)" },
  chat:          { label: "Chat",           icon: MessageCircleIcon,   color: "var(--accent-rose)" },
  analytics:     { label: "Analytics",      icon: BarChart2Icon,       color: "var(--accent-sky)" },
  memory:        { label: "Memory",         icon: DatabaseIcon,        color: "var(--accent-emerald)" },
  integrations:  { label: "Integraciones",  icon: PlugIcon,            color: "var(--accent-amber)" },
  settings:      { label: "Config",         icon: SettingsIcon,        color: "var(--text-muted)" },
  missions:      { label: "Misiones",       icon: SwordsIcon,          color: "var(--accent-rose)" },
  skills:        { label: "Skills",         icon: SparklesIcon,        color: "var(--accent-emerald)" },
  hooks:         { label: "Hooks",          icon: WebhookIcon,         color: "var(--accent-rose)" },
};

const SEARCH_PLACEHOLDERS = [
  "Buscar agentes, workflows, memoria…",
  "Buscar misiones activas…",
  "Buscar integraciones…",
  "⌘K para búsqueda rápida",
];

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

// ─── Sub-components ───────────────────────────────────────────────────

function Breadcrumb({ page }: { page: Page }) {
  const meta = PAGE_META[page];
  const Icon = meta?.icon ?? LayoutDashboardIcon;

  return (
    <div className="flex items-center gap-2 select-none">
      <span
        className="text-[13px] font-semibold tracking-[0.12em] select-none"
        style={{ fontFamily: "var(--font-display)", color: "var(--text-secondary)", letterSpacing: "0.14em" }}
      >
        AETHER
      </span>
      <span className="text-[var(--border-normal)] text-[14px] leading-none font-thin">/</span>
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, x: -5, filter: "blur(3px)" }}
          animate={{ opacity: 1, x: 0,  filter: "blur(0px)" }}
          exit={  { opacity: 0, x:  5,  filter: "blur(3px)" }}
          transition={{ duration: 0.16, ease: EASE }}
          className="flex items-center gap-1.5"
        >
          <Icon
            size={13}
            style={{ color: meta?.color ?? "var(--text-secondary)" }}
          />
          <span className="font-medium text-[13px] text-[var(--text-primary)] tracking-wide">
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
    <div className="relative hidden md:block w-64">
      <div className="relative flex items-center">
        <SearchIcon
          size={12}
          className="absolute left-3 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          placeholder={SEARCH_PLACEHOLDERS[phIdx]}
          className="w-full h-7 pl-8 pr-14 text-[12px] rounded-lg border outline-none font-[var(--font-sans)] transition-all duration-150"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            borderColor: focused
              ? "var(--border-focus)"
              : "var(--border-subtle)",
            boxShadow: focused
              ? "0 0 0 3px rgba(122,112,136,0.12)"
              : "none",
            opacity: phVisible ? 1 : 0.8,
          }}
          aria-label="Search"
        />
        <kbd className="absolute right-2.5 text-[9px] font-mono text-[var(--text-micro)] bg-[var(--bg-surface-2)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
          ⌘K
        </kbd>
      </div>

      <AnimatePresence>
        {focused && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -3, scale: 0.98 }}
            transition={{ duration: 0.12, ease: EASE }}
            className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden z-50 shadow-[var(--shadow-panel)]"
            style={{
              background: "var(--bg-surface-2)",
              border: "1px solid var(--border-normal)",
            }}
          >
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => { setPage(r.page); setQuery(""); }}
                className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-white/[0.04] transition-colors border-b border-[var(--border-subtle)] last:border-0 text-left"
              >
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-bold font-mono"
                  style={{
                    background: "rgba(122,112,136,0.12)",
                    color: "var(--accent-indigo)",
                    border: "1px solid rgba(122,112,136,0.2)",
                  }}
                >
                  {r.type}
                </span>
                <span className="text-[12px] font-medium text-[var(--text-primary)]">{r.label}</span>
                <span className="text-[11px] text-[var(--text-secondary)] ml-auto truncate max-w-[100px]">{r.sub}</span>
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
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      className="relative w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
      style={{
        color: "var(--text-muted)",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-normal)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-subtle)";
      }}
      aria-label="Notifications"
    >
      <BellIcon size={14} />
      <AnimatePresence>
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 min-w-[14px] h-3.5 rounded-full text-[8px] flex items-center justify-center text-white font-bold px-0.5 font-mono"
            style={{
              background: "var(--accent-rose)",
              boxShadow: "0 0 6px rgba(251,113,133,0.5)",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function AgentsBadge() {
  const { agents } = useAstraeo();
  const online = agents.filter((a) => a.status === "online").length;

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: "var(--accent-emerald)",
          boxShadow: "0 0 4px var(--accent-emerald)",
          animation: "pulse 2s infinite",
        }}
      />
      <span className="font-bold font-mono text-[11px]" style={{ color: "var(--accent-emerald)" }}>
        {online}
      </span>
      <span className="text-[10px] text-[var(--text-secondary)]">agentes</span>
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
      className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-[9.5px] font-semibold"
      style={{
        background: "rgba(52,211,153,0.08)",
        border: "1px solid rgba(52,211,153,0.2)",
        color: "var(--accent-emerald)",
      }}
    >
      <KeyIcon size={8} />
      API ✓
    </motion.div>
  );
}

function ConnectionDot() {
  const { integrations } = useAstraeo();
  const connected = !!integrations.find((i) => i.id === "int-1")?.connected;

  return (
    <div className="relative flex items-center justify-center w-4 h-4">
      {connected && (
        <motion.span
          className="absolute w-3.5 h-3.5 rounded-full"
          style={{ background: "rgba(52,211,153,0.2)" }}
          animate={{ scale: [1, 1.9, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: connected ? "var(--accent-emerald)" : "var(--accent-rose)",
          boxShadow: connected
            ? "0 0 5px rgba(52,211,153,0.6)"
            : "0 0 5px rgba(251,113,133,0.4)",
        }}
      />
    </div>
  );
}

function UserAvatar() {
  const { settings } = useAstraeo();
  const initials = settings.userName.slice(0, 2).toUpperCase();

  return (
    <div
      className="flex items-center gap-2 pl-2.5"
      style={{ borderLeft: "1px solid var(--border-subtle)" }}
    >
      <div className="hidden sm:block text-right">
        <p className="text-[11.5px] font-semibold text-[var(--text-primary)] tracking-wide leading-tight">
          {settings.userName}
        </p>
        <p className="text-[9px] text-[var(--text-muted)] font-mono tracking-wider uppercase">
          {settings.userRole}
        </p>
      </div>
      <motion.div
        whileHover={{ scale: 1.06 }}
        className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] cursor-pointer font-mono flex-shrink-0 transition-all"
        style={{
          background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))",
          boxShadow: "0 0 12px rgba(122,112,136,0.3)",
        }}
        aria-label={`User: ${settings.userName}`}
      >
        {initials}
      </motion.div>
    </div>
  );
}

// ─── Main TopBar ───────────────────────────────────────────────────────

export default function TopBar() {
  const { currentPage, toggleSidebar, metrics } = useAstraeo();

  return (
    <header
      className="h-[48px] flex items-center justify-between px-4 z-40 flex-shrink-0 relative"
      style={{
        background: "var(--bg-base)",
        borderBottom: "1px solid var(--border-subtle)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* ── Left: hamburger + breadcrumb ────────────────────────── */}
      <div className="flex items-center gap-2.5">
        <motion.button
          onClick={toggleSidebar}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"}
          onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"}
          aria-label="Toggle sidebar"
        >
          <MenuIcon size={14} />
        </motion.button>

        <Breadcrumb page={currentPage} />
      </div>

      {/* ── Center: search ──────────────────────────────────────── */}
      <SearchBar />

      {/* ── Right ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div
          className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-[9.5px]"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-muted)",
          }}
        >
          <ZapIcon size={8} style={{ color: "var(--accent-sky)" }} />
          <motion.span
            key={metrics.apiLatency}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            style={{
              color: metrics.apiLatency > 1200
                ? "var(--accent-amber)"
                : "var(--accent-sky)",
            }}
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
