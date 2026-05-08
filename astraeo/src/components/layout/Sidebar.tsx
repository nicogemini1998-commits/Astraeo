"use client";

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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAstraeo } from "@/store/astraeo";
import type { Page } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────

interface NavItem {
  id: Page;
  label: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
}

// ─── Nav Config ─────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: "overview",      label: "Overview",       icon: LayoutDashboardIcon },
  { id: "pixel-stage",   label: "NEXUS",          icon: Building2Icon, badge: "LIVE", badgeColor: "#00D4FF" },
  { id: "commander",     label: "Commander",      icon: TerminalIcon },
  { id: "agents",        label: "Agentes",        icon: BotIcon },
  { id: "workflows",     label: "Workflows",      icon: Share2Icon, badge: "NEW", badgeColor: "#7B61FF" },
  { id: "chat",          label: "Chat",           icon: MessageCircleIcon },
  { id: "analytics",     label: "Analytics",      icon: BarChart2Icon },
  { id: "memory",        label: "Memory",         icon: DatabaseIcon },
  { id: "integrations",  label: "Integraciones",  icon: PlugIcon },
  { id: "settings",      label: "Config",         icon: SettingsIcon },
];

// ─── Motion Variants ─────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

const labelVariants = {
  open: { opacity: 1, x: 0,   width: "auto", transition: { duration: 0.18, ease: EASE } },
  closed:{ opacity: 0, x: -8, width: 0,      transition: { duration: 0.15, ease: EASE } },
};

const badgeVariants = {
  open:  { opacity: 1, scale: 1, transition: { duration: 0.18, delay: 0.05 } },
  closed:{ opacity: 0, scale: 0, transition: { duration: 0.1  } },
};

// ─── Hex Logo SVG ────────────────────────────────────────────────────

function HexLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-label="ASTRAEO logo">
      {/* Outer hex */}
      <polygon
        points="18,2 32,10 32,26 18,34 4,26 4,10"
        stroke="#00D4FF"
        strokeWidth="1.5"
        fill="rgba(0,212,255,0.05)"
      />
      {/* Inner hex */}
      <polygon
        points="18,7 28,13 28,23 18,29 8,23 8,13"
        stroke="#7B61FF"
        strokeWidth="1"
        strokeOpacity="0.5"
        fill="none"
      />
      {/* Pulsing center */}
      <motion.circle
        cx="18" cy="18" r="4"
        fill="#00D4FF"
        animate={{ r: [3.5, 5, 3.5], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ filter: "drop-shadow(0 0 6px #00D4FF)" }}
      />
      {/* Static center core */}
      <circle cx="18" cy="18" r="2" fill="#E8ECF8" />
    </svg>
  );
}

// ─── Nav Button ──────────────────────────────────────────────────────

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
      whileHover={{ x: collapsed ? 0 : 3 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12, ease: EASE }}
      className={[
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm relative group transition-colors duration-150",
        active
          ? "nav-active text-[#00D4FF]"
          : "text-[#6A7898] hover:text-[#E8ECF8] hover:bg-white/[0.035]",
        collapsed ? "justify-center" : "",
      ].join(" ")}
    >
      {/* Icon */}
      <span className="flex-shrink-0 flex items-center justify-center w-5 h-5">
        <Icon
          size={17}
          className={[
            "transition-all duration-150",
            active
              ? "text-[#00D4FF] drop-shadow-[0_0_6px_rgba(0,212,255,0.6)]"
              : "group-hover:text-[#E8ECF8] group-hover:drop-shadow-[0_0_4px_rgba(0,212,255,0.3)]",
          ].join(" ")}
        />
      </span>

      {/* Label */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            variants={labelVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="font-medium tracking-wide text-[13px] whitespace-nowrap overflow-hidden"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Badge */}
      <AnimatePresence initial={false}>
        {!collapsed && item.badge && (
          <motion.span
            variants={badgeVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold tracking-wider flex-shrink-0 font-mono"
            style={{
              background: item.badgeColor ? `${item.badgeColor}18` : "rgba(106,120,152,0.15)",
              color:       item.badgeColor ?? "#6A7898",
              border:      `1px solid ${item.badgeColor ? `${item.badgeColor}35` : "#1A2744"}`,
            }}
          >
            {item.badge}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Collapsed badge dot */}
      {collapsed && item.badge && (
        <span
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
          style={{ background: item.badgeColor ?? "#6A7898" }}
        />
      )}
    </motion.button>
  );
}

// ─── Connection Status Orb ────────────────────────────────────────────

function ConnectionOrb({ online }: { online: boolean }) {
  return (
    <div className="relative flex items-center justify-center w-6 h-6 flex-shrink-0">
      {online && (
        <motion.span
          className="absolute w-4 h-4 rounded-full"
          style={{ background: "rgba(0,229,160,0.3)" }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{
          background: online ? "#00E5A0" : "#FF4757",
          boxShadow: online ? "0 0 8px rgba(0,229,160,0.6)" : "0 0 8px rgba(255,71,87,0.4)",
        }}
      />
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────

export default function Sidebar() {
  const { currentPage, setPage, metrics, settings, sidebarOpen, toggleSidebar, integrations } = useAstraeo();
  const claudeConnected = !!integrations.find((i) => i.id === "int-1")?.connected;
  const tokensToday = metrics.tokensPerMinute * 60;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 240 : 64 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="h-full glass-strong flex flex-col z-50 flex-shrink-0 relative"
      style={{ minWidth: sidebarOpen ? 240 : 64 }}
    >
      {/* ── Brand ─────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b border-white/[0.06] flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            animate={
              claudeConnected
                ? { filter: ["drop-shadow(0 0 6px rgba(0,212,255,0.4))", "drop-shadow(0 0 14px rgba(0,212,255,0.7))", "drop-shadow(0 0 6px rgba(0,212,255,0.4))"] }
                : { filter: "drop-shadow(0 0 4px rgba(0,212,255,0.2))" }
            }
            transition={claudeConnected ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" } : undefined}
            className="flex-shrink-0"
          >
            <HexLogo />
          </motion.div>

          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.16, ease: EASE }}
                className="min-w-0"
              >
                <h1 className="font-semibold text-[17px] tracking-[5px] shimmer-text leading-tight">
                  ASTRAEO
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: "#00E5A0", boxShadow: "0 0 5px #00E5A0" }}
                  />
                  <p className="text-[9px] text-[#00E5A0] tracking-[3px] uppercase font-semibold font-mono">
                    ONLINE
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle */}
        <motion.button
          onClick={toggleSidebar}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[#6A7898] hover:text-[#00D4FF] hover:bg-white/[0.05] transition-colors"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <ChevronLeftIcon size={14} /> : <ChevronRightIcon size={14} />}
        </motion.button>
      </div>

      {/* ── Nav ───────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={currentPage === item.id}
            collapsed={!sidebarOpen}
            onClick={() => setPage(item.id)}
          />
        ))}
      </nav>

      {/* ── Bottom Metrics ────────────────────────────────────────── */}
      <div className="px-3 pb-4 border-t border-white/[0.06] pt-3 flex-shrink-0 space-y-3">
        {/* Connection row */}
        <div className="flex items-center gap-2.5">
          <ConnectionOrb online={claudeConnected} />
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15, ease: EASE }}
                className="flex flex-col min-w-0"
              >
                <span className="text-[11px] font-semibold font-mono text-[#E8ECF8] tracking-wide truncate">
                  {claudeConnected ? "Conectado" : "Sin conexión"}
                </span>
                <span className="text-[9px] text-[#6A7898] tracking-wider font-mono truncate">
                  claude-sonnet-4-6
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tokens bar (only in expanded mode) */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="overflow-hidden"
            >
              {/* Efficiency bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-[#6A7898] uppercase tracking-[0.15em] font-semibold font-mono">
                    Efficiency
                  </span>
                  <motion.span
                    key={metrics.efficiency}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] text-[#00D4FF] font-mono font-semibold"
                  >
                    {metrics.efficiency}%
                  </motion.span>
                </div>
                <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${metrics.efficiency}%` }}
                    transition={{ duration: 1, ease: EASE }}
                    style={{
                      background: "linear-gradient(90deg, #00D4FF, #7B61FF, #00E5A0)",
                      boxShadow: "0 0 6px rgba(0,212,255,0.4)",
                    }}
                  />
                </div>
              </div>

              {/* Tokens today */}
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9px] text-[#6A7898] uppercase tracking-[0.12em] font-semibold font-mono">
                  Tokens hoy
                </span>
                <motion.span
                  key={tokensToday}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-[#7B61FF] font-mono font-semibold"
                >
                  {tokensToday > 0 ? tokensToday.toLocaleString() : "--"}
                </motion.span>
              </div>

              {/* User label */}
              <div className="mt-2 text-center">
                <span className="text-[9px] text-[#3A4560] font-mono tracking-widest uppercase">
                  {settings.userName}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
