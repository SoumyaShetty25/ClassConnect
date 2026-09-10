import { useState, useRef, useEffect } from "react";
import {
  GraduationCap, Upload, Send, BookOpen, AlertTriangle, Zap,
  SkipForward, Flame, MessageCircle, Brain, ShieldAlert,
  CheckCircle2, Loader2, FileText, Clock, ChevronRight,
  Server, XCircle, User, Sparkles, Bell, Search, Star,
  ArrowRight, ArrowUpRight, BookMarked, Compass, Award, Check,
} from "lucide-react";

const API = "http://localhost:8000";

/* ════════════════ THEME TOKENS (MATCHING REFERENCE AESTHETIC) ════════════════ */
const T = {
  bgApp: "#F6F2FA",
  sidebarBg: "#FFFFFF",
  sidebarBorder: "rgba(215, 204, 235, 0.6)",

  // Signature Pastel Colors from Reference
  lavender: {
    card: "#EFE6FA",
    soft: "#F8F3FD",
    border: "#DCCDF2",
    text: "#442C67",
    dark: "#684898",
  },
  mint: {
    card: "#DEF1EA",
    soft: "#EEF8F4",
    border: "#BFDFD4",
    text: "#1D5243",
    dark: "#2A6E5B",
  },
  yellow: {
    card: "#FEF7DC",
    soft: "#FFFCEF",
    border: "#FAE497",
    text: "#6B5200",
    dark: "#8A6B00",
  },
  rose: {
    card: "#FDEAE8",
    soft: "#FFF3F2",
    border: "#F7BEBA",
    text: "#862725",
    dark: "#AA3432",
  },

  // Charcoal Elements (Reference's "Get Started" & High-Contrast Buttons)
  charcoal: "#1F1B28",
  charcoalHover: "#2D283B",
  charcoalText: "#FFFFFF",

  // Text Hierarchy
  textPrimary: "#1F1B28",
  textSecondary: "#6E6680",
  textMuted: "#9C94AD",

  // Surface & Neutrals
  white: "#FFFFFF",
  cardBg: "#FFFFFF",
  borderLight: "#EDE6F5",
  borderSubtle: "rgba(0, 0, 0, 0.05)",

  // Shadows
  shadowCard: "0 10px 32px rgba(135, 105, 185, 0.06), 0 2px 8px rgba(135, 105, 185, 0.03)",
  shadowFloat: "0 14px 40px rgba(135, 105, 185, 0.12), 0 4px 12px rgba(135, 105, 185, 0.06)",
  shadowPill: "0 4px 16px rgba(31, 27, 40, 0.15)",
};

/* ════════════════ SHARED STYLES ════════════════ */
const S = {
  cardBase: {
    background: T.cardBg,
    borderRadius: 28,
    padding: 32,
    boxShadow: T.shadowCard,
    border: `1px solid ${T.borderLight}`,
  },
  charcoalPillBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: T.charcoal,
    color: T.charcoalText,
    padding: "13px 26px",
    borderRadius: 9999,
    fontSize: 14,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    boxShadow: T.shadowPill,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    fontFamily: "inherit",
  },
  circleArrowBtn: {
    width: 46,
    height: 46,
    borderRadius: "50%",
    background: T.lavender.card,
    color: T.lavender.text,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
    flexShrink: 0,
  },
  input: {
    width: "100%",
    padding: "14px 18px",
    fontSize: 14,
    fontFamily: "inherit",
    borderRadius: 18,
    border: `1.5px solid ${T.borderLight}`,
    background: "#FAF7FD",
    color: T.textPrimary,
    outline: "none",
    transition: "all 0.2s ease",
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: T.textSecondary,
    marginBottom: 8,
    letterSpacing: "0.02em",
  },
};

/* ════════════════ TOAST COMPONENT ════════════════ */
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const palette =
    type === "success"
      ? { bg: T.mint.card, border: T.mint.border, text: T.mint.text }
      : type === "error"
      ? { bg: T.rose.card, border: T.rose.border, text: T.rose.text }
      : { bg: T.lavender.card, border: T.lavender.border, text: T.lavender.text };

  const Icon = type === "success" ? CheckCircle2 : type === "error" ? XCircle : Sparkles;

  return (
    <div
      className="anim-slide-in"
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 22px",
        borderRadius: 9999,
        background: palette.bg,
        border: `1.5px solid ${palette.border}`,
        color: palette.text,
        fontSize: 13,
        fontWeight: 700,
        boxShadow: T.shadowFloat,
      }}
    >
      <Icon size={18} />
      <span>{message}</span>
    </div>
  );
}

/* ════════════════ CHAT BUBBLE ════════════════ */
function ChatBubble({ msg }) {
  if (msg.role === "user") {
    return (
      <div className="anim-fade-in" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
        <div
          style={{
            maxWidth: "72%",
            padding: "15px 22px",
            borderRadius: "26px 26px 6px 26px",
            background: T.charcoal,
            color: "#FFFFFF",
            fontSize: 14.5,
            lineHeight: 1.6,
            boxShadow: "0 4px 16px rgba(31, 27, 40, 0.15)",
            fontWeight: 500,
          }}
        >
          {msg.text}
        </div>
      </div>
    );
  }

  if (msg.type === "escalated") {
    return (
      <div className="anim-fade-in" style={{ display: "flex", justifyContent: "flex-start", marginBottom: 18 }}>
        <div
          style={{
            maxWidth: "82%",
            padding: "20px 24px",
            borderRadius: "26px 26px 26px 6px",
            background: T.rose.card,
            border: `1.5px solid ${T.rose.border}`,
            color: T.rose.text,
            boxShadow: T.shadowCard,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldAlert size={16} color={T.rose.text} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Out of Syllabus · Escalated to Teacher
            </span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: T.rose.text, marginTop: 4 }}>
            {msg.text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="anim-fade-in" style={{ display: "flex", justifyContent: "flex-start", marginBottom: 18 }}>
      <div
        style={{
          maxWidth: "82%",
          padding: "22px 26px",
          borderRadius: "26px 26px 26px 6px",
          background: T.lavender.soft,
          border: `1.5px solid ${T.lavender.border}`,
          boxShadow: T.shadowCard,
          color: T.textPrimary,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              }}
            >
              <Brain size={18} color={T.lavender.dark} />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: 13, color: T.lavender.text }}>Socratic Tutor</span>
              <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 8 }}>✦ Guided inquiry</span>
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              background: "#FFFFFF",
              padding: "4px 10px",
              borderRadius: 9999,
              color: T.lavender.dark,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Star size={12} fill="#F59E0B" color="#F59E0B" /> 4.9
          </span>
        </div>

        <div style={{ fontSize: 14.5, lineHeight: 1.7, whiteSpace: "pre-wrap", color: T.textPrimary }}>
          {msg.text}
        </div>

        {msg.sources?.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.lavender.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <BookMarked size={13} color={T.lavender.dark} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.lavender.text }}>
                Course Material Citations
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {msg.sources.map((s, i) => (
                <span
                  key={i}
                  style={{
                    background: "#FFFFFF",
                    border: `1px solid ${T.lavender.border}`,
                    borderRadius: 9999,
                    padding: "4px 12px",
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: T.lavender.text,
                    maxWidth: 360,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  [{i + 1}] {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════ MAIN APPLICATION ════════════════ */
export default function App() {
  const [userRole, setUserRole] = useState("Teacher");
  const [activeTab, setActiveTab] = useState("upload");
  const [chatHistory, setChatHistory] = useState([]);
  const [triagePlan, setTriagePlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);
  const [docCount, setDocCount] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [triageSubject, setTriageSubject] = useState("");
  const [triageHours, setTriageHours] = useState(3);
  const [triageTopics, setTriageTopics] = useState("");

  // Teacher Escalated Queries State
  const [escalatedQueries, setEscalatedQueries] = useState([
    {
      id: 1,
      question: "What is quantum entanglement and how does it relate to non-locality?",
      student: "Anonymous Student",
      studentsCount: 3,
      time: "10 mins ago",
      resolved: false,
      replyDraft: "",
      replyText: "",
    },
  ]);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  useEffect(() => {
    fetch(`${API}/`)
      .then((r) => r.json())
      .then((d) => {
        setServerStatus("online");
        setDocCount(d.documents_indexed || 0);
      })
      .catch(() => setServerStatus("offline"));
  }, []);

  useEffect(() => {
    setActiveTab(userRole === "Teacher" ? "upload" : "tutor");
  }, [userRole]);

  const showToast = (msg, type = "success") => setToast({ message: msg, type });

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return showToast("Select a PDF first.", "error");
    if (!file.name.toLowerCase().endsWith(".pdf")) return showToast("Only PDF files are supported.", "error");
    setIsLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        showToast(`Ingested ${data.chunks_stored} chunks from "${data.filename}".`);
        setDocCount((p) => p + data.chunks_stored);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        showToast(data.detail || "Upload failed.", "error");
      }
    } catch {
      showToast("Network error. Is backend running on port 8000?", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAsk = async () => {
    const q = chatInput.trim();
    if (!q) return;
    setChatHistory((p) => [...p, { role: "user", text: q }]);
    setChatInput("");
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/ask-socratic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (data.status === "not_in_syllabus") {
        setChatHistory((p) => [
          ...p,
          {
            role: "assistant",
            type: "escalated",
            text: "This concept was not found in the Professor's notes. Query has been escalated directly to the Teacher's dashboard.",
          },
        ]);
        // Automatically add to teacher's escalated queries dashboard
        setEscalatedQueries((prev) => [
          {
            id: Date.now(),
            question: q,
            student: "Live Student Session",
            studentsCount: 1,
            time: "Just now",
            resolved: false,
            replyDraft: "",
            replyText: "",
          },
          ...prev,
        ]);
      } else if (data.status === "success") {
        setChatHistory((p) => [
          ...p,
          { role: "assistant", type: "answer", text: data.answer, sources: data.sources || [] },
        ]);
      } else {
        setChatHistory((p) => [
          ...p,
          { role: "assistant", type: "answer", text: data.detail || "Unexpected response." },
        ]);
      }
    } catch {
      setChatHistory((p) => [
        ...p,
        { role: "assistant", type: "escalated", text: "Network error. Is the backend running?" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriage = async () => {
    if (!triageSubject.trim()) return showToast("Enter a subject.", "error");
    if (!triageTopics.trim()) return showToast("Enter weak topics.", "error");
    setIsLoading(true);
    setTriagePlan(null);
    try {
      const res = await fetch(`${API}/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: triageSubject,
          hours_left: triageHours,
          weak_topics: triageTopics.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (res.ok && data.study_plan) {
        setTriagePlan(data.study_plan);
        showToast("Survival plan generated!");
      } else {
        showToast(data.detail || "Triage failed.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveQuery = (id) => {
    const target = escalatedQueries.find((q) => q.id === id);
    if (!target?.replyDraft?.trim()) {
      return showToast("Please type a clarification before sending.", "error");
    }
    setEscalatedQueries((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, resolved: true, replyText: q.replyDraft }
          : q
      )
    );
    showToast("Clarification sent to students!");
  };

  const pendingCount = escalatedQueries.filter((q) => !q.resolved).length;

  const teacherTabs = [
    { id: "upload", label: "Upload & Dashboard", icon: Upload, badge: null },
    { id: "escalated", label: "Raised Doubts", icon: ShieldAlert, badge: pendingCount > 0 ? pendingCount : null },
  ];

  const studentTabs = [
    { id: "tutor", label: "Socratic Tutor", icon: MessageCircle, badge: null },
    { id: "triage", label: "Emergency Triage", icon: Zap, badge: null },
  ];

  const currentTabs = userRole === "Teacher" ? teacherTabs : studentTabs;

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bgApp, overflow: "hidden", color: T.textPrimary }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ════════════════ LEFT SIDEBAR ════════════════ */}
      <aside
        style={{
          width: 300,
          flexShrink: 0,
          background: T.sidebarBg,
          borderRight: `1.5px solid ${T.sidebarBorder}`,
          display: "flex",
          flexDirection: "column",
          padding: "24px 20px",
          boxShadow: "2px 0 24px rgba(140, 110, 190, 0.04)",
          zIndex: 10,
        }}
      >
        {/* Brand Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, padding: "4px 6px" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              background: T.lavender.card,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(104, 72, 152, 0.15)",
            }}
          >
            <GraduationCap size={24} color={T.lavender.dark} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: T.textPrimary }}>
                ClassConnect
              </h1>
              <span style={{ fontSize: 11, color: T.lavender.dark }}>✦</span>
            </div>
            <p style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600 }}>Academic Intelligence</p>
          </div>
        </div>

        {/* User Profile Card */}
        <div
          style={{
            background: T.lavender.soft,
            border: `1.5px solid ${T.lavender.border}`,
            borderRadius: 22,
            padding: "16px 18px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: userRole === "Teacher" ? T.mint.card : T.yellow.card,
              border: "2px solid #FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            {userRole === "Teacher" ? "👨‍🏫" : "👨‍🎓"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: T.textPrimary }}>
                {userRole === "Teacher" ? "Prof. Alex" : "Alex Rivera"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <BookOpen size={11} color={T.lavender.dark} />
              <div style={{ flex: 1, height: 5, borderRadius: 9999, background: T.lavender.border, overflow: "hidden" }}>
                <div
                  style={{
                    width: userRole === "Teacher" ? "100%" : "75%",
                    height: "100%",
                    background: T.lavender.dark,
                    borderRadius: 9999,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Role Switcher */}
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: T.textMuted,
              fontWeight: 800,
              marginBottom: 10,
              paddingLeft: 6,
            }}
          >
            Switch Workspace
          </p>
          <div
            style={{
              display: "flex",
              background: T.bgApp,
              padding: 5,
              borderRadius: 9999,
              border: `1px solid ${T.borderLight}`,
            }}
          >
            {["Teacher", "Student"].map((role) => {
              const active = userRole === role;
              return (
                <button
                  key={role}
                  onClick={() => setUserRole(role)}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: "none",
                    borderRadius: 9999,
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                    fontFamily: "inherit",
                    ...(active
                      ? {
                          background: T.charcoal,
                          color: "#FFFFFF",
                          boxShadow: "0 3px 10px rgba(31, 27, 40, 0.2)",
                        }
                      : {
                          background: "transparent",
                          color: T.textSecondary,
                        }),
                  }}
                >
                  {role === "Teacher" ? "Teacher 👨‍🏫" : "Student 👨‍🎓"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ flex: 1 }}>
          <p
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: T.textMuted,
              fontWeight: 800,
              marginBottom: 8,
              paddingLeft: 6,
            }}
          >
            Navigation
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {currentTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 16px",
                    borderRadius: 18,
                    fontSize: 13.5,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    ...(active
                      ? {
                          background: T.lavender.card,
                          color: T.lavender.text,
                          boxShadow: "0 4px 14px rgba(104, 72, 152, 0.1)",
                        }
                      : {
                          background: "transparent",
                          color: T.textSecondary,
                        }),
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: active ? "#FFFFFF" : T.bgApp,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} color={active ? T.lavender.dark : T.textSecondary} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{tab.label}</div>
                    {tab.badge && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          background: T.rose.card,
                          color: T.rose.text,
                          padding: "2px 8px",
                          borderRadius: 9999,
                          border: `1px solid ${T.rose.border}`,
                        }}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  {active && (
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ArrowRight size={13} color={T.lavender.dark} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Backend Status Box */}
        <div
          style={{
            background: T.bgApp,
            border: `1.5px solid ${T.borderLight}`,
            borderRadius: 20,
            padding: "14px 16px",
            marginTop: "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: T.textSecondary }}>
              <Server size={13} />
              <span>API ENGINE</span>
            </div>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: serverStatus === "online" ? "#10B981" : "#EF4444",
                boxShadow: serverStatus === "online" ? "0 0 10px #10B981" : "none",
              }}
            />
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.textPrimary }}>
            {serverStatus === "online" ? `Online · ${docCount} chunks active` : "Offline · Run backend"}
          </p>
        </div>
      </aside>

      {/* ════════════════ MAIN CONTENT AREA ════════════════ */}
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Top Header */}
        <header
          style={{
            padding: "20px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(12px)",
            borderBottom: `1px solid ${T.borderLight}`,
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
        >
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: T.textPrimary }}>
              {userRole === "Teacher" ? "Professor Curriculum & Doubts Dashboard" : "Your Learning Journey"}
            </h2>
            <p style={{ fontSize: 13, color: T.textSecondary, marginTop: 2 }}>
              {userRole === "Teacher"
                ? "Upload lecture notes and monitor out-of-syllabus queries raised by students"
                : "Continuous AI tutoring powered by interactive Socratic inquiry"}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#FFFFFF",
                border: `1.5px solid ${T.borderLight}`,
                borderRadius: 9999,
                padding: "8px 16px",
                fontSize: 12.5,
                color: T.textMuted,
              }}
            >
              <Search size={14} />
              <span>Search curriculum & notes...</span>
            </div>
            <button
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: "#FFFFFF",
                border: `1.5px solid ${T.borderLight}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: T.textSecondary,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <Bell size={17} />
            </button>
          </div>
        </header>

        {/* Inner Scrollable Container */}
        <div style={{ maxWidth: 1060, width: "100%", margin: "0 auto", padding: "32px 40px" }}>

          {/* ════════════════ DYNAMIC METRICS: TEACHER VS STUDENT ════════════════ */}
          {userRole === "Teacher" ? (
            /* ── TEACHER METRIC CARDS ── */
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
              {/* Teacher Metric 1: Course Syllabus Materials (Mint) */}
              <div
                style={{
                  background: T.mint.card,
                  borderRadius: 24,
                  padding: "22px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: T.shadowCard,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <BookOpen size={18} color={T.mint.dark} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.mint.dark }}>Course Syllabus</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 18 }}>
                  <div>
                    <span style={{ fontSize: 34, fontWeight: 800, color: T.mint.text, letterSpacing: "-0.03em" }}>
                      {docCount}
                    </span>
                    <span style={{ fontSize: 12, color: T.mint.dark, marginLeft: 6, fontWeight: 600 }}>chunks indexed</span>
                  </div>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ArrowUpRight size={16} color={T.mint.dark} />
                  </div>
                </div>
              </div>

              {/* Teacher Metric 2: Raised Student Queries (Soft Rose / Mint depending on pending) */}
              <div
                onClick={() => setActiveTab("escalated")}
                style={{
                  background: pendingCount > 0 ? T.rose.card : T.mint.card,
                  borderRadius: 24,
                  padding: "22px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: T.shadowCard,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ShieldAlert size={18} color={pendingCount > 0 ? T.rose.dark : T.mint.dark} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: pendingCount > 0 ? T.rose.dark : T.mint.dark }}>
                    Raised Student Queries
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 18 }}>
                  <div>
                    <span
                      style={{
                        fontSize: 34,
                        fontWeight: 800,
                        color: pendingCount > 0 ? T.rose.text : T.mint.text,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {pendingCount}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: pendingCount > 0 ? T.rose.dark : T.mint.dark,
                        marginLeft: 6,
                        fontWeight: 600,
                      }}
                    >
                      {pendingCount === 1 ? "needs review" : pendingCount === 0 ? "all clear" : "need review"}
                    </span>
                  </div>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ArrowUpRight size={16} color={pendingCount > 0 ? T.rose.dark : T.mint.dark} />
                  </div>
                </div>
              </div>

              {/* Teacher Metric 3: AI Tutor Autonomous Coverage (Lavender) */}
              <div
                style={{
                  background: T.lavender.card,
                  borderRadius: 24,
                  padding: "22px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: T.shadowCard,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Brain size={18} color={T.lavender.dark} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.lavender.dark }}>AI Autonomous Rate</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 18 }}>
                  <div>
                    <span style={{ fontSize: 34, fontWeight: 800, color: T.lavender.text, letterSpacing: "-0.03em" }}>
                      96.4%
                    </span>
                    <span style={{ fontSize: 12, color: T.lavender.dark, marginLeft: 6, fontWeight: 600 }}>
                      handled autonomously
                    </span>
                  </div>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ArrowUpRight size={16} color={T.lavender.dark} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── STUDENT METRIC CARDS ── */
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
              {/* Student Metric 1: Available Notes (Mint) */}
              <div
                style={{
                  background: T.mint.card,
                  borderRadius: 24,
                  padding: "22px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: T.shadowCard,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FileText size={18} color={T.mint.dark} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.mint.dark }}>Syllabus Knowledge</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 18 }}>
                  <div>
                    <span style={{ fontSize: 34, fontWeight: 800, color: T.mint.text, letterSpacing: "-0.03em" }}>
                      {docCount}
                    </span>
                    <span style={{ fontSize: 12, color: T.mint.dark, marginLeft: 6, fontWeight: 600 }}>vectors</span>
                  </div>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ArrowUpRight size={16} color={T.mint.dark} />
                  </div>
                </div>
              </div>

              {/* Student Metric 2: Study Time Remaining (Yellow) */}
              <div
                style={{
                  background: T.yellow.card,
                  borderRadius: 24,
                  padding: "22px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: T.shadowCard,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Clock size={18} color={T.yellow.dark} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.yellow.dark }}>Exam Countdown</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 18 }}>
                  <div>
                    <span style={{ fontSize: 34, fontWeight: 800, color: T.yellow.text, letterSpacing: "-0.03em" }}>
                      {triageHours}h
                    </span>
                    <span style={{ fontSize: 12, color: T.yellow.dark, marginLeft: 6, fontWeight: 600 }}>triage mode</span>
                  </div>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ArrowUpRight size={16} color={T.yellow.dark} />
                  </div>
                </div>
              </div>

              {/* Student Metric 3: Socratic Precision (Lavender) */}
              <div
                style={{
                  background: T.lavender.card,
                  borderRadius: 24,
                  padding: "22px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: T.shadowCard,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Sparkles size={18} color={T.lavender.dark} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.lavender.dark }}>Socratic AI</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 18 }}>
                  <div>
                    <span style={{ fontSize: 34, fontWeight: 800, color: T.lavender.text, letterSpacing: "-0.03em" }}>
                      98.4%
                    </span>
                    <span style={{ fontSize: 12, color: T.lavender.dark, marginLeft: 6, fontWeight: 600 }}>retrieval</span>
                  </div>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ArrowUpRight size={16} color={T.lavender.dark} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ VIEW 1: TEACHER UPLOAD & LIVE QUERIES DASHBOARD ════════════════ */}
          {userRole === "Teacher" && activeTab === "upload" && (
            <div className="anim-fade-in" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {/* 1. Upload Syllabus Card */}
              <div style={S.cardBase}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
                  <div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 12px",
                        borderRadius: 9999,
                        background: T.lavender.card,
                        color: T.lavender.text,
                        fontSize: 11.5,
                        fontWeight: 800,
                        marginBottom: 10,
                        letterSpacing: "0.04em",
                      }}
                    >
                      <span>✦</span> CURRICULUM INGESTION
                    </div>
                    <h3 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: T.textPrimary }}>
                      Upload Course Materials
                    </h3>
                    <p style={{ fontSize: 14, color: T.textSecondary, marginTop: 4, maxWidth: 640 }}>
                      Upload lecture slides, reading material, or syllabus PDFs to power student inquiries.
                    </p>
                  </div>
                  <div
                    style={{
                      background: T.mint.soft,
                      border: `1.5px solid ${T.mint.border}`,
                      borderRadius: 18,
                      padding: "8px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: T.mint.text,
                    }}
                  >
                    <Star size={14} fill={T.mint.text} />
                    <span>Auto-Chunking (500 chars)</span>
                  </div>
                </div>

                {/* Upload Dropzone */}
                <div
                  style={{
                    border: `2px dashed ${T.lavender.border}`,
                    borderRadius: 24,
                    padding: "44px 32px",
                    textAlign: "center",
                    background: T.lavender.soft,
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 20,
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                      boxShadow: "0 6px 20px rgba(104, 72, 152, 0.1)",
                    }}
                  >
                    <Upload size={26} color={T.lavender.dark} />
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>
                    Select Course Material PDF
                  </h4>
                  <p style={{ fontSize: 13, color: T.textSecondary, marginBottom: 20 }}>
                    Drag & drop your notes here or click below to browse
                  </p>
                  <input
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    style={{
                      fontSize: 13,
                      fontFamily: "inherit",
                      color: T.textSecondary,
                      padding: "8px 14px",
                      background: "#FFFFFF",
                      borderRadius: 12,
                      border: `1px solid ${T.lavender.border}`,
                    }}
                  />
                </div>

                {/* Action button combo */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 22 }}>
                  <button
                    onClick={handleUpload}
                    disabled={isLoading}
                    style={{
                      ...S.charcoalPillBtn,
                      opacity: isLoading ? 0.6 : 1,
                      padding: "14px 30px",
                      fontSize: 14,
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={17} className="spinner" />
                        <span>Embedding Chunks into ChromaDB...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        <span>Ingest Course Materials</span>
                      </>
                    )}
                  </button>
                  <div style={S.circleArrowBtn}>
                    <ArrowRight size={18} />
                  </div>
                  <span style={{ fontSize: 12, color: T.textMuted, marginLeft: "auto", fontWeight: 600 }}>
                    Persistent vector store at ./chroma_db
                  </span>
                </div>
              </div>

              {/* 2. Live Raised Student Queries Dashboard Section */}
              <div style={S.cardBase}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        background: pendingCount > 0 ? T.rose.card : T.mint.card,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ShieldAlert size={18} color={pendingCount > 0 ? T.rose.text : T.mint.text} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: T.textPrimary }}>
                        Raised Student Doubts Dashboard
                      </h3>
                      <p style={{ fontSize: 12.5, color: T.textSecondary }}>
                        Live feed of queries flagged as out-of-syllabus by the AI tutor
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      background: pendingCount > 0 ? T.rose.card : T.mint.card,
                      color: pendingCount > 0 ? T.rose.text : T.mint.text,
                      padding: "6px 14px",
                      borderRadius: 9999,
                      border: `1px solid ${pendingCount > 0 ? T.rose.border : T.mint.border}`,
                    }}
                  >
                    {pendingCount > 0 ? `${pendingCount} Doubt Pending Review` : "All Queries Resolved"}
                  </span>
                </div>

                {/* Queries List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {escalatedQueries.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: item.resolved ? T.mint.soft : T.lavender.soft,
                        border: `1.5px solid ${item.resolved ? T.mint.border : T.lavender.border}`,
                        borderRadius: 22,
                        padding: 24,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              background: item.resolved ? T.mint.card : T.rose.card,
                              color: item.resolved ? T.mint.text : T.rose.text,
                              padding: "3px 10px",
                              borderRadius: 9999,
                            }}
                          >
                            {item.resolved ? "Resolved · Sent" : "Out of Syllabus"}
                          </span>
                          <span style={{ fontSize: 11.5, color: T.textMuted }}>{item.time}</span>
                        </div>

                        {item.resolved && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.mint.text, display: "flex", alignItems: "center", gap: 4 }}>
                            <CheckCircle2 size={14} /> Clarification Broadcasted
                          </span>
                        )}
                      </div>

                      <h4 style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary, marginBottom: 12 }}>
                        "{item.question}"
                      </h4>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: T.mint.card,
                              border: "2px solid #FFFFFF",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                            }}
                          >
                            👨‍🎓
                          </div>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: T.yellow.card,
                              border: "2px solid #FFFFFF",
                              marginLeft: -6,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                            }}
                          >
                            👩‍🎓
                          </div>
                        </div>
                        <span style={{ fontSize: 12, color: T.textSecondary }}>
                          {item.student} · Flagged by Socratic Guardrail
                        </span>
                      </div>

                      {/* Reply section if not resolved */}
                      {!item.resolved ? (
                        <div style={{ paddingTop: 14, borderTop: `1px solid ${T.lavender.border}` }}>
                          <label style={S.label}>Professor's Clarification</label>
                          <textarea
                            value={item.replyDraft || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEscalatedQueries((prev) =>
                                prev.map((q) => (q.id === item.id ? { ...q, replyDraft: val } : q))
                              );
                            }}
                            placeholder="Type a brief clarification or reference for the student..."
                            style={{
                              ...S.input,
                              resize: "none",
                              height: 70,
                              borderRadius: 14,
                              background: "#FFFFFF",
                            }}
                          />
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                            <button
                              onClick={() => handleResolveQuery(item.id)}
                              style={{ ...S.charcoalPillBtn, padding: "10px 22px", fontSize: 13 }}
                            >
                              <Send size={14} />
                              <span>Send Clarification</span>
                            </button>
                            <div style={{ ...S.circleArrowBtn, width: 38, height: 38 }}>
                              <ArrowRight size={15} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ paddingTop: 12, borderTop: `1px solid ${T.mint.border}`, fontSize: 13, color: T.mint.text }}>
                          <strong>Your Answer:</strong> {item.replyText}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ VIEW 2: TEACHER ESCALATED DOUBTS TAB ════════════════ */}
          {userRole === "Teacher" && activeTab === "escalated" && (
            <div className="anim-fade-in">
              <div style={S.cardBase}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <div>
                    <h3 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: T.textPrimary }}>
                      Student Escalation Center
                    </h3>
                    <p style={{ fontSize: 13.5, color: T.textSecondary, marginTop: 4 }}>
                      Full list of student inquiries that could not be grounded in your uploaded notes.
                    </p>
                  </div>
                  <span
                    style={{
                      background: pendingCount > 0 ? T.rose.card : T.mint.card,
                      color: pendingCount > 0 ? T.rose.text : T.mint.text,
                      padding: "6px 14px",
                      borderRadius: 9999,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {pendingCount} Pending Doubts
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {escalatedQueries.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: item.resolved ? T.mint.soft : T.lavender.soft,
                        border: `1.5px solid ${item.resolved ? T.mint.border : T.lavender.border}`,
                        borderRadius: 24,
                        padding: 28,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 16,
                            background: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            flexShrink: 0,
                          }}
                        >
                          <AlertTriangle size={22} color={item.resolved ? T.mint.text : T.rose.text} />
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                background: item.resolved ? T.mint.card : T.rose.card,
                                color: item.resolved ? T.mint.text : T.rose.text,
                                padding: "4px 10px",
                                borderRadius: 9999,
                              }}
                            >
                              {item.resolved ? "Resolved" : "Out of Syllabus Query"}
                            </span>
                            <span style={{ fontSize: 11.5, color: T.textMuted }}>{item.time}</span>
                          </div>

                          <h4 style={{ fontSize: 18, fontWeight: 800, color: T.textPrimary, marginTop: 12 }}>
                            "{item.question}"
                          </h4>

                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
                            <span style={{ fontSize: 12, color: T.textSecondary }}>
                              Asked by <strong>{item.student}</strong> · Flagged by Socratic Guardrail
                            </span>
                          </div>

                          {!item.resolved ? (
                            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.lavender.border}` }}>
                              <label style={S.label}>Professor's Clarification</label>
                              <textarea
                                value={item.replyDraft || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEscalatedQueries((prev) =>
                                    prev.map((q) => (q.id === item.id ? { ...q, replyDraft: val } : q))
                                  );
                                }}
                                placeholder="Type your response to clarify this concept for the student..."
                                style={{
                                  ...S.input,
                                  resize: "none",
                                  height: 80,
                                  borderRadius: 16,
                                  background: "#FFFFFF",
                                }}
                              />
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
                                <button
                                  onClick={() => handleResolveQuery(item.id)}
                                  style={S.charcoalPillBtn}
                                >
                                  <Send size={14} />
                                  <span>Send Clarification</span>
                                </button>
                                <div style={S.circleArrowBtn}>
                                  <ArrowRight size={16} />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.mint.border}`, fontSize: 13.5, color: T.mint.text }}>
                              <strong>Broadcasted Answer:</strong> {item.replyText}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ VIEW 3: STUDENT SOCRATIC TUTOR ════════════════ */}
          {userRole === "Student" && activeTab === "tutor" && (
            <div className="anim-fade-in" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 250px)" }}>
              <div
                style={{
                  ...S.cardBase,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  padding: 0,
                  overflow: "hidden",
                  boxShadow: T.shadowCard,
                }}
              >
                {/* Chat Top Banner */}
                <div
                  style={{
                    padding: "16px 24px",
                    background: T.lavender.soft,
                    borderBottom: `1.5px solid ${T.lavender.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                      }}
                    >
                      <Brain size={20} color={T.lavender.dark} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
                        Interactive Socratic Dialogue
                      </h4>
                      <p style={{ fontSize: 11.5, color: T.textSecondary }}>
                        Grounded in professor's notes · Step-by-step guidance
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        background: "#FFFFFF",
                        color: T.mint.text,
                        padding: "4px 12px",
                        borderRadius: 9999,
                        border: `1px solid ${T.mint.border}`,
                      }}
                    >
                      ✦ Strict Grounding
                    </span>
                    {chatHistory.length > 0 && (
                      <button
                        onClick={() => setChatHistory([])}
                        style={{
                          background: "#FFFFFF",
                          border: `1px solid ${T.lavender.border}`,
                          color: T.textSecondary,
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: "4px 12px",
                          borderRadius: 9999,
                          cursor: "pointer",
                        }}
                      >
                        Reset Chat
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                  {chatHistory.length === 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 240,
                        textAlign: "center",
                        padding: 24,
                      }}
                    >
                      <div
                        style={{
                          width: 68,
                          height: 68,
                          borderRadius: 22,
                          background: T.lavender.card,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: 14,
                          boxShadow: "0 8px 24px rgba(104, 72, 152, 0.12)",
                        }}
                      >
                        <BookOpen size={30} color={T.lavender.dark} />
                      </div>
                      <h4 style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary }}>
                        Start Your Socratic Inquiry
                      </h4>
                      <p style={{ fontSize: 13, color: T.textSecondary, marginTop: 4, maxWidth: 420 }}>
                        Ask any question from your syllabus. The AI will guide your intuition without spoiling answers.
                      </p>

                      {/* Quick starter prompt chips */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18, justifyContent: "center" }}>
                        {[
                          "Explain key concepts from syllabus",
                          "What is the core idea in the notes?",
                          "Test my understanding with a problem",
                          "Can you give me an intuitive analogy?",
                        ].map((prompt, i) => (
                          <button
                            key={i}
                            onClick={() => setChatInput(prompt)}
                            style={{
                              background: "#FFFFFF",
                              border: `1.5px solid ${T.borderLight}`,
                              borderRadius: 9999,
                              padding: "7px 14px",
                              fontSize: 12,
                              fontWeight: 600,
                              color: T.textSecondary,
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                            }}
                          >
                            ✦ {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {chatHistory.map((msg, i) => (
                    <ChatBubble key={i} msg={msg} />
                  ))}

                  {isLoading && (
                    <div className="anim-fade-in" style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span className="dot" />
                        <span className="dot" />
                        <span className="dot" />
                      </div>
                      <span style={{ fontSize: 12.5, color: T.textMuted, fontWeight: 600 }}>
                        ClassConnect Socratic Engine is reasoning...
                      </span>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input Footer */}
                <div
                  style={{
                    padding: "14px 20px",
                    borderTop: `1.5px solid ${T.borderLight}`,
                    background: "#FAF8FE",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk()}
                      placeholder="Ask a question about your syllabus..."
                      disabled={isLoading}
                      style={{
                        ...S.input,
                        background: "#FFFFFF",
                        borderRadius: 9999,
                        padding: "12px 20px",
                      }}
                    />
                    <button
                      onClick={handleAsk}
                      disabled={isLoading || !chatInput.trim()}
                      style={{
                        ...S.charcoalPillBtn,
                        padding: "12px 24px",
                        opacity: isLoading || !chatInput.trim() ? 0.4 : 1,
                      }}
                    >
                      <Send size={15} />
                      <span>Ask</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ VIEW 4: STUDENT EMERGENCY TRIAGE ════════════════ */}
          {userRole === "Student" && activeTab === "triage" && (
            <div className="anim-fade-in">
              <div style={S.cardBase}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 26 }}>
                  <div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 12px",
                        borderRadius: 9999,
                        background: T.yellow.card,
                        color: T.yellow.text,
                        fontSize: 11.5,
                        fontWeight: 800,
                        marginBottom: 10,
                        letterSpacing: "0.04em",
                      }}
                    >
                      <span>⏱️</span> EXAM COUNTDOWN
                    </div>
                    <h3 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: T.textPrimary }}>
                      Emergency Exam Triage
                    </h3>
                    <p style={{ fontSize: 14, color: T.textSecondary, marginTop: 4 }}>
                      Few hours before your exam? Cut through the noise and get a 70/20/10 high-yield survival plan.
                    </p>
                  </div>

                  <span
                    style={{
                      background: T.mint.card,
                      color: T.mint.text,
                      padding: "8px 16px",
                      borderRadius: 9999,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    ✦ Pareto 80/20 Optimizer
                  </span>
                </div>

                {/* Form Controls */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 24 }}>
                  <div>
                    <label style={S.label}>Subject / Course</label>
                    <input
                      type="text"
                      value={triageSubject}
                      onChange={(e) => setTriageSubject(e.target.value)}
                      placeholder="e.g. Cognitive Psychology"
                      style={S.input}
                    />
                  </div>

                  {/* Learning Time Tracker Slider */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={S.label}>Hours Remaining</label>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          background: T.yellow.card,
                          color: T.yellow.text,
                          padding: "2px 8px",
                          borderRadius: 9999,
                        }}
                      >
                        {triageHours} hrs
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      value={triageHours}
                      onChange={(e) => setTriageHours(Number(e.target.value))}
                      style={{
                        width: "100%",
                        marginTop: 10,
                        accentColor: T.charcoal,
                        cursor: "pointer",
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textMuted, marginTop: 6, fontWeight: 600 }}>
                      <span>1h (Panic)</span>
                      <span>6h (Crunch)</span>
                      <span>12h (Prep)</span>
                    </div>
                  </div>

                  <div>
                    <label style={S.label}>Weak Topics (comma-separated)</label>
                    <input
                      type="text"
                      value={triageTopics}
                      onChange={(e) => setTriageTopics(e.target.value)}
                      placeholder="e.g. memory retrieval, operant conditioning"
                      style={S.input}
                    />
                  </div>
                </div>

                {/* Generate Button combo */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={handleTriage}
                    disabled={isLoading}
                    style={{
                      ...S.charcoalPillBtn,
                      opacity: isLoading ? 0.6 : 1,
                      padding: "15px 32px",
                      fontSize: 14.5,
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="spinner" />
                        <span>Optimizing High-Yield Topics...</span>
                      </>
                    ) : (
                      <>
                        <Clock size={17} />
                        <span>Generate Survival Plan</span>
                      </>
                    )}
                  </button>
                  <div style={S.circleArrowBtn}>
                    <ArrowRight size={18} />
                  </div>
                </div>
              </div>

              {/* Triage Results */}
              {triagePlan && (
                <div className="anim-fade-in" style={{ marginTop: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                    <h4 style={{ fontSize: 20, fontWeight: 800, color: T.textPrimary }}>
                      Your Optimized Study Strategy ({triageHours} Hours)
                    </h4>
                    <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 600 }}>
                      Generated by Academic Intelligence Engine
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                    {/* 1. High Yield Core */}
                    <div
                      style={{
                        background: T.rose.card,
                        border: `1.5px solid ${T.rose.border}`,
                        borderRadius: 26,
                        padding: 26,
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: T.shadowCard,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Flame size={20} color={T.rose.text} />
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            background: "#FFFFFF",
                            color: T.rose.text,
                            padding: "4px 10px",
                            borderRadius: 9999,
                          }}
                        >
                          ⭐ Spend 70% Time
                        </span>
                      </div>

                      <h4 style={{ fontSize: 17, fontWeight: 800, color: T.rose.text, marginBottom: 4 }}>
                        High-Yield Core
                      </h4>
                      <p style={{ fontSize: 11.5, color: T.rose.dark, marginBottom: 16, fontWeight: 600 }}>
                        Maximum exam points per minute
                      </p>

                      <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                        {(triagePlan.high_yield_core || []).map((item, i) => (
                          <li
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                              fontSize: 13.5,
                              color: T.rose.text,
                              marginBottom: 10,
                              lineHeight: 1.5,
                              fontWeight: 600,
                            }}
                          >
                            <span style={{ color: T.rose.text, marginTop: 2 }}>✦</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>

                      <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${T.rose.border}`, display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <ArrowRight size={15} color={T.rose.text} />
                        </div>
                      </div>
                    </div>

                    {/* 2. Quick Wins */}
                    <div
                      style={{
                        background: T.mint.card,
                        border: `1.5px solid ${T.mint.border}`,
                        borderRadius: 26,
                        padding: 26,
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: T.shadowCard,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Zap size={20} color={T.mint.text} />
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            background: "#FFFFFF",
                            color: T.mint.text,
                            padding: "4px 10px",
                            borderRadius: 9999,
                          }}
                        >
                          ⭐ Easy 20% Points
                        </span>
                      </div>

                      <h4 style={{ fontSize: 17, fontWeight: 800, color: T.mint.text, marginBottom: 4 }}>
                        Quick Wins
                      </h4>
                      <p style={{ fontSize: 11.5, color: T.mint.dark, marginBottom: 16, fontWeight: 600 }}>
                        Formulas, keywords & definitions
                      </p>

                      <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                        {(triagePlan.quick_wins || []).map((item, i) => (
                          <li
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                              fontSize: 13.5,
                              color: T.mint.text,
                              marginBottom: 10,
                              lineHeight: 1.5,
                              fontWeight: 600,
                            }}
                          >
                            <CheckCircle2 size={16} color={T.mint.text} style={{ marginTop: 2, flexShrink: 0 }} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>

                      <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${T.mint.border}`, display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <ArrowRight size={15} color={T.mint.text} />
                        </div>
                      </div>
                    </div>

                    {/* 3. Skip For Now */}
                    <div
                      style={{
                        background: T.lavender.card,
                        border: `1.5px solid ${T.lavender.border}`,
                        borderRadius: 26,
                        padding: 26,
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: T.shadowCard,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <SkipForward size={20} color={T.lavender.text} />
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            background: "#FFFFFF",
                            color: T.lavender.text,
                            padding: "4px 10px",
                            borderRadius: 9999,
                          }}
                        >
                          ⭐ Low Yield (Skip)
                        </span>
                      </div>

                      <h4 style={{ fontSize: 17, fontWeight: 800, color: T.lavender.text, marginBottom: 4 }}>
                        Skip For Now
                      </h4>
                      <p style={{ fontSize: 11.5, color: T.lavender.dark, marginBottom: 16, fontWeight: 600 }}>
                        Diminishing returns given time limit
                      </p>

                      <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                        {(triagePlan.skip_list || []).map((item, i) => (
                          <li
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                              fontSize: 13.5,
                              color: T.lavender.text,
                              marginBottom: 10,
                              lineHeight: 1.5,
                              fontWeight: 600,
                            }}
                          >
                            <XCircle size={16} color={T.lavender.dark} style={{ marginTop: 2, flexShrink: 0 }} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>

                      <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${T.lavender.border}`, display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <ArrowRight size={15} color={T.lavender.text} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
