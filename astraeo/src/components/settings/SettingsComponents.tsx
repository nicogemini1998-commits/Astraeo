"use client";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import type { Section } from "./types";

// ─── Shared tokens ────────────────────────────────────────────────────────────

export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const INPUT: CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-base)",
  color: "var(--text-primary)", fontSize: 12,
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};

export const SELECT: CSSProperties = {
  ...INPUT, cursor: "pointer",
} as CSSProperties;

export const GHOST: CSSProperties = {
  padding: "7px 14px", borderRadius: 7,
  border: "1px solid var(--border-subtle)",
  background: "transparent", color: "var(--text-muted)",
  fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
};

export const DANGER_BTN: CSSProperties = {
  padding: "7px 14px", borderRadius: 7,
  border: "1px solid rgba(122,48,64,0.4)",
  background: "rgba(122,48,64,0.08)",
  color: "#7A3040", fontSize: 11, fontWeight: 600,
  cursor: "pointer", whiteSpace: "nowrap",
};

// ─── FieldGroup ───────────────────────────────────────────────────────────────

export function FieldGroup({ label, hint, children }: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.07em", fontWeight: 600 }}>
        {label.toUpperCase()}
      </label>
      {children}
      {hint && <p style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5 }}>{hint}</p>}
    </div>
  );
}

// ─── AnimatedToggle ───────────────────────────────────────────────────────────

export function AnimatedToggle({ value, onChange, color = "#7C8A98" }: {
  value: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <motion.button
      onClick={() => onChange(!value)}
      whileTap={{ scale: 0.9 }}
      style={{
        width: 38, height: 22, borderRadius: 11, flexShrink: 0,
        background: value ? `${color}30` : "var(--bg-surface-2)",
        border: `1px solid ${value ? `${color}55` : "var(--border-subtle)"}`,
        position: "relative", cursor: "pointer", padding: 0,
        transition: "all 0.22s ease",
      }}
    >
      <motion.div
        animate={{ x: value ? 17 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          position: "absolute", top: 2,
          width: 16, height: 16, borderRadius: "50%",
          background: value ? color : "var(--text-muted)",
          transition: "background 0.22s",
        }}
      />
    </motion.button>
  );
}

// ─── ToggleRow ────────────────────────────────────────────────────────────────

export function ToggleRow({ label, sub, value, onChange, color = "#7C8A98" }: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "11px 14px", borderRadius: 10,
      background: value ? `${color}05` : "var(--bg-base)",
      border: `1px solid ${value ? `${color}18` : "var(--border-subtle)"}`,
      transition: "all 0.18s",
      cursor: "pointer",
    }} onClick={() => onChange(!value)}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: sub ? 2 : 0 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{sub}</p>}
      </div>
      <AnimatedToggle value={value} onChange={onChange} color={color} />
    </div>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

export function SectionCard({ id, title, icon, color, badge, danger, refCallback, children }: {
  id: Section;
  title: string;
  icon: string;
  color: string;
  badge?: string;
  danger?: boolean;
  refCallback?: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      ref={refCallback}
      id={`section-${id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      style={{
        borderRadius: 16, overflow: "hidden",
        border: `1px solid ${danger ? "rgba(122,48,64,0.2)" : "var(--border-subtle)"}`,
        background: danger ? "rgba(122,48,64,0.02)" : "var(--bg-surface)",
        scrollMarginTop: 20,
      }}
    >
      {/* Color accent top line */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, transparent, ${color}60, ${color}cc, ${color}60, transparent)`,
      }} />
      {/* Header */}
      <div style={{
        padding: "13px 20px 11px",
        borderBottom: `1px solid ${danger ? "rgba(122,48,64,0.1)" : "var(--border-subtle)"}`,
        background: `linear-gradient(135deg, ${color}06 0%, transparent 60%)`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 15, color }}>{icon}</span>
        <h3 style={{
          fontSize: 13, fontWeight: 700, color: "var(--text-primary)",
          fontFamily: "var(--font-display)", flex: 1, letterSpacing: "0.01em",
        }}>
          {title}
        </h3>
        {badge && (
          <span style={{
            fontSize: 9, padding: "2px 8px", borderRadius: 5,
            background: `${color}12`, color, border: `1px solid ${color}22`,
            fontWeight: 700, letterSpacing: "0.06em",
          }}>
            {badge}
          </span>
        )}
      </div>
      {/* Body */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
    </motion.div>
  );
}

// ─── DangerRow ────────────────────────────────────────────────────────────────

export function DangerRow({ title, desc, children }: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      padding: "12px 14px", borderRadius: 10,
      background: "rgba(122,48,64,0.03)",
      border: "1px solid rgba(122,48,64,0.1)",
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{title}</p>
        <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</p>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ─── SliderField ──────────────────────────────────────────────────────────────

export function SliderField({ label, value, min, max, step, color, onChange, formatValue }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  color: string;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <FieldGroup label={`${label}: ${formatValue ? formatValue(value) : value}`}>
      <div style={{ position: "relative", padding: "4px 0" }}>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: "100%", accentColor: color, cursor: "pointer" }}
        />
        <div style={{
          position: "absolute", bottom: -2, left: 0,
          width: `${pct}%`, height: 2, borderRadius: 1,
          background: color, pointerEvents: "none", transition: "width 0.1s",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{formatValue ? formatValue(min) : min}</span>
        <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{formatValue ? formatValue(max) : max}</span>
      </div>
    </FieldGroup>
  );
}

// ─── SegmentedControl ─────────────────────────────────────────────────────────

export function SegmentedControl<T extends string>({ options, value, onChange, color }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  color: string;
}) {
  return (
    <div style={{
      display: "flex", gap: 4, padding: 3,
      borderRadius: 10, background: "var(--bg-base)",
      border: "1px solid var(--border-subtle)",
    }}>
      {options.map((opt) => (
        <motion.button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          whileTap={{ scale: 0.96 }}
          style={{
            flex: 1, padding: "7px 0", borderRadius: 7, cursor: "pointer",
            border: `1px solid ${value === opt.value ? `${color}35` : "transparent"}`,
            background: value === opt.value ? `${color}12` : "transparent",
            color: value === opt.value ? color : "var(--text-muted)",
            fontSize: 11, fontWeight: value === opt.value ? 700 : 400,
            transition: "all 0.15s",
          }}
        >
          {opt.label}
        </motion.button>
      ))}
    </div>
  );
}
