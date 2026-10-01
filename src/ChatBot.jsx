import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, authStorage } from "./services/api";
import { useTheme } from "./ThemeContext";
import "./ChatBot.css";

// Backend base URL: https://chatbot-backend-cnn7.onrender.com
const API_URL =
    typeof window !== "undefined" && window.location.origin.includes("8000")
        ? "/chat"
        : "https://chatbot-backend-cnn7.onrender.com/chat";


// Generates or retrieves a persistent session ID for the current browser tab
function getOrCreateSessionId() {
    try {
        const existing = sessionStorage.getItem("chat_session_id");
        if (existing) return existing;
    } catch {
        // Fallback if sessionStorage is not accessible
    }

    const newId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : "session-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);

    try {
        sessionStorage.setItem("chat_session_id", newId);
    } catch {
        // Ignore quota/security errors
    }
    return newId;
}

export default function ChatBot({ darkMode: propDarkMode, onToggleTheme: propToggleTheme }) {
    const themeContext = useTheme();
    const isDark = propDarkMode !== undefined ? propDarkMode : themeContext.isDark;
    const toggleTheme = propToggleTheme || themeContext.toggleTheme;

    // Generate random UUID when chat loads, stored in state, persists per browser tab
    const [sessionId, setSessionId] = useState(() => getOrCreateSessionId());
    const [currentUser, setCurrentUser] = useState(() => authStorage.getUser());

    const displayName = currentUser?.name || (currentUser?.email ? currentUser.email.split("@")[0] : null);

    const [messages, setMessages] = useState(() => [
        {
            role: "bot",
            text: displayName
                ? `Hi ${displayName}! I know you're signed in. Ask me about products, check your orders, or place a new order without typing your name.`
                : "Hi! Ask me about products or orders. (Sign in to auto-link orders to your account!)",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    // Sync logged-in user identity on mount
    useEffect(() => {
        const token = authStorage.getToken();
        if (token) {
            api.getMe()
                .then((user) => {
                    if (user && user.email) {
                        setCurrentUser(user);
                    }
                })
                .catch(() => {});
        } else {
            setCurrentUser(null);
        }
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    // Handles both plain string replies and Gemini's structured list replies
    function extractText(reply) {
        if (typeof reply === "string") return reply;
        if (Array.isArray(reply)) {
            return reply
                .map((part) => (typeof part === "string" ? part : part.text || ""))
                .join(" ");
        }
        return String(reply);
    }

    function handleResetChat() {
        const freshId =
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : "session-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);

        try {
            sessionStorage.setItem("chat_session_id", freshId);
        } catch {
            // Ignore quota/security errors
        }

        setSessionId(freshId);
        setMessages([
            {
                role: "bot",
                text: displayName
                    ? `New conversation started, ${displayName}! Ask me about products, your orders, or placing a new order.`
                    : "New conversation started! Ask me about products, orders, or placing an order.",
            },
        ]);
    }

    async function sendMessage() {
        const trimmed = input.trim();
        if (!trimmed || loading) return;

        const userMessage = { role: "user", text: trimmed };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const token = authStorage.getToken() || localStorage.getItem("authToken");
            const headers = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const payload = {
                message: trimmed,
                session_id: sessionId,
                user_name: currentUser?.name || displayName || undefined,
                user_email: currentUser?.email || undefined,
            };

            const response = await fetch(API_URL, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            const botText = extractText(data.reply);

            setMessages((prev) => [...prev, { role: "bot", text: botText }]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "bot",
                    text: "⚠️ Could not reach the server. Please check your connection or try again shortly.",
                },
            ]);
        } finally {
            setLoading(false);
        }
    }

    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    return (
        <div className="chat-container">
            <div className="chat-header">
                <span className="chat-header-title">🛒 Product & Order Assistant</span>
                <div className="chat-header-actions">
                    <button
                        className="chat-theme-btn"
                        onClick={toggleTheme}
                        title={isDark ? "Switch to Light Mode (☀️)" : "Switch to Dark Mode (🌙)"}
                        aria-label="Toggle dark mode theme"
                    >
                        {isDark ? "☀️" : "🌙"}
                    </button>
                    <button
                        className="chat-reset-btn"
                        onClick={handleResetChat}
                        title="Start a new conversation thread"
                    >
                        🔄 New Chat
                    </button>
                </div>
            </div>

            {currentUser && (
                <div className="chat-user-banner">
                    <span className="chat-user-pill">
                        <span className="chat-user-dot"></span>
                        <span>Signed in as <strong>{displayName}</strong></span>
                    </span>
                    <span style={{ fontSize: "11px", opacity: 0.9 }}>Orders auto-linked</span>
                </div>
            )}

            <div className="chat-messages">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`chat-bubble ${msg.role === "user" ? "user" : "bot"}`}
                    >
                        {msg.role === "user" ? (
                            msg.text
                        ) : (
                            <div className="markdown-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="chat-bubble bot typing">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            <div className="chat-input-row">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about a product or order..."
                    disabled={loading}
                />
                <button onClick={sendMessage} disabled={loading || !input.trim()}>
                    Send
                </button>
            </div>
        </div>
    );
}
