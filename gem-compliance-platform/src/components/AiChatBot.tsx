'use client';

import { useState, useRef, useEffect } from 'react';
import {
  GemAiIcon,
  CloseIcon,
  MinimizeIcon,
  SendIcon,
  RefreshIcon,
  SparkIcon,
  FlipSideIcon,
} from '@/components/icons';
import type { Role } from '@/lib/session';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

type PositionMode = 'bottom-right' | 'bottom-left';
type ThemeMode = 'light' | 'dark';

const QUICK_PROMPTS = [
  '🔍 Real vs. Simulated?',
  '⚠️ Why did Swift fail?',
  '⚖️ Explain CA Waivers & MII',
  '👨‍⚖️ What to tell the Proctor/Judges?',
  '📊 Summarize high-risk bidders',
];

export function AiChatBot({ role, userName }: { role?: Role; userName?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [position, setPosition] = useState<PositionMode>('bottom-right');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: `**Namaste! I am your GeM AI Compliance Copilot.**

I analyze the platform's live database, statutory rules engine, real algorithms, and all 10 GeM bids in real-time.

Ask me anything about:
- **Live Bidders & Tenders**: Inspect any bidder's current score, risk tier, or status.
- **Real vs. Simulated**: Mod-36 checksums, PAN decoding, Vision OCR, and DigiLocker.
- **Proctor & Judge Defense**: Authoritative technical answers for SIH evaluators.`,
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Load saved preferences if available
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('gem_chat_theme_mode') as ThemeMode;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      } else {
        setTheme('light');
      }
      const savedPos = localStorage.getItem('gem_chat_pos') as PositionMode;
      if (savedPos === 'bottom-left' || savedPos === 'bottom-right') {
        setPosition(savedPos);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      localStorage.setItem('gem_chat_theme_mode', next);
    } catch {}
  };

  const toggleCorner = () => {
    const nextPos: PositionMode = position === 'bottom-right' ? 'bottom-left' : 'bottom-right';
    setPosition(nextPos);
    try {
      localStorage.setItem('gem_chat_pos', nextPos);
    } catch {}
  };

  async function handleSend(textToSend?: string) {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          role,
          userName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get response');

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Connection issue:** ${err.message || 'Unable to connect to AI server.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: 'assistant',
        content: `Chat history reset. How can I assist you with the GeM Compliance verification platform?`,
        timestamp: 'Just now',
      },
    ]);
  }

  const isLight = theme === 'light';

  return (
    <>
      {/* ========================================================================= */}
      {/* FLOATING TRIGGER BUTTON (CLEAN, 100% RELIABLE CLICK, NO EXTRA BLOAT)      */}
      {/* ========================================================================= */}
      <div
        className={`fixed bottom-5 z-50 flex items-center gap-2 ${
          position === 'bottom-left' ? 'left-5' : 'right-5'
        }`}
      >
        <button
          id="gem-ai-chat-toggle"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          aria-label={isOpen ? 'Close GeM AI Copilot' : 'Open GeM AI Copilot'}
          className={`group relative flex h-12 w-12 items-center justify-center rounded-full shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
            isLight
              ? 'bg-gradient-to-tr from-[#000080] via-[#0b2545] to-[#133e68] text-white ring-2 ring-amber-400 shadow-navy/30'
              : 'bg-gradient-to-tr from-slate-900 via-indigo-950 to-cyan-700 text-white ring-2 ring-cyan-400 shadow-black/50'
          }`}
        >
          {isOpen ? (
            <CloseIcon className="h-5 w-5 text-white transition-transform group-hover:rotate-90" />
          ) : (
            <div className="relative flex items-center justify-center">
              <GemAiIcon className="h-6 w-6 text-white transition-transform group-hover:scale-110" />
              {/* Pulsing indicator node */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400 border-2 border-slate-900" />
              </span>
            </div>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CHAT WINDOW (PRIMARY CLEAN LIGHT THEME WITH OPTIONAL DARK MODE)           */}
      {/* ========================================================================= */}
      {isOpen && (
        <section
          aria-label="GeM AI Compliance Copilot Dialog"
          className={`fixed bottom-20 z-50 flex h-[600px] w-[420px] max-h-[calc(100vh-6rem)] max-w-[calc(100vw-2rem)] flex-col rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            position === 'bottom-left' ? 'left-5' : 'right-5'
          } ${
            isLight
              ? 'bg-white border border-slate-300 text-slate-800 shadow-slate-900/25'
              : 'bg-[#0b1322]/98 border border-slate-700 text-slate-100 shadow-black/60 backdrop-blur-xl'
          }`}
        >
          {/* Header */}
          <header
            className={`flex items-center justify-between border-b px-4 py-3 ${
              isLight
                ? 'bg-gradient-to-r from-[#000080] via-[#0b2545] to-[#000080] text-white border-slate-200'
                : 'bg-gradient-to-r from-[#070e1b] via-[#0f1d33] to-[#070e1b] text-white border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-amber-400/50 shadow-inner">
                <GemAiIcon className="h-4 w-4 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-heading text-xs font-bold leading-none text-white tracking-wide">
                    GeM AI Copilot
                  </h3>
                  <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300 border border-amber-400/30">
                    SIH26100
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-slate-200">Official Decision Intelligence</span>
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1">
              {/* Theme Toggle (Light / Dark) */}
              <button
                type="button"
                onClick={toggleTheme}
                title={isLight ? 'Switch to Dark theme' : 'Switch to Light theme'}
                className="rounded px-2 py-1 text-[11px] font-semibold text-white/90 hover:bg-white/15 hover:text-white transition-colors flex items-center gap-1"
                aria-label="Toggle Theme"
              >
                <span>{isLight ? '🌙 Dark' : '☀️ Light'}</span>
              </button>

              {/* Move to other corner */}
              <button
                type="button"
                onClick={toggleCorner}
                title={position === 'bottom-right' ? 'Move chat to left side' : 'Move chat to right side'}
                className="rounded p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                aria-label="Switch side"
              >
                <FlipSideIcon className="h-3.5 w-3.5" />
              </button>

              {/* Reset chat */}
              <button
                type="button"
                onClick={handleReset}
                title="Reset conversation"
                className="rounded p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                aria-label="Reset chat"
              >
                <RefreshIcon className="h-3.5 w-3.5" />
              </button>

              {/* Minimize / Close */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat window"
                className="rounded p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                aria-label="Close"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Quick Prompt Chips */}
          <div
            className={`border-b px-3 py-2 overflow-x-auto ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080f1a] border-slate-800'
            }`}
          >
            <div className="flex gap-1.5 w-max">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(qp)}
                  disabled={loading}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shadow-2xs ${
                    isLight
                      ? 'bg-white border border-slate-300 text-slate-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300'
                      : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Stream */}
          <div
            className={`flex-1 overflow-y-auto p-4 space-y-3.5 ${
              isLight ? 'bg-[#f8fafc]' : 'bg-[#09111c]'
            }`}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-xl p-3.5 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#000080] text-white rounded-br-none shadow-sm'
                      : isLight
                      ? 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-none shadow-xs'
                      : 'bg-slate-800/90 text-slate-100 border border-slate-700 rounded-bl-none shadow-sm'
                  }`}
                >
                  <div className="space-y-2 whitespace-pre-wrap font-sans font-normal">
                    {m.content}
                  </div>
                </div>
                <span className="mt-1 text-[9px] text-slate-400 px-1 font-mono">
                  {m.timestamp}
                </span>
              </div>
            ))}

            {loading && (
              <div
                className={`flex items-center gap-2 rounded-xl rounded-bl-none p-3 max-w-[88%] text-xs shadow-xs ${
                  isLight
                    ? 'bg-white border border-slate-200 text-slate-700'
                    : 'bg-slate-800 border border-slate-700 text-slate-200'
                }`}
              >
                <SparkIcon className="h-4 w-4 animate-spin text-amber-600" />
                <span>Consulting live database & generating authoritative analysis...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <footer
            className={`border-t p-3 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#080f1a] border-slate-800'
            }`}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about live bidders, scores, or statutory rules…"
                disabled={loading}
                className={`flex-1 rounded-lg px-3.5 py-2 text-xs focus:outline-none transition-colors ${
                  isLight
                    ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-navy focus:ring-1 focus:ring-navy'
                    : 'bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'
                }`}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send Message"
                className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg bg-[#000080] hover:bg-[#0b2545] text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-30 shadow-sm cursor-pointer"
              >
                <SendIcon className="h-3.5 w-3.5 text-amber-300" />
              </button>
            </form>
            <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-slate-400">
              <span>Theme: {isLight ? 'Government Institutional Light' : 'Dark Mode'}</span>
              <span className="font-mono text-slate-400">CPCL · SIH26100</span>
            </div>
          </footer>
        </section>
      )}
    </>
  );
}
