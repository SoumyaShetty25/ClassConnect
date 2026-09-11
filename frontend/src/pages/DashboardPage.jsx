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
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    authFetch("/admin/classes").then(async r => {
      if (r.ok) setClasses(await r.json());
    }).catch(() => {});
  }, [authFetch]);

  const handleMark = async (e) => {
    e.preventDefault();
    if (!file || !selectedClass) return;
    setUploading(true); setError(""); setResult(null);
    try {
      const fd = new FormData();
      fd.append("classId", selectedClass);
      fd.append("file", file);
      const res = await authFetch("/attendance/mark", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to mark attendance");
      }
      setResult(await res.json());
      setFile(null);
      // Refresh records
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

  useEffect(() => { if (selectedClass) fetchRecords(selectedClass); }, [selectedClass]);

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
          {/* Upload photo */}
          <div style={{
            background: T.white, borderRadius: 24, padding: 28,
            boxShadow: T.shadowCard, border: `1px solid ${T.borderLight}`, marginBottom: 24,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Camera size={18} color={T.lavender.dark} /> Mark Attendance
            </h3>
            <form onSubmit={handleMark}>
              <input
                id="classroom-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={e => setFile(e.target.files[0])}
                style={{ marginBottom: 16, fontSize: 14, fontFamily: "inherit" }}
              />
              <br />
              <button type="submit" disabled={!file || uploading} style={{
                padding: "12px 28px", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                borderRadius: 9999, border: "none", cursor: !file || uploading ? "not-allowed" : "pointer",
                background: uploading ? T.textSecondary : T.charcoal, color: T.charcoalText,
                display: "inline-flex", alignItems: "center", gap: 8,
              }}>
                {uploading ? <Loader2 size={16} className="spinner" /> : <Upload size={16} />}
                {uploading ? "Processing…" : "Upload & Mark"}
              </button>
            </form>

            {error && <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 12, background: T.rose.card, color: T.rose.text, fontSize: 13, fontWeight: 600 }}>{error}</div>}

            {result && (
              <div className="anim-fade-in" style={{ marginTop: 20, padding: "20px", borderRadius: 18, background: T.mint.soft, border: `1.5px solid ${T.mint.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.mint.text, marginBottom: 10 }}>
                  ✅ Attendance Marked — {result.date}
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <span style={{ ...pill, background: T.mint.card, color: T.mint.text }}>{result.presentCount} Present</span>
                  <span style={{ ...pill, background: T.yellow.card, color: T.yellow.text }}>{result.unknownCount} Unknown</span>
                  <span style={{ ...pill, background: T.lavender.card, color: T.lavender.text }}>{result.totalFacesDetected} Faces</span>
                </div>
                {result.results && result.results.filter(r => r.matched).map((r, i) => (
                  <div key={i} style={{ fontSize: 13, color: T.mint.text, padding: "4px 0" }}>
                    ✓ {r.studentName} (similarity: {r.similarity})
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Records */}
          <div style={{
            background: T.white, borderRadius: 24, boxShadow: T.shadowCard,
            border: `1px solid ${T.borderLight}`, overflow: "hidden",
          }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.borderLight}` }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <CalendarCheck size={18} color={T.lavender.dark} /> Attendance Records
              </h3>
            </div>
            {records.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: T.textMuted, fontSize: 14 }}>No records yet</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                      {["Date", "Present", "Unknown", "Total Faces"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: T.textMuted, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.lectureId} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                        <td style={{ padding: "14px 16px", fontWeight: 600, color: T.textPrimary }}>{r.date?.split("T")[0] || r.date}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ ...pill, background: T.mint.card, color: T.mint.text }}>{r.presentStudentIds?.length || 0}</span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ ...pill, background: T.yellow.card, color: T.yellow.text }}>{r.unknownFaceCount}</span>
                        </td>
                        <td style={{ padding: "14px 16px", color: T.textSecondary }}>
                          {(r.presentStudentIds?.length || 0) + r.unknownFaceCount}
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
    </>
  );
}

/* ═══════════════ STUDENT DASHBOARD ═══════════════ */
function StudentDashboard({ authFetch }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/attendance/my-records").then(async r => {
      if (r.ok) setRecords(await r.json());
    }).catch(() => {}).finally(() => setLoading(false));
  }, [authFetch]);

  return (
    <div style={{
      background: T.white, borderRadius: 24, boxShadow: T.shadowCard,
      border: `1px solid ${T.borderLight}`, overflow: "hidden",
    }}>
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.borderLight}` }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <CalendarCheck size={18} color={T.lavender.dark} /> My Attendance Records
        </h3>
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={24} className="spinner" color={T.textMuted} /></div>
      ) : records.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.textMuted, fontSize: 14 }}>No attendance records yet</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                {["Date", "Class", "Status"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: T.textMuted, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.lectureId} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: T.textPrimary }}>{r.date?.split("T")[0] || r.date}</td>
                  <td style={{ padding: "14px 16px", color: T.textSecondary }}>{r.className || r.classId}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ ...pill, background: T.mint.card, color: T.mint.text }}>
                      <CheckCircle2 size={12} /> Present
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
