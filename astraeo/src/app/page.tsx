"use client";
import { useEffect, useRef } from "react";
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

function Starfield({ density = 80 }: { density?: number }) {
  const count = Math.max(20, Math.min(200, density));
  const stars = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(i * 137.508) % 100}%`,
    top: `${(i * 97.3) % 100}%`,
    size: i % 5 === 0 ? 2 : 1,
    delay: (i * 0.3) % 6,
    duration: 2 + (i % 4),
    opacity: 0.2 + (i % 8) * 0.08,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            left: s.left, top: s.top,
            width: s.size, height: s.size,
            opacity: s.opacity,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 20% 50%, rgba(0,212,255,0.03) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(123,97,255,0.03) 0%, transparent 50%)",
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
  };

  return <div className="h-full overflow-hidden">{pageMap[currentPage] ?? <Overview />}</div>;
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
