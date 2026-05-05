"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAstraeo } from "@/store/astraeo";
import type { Agent } from "@/lib/types";

// ─── Layout ───────────────────────────────────────────────────────────────────
const ROOM_W = 195;
const RH = 170;
const WIN_H = 28;
const RG = 18;
const LAB_H = 66;
const CANVAS_H = 640;
// Row Y positions (3 rows fit perfectly): 28, 216, 404
const ROW_Y = [WIN_H, WIN_H + RH + RG, WIN_H + (RH + RG) * 2];

// ─── Agent room + visual config ───────────────────────────────────────────────
interface AgentCfg {
  dept: string; color: string; hair: string; shirt: string; pants: string;
  col: "left" | "right"; row: number;
}
const AGENT_CFG: Record<string, AgentCfg> = {
  "agent-1": { dept: "COMMAND",    color: "#00D4FF", hair: "#1A0800", shirt: "#007A99", pants: "#1A2744", col: "left",  row: 0 },
  "agent-2": { dept: "PAID MEDIA", color: "#FF4757", hair: "#1A0000", shirt: "#BB2030", pants: "#1A0A0A", col: "right", row: 0 },
  "agent-3": { dept: "CRM",        color: "#FF6B9D", hair: "#3A1020", shirt: "#BB2060", pants: "#1A0A12", col: "left",  row: 1 },
  "agent-4": { dept: "CONTENT",    color: "#FFB800", hair: "#2A1800", shirt: "#BB7800", pants: "#1A1200", col: "right", row: 1 },
  "agent-5": { dept: "ANALYTICS",  color: "#7B61FF", hair: "#0A0020", shirt: "#4A30BB", pants: "#0A0A1A", col: "right", row: 2 },
  "agent-6": { dept: "AI TECH",    color: "#00E5A0", hair: "#001510", shirt: "#008855", pants: "#0A1A12", col: "left",  row: 3 },
  "agent-7": { dept: "SALES",      color: "#CC785C", hair: "#200800", shirt: "#994030", pants: "#1A0800", col: "left",  row: 2 },
  "agent-8": { dept: "SEO",        color: "#64B5F6", hair: "#001020", shirt: "#3070AA", pants: "#0A0A1A", col: "right", row: 3 },
};

const BUBBLES: Record<string, string[]> = {
  "agent-1": ["Coordinando equipo", "Revisando KPIs", "Alineando estrategia", "Briefing listo"],
  "agent-2": ["CTR: 4.2%", "ROAS: 8x", "Campaña activa", "CPL bajando"],
  "agent-3": ["CRM sync", "Pipeline OK", "Lead nurture", "GHL al día"],
  "agent-4": ["Post listo", "Copy ON", "Trend alert!", "Viral check"],
  "agent-5": ["GA4 data", "Métricas OK", "Dashboard live", "Reporte listo"],
  "agent-7": ["Pipeline +1", "Deal closed!", "Follow-up", "Reunión x3"],
};

// ─── Room helpers ─────────────────────────────────────────────────────────────
function getRoomBounds(id: string, cw: number) {
  const cfg = AGENT_CFG[id];
  if (!cfg || cfg.row >= 3) return null;
  return { x: cfg.col === "left" ? 0 : cw - ROOM_W, y: ROW_Y[cfg.row], w: ROOM_W, h: RH };
}
function getDeskPos(id: string, cw: number) {
  const r = getRoomBounds(id, cw);
  if (!r) return null;
  const cfg = AGENT_CFG[id]!;
  return { x: cfg.col === "left" ? r.x + 58 : r.x + 18, y: r.y + 32 };
}

// ─── Draw: tiles ─────────────────────────────────────────────────────────────
function drawTiles(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  bg: string, grid: string, ts: number) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = grid;
  ctx.lineWidth = 1;
  for (let tx = x; tx <= x + w; tx += ts) { ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx, y + h); ctx.stroke(); }
  for (let ty = y; ty <= y + h; ty += ts) { ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + w, ty); ctx.stroke(); }
}

// ─── Draw: room ──────────────────────────────────────────────────────────────
function drawRoom(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cfg: AgentCfg) {
  drawTiles(ctx, x, y, w, h, "#0B0E1A", "rgba(255,255,255,0.022)", 24);
  ctx.strokeStyle = "#1C2040";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  // Accent strip on hub side
  const sx = cfg.col === "left" ? x + w - 3 : x;
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = cfg.color;
  ctx.fillRect(sx, y, 3, h);
  ctx.globalAlpha = 1;
  ctx.shadowColor = cfg.color;
  ctx.shadowBlur = 14;
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = cfg.color;
  ctx.fillRect(sx, y, 3, h);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  // Dept label
  ctx.font = 'bold 7px "Share Tech Mono", monospace';
  ctx.textAlign = cfg.col === "left" ? "left" : "right";
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = cfg.color;
  ctx.fillText(cfg.dept, cfg.col === "left" ? x + 8 : x + w - 8, y + 14);
  ctx.globalAlpha = 1;
  // Door gap on hub side
  const doorX = cfg.col === "left" ? x + w - 2 : x;
  ctx.fillStyle = "#090C16";
  ctx.fillRect(doorX, y + RH / 2 - 15, 2, 30);
}

// ─── Draw: desk ──────────────────────────────────────────────────────────────
function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, glowing: boolean) {
  ctx.fillStyle = "#181210";
  ctx.fillRect(x, y, 56, 30);
  ctx.strokeStyle = "#2C2010";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, 56, 30);
  ctx.fillStyle = "#060810";
  ctx.fillRect(x + 6, y + 4, 28, 16);
  if (glowing) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(x + 8, y + 6, 24, 12);
    ctx.globalAlpha = 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(x + 8, y + 6, 24, 12);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = "#151520";
  ctx.fillRect(x + 38, y + 10, 13, 9);
  ctx.fillStyle = "#0D0F1C";
  ctx.strokeStyle = "#181A28";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + 28, y + 44, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// ─── Draw: plant ─────────────────────────────────────────────────────────────
function drawPlant(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = "#2A1A10";
  ctx.fillRect(px - 5, py + 5, 10, 8);
  ctx.fillStyle = "#1A3818";
  ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2A5030";
  ctx.beginPath(); ctx.arc(px - 4, py - 3, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(px + 4, py - 2, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3A6840";
  ctx.beginPath(); ctx.arc(px, py - 4, 4, 0, Math.PI * 2); ctx.fill();
}

// ─── Draw: windows ───────────────────────────────────────────────────────────
function drawWindowStrip(ctx: CanvasRenderingContext2D, cw: number, tod: string) {
  ctx.fillStyle = "#0D1628";
  ctx.fillRect(0, 0, cw, WIN_H);
  const skyBg = tod === "noche" ? "#0A1A30" : tod === "tarde" ? "#2A1A0A" : "#0E2A48";
  const skyFg = tod === "noche" ? "rgba(20,40,80,0.15)" : tod === "tarde" ? "rgba(255,120,30,0.1)" : "rgba(80,160,255,0.12)";
  const pw = 56;
  for (let wx = 6; wx + pw <= cw - 6; wx += pw + 6) {
    ctx.fillStyle = skyBg;
    ctx.fillRect(wx, 4, pw, WIN_H - 8);
    ctx.fillStyle = skyFg;
    ctx.fillRect(wx + 2, 4, pw - 4, WIN_H - 8);
  }
  ctx.fillStyle = "#1A2440";
  ctx.fillRect(0, WIN_H - 3, cw, 3);
}

// ─── Draw: hub center ────────────────────────────────────────────────────────
function drawHub(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  drawTiles(ctx, x, y, w, h, "#090C16", "rgba(255,255,255,0.015)", 32);
  const cx = x + w / 2;
  const cy = y + h / 2;
  // Meeting table
  ctx.fillStyle = "#14100A";
  ctx.strokeStyle = "#2A2010";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 55, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Table chairs
  for (const [chx, chy] of [[cx - 66, cy], [cx + 66, cy], [cx - 42, cy - 40], [cx + 42, cy - 40], [cx - 42, cy + 40], [cx + 42, cy + 40]]) {
    ctx.fillStyle = "#0D0F1C";
    ctx.strokeStyle = "#181A28";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(chx, chy, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // Hub plants
  drawPlant(ctx, x + 28, y + 38);
  drawPlant(ctx, x + w - 28, y + 38);
  drawPlant(ctx, x + 28, y + h - 42);
  drawPlant(ctx, x + w - 28, y + h - 42);
  // Central label
  ctx.font = 'bold 10px "Share Tech Mono", monospace';
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(100,130,200,0.15)";
  ctx.fillText("ASTRAEO MISSION CONTROL", cx, cy - 52);
}

// ─── Draw: skill lab ─────────────────────────────────────────────────────────
function drawSkillLab(ctx: CanvasRenderingContext2D, cw: number, tick: number, offlineAgents: Agent[]) {
  const y = CANVAS_H - LAB_H;
  ctx.fillStyle = "#070A12";
  ctx.fillRect(0, y, cw, LAB_H);
  ctx.shadowColor = "#00E5A0";
  ctx.shadowBlur = 6;
  ctx.strokeStyle = "rgba(0,229,160,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
  ctx.shadowBlur = 0;
  const pulse = 0.65 + 0.3 * Math.sin(tick * 0.04);
  ctx.globalAlpha = pulse;
  ctx.shadowColor = "#00E5A0";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#00E5A0";
  ctx.font = 'bold 9px "Share Tech Mono", monospace';
  ctx.textAlign = "center";
  ctx.fillText("⚡ SKILL LAB — UPGRADING", cw / 2, y + 18);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  offlineAgents.forEach((agent, i) => {
    const cfg = AGENT_CFG[agent.id];
    if (!cfg) return;
    const tx = cw / 2 + (i - offlineAgents.length / 2 + 0.5) * 140;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.roundRect(tx - 42, y + 28, 84, 24, 4);
    ctx.fill();
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = cfg.color;
    ctx.font = '7px "Share Tech Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText(`${agent.name.toUpperCase()} · OFFLINE`, tx, y + 43);
    ctx.globalAlpha = 1;
  });
  // Barbell decoration
  const bx = 80, by = y + 44;
  ctx.fillStyle = "#222230";
  ctx.fillRect(bx - 28, by - 3, 56, 6);
  [[bx - 28, by], [bx + 28, by]].forEach(([wx, wy]) => {
    ctx.fillStyle = "#333345";
    ctx.beginPath(); ctx.arc(wx, wy, 8, 0, Math.PI * 2); ctx.fill();
  });
}

// ─── Draw: person ─────────────────────────────────────────────────────────────
function drawPerson(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, cfg: AgentCfg,
  walking: boolean, facingRight: boolean,
  name: string, selected: boolean, bubble?: string
) {
  if (selected) { ctx.shadowColor = cfg.color; ctx.shadowBlur = 18; }
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 19, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Shoes
  ctx.fillStyle = "#080810";
  ctx.fillRect(cx - 5, cy + 14, 4, 4);
  ctx.fillRect(cx + 2, cy + 14, 4, 4);
  // Pants
  ctx.fillStyle = cfg.pants;
  ctx.fillRect(cx - 5, cy + 8, 4, 7);
  ctx.fillRect(cx + 2, cy + 8, 4, 7);
  // Body
  ctx.fillStyle = cfg.shirt;
  ctx.fillRect(cx - 6, cy, 13, 9);
  // Arms
  if (walking) {
    ctx.fillRect(cx - 9, cy + 1, 3, 6);
    ctx.fillRect(cx + 7, cy + 4, 3, 6);
  } else {
    ctx.fillRect(cx - 9, cy + 2, 3, 5);
    ctx.fillRect(cx + 7, cy + 2, 3, 5);
  }
  // Head
  ctx.fillStyle = "#FDBCB4";
  ctx.fillRect(cx - 5, cy - 9, 11, 9);
  // Hair
  ctx.fillStyle = cfg.hair;
  ctx.fillRect(cx - 5, cy - 12, 11, 5);
  // Eye
  ctx.fillStyle = "#111";
  ctx.fillRect(facingRight ? cx + 2 : cx - 3, cy - 6, 2, 2);
  // Dept dot
  ctx.shadowColor = cfg.color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = cfg.color;
  ctx.beginPath();
  ctx.arc(cx, cy - 17, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Name tag
  ctx.font = '700 7px "Share Tech Mono", monospace';
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(cx - 14, cy - 30, 28, 11);
  ctx.fillStyle = cfg.color;
  ctx.fillText(name, cx, cy - 21);
  // Bubble
  if (bubble) {
    ctx.font = '6px "Share Tech Mono", monospace';
    const bw = Math.max(ctx.measureText(bubble).width + 14, 40);
    const bx = cx - bw / 2;
    const by = cy - 52;
    ctx.fillStyle = "rgba(8,10,20,0.92)";
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, 15, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#CDD5E0";
    ctx.fillText(bubble, cx, by + 10);
  }
}

// ─── Agent animation state ────────────────────────────────────────────────────
interface AgentAnim {
  id: string;
  x: number; y: number; vx: number;
  seated: boolean; walkTimer: number;
  facing: boolean;
  bubble?: string; bubbleTimer?: number;
}

function initAnim(id: string, cw: number): AgentAnim {
  const desk = getDeskPos(id, cw);
  const bounds = getRoomBounds(id, cw);
  const x = desk ? desk.x + 28 : (bounds ? bounds.x + bounds.w / 2 : cw / 2);
  const y = desk ? desk.y + 50 : (bounds ? bounds.y + bounds.h / 2 : 300);
  return {
    id, x, y, vx: 0, seated: true,
    walkTimer: 180 + Math.floor(Math.random() * 200),
    facing: true,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────
type TimeOfDay = "dia" | "tarde" | "noche";

export default function PixelStage() {
  const { agents, sendMessage, createChatSession, chatSessions } = useAstraeo();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const selectAgent = (id: string | null) => setSelectedAgentId(id);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<AgentAnim[]>([]);
  const tickRef = useRef(0);
  const rafRef = useRef<number>(0);
  const [tod, setTod] = useState<TimeOfDay>("dia");
  const [chatInput, setChatInput] = useState("");
  const [chatting, setChatting] = useState(false);

  // Sync animRef: only track visible (non-offline) agents
  useEffect(() => {
    const cw = canvasRef.current?.offsetWidth ?? 1100;
    const existing = new Map(animRef.current.map(s => [s.id, s]));
    animRef.current = agents
      .filter(a => a.status !== "offline")
      .map(a => existing.get(a.id) ?? initAnim(a.id, cw));
  }, [agents]);

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = CANVAS_H;
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth || 1100;
    canvas.height = CANVAS_H;
    return () => ro.disconnect();
  }, []);

  // Time of day cycle
  useEffect(() => {
    const seq: TimeOfDay[] = ["dia", "tarde", "noche"];
    let i = 0;
    const id = setInterval(() => { i = (i + 1) % 3; setTod(seq[i]); }, 20000);
    return () => clearInterval(id);
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      const cw = canvas.width;
      const tick = tickRef.current++;

      // Background
      ctx.fillStyle = "#06080F";
      ctx.fillRect(0, 0, cw, CANVAS_H);

      // Window strip
      drawWindowStrip(ctx, cw, tod);

      // Hub (center between room columns)
      const hubX = ROOM_W;
      const hubW = cw - 2 * ROOM_W;
      drawHub(ctx, hubX, WIN_H, hubW, CANVAS_H - WIN_H - LAB_H);

      // Skill lab
      const offlineAgents = agents.filter(a => a.status === "offline");
      drawSkillLab(ctx, cw, tick, offlineAgents);

      // Rooms + desks
      const visibleAgents = agents.filter(a => a.status !== "offline");
      for (const agent of visibleAgents) {
        const cfg = AGENT_CFG[agent.id];
        if (!cfg || cfg.row >= 3) continue;
        const rx = cfg.col === "left" ? 0 : cw - ROOM_W;
        const ry = ROW_Y[cfg.row];
        drawRoom(ctx, rx, ry, ROOM_W, RH, cfg);
        const desk = getDeskPos(agent.id, cw);
        if (desk) {
          const anim = animRef.current.find(a => a.id === agent.id);
          drawDesk(ctx, desk.x, desk.y, cfg.color, anim?.seated ?? true);
        }
        // Corner plant
        const plantX = cfg.col === "left" ? rx + 16 : rx + ROOM_W - 16;
        drawPlant(ctx, plantX, ry + RH - 32);
      }

      // Memory network lines between active desks
      const activeDesks = visibleAgents
        .filter(a => a.active)
        .map(a => getDeskPos(a.id, cw))
        .filter((d): d is { x: number; y: number } => d !== null);
      const netA = 0.06 + 0.04 * Math.sin(tick * 0.025);
      ctx.strokeStyle = `rgba(0,212,255,${netA})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < activeDesks.length; i++) {
        for (let j = i + 1; j < activeDesks.length; j++) {
          ctx.beginPath();
          ctx.moveTo(activeDesks[i].x + 28, activeDesks[i].y + 15);
          ctx.lineTo(activeDesks[j].x + 28, activeDesks[j].y + 15);
          ctx.stroke();
        }
      }

      // Time-of-day tint overlay
      if (tod === "tarde") {
        ctx.fillStyle = "rgba(60,30,0,0.06)";
        ctx.fillRect(0, 0, cw, CANVAS_H);
      } else if (tod === "noche") {
        ctx.fillStyle = "rgba(0,5,20,0.15)";
        ctx.fillRect(0, 0, cw, CANVAS_H);
      }

      // Update + draw agents
      for (const s of animRef.current) {
        const agent = agents.find(a => a.id === s.id);
        if (!agent || agent.status === "offline") continue;
        const cfg = AGENT_CFG[s.id];
        if (!cfg) continue;
        const bounds = getRoomBounds(s.id, cw);
        const desk = getDeskPos(s.id, cw);
        if (!bounds || !desk) continue;

        // Walk logic
        s.walkTimer--;
        if (s.walkTimer <= 0) {
          if (s.seated) {
            s.seated = false;
            s.y = bounds.y + RH - 46;
            s.vx = Math.random() < 0.5 ? 0.55 : -0.55;
            s.walkTimer = 40 + Math.floor(Math.random() * 50);
          } else {
            s.seated = true;
            s.x = desk.x + 28;
            s.y = desk.y + 50;
            s.vx = 0;
            s.walkTimer = 220 + Math.floor(Math.random() * 200);
          }
        }
        if (!s.seated) {
          s.x += s.vx;
          if (s.vx !== 0) s.facing = s.vx > 0;
          const pad = 14;
          if (s.x < bounds.x + pad) { s.x = bounds.x + pad; s.vx = 0.55; s.facing = true; }
          if (s.x > bounds.x + bounds.w - pad) { s.x = bounds.x + bounds.w - pad; s.vx = -0.55; s.facing = false; }
        } else {
          s.x = desk.x + 28;
          s.y = desk.y + 50;
        }

        // Bubbles
        if (!s.bubble && Math.random() < 0.003) {
          const list = BUBBLES[s.id] ?? ["..."];
          s.bubble = list[Math.floor(Math.random() * list.length)];
          s.bubbleTimer = 160;
        }
        if (s.bubbleTimer !== undefined) {
          s.bubbleTimer--;
          if (s.bubbleTimer <= 0) { s.bubble = undefined; s.bubbleTimer = undefined; }
        }

        const label = agent.name.length <= 5 ? agent.name.toUpperCase() : agent.name.split(" ")[0].toUpperCase();
        drawPerson(ctx, s.x, s.y, cfg, !s.seated, s.facing, label, s.id === selectedAgentId, s.bubble);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [agents, selectedAgentId, tod]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    for (const s of animRef.current) {
      const dx = mx - s.x, dy = my - s.y;
      if (dx * dx + dy * dy < 900) {
        selectAgent(s.id === selectedAgentId ? null : s.id);
        return;
      }
    }
    selectAgent(null);
  }, [selectAgent, selectedAgentId]);

  const handleChat = async () => {
    if (!chatInput.trim() || !selectedAgentId || chatting) return;
    setChatting(true);
    const existing = chatSessions.find(c => c.agentId === selectedAgentId);
    const sid = existing?.id ?? createChatSession(selectedAgentId);
    await sendMessage(sid, chatInput.trim(), selectedAgentId);
    setChatInput("");
    setChatting(false);
    const anim = animRef.current.find(s => s.id === selectedAgentId);
    if (anim) { anim.bubble = "Pensando..."; anim.bubbleTimer = 80; }
  };

  const selectedAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null;
  const lastReply = selectedAgentId
    ? chatSessions.find(c => c.agentId === selectedAgentId)?.messages.filter(m => m.role === "agent").at(-1)
    : null;
  const visibleCount = agents.filter(a => a.status !== "offline").length;

  return (
    <div className="flex flex-col h-full bg-[#06080F] select-none">
      {/* Top controls */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1A2040] bg-[#080B14] flex-shrink-0 flex-wrap">
        <span className="text-[10px] font-mono text-[#3A4A70] uppercase tracking-widest">
          Pixel Stage — ASTRAEO Office
        </span>
        <div className="flex gap-1 ml-2">
          {(["dia", "tarde", "noche"] as TimeOfDay[]).map(t => (
            <button key={t} onClick={() => setTod(t)}
              className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider transition-all"
              style={{
                background: tod === t ? "rgba(0,212,255,0.12)" : "transparent",
                color: tod === t ? "#00D4FF" : "#3A4A70",
                border: `1px solid ${tod === t ? "#00D4FF30" : "#1A2040"}`,
              }}>
              {t === "dia" ? "☀ Día" : t === "tarde" ? "🌆 Tarde" : "🌙 Noche"}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto flex-wrap">
          {agents.map(agent => {
            const cfg = AGENT_CFG[agent.id];
            if (!cfg) return null;
            const offline = agent.status === "offline";
            return (
              <button key={agent.id}
                onClick={() => !offline && selectAgent(agent.id === selectedAgentId ? null : agent.id)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono transition-all"
                style={{
                  opacity: offline ? 0.3 : 1,
                  background: selectedAgentId === agent.id ? `${cfg.color}18` : "transparent",
                  border: `1px solid ${selectedAgentId === agent.id ? cfg.color : "#1A2040"}`,
                  color: offline ? "#2A3A60" : cfg.color,
                  cursor: offline ? "not-allowed" : "pointer",
                }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", display: "inline-block", background: offline ? "#2A3A60" : cfg.color }} />
                {agent.name}
                {offline && <span className="opacity-40 text-[8px]">OFF</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas ref={canvasRef} onClick={handleClick}
          className="w-full cursor-pointer"
          style={{ height: CANVAS_H, display: "block", imageRendering: "pixelated" }} />
      </div>

      {/* Agent chat panel */}
      {selectedAgent && (
        <div className="border-t border-[#1A2040] bg-[#080B14] px-5 py-3 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {lastReply && (
                <div className="mb-2 px-3 py-2 rounded text-[11px] font-mono text-[#C0CDE0] bg-[#0D1020] border border-[#1A2040] leading-relaxed max-h-16 overflow-y-auto">
                  {lastReply.content}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-1.5 rounded text-[11px] font-mono bg-[#0D1020] border border-[#1A2040] text-[#C0CDE0] placeholder-[#2A3A60] focus:outline-none focus:border-[#00D4FF40]"
                  placeholder={`Hablar con ${selectedAgent.name}...`}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleChat()}
                />
                <button onClick={handleChat} disabled={chatting || !chatInput.trim()}
                  className="px-4 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-40"
                  style={{
                    background: `${AGENT_CFG[selectedAgent.id]?.color ?? "#00D4FF"}20`,
                    color: AGENT_CFG[selectedAgent.id]?.color ?? "#00D4FF",
                    border: `1px solid ${AGENT_CFG[selectedAgent.id]?.color ?? "#00D4FF"}40`,
                  }}>
                  {chatting ? "..." : "Enviar"}
                </button>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] font-mono font-bold" style={{ color: AGENT_CFG[selectedAgent.id]?.color ?? "#00D4FF" }}>
                {selectedAgent.name.toUpperCase()}
              </div>
              <div className="text-[9px] font-mono text-[#3A4A70] mt-0.5">{AGENT_CFG[selectedAgent.id]?.dept}</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-1.5 border-t border-[#1A2040] bg-[#080B14] flex items-center justify-between flex-shrink-0">
        <span className="text-[9px] font-mono text-[#2A3A60]">
          Click en un agente para interactuar · {visibleCount} agentes en oficina
        </span>
        <span className="text-[9px] font-mono text-[#1A2A40]">
          ⚡ {offlineCount(agents)} agentes en Skill Lab
        </span>
      </div>
    </div>
  );
}

function offlineCount(agents: Agent[]) {
  return agents.filter(a => a.status === "offline").length;
}
