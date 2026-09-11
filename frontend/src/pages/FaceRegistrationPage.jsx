import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  Camera, CheckCircle2, XCircle, RotateCcw, Loader2,
  ArrowRight, ScanFace, AlertTriangle, Sparkles
} from "lucide-react";

const T = {
  bgApp: "#F6F2FA",
  lavender: { card: "#EFE6FA", soft: "#F8F3FD", border: "#DCCDF2", text: "#442C67", dark: "#684898" },
  mint: { card: "#DEF1EA", soft: "#EEF8F4", border: "#BFDFD4", text: "#1D5243" },
  rose: { card: "#FDEAE8", border: "#F7BEBA", text: "#862725" },
  yellow: { card: "#FEF7DC", border: "#FAE497", text: "#6B5200" },
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

const POSES = [
  { label: "Look straight ahead", icon: "👤" },
  { label: "Slight smile", icon: "😊" },
  { label: "Turn slightly left", icon: "👈" },
  { label: "Turn slightly right", icon: "👉" },
  { label: "Tilt head up slightly", icon: "⬆️" },
  { label: "Tilt head down slightly", icon: "⬇️" },
  { label: "Look straight, no expression", icon: "😐" },
  { label: "Big smile", icon: "😁" },
  { label: "Turn more left", icon: "↩️" },
  { label: "Turn more right", icon: "↪️" },
  { label: "Look straight, eyes wide", icon: "👀" },
  { label: "Slight head tilt left", icon: "🔄" },
  { label: "Slight head tilt right", icon: "🔃" },
  { label: "Look up-left", icon: "↖️" },
  { label: "Look up-right", icon: "↗️" },
  { label: "Relax your face naturally", icon: "😌" },
  { label: "Look straight, mouth closed", icon: "🤐" },
  { label: "Gentle smile, look at camera", icon: "🙂" },
  { label: "Slight squint (like bright light)", icon: "😑" },
  { label: "Final — natural expression", icon: "✅" },
];

const MIN_REQUIRED = 15;

export default function FaceRegistrationPage() {
  const [cameraActive, setCameraActive] = useState(false);
  const [currentPose, setCurrentPose] = useState(0);
  const [captures, setCaptures] = useState([]); // [{blob, dataUrl, status: 'pending'|'accepted'|'rejected', reason?}]
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null); // final response
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setError("");
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setCaptures(prev => [...prev, { blob, dataUrl, status: "pending" }]);
      setCurrentPose(prev => Math.min(prev + 1, POSES.length));
    }, "image/jpeg", 0.92);
  }, []);

  const retakeImage = useCallback((index) => {
    setCaptures(prev => prev.filter((_, i) => i !== index));
    setCurrentPose(prev => Math.max(prev - 1, 0));
  }, []);

  const uploadAll = useCallback(async () => {
    const pending = captures.filter(c => c.status === "pending" || c.status === "rejected");
    if (pending.length === 0) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      captures.forEach((cap, i) => {
        formData.append("files", cap.blob, `face_${i}.jpg`);
      });

      const res = await authFetch("/face/register", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail || "Face registration failed");
      }

      const data = await res.json();
      setResult(data);

      // Update capture statuses
      setCaptures(prev => prev.map((cap, i) => {
        const r = data.results.find(r => r.index === i);
        if (r) {
          return { ...cap, status: r.accepted ? "accepted" : "rejected", reason: r.reason };
        }
        return cap;
      }));

      if (data.status === "completed") {
        setTimeout(() => navigate("/dashboard", { replace: true }), 2000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }, [captures, authFetch, navigate]);

  const acceptedCount = captures.filter(c => c.status === "accepted").length;
  const allCaptured = currentPose >= POSES.length;

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${T.bgApp} 0%, #EDE3F7 50%, #E8DFF0 100%)`,
      padding: "32px 24px",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div className="anim-fade-in" style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, background: T.lavender.card,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16, boxShadow: "0 4px 16px rgba(104, 72, 152, 0.12)",
          }}>
            <ScanFace size={32} color={T.lavender.dark} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.textPrimary, margin: 0 }}>
            Face Registration
          </h1>
          <p style={{ fontSize: 14, color: T.textSecondary, marginTop: 8 }}>
            Capture 20 photos from different angles. At least {MIN_REQUIRED} must be valid.
          </p>
        </div>

        {/* Progress bar */}
        <div style={{
          background: T.white, borderRadius: 20, padding: "16px 24px",
          boxShadow: T.shadowCard, border: `1px solid ${T.borderLight}`, marginBottom: 24,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.textSecondary }}>
              {result ? `✅ ${acceptedCount} accepted` : `📸 ${captures.length} / ${POSES.length} captured`}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: acceptedCount >= MIN_REQUIRED ? T.mint.text : T.textMuted }}>
              {acceptedCount >= MIN_REQUIRED ? "✓ Enough for registration" : `Need ${MIN_REQUIRED - acceptedCount} more`}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: T.borderLight, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 4, transition: "width 0.4s ease",
              width: `${(captures.length / POSES.length) * 100}%`,
              background: `linear-gradient(90deg, ${T.lavender.dark}, ${T.lavender.text})`,
            }} />
          </div>
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

        {/* Success banner */}
        {result?.status === "completed" && (
          <div className="anim-fade-in" style={{
            padding: "20px 24px", borderRadius: 20, background: T.mint.soft,
            border: `1.5px solid ${T.mint.border}`, marginBottom: 24, textAlign: "center",
          }}>
            <Sparkles size={24} color={T.mint.text} style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: T.mint.text, margin: 0 }}>
              {result.message}
            </p>
            <p style={{ fontSize: 13, color: T.mint.text, marginTop: 6, opacity: 0.8 }}>
              Redirecting to dashboard…
            </p>
          </div>
        )}

        {/* Camera + Capture area */}
        {!result?.status || result?.status !== "completed" ? (
          <div style={{
            background: T.white, borderRadius: 28, padding: 32,
            boxShadow: T.shadowFloat, border: `1px solid ${T.borderLight}`, marginBottom: 24,
          }}>
            {!cameraActive ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Camera size={48} color={T.textMuted} style={{ marginBottom: 16 }} />
                <p style={{ fontSize: 14, color: T.textSecondary, marginBottom: 20 }}>
                  Click below to start your camera
                </p>
                <button
                  id="start-camera"
                  onClick={startCamera}
                  style={{
                    padding: "14px 32px", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
                    borderRadius: 9999, border: "none", cursor: "pointer",
                    background: T.charcoal, color: T.charcoalText,
                    boxShadow: "0 4px 16px rgba(31, 27, 40, 0.15)",
                    display: "inline-flex", alignItems: "center", gap: 10,
                  }}
                >
                  <Camera size={18} /> Start Camera
                </button>
              </div>
            ) : (
              <>
                {/* Current pose instruction */}
                {currentPose < POSES.length && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 20px", borderRadius: 16,
                    background: T.lavender.soft, border: `1.5px solid ${T.lavender.border}`,
                    marginBottom: 20,
                  }}>
                    <span style={{ fontSize: 28 }}>{POSES[currentPose].icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Step {currentPose + 1} of {POSES.length}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: T.lavender.text }}>
                        {POSES[currentPose].label}
                      </div>
                    </div>
                  </div>
                )}

                {/* Video */}
                <div style={{
                  position: "relative", borderRadius: 20, overflow: "hidden",
                  marginBottom: 20, background: "#000",
                }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", display: "block", borderRadius: 20, transform: "scaleX(-1)" }}
                  />
                </div>

                <canvas ref={canvasRef} style={{ display: "none" }} />

                {/* Capture / Upload buttons */}
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  {!allCaptured ? (
                    <button
                      id="capture-photo"
                      onClick={captureFrame}
                      style={{
                        padding: "14px 32px", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
                        borderRadius: 9999, border: "none", cursor: "pointer",
                        background: T.charcoal, color: T.charcoalText,
                        boxShadow: "0 4px 16px rgba(31, 27, 40, 0.15)",
                        display: "flex", alignItems: "center", gap: 10,
                      }}
                    >
                      <Camera size={18} /> Capture ({captures.length}/{POSES.length})
                    </button>
                  ) : (
                    <button
                      id="upload-all"
                      onClick={uploadAll}
                      disabled={uploading}
                      style={{
                        padding: "14px 32px", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
                        borderRadius: 9999, border: "none", cursor: uploading ? "not-allowed" : "pointer",
                        background: uploading ? T.textSecondary : T.mint.text, color: T.charcoalText,
                        boxShadow: "0 4px 16px rgba(29, 82, 67, 0.2)",
                        display: "flex", alignItems: "center", gap: 10,
                      }}
                    >
                      {uploading ? <Loader2 size={18} className="spinner" /> : <ArrowRight size={18} />}
                      {uploading ? "Processing…" : "Submit All Photos"}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}

        {/* Thumbnails grid */}
        {captures.length > 0 && (
          <div style={{
            background: T.white, borderRadius: 24, padding: 24,
            boxShadow: T.shadowCard, border: `1px solid ${T.borderLight}`,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, marginBottom: 16 }}>
              Captured Photos ({captures.length})
            </h3>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 12,
            }}>
              {captures.map((cap, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img
                    src={cap.dataUrl}
                    alt={`Capture ${i + 1}`}
                    style={{
                      width: "100%", aspectRatio: "1", objectFit: "cover",
                      borderRadius: 14,
                      border: `2px solid ${
                        cap.status === "accepted" ? T.mint.border :
                        cap.status === "rejected" ? T.rose.border :
                        T.borderLight
                      }`,
                      transform: "scaleX(-1)",
                    }}
                  />
                  {/* Status badge */}
                  {cap.status === "accepted" && (
                    <div style={{
                      position: "absolute", top: 4, right: 4, width: 22, height: 22,
                      borderRadius: "50%", background: T.mint.card,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <CheckCircle2 size={14} color={T.mint.text} />
                    </div>
                  )}
                  {cap.status === "rejected" && (
                    <div
                      onClick={() => retakeImage(i)}
                      title={cap.reason || "Rejected"}
                      style={{
                        position: "absolute", top: 4, right: 4, width: 22, height: 22,
                        borderRadius: "50%", background: T.rose.card,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <XCircle size={14} color={T.rose.text} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
