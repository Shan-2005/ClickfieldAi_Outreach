import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, X, Send, Mic, MicOff, Sparkles, Terminal, CheckCircle2,
  AlertCircle, ArrowRight, Download, Users, Mail, Phone, ExternalLink,
  RefreshCw, CornerDownLeft, ShieldCheck, Zap, Copy, Check, Building2
} from 'lucide-react';
import { getOutlookWebComposeUrl } from '../utils/outlook';

// Helper to render bold, italic, code, and links inside text
function renderInlineText(text) {
  if (!text) return null;

  // Split on bold, code, and italic markers
  const tokens = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={match.index} className="text-white font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 font-mono text-[11px] border border-zinc-700/60">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push(
        <em key={match.index} className="text-zinc-300 italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens.length > 0 ? tokens : text;
}

// Full Markdown-like Structured Content Renderer
function MarkdownRenderer({ content, onCopyCode, copiedCodeKey }) {
  if (!content) return null;

  // Check if content has code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-1.5 text-xs text-zinc-200 leading-relaxed font-sans">
      {parts.map((part, pIdx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const codeText = lines[0].match(/^[a-z]+$/i) ? lines.slice(1).join('\n') : lines.join('\n');
          const codeKey = `block_${pIdx}`;
          return (
            <div key={pIdx} className="my-2 p-3 bg-zinc-950/90 border border-zinc-800 rounded-xl font-mono text-[11px] text-zinc-300 relative group overflow-x-auto">
              {onCopyCode && (
                <button
                  onClick={() => onCopyCode(codeText, codeKey)}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] cursor-pointer transition-colors"
                >
                  {copiedCodeKey === codeKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCodeKey === codeKey ? 'Copied' : 'Copy'}</span>
                </button>
              )}
              <pre className="whitespace-pre-wrap">{codeText}</pre>
            </div>
          );
        }

        const lines = part.split('\n');
        return (
          <div key={pIdx} className="space-y-1">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lIdx} className="h-1" />;

              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={lIdx} className="text-xs font-bold text-emerald-400 mt-2 mb-1 pt-1 border-b border-zinc-800/80 flex items-center gap-1.5 font-sans">
                    <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{trimmed.slice(4)}</span>
                  </h4>
                );
              }

              if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 my-0.5 pl-1">
                    <span className="text-emerald-400 font-bold shrink-0 leading-tight">•</span>
                    <span className="flex-1 leading-relaxed">{renderInlineText(trimmed.slice(2))}</span>
                  </div>
                );
              }

              const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 my-0.5 pl-1">
                    <span className="text-emerald-400 font-mono font-bold shrink-0">{numMatch[1]}.</span>
                    <span className="flex-1 leading-relaxed">{renderInlineText(numMatch[2])}</span>
                  </div>
                );
              }

              return (
                <p key={lIdx} className="my-0.5 leading-relaxed text-zinc-300">
                  {renderInlineText(trimmed)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function RadarAssistantModal({ isOpen, onClose, onNavigateToOutreach }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "### Clickfield Radar Active\n\nI am directly connected to your local database of **194 Chennai SMBs (< 50 staff)** and our Outreach ML synthesis engine.\n\nAsk me for an owner lookup, cold email draft, cluster search, or daily batch operation:",
      action: 'SYSTEM_OVERVIEW',
      data: {
        supported_commands: [
          "Who is the owner of AB Leatherware?",
          "Draft cold email for AB Leatherware",
          "Find 5 precision machine shops in Ambattur with email",
          "How many leads have verified owners?",
          "Generate today's 15 emails",
          "Show today's email queue"
        ]
      }
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleCopyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Voice recognition support (Web Speech API)
  const handleToggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please type your command.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSendCommand(transcript);
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition error', err);
      setIsListening(false);
    }
  };

  const handleSendCommand = async (commandText) => {
    const cmd = (commandText || input).trim();
    if (!cmd || loading) return;

    // Add user message to thread
    const newMessages = [...messages, { role: 'user', text: cmd }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.message || "Command executed successfully.",
          action: data.action,
          data: data.data
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: "An error occurred while executing your command. Please verify backend connectivity.",
          action: 'ERROR'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl h-[88vh] max-h-[780px] bg-zinc-950/95 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 p-0.5 shadow-md shadow-emerald-500/20">
              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Radar AI Assistant</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Grounded
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Direct lookup across 194 Chennai SMBs, MCA Directors, and Outreach ML
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl p-4 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-zinc-900/90 border border-zinc-800/90 text-zinc-200 shadow-sm'
                }`}
              >
                {/* Formatted Text Content */}
                <MarkdownRenderer
                  content={m.text}
                  onCopyCode={handleCopyText}
                  copiedCodeKey={copiedKey}
                />

                {/* Rich Widget: DRAFT_EMAIL Result */}
                {m.action === 'DRAFT_EMAIL' && m.data?.pitch && (
                  <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Outreach Copy Ready
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                        Strict &lt; 80 Words Enforced
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {m.data.outlook_url && (
                        <a
                          href={m.data.outlook_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                          title="Open directly in Outlook Web (outlook.cloud.microsoft) in Chrome"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open in Outlook Web
                        </a>
                      )}

                      <button
                        onClick={() =>
                          handleCopyText(
                            `Subject: ${m.data.pitch.subject}\n\n${m.data.pitch.body}`,
                            `pitch_${idx}`
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                      >
                        {copiedKey === `pitch_${idx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copiedKey === `pitch_${idx}` ? 'Copied Pitch' : 'Copy Pitch'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Rich Widget: COMPANY_LOOKUP Result */}
                {m.action === 'COMPANY_LOOKUP' && m.data?.lead && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-800 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleSendCommand(`Draft email for ${m.data.lead.name}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      ⚡ Draft Cold Pitch for this Company
                    </button>
                    {m.data.lead.email && (
                      <a
                        href={getOutlookWebComposeUrl(m.data.lead.email)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Draft in Outlook Web
                      </a>
                    )}
                  </div>
                )}

                {/* Rich Widget: Generate Emails Result */}
                {m.action === 'GENERATE_DAILY_EMAILS' && m.data?.items && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
                      <span>Generated {m.data.total} Outreach Emails</span>
                      {onNavigateToOutreach && (
                        <button
                          onClick={() => {
                            onNavigateToOutreach();
                            onClose();
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors cursor-pointer"
                        >
                          View in Daily 15 Tab
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {m.data.items.slice(0, 5).map((item, i) => (
                        <div key={i} className="p-2 bg-zinc-950/80 rounded-lg border border-zinc-800 text-[11px] flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white">#{item.batch_index} {item.company_name}</span>
                            <a
                              href={getOutlookWebComposeUrl(item.recipient_email, item.subject, item.body)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-400 hover:text-white underline text-[10px] block"
                              title="Draft in Outlook Web (outlook.cloud.microsoft)"
                            >
                              {item.recipient_email}
                            </a>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/15 text-emerald-300">
                            Reply Yes CTA
                          </span>
                        </div>
                      ))}
                      {m.data.items.length > 5 && (
                        <div className="text-[10px] text-zinc-500 text-center">
                          + {m.data.items.length - 5} more companies in queue
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rich Widget: Search Leads Result */}
                {m.action === 'SEARCH_LEADS' && m.data?.matches && m.data.matches.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-400">
                      <span>Found {m.data.matches.length} Qualified SMBs</span>
                      <span className="text-[10px] text-zinc-500">All &lt; 50 Staff</span>
                    </div>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {m.data.matches.map((lead, i) => (
                        <div key={i} className="p-2.5 bg-zinc-950/90 rounded-xl border border-zinc-800 text-[11px] flex items-center justify-between gap-2">
                          <div className="space-y-0.5 truncate flex-1">
                            <span className="font-bold text-white truncate block">{lead.name}</span>
                            <div className="text-zinc-400 text-[10px]">
                              {lead.area} • {lead.category}
                            </div>
                            {lead.owner_name && lead.owner_name !== 'Not Disclosed Online' && (
                              <div className="text-purple-300 text-[10px] flex items-center gap-1">
                                <span>Owner:</span>
                                <strong className="font-medium text-white">{lead.owner_name}</strong>
                                <span className="text-zinc-500">({lead.owner_designation || 'Director'})</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleSendCommand(`Draft email for ${lead.name}`)}
                              className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors"
                              title="Draft personalized cold pitch"
                            >
                              ⚡ Pitch
                            </button>
                            {lead.email && (
                              <a
                                href={getOutlookWebComposeUrl(lead.email)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-semibold cursor-pointer"
                                title="Draft in Outlook Web"
                              >
                                Mail
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rich Widget: Export CSV Result */}
                {m.action === 'EXPORT_CSV' && m.data?.download_url && (
                  <div className="mt-3 pt-2 border-t border-zinc-800">
                    <a
                      href={m.data.download_url}
                      download={m.data.filename}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download {m.data.filename}
                    </a>
                  </div>
                )}

                {/* Rich Widget: Quick Suggestion Chips */}
                {m.data?.supported_commands && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-800/80 space-y-1.5">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">Suggested Commands:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.data.supported_commands.map((cmd, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendCommand(cmd)}
                          className="px-2.5 py-1 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] transition-colors cursor-pointer text-left"
                        >
                          ⚡ {cmd}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-zinc-400 text-xs p-2">
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span>Querying database and synthesizing response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-zinc-900 border-t border-zinc-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendCommand();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border-zinc-700'
              }`}
              title={isListening ? 'Listening... click to stop' : 'Click to speak command'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening to your voice..." : "Ask a question (e.g. 'Who is the owner of AB Leatherware?' or 'Draft an email')..."}
              className="flex-1 px-4 py-2 bg-zinc-950 border border-zinc-700/80 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-all cursor-pointer shadow-sm shadow-emerald-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
