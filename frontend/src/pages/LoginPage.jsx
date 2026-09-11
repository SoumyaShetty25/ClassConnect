import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useNextStep } from "../hooks/useAuth";
import { GraduationCap, LogIn, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

/* ── Theme tokens matching ClassConnect aesthetic ── */
const T = {
  bgApp: "#F6F2FA",
  lavender: { card: "#EFE6FA", soft: "#F8F3FD", border: "#DCCDF2", text: "#442C67", dark: "#684898" },
  mint: { card: "#DEF1EA", border: "#BFDFD4", text: "#1D5243" },
  rose: { card: "#FDEAE8", border: "#F7BEBA", text: "#862725" },
  charcoal: "#1F1B28",
  charcoalText: "#FFFFFF",
  textPrimary: "#1F1B28",
  textSecondary: "#6E6680",
  textMuted: "#9C94AD",
  white: "#FFFFFF",
  borderLight: "#EDE6F5",
  shadowCard: "0 10px 32px rgba(135, 105, 185, 0.06), 0 2px 8px rgba(135, 105, 185, 0.03)",
  shadowFloat: "0 14px 40px rgba(135, 105, 185, 0.12), 0 4px 12px rgba(135, 105, 185, 0.06)",
};

const STEP_ROUTES = {
  password_change: "/change-password",
  face_registration: "/face-registration",
  dashboard: "/dashboard",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, token } = useAuth();
  const fetchNextStep = useNextStep();
  const navigate = useNavigate();

  // If already logged in, redirect based on next-step
  useEffect(() => {
    if (token) {
      fetchNextStep()
        .then((step) => navigate(STEP_ROUTES[step] || "/dashboard", { replace: true }))
        .catch(() => {});
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      const step = await fetchNextStep();
      navigate(STEP_ROUTES[step] || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${T.bgApp} 0%, #EDE3F7 50%, #E8DFF0 100%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div className="anim-fade-in" style={{
        width: "100%",
        maxWidth: 440,
        background: T.white,
        borderRadius: 32,
        padding: "48px 40px",
        boxShadow: T.shadowFloat,
        border: `1px solid ${T.borderLight}`,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, background: T.lavender.card,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16, boxShadow: "0 4px 16px rgba(104, 72, 152, 0.12)",
          }}>
            <GraduationCap size={32} color={T.lavender.dark} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: T.textPrimary, margin: 0, letterSpacing: "-0.02em" }}>
            ClassConnect
          </h1>
          <p style={{ fontSize: 14, color: T.textSecondary, marginTop: 6, fontWeight: 500 }}>
            Sign in to your account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="anim-fade-in" style={{
            padding: "12px 16px", borderRadius: 14, background: T.rose.card,
            border: `1.5px solid ${T.rose.border}`, color: T.rose.text,
            fontSize: 13, fontWeight: 600, marginBottom: 20, textAlign: "center",
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block", fontSize: 12, fontWeight: 700, color: T.textSecondary,
              marginBottom: 8, letterSpacing: "0.02em",
            }}>
              EMAIL ADDRESS
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={18} color={T.textMuted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input
                id="login-email"
                type="email"
                autoComplete="off"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@classconnect.edu"
                style={{
                  width: "100%", padding: "14px 18px 14px 42px", fontSize: 14, fontFamily: "inherit",
                  borderRadius: 16, border: `1.5px solid ${T.borderLight}`, background: "#FAF7FD",
                  color: T.textPrimary, outline: "none", transition: "all 0.2s ease", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = T.lavender.dark; e.target.style.boxShadow = `0 0 0 3px ${T.lavender.card}`; }}
                onBlur={(e) => { e.target.style.borderColor = T.borderLight; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{
              display: "block", fontSize: 12, fontWeight: 700, color: T.textSecondary,
              marginBottom: 8, letterSpacing: "0.02em",
            }}>
              PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={18} color={T.textMuted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input
                id="login-password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: "100%", padding: "14px 48px 14px 42px", fontSize: 14, fontFamily: "inherit",
                  borderRadius: 16, border: `1.5px solid ${T.borderLight}`, background: "#FAF7FD",
                  color: T.textPrimary, outline: "none", transition: "all 0.2s ease", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = T.lavender.dark; e.target.style.boxShadow = `0 0 0 3px ${T.lavender.card}`; }}
                onBlur={(e) => { e.target.style.borderColor = T.borderLight; e.target.style.boxShadow = "none"; }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                }}
              >
                {showPw ? <EyeOff size={18} color={T.textMuted} /> : <Eye size={18} color={T.textMuted} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "15px 24px", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
              borderRadius: 9999, border: "none", cursor: loading ? "not-allowed" : "pointer",
              background: loading ? T.textSecondary : T.charcoal, color: T.charcoalText,
              boxShadow: "0 4px 16px rgba(31, 27, 40, 0.15)", transition: "all 0.2s ease",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
            onMouseEnter={(e) => { if (!loading) e.target.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; }}
          >
            {loading ? <Loader2 size={18} className="spinner" /> : <LogIn size={18} />}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
