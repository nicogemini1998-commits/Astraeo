"use client";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAstraeo } from "@/store/astraeo";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import NotifPanel from "@/components/ui/NotifPanel";
import ToastContainer from "@/components/ui/Toast";
import Overview from "@/components/pages/Overview";
import Chat from "@/components/pages/Chat";
import PixelStage from "@/components/pages/PixelStage";
import Missions from "@/components/pages/Missions";
import AgentsPage from "@/components/pages/Agents";
import WorkflowsPage from "@/components/pages/Workflows";
import MemoryPage from "@/components/pages/Memory";
import Analytics from "@/components/pages/Analytics";
import Integrations from "@/components/pages/Integrations";
import SettingsPage from "@/components/pages/Settings";
import Commander from "@/components/pages/Commander";
import SkillsPage from "@/components/pages/Skills";
import HooksPage from "@/components/pages/Hooks";

import type { Variants } from "framer-motion";

const EASE_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const pageVariants: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.992, filter: "blur(6px)" },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.38, ease: EASE_EXPO },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 1.004,
    filter: "blur(4px)",
    transition: { duration: 0.18, ease: EASE_EXPO },
  },
};

function Starfield({ density = 80 }: { density?: number }) {
  const count = Math.max(20, Math.min(200, density));
  const stars = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(i * 137.508) % 100}%`,
    top: `${(i * 97.3) % 100}%`,
    size: i % 7 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1,
    delay: (i * 0.37) % 7,
    duration: 2.5 + (i % 5),
    opacity: 0.15 + (i % 9) * 0.07,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            position: "absolute",
            background: s.id % 11 === 0 ? "#00D4FF" : s.id % 7 === 0 ? "#7B61FF" : "#FFFFFF",
            opacity: s.opacity,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      {/* Nebula clouds */}
      <div style={{
        position: "absolute", inset: 0,
        background: [
          "radial-gradient(ellipse 60% 40% at 15% 40%, rgba(0,212,255,0.04) 0%, transparent 60%)",
          "radial-gradient(ellipse 50% 35% at 85% 20%, rgba(123,97,255,0.05) 0%, transparent 60%)",
          "radial-gradient(ellipse 40% 30% at 70% 75%, rgba(0,229,160,0.03) 0%, transparent 60%)",
          "radial-gradient(ellipse 35% 25% at 40% 85%, rgba(255,107,157,0.03) 0%, transparent 60%)",
        ].join(", "),
      }} />
    </div>
  );
}

function PageContent() {
  const { currentPage } = useAstraeo();

  const pageMap: Record<string, React.ReactNode> = {
    overview: <Overview />,
    chat: <Chat />,
    "pixel-stage": <PixelStage />,
    missions: <Missions />,
    agents: <AgentsPage />,
    workflows: <WorkflowsPage />,
    memory: <MemoryPage />,
    analytics: <Analytics />,
    integrations: <Integrations />,
    settings: <SettingsPage />,
    commander: <Commander />,
    skills: <SkillsPage />,
    hooks: <HooksPage />,
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPage}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className="h-full overflow-hidden"
      >
        {pageMap[currentPage] ?? <Overview />}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const { tickMetrics, settings } = useAstraeo();
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!settings.realtimeUpdates) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => tickMetrics(), 3000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [settings.realtimeUpdates, tickMetrics]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050810] text-[#E8ECF4] relative">
      <Starfield density={settings.starfieldDensity} />
      <div className="fixed inset-0 grid-bg pointer-events-none z-0 opacity-60" />

      <div className="relative z-10 flex h-full w-full">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <TopBar />
          <div className="flex-1 min-h-0 overflow-hidden">
            <PageContent />
          </div>
        </main>
        <NotifPanel />
      </div>

      <ToastContainer />
    </div>
  );
}
