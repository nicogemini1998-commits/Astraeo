"use client";
import { useState, useRef, useEffect } from "react";
import { useAstraeo } from "@/store/astraeo";
import type { ChatMessage } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

// ─── Copy Button ─────────────────────────────────────────────────────────────
function CopyButton({ text, style }: { text: string; style?: React.CSSProperties }) {
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
        background: "rgba(0,212,255,0.1)",
        border: "1px solid rgba(0,212,255,0.2)",
        color: copied ? "#00E5A0" : "#6B7A99",
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 10,
        cursor: "pointer",
        fontFamily: "JetBrains Mono, monospace",
        transition: "all 0.2s",
        ...style,
      }}
    >
      {copied ? "✓ copiado" : "copiar"}
    </button>
  );
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────
function MessageContent({ content, role }: { content: string; role: string }) {
  if (role === "user") {
    return (
      <p style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 13, lineHeight: 1.6 }}>
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            if (!inline && match) {
              return (
                <div style={{ position: "relative", margin: "8px 0" }}>
                  <div
                    style={{
                      position: "absolute",
                      right: 72,
                      top: 8,
                      zIndex: 1,
                      fontSize: 9,
                      color: "#6B7A99",
                      fontFamily: "JetBrains Mono, monospace",
                      letterSpacing: "0.05em",
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
                      background: "rgba(10,15,31,0.85)",
                      border: "1px solid rgba(26,39,68,0.8)",
                      borderRadius: 8,
                      padding: "12px 16px",
                      paddingTop: 32,
                      fontSize: "0.82em",
                      fontFamily: "JetBrains Mono, monospace",
                      overflowX: "auto",
                      lineHeight: 1.6,
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                </div>
              );
            }
            return (
              <code
                style={{
                  background: "rgba(0,212,255,0.08)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "0.88em",
                  color: "#00D4FF",
                  border: "1px solid rgba(0,212,255,0.15)",
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }: { children?: React.ReactNode }) {
            return (
              <p style={{ margin: "0 0 8px 0", lineHeight: 1.65, fontSize: 13 }}>{children}</p>
            );
          },
          h1({ children }: { children?: React.ReactNode }) {
            return (
              <h1
                style={{
                  fontSize: "1.15em",
                  fontWeight: 700,
                  color: "#00D4FF",
                  margin: "14px 0 6px",
                  paddingBottom: 4,
                  borderBottom: "1px solid rgba(0,212,255,0.15)",
                }}
              >
                {children}
              </h1>
            );
          },
          h2({ children }: { children?: React.ReactNode }) {
            return (
              <h2
                style={{ fontSize: "1.05em", fontWeight: 600, color: "#7B61FF", margin: "10px 0 4px" }}
              >
                {children}
              </h2>
            );
          },
          h3({ children }: { children?: React.ReactNode }) {
            return (
              <h3
                style={{ fontSize: "0.95em", fontWeight: 600, color: "#E8ECF4", margin: "8px 0 4px" }}
              >
                {children}
              </h3>
            );
          },
          ul({ children }: { children?: React.ReactNode }) {
            return (
              <ul style={{ margin: "4px 0 8px 0", paddingLeft: 20, listStyleType: "disc" }}>
                {children}
              </ul>
            );
          },
          ol({ children }: { children?: React.ReactNode }) {
            return (
              <ol style={{ margin: "4px 0 8px 0", paddingLeft: 20, listStyleType: "decimal" }}>
                {children}
              </ol>
            );
          },
          li({ children }: { children?: React.ReactNode }) {
            return <li style={{ margin: "3px 0", lineHeight: 1.55 }}>{children}</li>;
          },
          blockquote({ children }: { children?: React.ReactNode }) {
            return (
              <blockquote
                style={{
                  borderLeft: "3px solid #7B61FF",
                  paddingLeft: 12,
                  margin: "8px 0",
                  color: "#8A9BBF",
                  fontStyle: "italic",
                }}
              >
                {children}
              </blockquote>
            );
          },
          strong({ children }: { children?: React.ReactNode }) {
            return <strong style={{ color: "#E8ECF4", fontWeight: 700 }}>{children}</strong>;
          },
          em({ children }: { children?: React.ReactNode }) {
            return <em style={{ color: "#A78BFA" }}>{children}</em>;
          },
          hr() {
            return (
              <hr style={{ border: "none", borderTop: "1px solid #1A2744", margin: "12px 0" }} />
            );
          },
          table({ children }: { children?: React.ReactNode }) {
            return (
              <div style={{ overflowX: "auto", margin: "8px 0" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.85em" }}>
                  {children}
                </table>
              </div>
            );
          },
          th({ children }: { children?: React.ReactNode }) {
            return (
              <th
                style={{
                  border: "1px solid #1A2744",
                  padding: "6px 10px",
                  background: "#0D1B3E",
                  textAlign: "left",
                  color: "#00D4FF",
                  fontWeight: 600,
                }}
              >
                {children}
              </th>
            );
          },
          td({ children }: { children?: React.ReactNode }) {
            return (
              <td
                style={{
                  border: "1px solid #1A2744",
                  padding: "6px 10px",
                  color: "#C8D0E0",
                }}
              >
                {children}
              </td>
            );
          },
          a({ href, children }: { href?: string; children?: React.ReactNode }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#00D4FF", textDecoration: "underline", textUnderlineOffset: 3 }}
              >
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

// ─── Timestamp ────────────────────────────────────────────────────────────────
function MessageTimestamp({ ts }: { ts: string }) {
  const d = new Date(ts);
  const hhmm = d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  const full = d.toLocaleString("es", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <span
      title={full}
      style={{ fontSize: 9, color: "#4A5570", fontFamily: "JetBrains Mono, monospace", cursor: "default" }}
    >
      {hhmm}
    </span>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({
  msg,
  agents,
}: {
  msg: ChatMessage;
  agents: ReturnType<typeof useAstraeo.getState>["agents"];
}) {
  const [hovered, setHovered] = useState(false);
  const agent = msg.agentId ? agents.find((a) => a.id === msg.agentId) : null;

  if (msg.role === "system") {
    return (
      <div className="flex justify-center">
        <div className="text-[11px] text-[#6B7A99] px-4 py-2 rounded-full border border-[#1A2744]/60 border-dashed">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.role === "user") {
    return (
      <div className="flex justify-end gap-2 items-end">
        <div className="flex flex-col items-end gap-1">
          <div
            className="max-w-[72%] px-4 py-3 rounded-2xl rounded-br-sm text-[13px] leading-relaxed text-white"
            style={{ background: "linear-gradient(135deg, #7B61FF, #00D4FF)" }}
          >
            <MessageContent content={msg.content} role="user" />
          </div>
          <div className="flex items-center gap-2 mr-1">
            {msg.tokens && (
              <span className="text-[9px] text-[#4A5570] font-mono">{msg.tokens} tok</span>
            )}
            <MessageTimestamp ts={msg.timestamp} />
          </div>
        </div>
      </div>
    );
  }

  // agent message
  return (
    <div
      className="flex gap-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {agent && (
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-1"
          style={{ background: `${agent.color}15`, border: `1px solid ${agent.color}30` }}
        >
          {agent.icon}
        </div>
      )}
      <div className="max-w-[78%] min-w-0">
        {agent && (
          <p className="text-[10px] text-[#6B7A99] mb-1 ml-1 font-semibold tracking-wide">
            {agent.name}
          </p>
        )}
        <div
          className="glass-card px-4 py-3 rounded-2xl rounded-tl-sm border border-[#1A2744]/60 relative"
          style={{ color: "#C8D0E0" }}
        >
          {hovered && (
            <div style={{ position: "absolute", top: 8, right: 10, zIndex: 10 }}>
              <CopyButton text={msg.content} />
            </div>
          )}
          <MessageContent content={msg.content} role="agent" />
        </div>
        <div className="flex items-center gap-2 ml-1 mt-1">
          {msg.tokens && (
            <span className="text-[9px] text-[#4A5570] font-mono">{msg.tokens} tok</span>
          )}
          <MessageTimestamp ts={msg.timestamp} />
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: "rgba(0,212,255,0.05)",
          border: "1px solid rgba(0,212,255,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
        }}
      >
        ◎
      </div>
      <div>
        <p className="text-[15px] font-semibold text-[#E8ECF4] mb-2">Sin conversaciones</p>
        <p className="text-[12px] text-[#6B7A99] leading-relaxed max-w-xs">
          Selecciona un agente y crea una nueva sesión para comenzar a conversar con el equipo de IA.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
        {["Analiza datos de ventas", "Redacta un email de seguimiento", "Planifica una campaña"].map(
          (hint) => (
            <div
              key={hint}
              className="px-3 py-2 rounded-lg border border-[#1A2744]/60 text-[11px] text-[#6B7A99] hover:text-[#E8ECF4] hover:border-[#00D4FF]/20 transition-all cursor-default"
            >
              {hint}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Main Chat Page ───────────────────────────────────────────────────────────
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
  const bottomRef = useRef<HTMLDivElement>(null);

  const session = chatSessions.find((c) => c.id === activeChatId);
  const currentAgent = session ? agents.find((a) => a.id === session.agentId) : null;
  const totalTokens = session?.messages.reduce((s, m) => s + (m.tokens ?? 0), 0) ?? 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length]);

  const handleSend = async (overrideText?: string) => {
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
  };

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

  return (
    <div className="flex h-full animate-fade-in">
      {/* Sessions list */}
      <div className="w-60 border-r border-[#1A2744]/60 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-[#1A2744]/60 flex-shrink-0">
          <h3 className="text-[12px] font-semibold text-[#E8ECF4] tracking-wider uppercase mb-3">
            Conversaciones
          </h3>
          <div className="space-y-2">
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="astraeo-input py-1.5 text-[11px]"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id} style={{ background: "#0A0F1F" }}>
                  {a.icon} {a.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => createChatSession(selectedAgent)}
              className="btn-primary w-full py-1.5 text-[11px] justify-center"
            >
              + Nueva sesión
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chatSessions.length === 0 && (
            <p className="text-[10px] text-[#6B7A99] text-center mt-6 px-2">
              No hay sesiones aún
            </p>
          )}
          {chatSessions.map((c) => {
            const ag = agents.find((a) => a.id === c.agentId);
            return (
              <div
                key={c.id}
                onClick={() => setActiveChat(c.id)}
                className={`p-2.5 rounded-xl cursor-pointer transition-all group relative ${
                  activeChatId === c.id
                    ? "bg-[#00D4FF]/08 border border-[#00D4FF]/20"
                    : "hover:bg-white/[0.03] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{ag?.icon ?? "◉"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#E8ECF4] truncate">{c.title}</p>
                    <p className="text-[10px] text-[#6B7A99] font-mono">{c.messages.length} msgs</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(c.id);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[10px] text-[#6B7A99] hover:text-[#FF4757] transition-all"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat main */}
      <div className="flex-1 flex flex-col min-w-0">
        {session ? (
          <>
            {/* Header */}
            <div className="h-12 border-b border-[#1A2744]/60 px-5 flex items-center gap-3 flex-shrink-0">
              {currentAgent && (
                <>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                    style={{
                      background: `${currentAgent.color}15`,
                      border: `1px solid ${currentAgent.color}30`,
                    }}
                  >
                    {currentAgent.icon}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#E8ECF4]">{currentAgent.name}</p>
                    <p className="text-[10px] text-[#6B7A99]">{currentAgent.role}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <span className="text-[10px] text-[#4A5570] font-mono">
                      {session.messages.length} msgs
                      {totalTokens > 0 && ` · ${totalTokens.toLocaleString()} tok`}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#6B7A99]">
                      <div
                        className={`w-1.5 h-1.5 rounded-full status-${currentAgent.status ?? "offline"}`}
                      />
                      <span className="capitalize font-mono">{currentAgent.status}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {session.messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-60">
                  <span className="text-4xl">{currentAgent?.icon}</span>
                  <p className="text-[13px] text-[#6B7A99]">
                    Inicia una conversación con {currentAgent?.name}
                  </p>
                  <p className="text-[10px] text-[#4A5570] font-mono">
                    Responde con markdown: **negrita**, `código`, listas y más
                  </p>
                </div>
              )}
              {session.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  agents={useAstraeo.getState().agents}
                />
              ))}
              {sending && (
                <div className="flex gap-3">
                  <div
                    className="w-7 h-7 rounded-lg bg-[#00D4FF]/10 flex items-center justify-center text-sm border border-[#00D4FF]/20 flex-shrink-0"
                  >
                    {currentAgent?.icon}
                  </div>
                  <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3 border border-[#1A2744]/60">
                    <div className="flex gap-1.5 items-center h-4">
                      {[0, 0.16, 0.32].map((d, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]"
                          style={{
                            animation: "bounceTyping 1.4s infinite ease-in-out both",
                            animationDelay: `${-d}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {lastError && !sending && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[#FF4757]/30 bg-[#FF4757]/05 text-[11px] text-[#FF4757]">
                    <span>Error al enviar mensaje</span>
                    <button
                      onClick={handleRetry}
                      className="px-3 py-1 rounded-lg border border-[#FF4757]/40 hover:bg-[#FF4757]/10 transition-all font-semibold"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#1A2744]/60 flex-shrink-0">
              <div className="flex gap-3 items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Mensaje para ${currentAgent?.name ?? "el agente"}...`}
                  rows={1}
                  className="astraeo-input flex-1 resize-none max-h-32"
                  style={{ minHeight: 42 }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sending}
                  className="btn-primary px-4 py-2.5 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ▶
                </button>
              </div>
              <p className="text-[10px] text-[#4A5570] mt-2 ml-1">
                Enter para enviar · Shift+Enter para nueva línea
              </p>
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
