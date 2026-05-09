"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAstraeo } from "@/store/astraeo";
import type { ChatMessage, Agent } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  cyan:    "var(--accent-sky)",
  purple:  "var(--accent-indigo)",
  emerald: "var(--accent-emerald)",
  amber:   "var(--accent-amber)",
  coral:   "var(--accent-rose)",
  red:     "var(--danger)",
  bg:      "var(--bg-base)",
  surface: "var(--bg-surface)",
  border:  "var(--border-subtle)",
  text:    "var(--text-primary)",
  muted:   "var(--text-muted)",
} as const;

// ─── CopyButton ───────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      style={{
        background: copied ? "rgba(122,133,105,0.12)" : "rgba(124,138,152,0.08)",
        border: `1px solid ${copied ? "rgba(122,133,105,0.25)" : "rgba(124,138,152,0.18)"}`,
        color: copied ? C.emerald : C.muted,
        borderRadius: 5,
        padding: "2px 8px",
        fontSize: 9,
        cursor: "pointer",
        fontFamily: "'JetBrains Mono', monospace",
        transition: "all 0.18s",
        letterSpacing: "0.04em",
        fontWeight: 600,
      }}
    >
      {copied ? "✓ copiado" : "copiar"}
    </button>
  );
}

// ─── MessageContent ───────────────────────────────────────────────────────────
interface MessageContentProps {
  content: string;
  role: string;
}

function MessageContent({ content, role }: MessageContentProps) {
  if (role === "user") {
    return (
      <p style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 13, lineHeight: 1.65 }}>
        {content}
      </p>
    );
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code(props) {
            const { children, className } = props;
            const match = /language-(\w+)/.exec(className ?? "");
            const isBlock = match !== null;
            if (isBlock) {
              return (
                <div style={{ position: "relative", margin: "8px 0" }}>
                  <div
                    style={{
                      position: "absolute",
                      right: 76,
                      top: 8,
                      zIndex: 1,
                      fontSize: 9,
                      color: C.muted,
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: "0.07em",
                      fontWeight: 700,
                    }}
                  >
                    {match[1].toUpperCase()}
                  </div>
                  <div style={{ position: "absolute", right: 8, top: 6, zIndex: 2 }}>
                    <CopyButton text={String(children).replace(/\n$/, "")} />
                  </div>
                  <code
                    className={className}
                    style={{
                      display: "block",
                      background: "rgba(5,8,16,0.9)",
                      border: `1px solid rgba(255,255,255,0.07)`,
                      borderRadius: 10,
                      padding: "12px 16px",
                      paddingTop: 34,
                      fontSize: "0.8em",
                      fontFamily: "'JetBrains Mono', monospace",
                      overflowX: "auto",
                      lineHeight: 1.65,
                    }}
                  >
                    {children}
                  </code>
                </div>
              );
            }
            return (
              <code
                style={{
                  background: "rgba(124,138,152,0.08)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.87em",
                  color: C.cyan,
                  border: `1px solid rgba(124,138,152,0.15)`,
                }}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p style={{ margin: "0 0 8px 0", lineHeight: 1.65, fontSize: 13 }}>{children}</p>;
          },
          h1({ children }) {
            return (
              <h1 style={{ fontSize: "1.15em", fontWeight: 700, color: C.cyan, margin: "14px 0 6px", paddingBottom: 4, borderBottom: `1px solid rgba(124,138,152,0.15)` }}>
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 style={{ fontSize: "1.05em", fontWeight: 600, color: C.purple, margin: "10px 0 4px" }}>
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 style={{ fontSize: "0.95em", fontWeight: 600, color: C.text, margin: "8px 0 4px" }}>
                {children}
              </h3>
            );
          },
          ul({ children }) {
            return <ul style={{ margin: "4px 0 8px 0", paddingLeft: 20, listStyleType: "disc" }}>{children}</ul>;
          },
          ol({ children }) {
            return <ol style={{ margin: "4px 0 8px 0", paddingLeft: 20, listStyleType: "decimal" }}>{children}</ol>;
          },
          li({ children }) {
            return <li style={{ margin: "3px 0", lineHeight: 1.55 }}>{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote style={{ borderLeft: `3px solid ${C.purple}`, paddingLeft: 12, margin: "8px 0", color: "var(--text-muted)", fontStyle: "italic" }}>
                {children}
              </blockquote>
            );
          },
          strong({ children }) {
            return <strong style={{ color: C.text, fontWeight: 700 }}>{children}</strong>;
          },
          em({ children }) {
            return <em style={{ color: "#B8A06A" }}>{children}</em>;
          },
          hr() {
            return <hr style={{ border: "none", borderTop: `1px solid rgba(255,255,255,0.07)`, margin: "12px 0" }} />;
          },
          table({ children }) {
            return (
              <div style={{ overflowX: "auto", margin: "8px 0" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.85em" }}>{children}</table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th style={{ border: `1px solid rgba(255,255,255,0.08)`, padding: "6px 10px", background: "rgba(124,138,152,0.06)", textAlign: "left", color: C.cyan, fontWeight: 600 }}>
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td style={{ border: `1px solid rgba(255,255,255,0.07)`, padding: "6px 10px", color: "var(--text-secondary)" }}>
                {children}
              </td>
            );
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: C.cyan, textDecoration: "underline", textUnderlineOffset: 3 }}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── MessageBubble ─────────────────────────────────────────────────────────
interface MessageBubbleProps {
  msg: ChatMessage;
  agentColor: string;
  agentIcon: string;
  agentName: string;
}

function MessageBubble({ msg, agentColor, agentIcon, agentName }: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false);

  const time = new Date(msg.timestamp).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (msg.role === "system") {
    return (
      <div className="flex justify-center">
        <div
          className="text-[11px] px-4 py-2 rounded-full"
          style={{
            color: C.muted,
            border: `1px dashed rgba(255,255,255,0.08)`,
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-end items-end gap-2"
      >
        <div className="flex flex-col items-end gap-1 max-w-[72%]">
          <div
            className="px-4 py-3 rounded-2xl rounded-br-sm text-[13px] leading-relaxed text-white"
            style={{ background: `linear-gradient(135deg, ${agentColor}cc, ${agentColor}66)` }}
          >
            <MessageContent content={msg.content} role="user" />
          </div>
          <div className="flex items-center gap-2 mr-0.5">
            {msg.tokens != null && msg.tokens > 0 && (
              <span className="text-[9px] font-mono" style={{ color: `${C.muted}80` }}>
                {msg.tokens} tok
              </span>
            )}
            <span className="text-[9px] font-mono" style={{ color: C.muted }}>{time}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1"
        style={{
          background: `${agentColor}12`,
          border: `1px solid ${agentColor}30`,
        }}
      >
        {agentIcon}
      </div>
      <div className="flex-1 min-w-0 max-w-[78%]">
        <p className="text-[10px] mb-1.5 ml-0.5 font-semibold tracking-wider uppercase" style={{ color: agentColor, fontSize: 9 }}>
          {agentName}
        </p>
        <div
          className="relative px-4 py-3 rounded-2xl rounded-tl-sm"
          style={{
            background: C.surface,
            border: `1px solid rgba(255,255,255,0.06)`,
            color: "var(--text-secondary)",
          }}
        >
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: "absolute", top: 8, right: 10, zIndex: 10 }}
              >
                <CopyButton text={msg.content} />
              </motion.div>
            )}
          </AnimatePresence>
          <MessageContent content={msg.content} role="agent" />
        </div>
        <div className="flex items-center gap-2 ml-0.5 mt-1">
          {msg.tokens != null && msg.tokens > 0 && (
            <span className="text-[9px] font-mono" style={{ color: `${C.muted}80` }}>
              {msg.tokens} tok
            </span>
          )}
          <span className="text-[9px] font-mono" style={{ color: C.muted }}>{time}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── TypingIndicator ──────────────────────────────────────────────────────────
function TypingIndicator({ agentIcon, agentColor }: { agentIcon: string; agentColor: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-3"
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
        style={{ background: `${agentColor}12`, border: `1px solid ${agentColor}30` }}
      >
        {agentIcon}
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-sm"
        style={{ background: C.surface, border: `1px solid rgba(255,255,255,0.06)` }}
      >
        <div className="flex gap-1.5 items-center" style={{ height: 18 }}>
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: agentColor }}
              animate={{ scale: [0.6, 1, 0.6], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── EmptyConversation ────────────────────────────────────────────────────────
interface EmptyConversationProps {
  agent: Agent;
}

function EmptyConversation({ agent }: EmptyConversationProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative"
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
          style={{
            background: `${agent.color}10`,
            border: `1px solid ${agent.color}30`,
            boxShadow: `0 0 40px ${agent.color}18`,
          }}
        >
          {agent.icon}
        </div>
        <div
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2"
          style={{
            background: agent.status === "online" ? C.emerald : C.muted,
            borderColor: C.bg,
          }}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <p className="text-[16px] font-bold mb-1" style={{ color: C.text }}>{agent.name}</p>
        <p className="text-[13px] mb-1" style={{ color: C.muted }}>{agent.role}</p>
        <p className="text-[11px] font-mono" style={{ color: `${C.muted}80` }}>
          Inicia una conversación con {agent.name}
        </p>
      </motion.div>
    </div>
  );
}

// ─── EmptyState (no session selected) ─────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-8 text-center">
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: "rgba(124,138,152,0.05)",
          border: `1px solid rgba(124,138,152,0.1)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
        }}
      >
        ◎
      </div>
      <div>
        <p className="text-[15px] font-semibold mb-1.5" style={{ color: C.text }}>Sin conversaciones</p>
        <p className="text-[12px] leading-relaxed max-w-xs" style={{ color: C.muted }}>
          Selecciona un agente y crea una nueva sesión para comenzar.
        </p>
      </div>
    </div>
  );
}

// ─── Status dot style ─────────────────────────────────────────────────────────
function statusColor(status: string): string {
  const map: Record<string, string> = {
    online: C.emerald,
    busy: C.amber,
    offline: C.muted,
    error: C.red,
  };
  return map[status] ?? C.muted;
}

// ─── SessionItem ──────────────────────────────────────────────────────────────
interface SessionItemProps {
  sessionId: string;
  title: string;
  msgCount: number;
  agentIcon: string;
  agentColor: string;
  isActive: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function SessionItem({ sessionId: _sessionId, title, msgCount, agentIcon, agentColor, isActive, onClick, onDelete }: SessionItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className="w-full text-left p-2.5 rounded-xl transition-all group relative cursor-pointer"
      style={{
        background: isActive ? `${agentColor}0c` : "transparent",
        border: `1px solid ${isActive ? agentColor + "28" : "transparent"}`,
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent";
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm flex-shrink-0">{agentIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold truncate" style={{ color: isActive ? C.text : "var(--text-muted)" }}>
            {title}
          </p>
          <p className="text-[9px] font-mono mt-0.5" style={{ color: C.muted }}>
            {msgCount} msgs
          </p>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(e); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
        style={{ color: C.muted }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.red; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.muted; }}
      >
        ✕
      </button>
    </div>
  );
}

// ─── Main Chat Page ────────────────────────────────────────────────────────────
export default function Chat() {
  const {
    chatSessions,
    activeChatId,
    setActiveChat,
    sendMessage,
    createChatSession,
    deleteChat,
    agents,
  } = useAstraeo();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState(agents[0]?.id ?? "");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const session = chatSessions.find((c) => c.id === activeChatId);
  const currentAgent = session ? agents.find((a) => a.id === session.agentId) : null;
  const totalTokens = session?.messages.reduce((s, m) => s + (m.tokens ?? 0), 0) ?? 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length]);

  // Auto-grow textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const txt = (overrideText ?? input).trim();
    if (!txt || !session || sending) return;
    if (!overrideText) setInput("");
    setLastError(null);
    setSending(true);
    try {
      await sendMessage(session.id, txt, session.agentId);
    } catch {
      setLastError(txt);
    } finally {
      setSending(false);
    }
  }, [input, session, sending, sendMessage]);

  const handleRetry = () => {
    if (!session) return;
    const lastUser = [...session.messages].reverse().find((m) => m.role === "user");
    if (lastUser) handleSend(lastUser.content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const agentColor = currentAgent?.color ?? C.cyan;
  const agentIcon = currentAgent?.icon ?? "◉";
  const agentName = currentAgent?.name ?? "Agente";
  const charCount = input.length;

  return (
    <div className="flex h-full overflow-hidden" style={{ background: C.bg }}>
      {/* ── Sessions sidebar ── */}
      <div
        className="w-60 flex flex-col flex-shrink-0"
        style={{ borderRight: `1px solid rgba(255,255,255,0.06)` }}
      >
        <div
          className="p-4 flex-shrink-0"
          style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}
        >
          <p className="text-[9px] font-bold tracking-widest uppercase font-mono mb-3" style={{ color: C.muted }}>
            Conversaciones
          </p>
          <div className="space-y-2">
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full text-[11px] rounded-lg outline-none transition-all"
              style={{
                background: C.surface,
                border: `1px solid rgba(255,255,255,0.07)`,
                color: C.text,
                padding: "7px 10px",
              }}
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id} style={{ background: C.surface }}>
                  {a.icon} {a.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => createChatSession(selectedAgent)}
              className="w-full text-[11px] py-2 rounded-lg font-semibold transition-all text-white"
              style={{
                background: `linear-gradient(135deg, ${C.purple}cc, ${C.cyan}99)`,
                border: "transparent",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              + Nueva sesión
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chatSessions.length === 0 && (
            <p className="text-[10px] text-center mt-6 px-2" style={{ color: C.muted }}>
              No hay sesiones aún
            </p>
          )}
          {chatSessions.map((c) => {
            const ag = agents.find((a) => a.id === c.agentId);
            return (
              <SessionItem
                key={c.id}
                sessionId={c.id}
                title={c.title}
                msgCount={c.messages.length}
                agentIcon={ag?.icon ?? "◉"}
                agentColor={ag?.color ?? C.cyan}
                isActive={activeChatId === c.id}
                onClick={() => setActiveChat(c.id)}
                onDelete={(e) => { e.stopPropagation(); deleteChat(c.id); }}
              />
            );
          })}
        </div>
      </div>

      {/* ── Chat main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {session && currentAgent ? (
          <>
            {/* Agent header */}
            <div
              className="flex items-center gap-3.5 px-5 py-3 flex-shrink-0"
              style={{
                borderBottom: `1px solid rgba(255,255,255,0.06)`,
                background: "rgba(5,8,16,0.9)",
              }}
            >
              <div className="relative">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                  style={{
                    background: `${agentColor}12`,
                    border: `1px solid ${agentColor}30`,
                    boxShadow: `0 0 16px ${agentColor}18`,
                  }}
                >
                  {agentIcon}
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                  style={{
                    background: statusColor(currentAgent.status),
                    borderColor: C.bg,
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold tracking-wider" style={{ color: C.text }}>
                    {currentAgent.name}
                  </p>
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-semibold tracking-wider uppercase"
                    style={{
                      background: `${agentColor}12`,
                      color: agentColor,
                      border: `1px solid ${agentColor}28`,
                    }}
                  >
                    {currentAgent.model.includes("opus") ? "Opus" : currentAgent.model.includes("haiku") ? "Haiku" : "Sonnet"}
                  </span>
                </div>
                <p className="text-[10px] mt-0.5 truncate" style={{ color: C.muted }}>
                  {currentAgent.role}
                </p>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-mono" style={{ color: C.muted }}>
                <span>{session.messages.length} msgs</span>
                {totalTokens > 0 && (
                  <span>{totalTokens.toLocaleString()} tok</span>
                )}
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: statusColor(currentAgent.status) }}
                  />
                  <span className="capitalize">{currentAgent.status}</span>
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {session.messages.length === 0 && (
                <EmptyConversation agent={currentAgent} />
              )}

              {session.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  agentColor={agentColor}
                  agentIcon={agentIcon}
                  agentName={agentName}
                />
              ))}

              {sending && (
                <TypingIndicator agentIcon={agentIcon} agentColor={agentColor} />
              )}

              {lastError && !sending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center"
                >
                  <div
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px]"
                    style={{
                      background: "rgba(122,48,64,0.06)",
                      border: `1px solid rgba(122,48,64,0.25)`,
                      color: C.red,
                    }}
                  >
                    <span>Error al enviar mensaje</span>
                    <button
                      onClick={handleRetry}
                      className="px-3 py-1 rounded-lg font-semibold transition-all"
                      style={{
                        border: `1px solid rgba(122,48,64,0.35)`,
                        color: C.red,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(122,48,64,0.1)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      Reintentar
                    </button>
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div
              className="px-4 py-3 flex-shrink-0"
              style={{
                borderTop: `1px solid rgba(255,255,255,0.06)`,
                background: "rgba(5,8,16,0.95)",
              }}
            >
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Mensaje para ${agentName}...`}
                    rows={1}
                    className="w-full resize-none outline-none transition-all text-[13px]"
                    style={{
                      background: C.surface,
                      border: `1px solid rgba(255,255,255,0.08)`,
                      borderRadius: 12,
                      padding: "10px 14px",
                      paddingBottom: 28,
                      color: C.text,
                      minHeight: 42,
                      maxHeight: 128,
                      caretColor: agentColor,
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLTextAreaElement).style.borderColor = `${agentColor}50`;
                      (e.target as HTMLTextAreaElement).style.boxShadow = `0 0 0 2px ${agentColor}12`;
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLTextAreaElement).style.borderColor = "rgba(255,255,255,0.08)";
                      (e.target as HTMLTextAreaElement).style.boxShadow = "none";
                    }}
                  />
                  {/* Character count + hint */}
                  <div
                    className="absolute bottom-2 left-3 right-3 flex justify-between items-center pointer-events-none"
                    style={{ fontSize: 9, fontFamily: "monospace" }}
                  >
                    <span style={{ color: `${C.muted}70` }}>Shift+Enter para nueva línea</span>
                    <span style={{ color: charCount > 0 ? `${C.muted}90` : "transparent" }}>
                      {charCount}
                    </span>
                  </div>
                </div>

                <motion.button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sending}
                  className="flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: input.trim() && !sending ? `linear-gradient(135deg, ${agentColor}dd, ${agentColor}88)` : C.surface,
                    border: `1px solid ${input.trim() && !sending ? "transparent" : "rgba(255,255,255,0.08)"}`,
                    color: input.trim() && !sending ? "#fff" : C.muted,
                    cursor: input.trim() && !sending ? "pointer" : "not-allowed",
                    fontSize: 14,
                  }}
                  whileTap={input.trim() && !sending ? { scale: 0.92 } : {}}
                >
                  {sending ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      style={{ display: "block" }}
                    >
                      ◌
                    </motion.span>
                  ) : (
                    <span style={{ transform: "rotate(-45deg)", display: "block", marginTop: -2 }}>➤</span>
                  )}
                </motion.button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
