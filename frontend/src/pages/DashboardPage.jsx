import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  Users, UserPlus, GraduationCap, BookOpen, Upload, Camera,
  CheckCircle2, XCircle, LogOut, Loader2, Plus, Eye, Clock,
  Shield, School, CalendarCheck, ChevronRight, Search,
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

const pill = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "6px 14px", borderRadius: 9999, fontSize: 12, fontWeight: 700,
};

/* ═══════════════ ADMIN DASHBOARD ═══════════════ */
function AdminDashboard({ authFetch }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("students");
  // Create account form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState("student");
  const [createClass, setCreateClass] = useState("");
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  // Create class form
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [className, setClassName] = useState("");
  const [creatingClass, setCreatingClass] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        authFetch("/admin/students"),
        authFetch("/admin/classes"),
      ]);
      if (sRes.ok) setStudents(await sRes.json());
      if (cRes.ok) setClasses(await cRes.json());
    } catch { }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setCreating(true); setError(""); setCreateResult(null);
    try {
      const body = { name: createName, role: createRole };
      if (createRole === "student" && createClass) body.classId = createClass;
      else if (createRole === "student" && !createClass) { setError("Class is required for students"); setCreating(false); return; }
      if (createRole === "teacher" && createClass) body.classId = createClass;

      const res = await authFetch("/admin/create-account", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed"); }
      const data = await res.json();
      setCreateResult(data);
      setCreateName(""); setCreateRole("student"); setCreateClass("");
      fetchData();
    } catch (err) { setError(err.message); }
    setCreating(false);
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setCreatingClass(true); setError("");
    try {
      const res = await authFetch("/admin/create-class", {
        method: "POST",
        body: JSON.stringify({ name: className }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed"); }
      setClassName("");
      setShowCreateClass(false);
      fetchData();
    } catch (err) { setError(err.message); }
    setCreatingClass(false);
  };

  const inputStyle = {
    width: "100%", padding: "12px 16px", fontSize: 14, fontFamily: "inherit",
    borderRadius: 14, border: `1.5px solid ${T.borderLight}`, background: "#FAF7FD",
    color: T.textPrimary, outline: "none", boxSizing: "border-box",
  };

  return (
    <>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { key: "students", icon: Users, label: "Students" },
          { key: "classes", icon: School, label: "Classes" },
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            ...pill, padding: "10px 20px", fontSize: 13, cursor: "pointer", border: "none", fontFamily: "inherit",
            background: tab === key ? T.charcoal : T.white,
            color: tab === key ? T.charcoalText : T.textSecondary,
            boxShadow: tab === key ? "0 4px 12px rgba(31,27,40,0.15)" : T.shadowCard,
          }}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 14, background: T.rose.card, border: `1.5px solid ${T.rose.border}`, color: T.rose.text, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Create Account Result */}
      {createResult && (
        <div className="anim-fade-in" style={{
          padding: "20px 24px", borderRadius: 20, background: T.mint.soft,
          border: `1.5px solid ${T.mint.border}`, marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.mint.text, marginBottom: 8 }}>✅ Account Created</div>
          <div style={{ fontSize: 13, color: T.mint.text, display: "grid", gap: 4 }}>
            <span><strong>Email:</strong> {createResult.email}</span>
            <span><strong>Temporary Password:</strong> <code style={{ background: T.white, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>{createResult.temporaryPassword}</code></span>
            <span><strong>Role:</strong> {createResult.role}</span>
          </div>
          <p style={{ fontSize: 11, color: T.mint.text, marginTop: 8, opacity: 0.7 }}>Share these credentials with the user securely.</p>
        </div>
      )}

      {tab === "students" && (
        <>
          {/* Create Account Button */}
          <button onClick={() => { setShowCreate(!showCreate); setCreateResult(null); }} style={{
            ...pill, padding: "10px 20px", fontSize: 13, cursor: "pointer", border: "none", fontFamily: "inherit",
            background: T.lavender.card, color: T.lavender.text, marginBottom: 16,
          }}>
            <UserPlus size={16} /> {showCreate ? "Hide Form" : "Create Account"}
          </button>

          {showCreate && (
            <div className="anim-fade-in" style={{
              background: T.white, borderRadius: 20, padding: 24,
              boxShadow: T.shadowCard, border: `1px solid ${T.borderLight}`, marginBottom: 20,
            }}>
              <form onSubmit={handleCreateAccount}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 6 }}>FULL NAME</label>
                    <input required value={createName} onChange={e => setCreateName(e.target.value)} placeholder="John Doe" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 6 }}>ROLE</label>
                    <select value={createRole} onChange={e => setCreateRole(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 6 }}>
                    CLASS {createRole === "student" ? "(Required)" : "(Optional)"}
                  </label>
                  <select value={createClass} onChange={e => setCreateClass(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">-- Select Class --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={creating} style={{
                  padding: "12px 24px", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                  borderRadius: 9999, border: "none", cursor: creating ? "not-allowed" : "pointer",
                  background: T.charcoal, color: T.charcoalText,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  {creating ? <Loader2 size={16} className="spinner" /> : <Plus size={16} />}
                  {creating ? "Creating…" : "Create Account"}
                </button>
              </form>
            </div>
          )}

          {/* Students table */}
          <div style={{
            background: T.white, borderRadius: 24, boxShadow: T.shadowCard,
            border: `1px solid ${T.borderLight}`, overflow: "hidden",
          }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.borderLight}` }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary, margin: 0 }}>
                All Students ({students.length})
              </h3>
            </div>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={24} className="spinner" color={T.textMuted} /></div>
            ) : students.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: T.textMuted, fontSize: 14 }}>No students yet</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                      {["Name", "Email", "Roll #", "Password", "Face Reg"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: T.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.userId} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                        <td style={{ padding: "14px 16px", fontWeight: 600, color: T.textPrimary }}>{s.name}</td>
                        <td style={{ padding: "14px 16px", color: T.textSecondary }}>{s.email}</td>
                        <td style={{ padding: "14px 16px", color: T.textSecondary, fontFamily: "monospace" }}>{s.rollNumber}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            ...pill,
                            background: s.passwordChanged ? T.mint.card : T.yellow.card,
                            color: s.passwordChanged ? T.mint.text : T.yellow.text,
                          }}>
                            {s.passwordChanged ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            {s.passwordChanged ? "Changed" : "Temporary"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            ...pill,
                            background: s.faceRegistered ? T.mint.card : s.faceRegistrationStatus === "partial" ? T.yellow.card : T.rose.card,
                            color: s.faceRegistered ? T.mint.text : s.faceRegistrationStatus === "partial" ? T.yellow.text : T.rose.text,
                          }}>
                            {s.faceRegistered ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {s.faceRegistrationStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "classes" && (
        <>
          <button onClick={() => setShowCreateClass(!showCreateClass)} style={{
            ...pill, padding: "10px 20px", fontSize: 13, cursor: "pointer", border: "none", fontFamily: "inherit",
            background: T.lavender.card, color: T.lavender.text, marginBottom: 16,
          }}>
            <Plus size={16} /> {showCreateClass ? "Hide" : "Create Class"}
          </button>

          {showCreateClass && (
            <div className="anim-fade-in" style={{
              background: T.white, borderRadius: 20, padding: 24,
              boxShadow: T.shadowCard, border: `1px solid ${T.borderLight}`, marginBottom: 20,
            }}>
              <form onSubmit={handleCreateClass} style={{ display: "flex", gap: 12 }}>
                <input required value={className} onChange={e => setClassName(e.target.value)}
                  placeholder="e.g. CS-101 Introduction to CS" style={{ ...inputStyle, flex: 1 }} />
                <button type="submit" disabled={creatingClass} style={{
                  padding: "12px 24px", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                  borderRadius: 9999, border: "none", cursor: "pointer",
                  background: T.charcoal, color: T.charcoalText, whiteSpace: "nowrap",
                }}>
                  {creatingClass ? <Loader2 size={16} className="spinner" /> : "Create"}
                </button>
              </form>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {classes.map(c => (
              <div key={c.id} style={{
                background: T.white, borderRadius: 20, padding: 24,
                boxShadow: T.shadowCard, border: `1px solid ${T.borderLight}`,
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, marginBottom: 12 }}>{c.name}</div>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ ...pill, background: T.lavender.card, color: T.lavender.text }}>
                    <Users size={12} /> {c.studentCount} students
                  </span>
                  <span style={{ ...pill, background: T.mint.card, color: T.mint.text }}>
                    <GraduationCap size={12} /> {c.teacherCount} teachers
                  </span>
                </div>
              </div>
            ))}
            {classes.length === 0 && !loading && (
              <div style={{ padding: 40, textAlign: "center", color: T.textMuted }}>No classes yet</div>
            )}
          </div>
        </>
      )}
    </>
  );
}

/* ═══════════════ TEACHER DASHBOARD ═══════════════ */
function TeacherDashboard({ authFetch }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  const [lectureName, setLectureName] = useState("");
  const [lectureDate, setLectureDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState("mark"); // "mark" | "tracker"
  const [expandedLecture, setExpandedLecture] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    authFetch("/admin/classes").then(async r => {
      if (r.ok) setClasses(await r.json());
    }).catch(() => {});
  }, [authFetch]);

  const handleFileSelect = (f) => {
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setImagePreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleMark = async (e) => {
    e.preventDefault();
    if (!file || !selectedClass) return;
    setUploading(true); setError(""); setResult(null);
    try {
      const fd = new FormData();
      fd.append("classId", selectedClass);
      fd.append("lectureName", lectureName || "Lecture");
      fd.append("date", lectureDate);
      fd.append("file", file);
      const res = await authFetch("/attendance/mark", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to mark attendance");
      }
      setResult(await res.json());
      setFile(null); setImagePreview(null);
      fetchRecords(selectedClass);
    } catch (err) { setError(err.message); }
    setUploading(false);
  };

  const fetchRecords = async (classId) => {
    if (!classId) return;
    try {
      const res = await authFetch(`/attendance/records?classId=${classId}`);
      if (res.ok) setRecords(await res.json());
    } catch {}
  };

  const handleOverride = async (lectureId, studentId, action) => {
    try {
      const res = await authFetch(`/attendance/records/${lectureId}/override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, action }),
      });
      if (res.ok) {
        fetchRecords(selectedClass);
        // Also refresh result if it's the same lecture
        if (result && result.lectureId === lectureId) {
          const data = await res.json();
          // Re-fetch full records to update inline result
          const recs = await authFetch(`/attendance/records?classId=${selectedClass}`);
          if (recs.ok) {
            const allRecs = await recs.json();
            const updated = allRecs.find(r => r.lectureId === lectureId);
            if (updated) setResult({ ...result, ...updated });
          }
        }
      }
    } catch {}
  };

  useEffect(() => { if (selectedClass) fetchRecords(selectedClass); }, [selectedClass]);

  // Metrics
  const totalLectures = records.length;
  const avgRate = totalLectures > 0
    ? (records.reduce((s, r) => s + (r.attendanceRate || 0), 0) / totalLectures).toFixed(1)
    : "0.0";
  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || "";
  const totalStudents = records.length > 0 ? records[0].totalStudents || 0 : 0;

  const tabs = [
    { id: "mark", label: "📸 Mark Attendance", icon: Camera },
    { id: "tracker", label: "📊 Attendance Tracker", icon: CalendarCheck },
  ];

  return (
    <>
      {/* Class selector */}
      <div style={{
        background: T.white, borderRadius: 20, padding: 24,
        boxShadow: T.shadowCard, border: `1px solid ${T.borderLight}`, marginBottom: 24,
      }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 8, textTransform: "uppercase" }}>
          Select Class
        </label>
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{
          width: "100%", padding: "12px 16px", fontSize: 14, fontFamily: "inherit",
          borderRadius: 14, border: `1.5px solid ${T.borderLight}`, background: "#FAF7FD",
          color: T.textPrimary, cursor: "pointer", outline: "none", boxSizing: "border-box",
        }}>
          <option value="">-- Choose a class --</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {selectedClass && (
        <>
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {tabs.map(t => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  flex: 1, padding: "14px 20px", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                  borderRadius: 16, border: active ? `2px solid ${T.lavender.dark}` : `1.5px solid ${T.borderLight}`,
                  background: active ? T.lavender.card : T.white, color: active ? T.lavender.text : T.textSecondary,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.2s ease", boxShadow: active ? T.shadowCard : "none",
                }}>
                  <Icon size={16} /> {t.label}
                </button>
              );
            })}
          </div>

          {/* ══════ TAB 1: MARK ATTENDANCE ══════ */}
          {activeTab === "mark" && (
            <div style={{
              background: T.white, borderRadius: 24, padding: 28,
              boxShadow: T.shadowCard, border: `1px solid ${T.borderLight}`, marginBottom: 24,
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <Camera size={20} color={T.lavender.dark} /> Mark Lecture Attendance
              </h3>

              <form onSubmit={handleMark}>
                {/* Lecture name + date row */}
                <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 6, textTransform: "uppercase" }}>
                      Lecture Topic
                    </label>
                    <input
                      value={lectureName}
                      onChange={e => setLectureName(e.target.value)}
                      placeholder="e.g. Lecture 4 — Machine Learning Fundamentals"
                      style={{
                        width: "100%", padding: "12px 16px", fontSize: 14, fontFamily: "inherit",
                        borderRadius: 14, border: `1.5px solid ${T.borderLight}`, background: "#FAF7FD",
                        color: T.textPrimary, outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 6, textTransform: "uppercase" }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={lectureDate}
                      onChange={e => setLectureDate(e.target.value)}
                      style={{
                        width: "100%", padding: "12px 16px", fontSize: 14, fontFamily: "inherit",
                        borderRadius: 14, border: `1.5px solid ${T.borderLight}`, background: "#FAF7FD",
                        color: T.textPrimary, outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Drag & Drop upload area */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("classroom-photo-input").click()}
                  style={{
                    border: `2.5px dashed ${dragActive ? T.lavender.dark : T.borderLight}`,
                    borderRadius: 20, padding: imagePreview ? 0 : 48,
                    textAlign: "center", cursor: "pointer", marginBottom: 20,
                    background: dragActive ? T.lavender.soft : "#FAFAFE",
                    transition: "all 0.2s ease", overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {imagePreview ? (
                    <div style={{ position: "relative" }}>
                      <img src={imagePreview} alt="Preview" style={{
                        width: "100%", maxHeight: 320, objectFit: "cover", display: "block",
                      }} />
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                        padding: "20px 16px 12px", color: "#fff", fontSize: 13, fontWeight: 600,
                      }}>
                        📷 {file?.name} — Click or drag to replace
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload size={36} color={T.textMuted} style={{ marginBottom: 12 }} />
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary, marginBottom: 6 }}>
                        Drop classroom photo here
                      </div>
                      <div style={{ fontSize: 13, color: T.textMuted }}>
                        or click to browse • JPEG, PNG, WebP (max 5 MB)
                      </div>
                    </>
                  )}
                  <input
                    id="classroom-photo-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => handleFileSelect(e.target.files[0])}
                    style={{ display: "none" }}
                  />
                </div>

                {/* Submit */}
                <button type="submit" disabled={!file || uploading} style={{
                  padding: "14px 32px", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
                  borderRadius: 9999, border: "none", cursor: !file || uploading ? "not-allowed" : "pointer",
                  background: uploading ? T.textSecondary : T.charcoal, color: T.charcoalText,
                  display: "inline-flex", alignItems: "center", gap: 10,
                  boxShadow: "0 4px 16px rgba(31, 27, 40, 0.15)", transition: "all 0.2s ease",
                }}>
                  {uploading ? <Loader2 size={18} className="spinner" /> : <Camera size={18} />}
                  {uploading ? "Scanning Faces…" : "Upload & Mark Attendance"}
                </button>
              </form>

              {/* Error */}
              {error && <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 14, background: T.rose.card, color: T.rose.text, fontSize: 13, fontWeight: 600 }}>{error}</div>}

              {/* ── SCAN RESULTS ── */}
              {result && (
                <div className="anim-fade-in" style={{ marginTop: 24 }}>
                  {/* Summary banner */}
                  <div style={{
                    padding: "20px 24px", borderRadius: 20,
                    background: `linear-gradient(135deg, ${T.mint.soft}, ${T.lavender.soft})`,
                    border: `1.5px solid ${T.mint.border}`, marginBottom: 20,
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginBottom: 6 }}>
                      ✅ Attendance Marked — {result.lectureName || "Lecture"}
                    </div>
                    <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: 14 }}>
                      {result.date} • {selectedClassName}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ ...pill, background: T.mint.card, color: T.mint.text }}>
                        <CheckCircle2 size={12} /> {result.presentCount} Present
                      </span>
                      <span style={{ ...pill, background: T.rose.card, color: T.rose.text }}>
                        <XCircle size={12} /> {result.absentCount} Absent
                      </span>
                      <span style={{ ...pill, background: T.lavender.card, color: T.lavender.text }}>
                        📊 {result.attendanceRate}%
                      </span>
                      <span style={{ ...pill, background: T.yellow.card, color: T.yellow.text }}>
                        👁️ {result.totalFacesDetected} Faces Detected
                      </span>
                    </div>
                  </div>

                  {/* Present students */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.mint.text, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      ✅ Present Students ({result.presentStudents?.length || 0})
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                      {(result.presentStudents || []).map((s, i) => (
                        <div key={i} style={{
                          padding: "12px 16px", borderRadius: 14, background: T.mint.soft,
                          border: `1px solid ${T.mint.border}`, display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.mint.text }}>{s.studentName}</div>
                            <div style={{ fontSize: 11, color: T.textMuted }}>{s.rollNumber} • {(s.similarity * 100).toFixed(1)}% match</div>
                          </div>
                          <CheckCircle2 size={18} color={T.mint.text} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Absent students */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.rose.text, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      ❌ Absent Students ({result.absentStudents?.length || 0})
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                      {(result.absentStudents || []).map((s, i) => (
                        <div key={i} style={{
                          padding: "12px 16px", borderRadius: 14, background: T.rose.card,
                          border: `1px solid ${T.rose.border}`, display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.rose.text }}>{s.studentName}</div>
                            <div style={{ fontSize: 11, color: T.textMuted }}>{s.rollNumber}</div>
                          </div>
                          <button
                            onClick={() => handleOverride(result.lectureId, s.studentId, "mark_present")}
                            style={{
                              ...pill, padding: "6px 12px", fontSize: 11, cursor: "pointer",
                              border: "none", fontFamily: "inherit",
                              background: T.mint.card, color: T.mint.text,
                            }}
                          >
                            Mark Present
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════ TAB 2: ATTENDANCE TRACKER ══════ */}
          {activeTab === "tracker" && (
            <>
              {/* Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Total Lectures", value: totalLectures, bg: T.lavender.card, color: T.lavender.text, icon: "📚" },
                  { label: "Avg. Attendance", value: `${avgRate}%`, bg: T.mint.card, color: T.mint.text, icon: "📊" },
                  { label: "Total Students", value: totalStudents, bg: T.yellow.card, color: T.yellow.text, icon: "👥" },
                ].map((m, i) => (
                  <div key={i} style={{
                    background: T.white, borderRadius: 20, padding: "22px 20px",
                    boxShadow: T.shadowCard, border: `1px solid ${T.borderLight}`,
                  }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>{m.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>{m.value}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: "uppercase" }}>{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Lecture history */}
              <div style={{
                background: T.white, borderRadius: 24, boxShadow: T.shadowCard,
                border: `1px solid ${T.borderLight}`, overflow: "hidden",
              }}>
                <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.borderLight}` }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    <CalendarCheck size={18} color={T.lavender.dark} /> Lecture Attendance History — {selectedClassName}
                  </h3>
                </div>
                {records.length === 0 ? (
                  <div style={{ padding: 48, textAlign: "center", color: T.textMuted, fontSize: 14 }}>
                    No attendance records yet. Upload a classroom photo to get started.
                  </div>
                ) : (
                  <div>
                    {records.map(r => {
                      const expanded = expandedLecture === r.lectureId;
                      const rate = r.attendanceRate || 0;
                      const rateColor = rate >= 75 ? T.mint.text : rate >= 50 ? T.yellow.text : T.rose.text;
                      const rateBg = rate >= 75 ? T.mint.card : rate >= 50 ? T.yellow.card : T.rose.card;
                      return (
                        <div key={r.lectureId}>
                          <div
                            onClick={() => setExpandedLecture(expanded ? null : r.lectureId)}
                            style={{
                              padding: "16px 24px", cursor: "pointer",
                              borderBottom: `1px solid ${T.borderLight}`,
                              display: "flex", alignItems: "center", gap: 16,
                              background: expanded ? T.lavender.soft : "transparent",
                              transition: "background 0.15s ease",
                            }}
                          >
                            <ChevronRight size={16} color={T.textMuted} style={{
                              transform: expanded ? "rotate(90deg)" : "none",
                              transition: "transform 0.2s ease", flexShrink: 0,
                            }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>
                                {r.lectureName || "Lecture"}
                              </div>
                              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                                {r.date?.split("T")[0] || r.date}
                              </div>
                            </div>
                            <span style={{ ...pill, background: T.mint.card, color: T.mint.text, fontSize: 11 }}>
                              {r.presentCount || r.presentStudentIds?.length || 0} Present
                            </span>
                            <span style={{ ...pill, background: T.rose.card, color: T.rose.text, fontSize: 11 }}>
                              {r.absentCount || 0} Absent
                            </span>
                            <span style={{ ...pill, background: rateBg, color: rateColor, fontSize: 11, fontWeight: 800 }}>
                              {rate}%
                            </span>
                          </div>

                          {/* Expanded details */}
                          {expanded && (
                            <div className="anim-fade-in" style={{
                              padding: "16px 24px 20px 52px",
                              background: T.lavender.soft,
                              borderBottom: `1px solid ${T.borderLight}`,
                            }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                                {/* Present */}
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: T.mint.text, marginBottom: 8, textTransform: "uppercase" }}>
                                    ✅ Present ({r.presentStudents?.length || 0})
                                  </div>
                                  {(r.presentStudents || []).map((s, i) => (
                                    <div key={i} style={{
                                      padding: "8px 12px", borderRadius: 10, background: T.mint.soft,
                                      border: `1px solid ${T.mint.border}`, marginBottom: 6,
                                      display: "flex", alignItems: "center", justifyContent: "space-between",
                                    }}>
                                      <div>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: T.mint.text }}>{s.studentName}</span>
                                        <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 8 }}>{s.rollNumber}</span>
                                      </div>
                                      <button onClick={(e) => { e.stopPropagation(); handleOverride(r.lectureId, s.studentId, "mark_absent"); }}
                                        style={{ ...pill, padding: "4px 10px", fontSize: 10, cursor: "pointer", border: "none", fontFamily: "inherit", background: T.rose.card, color: T.rose.text }}>
                                        Mark Absent
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                {/* Absent */}
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: T.rose.text, marginBottom: 8, textTransform: "uppercase" }}>
                                    ❌ Absent ({r.absentStudents?.length || 0})
                                  </div>
                                  {(r.absentStudents || []).map((s, i) => (
                                    <div key={i} style={{
                                      padding: "8px 12px", borderRadius: 10, background: "#FFF5F4",
                                      border: `1px solid ${T.rose.border}`, marginBottom: 6,
                                      display: "flex", alignItems: "center", justifyContent: "space-between",
                                    }}>
                                      <div>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: T.rose.text }}>{s.studentName}</span>
                                        <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 8 }}>{s.rollNumber}</span>
                                      </div>
                                      <button onClick={(e) => { e.stopPropagation(); handleOverride(r.lectureId, s.studentId, "mark_present"); }}
                                        style={{ ...pill, padding: "4px 10px", fontSize: 10, cursor: "pointer", border: "none", fontFamily: "inherit", background: T.mint.card, color: T.mint.text }}>
                                        Mark Present
                                      </button>
                                    </div>
                                  ))}
                                  {(!r.absentStudents || r.absentStudents.length === 0) && (
                                    <div style={{ fontSize: 12, color: T.textMuted, fontStyle: "italic" }}>🎉 100% attendance!</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

/* ═══════════════ STUDENT DASHBOARD ═══════════════ */
function StudentDashboard({ authFetch }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/attendance/my-records").then(async r => {
      if (r.ok) setSummary(await r.json());
    }).catch(() => {}).finally(() => setLoading(false));
  }, [authFetch]);

  if (loading) {
    return <div style={{ padding: 48, textAlign: "center" }}><Loader2 size={24} className="spinner" color={T.textMuted} /></div>;
  }

  if (!summary || summary.totalLectures === 0) {
    return (
      <div style={{
        background: T.white, borderRadius: 24, padding: 48,
        boxShadow: T.shadowCard, border: `1px solid ${T.borderLight}`,
        textAlign: "center",
      }}>
        <CalendarCheck size={48} color={T.textMuted} style={{ marginBottom: 16 }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, marginBottom: 6 }}>No attendance records yet</div>
        <div style={{ fontSize: 13, color: T.textMuted }}>Your teacher hasn't recorded any lectures yet. Check back later!</div>
      </div>
    );
  }

  const pct = summary.attendancePercentage;
  const onTrack = pct >= 75;
  const statusColor = onTrack ? T.mint : T.rose;
  // SVG circular progress
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <>
      {/* Summary card */}
      <div style={{
        background: T.white, borderRadius: 24, padding: 28,
        boxShadow: T.shadowCard, border: `1px solid ${T.borderLight}`, marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
          {/* Circular progress */}
          <div style={{ position: "relative", width: 128, height: 128, flexShrink: 0 }}>
            <svg width="128" height="128" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r={radius} fill="none" stroke={T.borderLight} strokeWidth="10" />
              <circle cx="64" cy="64" r={radius} fill="none" stroke={statusColor.text}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                transform="rotate(-90 64 64)"
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: T.textPrimary }}>{pct}%</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: "uppercase" }}>Attendance</div>
            </div>
          </div>

          {/* KPIs */}
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { label: "Total Lectures", value: summary.totalLectures, icon: "📚", bg: T.lavender.card, color: T.lavender.text },
              { label: "Attended", value: summary.attended, icon: "✅", bg: T.mint.card, color: T.mint.text },
              { label: "Missed", value: summary.absent, icon: "❌", bg: T.rose.card, color: T.rose.text },
            ].map((m, i) => (
              <div key={i} style={{
                padding: "18px 16px", borderRadius: 18, background: m.bg,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{m.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, marginTop: 4, textTransform: "uppercase" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Status badge */}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
          <span style={{
            ...pill, padding: "10px 24px", fontSize: 14,
            background: statusColor.card, color: statusColor.text,
            boxShadow: `0 4px 12px ${onTrack ? "rgba(29, 82, 67, 0.12)" : "rgba(134, 39, 37, 0.12)"}`,
          }}>
            {onTrack ? "✅ On Track — Attendance ≥ 75%" : "⚠️ Low Attendance Warning — Below 75%"}
          </span>
        </div>
      </div>

      {/* Lecture timeline */}
      <div style={{
        background: T.white, borderRadius: 24, boxShadow: T.shadowCard,
        border: `1px solid ${T.borderLight}`, overflow: "hidden",
      }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.borderLight}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarCheck size={18} color={T.lavender.dark} /> Lecture Attendance History
          </h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                {["Lecture Topic", "Class", "Date", "Status", "Confidence"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: T.textMuted, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.lectures.map(l => {
                const isPresent = l.status === "Present";
                return (
                  <tr key={l.lectureId} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: T.textPrimary }}>{l.lectureName}</td>
                    <td style={{ padding: "14px 16px", color: T.textSecondary }}>{l.className || "—"}</td>
                    <td style={{ padding: "14px 16px", color: T.textSecondary }}>{l.date?.split("T")[0] || l.date}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        ...pill,
                        background: isPresent ? T.mint.card : T.rose.card,
                        color: isPresent ? T.mint.text : T.rose.text,
                      }}>
                        {isPresent ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {l.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", color: T.textSecondary }}>
                      {l.similarity != null ? `${(l.similarity * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ MAIN DASHBOARD ═══════════════ */
export default function DashboardPage() {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();

  const roleBadge = {
    admin: { bg: T.lavender.card, color: T.lavender.text, icon: Shield },
    teacher: { bg: T.mint.card, color: T.mint.text, icon: GraduationCap },
    student: { bg: T.yellow.card, color: T.yellow.text, icon: BookOpen },
  }[user?.role] || { bg: T.lavender.card, color: T.lavender.text, icon: Users };

  const RoleIcon = roleBadge.icon;

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${T.bgApp} 0%, #EDE3F7 50%, #E8DFF0 100%)`,
      padding: "32px 24px",
    }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Header bar */}
        <div className="anim-fade-in" style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 32,
        }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.textPrimary, margin: 0, letterSpacing: "-0.02em" }}>
              ClassConnect
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <span style={{ ...pill, background: roleBadge.bg, color: roleBadge.color }}>
                <RoleIcon size={12} /> {user?.role}
              </span>
              <span style={{ fontSize: 13, color: T.textSecondary }}>{user?.email}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => navigate("/app")} style={{
              ...pill, padding: "10px 18px", fontSize: 13, cursor: "pointer", border: "none", fontFamily: "inherit",
              background: T.lavender.card, color: T.lavender.text,
            }}>
              <BookOpen size={14} /> RAG Tutor
            </button>
            <button onClick={() => { logout(); navigate("/login"); }} style={{
              ...pill, padding: "10px 18px", fontSize: 13, cursor: "pointer", border: "none", fontFamily: "inherit",
              background: T.rose.card, color: T.rose.text,
            }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>

        {/* Role-specific dashboard */}
        {user?.role === "admin" && <AdminDashboard authFetch={authFetch} />}
        {user?.role === "teacher" && <TeacherDashboard authFetch={authFetch} />}
        {user?.role === "student" && <StudentDashboard authFetch={authFetch} />}
      </div>
    </div>
  );
}
