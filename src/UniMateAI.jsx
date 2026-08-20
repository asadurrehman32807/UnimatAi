import React, { useState, useEffect, useRef } from "react";
import {
  Home, Calendar, Bot, TrendingUp, User, Plus, Check, Clock, BookOpen,
  Award, Flame, Settings, X, ChevronRight, Sparkles, Send, FileText,
  Brain, Target, GraduationCap, Trash2, Loader2, ListChecks, Sun, Moon,
  Mail, Lock, LogOut, CloudOff, Cloud,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  getToken, getStoredUser, clearSession, signup, login, fetchRemoteData, saveRemoteData,
} from "./api.js";

/* ------------------------------------------------------------------ */
/* Design tokens — "desk lamp at night"                                */
/* ------------------------------------------------------------------ */
const T = {
  bg: "#0E1120",
  bgSoft: "#141833",
  surface: "#1A1F3D",
  border: "#2A3057",
  text: "#EDEFF7",
  textMuted: "#8B90B3",
  accent: "#F5C245",
  accentSoft: "rgba(245,194,69,0.14)",
  teal: "#4FD1C5",
  red: "#F0654B",
  display: "'Sora', 'Inter', sans-serif",
  body: "'Inter', sans-serif",
};

const SUBJECT_COLORS = ["#F5C245", "#4FD1C5", "#B48CF2", "#F0654B", "#63B3ED", "#68D391"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const uid = () => Math.random().toString(36).slice(2, 10);
const todayStr = () => new Date().toISOString().slice(0, 10);
const todayDay = () => DAYS[(new Date().getDay() + 6) % 7];

/* ------------------------------------------------------------------ */
/* Claude API helper — calls a serverless proxy (see /api/claude.js)   */
/* ------------------------------------------------------------------ */
async function askClaude(prompt, { json = false, system } = {}) {
  const sys =
    system ||
    (json
      ? "You are an academic assistant embedded in a student app. Respond with ONLY valid JSON — no markdown fences, no preamble, no commentary."
      : "You are UniMate AI, a warm, encouraging academic assistant embedded in a student productivity app. Keep responses concise, practical, and student-friendly.");
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, system: sys }),
  });
  if (!res.ok) throw new Error("AI request failed");
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || "").join("\n").trim();
  if (json) {
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  }
  return text;
}

/* ------------------------------------------------------------------ */
/* Seed state                                                          */
/* ------------------------------------------------------------------ */
const seedState = () => {
  const subjects = [
    { id: "s1", name: "Data Structures", color: SUBJECT_COLORS[0] },
    { id: "s2", name: "Mathematics", color: SUBJECT_COLORS[1] },
    { id: "s3", name: "Artificial Intelligence", color: SUBJECT_COLORS[2] },
    { id: "s4", name: "Technical Writing", color: SUBJECT_COLORS[3] },
  ];
  return {
    onboarded: false,
    profile: { name: "", university: "", program: "", semester: "", goal: "" },
    subjects,
    timetable: [
      { id: uid(), subject: "s1", day: todayDay(), start: "09:00", end: "10:00", room: "CS-Lab 2" },
      { id: uid(), subject: "s2", day: todayDay(), start: "10:30", end: "11:30", room: "Room 204" },
    ],
    tasks: [
      { id: uid(), title: "Revise AI lecture notes", subject: "s3", priority: "Medium", due: todayStr(), done: false },
      { id: uid(), title: "Practice DS problem set", subject: "s1", priority: "High", due: todayStr(), done: false },
    ],
    assignments: [
      { id: uid(), title: "Binary Trees Implementation", subject: "s1", due: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), priority: "High", status: "In Progress" },
      { id: uid(), title: "Calculus Problem Set 4", subject: "s2", due: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10), priority: "Medium", status: "Not Started" },
    ],
    attendance: {
      s1: { total: 20, attended: 17 },
      s2: { total: 18, attended: 16 },
      s3: { total: 15, attended: 12 },
      s4: { total: 12, attended: 12 },
    },
    gpaSemesters: [
      { id: uid(), name: "Semester 3", gpa: 3.62 },
      { id: uid(), name: "Semester 4", gpa: 3.71 },
    ],
    xp: 0,
    streak: 0,
    chatMessages: [],
  };
};

const load = () => {
  try {
    const raw = localStorage.getItem("unimate_state");
    return raw ? JSON.parse(raw) : seedState();
  } catch {
    return seedState();
  }
};

/* ------------------------------------------------------------------ */
/* Small primitives                                                    */
/* ------------------------------------------------------------------ */
const Card = ({ children, style, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 18,
      padding: 16,
      ...style,
    }}
  >
    {children}
  </div>
);

const Pill = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: "8px 14px",
      borderRadius: 999,
      whiteSpace: "nowrap",
      fontSize: 13,
      fontWeight: 600,
      border: `1px solid ${active ? T.accent : T.border}`,
      background: active ? T.accent : "transparent",
      color: active ? "#1A1200" : T.textMuted,
    }}
  >
    {children}
  </button>
);

const Btn = ({ children, onClick, variant = "primary", style, disabled }) => {
  const base = {
    padding: "12px 18px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    opacity: disabled ? 0.6 : 1,
  };
  const variants = {
    primary: { background: T.accent, color: "#1A1200" },
    ghost: { background: "transparent", color: T.text, border: `1px solid ${T.border}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${T.border}`,
  background: T.bgSoft,
  color: T.text,
  fontSize: 14,
  outline: "none",
};

const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div style={{ textAlign: "center", padding: "32px 16px", color: T.textMuted }}>
    <Icon size={28} style={{ opacity: 0.5, marginBottom: 10 }} />
    <div style={{ fontWeight: 700, color: T.text, marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 13 }}>{subtitle}</div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Onboarding                                                          */
/* ------------------------------------------------------------------ */
/* Auth (sign up / log in) — required for cross-device sync            */
/* ------------------------------------------------------------------ */
function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const result = mode === "login" ? await login(email, password) : await signup(email, password, name);
      onAuthed(result.user);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 380, width: "100%" }}>
        <div
          style={{
            width: 56, height: 56, borderRadius: 16, background: T.accentSoft,
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18,
          }}
        >
          <Sparkles color={T.accent} size={26} />
        </div>
        <h1 style={{ fontFamily: T.display, color: T.text, fontSize: 26, marginBottom: 6 }}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p style={{ color: T.textMuted, fontSize: 14, marginBottom: 22 }}>
          {mode === "login" ? "Log in to sync your tasks, grades, and timetable." : "Your data syncs across every device you log into."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <input style={inputStyle} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <div style={{ position: "relative" }}>
            <Mail size={16} color={T.textMuted} style={{ position: "absolute", left: 14, top: 14 }} />
            <input style={{ ...inputStyle, paddingLeft: 38 }} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div style={{ position: "relative" }}>
            <Lock size={16} color={T.textMuted} style={{ position: "absolute", left: 14, top: 14 }} />
            <input style={{ ...inputStyle, paddingLeft: 38 }} placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          </div>
        </div>

        {error && <div style={{ color: T.red, fontSize: 13, marginTop: 10 }}>{error}</div>}

        <Btn style={{ width: "100%", marginTop: 18 }} onClick={submit} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : mode === "login" ? "Log in" : "Sign up"}
        </Btn>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: T.textMuted }}>
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{ background: "none", border: "none", color: T.accent, fontWeight: 700 }}
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function Onboarding({ onDone }) {
  const [form, setForm] = useState({ name: "", university: "", program: "", semester: "", goal: "" });
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 420, width: "100%" }}>
        <div
          style={{
            width: 56, height: 56, borderRadius: 16, background: T.accentSoft,
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18,
          }}
        >
          <Sparkles color={T.accent} size={26} />
        </div>
        <h1 style={{ fontFamily: T.display, color: T.text, fontSize: 28, marginBottom: 6 }}>Welcome to UniMate AI</h1>
        <p style={{ color: T.textMuted, fontSize: 14, marginBottom: 24 }}>
          Your student life, organized. Let's set things up.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input style={inputStyle} placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input style={inputStyle} placeholder="University" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} />
          <input style={inputStyle} placeholder="Program (e.g. BS Computer Science)" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} />
          <input style={inputStyle} placeholder="Current semester" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
          <input style={inputStyle} placeholder="What's your goal this semester?" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
        </div>
        <Btn style={{ width: "100%", marginTop: 20 }} onClick={() => onDone(form)} disabled={!form.name.trim()}>
          Get started <ChevronRight size={16} />
        </Btn>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Home                                                                 */
/* ------------------------------------------------------------------ */
function HomeView({ state, actions, setTab }) {
  const todaysClasses = state.timetable.filter((c) => c.day === todayDay());
  const todaysTasks = state.tasks.filter((t) => t.due === todayStr());
  const subjectOf = (id) => state.subjects.find((s) => s.id === id);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          borderRadius: 20, padding: 20, position: "relative", overflow: "hidden",
          background: `radial-gradient(120% 140% at 15% 0%, ${T.accentSoft} 0%, ${T.bgSoft} 55%)`,
          border: `1px solid ${T.border}`,
        }}
      >
        <div style={{ color: T.textMuted, fontSize: 13, marginBottom: 4 }}>{greeting}</div>
        <div style={{ fontFamily: T.display, fontSize: 24, color: T.text, fontWeight: 700 }}>
          {state.profile.name || "Student"}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Flame size={16} color={T.accent} />
            <span style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{state.streak} day streak</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Award size={16} color={T.teal} />
            <span style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{state.xp} XP</span>
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ color: T.text, fontFamily: T.display, fontSize: 16 }}>Today's classes</h3>
          <button onClick={() => setTab("planner")} style={{ background: "none", border: "none", color: T.textMuted, fontSize: 12 }}>See all</button>
        </div>
        {todaysClasses.length === 0 ? (
          <Card><EmptyState icon={Calendar} title="No classes today" subtitle="Enjoy the free time!" /></Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todaysClasses.map((c) => {
              const subj = subjectOf(c.subject);
              return (
                <Card key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
                  <div style={{ width: 4, height: 34, borderRadius: 4, background: subj?.color }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{subj?.name}</div>
                    <div style={{ color: T.textMuted, fontSize: 12 }}>{c.room}</div>
                  </div>
                  <div style={{ color: T.textMuted, fontSize: 12, fontWeight: 600 }}>{c.start} – {c.end}</div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ color: T.text, fontFamily: T.display, fontSize: 16 }}>Today's tasks</h3>
          <button onClick={() => setTab("planner")} style={{ background: "none", border: "none", color: T.textMuted, fontSize: 12 }}>See all</button>
        </div>
        {todaysTasks.length === 0 ? (
          <Card><EmptyState icon={ListChecks} title="Nothing due today" subtitle="Add a task to stay on track." /></Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todaysTasks.map((task) => (
              <Card key={task.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
                <button
                  onClick={() => actions.toggleTask(task.id)}
                  style={{
                    width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                    border: `2px solid ${task.done ? T.teal : T.border}`,
                    background: task.done ? T.teal : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {task.done && <Check size={13} color="#0E1120" />}
                </button>
                <div style={{ flex: 1, textDecoration: task.done ? "line-through" : "none", color: task.done ? T.textMuted : T.text, fontSize: 14, fontWeight: 600 }}>
                  {task.title}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card onClick={() => setTab("chat")} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <Bot color={T.accent} size={22} />
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>Ask UniMate AI</div>
          <div style={{ color: T.textMuted, fontSize: 12 }}>Explain a topic, plan your week, or generate a quiz</div>
        </div>
        <ChevronRight size={18} color={T.textMuted} />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Planner (timetable + tasks + assignments)                           */
/* ------------------------------------------------------------------ */
function PlannerView({ state, actions }) {
  const [sub, setSub] = useState("tasks");
  const [newTitle, setNewTitle] = useState("");
  const subjectOf = (id) => state.subjects.find((s) => s.id === id);

  const addTask = () => {
    if (!newTitle.trim()) return;
    actions.addTask({ id: uid(), title: newTitle, subject: state.subjects[0]?.id, priority: "Medium", due: todayStr(), done: false });
    setNewTitle("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Pill active={sub === "tasks"} onClick={() => setSub("tasks")}>Tasks</Pill>
        <Pill active={sub === "assignments"} onClick={() => setSub("assignments")}>Assignments</Pill>
        <Pill active={sub === "timetable"} onClick={() => setSub("timetable")}>Timetable</Pill>
      </div>

      {sub === "tasks" && (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={inputStyle} placeholder="Add a task…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} />
            <Btn onClick={addTask}><Plus size={16} /></Btn>
          </div>
          {state.tasks.length === 0 ? (
            <Card><EmptyState icon={ListChecks} title="No tasks yet" subtitle="Add your first task above." /></Card>
          ) : (
            state.tasks.map((task) => (
              <Card key={task.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => actions.toggleTask(task.id)}
                  style={{
                    width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                    border: `2px solid ${task.done ? T.teal : T.border}`,
                    background: task.done ? T.teal : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {task.done && <Check size={13} color="#0E1120" />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ color: task.done ? T.textMuted : T.text, textDecoration: task.done ? "line-through" : "none", fontWeight: 600, fontSize: 14 }}>{task.title}</div>
                  <div style={{ color: T.textMuted, fontSize: 12 }}>{subjectOf(task.subject)?.name} · {task.priority}</div>
                </div>
                <button onClick={() => actions.removeTask(task.id)} style={{ background: "none", border: "none" }}>
                  <Trash2 size={16} color={T.textMuted} />
                </button>
              </Card>
            ))
          )}
        </>
      )}

      {sub === "assignments" && (
        <>
          {state.assignments.length === 0 ? (
            <Card><EmptyState icon={FileText} title="No assignments" subtitle="You're all caught up." /></Card>
          ) : (
            state.assignments.map((a) => (
              <Card key={a.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                    <div style={{ color: T.textMuted, fontSize: 12, marginTop: 2 }}>{subjectOf(a.subject)?.name} · Due {a.due}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: a.priority === "High" ? "rgba(240,101,75,0.15)" : T.accentSoft, color: a.priority === "High" ? T.red : T.accent }}>
                    {a.priority}
                  </span>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: T.teal, fontWeight: 700 }}>{a.status}</div>
              </Card>
            ))
          )}
        </>
      )}

      {sub === "timetable" && (
        <>
          {DAYS.map((day) => {
            const classes = state.timetable.filter((c) => c.day === day);
            if (!classes.length) return null;
            return (
              <div key={day}>
                <div style={{ color: T.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{day}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {classes.map((c) => {
                    const subj = subjectOf(c.subject);
                    return (
                      <Card key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
                        <div style={{ width: 4, height: 34, borderRadius: 4, background: subj?.color }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{subj?.name}</div>
                          <div style={{ color: T.textMuted, fontSize: 12 }}>{c.room}</div>
                        </div>
                        <div style={{ color: T.textMuted, fontSize: 12, fontWeight: 600 }}>{c.start} – {c.end}</div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI Chat                                                              */
/* ------------------------------------------------------------------ */
function ChatView({ state, actions }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [state.chatMessages, loading]);

  const quickActions = [
    { label: "📚 Explain a topic", prompt: "Explain the concept of: " },
    { label: "🧠 Generate a quiz", prompt: "Generate 5 quiz questions about: " },
    { label: "📅 Plan my week", prompt: "Help me plan my study week for: " },
  ];

  const send = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: "user", content: text };
    actions.addChatMessage(userMsg);
    setInput("");
    setLoading(true);
    try {
      const history = [...state.chatMessages, userMsg].slice(-8).map((m) => `${m.role === "user" ? "Student" : "Assistant"}: ${m.content}`).join("\n");
      const reply = await askClaude(`Conversation so far:\n${history}\n\nRespond to the student's latest message.`);
      actions.addChatMessage({ role: "assistant", content: reply });
    } catch {
      actions.addChatMessage({ role: "assistant", content: "Sorry, I couldn't reach the AI service just now. Make sure the /api/claude serverless function is deployed with a valid API key." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
        {quickActions.map((qa) => (
          <button key={qa.label} onClick={() => setInput(qa.prompt)} style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 999, border: `1px solid ${T.border}`, background: T.surface, color: T.textMuted }}>
            {qa.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 260, display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {state.chatMessages.length === 0 && <EmptyState icon={Bot} title="Ask me anything academic" subtitle="Concepts, plans, quizzes, summaries — I'm here to help." />}
        {state.chatMessages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "82%", padding: "10px 13px", borderRadius: 14,
              borderBottomRightRadius: m.role === "user" ? 4 : 14,
              borderBottomLeftRadius: m.role === "user" ? 14 : 4,
              background: m.role === "user" ? T.accent : T.surface,
              color: m.role === "user" ? "#1A1200" : T.text,
              border: m.role === "user" ? "none" : `1px solid ${T.border}`,
              fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ color: T.textMuted, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}><Loader2 size={13} className="spin" /> Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...inputStyle, flex: 1 }} placeholder="Ask about a topic, assignment, or plan…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)} />
        <Btn onClick={() => send(input)} disabled={loading} style={{ padding: 12 }}><Send size={16} /></Btn>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                             */
/* ------------------------------------------------------------------ */
function ProgressView({ state }) {
  const attendanceData = state.subjects.map((s) => {
    const a = state.attendance[s.id] || { total: 0, attended: 0 };
    return { name: s.name.split(" ")[0], pct: a.total ? Math.round((a.attended / a.total) * 100) : 0 };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <h3 style={{ color: T.text, fontFamily: T.display, fontSize: 15, marginBottom: 12 }}>Attendance by subject</h3>
        <div style={{ width: "100%", height: 180 }}>
          <ResponsiveContainer>
            <BarChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="name" stroke={T.textMuted} fontSize={11} />
              <YAxis stroke={T.textMuted} fontSize={11} />
              <Tooltip contentStyle={{ background: T.bgSoft, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} />
              <Bar dataKey="pct" fill={T.accent} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 style={{ color: T.text, fontFamily: T.display, fontSize: 15, marginBottom: 12 }}>GPA history</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {state.gpaSemesters.map((g) => (
            <div key={g.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ color: T.textMuted, fontSize: 13 }}>{g.name}</span>
              <span style={{ color: T.text, fontWeight: 700, fontSize: 13 }}>{g.gpa.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: T.accentSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Award color={T.accent} size={22} />
        </div>
        <div>
          <div style={{ color: T.text, fontWeight: 700, fontSize: 15 }}>{state.xp} XP earned</div>
          <div style={{ color: T.textMuted, fontSize: 12 }}>Keep completing tasks to level up</div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profile                                                              */
/* ------------------------------------------------------------------ */
function ProfileView({ state, actions, user, syncStatus }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ textAlign: "center", padding: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <User color={T.accent} size={28} />
        </div>
        <div style={{ color: T.text, fontWeight: 700, fontSize: 18, fontFamily: T.display }}>{state.profile.name || "Student"}</div>
        <div style={{ color: T.textMuted, fontSize: 13, marginTop: 2 }}>{state.profile.university}</div>
        <div style={{ color: T.textMuted, fontSize: 12 }}>{state.profile.program} · {state.profile.semester}</div>
        {user?.email && <div style={{ color: T.textMuted, fontSize: 12, marginTop: 6 }}>{user.email}</div>}
      </Card>

      <Card style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {syncStatus === "saving" ? (
          <>
            <Loader2 size={16} className="spin" color={T.accent} />
            <span style={{ color: T.textMuted, fontSize: 13 }}>Syncing…</span>
          </>
        ) : syncStatus === "error" ? (
          <>
            <CloudOff size={16} color={T.red} />
            <span style={{ color: T.red, fontSize: 13 }}>Couldn't sync — check your connection</span>
          </>
        ) : (
          <>
            <Cloud size={16} color={T.teal} />
            <span style={{ color: T.textMuted, fontSize: 13 }}>Synced across your devices</span>
          </>
        )}
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Target size={16} color={T.accent} />
          <span style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>This semester's goal</span>
        </div>
        <div style={{ color: T.textMuted, fontSize: 13, marginTop: 6 }}>{state.profile.goal || "No goal set yet."}</div>
      </Card>

      <Card onClick={actions.resetApp} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        <Settings size={18} color={T.textMuted} />
        <span style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>Reset app data</span>
      </Card>

      <Card onClick={actions.logout} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        <LogOut size={18} color={T.red} />
        <span style={{ color: T.red, fontSize: 14, fontWeight: 600 }}>Log out</span>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App shell                                                            */
/* ------------------------------------------------------------------ */
function AppShell({ state, setState, user, syncStatus, logout }) {
  const [tab, setTab] = useState("home");

  const actions = {
    toggleTask: (id) =>
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        xp: s.xp + (s.tasks.find((t) => t.id === id)?.done ? -10 : 10),
      })),
    addTask: (task) => setState((s) => ({ ...s, tasks: [task, ...s.tasks] })),
    removeTask: (id) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })),
    addChatMessage: (msg) => setState((s) => ({ ...s, chatMessages: [...s.chatMessages, msg] })),
    resetApp: () => {
      if (confirm("Reset all app data? This clears your synced data too.")) {
        setState(seedState());
        setTab("home");
      }
    },
    logout,
  };

  if (!state.onboarded) {
    return (
      <Onboarding
        onDone={(profile) =>
          setState((s) => ({ ...s, onboarded: true, profile }))
        }
      />
    );
  }

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "planner", label: "Planner", icon: Calendar },
    { id: "chat", label: "AI Chat", icon: Bot },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "profile", label: "Profile", icon: User },
  ];

  const views = {
    home: <HomeView state={state} actions={actions} setTab={setTab} />,
    planner: <PlannerView state={state} actions={actions} />,
    chat: <ChatView state={state} actions={actions} />,
    progress: <ProgressView state={state} />,
    profile: <ProfileView state={state} actions={actions} user={user} syncStatus={syncStatus} />,
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div style={{ flex: 1, padding: "20px 16px 90px", overflowY: "auto" }}>
          {views[tab]}
        </div>
        <nav
          style={{
            position: "fixed", bottom: 0, width: "100%", maxWidth: 480,
            background: T.bgSoft, borderTop: `1px solid ${T.border}`,
            display: "flex", justifyContent: "space-around", padding: "10px 6px",
          }}
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: "none", border: "none", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 3, color: active ? T.accent : T.textMuted, fontSize: 10, fontWeight: 700,
                }}
              >
                <Icon size={20} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Root — handles auth + cross-device sync, then renders the app shell */
/* ------------------------------------------------------------------ */
export default function UniMateAI() {
  const [user, setUser] = useState(getStoredUser);
  const [state, setState] = useState(load); // localStorage cache, used offline / before sync
  const [booting, setBooting] = useState(!!getToken());
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | saving | error
  const saveTimer = useRef(null);
  const firstLoad = useRef(true);

  // On mount, if we have a token, pull the latest data from the server.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setBooting(false);
      return;
    }
    fetchRemoteData()
      .then((remote) => {
        if (remote && Object.keys(remote).length > 0) {
          setState({ ...seedState(), ...remote });
        }
      })
      .catch(() => {
        // Fall back silently to the local cache if the server is unreachable.
      })
      .finally(() => setBooting(false));
  }, []);

  // Persist locally (offline cache) and debounce a save to the server.
  useEffect(() => {
    localStorage.setItem("unimate_state", JSON.stringify(state));
    if (!user) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    setSyncStatus("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveRemoteData(state)
        .then(() => setSyncStatus("idle"))
        .catch(() => setSyncStatus("error"));
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [state, user]);

  const logout = () => {
    clearSession();
    setUser(null);
    setState(seedState());
    firstLoad.current = true;
  };

  if (!user) {
    return (
      <AuthScreen
        onAuthed={(u) => {
          setUser(u);
          setBooting(true);
          fetchRemoteData()
            .then((remote) => {
              if (remote && Object.keys(remote).length > 0) {
                setState({ ...seedState(), ...remote });
              }
            })
            .catch(() => {})
            .finally(() => setBooting(false));
        }}
      />
    );
  }

  if (booting) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={22} className="spin" color={T.accent} />
      </div>
    );
  }

  return <AppShell state={state} setState={setState} user={user} syncStatus={syncStatus} logout={logout} />;
}
