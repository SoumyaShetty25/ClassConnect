import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useNextStep } from "../hooks/useAuth";
import { Lock, ShieldCheck, AlertTriangle, Loader2, KeyRound } from "lucide-react";

const T = {
  bgApp: "#F6F2FA",
  lavender: { card: "#EFE6FA", soft: "#F8F3FD", border: "#DCCDF2", text: "#442C67", dark: "#684898" },
  mint: { card: "#DEF1EA", border: "#BFDFD4", text: "#1D5243" },
  rose: { card: "#FDEAE8", border: "#F7BEBA", text: "#862725" },
  yellow: { card: "#FEF7DC", border: "#FAE497", text: "#6B5200" },
  charcoal: "#1F1B28",
  charcoalText: "#FFFFFF",
  textPrimary: "#1F1B28",
  textSecondary: "#6E6680",
  textMuted: "#9C94AD",
  white: "#FFFFFF",
  borderLight: "#EDE6F5",
  shadowFloat: "0 14px 40px rgba(135, 105, 185, 0.12), 0 4px 12px rgba(135, 105, 185, 0.06)",
};

const STEP_ROUTES = {
  password_change: "/change-password",
  face_registration: "/face-registration",
  dashboard: "/dashboard",
};

export default function ChangePasswordPage() {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { authFetch } = useAuth();
  const fetchNextStep = useNextStep();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPw !== confirmPw) {
      setError("New passwords do not match");
      return;
    }
    if (newPw.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed" }));
        throw new Error(err.detail || "Password change failed");
      }
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
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div className="anim-fade-in" style={{
        width: "100%", maxWidth: 440, background: T.white, borderRadius: 32,
        padding: "48px 40px", boxShadow: T.shadowFloat, border: `1px solid ${T.borderLight}`,
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, background: T.yellow.card,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16, boxShadow: "0 4px 16px rgba(180, 160, 80, 0.15)",
          }}>
            <KeyRound size={30} color={T.yellow.text} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, margin: 0 }}>
            Change Your Password
          </h1>
          <p style={{ fontSize: 13, color: T.textSecondary, marginTop: 8, lineHeight: 1.5 }}>
            Your account is using a temporary password.<br />Please set a new one to continue.
          </p>
        </div>

        {/* Warning banner */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          borderRadius: 14, background: T.yellow.card, border: `1.5px solid ${T.yellow.border}`,
          marginBottom: 24,
        }}>
          <AlertTriangle size={18} color={T.yellow.text} />
          <span style={{ fontSize: 12, fontWeight: 700, color: T.yellow.text }}>
            You cannot skip this step
          </span>
        </div>

        {error && (
          <div className="anim-fade-in" style={{
            padding: "12px 16px", borderRadius: 14, background: T.rose.card,
            border: `1.5px solid ${T.rose.border}`, color: T.rose.text,
            fontSize: 13, fontWeight: 600, marginBottom: 20, textAlign: "center",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { label: "CURRENT PASSWORD", value: oldPw, set: setOldPw, id: "old-password" },
            { label: "NEW PASSWORD", value: newPw, set: setNewPw, id: "new-password" },
            { label: "CONFIRM NEW PASSWORD", value: confirmPw, set: setConfirmPw, id: "confirm-password" },
          ].map(({ label, value, set, id }) => (
            <div key={id} style={{ marginBottom: 18 }}>
              <label style={{
                display: "block", fontSize: 12, fontWeight: 700, color: T.textSecondary,
                marginBottom: 8, letterSpacing: "0.02em",
              }}>{label}</label>
              <div style={{ position: "relative" }}>
                <Lock size={18} color={T.textMuted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  id={id}
                  type="password"
                  required
                  value={value}
                  onChange={(e) => set(e.target.value)}
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
          ))}

          <button
            id="change-password-submit"
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "15px 24px", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
              borderRadius: 9999, border: "none", cursor: loading ? "not-allowed" : "pointer",
              background: loading ? T.textSecondary : T.charcoal, color: T.charcoalText,
              boxShadow: "0 4px 16px rgba(31, 27, 40, 0.15)", transition: "all 0.2s ease",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8,
            }}
          >
            {loading ? <Loader2 size={18} className="spinner" /> : <ShieldCheck size={18} />}
            {loading ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
