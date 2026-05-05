"use client";
import { useState, useRef, useEffect } from "react";
import { useAstraeo } from "@/store/astraeo";
import type { ChatMessage } from "@/lib/types";

export default function Chat() {
  const { chatSessions, activeChatId, setActiveChat, sendMessage, createChatSession, deleteChat, agents } = useAstraeo();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(agents[0]?.id ?? "");
  const bottomRef = useRef<HTMLDivElement>(null);

  const session = chatSessions.find((c) => c.id === activeChatId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length]);

  const handleSend = async () => {
    if (!input.trim() || !session || sending) return;
    const txt = input.trim();
    setInput("");
    setSending(true);
    await sendMessage(session.id, txt, session.agentId);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex h-full animate-fade-in">
      {/* Sessions list */}
      <div className="w-60 border-r border-[#1A2744]/60 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-[#1A2744]/60 flex-shrink-0">
          <h3 className="text-[12px] font-semibold text-[#E8ECF4] tracking-wider uppercase mb-3">Conversaciones</h3>
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
          {chatSessions.map((c) => {
            const agent = agents.find((a) => a.id === c.agentId);
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
                  <span className="text-sm">{agent?.icon ?? "◉"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#E8ECF4] truncate">{c.title}</p>
                    <p className="text-[10px] text-[#6B7A99] font-mono">{c.messages.length} msgs</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }}
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
              {(() => {
                const agent = agents.find((a) => a.id === session.agentId);
                return (
                  <>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                      style={{ background: `${agent?.color ?? "#00D4FF"}15`, border: `1px solid ${agent?.color ?? "#00D4FF"}30` }}
                    >
                      {agent?.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-[#E8ECF4]">{agent?.name}</p>
                      <p className="text-[10px] text-[#6B7A99]">{agent?.role}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 text-[10px] text-[#6B7A99]">
                      <div className={`w-1.5 h-1.5 rounded-full status-${agent?.status ?? "offline"}`} />
                      <span className="capitalize font-mono">{agent?.status}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {session.messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-50">
                  <span className="text-4xl">{agents.find((a) => a.id === session.agentId)?.icon}</span>
                  <p className="text-[13px] text-[#6B7A99]">Inicia una conversación con {agents.find((a) => a.id === session.agentId)?.name}</p>
                </div>
              )}
              {session.messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} agents={useAstraeo.getState().agents} />
              ))}
              {sending && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#00D4FF]/10 flex items-center justify-center text-sm border border-[#00D4FF]/20 flex-shrink-0">
                    {agents.find((a) => a.id === session.agentId)?.icon}
                  </div>
                  <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3 border border-[#1A2744]/60">
                    <div className="flex gap-1.5 items-center h-4">
                      {[0, 0.16, 0.32].map((d, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]"
                          style={{ animation: `bounceTyping 1.4s infinite ease-in-out both`, animationDelay: `${-d}s` }}
                        />
                      ))}
                    </div>
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
                  placeholder={`Mensaje para ${agents.find((a) => a.id === session.agentId)?.name}...`}
                  rows={1}
                  className="astraeo-input flex-1 resize-none max-h-32"
                  style={{ minHeight: 42 }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="btn-primary px-4 py-2.5 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ▶
                </button>
              </div>
              <p className="text-[10px] text-[#6B7A99] mt-2 ml-1">Enter para enviar · Shift+Enter para nueva línea</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
            <span className="text-5xl">◎</span>
            <p className="text-[14px] text-[#6B7A99]">Selecciona o crea una conversación</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg, agents }: { msg: ChatMessage; agents: ReturnType<typeof useAstraeo.getState>["agents"] }) {
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
      <div className="flex justify-end">
        <div
          className="max-w-[72%] px-4 py-3 rounded-2xl rounded-br-sm text-[13px] leading-relaxed text-white"
          style={{ background: "linear-gradient(135deg, #7B61FF, #00D4FF)" }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {agent && (
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-1"
          style={{ background: `${agent.color}15`, border: `1px solid ${agent.color}30` }}
        >
          {agent.icon}
        </div>
      )}
      <div className="max-w-[72%]">
        {agent && (
          <p className="text-[10px] text-[#6B7A99] mb-1 ml-1 font-semibold tracking-wide">{agent.name}</p>
        )}
        <div className="glass-card px-4 py-3 rounded-2xl rounded-tl-sm border border-[#1A2744]/60 text-[13px] leading-relaxed text-[#E8ECF4] whitespace-pre-wrap">
          {msg.content}
        </div>
        {msg.tokens && (
          <p className="text-[9px] text-[#6B7A99] mt-1 ml-1 font-mono">{msg.tokens} tokens</p>
        )}
      </div>
    </div>
  );
}
