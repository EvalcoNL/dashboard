"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    MessageCircle, Send, Plus, History, Sparkles, BarChart3,
    Table, Bot, User, Loader2, ChevronLeft, Trash2
} from "lucide-react";

type Message = {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    chartData?: ChartData | null;
    dataTable?: DataTable | null;
};

type ChartData = {
    type: "line" | "bar";
    labels: string[];
    datasets: { label: string; data: number[]; color: string }[];
};

type DataTable = {
    headers: string[];
    rows: string[][];
};

type ChatSession = {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
};

export default function AiDataChat({ projectId }: { projectId: string }) {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load sessions on mount
    useEffect(() => {
        fetchSessions();
    }, [projectId]);

    const fetchSessions = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/ai-chat`);
            if (res.ok) {
                const data = await res.json();
                setSessions(data);
            }
        } catch (err) {
            console.error("Failed to fetch sessions:", err);
        }
    };

    const loadSession = async (sessionId: string) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/ai-chat?sessionId=${sessionId}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
                setActiveSessionId(sessionId);
            }
        } catch (err) {
            console.error("Failed to load session:", err);
        }
    };

    const startNewChat = () => {
        setActiveSessionId(null);
        setMessages([]);
        setInput("");
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput("");
        setLoading(true);

        setMessages((prev) => [
            ...prev,
            { role: "user", content: userMessage, timestamp: new Date().toISOString() },
        ]);

        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

        try {
            const res = await fetch(`/api/projects/${projectId}/ai-chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage, sessionId: activeSessionId }),
            });

            if (res.ok) {
                const data = await res.json();
                setActiveSessionId(data.sessionId);
                setMessages((prev) => [...prev, data.message]);
                fetchSessions(); // refresh sidebar
            } else {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: "Er is een fout opgetreden. Probeer het opnieuw.",
                        timestamp: new Date().toISOString(),
                    },
                ]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Verbindingsfout. Controleer je internetverbinding.",
                    timestamp: new Date().toISOString(),
                },
            ]);
        } finally {
            setLoading(false);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const suggestedQuestions = [
        "Wat zijn de KPI's van de afgelopen 30 dagen?",
        "Hoe staat het met de kosten en CPA?",
        "Welke campagnes presteren het best?",
    ];

    return (
        <div className="ai-chat-container">
            {/* Session Sidebar */}
            {showSidebar && (
                <aside className="chat-sidebar">
                    <div className="sidebar-header">
                        <h3><Sparkles size={16} /> AI Data Chat</h3>
                        <button className="new-chat-btn" onClick={startNewChat}>
                            <Plus size={16} /> Nieuw
                        </button>
                    </div>

                    <div className="session-list">
                        {sessions.map((s) => (
                            <button
                                key={s.id}
                                className={`session-item ${activeSessionId === s.id ? "active" : ""}`}
                                onClick={() => loadSession(s.id)}
                            >
                                <MessageCircle size={14} />
                                <span className="session-title">{s.title}</span>
                                <span className="session-date">
                                    {new Date(s.updatedAt).toLocaleDateString("nl-NL", {
                                        day: "numeric",
                                        month: "short",
                                    })}
                                </span>
                            </button>
                        ))}
                        {sessions.length === 0 && (
                            <div className="empty-sessions">
                                <History size={20} />
                                <span>Geen eerdere chats</span>
                            </div>
                        )}
                    </div>
                </aside>
            )}

            {/* Main Chat Area */}
            <main className="chat-main">
                <div className="chat-header-bar">
                    <button
                        className="toggle-sidebar"
                        onClick={() => setShowSidebar(!showSidebar)}
                    >
                        <ChevronLeft
                            size={18}
                            style={{ transform: showSidebar ? "none" : "rotate(180deg)" }}
                        />
                    </button>
                    <div>
                        <h2>
                            {activeSessionId
                                ? sessions.find((s) => s.id === activeSessionId)?.title || "Chat"
                                : "Nieuwe Chat"}
                        </h2>
                        <span>Stel vragen over je project data</span>
                    </div>
                </div>

                <div className="messages-area">
                    {messages.length === 0 && (
                        <div className="welcome-state">
                            <div className="welcome-icon">
                                <Sparkles size={32} />
                            </div>
                            <h3>AI Data Assistent</h3>
                            <p>
                                Stel vragen over je campagne data, performance metrics, kosten en
                                meer. Ik analyseer je ClickHouse data en geef inzichten.
                            </p>
                            <div className="suggested-questions">
                                {suggestedQuestions.map((q, i) => (
                                    <button
                                        key={i}
                                        className="suggestion"
                                        onClick={() => {
                                            setInput(q);
                                        }}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className={`message ${msg.role}`}>
                            <div className="msg-avatar">
                                {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className="msg-content">
                                <div
                                    className="msg-text"
                                    dangerouslySetInnerHTML={{
                                        __html: formatMarkdown(msg.content),
                                    }}
                                />

                                {msg.chartData && <InlineChart data={msg.chartData} />}
                                {msg.dataTable && <InlineTable data={msg.dataTable} />}

                                <span className="msg-time">
                                    {new Date(msg.timestamp).toLocaleTimeString("nl-NL", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="message assistant">
                            <div className="msg-avatar">
                                <Bot size={16} />
                            </div>
                            <div className="msg-content typing">
                                <div className="typing-indicator">
                                    <span /><span /><span />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="chat-input-area">
                    <div className="input-wrapper">
                        <textarea
                            placeholder="Stel een vraag over je data..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            disabled={loading}
                        />
                        <button
                            className="send-btn"
                            onClick={sendMessage}
                            disabled={!input.trim() || loading}
                        >
                            {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                        </button>
                    </div>
                    <p className="input-hint">
                        Druk Enter om te versturen · Shift+Enter voor nieuwe regel
                    </p>
                </div>
            </main>

            <style jsx>{`
                .ai-chat-container {
                    display: flex;
                    height: calc(100vh - 80px);
                    background: #0f172a;
                    border-radius: 16px;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.06);
                }

                /* Sidebar */
                .chat-sidebar {
                    width: 260px;
                    background: rgba(15, 23, 42, 0.6);
                    border-right: 1px solid rgba(255, 255, 255, 0.06);
                    display: flex;
                    flex-direction: column;
                    flex-shrink: 0;
                }

                .sidebar-header {
                    padding: 16px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .sidebar-header h3 {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #e2e8f0;
                    margin: 0;
                }

                .new-chat-btn {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #a5b4fc;
                    background: rgba(99, 102, 241, 0.12);
                    border: none;
                    padding: 6px 10px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .new-chat-btn:hover {
                    background: rgba(99, 102, 241, 0.2);
                }

                .session-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }

                .session-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    width: 100%;
                    padding: 10px 12px;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    color: #94a3b8;
                    font-size: 0.8125rem;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.15s;
                    margin-bottom: 2px;
                }

                .session-item:hover {
                    background: rgba(255, 255, 255, 0.04);
                    color: #e2e8f0;
                }

                .session-item.active {
                    background: rgba(99, 102, 241, 0.12);
                    color: #a5b4fc;
                }

                .session-title {
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .session-date {
                    font-size: 0.7rem;
                    color: #475569;
                    flex-shrink: 0;
                }

                .empty-sessions {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    padding: 32px 16px;
                    color: #475569;
                    font-size: 0.8125rem;
                }

                /* Main Chat */
                .chat-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                }

                .chat-header-bar {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                }

                .chat-header-bar h2 {
                    font-size: 0.9375rem;
                    font-weight: 600;
                    color: #f8fafc;
                    margin: 0;
                }

                .chat-header-bar span {
                    font-size: 0.75rem;
                    color: #64748b;
                }

                .toggle-sidebar {
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 8px;
                    padding: 6px;
                    color: #94a3b8;
                    cursor: pointer;
                    display: flex;
                    transition: all 0.2s;
                }

                .toggle-sidebar:hover {
                    background: rgba(255, 255, 255, 0.08);
                    color: #e2e8f0;
                }

                .messages-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                /* Welcome */
                .welcome-state {
                    margin: auto;
                    text-align: center;
                    max-width: 480px;
                    padding: 40px 20px;
                }

                .welcome-icon {
                    display: inline-flex;
                    padding: 20px;
                    background: rgba(99, 102, 241, 0.12);
                    border-radius: 50%;
                    color: #a5b4fc;
                    margin-bottom: 20px;
                }

                .welcome-state h3 {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #f8fafc;
                    margin: 0 0 8px;
                }

                .welcome-state p {
                    color: #94a3b8;
                    font-size: 0.875rem;
                    line-height: 1.6;
                    margin: 0 0 24px;
                }

                .suggested-questions {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .suggestion {
                    padding: 12px 16px;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 12px;
                    color: #e2e8f0;
                    font-size: 0.8125rem;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .suggestion:hover {
                    border-color: rgba(99, 102, 241, 0.3);
                    background: rgba(99, 102, 241, 0.08);
                }

                /* Messages */
                .message {
                    display: flex;
                    gap: 12px;
                    max-width: 85%;
                }

                .message.user {
                    margin-left: auto;
                    flex-direction: row-reverse;
                }

                .msg-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .message.assistant .msg-avatar {
                    background: rgba(99, 102, 241, 0.15);
                    color: #a5b4fc;
                }

                .message.user .msg-avatar {
                    background: rgba(16, 185, 129, 0.15);
                    color: #6ee7b7;
                }

                .msg-content {
                    background: rgba(30, 41, 59, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 14px;
                    padding: 12px 16px;
                    min-width: 0;
                }

                .message.user .msg-content {
                    background: rgba(99, 102, 241, 0.12);
                    border-color: rgba(99, 102, 241, 0.2);
                }

                .msg-text {
                    font-size: 0.875rem;
                    line-height: 1.6;
                    color: #e2e8f0;
                    word-wrap: break-word;
                }

                .msg-time {
                    display: block;
                    font-size: 0.65rem;
                    color: #475569;
                    margin-top: 6px;
                }

                .typing .typing-indicator {
                    display: flex;
                    gap: 4px;
                    padding: 4px 0;
                }

                .typing-indicator span {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #64748b;
                    animation: blink 1.4s infinite both;
                }

                .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
                .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

                @keyframes blink {
                    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                    40% { opacity: 1; transform: scale(1); }
                }

                /* Input Area */
                .chat-input-area {
                    padding: 16px 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.06);
                }

                .input-wrapper {
                    display: flex;
                    align-items: flex-end;
                    gap: 10px;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 14px;
                    padding: 10px 12px;
                    transition: border-color 0.2s;
                }

                .input-wrapper:focus-within {
                    border-color: rgba(99, 102, 241, 0.4);
                }

                .input-wrapper textarea {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: #f8fafc;
                    font-size: 0.875rem;
                    resize: none;
                    outline: none;
                    line-height: 1.5;
                    max-height: 120px;
                    font-family: inherit;
                }

                .send-btn {
                    background: #6366f1;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }

                .send-btn:hover:not(:disabled) {
                    background: #4f46e5;
                    transform: scale(1.05);
                }

                .send-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }

                .input-hint {
                    font-size: 0.7rem;
                    color: #475569;
                    margin: 8px 0 0 4px;
                }
            `}</style>
        </div>
    );
}

// ─── Inline Visualizations ──────────────────────────────────

function InlineChart({ data }: { data: ChartData }) {
    const maxVal = Math.max(...data.datasets.flatMap((d) => d.data), 1);
    const barWidth = 100 / data.labels.length;

    return (
        <div className="inline-chart">
            <div className="chart-legend">
                {data.datasets.map((ds, i) => (
                    <span key={i} className="legend-item">
                        <span className="legend-dot" style={{ background: ds.color }} />
                        {ds.label}
                    </span>
                ))}
            </div>
            <div className="chart-area">
                {data.type === "bar" ? (
                    <div className="bar-chart">
                        {data.labels.map((label, idx) => (
                            <div key={idx} className="bar-group">
                                {data.datasets.map((ds, dIdx) => (
                                    <div
                                        key={dIdx}
                                        className="bar"
                                        style={{
                                            height: `${(ds.data[idx] / maxVal) * 100}%`,
                                            background: ds.color,
                                        }}
                                        title={`${ds.label}: ${ds.data[idx]}`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                ) : (
                    <svg className="line-chart" viewBox="0 0 400 120" preserveAspectRatio="none">
                        {data.datasets.map((ds, dIdx) => {
                            const points = ds.data.map((val, i) => {
                                const x = (i / Math.max(ds.data.length - 1, 1)) * 400;
                                const y = 120 - (val / maxVal) * 110;
                                return `${x},${y}`;
                            }).join(" ");
                            return (
                                <polyline
                                    key={dIdx}
                                    points={points}
                                    fill="none"
                                    stroke={ds.color}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            );
                        })}
                    </svg>
                )}
            </div>
            <style jsx>{`
                .inline-chart {
                    margin-top: 12px;
                    padding: 16px;
                    background: rgba(15, 23, 42, 0.4);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.04);
                }
                .chart-legend {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 12px;
                }
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.75rem;
                    color: #94a3b8;
                }
                .legend-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }
                .chart-area {
                    height: 120px;
                }
                .bar-chart {
                    display: flex;
                    align-items: flex-end;
                    gap: 2px;
                    height: 100%;
                }
                .bar-group {
                    flex: 1;
                    display: flex;
                    align-items: flex-end;
                    gap: 1px;
                    height: 100%;
                }
                .bar {
                    flex: 1;
                    border-radius: 2px 2px 0 0;
                    min-height: 2px;
                    transition: height 0.3s ease;
                }
                .line-chart {
                    width: 100%;
                    height: 100%;
                }
            `}</style>
        </div>
    );
}

function InlineTable({ data }: { data: DataTable }) {
    return (
        <div className="inline-table">
            <table>
                <thead>
                    <tr>
                        {data.headers.map((h, i) => (
                            <th key={i}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                                <td key={cIdx}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <style jsx>{`
                .inline-table {
                    margin-top: 12px;
                    overflow-x: auto;
                    border-radius: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.04);
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.8125rem;
                }
                th {
                    text-align: left;
                    padding: 8px 12px;
                    font-weight: 600;
                    color: #64748b;
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    background: rgba(15, 23, 42, 0.5);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
                }
                td {
                    padding: 8px 12px;
                    color: #e2e8f0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
                }
                tr:hover td {
                    background: rgba(255, 255, 255, 0.02);
                }
            `}</style>
        </div>
    );
}

// ─── Markdown Formatter ──────────────────────────────────
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatMarkdown(text: string): string {
    // Escape HTML first to prevent XSS, then apply safe formatting
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>")
        .replace(/•/g, "&#8226;");
}
