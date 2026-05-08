"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAstraeo } from "@/store/astraeo";
import type { Agent, AgentStatus } from "@/lib/types";

// ─── ISO Math ──────────────────────────────────────────────────────────────────
const TILE_W = 96;
const TILE_H = 48;
const ORIGIN_X = 680;
const ORIGIN_Y = 80;

function isoX(col: number, row: number): number {
  return ORIGIN_X + (col - row) * (TILE_W / 2);
}
function isoY(col: number, row: number, z = 0): number {
  return ORIGIN_Y + (col + row) * (TILE_H / 2) - z;
}

// ─── Static star positions (generated once) ────────────────────────────────────
const STAR_POSITIONS: [number, number][] = Array.from({ length: 120 }, (_, i) => {
  const seed = (i * 2654435769) >>> 0;
  const x = (seed % 1500);
  const y = ((seed * 1234567) >>> 0) % 320;
  return [x, y];
});

// ─── Agent desk positions in the grid ─────────────────────────────────────────
const DESK_POSITIONS: Record<string, { col: number; row: number }> = {
  "agent-1": { col: 1,  row: 2  },
  "agent-2": { col: 6,  row: 1  },
  "agent-3": { col: 1,  row: 6  },
  "agent-4": { col: 6,  row: 5  },
  "agent-5": { col: 1,  row: 10 },
  "agent-6": { col: 6,  row: 9  },
  "agent-7": { col: 11, row: 3  },
  "agent-8": { col: 11, row: 7  },
};

interface AgentConfig {
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
  hairStyle: "short" | "long" | "curly" | "bun" | "spiky";
  irisColor: string;
  color: string;
  dept: string;
}

const AGENT_CONFIG: Record<string, AgentConfig> = {
  "agent-1": { dept: "COMMAND",    color: "#00D4FF", skin: "#F5C5A3", shirt: "#004A60", pants: "#0D1B3E", hair: "#1A0800", hairStyle: "short",  irisColor: "#00D4FF" },
  "agent-2": { dept: "PAID MEDIA", color: "#FF4757", skin: "#E8A882", shirt: "#6B1219", pants: "#1A0A0A", hair: "#0A0A0A", hairStyle: "curly",  irisColor: "#FF4757" },
  "agent-3": { dept: "CRM",        color: "#FF6B9D", skin: "#FDDBB4", shirt: "#5A1535", pants: "#1A0A12", hair: "#3A1020", hairStyle: "long",   irisColor: "#FF6B9D" },
  "agent-4": { dept: "CONTENT",    color: "#FFB800", skin: "#F0D090", shirt: "#5A4000", pants: "#1A1200", hair: "#2A1800", hairStyle: "bun",    irisColor: "#FFB800" },
  "agent-5": { dept: "ANALYTICS",  color: "#7B61FF", skin: "#D4A574", shirt: "#2A1A60", pants: "#0A0A1A", hair: "#0A0020", hairStyle: "short",  irisColor: "#7B61FF" },
  "agent-6": { dept: "AI TECH",    color: "#00E5A0", skin: "#C68642", shirt: "#003830", pants: "#0A1A12", hair: "#001510", hairStyle: "spiky",  irisColor: "#00E5A0" },
  "agent-7": { dept: "SALES",      color: "#CC785C", skin: "#F0C090", shirt: "#4A2010", pants: "#1A0800", hair: "#200800", hairStyle: "curly",  irisColor: "#CC785C" },
  "agent-8": { dept: "SEO",        color: "#64B5F6", skin: "#FDDBB4", shirt: "#14305A", pants: "#0A0A1A", hair: "#001020", hairStyle: "long",   irisColor: "#64B5F6" },
};

// ─── Activity phrases per dept ────────────────────────────────────────────────
const ACTIVITY_PHRASES: Record<string, string[]> = {
  "agent-1": ["Reviewing dashboards", "Strategy planning", "Monitoring KPIs"],
  "agent-2": ["Optimizing ads", "A/B testing copy", "Budget allocation"],
  "agent-3": ["Segmenting leads", "Email automation", "CRM cleanup"],
  "agent-4": ["Writing blog post", "Editing content", "SEO research"],
  "agent-5": ["Running queries", "Building reports", "Data modeling"],
  "agent-6": ["Training model", "Debugging pipeline", "API integration"],
  "agent-7": ["Cold outreach", "Pipeline review", "Closing deals"],
  "agent-8": ["Keyword research", "Link building", "Tech SEO audit"],
};

// ─── Ambient Occlusion + Light Shafts ─────────────────────────────────────────

function drawAmbientOcclusion(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): void {
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  grad.addColorStop(0, "rgba(0,0,0,0.30)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.12)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWindowLightShafts(ctx: CanvasRenderingContext2D, t: number): void {
  const windowCols = [1, 4, 7];
  windowCols.forEach((wc, i) => {
    const wx = isoX(wc + 0.5, 0);
    const wy = isoY(wc + 0.5, 0);
    const pulse = 0.65 + Math.sin(t * 0.25 + i * 1.2) * 0.12;

    // Shaft polygon (trapezoid projecting onto floor)
    const shaftW = 60;
    const shaftSpread = 120;
    const shaftLen = 180;
    ctx.save();
    const shaftGrad = ctx.createLinearGradient(wx, wy - 40, wx, wy + shaftLen);
    shaftGrad.addColorStop(0, `rgba(255, 220, 160, ${0.12 * pulse})`);
    shaftGrad.addColorStop(0.5, `rgba(255, 210, 140, ${0.06 * pulse})`);
    shaftGrad.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = shaftGrad;
    ctx.beginPath();
    ctx.moveTo(wx - shaftW / 2, wy - 40);
    ctx.lineTo(wx + shaftW / 2, wy - 40);
    ctx.lineTo(wx + shaftW / 2 + shaftSpread, wy + shaftLen);
    ctx.lineTo(wx - shaftW / 2 - shaftSpread, wy + shaftLen);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Dust motes near window
    for (let d = 0; d < 6; d++) {
      const dx = wx + Math.sin(t * 0.3 + d * 1.7 + i * 2.3) * 28;
      const dy = wy - 20 + Math.cos(t * 0.22 + d * 2.1) * 35 + d * 8;
      const moteOpacity = 0.25 + Math.sin(t * 0.8 + d) * 0.15;
      ctx.save();
      ctx.fillStyle = `rgba(255, 230, 180, ${moteOpacity})`;
      ctx.beginPath();
      ctx.arc(dx, dy, 0.8 + (d % 3) * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}

function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const vgrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
  vgrad.addColorStop(0, "rgba(0,0,0,0)");
  vgrad.addColorStop(0.7, "rgba(0,0,0,0.08)");
  vgrad.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.save();
  ctx.fillStyle = vgrad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawHeadphones(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
  // Headband arc
  ctx.strokeStyle = "#0C0E1C";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, Math.PI, 0);
  ctx.stroke();
  // Ear cups
  ctx.fillStyle = "#1A1E2E";
  ctx.beginPath();
  ctx.roundRect(cx - 10, cy - 2, 5, 7, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx + 5, cy - 2, 5, 7, 2);
  ctx.fill();
  // Color accent on cups
  ctx.fillStyle = color + "AA";
  ctx.beginPath();
  ctx.roundRect(cx - 9.5, cy - 1, 4, 2, 1);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx + 5.5, cy - 1, 4, 2, 1);
  ctx.fill();
}

function drawStickyNote(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  // Note body with slight rotation
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.08);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-7, -7, 14, 14, 1);
  ctx.fill();
  // Lines on note
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 0.8;
  ctx.lineCap = "round";
  for (let l = 0; l < 3; l++) {
    ctx.beginPath();
    ctx.moveTo(-4.5, -2.5 + l * 3.5);
    ctx.lineTo(3.5, -2.5 + l * 3.5);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Canvas drawing helpers ────────────────────────────────────────────────────

function drawExterior(ctx: CanvasRenderingContext2D): void {
  // Twilight sky — deep purple/indigo with warm horizon glow
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 380);
  skyGrad.addColorStop(0, "#08042A");
  skyGrad.addColorStop(0.35, "#120835");
  skyGrad.addColorStop(0.65, "#1E0C42");
  skyGrad.addColorStop(0.85, "#2A1030");
  skyGrad.addColorStop(1, "#3A1820");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1500, 800);

  // Warm horizon glow (city light pollution)
  const horizonGrad = ctx.createLinearGradient(0, 260, 0, 380);
  horizonGrad.addColorStop(0, "rgba(0,0,0,0)");
  horizonGrad.addColorStop(0.5, "rgba(80, 30, 20, 0.18)");
  horizonGrad.addColorStop(1, "rgba(120, 50, 20, 0.25)");
  ctx.fillStyle = horizonGrad;
  ctx.fillRect(0, 260, 1500, 120);

  // Moon glow top right
  const moonGlow = ctx.createRadialGradient(1300, 40, 0, 1300, 40, 120);
  moonGlow.addColorStop(0, "rgba(200, 180, 255, 0.12)");
  moonGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = moonGlow;
  ctx.fillRect(1180, 0, 240, 160);

  // Subtle atmospheric haze — very muted, not aurora-bright
  const auroraColors: [number, string, string][] = [
    [0.25, "rgba(80,  70, 160, 0.04)", "rgba(80,  70, 160, 0)"],
    [0.45, "rgba(60,  90, 130, 0.03)", "rgba(60,  90, 130, 0)"],
    [0.65, "rgba(50, 100,  80, 0.025)","rgba(50, 100,  80, 0)"],
  ];
  auroraColors.forEach(([yFrac, colorA, colorB], i) => {
    const ay = yFrac * 320;
    const aGrad = ctx.createLinearGradient(0, ay - 25, 0, ay + 25);
    aGrad.addColorStop(0, colorB);
    aGrad.addColorStop(0.5, colorA);
    aGrad.addColorStop(1, colorB);
    ctx.fillStyle = aGrad;
    ctx.beginPath();
    ctx.ellipse(750 + i * 60, ay, 700, 25, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Stars
  STAR_POSITIONS.forEach(([sx, sy]) => {
    const brightness = 0.4 + (sx % 7) * 0.08;
    ctx.fillStyle = `rgba(220,210,255,${brightness})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.8 + (sy % 3) * 0.25, 0, Math.PI * 2);
    ctx.fill();
  });

  // Distant city skyline silhouettes
  const buildingData: [number, number, number, number][] = [
    [0, 180, 60, 140], [55, 195, 45, 120], [95, 170, 80, 160],
    [170, 200, 50, 110], [215, 185, 70, 145], [280, 175, 55, 165],
    [330, 205, 45, 105], [870, 185, 65, 145], [930, 175, 50, 165],
    [975, 195, 70, 125], [1040, 180, 55, 150], [1090, 200, 45, 110],
    [1130, 170, 80, 160], [1205, 190, 50, 130], [1250, 178, 60, 142],
    [1305, 198, 45, 112], [1345, 185, 70, 145], [1410, 172, 60, 158],
    [1465, 202, 50, 118],
  ];
  buildingData.forEach(([bx, by, bw, bh]) => {
    // Building body with warm dark tone
    ctx.fillStyle = "#100A1A";
    ctx.fillRect(bx, by, bw, bh);
    // Lit windows — warm amber/yellow for life, plus some blue offices
    for (let wy = by + 8; wy < by + bh - 8; wy += 14) {
      for (let wx = bx + 6; wx < bx + bw - 6; wx += 12) {
        const seed = (wx * 7 + wy * 3) % 40;
        if (seed < 14) {
          ctx.fillStyle = seed < 6 ? "rgba(255, 200, 80, 0.55)" : "rgba(100, 160, 255, 0.35)";
          ctx.fillRect(wx, wy, 6, 8);
        }
      }
    }
  });

  // Tree silhouettes — richer greens
  const treeData: [number, number, number][] = [
    [350, 200, 28], [390, 210, 22], [420, 198, 30], [455, 208, 24],
    [490, 200, 26], [820, 205, 25], [850, 195, 32], [885, 207, 22],
    [910, 198, 28], [940, 210, 20],
  ];
  treeData.forEach(([tx, ty, tr]) => {
    // Trunk
    ctx.fillStyle = "#0E0A06";
    ctx.fillRect(tx - 3, ty + tr - 8, 6, 24);
    // Dark foliage layers
    ctx.fillStyle = "#0A1A0C";
    ctx.beginPath();
    ctx.arc(tx, ty + 8, tr * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0E2210";
    ctx.beginPath();
    ctx.arc(tx, ty, tr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#142E16";
    ctx.beginPath();
    ctx.arc(tx - 4, ty - 6, tr * 0.72, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  topColor: string,
  lineColor: string
): void {
  const cx = isoX(col, row);
  const cy = isoY(col, row);
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;

  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  ctx.fill();

  // Grid line — slightly more visible for wood plank effect
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  ctx.stroke();

  // Wood grain — visible on light hardwood
  if ((col + row) % 2 === 0) {
    ctx.strokeStyle = "rgba(140, 90, 30, 0.12)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx - hw * 0.55, cy - hh * 0.45);
    ctx.lineTo(cx + hw * 0.55, cy + hh * 0.45);
    ctx.stroke();
  }
}

function drawAllFloorTiles(ctx: CanvasRenderingContext2D): void {
  // Main workspace — light warm oak/ash hardwood (research-backed: #C8A882 / #B8956F / #D9BC99)
  for (let c = 0; c < 14; c++) {
    for (let r = 0; r < 14; r++) {
      const shade = (c + r) % 2 === 0 ? "#C4A278" : "#B8956F";
      drawFloorTile(ctx, c, r, shade, "#9A7450");
    }
  }
  // Meeting room — cool polished light concrete/marble
  for (let c = 14; c < 19; c++) {
    for (let r = 0; r < 9; r++) {
      const shade = (c + r) % 2 === 0 ? "#3A4A60" : "#344458";
      drawFloorTile(ctx, c, r, shade, "#222E42");
    }
  }
  // Lounge zone — warm plum/charcoal carpet with visible pile texture
  for (let c = 10; c < 14; c++) {
    for (let r = 10; r < 14; r++) {
      const shade = (c + r) % 2 === 0 ? "#3C2C58" : "#342450";
      drawFloorTile(ctx, c, r, shade, "#281840");
    }
  }
}

function drawZoneHighlight(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  color: string,
  selected: boolean
): void {
  // Draw a vivid colored carpet covering the desk area — Sowork-style zone highlight
  const C0 = col - 0.12, R0 = row - 0.12;
  const C1 = col + 2.12, R1 = row + 1.25;

  const pts = [
    { x: isoX(C0, R0), y: isoY(C0, R0) },
    { x: isoX(C1, R0), y: isoY(C1, R0) },
    { x: isoX(C1, R1), y: isoY(C1, R1) },
    { x: isoX(C0, R1), y: isoY(C0, R1) },
  ];

  ctx.save();

  // Main carpet fill — high opacity, vivid
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.lineTo(pts[3].x, pts[3].y);
  ctx.closePath();
  ctx.fillStyle = color + (selected ? "70" : "45");
  ctx.fill();

  // Carpet border stroke
  ctx.strokeStyle = color + (selected ? "FF" : "CC");
  ctx.lineWidth = selected ? 3 : 2;
  ctx.stroke();

  // Inner decorative border (carpet frame effect)
  const m = 7; // pixel margin for inner border
  ctx.beginPath();
  ctx.moveTo(pts[0].x + m, pts[0].y + m * 0.3);
  ctx.lineTo(pts[1].x - m, pts[1].y + m * 0.3);
  ctx.lineTo(pts[2].x - m, pts[2].y - m * 0.3);
  ctx.lineTo(pts[3].x + m, pts[3].y - m * 0.3);
  ctx.closePath();
  ctx.strokeStyle = color + "55";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawWalls(ctx: CanvasRenderingContext2D, t: number): void {
  const wallH = 80;

  // Back wall — warm dark charcoal with slight wood warmth
  for (let c = 0; c < 10; c++) {
    const x0 = isoX(c, 0);
    const y0 = isoY(c, 0);
    const x1 = isoX(c + 1, 0);
    const y1 = isoY(c + 1, 0);

    // Wall face — warm dark brown-charcoal
    ctx.fillStyle = "#282018";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1, y1 - wallH);
    ctx.lineTo(x0, y0 - wallH);
    ctx.closePath();
    ctx.fill();

    // Subtle vertical panel texture
    ctx.strokeStyle = "rgba(255,220,160,0.04)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo((x0 + x1) / 2, y0 - wallH + 5);
    ctx.lineTo((x0 + x1) / 2, y0 - 2);
    ctx.stroke();

    // Top cap — slightly lighter warm tone
    ctx.fillStyle = "#342A20";
    ctx.beginPath();
    ctx.moveTo(x0, y0 - wallH);
    ctx.lineTo(x1, y1 - wallH);
    ctx.lineTo(x1, y1 - wallH + TILE_H / 2);
    ctx.lineTo(x0, y0 - wallH + TILE_H / 2);
    ctx.closePath();
    ctx.fill();
  }

  // Windows in the back wall
  const windowCols = [1, 4, 7];
  windowCols.forEach((wc) => {
    const wx = isoX(wc + 0.3, 0) - 18;
    const wy = isoY(wc + 0.3, 0) - wallH + 10;
    drawWindow(ctx, wx, wy, 36, 42, t);
  });

  // Left wall — slightly darker warm brown
  for (let r = 0; r < 13; r++) {
    const x0 = isoX(0, r);
    const y0 = isoY(0, r);
    const x1 = isoX(0, r + 1);
    const y1 = isoY(0, r + 1);

    ctx.fillStyle = "#221810";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1, y1 - wallH);
    ctx.lineTo(x0, y0 - wallH);
    ctx.closePath();
    ctx.fill();
  }

  // Wall base trim — warm amber accent line where wall meets floor
  for (let c = 0; c < 10; c++) {
    const x0 = isoX(c, 0);
    const y0 = isoY(c, 0);
    const x1 = isoX(c + 1, 0);
    const y1 = isoY(c + 1, 0);
    ctx.strokeStyle = "rgba(200, 140, 60, 0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  ww: number,
  wh: number,
  t: number
): void {
  // Window frame — warm dark wood
  ctx.fillStyle = "#2A1E10";
  ctx.beginPath();
  ctx.roundRect(wx - 3, wy - 3, ww + 6, wh + 6, 3);
  ctx.fill();

  // Glass showing twilight purple/indigo sky
  const glassGrad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
  glassGrad.addColorStop(0, "#120830");
  glassGrad.addColorStop(0.45, "#1A0C3E");
  glassGrad.addColorStop(0.8, "#280E38");
  glassGrad.addColorStop(1, "#3A1820");
  ctx.fillStyle = glassGrad;
  ctx.fillRect(wx, wy, ww, wh);

  // Warm city glow at window bottom
  const cityGlow = ctx.createLinearGradient(wx, wy + wh * 0.6, wx, wy + wh);
  cityGlow.addColorStop(0, "rgba(0,0,0,0)");
  cityGlow.addColorStop(1, "rgba(255, 120, 40, 0.12)");
  ctx.fillStyle = cityGlow;
  ctx.fillRect(wx, wy + wh * 0.6, ww, wh * 0.4);

  // Window pane dividers — warm tone
  ctx.strokeStyle = "#3A2818";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(wx + ww / 2, wy);
  ctx.lineTo(wx + ww / 2, wy + wh);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(wx, wy + wh / 2);
  ctx.lineTo(wx + ww, wy + wh / 2);
  ctx.stroke();

  // Animated purple star-glow pulse
  const pulse = (Math.sin(t * 0.7) + 1) * 0.5;
  ctx.fillStyle = `rgba(80, 40, 160, ${0.06 + pulse * 0.08})`;
  ctx.fillRect(wx, wy, ww, wh);

  // Light reflection diagonal
  ctx.fillStyle = "rgba(200, 180, 255, 0.07)";
  ctx.beginPath();
  ctx.moveTo(wx, wy);
  ctx.lineTo(wx + ww * 0.55, wy);
  ctx.lineTo(wx + ww * 0.25, wy + wh * 0.55);
  ctx.lineTo(wx, wy + wh * 0.28);
  ctx.closePath();
  ctx.fill();
}

function drawDesk(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  agentColor: string,
  t: number
): void {
  const DESK_H = 24;

  const tl  = { x: isoX(col,   row),   y: isoY(col,   row,   DESK_H) };
  const tr  = { x: isoX(col+2, row),   y: isoY(col+2, row,   DESK_H) };
  const br  = { x: isoX(col+2, row+1), y: isoY(col+2, row+1, DESK_H) };
  const bl  = { x: isoX(col,   row+1), y: isoY(col,   row+1, DESK_H) };
  const bl0 = { x: isoX(col,   row+1), y: isoY(col,   row+1, 0) };
  const br0 = { x: isoX(col+2, row+1), y: isoY(col+2, row+1, 0) };
  const tl0 = { x: isoX(col,   row),   y: isoY(col,   row,   0) };
  const tr0 = { x: isoX(col+2, row),   y: isoY(col+2, row,   0) };

  // Left face — dark warm mahogany
  ctx.fillStyle = "#3A2410";
  ctx.beginPath();
  ctx.moveTo(tl0.x, tl0.y);
  ctx.lineTo(bl0.x, bl0.y);
  ctx.lineTo(bl.x,  bl.y);
  ctx.lineTo(tl.x,  tl.y);
  ctx.closePath();
  ctx.fill();

  // Front face — slightly warmer
  ctx.fillStyle = "#482C14";
  ctx.beginPath();
  ctx.moveTo(bl0.x, bl0.y);
  ctx.lineTo(br0.x, br0.y);
  ctx.lineTo(br.x,  br.y);
  ctx.lineTo(bl.x,  bl.y);
  ctx.closePath();
  ctx.fill();

  // Accent stripe on front — agent dept color
  ctx.fillStyle = agentColor + "40";
  ctx.beginPath();
  ctx.moveTo(bl0.x, bl0.y - 4);
  ctx.lineTo(br0.x, br0.y - 4);
  ctx.lineTo(br.x + 1, br.y - 4);
  ctx.lineTo(bl.x - 1, bl.y - 4);
  ctx.closePath();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = agentColor + "AA";
  ctx.stroke();

  // Desktop surface — warm wood with slight color tint from agent
  const surfGrad = ctx.createLinearGradient(tl.x, tl.y, br.x, br.y);
  surfGrad.addColorStop(0, "#6A4820");
  surfGrad.addColorStop(0.5, "#5A3C18");
  surfGrad.addColorStop(1, "#4A3010");
  ctx.fillStyle = surfGrad;
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.fill();

  // Subtle agent-color overlay on surface
  ctx.fillStyle = agentColor + "12";
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.fill();

  // Surface highlight corner
  ctx.fillStyle = "rgba(255,220,160,0.07)";
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tl.x + (tr.x - tl.x) * 0.35, tl.y + (tr.y - tl.y) * 0.35);
  ctx.lineTo(
    tl.x + (tr.x - tl.x) * 0.35 + (bl.x - tl.x) * 0.25,
    tl.y + (tr.y - tl.y) * 0.35 + (bl.y - tl.y) * 0.25
  );
  ctx.lineTo(tl.x + (bl.x - tl.x) * 0.25, tl.y + (bl.y - tl.y) * 0.25);
  ctx.closePath();
  ctx.fill();

  // Ambient occlusion under desk
  const aoCx = isoX(col + 1, row + 0.5);
  const aoCy = isoY(col + 1, row + 0.5);
  drawAmbientOcclusion(ctx, aoCx, aoCy, 80, 28);

  // Monitor (centrado en la superficie del escritorio)
  const mcx = isoX(col + 0.9, row + 0.35);
  const mcy = isoY(col + 0.9, row + 0.35, DESK_H);
  drawMonitor(ctx, mcx, mcy, agentColor, t);

  // Monitor floor glow
  const monFloorGrad = ctx.createRadialGradient(mcx, mcy + 20, 0, mcx, mcy + 20, 55);
  monFloorGrad.addColorStop(0, agentColor + "18");
  monFloorGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.fillStyle = monFloorGrad;
  ctx.beginPath();
  ctx.ellipse(mcx, mcy + 20, 55, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Keyboard
  const kcx = isoX(col + 0.75, row + 0.72);
  const kcy = isoY(col + 0.75, row + 0.72, DESK_H);
  drawKeyboard(ctx, kcx, kcy);

  // Coffee mug
  const tcx = isoX(col + 1.55, row + 0.2);
  const tcy = isoY(col + 1.55, row + 0.2, DESK_H);
  drawCoffeeMug(ctx, tcx, tcy, agentColor);

  // Headphones (every other desk)
  if ((col + row) % 4 < 2) {
    const hcx = isoX(col + 1.75, row + 0.65);
    const hcy = isoY(col + 1.75, row + 0.65, DESK_H);
    drawHeadphones(ctx, hcx, hcy, agentColor);
  }

  // Sticky notes (alternating)
  if ((col + row) % 3 === 0) {
    const scx = isoX(col + 0.35, row + 0.3);
    const scy = isoY(col + 0.35, row + 0.3, DESK_H);
    const noteColors = ["#FFE066", "#FF9AAA", "#80E5FF", "#B5F5A0"];
    drawStickyNote(ctx, scx, scy, noteColors[(col + row) % noteColors.length]);
  }
}

function drawMonitor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  glowColor: string,
  t: number
): void {
  // Stand base
  ctx.fillStyle = "#080C18";
  ctx.beginPath();
  ctx.roundRect(cx - 7, cy + 2, 14, 6, 2);
  ctx.fill();

  // Stand neck
  ctx.fillStyle = "#0A0E1C";
  ctx.fillRect(cx - 2, cy - 8, 4, 12);

  // Monitor body
  ctx.fillStyle = "#080C18";
  ctx.beginPath();
  ctx.roundRect(cx - 22, cy - 40, 44, 34, 4);
  ctx.fill();

  // Bezel highlight
  ctx.strokeStyle = "#1A2030";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.roundRect(cx - 22, cy - 40, 44, 34, 4);
  ctx.stroke();

  // Screen glow
  const pulse = (Math.sin(t * 1.8 + cx * 0.01) + 1) * 0.5;
  const screenGrad = ctx.createLinearGradient(cx - 18, cy - 38, cx + 18, cy - 8);
  screenGrad.addColorStop(0, glowColor + Math.round(40 + pulse * 20).toString(16).padStart(2, "0"));
  screenGrad.addColorStop(0.5, glowColor + "18");
  screenGrad.addColorStop(1, glowColor + "08");
  ctx.fillStyle = screenGrad;
  ctx.beginPath();
  ctx.roundRect(cx - 18, cy - 37, 36, 28, 2);
  ctx.fill();

  // Screen content lines — muted, no glow
  ctx.fillStyle = glowColor + "70";
  const lines = [cy - 32, cy - 26, cy - 20, cy - 14];
  const widths = [28, 20, 24, 16];
  lines.forEach((ly, i) => {
    ctx.beginPath();
    ctx.roundRect(cx - 14, ly, widths[i], 2, 1);
    ctx.fill();
  });

  // Tiny chart-like block
  ctx.fillStyle = glowColor + "50";
  ctx.beginPath();
  ctx.roundRect(cx + 4, cy - 30, 10, 16, 1);
  ctx.fill();
}

function drawKeyboard(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Keyboard base
  ctx.fillStyle = "#0C1020";
  ctx.beginPath();
  ctx.roundRect(cx - 18, cy - 5, 36, 10, 2);
  ctx.fill();

  // Key rows
  ctx.fillStyle = "#181E30";
  [[0, -3, 28, 3], [0, 2, 32, 3]].forEach(([ox, oy, kw, kh]) => {
    ctx.beginPath();
    ctx.roundRect(cx - kw / 2 + ox, cy + oy, kw, kh, 1);
    ctx.fill();
  });
}

function drawCoffeeMug(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  accentColor: string
): void {
  // Mug body
  ctx.fillStyle = "#1A1A2E";
  ctx.beginPath();
  ctx.roundRect(cx - 5, cy - 10, 10, 12, 2);
  ctx.fill();

  // Mug accent stripe
  ctx.fillStyle = accentColor + "80";
  ctx.beginPath();
  ctx.roundRect(cx - 5, cy - 7, 10, 3, 0);
  ctx.fill();

  // Handle
  ctx.strokeStyle = "#1A1A2E";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx + 6, cy - 5, 4, -0.8, 0.8);
  ctx.stroke();

  // Steam wisps
  ctx.strokeStyle = "rgba(180,200,255,0.25)";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 2, cy - 12);
  ctx.quadraticCurveTo(cx, cy - 16, cx - 2, cy - 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 2, cy - 12);
  ctx.quadraticCurveTo(cx + 4, cy - 16, cx + 2, cy - 20);
  ctx.stroke();
}

function drawPlant(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  size: number,
  t: number
): void {
  const px = isoX(col, row);
  const py = isoY(col, row);
  const sway = Math.sin(t * 0.6 + col * 1.3) * 1.5;

  // Pot face left — terracotta
  ctx.fillStyle = "#5A2A10";
  ctx.beginPath();
  ctx.moveTo(px - 8, py + 4);
  ctx.lineTo(px, py + 8);
  ctx.lineTo(px, py + 18);
  ctx.lineTo(px - 8, py + 14);
  ctx.closePath();
  ctx.fill();

  // Pot face front — warmer terracotta
  ctx.fillStyle = "#7A3A16";
  ctx.beginPath();
  ctx.moveTo(px, py + 8);
  ctx.lineTo(px + 8, py + 4);
  ctx.lineTo(px + 8, py + 14);
  ctx.lineTo(px, py + 18);
  ctx.closePath();
  ctx.fill();

  // Pot top rim
  ctx.fillStyle = "#8A4420";
  ctx.beginPath();
  ctx.moveTo(px, py + 2);
  ctx.lineTo(px + 8, py - 2);
  ctx.lineTo(px, py + 8 - 4);
  ctx.lineTo(px - 8, py + 4);
  ctx.closePath();
  ctx.fill();

  // Soil
  ctx.fillStyle = "#1E1008";
  ctx.beginPath();
  ctx.ellipse(px, py + 5, 7, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Leaves (layered blobs with sway) — richer greens
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(sway * 0.02);

  const leafData: [number, number, number, string][] = [
    [-size * 0.6,  -size * 0.5 - 8, size * 0.7, "#0E2E10"],
    [size * 0.5,   -size * 0.4 - 6, size * 0.65,"#0E2E10"],
    [0,            -size - 12,       size * 0.8, "#143818"],
    [-size * 0.3,  -size * 0.8 - 10,size * 0.6, "#1A4220"],
    [size * 0.3,   -size * 0.9 - 8, size * 0.55,"#1A4220"],
    [0,            -size * 1.2 - 14, size * 0.5, "#204E28"],
  ];

  leafData.forEach(([lx, ly, lr, lc]) => {
    ctx.fillStyle = lc;
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawHangingPlant(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  size: number,
  t: number
): void {
  const sway = Math.sin(t * 0.5 + wx * 0.01) * 2;
  // Hanging rope
  ctx.strokeStyle = "#4A3010";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(wx, wy);
  ctx.lineTo(wx + sway, wy + 18);
  ctx.stroke();

  // Pot body
  ctx.fillStyle = "#6A3518";
  ctx.beginPath();
  ctx.arc(wx + sway, wy + 22, size * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Trailing vines
  const leafColors = ["#1A4A1C", "#1E5A20", "#244E24"];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI + sway * 0.02;
    const lx = wx + sway + Math.cos(angle) * size * 0.4;
    const ly = wy + 22 + Math.sin(angle) * size * 0.6 + i * 6;
    ctx.fillStyle = leafColors[i % leafColors.length];
    ctx.beginPath();
    ctx.ellipse(lx, ly, size * 0.35, size * 0.25, angle + Math.PI * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Draping strand
  ctx.strokeStyle = "#1E501E";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(wx + sway, wy + 26);
  ctx.bezierCurveTo(wx + sway - 8, wy + 38, wx + sway + 5, wy + 50, wx + sway - 4, wy + 62);
  ctx.stroke();
}

function drawAllPlants(ctx: CanvasRenderingContext2D, t: number): void {
  // Floor plants
  const plants: [number, number, number][] = [
    [0, 0, 22],
    [4.5, 0.4, 18],
    [9.2, 0.3, 20],
    [0.2, 6.5, 24],
    [0.3, 12.5, 20],
    [9.5, 13.5, 18],
    [13.5, 10.5, 22],
    [10.5, 13.5, 16],
  ];
  plants.forEach(([c, r, s]) => drawPlant(ctx, c, r, s, t));

  // Hanging plants along the back wall (above the wall, in screen space)
  const hangPositions: [number, number, number][] = [
    [isoX(2, 0) + 20, isoY(2, 0) - 72, 12],
    [isoX(4, 0) + 10, isoY(4, 0) - 78, 10],
    [isoX(6, 0) + 15, isoY(6, 0) - 75, 11],
    [isoX(8, 0) + 10, isoY(8, 0) - 72, 10],
  ];
  hangPositions.forEach(([hx, hy, hs]) => drawHangingPlant(ctx, hx, hy, hs, t));
}

function drawMeetingTable(ctx: CanvasRenderingContext2D): void {
  const col = 14.5, row = 1.5;
  const TABLE_H = 22;

  const corners = [
    { c: col,     r: row,     z: TABLE_H },
    { c: col + 3, r: row,     z: TABLE_H },
    { c: col + 3, r: row + 4, z: TABLE_H },
    { c: col,     r: row + 4, z: TABLE_H },
  ];
  const [tl, tr, br, bl] = corners.map(({ c, r, z }) => ({
    x: isoX(c, r), y: isoY(c, r, z),
  }));
  const [tl0, _tr0, br0, bl0] = corners.map(({ c, r }) => ({
    x: isoX(c, r), y: isoY(c, r, 0),
  }));

  // Table left face — deep slate blue
  ctx.fillStyle = "#0E1830";
  ctx.beginPath();
  ctx.moveTo(tl0.x, tl0.y);
  ctx.lineTo(bl0.x, bl0.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.lineTo(tl.x, tl.y);
  ctx.closePath();
  ctx.fill();

  // Table front face
  ctx.fillStyle = "#14203C";
  ctx.beginPath();
  ctx.moveTo(bl0.x, bl0.y);
  ctx.lineTo(br0.x, br0.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.fill();

  // Table top — cool blue-gray glass look
  ctx.fillStyle = "#1E304E";
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.fill();

  // Top highlight
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(tl.x + (tr.x - tl.x) * 0.5 + (bl.x - tl.x) * 0.2, tl.y + (tr.y - tl.y) * 0.5 + (bl.y - tl.y) * 0.2);
  ctx.lineTo(tl.x + (bl.x - tl.x) * 0.2, tl.y + (bl.y - tl.y) * 0.2);
  ctx.closePath();
  ctx.fill();

  // Chairs around the table
  const chairPositions = [
    { c: col + 0.5, r: row - 0.8 },
    { c: col + 1.5, r: row - 0.8 },
    { c: col + 2.5, r: row - 0.8 },
    { c: col - 0.8, r: row + 0.5 },
    { c: col - 0.8, r: row + 1.5 },
    { c: col - 0.8, r: row + 2.5 },
  ];
  chairPositions.forEach(({ c, r }) => drawChair(ctx, c, r));
}

function drawChair(ctx: CanvasRenderingContext2D, col: number, row: number): void {
  const cx = isoX(col, row);
  const cy = isoY(col, row, 14);

  // Chair seat — teal/slate
  ctx.fillStyle = "#1A2838";
  ctx.beginPath();
  ctx.roundRect(cx - 10, cy - 6, 20, 14, 3);
  ctx.fill();

  // Chair backrest — slightly lighter
  ctx.fillStyle = "#22344A";
  ctx.beginPath();
  ctx.roundRect(cx - 9, cy - 22, 18, 18, 3);
  ctx.fill();

  // Backrest highlight
  ctx.fillStyle = "rgba(100,180,255,0.06)";
  ctx.beginPath();
  ctx.roundRect(cx - 9, cy - 22, 18, 4, [3, 3, 0, 0]);
  ctx.fill();
}

function drawSofa(ctx: CanvasRenderingContext2D): void {
  // Orange statement sofa — warm terracotta/burnt orange, Apple emoji-style gradients
  const col = 10.5, row = 10.5;
  const SOFA_H = 20;
  const BACK_H = 30;

  // Base shadow
  const sofaShadow = ctx.createRadialGradient(isoX(col + 1.25, row + 1), isoY(col + 1.25, row + 1), 0, isoX(col + 1.25, row + 1), isoY(col + 1.25, row + 1), 90);
  sofaShadow.addColorStop(0, "rgba(0,0,0,0.28)");
  sofaShadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sofaShadow;
  ctx.beginPath();
  ctx.ellipse(isoX(col + 1.25, row + 1), isoY(col + 1.25, row + 1), 90, 35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sofa left face — dark burnt orange
  ctx.fillStyle = "#7A2E0C";
  ctx.beginPath();
  ctx.moveTo(isoX(col, row), isoY(col, row));
  ctx.lineTo(isoX(col, row + 2), isoY(col, row + 2));
  ctx.lineTo(isoX(col, row + 2), isoY(col, row + 2) - SOFA_H);
  ctx.lineTo(isoX(col, row), isoY(col, row) - SOFA_H);
  ctx.closePath();
  ctx.fill();

  // Sofa front face — mid burnt orange
  ctx.fillStyle = "#A83E16";
  ctx.beginPath();
  ctx.moveTo(isoX(col, row + 2), isoY(col, row + 2));
  ctx.lineTo(isoX(col + 2.5, row + 2), isoY(col + 2.5, row + 2));
  ctx.lineTo(isoX(col + 2.5, row + 2), isoY(col + 2.5, row + 2) - SOFA_H);
  ctx.lineTo(isoX(col, row + 2), isoY(col, row + 2) - SOFA_H);
  ctx.closePath();
  ctx.fill();

  // Seat top — warm terracotta with radial highlight
  const seatTopCx = isoX(col + 1.25, row + 1);
  const seatTopCy = isoY(col + 1.25, row + 1) - SOFA_H;
  const seatGrad  = ctx.createRadialGradient(seatTopCx - 20, seatTopCy - 10, 0, seatTopCx, seatTopCy, 80);
  seatGrad.addColorStop(0, "#E85A22");
  seatGrad.addColorStop(0.55, "#C24818");
  seatGrad.addColorStop(1, "#943010");
  ctx.fillStyle = seatGrad;
  ctx.beginPath();
  ctx.moveTo(isoX(col, row), isoY(col, row) - SOFA_H);
  ctx.lineTo(isoX(col + 2.5, row), isoY(col + 2.5, row) - SOFA_H);
  ctx.lineTo(isoX(col + 2.5, row + 2), isoY(col + 2.5, row + 2) - SOFA_H);
  ctx.lineTo(isoX(col, row + 2), isoY(col, row + 2) - SOFA_H);
  ctx.closePath();
  ctx.fill();

  // Cushion seam lines on seat
  ctx.strokeStyle = "rgba(80,20,0,0.35)";
  ctx.lineWidth = 1.2;
  [0.83, 1.67].forEach((frac) => {
    const lx = isoX(col + frac * 2.5, row);
    const ly = isoY(col + frac * 2.5, row) - SOFA_H;
    const lx2 = isoX(col + frac * 2.5, row + 2);
    const ly2 = isoY(col + frac * 2.5, row + 2) - SOFA_H;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx2, ly2);
    ctx.stroke();
  });

  // Backrest — richer orange, Apple radial gradient
  const backCx  = isoX(col + 1.25, row);
  const backCy  = isoY(col + 1.25, row) - SOFA_H - BACK_H * 0.5;
  const backGrad = ctx.createRadialGradient(backCx - 18, backCy - 12, 0, backCx, backCy, 70);
  backGrad.addColorStop(0, "#D85018");
  backGrad.addColorStop(0.6, "#A83A12");
  backGrad.addColorStop(1, "#7A2808");
  ctx.fillStyle = backGrad;
  ctx.beginPath();
  ctx.moveTo(isoX(col, row), isoY(col, row) - SOFA_H);
  ctx.lineTo(isoX(col + 2.5, row), isoY(col + 2.5, row) - SOFA_H);
  ctx.lineTo(isoX(col + 2.5, row), isoY(col + 2.5, row) - SOFA_H - BACK_H);
  ctx.lineTo(isoX(col, row), isoY(col, row) - SOFA_H - BACK_H);
  ctx.closePath();
  ctx.fill();

  // Backrest specular top edge
  ctx.fillStyle = "rgba(255,200,140,0.09)";
  ctx.beginPath();
  ctx.moveTo(isoX(col, row), isoY(col, row) - SOFA_H - BACK_H);
  ctx.lineTo(isoX(col + 2.5, row), isoY(col + 2.5, row) - SOFA_H - BACK_H);
  ctx.lineTo(isoX(col + 2.5, row), isoY(col + 2.5, row) - SOFA_H - BACK_H + 5);
  ctx.lineTo(isoX(col, row), isoY(col, row) - SOFA_H - BACK_H + 5);
  ctx.closePath();
  ctx.fill();

  // Cushion dividers on backrest
  ctx.strokeStyle = "rgba(80,20,0,0.3)";
  ctx.lineWidth = 1.2;
  [0.83, 1.67].forEach((frac) => {
    const lx = isoX(col + frac * 2.5, row);
    const ly = isoY(col + frac * 2.5, row) - SOFA_H;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx, ly - BACK_H);
    ctx.stroke();
  });

  // Coffee table
  const ctCol = col + 0.5, ctRow = row + 2.2;
  const CT_H = 12;
  ctx.fillStyle = "#1A1208";
  ctx.beginPath();
  ctx.moveTo(isoX(ctCol, ctRow), isoY(ctCol, ctRow));
  ctx.lineTo(isoX(ctCol, ctRow + 1), isoY(ctCol, ctRow + 1));
  ctx.lineTo(isoX(ctCol, ctRow + 1), isoY(ctCol, ctRow + 1) - CT_H);
  ctx.lineTo(isoX(ctCol, ctRow), isoY(ctCol, ctRow) - CT_H);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#221808";
  ctx.beginPath();
  ctx.moveTo(isoX(ctCol, ctRow + 1), isoY(ctCol, ctRow + 1));
  ctx.lineTo(isoX(ctCol + 1.8, ctRow + 1), isoY(ctCol + 1.8, ctRow + 1));
  ctx.lineTo(isoX(ctCol + 1.8, ctRow + 1), isoY(ctCol + 1.8, ctRow + 1) - CT_H);
  ctx.lineTo(isoX(ctCol, ctRow + 1), isoY(ctCol, ctRow + 1) - CT_H);
  ctx.closePath();
  ctx.fill();
  // Coffee table top — dark warm wood
  const ctGrad = ctx.createLinearGradient(isoX(ctCol, ctRow), 0, isoX(ctCol + 1.8, ctRow + 1), 0);
  ctGrad.addColorStop(0, "#3A2810");
  ctGrad.addColorStop(1, "#2A1C0C");
  ctx.fillStyle = ctGrad;
  ctx.beginPath();
  ctx.moveTo(isoX(ctCol, ctRow), isoY(ctCol, ctRow) - CT_H);
  ctx.lineTo(isoX(ctCol + 1.8, ctRow), isoY(ctCol + 1.8, ctRow) - CT_H);
  ctx.lineTo(isoX(ctCol + 1.8, ctRow + 1), isoY(ctCol + 1.8, ctRow + 1) - CT_H);
  ctx.lineTo(isoX(ctCol, ctRow + 1), isoY(ctCol, ctRow + 1) - CT_H);
  ctx.closePath();
  ctx.fill();
  // Table top specular
  ctx.fillStyle = "rgba(255,240,200,0.06)";
  ctx.beginPath();
  ctx.moveTo(isoX(ctCol, ctRow), isoY(ctCol, ctRow) - CT_H);
  ctx.lineTo(isoX(ctCol + 0.9, ctRow), isoY(ctCol + 0.9, ctRow) - CT_H);
  ctx.lineTo(isoX(ctCol + 0.9, ctRow + 0.5), isoY(ctCol + 0.9, ctRow + 0.5) - CT_H);
  ctx.lineTo(isoX(ctCol, ctRow + 0.5), isoY(ctCol, ctRow + 0.5) - CT_H);
  ctx.closePath();
  ctx.fill();
}

function drawCeilingLights(ctx: CanvasRenderingContext2D, t: number): void {
  // Overhead pendant lights creating warm pools on the floor
  const lightPositions: [number, number, string][] = [
    [1.5, 3,   "#FFF0D0"],  // warm white
    [6,   2,   "#D0F0FF"],  // cool white
    [1.5, 7,   "#FFF0D0"],
    [6,   6,   "#D0F0FF"],
    [1.5, 11,  "#FFF0D0"],
    [6,   10,  "#D0F0FF"],
    [11.5,4,   "#E0DDFF"],  // right zone
    [11.5,8,   "#E0DDFF"],
    [16,  4,   "#D0FFEE"],  // meeting room
  ];

  lightPositions.forEach(([lc, lr, lcolor]) => {
    const lx = isoX(lc, lr);
    const ly = isoY(lc, lr);
    const pulse = 1 + Math.sin(t * 0.3 + lc * 2) * 0.04;

    const r = parseInt(lcolor.slice(1, 3), 16);
    const g = parseInt(lcolor.slice(3, 5), 16);
    const b = parseInt(lcolor.slice(5, 7), 16);

    const grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 100 * pulse);
    grad.addColorStop(0,   `rgba(${r},${g},${b},0.18)`);
    grad.addColorStop(0.4, `rgba(${r},${g},${b},0.10)`);
    grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 100 * pulse, 50 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawWallDecor(ctx: CanvasRenderingContext2D): void {
  // Tech-tool posters on the back wall (above desks)
  const posterData = [
    { col: 2,   row: 0, label: "notion", color: "#FFFFFF" },
    { col: 4.5, row: 0, label: "miro",   color: "#FFD02F" },
    { col: 7,   row: 0, label: "asana",  color: "#F06A6A" },
  ];

  // LED strip accent light along top of back wall
  for (let c = 0; c < 10; c++) {
    const lx0 = isoX(c, 0);
    const lx1 = isoX(c + 1, 0);
    const ly0 = isoY(c, 0) - 78;
    const ly1 = isoY(c + 1, 0) - 78;
    const ledGrad = ctx.createLinearGradient(lx0, ly0, lx1, ly1);
    ledGrad.addColorStop(0, `rgba(120, 60, 255, ${0.15 + (c % 3) * 0.05})`);
    ledGrad.addColorStop(0.5, `rgba(60, 150, 255, ${0.10 + (c % 2) * 0.06})`);
    ledGrad.addColorStop(1, `rgba(120, 60, 255, ${0.12 + (c % 3) * 0.04})`);
    ctx.fillStyle = ledGrad;
    ctx.fillRect(lx0 - 1, ly0 - 3, lx1 - lx0 + 2, 4);
  }

  // Pendant lamp fixtures (isometric pendant lights above each zone)
  const lampZones = [
    { col: 2, row: 3 }, { col: 7, row: 2 },
    { col: 2, row: 7 }, { col: 7, row: 6 },
    { col: 2, row: 11 }, { col: 7, row: 10 },
    { col: 12, row: 4 }, { col: 12, row: 8 },
  ];
  lampZones.forEach(({ col, row }) => {
    const lx = isoX(col, row);
    const ly = isoY(col, row) - 90;
    // Lamp cord
    ctx.strokeStyle = "#2A2018";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx, ly - 20);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    // Lamp shade (isometric cone shape)
    ctx.fillStyle = "#C8A840";
    ctx.beginPath();
    ctx.moveTo(lx - 12, ly);
    ctx.lineTo(lx + 12, ly);
    ctx.lineTo(lx + 8, ly + 10);
    ctx.lineTo(lx - 8, ly + 10);
    ctx.closePath();
    ctx.fill();
    // Lamp bottom glow
    ctx.fillStyle = "rgba(255, 220, 100, 0.85)";
    ctx.beginPath();
    ctx.ellipse(lx, ly + 10, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Lamp outer rim
    ctx.strokeStyle = "#8A7020";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx - 12, ly);
    ctx.lineTo(lx + 12, ly);
    ctx.stroke();
  });

  posterData.forEach(({ col, row, label, color }) => {
    const px = isoX(col, row) - 16;
    const py = isoY(col, row) - 98;

    // Poster outer frame — warm wood
    ctx.fillStyle = "#3A2810";
    ctx.beginPath();
    ctx.roundRect(px - 3, py - 3, 34, 26, 4);
    ctx.fill();

    // Poster bg — dark with gradient
    const posterBg = ctx.createLinearGradient(px, py, px + 28, py + 20);
    posterBg.addColorStop(0, "#12101E");
    posterBg.addColorStop(1, "#0C0C18");
    ctx.fillStyle = posterBg;
    ctx.beginPath();
    ctx.roundRect(px, py, 28, 20, 2);
    ctx.fill();

    // Top color bar
    ctx.fillStyle = color + "AA";
    ctx.beginPath();
    ctx.roundRect(px, py, 28, 5, [2, 2, 0, 0]);
    ctx.fill();

    // Tool icon circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px + 6, py + 13, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 6.5px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(label.toUpperCase(), px + 13, py + 16);
  });

  // Whiteboard on back wall
  {
    const wbx = isoX(3.2, 0) - 35;
    const wby = isoY(3.2, 0) - 120;
    // Frame
    ctx.fillStyle = "#3A2A16";
    ctx.beginPath();
    ctx.roundRect(wbx - 3, wby - 3, 70, 44, 4);
    ctx.fill();
    // White surface
    ctx.fillStyle = "#E8ECF0";
    ctx.beginPath();
    ctx.roundRect(wbx, wby, 64, 38, 2);
    ctx.fill();
    // Colorful diagram lines on whiteboard
    const wbLines = [
      { color: "#FF4757", x1: wbx + 5, y1: wby + 10, x2: wbx + 32, y2: wby + 10 },
      { color: "#00D4FF", x1: wbx + 5, y1: wby + 18, x2: wbx + 50, y2: wby + 18 },
      { color: "#00E5A0", x1: wbx + 5, y1: wby + 26, x2: wbx + 40, y2: wby + 26 },
    ];
    wbLines.forEach(({ color, x1, y1, x2, y2 }) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    // Circle node
    ctx.fillStyle = "#7B61FF";
    ctx.beginPath();
    ctx.arc(wbx + 55, wby + 14, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 6px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("!", wbx + 55, wby + 17);
    // Tray
    ctx.fillStyle = "#2A1E10";
    ctx.beginPath();
    ctx.roundRect(wbx, wby + 38, 64, 5, [0, 0, 2, 2]);
    ctx.fill();
  }
}

// ─── Color Utilities (Apple Emoji Pipeline) ──────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const len = h.length === 3 ? 1 : 2;
  const r = parseInt(h.substring(0, len), 16) * (len === 1 ? 17 : 1);
  const g = parseInt(h.substring(len, len * 2), 16) * (len === 1 ? 17 : 1);
  const b = parseInt(h.substring(len * 2, len * 3), 16) * (len === 1 ? 17 : 1);
  return [r, g, b];
}

function blendHex(hex1: string, hex2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hex1.length >= 7 ? hex1 : "#808080");
  const [r2, g2, b2] = hexToRgb(hex2.length >= 7 ? hex2 : "#808080");
  const r = Math.round(r1 + (r2 - r1) * t).toString(16).padStart(2, "0");
  const g = Math.round(g1 + (g2 - g1) * t).toString(16).padStart(2, "0");
  const b2s = Math.round(b1 + (b2 - b1) * t).toString(16).padStart(2, "0");
  return `#${r}${g}${b2s}`;
}

function appleGrad(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, rx: number, ry: number,
  base: string, highlight: string
): CanvasGradient {
  const g = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.4, 0, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, highlight);
  g.addColorStop(0.62, base);
  g.addColorStop(1, blendHex(base, "#1A1410", 0.2));
  return g;
}

// ─── Sims-Style Hair (Apple Emoji Rendering) ──────────────────────────────────

function drawSimsHair(
  ctx: CanvasRenderingContext2D,
  style: AgentConfig["hairStyle"],
  headY: number,
  headR: number,
  color: string,
  layer: "back" | "front"
): void {
  const hl  = blendHex(color, "#FFF4E0", 0.22);
  const shd = blendHex(color, "#1A1410", 0.3);

  if (style === "short") {
    if (layer === "front") {
      ctx.fillStyle = appleGrad(ctx, 0, headY - headR, headR, headR * 0.6, color, hl);
      ctx.beginPath();
      ctx.arc(0, headY, headR, Math.PI * 1.05, 0);
      ctx.arc(0, headY - headR * 0.3, headR, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
    }

  } else if (style === "long") {
    if (layer === "back") {
      const g = ctx.createLinearGradient(0, headY - headR, 0, headY + headR * 3.2);
      g.addColorStop(0, color);
      g.addColorStop(1, shd);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, headY + headR * 1.6, headR * 0.9, headR * 2.1, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = appleGrad(ctx, 0, headY - headR, headR, headR * 0.5, color, hl);
      ctx.beginPath();
      ctx.arc(0, headY, headR, Math.PI * 1.05, 0);
      ctx.arc(0, headY - headR * 0.2, headR, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(-headR * 0.88, headY + headR * 0.6, headR * 0.24, headR * 0.65, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(headR * 0.88, headY + headR * 0.6, headR * 0.24, headR * 0.65, 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (style === "curly") {
    if (layer === "back") {
      ctx.fillStyle = color;
      for (const dx of [-headR * 0.48, headR * 0.48]) {
        ctx.beginPath();
        ctx.arc(dx, headY + headR * 0.35, headR * 0.52, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = appleGrad(ctx, 0, headY - headR, headR * 1.1, headR * 0.8, color, hl);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI - Math.PI * 0.1;
        const bx = Math.cos(a) * headR * 0.78;
        const by2 = headY - Math.abs(Math.sin(a)) * headR * 0.65 - headR * 0.42;
        ctx.beginPath();
        ctx.arc(bx, by2, headR * 0.44, 0, Math.PI * 2);
        ctx.fill();
      }
    }

  } else if (style === "bun") {
    if (layer === "front") {
      ctx.fillStyle = appleGrad(ctx, 0, headY - headR, headR, headR * 0.5, color, hl);
      ctx.beginPath();
      ctx.arc(0, headY, headR, Math.PI * 1.05, 0);
      ctx.arc(0, headY - headR * 0.25, headR * 0.95, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = appleGrad(ctx, 0, headY - headR * 1.5, headR * 0.6, headR * 0.55, color, hl);
      ctx.beginPath();
      ctx.arc(0, headY - headR * 1.36, headR * 0.52, 0, Math.PI * 2);
      ctx.fill();
    }

  } else {
    // spiky
    if (layer === "front") {
      const sg = appleGrad(ctx, 0, headY - headR, headR, headR * 0.5, color, hl);
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(0, headY, headR, Math.PI * 1.1, 0);
      ctx.arc(0, headY - headR * 0.2, headR, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        const sx = (-1.5 + i) * headR * 0.45;
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.moveTo(sx - headR * 0.18, headY - headR * 0.55);
        ctx.lineTo(sx + headR * 0.18, headY - headR * 0.55);
        ctx.lineTo(sx + (i % 2 === 0 ? headR * 0.08 : -headR * 0.08), headY - headR * 1.3);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

// ─── Sims-Style Avatar (Sims proportions + Apple Emoji rendering) ─────────────

function drawSimsAvatar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  agent: Agent,
  cfg: AgentConfig,
  hovered: boolean,
  selected: boolean
): void {
  ctx.save();
  ctx.translate(cx, cy);

  const isOffline = agent.status === "offline";
  const breathe   = isOffline ? 0 : Math.sin(t * 1.4) * 0.9;

  // ── Contact shadow ──
  const shGrad = ctx.createRadialGradient(0, 8, 0, 0, 8, 20);
  shGrad.addColorStop(0, "rgba(0,0,0,0.42)");
  shGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shGrad;
  ctx.beginPath();
  ctx.ellipse(0, 8, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Selection halo ──
  if (hovered || selected) {
    ctx.save();
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur  = selected ? 26 : 11;
    ctx.strokeStyle = cfg.color + (selected ? "AA" : "44");
    ctx.lineWidth   = selected ? 2 : 1.4;
    ctx.beginPath();
    ctx.arc(0, -32, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Chair ──
  ctx.fillStyle = appleGrad(ctx, 0, -8, 15, 9, "#201A38", "#2E2848");
  ctx.beginPath();
  ctx.roundRect(-13, -4, 26, 14, 3);
  ctx.fill();
  ctx.fillStyle = appleGrad(ctx, 0, -18, 12, 10, "#1C1630", "#2A2244");
  ctx.beginPath();
  ctx.roundRect(-11, -22, 22, 18, 3);
  ctx.fill();
  ctx.fillStyle = "rgba(255,252,245,0.04)";
  ctx.beginPath();
  ctx.roundRect(-11, -22, 22, 4, [3, 3, 0, 0]);
  ctx.fill();

  // ── Legs (Sims proportions — longer, thinner) ──
  const pantsHL = blendHex(cfg.pants, "#FFF4E0", 0.12);
  ctx.fillStyle = appleGrad(ctx, -6, -8, 6, 13, cfg.pants, pantsHL);
  ctx.beginPath();
  ctx.roundRect(-10, -8, 8, 17, 3);
  ctx.fill();
  ctx.fillStyle = appleGrad(ctx, 6, -8, 6, 13, cfg.pants, pantsHL);
  ctx.beginPath();
  ctx.roundRect(2, -8, 8, 17, 3);
  ctx.fill();

  // Shoes — Apple radial gradient, no outline
  const mkShoeGrad = (ox: number) => {
    const g = ctx.createRadialGradient(ox, 6, 0, ox, 8, 9);
    g.addColorStop(0, "#2E2E36");
    g.addColorStop(1, "#080810");
    return g;
  };
  ctx.fillStyle = mkShoeGrad(-5);
  ctx.beginPath();
  ctx.ellipse(-5, 9, 7, 3, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = mkShoeGrad(5);
  ctx.beginPath();
  ctx.ellipse(5, 9, 7, 3, 0.12, 0, Math.PI * 2);
  ctx.fill();

  // ── Body (breathes) ──
  ctx.save();
  ctx.translate(0, breathe);

  const shirtHL = blendHex(cfg.shirt, "#FFF4E0", 0.18);
  ctx.fillStyle  = appleGrad(ctx, -3, -34, 14, 20, cfg.shirt, shirtHL);
  ctx.beginPath();
  ctx.roundRect(-13, -48, 26, 40, [8, 8, 4, 4]);
  ctx.fill();

  // Dept collar accent
  ctx.fillStyle = cfg.color + "55";
  ctx.beginPath();
  ctx.roundRect(-13, -48, 26, 8, [8, 8, 0, 0]);
  ctx.fill();

  // Arms
  const skinHL = blendHex(cfg.skin, "#FFF4E0", 0.24);
  ctx.save();
  ctx.rotate(isOffline ? 0 : Math.sin(t * 3.1) * 0.05);
  ctx.fillStyle = appleGrad(ctx, -20, -38, 7, 6, cfg.skin, skinHL);
  ctx.beginPath();
  ctx.roundRect(-27, -43, 14, 9, 4);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.rotate(isOffline ? 0 : Math.sin(t * 3.1 + 1.2) * 0.05);
  ctx.fillStyle = appleGrad(ctx, 20, -38, 7, 6, cfg.skin, skinHL);
  ctx.beginPath();
  ctx.roundRect(13, -43, 14, 9, 4);
  ctx.fill();
  ctx.restore();

  ctx.restore(); // breathe

  // ── Neck ──
  ctx.fillStyle = appleGrad(ctx, 0, -52, 5, 7, cfg.skin, skinHL);
  ctx.beginPath();
  ctx.roundRect(-4, -58, 8, 10, 3);
  ctx.fill();

  // ── Head (Sims proportions: r=14, vs chibi r=26) ──
  const headY = -76;
  const headR = 14;

  ctx.save();
  if (isOffline) {
    ctx.rotate(0.18);
    ctx.translate(4, 4);
  } else {
    ctx.rotate(Math.sin(t * 0.4) * 0.03);
  }

  // Hair back layer
  drawSimsHair(ctx, cfg.hairStyle, headY, headR, cfg.hair, "back");

  // Skin — multi-stop radial gradient (Apple emoji style)
  const skinBG = blendHex(cfg.skin, "#1A1410", 0.2);
  const skinG  = ctx.createRadialGradient(-headR * 0.28, headY - headR * 0.32, 0, 0, headY, headR * 1.12);
  skinG.addColorStop(0, blendHex(cfg.skin, "#FFF4E0", 0.3));
  skinG.addColorStop(0.5, cfg.skin);
  skinG.addColorStop(1, skinBG);
  ctx.fillStyle = skinG;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight (screen-blend style)
  const specG = ctx.createRadialGradient(-headR * 0.3, headY - headR * 0.45, 0, -headR * 0.15, headY - headR * 0.25, headR * 0.7);
  specG.addColorStop(0, "rgba(255,252,245,0.26)");
  specG.addColorStop(0.5, "rgba(255,252,245,0.07)");
  specG.addColorStop(1, "rgba(255,252,245,0)");
  ctx.fillStyle = specG;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Hair front layer
  drawSimsHair(ctx, cfg.hairStyle, headY, headR, cfg.hair, "front");

  if (!isOffline) {
    const eyeY = headY + 2;

    // Left eye — realistic, no anime outlines
    ctx.fillStyle = "#080808";
    ctx.beginPath();
    ctx.ellipse(-5, eyeY, 3.2, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    const irisGL = ctx.createRadialGradient(-5, eyeY - 0.4, 0, -5, eyeY, 2.6);
    irisGL.addColorStop(0, blendHex(cfg.irisColor, "#FFF4E0", 0.28));
    irisGL.addColorStop(1, cfg.irisColor);
    ctx.fillStyle = irisGL;
    ctx.beginPath();
    ctx.ellipse(-5, eyeY, 2.3, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.beginPath();
    ctx.ellipse(-6, eyeY - 1.1, 0.9, 0.7, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.fillStyle = "#080808";
    ctx.beginPath();
    ctx.ellipse(5, eyeY, 3.2, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    const irisGR = ctx.createRadialGradient(5, eyeY - 0.4, 0, 5, eyeY, 2.6);
    irisGR.addColorStop(0, blendHex(cfg.irisColor, "#FFF4E0", 0.28));
    irisGR.addColorStop(1, cfg.irisColor);
    ctx.fillStyle = irisGR;
    ctx.beginPath();
    ctx.ellipse(5, eyeY, 2.3, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.beginPath();
    ctx.ellipse(4, eyeY - 1.1, 0.9, 0.7, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Nose — subtle shadow, no shape
    ctx.fillStyle = blendHex(cfg.skin, "#1A1410", 0.32) + "88";
    ctx.beginPath();
    ctx.arc(0, headY + 5, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Mouth — small, natural smile
    ctx.strokeStyle = blendHex(cfg.skin, "#1A1410", 0.38) + "CC";
    ctx.lineWidth  = 1.3;
    ctx.lineCap    = "round";
    ctx.beginPath();
    ctx.moveTo(-3.5, headY + 9);
    ctx.quadraticCurveTo(0, headY + 11.2, 3.5, headY + 9);
    ctx.stroke();

  } else {
    // Sleeping — closed eyes
    ctx.strokeStyle = cfg.hair + "CC";
    ctx.lineWidth  = 1.7;
    ctx.lineCap    = "round";
    ctx.beginPath();
    ctx.moveTo(-7, headY + 1.5);
    ctx.quadraticCurveTo(-4.5, headY - 1.5, -2, headY + 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, headY + 1.5);
    ctx.quadraticCurveTo(4.5, headY - 1.5, 7, headY + 1.5);
    ctx.stroke();
    ctx.fillStyle = "rgba(111,91,255,0.5)";
    ctx.font       = "bold 8px sans-serif";
    ctx.textAlign  = "left";
    ctx.fillText("z", headR + 1, headY - 14);
    ctx.font       = "bold 6px sans-serif";
    ctx.fillText("z", headR + 6, headY - 22);
  }

  ctx.restore(); // head rotation

  // ── Status dot ──
  const statusColors: Record<string, string> = {
    online:  "#34D399",
    busy:    "#C99647",
    offline: "#4A4A5A",
    error:   "#E05A6B",
  };
  const sColor = statusColors[agent.status] ?? "#4A4A5A";
  const dotY   = headY - headR - 9;

  if (agent.status === "online") {
    const pulse  = (Math.sin(t * 2.8) + 1) * 0.5;
    ctx.strokeStyle  = sColor;
    ctx.lineWidth    = 1.2;
    ctx.globalAlpha  = 0.55 * (1 - pulse);
    ctx.beginPath();
    ctx.arc(0, dotY, 5 + pulse * 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha  = 1;
  }

  const dotG = ctx.createRadialGradient(-1.5, dotY - 1.5, 0, 0, dotY, 4.5);
  dotG.addColorStop(0, blendHex(sColor, "#FFF4E0", 0.38));
  dotG.addColorStop(1, sColor);
  ctx.fillStyle = dotG;
  ctx.beginPath();
  ctx.arc(0, dotY, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // ── Name label ──
  ctx.fillStyle   = cfg.color + "22";
  ctx.strokeStyle = cfg.color + "66";
  ctx.lineWidth   = 0.8;
  ctx.beginPath();
  ctx.roundRect(-28, 14, 56, 14, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle  = cfg.color + "EE";
  ctx.font       = 'bold 7.5px "JetBrains Mono", monospace';
  ctx.textAlign  = "center";
  ctx.fillText(agent.name.toUpperCase(), 0, 25);

  ctx.restore();
}

// ─── CHIBI STUBS REMOVED — replaced above with drawSimsAvatar ────────────────

function drawChibiHairBack(
  ctx: CanvasRenderingContext2D,
  style: string,
  headY: number,
  r: number,
  hairColor: string
): void {
  ctx.fillStyle = hairColor;
  switch (style) {
    case "short":
      ctx.beginPath();
      ctx.arc(0, headY, r + 3, Math.PI * 0.85, 0.15 * Math.PI);
      ctx.lineTo(r + 3, headY + 6);
      ctx.lineTo(-r - 3, headY + 6);
      ctx.closePath();
      ctx.fill();
      break;

    case "long":
      ctx.beginPath();
      ctx.arc(0, headY, r + 3, Math.PI * 0.8, 0.2 * Math.PI);
      ctx.fill();
      // Long side strands
      ctx.beginPath();
      ctx.roundRect(-r - 10, headY - 4, 13, 68, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(r - 3, headY - 4, 13, 65, 7);
      ctx.fill();
      break;

    case "curly":
      ctx.beginPath();
      ctx.arc(0, headY, r + 5, Math.PI, 0);
      ctx.fill();
      break;

    case "bun":
      ctx.beginPath();
      ctx.arc(0, headY, r + 2, Math.PI * 0.9, 0.1 * Math.PI);
      ctx.fill();
      // Bun circle
      ctx.beginPath();
      ctx.arc(0, headY - r - 11, 13, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "spiky":
      ctx.beginPath();
      ctx.arc(0, headY, r + 2, Math.PI, 0);
      ctx.fill();
      break;
  }
}

function drawChibiHairFront(
  ctx: CanvasRenderingContext2D,
  style: string,
  headY: number,
  r: number,
  hairColor: string
): void {
  ctx.fillStyle = hairColor;
  switch (style) {
    case "short":
      ctx.beginPath();
      ctx.arc(0, headY, r, Math.PI, 0);
      ctx.fill();
      // Side bangs
      ctx.beginPath();
      ctx.roundRect(-r - 2, headY - 6, 11, 14, 4);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(r - 9, headY - 6, 11, 12, 4);
      ctx.fill();
      break;

    case "long":
      ctx.beginPath();
      ctx.arc(0, headY, r, Math.PI * 1.05, -0.05 * Math.PI);
      ctx.fill();
      // Front face-framing strands
      ctx.beginPath();
      ctx.roundRect(-r - 2, headY - 10, 13, 22, 5);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(r - 11, headY - 10, 13, 20, 5);
      ctx.fill();
      break;

    case "curly":
      // Curl blobs along forehead
      [-13, -5, 4, 12].forEach((bx, i) => {
        ctx.beginPath();
        ctx.arc(bx, headY - r + 2 + (i % 2 === 0 ? 0 : 4), 6.5, 0, Math.PI * 2);
        ctx.fill();
      });
      break;

    case "bun":
      ctx.beginPath();
      ctx.arc(0, headY, r, Math.PI, 0);
      ctx.fill();
      // Straight fringe
      ctx.beginPath();
      ctx.roundRect(-r, headY - 4, r * 2, 13, [0, 0, 6, 6]);
      ctx.fill();
      // Bun connector
      ctx.beginPath();
      ctx.roundRect(-4, headY - r - 5, 8, 9, 2);
      ctx.fill();
      break;

    case "spiky":
      // Spikes along top
      const spikes: [number, number][] = [[-14, -10], [-7, -17], [0, -20], [7, -17], [14, -10]];
      spikes.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(sx - 5, headY + sy + 16);
        ctx.lineTo(sx, headY + sy);
        ctx.lineTo(sx + 5, headY + sy + 16);
        ctx.closePath();
        ctx.fill();
      });
      ctx.beginPath();
      ctx.arc(0, headY, r, Math.PI * 1.05, -0.05 * Math.PI);
      ctx.fill();
      break;
  }
}

function drawAnimeEye(
  ctx: CanvasRenderingContext2D,
  ex: number,
  ey: number,
  irisColor: string
): void {
  const EW = 7, EH = 9;

  // Outer border
  ctx.fillStyle = "#05050F";
  ctx.beginPath();
  ctx.ellipse(ex, ey, EW + 1.5, EH + 1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye white (slightly blue-tinted for anime)
  ctx.fillStyle = "#E6EAF6";
  ctx.beginPath();
  ctx.ellipse(ex, ey, EW, EH, 0, 0, Math.PI * 2);
  ctx.fill();

  // Iris gradient
  const irisGrad = ctx.createRadialGradient(ex - 1, ey - 2, 1, ex, ey, 6);
  irisGrad.addColorStop(0, irisColor);
  irisGrad.addColorStop(0.65, irisColor + "CC");
  irisGrad.addColorStop(1, irisColor + "88");
  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.ellipse(ex, ey, 5.5, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  ctx.fillStyle = "#030310";
  ctx.beginPath();
  ctx.ellipse(ex, ey + 1, 2.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bottom iris shadow
  const iShadow = ctx.createLinearGradient(ex, ey - EH, ex, ey + EH);
  iShadow.addColorStop(0, "rgba(0,0,0,0)");
  iShadow.addColorStop(0.55, "rgba(0,0,0,0)");
  iShadow.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = iShadow;
  ctx.beginPath();
  ctx.ellipse(ex, ey, EW, EH, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main highlight — large oval top-left
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.ellipse(ex - 2.5, ey - 3.5, 2.8, 2.2, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Secondary highlight — small dot
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(ex + 2.5, ey + 1.5, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Top lash (thick arc)
  ctx.strokeStyle = "#05050F";
  ctx.lineWidth = 2.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ex - EW - 1, ey - 2);
  ctx.quadraticCurveTo(ex, ey - EH - 4, ex + EW + 1, ey - 2);
  ctx.stroke();

  // Bottom lash (thin arc)
  ctx.strokeStyle = "#10101E";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ex - EW + 1, ey + EH - 2);
  ctx.quadraticCurveTo(ex, ey + EH + 1, ex + EW - 1, ey + EH - 2);
  ctx.stroke();
}

function drawChibiAvatar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  agent: Agent,
  cfg: AgentConfig,
  hovered: boolean,
  selected: boolean
): void {
  ctx.save();
  ctx.translate(cx, cy);

  // Floor shadow
  ctx.fillStyle = "rgba(0,0,0,0.40)";
  ctx.beginPath();
  ctx.ellipse(0, 10, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hover / select glow halo
  if (hovered || selected) {
    ctx.save();
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = selected ? 30 : 14;
    ctx.strokeStyle = cfg.color + (selected ? "AA" : "55");
    ctx.lineWidth = selected ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(0, -40, 38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const isOffline = agent.status === "offline";
  const breathe = isOffline ? 0 : Math.sin(t * 1.5) * 1.4;

  // ── CHAIR (behind avatar) ──
  ctx.fillStyle = "#14142A";
  ctx.beginPath();
  ctx.roundRect(-14, -8, 28, 18, 4);
  ctx.fill();
  // Chair backrest
  ctx.fillStyle = "#1E1E3A";
  ctx.beginPath();
  ctx.roundRect(-12, -26, 24, 20, 3);
  ctx.fill();
  // Backrest highlight
  ctx.fillStyle = "rgba(255,255,255,0.035)";
  ctx.beginPath();
  ctx.roundRect(-12, -26, 24, 5, [3, 3, 0, 0]);
  ctx.fill();

  // ── LEGS ──
  ctx.fillStyle = cfg.pants;
  // Left leg
  ctx.beginPath();
  ctx.roundRect(-11, -10, 9, 18, 3);
  ctx.fill();
  // Right leg
  ctx.beginPath();
  ctx.roundRect(2, -10, 9, 18, 3);
  ctx.fill();
  // Shoes
  ctx.fillStyle = "#080810";
  ctx.beginPath();
  ctx.ellipse(-6, 9, 7, 3.5, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(6, 9, 7, 3.5, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // ── BODY (breathes) ──
  ctx.save();
  ctx.translate(0, breathe);

  // Torso
  ctx.fillStyle = cfg.shirt;
  ctx.beginPath();
  ctx.roundRect(-12, -27, 24, 21, 5);
  ctx.fill();

  // Dept collar stripe
  ctx.fillStyle = cfg.color + "55";
  ctx.beginPath();
  ctx.roundRect(-12, -27, 24, 6, [5, 5, 0, 0]);
  ctx.fill();

  // Shirt highlight
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.roundRect(-10, -25, 11, 15, 3);
  ctx.fill();

  // Left arm (extended toward keyboard, slight typing motion)
  ctx.fillStyle = cfg.skin;
  const lArmRot = isOffline ? 0 : Math.sin(t * 3.2) * 0.06;
  ctx.save();
  ctx.rotate(lArmRot);
  ctx.beginPath();
  ctx.roundRect(-24, -22, 13, 8, 4);
  ctx.fill();
  ctx.restore();

  // Right arm
  const rArmRot = isOffline ? 0 : Math.sin(t * 3.2 + 1.2) * 0.06;
  ctx.save();
  ctx.rotate(rArmRot);
  ctx.beginPath();
  ctx.roundRect(11, -22, 13, 8, 4);
  ctx.fill();
  ctx.restore();

  ctx.restore(); // end breathe

  // ── NECK ──
  ctx.fillStyle = cfg.skin;
  ctx.beginPath();
  ctx.roundRect(-4, -32, 8, 9, 3);
  ctx.fill();

  // ── HEAD (r = 26, chibi proportions) ──
  const headY = -62;
  const headR = 26;

  ctx.save();
  if (isOffline) {
    ctx.rotate(0.22);
    ctx.translate(5, 6);
  } else {
    ctx.rotate(Math.sin(t * 0.45) * 0.04);
  }

  // Head shadow on body
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(2, headY + 27, 17, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair back
  drawChibiHairBack(ctx, cfg.hairStyle, headY, headR, cfg.hair);

  // Skin base
  ctx.fillStyle = cfg.skin;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Head highlight
  const headHL = ctx.createRadialGradient(-7, headY - 11, 2, 0, headY, headR);
  headHL.addColorStop(0, "rgba(255,255,255,0.20)");
  headHL.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = headHL;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Hair front (drawn over skin)
  drawChibiHairFront(ctx, cfg.hairStyle, headY, headR, cfg.hair);

  if (!isOffline) {
    // Eyes
    const eyeY = headY + 2;
    const eyeLX = -8, eyeRX = 8;

    // Eyebrows
    ctx.strokeStyle = cfg.hair;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(eyeLX - 7, eyeY - 12);
    ctx.quadraticCurveTo(eyeLX, eyeY - 17, eyeLX + 7, eyeY - 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(eyeRX - 7, eyeY - 12);
    ctx.quadraticCurveTo(eyeRX, eyeY - 17, eyeRX + 7, eyeY - 12);
    ctx.stroke();

    drawAnimeEye(ctx, eyeLX, eyeY, cfg.irisColor);
    drawAnimeEye(ctx, eyeRX, eyeY, cfg.irisColor);

    // Nose
    ctx.fillStyle = cfg.skin + "BB";
    ctx.beginPath();
    ctx.arc(0, headY + 10, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = cfg.skin + "85";
    ctx.lineWidth = 1.9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-5, headY + 15);
    ctx.quadraticCurveTo(0, headY + 19, 5, headY + 15);
    ctx.stroke();

    // Blush
    ctx.fillStyle = "#FF7070";
    ctx.globalAlpha = 0.20;
    ctx.beginPath();
    ctx.ellipse(-14, headY + 9, 6.5, 4.5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(14, headY + 9, 6.5, 4.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    // Sleeping eyes
    ctx.strokeStyle = cfg.hair;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-14, headY + 4);
    ctx.quadraticCurveTo(-8, headY + 0, -2, headY + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, headY + 4);
    ctx.quadraticCurveTo(8, headY + 0, 14, headY + 4);
    ctx.stroke();

    // Zzz
    ctx.fillStyle = "#4A5570";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("z", headR + 2, headY - 22);
    ctx.font = "bold 7px sans-serif";
    ctx.fillText("z", headR + 8, headY - 32);
  }

  ctx.restore(); // head rotation

  // ── STATUS INDICATOR ──
  const statusColors: Record<string, string> = {
    online: "#00E5A0",
    busy:   "#FFB800",
    offline:"#4A5570",
    error:  "#FF4757",
  };
  const sColor = statusColors[agent.status] ?? "#4A5570";
  const dotY = -56 - 22 - 12;

  if (agent.status === "online") {
    const pulse = (Math.sin(t * 2.8) + 1) * 0.5;
    ctx.strokeStyle = sColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 1 - pulse;
    ctx.beginPath();
    ctx.arc(0, dotY, 8 + pulse * 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = sColor;
  ctx.shadowColor = sColor;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, dotY, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── NAME LABEL — dept-colored pill ──
  ctx.fillStyle = cfg.color + "28";
  ctx.strokeStyle = cfg.color + "88";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-30, 16, 60, 16, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = cfg.color + "EE";
  ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
  ctx.textAlign = "center";
  ctx.fillText(agent.name.toUpperCase(), 0, 28);

  ctx.restore();
}

function drawActivityBubble(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  agent: Agent,
  t: number
): void {
  if (agent.status === "offline") return;

  const phrases = ACTIVITY_PHRASES[agent.id] ?? ["Working..."];
  const idx = Math.floor(t / 5) % phrases.length;
  const text = phrases[idx];

  const bubbleX = cx + 30;
  const bubbleY = cy - 105;
  const pad = 8;

  ctx.font = '10px "JetBrains Mono", monospace';
  const tw = ctx.measureText(text).width;
  const bw = tw + pad * 2;
  const bh = 20;

  // Bubble background
  ctx.fillStyle = "rgba(8,12,28,0.92)";
  ctx.strokeStyle = (AGENT_CONFIG[agent.id]?.color ?? "#FFFFFF") + "80";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bubbleX, bubbleY, bw, bh, 4);
  ctx.fill();
  ctx.stroke();

  // Tail
  ctx.fillStyle = "rgba(8,12,28,0.92)";
  ctx.beginPath();
  ctx.moveTo(bubbleX, bubbleY + 8);
  ctx.lineTo(bubbleX - 7, bubbleY + 12);
  ctx.lineTo(bubbleX, bubbleY + 16);
  ctx.closePath();
  ctx.fill();

  // Text
  ctx.fillStyle = "#8898BB";
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = "left";
  ctx.fillText(text, bubbleX + pad, bubbleY + 13);
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  t: number,
  agents: Agent[],
  hoveredId: string | null,
  selectedId: string | null,
  hitboxes: Map<string, { x: number; y: number; r: number }>
): void {
  const W = 1500, H = 800;

  // 1. Exterior (sky, trees, buildings)
  drawExterior(ctx);

  // 2. Floor tiles
  drawAllFloorTiles(ctx);

  // 2b. Interior ambient — warm overhead room light pools
  const roomLights: [number, number, number, number, number, number, number][] = [
    // cx, cy, rx, ry, r, g, b
    [isoX(3, 3),  isoY(3, 3),  160, 80,  255, 220, 160],
    [isoX(8, 2),  isoY(8, 2),  140, 70,  200, 220, 255],
    [isoX(2, 8),  isoY(2, 8),  140, 70,  255, 200, 180],
    [isoX(7, 7),  isoY(7, 7),  150, 75,  200, 180, 255],
    [isoX(2, 12), isoY(2, 12), 130, 65,  255, 230, 160],
    [isoX(7, 11), isoY(7, 11), 130, 65,  180, 220, 255],
    [isoX(12, 4), isoY(12, 4), 120, 60,  220, 180, 255],
    [isoX(12, 8), isoY(12, 8), 120, 60,  180, 255, 220],
  ];
  roomLights.forEach(([lx, ly, rx, ry, r, g, b]) => {
    const grad = ctx.createRadialGradient(lx, ly - 10, 0, lx, ly, rx);
    grad.addColorStop(0,   `rgba(${r},${g},${b},0.15)`);
    grad.addColorStop(0.6, `rgba(${r},${g},${b},0.07)`);
    grad.addColorStop(1,   "rgba(0,0,0,0)");
    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(lx, ly, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 2c. Floor polish — specular shine on light hardwood (more visible now that floor is lighter)
  const floorShine = ctx.createLinearGradient(isoX(0, 7), isoY(0, 7), isoX(10, 0), isoY(10, 0));
  floorShine.addColorStop(0, "rgba(255, 240, 200, 0)");
  floorShine.addColorStop(0.4, "rgba(255, 240, 200, 0.09)");
  floorShine.addColorStop(0.6, "rgba(255, 255, 240, 0.06)");
  floorShine.addColorStop(1, "rgba(255, 240, 200, 0)");
  ctx.save();
  ctx.fillStyle = floorShine;
  // Cover main floor area
  ctx.beginPath();
  ctx.moveTo(isoX(0, 0), isoY(0, 0));
  ctx.lineTo(isoX(14, 0), isoY(14, 0));
  ctx.lineTo(isoX(14, 14), isoY(14, 14));
  ctx.lineTo(isoX(0, 14), isoY(0, 14));
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. Zone carpets per agent — signature colored zones (Sowork-style)
  agents.forEach((agent) => {
    const pos = DESK_POSITIONS[agent.id];
    if (!pos) return;
    const cfg = AGENT_CONFIG[agent.id];
    if (!cfg) return;
    drawZoneHighlight(ctx, pos.col, pos.row, cfg.color, agent.id === selectedId);
  });

  // 3b. Ambient overhead light cones per desk zone
  agents.forEach((agent) => {
    const pos = DESK_POSITIONS[agent.id];
    if (!pos) return;
    const cfg = AGENT_CONFIG[agent.id];
    if (!cfg) return;
    if (agent.status === "offline") return;
    const cx = isoX(pos.col + 1, pos.row + 0.5);
    const cy = isoY(pos.col + 1, pos.row + 0.5);
    const lightGrad = ctx.createRadialGradient(cx, cy - 30, 0, cx, cy, 80);
    lightGrad.addColorStop(0, cfg.color + "18");
    lightGrad.addColorStop(0.5, cfg.color + "08");
    lightGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.fillStyle = lightGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 80, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 3c. Ceiling light pools on the floor
  drawCeilingLights(ctx, t);

  // 4. Walls with windows
  drawWalls(ctx, t);

  // 5. Wall decor (posters + LED strip)
  drawWallDecor(ctx);

  // 5b. Lounge area rug — purple/violet under the sofa
  {
    const lc0 = 9.6, lr0 = 9.8, lc1 = 13.2, lr1 = 13.8;
    const loungeRugPts = [
      { x: isoX(lc0, lr0), y: isoY(lc0, lr0) },
      { x: isoX(lc1, lr0), y: isoY(lc1, lr0) },
      { x: isoX(lc1, lr1), y: isoY(lc1, lr1) },
      { x: isoX(lc0, lr1), y: isoY(lc0, lr1) },
    ];
    ctx.save();
    ctx.beginPath();
    loungeRugPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = "rgba(100, 60, 180, 0.42)";
    ctx.fill();
    ctx.strokeStyle = "rgba(160, 100, 255, 0.80)";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Inner border
    const im = 8;
    ctx.beginPath();
    ctx.moveTo(loungeRugPts[0].x + im, loungeRugPts[0].y + im * 0.3);
    ctx.lineTo(loungeRugPts[1].x - im, loungeRugPts[1].y + im * 0.3);
    ctx.lineTo(loungeRugPts[2].x - im, loungeRugPts[2].y - im * 0.3);
    ctx.lineTo(loungeRugPts[3].x + im, loungeRugPts[3].y - im * 0.3);
    ctx.closePath();
    ctx.strokeStyle = "rgba(160, 100, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // 5c. Meeting room rug — teal/cyan under the meeting table
  {
    const mc0 = 13.8, mr0 = 0.8, mc1 = 18.5, mr1 = 8.2;
    const meetRugPts = [
      { x: isoX(mc0, mr0), y: isoY(mc0, mr0) },
      { x: isoX(mc1, mr0), y: isoY(mc1, mr0) },
      { x: isoX(mc1, mr1), y: isoY(mc1, mr1) },
      { x: isoX(mc0, mr1), y: isoY(mc0, mr1) },
    ];
    ctx.save();
    ctx.beginPath();
    meetRugPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 160, 140, 0.28)";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 220, 200, 0.65)";
    ctx.lineWidth = 2;
    ctx.stroke();
    const im = 10;
    ctx.beginPath();
    ctx.moveTo(meetRugPts[0].x + im, meetRugPts[0].y + im * 0.3);
    ctx.lineTo(meetRugPts[1].x - im, meetRugPts[1].y + im * 0.3);
    ctx.lineTo(meetRugPts[2].x - im, meetRugPts[2].y - im * 0.3);
    ctx.lineTo(meetRugPts[3].x + im, meetRugPts[3].y - im * 0.3);
    ctx.closePath();
    ctx.strokeStyle = "rgba(0, 220, 200, 0.30)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // 6. Meeting table
  drawMeetingTable(ctx);

  // 7. Sofa / lounge
  drawSofa(ctx);

  // Bookshelf on left wall (col 0, rows 3-5)
  {
    const bx = isoX(0, 3) + 5;
    const by = isoY(0, 3) - 18;
    // Shelf frame
    ctx.fillStyle = "#3A2410";
    ctx.beginPath();
    ctx.roundRect(bx - 2, by - 42, 28, 52, 3);
    ctx.fill();
    // Book spines — colorful
    const books = [
      { x: bx, y: by - 38, w: 5, h: 18, c: "#FF4757" },
      { x: bx + 6, y: by - 36, w: 4, h: 16, c: "#00D4FF" },
      { x: bx + 11, y: by - 40, w: 6, h: 20, c: "#FFB800" },
      { x: bx + 18, y: by - 37, w: 5, h: 17, c: "#7B61FF" },
      { x: bx, y: by - 16, w: 5, h: 14, c: "#00E5A0" },
      { x: bx + 6, y: by - 18, w: 7, h: 16, c: "#FF6B9D" },
      { x: bx + 14, y: by - 15, w: 8, h: 13, c: "#64B5F6" },
    ];
    books.forEach(({ x, y, w, h, c }) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 1);
      ctx.fill();
      // Book shine
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, 1.5, h - 2, 0);
      ctx.fill();
    });
    // Shelf divider
    ctx.fillStyle = "#5A3C18";
    ctx.fillRect(bx - 2, by - 20, 28, 2);
  }

  // 8. Desks + furniture — sorted by depth (col+row)
  const agentsByDepth = [...agents].sort((a, b) => {
    const pa = DESK_POSITIONS[a.id] ?? { col: 0, row: 0 };
    const pb = DESK_POSITIONS[b.id] ?? { col: 0, row: 0 };
    return pa.col + pa.row - (pb.col + pb.row);
  });

  agentsByDepth.forEach((agent) => {
    const pos = DESK_POSITIONS[agent.id];
    if (!pos) return;
    const cfg = AGENT_CONFIG[agent.id];
    if (!cfg) return;
    drawDesk(ctx, pos.col, pos.row, cfg.color, t);
  });

  // 9. Plants (on top of desks/floor)
  drawAllPlants(ctx, t);

  // 10. Avatars (sorted by depth)
  hitboxes.clear();
  agentsByDepth.forEach((agent) => {
    const pos = DESK_POSITIONS[agent.id];
    if (!pos) return;
    const cfg = AGENT_CONFIG[agent.id];
    if (!cfg) return;

    const cx = isoX(pos.col + 1.0, pos.row + 0.45);
    const cy = isoY(pos.col + 1.0, pos.row + 0.45, 0);

    drawSimsAvatar(ctx, cx, cy, t, agent, cfg, agent.id === hoveredId, agent.id === selectedId);
    hitboxes.set(agent.id, { x: cx, y: cy - 60, r: 32 });
  });

  // 10b. Zone dept labels — floating above each carpet
  agentsByDepth.forEach((agent) => {
    const pos = DESK_POSITIONS[agent.id];
    if (!pos) return;
    const cfg = AGENT_CONFIG[agent.id];
    if (!cfg) return;

    const lx = isoX(pos.col + 1, pos.row - 0.4);
    const ly = isoY(pos.col + 1, pos.row - 0.4) - 12;

    ctx.save();
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    const tw = ctx.measureText(cfg.dept).width;

    // Label background
    ctx.fillStyle = cfg.color + "20";
    ctx.strokeStyle = cfg.color + "60";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(lx - tw / 2 - 6, ly - 9, tw + 12, 13, 3);
    ctx.fill();
    ctx.stroke();

    // Label text
    ctx.fillStyle = cfg.color + "CC";
    ctx.textAlign = "center";
    ctx.fillText(cfg.dept, lx, ly);
    ctx.restore();
  });

  // 11. Activity bubbles (topmost layer)
  agentsByDepth.forEach((agent) => {
    const pos = DESK_POSITIONS[agent.id];
    if (!pos) return;
    const cx = isoX(pos.col + 1.0, pos.row + 0.45);
    const cy = isoY(pos.col + 1.0, pos.row + 0.45, 0);
    drawActivityBubble(ctx, cx, cy, agent, t);
  });

  // 12. Window light shafts (over floor, under avatars)
  drawWindowLightShafts(ctx, t);

  // 13. Vignette (cinematic framing — always last)
  drawVignette(ctx, W, H);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface NexusHeaderProps {
  stats: { online: number; total: number; tokens: number; tasks: number };
}

function NexusHeader({ stats }: NexusHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 20px",
        background: "var(--bg-base, #090B14)",
        borderBottom: "1px solid var(--border-subtle, rgba(255,255,255,0.05))",
        backdropFilter: "blur(16px)",
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--accent-emerald, #34D399)",
            boxShadow: "0 0 6px var(--accent-emerald, #34D399)",
          }}
        />
        <span
          style={{
            color: "var(--text-secondary, #7A85A3)",
            fontSize: 10.5,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          NEXUS · OFICINA VIRTUAL
        </span>
        <span style={{ animation: "neon-flicker 3s infinite", marginLeft: 2, color: "var(--accent-indigo, #6366F1)", fontSize: 11 }}>▮</span>
      </div>

      <div style={{ display: "flex", gap: 28 }}>
        {[
          { label: "AGENTS ONLINE", value: `${stats.online}/${stats.total}`, color: "var(--accent-emerald, #34D399)" },
          { label: "TOKENS HOY",   value: stats.tokens.toLocaleString(),     color: "var(--accent-violet, #A78BFA)" },
          { label: "TAREAS",       value: stats.tasks.toString(),            color: "var(--accent-amber, #F59E0B)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ color: "var(--text-micro, #2A3453)", fontSize: 8.5, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em", marginBottom: 2 }}>
              {label}
            </div>
            <div style={{ color, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AgentPanelProps {
  agent: Agent;
  onClose: () => void;
  onChat: () => void;
  onStatusChange: (s: AgentStatus) => void;
}

function AgentPanel({ agent, onClose, onChat, onStatusChange }: AgentPanelProps) {
  const cfg = AGENT_CONFIG[agent.id];
  const statusColors: Record<string, string> = {
    online: "#00E5A0", busy: "#FFB800", offline: "#4A5570", error: "#FF4757",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        width: 300,
        background: "rgba(8,10,22,0.97)",
        border: `1px solid ${cfg?.color ?? "#FFFFFF"}30`,
        borderRadius: 12,
        padding: 20,
        zIndex: 100,
        boxShadow: `0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px ${cfg?.color ?? "#FFFFFF"}18`,
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "rgba(255,255,255,0.06)",
          border: "none",
          color: "#6070A0",
          width: 24,
          height: 24,
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ×
      </button>

      {/* Agent header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: `${cfg?.color ?? "#FFFFFF"}18`,
            border: `1px solid ${cfg?.color ?? "#FFFFFF"}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          {agent.icon}
        </div>
        <div>
          <div style={{ color: "#E8ECF8", fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
            {agent.name}
          </div>
          <div style={{ color: "#4A5570", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
            {agent.role}
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 3,
              padding: "1px 7px",
              borderRadius: 20,
              background: `${cfg?.color ?? "#FFFFFF"}18`,
              border: `1px solid ${cfg?.color ?? "#FFFFFF"}40`,
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: statusColors[agent.status] ?? "#4A5570",
                boxShadow: `0 0 5px ${statusColors[agent.status] ?? "#4A5570"}`,
              }}
            />
            <span
              style={{
                color: statusColors[agent.status] ?? "#4A5570",
                fontSize: 9,
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {agent.status}
            </span>
          </div>
        </div>
      </div>

      {/* Dept badge */}
      {cfg && (
        <div
          style={{
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: 4,
            background: cfg.color + "20",
            border: `1px solid ${cfg.color}50`,
            color: cfg.color,
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.12em",
            marginBottom: 14,
          }}
        >
          {cfg.dept}
        </div>
      )}

      {/* Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[
          { label: "TAREAS", value: agent.tasksCompleted },
          { label: "TOKENS", value: `${(agent.tokensUsed / 1000).toFixed(1)}k` },
          { label: "LATENCIA", value: `${agent.avgResponseMs}ms` },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: "rgba(255,255,255,0.04)",
              borderRadius: 6,
              padding: "8px 6px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ color: "#3A4560", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>
              {label}
            </div>
            <div style={{ color: "#8090B0", fontSize: 12, fontWeight: 700 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Skills */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: "#3A4560", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, letterSpacing: "0.1em" }}>
          SKILLS
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {agent.skills.slice(0, 6).map((skill) => (
            <span
              key={skill}
              style={{
                padding: "2px 8px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: 4,
                color: "#5A6A90",
                fontSize: 9,
                fontFamily: "'JetBrains Mono', monospace",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Status selector */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: "#3A4560", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, letterSpacing: "0.1em" }}>
          CAMBIAR ESTADO
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["online", "busy", "offline"] as AgentStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              style={{
                flex: 1,
                padding: "5px 0",
                borderRadius: 5,
                border: `1px solid ${agent.status === s ? statusColors[s] + "80" : "rgba(255,255,255,0.07)"}`,
                background: agent.status === s ? statusColors[s] + "20" : "rgba(255,255,255,0.03)",
                color: agent.status === s ? statusColors[s] : "#3A4560",
                fontSize: 9,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Chat CTA */}
      <button
        onClick={onChat}
        style={{
          width: "100%",
          padding: "10px 0",
          background: `linear-gradient(135deg, ${cfg?.color ?? "#00D4FF"}25, ${cfg?.color ?? "#00D4FF"}10)`,
          border: `1px solid ${cfg?.color ?? "#00D4FF"}60`,
          borderRadius: 8,
          color: cfg?.color ?? "#00D4FF",
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          transition: "all 0.2s",
        }}
      >
        INICIAR CHAT →
      </button>

      {/* Activity sparkline decoration */}
      <div style={{
        marginTop: 10,
        padding: "8px 10px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        gap: 2,
        alignItems: "flex-end",
        height: 36,
      }}>
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${20 + Math.sin(i * 0.8) * 10 + (i % 3) * 4}px`,
              background: `${cfg?.color ?? "#00D4FF"}${i === 15 ? "FF" : i > 10 ? "AA" : "50"}`,
              borderRadius: "1px 1px 0 0",
              transition: "height 0.3s ease",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main page component ───────────────────────────────────────────────────────

export default function NexusPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  const { agents, setPage, createChatSession, setActiveChat, setAgentStatus } = useAstraeo();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const avatarHitboxes = useRef<Map<string, { x: number; y: number; r: number }>>(new Map());

  const stats = useMemo(
    () => ({
      online: agents.filter((a) => a.status === "online").length,
      total:  agents.length,
      tokens: agents.reduce((s, a) => s + a.tokensUsed, 0),
      tasks:  agents.reduce((s, a) => s + a.tasksCompleted, 0),
    }),
    [agents]
  );

  // RAF render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = 1500, H = 800;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    let running = true;

    function frame(ts: number) {
      if (!running) return;
      timeRef.current = ts / 1000;
      ctx!.clearRect(0, 0, W, H);
      drawScene(ctx!, timeRef.current, agents, hoveredId, selectedId, avatarHitboxes.current);
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [agents, hoveredId, selectedId]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const [id, box] of avatarHitboxes.current) {
      const dist = Math.sqrt((mx - box.x) ** 2 + (my - box.y) ** 2);
      if (dist <= box.r + 12) {
        setSelectedId((prev) => (prev === id ? null : id));
        return;
      }
    }
    setSelectedId(null);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found: string | null = null;
    for (const [id, box] of avatarHitboxes.current) {
      const dist = Math.sqrt((mx - box.x) ** 2 + (my - box.y) ** 2);
      if (dist <= box.r + 16) {
        found = id;
        break;
      }
    }
    setHoveredId(found);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = found ? "pointer" : "default";
    }
  }, []);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedId),
    [agents, selectedId]
  );

  const handleStartChat = useCallback(
    (agentId: string) => {
      const sessionId = createChatSession(agentId);
      setActiveChat(sessionId);
      setPage("chat");
    },
    [createChatSession, setActiveChat, setPage]
  );

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base, #090B14)",
        overflow: "hidden",
      }}
    >
      <NexusHeader stats={stats} />

      <div
        style={{
          flex: 1,
          overflow: "auto",
          position: "relative",
          background: "transparent",
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredId(null)}
          style={{ display: "block" }}
        />

        <AnimatePresence>
          {selectedAgent && (
            <AgentPanel
              agent={selectedAgent}
              onClose={() => setSelectedId(null)}
              onChat={() => handleStartChat(selectedAgent.id)}
              onStatusChange={(s: AgentStatus) => setAgentStatus(selectedAgent.id, s)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Status bar */}
      <div style={{
        height: 24,
        background: "var(--bg-base, #090B14)",
        borderTop: "1px solid var(--border-subtle, rgba(255,255,255,0.05))",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 20,
        flexShrink: 0,
      }}>
        {[
          { label: "CANVAS", value: "1500×800", color: "var(--text-muted, #3D4A6B)" },
          { label: "FPS",    value: "60",        color: "var(--accent-emerald, #34D399)" },
          { label: "AGENTS", value: `${agents.filter(a => a.status === "online").length} ONLINE`, color: "var(--accent-sky, #22D3EE)" },
          { label: "RENDER", value: "CANVAS 2D · ISO 2.5D", color: "var(--accent-indigo, #6366F1)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <span style={{ color: "var(--text-micro, #2A3453)", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>{label}</span>
            <span style={{ color, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
