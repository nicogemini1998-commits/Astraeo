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
  ChevronLeftIcon,
  ChevronRightIcon,
  ZapIcon,
  ActivityIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAstraeo } from "@/store/astraeo";
import type { Page } from "@/lib/types";

interface NavItem {
  id: Page;
  label: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
  group?: "core" | "tools" | "data" | "system";
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview",      label: "Overview",       icon: LayoutDashboardIcon,  group: "core" },
  { id: "pixel-stage",   label: "NEXUS",          icon: Building2Icon,        group: "core", badge: "LIVE", badgeColor: "#22D3EE" },
  { id: "commander",     label: "Commander",      icon: TerminalIcon,         group: "core" },
  { id: "agents",        label: "Agentes",        icon: BotIcon,              group: "tools" },
  { id: "workflows",     label: "Workflows",      icon: Share2Icon,           group: "tools" },
  { id: "skills",        label: "Skills",         icon: ZapIcon,              group: "tools", badge: "NEW", badgeColor: "#F59E0B" },
  { id: "hooks",         label: "Hooks",          icon: ActivityIcon,         group: "tools", badge: "NEW", badgeColor: "#34D399" },
  { id: "chat",          label: "Chat",           icon: MessageCircleIcon,    group: "tools" },
  { id: "analytics",     label: "Analytics",      icon: BarChart2Icon,        group: "data" },
  { id: "memory",        label: "Memory",         icon: DatabaseIcon,         group: "data" },
  { id: "integrations",  label: "Integraciones",  icon: PlugIcon,             group: "data" },
  { id: "settings",      label: "Config",         icon: SettingsIcon,         group: "system" },
];

const GROUP_LABELS: Record<string, string> = {
  core: "CORE",
  tools: "TOOLS",
  data: "DATA",
  system: "SYSTEM",
};

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

const labelVariants = {
  open:   { opacity: 1, x: 0,  width: "auto", transition: { duration: 0.18, ease: EASE } },
  closed: { opacity: 0, x: -8, width: 0,       transition: { duration: 0.15, ease: EASE } },
};

const badgeVariants = {
  open:   { opacity: 1, scale: 1, transition: { duration: 0.18, delay: 0.05 } },
  closed: { opacity: 0, scale: 0, transition: { duration: 0.1 } },
};

// ─── Logo ─────────────────────────────────────────────────────────────

function HexLogo() {
  return (
    <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-label="AETHER logo">
      <defs>
        <linearGradient id="logo-grad-outer" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B7BFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#7C8A98" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="logo-grad-mid" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7A7088" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7A8569" stopOpacity="0.3" />
        </linearGradient>
        <radialGradient id="logo-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8B7BFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8B7BFF" stopOpacity="0" />
        </radialGradient>
        <filter id="logo-blur">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      {/* Outer glow */}
      <polygon
        points="20,1 35,10 35,28 20,37 5,28 5,10"
        fill="url(#logo-glow)"
        filter="url(#logo-blur)"
        opacity="0.6"
      />

      {/* Outer hex */}
      <polygon
        points="20,2 34,10.5 34,27.5 20,36 6,27.5 6,10.5"
        stroke="url(#logo-grad-outer)"
        strokeWidth="1.5"
        fill="rgba(122,112,136,0.07)"
      />

      {/* Mid hex */}
      <polygon
        points="20,8 30,14 30,26 20,32 10,26 10,14"
        stroke="url(#logo-grad-mid)"
        strokeWidth="1"
        fill="rgba(124,138,152,0.05)"
      />

      {/* Inner hex */}
      <polygon
        points="20,13 26,16.5 26,23.5 20,27 14,23.5 14,16.5"
        stroke="rgba(139,123,255,0.4)"
        strokeWidth="0.75"
        fill="rgba(122,112,136,0.08)"
      />

      {/* Orbit ring */}
      <motion.circle
        cx="20" cy="20" r="8.5"
        stroke="rgba(122,112,136,0.18)"
        strokeWidth="0.75"
        strokeDasharray="3 5"
        fill="none"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "20px 20px" }}
      />

      {/* Orbit dot */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "20px 20px" }}
      >
        <circle cx="28.5" cy="20" r="1.5" fill="#7C8A98" opacity="0.8" />
      </motion.g>

      {/* Core pulse */}
      <motion.circle
        cx="20" cy="20" r="4"
        fill="rgba(122,112,136,0.15)"
        animate={{ r: [3.5, 5.5, 3.5], opacity: [0.5, 0.15, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Core */}
      <circle cx="20" cy="20" r="3" fill="url(#logo-grad-outer)" />
      <circle cx="20" cy="20" r="1.4" fill="#F0EDE6" />

      {/* Corner accents */}
      <circle cx="20" cy="2" r="1.2" fill="#7A7088" opacity="0.6" />
      <circle cx="34" cy="10.5" r="1" fill="#7C8A98" opacity="0.5" />
      <circle cx="6" cy="27.5" r="0.9" fill="#7A8569" opacity="0.45" />
    </svg>
  );
}

// ─── Nav Button ───────────────────────────────────────────────────────

interface NavButtonProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}

function NavButton({ item, active, collapsed, onClick }: NavButtonProps) {
  const Icon = item.icon;

  return (
    <motion.button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      whileHover={{ x: collapsed ? 0 : 2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1, ease: EASE }}
      className={[
        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm relative group",
        "transition-colors duration-100",
        active
          ? "nav-active"
          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/[0.04]",
        collapsed ? "justify-center" : "",
      ].join(" ")}
    >
      <span className="flex-shrink-0 flex items-center justify-center w-4 h-4">
        <Icon
          size={15}
          className={[
            "transition-all duration-100",
            active
              ? "text-[var(--accent-indigo)]"
              : "group-hover:text-[var(--text-primary)]",
          ].join(" ")}
          style={active ? { filter: "drop-shadow(0 0 5px rgba(122,112,136,0.5))" } : undefined}
        />
      </span>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            variants={labelVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className={[
              "font-medium text-[12.5px] whitespace-nowrap overflow-hidden tracking-wide",
              active ? "text-[var(--text-primary)]" : "",
            ].join(" ")}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {!collapsed && item.badge && (
          <motion.span
            variants={badgeVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider flex-shrink-0 font-mono"
            style={{
              background: item.badgeColor ? `${item.badgeColor}15` : "rgba(122,112,136,0.1)",
              color: item.badgeColor ?? "var(--accent-indigo)",
              border: `1px solid ${item.badgeColor ? `${item.badgeColor}30` : "rgba(122,112,136,0.2)"}`,
            }}
          >
            {item.badge}
          </motion.span>
        )}
      </AnimatePresence>

      {collapsed && item.badge && (
        <span
          className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
          style={{ background: item.badgeColor ?? "var(--accent-indigo)" }}
        />
      )}
    </motion.button>
  );
}

// ─── Group Divider ────────────────────────────────────────────────────

function GroupDivider({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="my-1 mx-3 h-px bg-[var(--border-subtle)]" />;
  }
  return (
    <div className="flex items-center gap-2 px-2.5 pt-3 pb-1">
      <span className="text-[9px] font-semibold tracking-[0.18em] text-[var(--text-micro)] font-mono uppercase">
        {label}
      </span>
      <div className="flex-1 h-px bg-[var(--border-subtle)]" />
    </div>
  );
}

// ─── Connection Orb ───────────────────────────────────────────────────

function ConnectionOrb({ online }: { online: boolean }) {
  return (
    <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
      {online && (
        <motion.span
          className="absolute w-3 h-3 rounded-full"
          style={{ background: "rgba(122,133,105,0.15)" }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          background: online ? "var(--accent-emerald)" : "var(--accent-rose)",
        }}
      />
    </div>
  );
}

// ─── Main Sidebar ──────────────────────────────────────────────────────

export default function Sidebar() {
  const { currentPage, setPage, metrics, settings, sidebarOpen, toggleSidebar, integrations } = useAstraeo();
  const claudeConnected = !!integrations.find((i) => i.id === "int-1")?.connected;
  const tokensToday = metrics.tokensPerMinute * 60;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-close on mobile when navigating
  const handleNav = (p: typeof currentPage) => {
    setPage(p);
    if (isMobile && sidebarOpen) toggleSidebar();
  };

  const groups = Array.from(new Set(NAV_ITEMS.map((i) => i.group ?? "core")));
  const showOverlay = isMobile && sidebarOpen;

  return (
    <>
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={toggleSidebar}
          className="fixed inset-0 z-40"
          style={{ background: "rgba(10,9,8,0.6)", backdropFilter: "blur(4px)" }}
        />
      )}
    <motion.aside
      initial={false}
      animate={{
        width: isMobile ? (sidebarOpen ? 240 : 0) : (sidebarOpen ? 220 : 56),
        x: isMobile && !sidebarOpen ? -240 : 0,
      }}
      transition={{ duration: 0.22, ease: EASE }}
      className="h-full flex flex-col z-50 flex-shrink-0 border-r border-[var(--border-subtle)]"
      style={{
        minWidth: isMobile ? 0 : (sidebarOpen ? 220 : 56),
        background: "var(--bg-base)",
        position: isMobile ? "fixed" : "relative",
        top: 0, bottom: 0, left: 0,
        boxShadow: isMobile && sidebarOpen ? "8px 0 32px rgba(0,0,0,0.45)" : "none",
      }}
    >
      {/* ── Brand ────────────────────────────────────────────────── */}
      <div className="px-3 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <motion.div
            animate={
              claudeConnected
                ? { filter: ["drop-shadow(0 0 4px rgba(122,112,136,0.4))", "drop-shadow(0 0 10px rgba(122,112,136,0.7))", "drop-shadow(0 0 4px rgba(122,112,136,0.4))"] }
                : { filter: "drop-shadow(0 0 3px rgba(122,112,136,0.2))" }
            }
            transition={claudeConnected ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : undefined}
            className="flex-shrink-0"
          >
            <HexLogo />
          </motion.div>

          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15, ease: EASE }}
                className="min-w-0"
              >
                <h1
                  className="text-[16px] font-semibold leading-tight"
                  style={{ fontFamily: "var(--font-display)", letterSpacing: "0.18em", color: "var(--text-primary)" }}
                >
                  AETHER
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{
                      background: "var(--accent-emerald)",
                      boxShadow: "0 0 4px var(--accent-emerald)",
                      animation: "pulse 2s infinite",
                    }}
                  />
                  <p className="text-[8.5px] text-[var(--accent-emerald)] tracking-[2.5px] uppercase font-semibold font-mono">
                    ONLINE
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          onClick={toggleSidebar}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-indigo)] hover:bg-[var(--accent-indigo)]/10 transition-colors"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <ChevronLeftIcon size={12} /> : <ChevronRightIcon size={12} />}
        </motion.button>
      </div>

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5 scrollbar-hide" aria-label="Main navigation">
        {groups.map((group, gi) => {
          const items = NAV_ITEMS.filter((i) => (i.group ?? "core") === group);
          return (
            <div key={group}>
              {gi > 0 && (
                <GroupDivider
                  label={GROUP_LABELS[group] ?? group.toUpperCase()}
                  collapsed={!sidebarOpen}
                />
              )}
              {gi === 0 && sidebarOpen && (
                <div className="px-2.5 pb-1">
                  <span className="text-[9px] font-semibold tracking-[0.18em] text-[var(--text-micro)] font-mono uppercase">
                    {GROUP_LABELS[group]}
                  </span>
                </div>
              )}
              <div className="space-y-px">
                {items.map((item) => (
                  <NavButton
                    key={item.id}
                    item={item}
                    active={currentPage === item.id}
                    collapsed={!sidebarOpen}
                    onClick={() => handleNav(item.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Bottom Status ────────────────────────────────────────── */}
      <div className="px-2.5 pb-3 border-t border-[var(--border-subtle)] pt-3 flex-shrink-0 space-y-2.5">
        <div className="flex items-center gap-2">
          <ConnectionOrb online={claudeConnected} />
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                transition={{ duration: 0.14, ease: EASE }}
                className="flex flex-col min-w-0"
              >
                <span className="text-[11px] font-semibold font-mono text-[var(--text-primary)] truncate">
                  {claudeConnected ? "Conectado" : "Sin conexión"}
                </span>
                <span className="text-[9px] text-[var(--text-muted)] font-mono truncate">
                  claude-sonnet-4-6
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="overflow-hidden space-y-2"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.15em] font-semibold font-mono">
                    Efficiency
                  </span>
                  <motion.span
                    key={metrics.efficiency}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] text-[var(--accent-indigo)] font-mono font-semibold"
                  >
                    {metrics.efficiency}%
                  </motion.span>
                </div>
                <div className="w-full h-[3px] bg-[var(--border-subtle)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${metrics.efficiency}%` }}
                    transition={{ duration: 1.2, ease: EASE }}
                    style={{
                      background: "linear-gradient(90deg, var(--accent-indigo), var(--accent-sky))",
                      boxShadow: "0 0 6px rgba(122,112,136,0.5)",
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.12em] font-semibold font-mono">
                  Tokens hoy
                </span>
                <motion.span
                  key={tokensToday}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-[var(--accent-violet)] font-mono font-semibold"
                >
                  {tokensToday > 0 ? tokensToday.toLocaleString() : "--"}
                </motion.span>
              </div>

              <div className="pt-0.5">
                <span className="text-[8.5px] text-[var(--text-micro)] font-mono tracking-widest uppercase">
                  {settings.userName}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
    </>
  );
}
