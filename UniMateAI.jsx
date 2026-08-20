import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Home, Calendar, Bot, TrendingUp, User, Plus, Check, Clock, BookOpen,
  Award, Flame, Settings, X, ChevronRight, Sun, Moon, Sparkles, Send,
  FileText, Brain, Target, GraduationCap, BarChart3, Trophy, Play, Pause,
  RotateCcw, Trash2, Pencil, ChevronLeft, AlertTriangle, CheckCircle2,
  Loader2, MessageSquare, ListChecks, PieChart as PieChartIcon
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";

/* ------------------------------------------------------------------ */
/* Design tokens — "desk lamp at night" theme                         */
/* ------------------------------------------------------------------ */
const themes = {
  dark: {
    bg: "#0E1120",
    bgSoft: "#141833",
    surface: "#1A1F3D",
    surfaceAlt: "#212752",
    border: "#2B3162",
    text: "#F3F1EA",
    textMuted: "#9199C4",
    textFaint: "#5D6494",
    accent: "#F5A623",
    accentSoft: "#FFD68A",
    accent2: "#7C9CFF",
    success: "#4ADE80",
    danger: "#F87171",
    warn: "#FBBF24",
  },
  light: {
    bg: "#F6F4EE",
    bgSoft: "#EFECE2",
    surface: "#FFFFFF",
    surfaceAlt: "#FBF8F1",
    border: "#E4DFCF",
    text: "#211D14",
    textMuted: "#6E6752",
    textFaint: "#A69E82",
    accent: "#C2761A",
    accentSoft: "#F2C879",
    accent2: "#4A5FBF",
    success: "#2E9B5A",
    danger: "#D9483F",
    warn: "#B5810F",
  },
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');`;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SUBJECT_COLORS = ["#F5A623", "#7C9CFF", "#4ADE80", "#F87171", "#C084FC", "#38BDF8", "#FB923C"];

const uid = () => Math.random().toString(36).slice(2, 10);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
const daysUntil = (d) => {
  if (!d) return null;
  const today = new Date(todayStr() + "T00:00:00");
  const due = new Date(d + "T00:00:00");
  return Math.round((due - today) / 86400000);
};

/* ------------------------------------------------------------------ */
/* Seed data                                                          */
/* ------------------------------------------------------------------ */
const seedState = () => {
  const subjects = [
    { id: "s1", name: "Data Structures", color: SUBJECT_COLORS[0] },
    { id: "s2", name: "Mathematics", color: SUBJECT_COLORS[1] },
    { id: "s3", name: "Artificial Intelligence", color: SUBJECT_COLORS[2] },
    { id: "s4", name: "Technical Writing", color: SUBJECT_COLORS[3] },
  ];
  const dayName = DAYS[(new Date().getDay() + 6) % 7];
  return {
    onboarded: false,
    theme: "dark",
    profile: {
      name: "",
      university: "",
      program: "",
      semester: "",
      studyHours: 3,
      goal: "",
      language: "English",
    },
    subjects,
    timetable: [
      { id: uid(), subject: "s1", day: dayName, start: "09:00", end: "10:00", room: "CS-Lab 2", teacher: "Dr. Farooq" },
      { id: uid(), subject: "s2", day: dayName, start: "10:30", end: "11:30", room: "Room 204", teacher: "Ms. Hina" },
      { id: uid(), subject: "s3", day: DAYS[((new Date().getDay() + 6) % 7 + 1) % 7], start: "13:00", end: "14:30", room: "Room 101", teacher: "Dr. Ahmed" },
    ],
    tasks: [
      { id: uid(), title: "Revise AI lecture notes", subject: "s3", priority: "Medium", due: todayStr(), estMinutes: 45, done: false },
      { id: uid(), title: "Practice DS problem set", subject: "s1", priority: "High", due: todayStr(), estMinutes: 60, done: false },
    ],
    assignments: [
      { id: uid(), title: "Binary Trees Implementation", subject: "s1", description: "Implement AVL insertion & deletion.", due: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), priority: "High", estMinutes: 180, status: "In Progress" },
      { id: uid(), title: "Calculus Problem Set 4", subject: "s2", description: "Chapter 6, questions 1–20.", due: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10), priority: "Medium", estMinutes: 90, status: "Not Started" },
    ],
    studySessions: [],
    activityDates: [],
    attendance: {
      s1: { total: 20, attended: 17 },
      s2: { total: 18, attended: 16 },
      s3: { total: 15, attended: 12 },
      s4: { total: 12, attended: 12 },
    },
    attendanceTarget: 80,
    gpaSemesters: [
      { id: uid(), name: "Semester 3", gpa: 3.62, courses: [] },
      { id: uid(), name: "Semester 4", gpa: 3.71, courses: [] },
    ],
    quizHistory: [],
    xp: 0,
    achievements: [],
    aiStudyPlan: null,
    chatMessages: [],
    notifPrefs: { classes: true, deadlines: true, exams: true, studySessions: false },
  };
};

/* ------------------------------------------------------------------ */
/* Claude API helper                                                   */
/* ------------------------------------------------------------------ */
async function askClaude(prompt, { json = false } = {}) {
  const system = json
    ? "You are an academic assistant embedded in a student app. Respond with ONLY valid JSON — no markdown fences, no preamble, no commentary."
    : "You are UniMate AI, a warm, encouraging academic assistant embedded in a student productivity app called UniMate AI. Keep responses concise, practical, and student-friendly. Clearly note when something should be verified against course materials.";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || "").join("\n").trim();
  if (json) {
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  }
  return text;
}

/* ------------------------------------------------------------------ */
/* Small primitives                                                    */
/* ------------------------------------------------------------------ */
function useT() {
  // pulled from context via prop-drilled theme object — simplified helper defined per-component
}

const Card = ({ t, children, style, className = "", onClick }) => (
  <div
    onClick={onClick}
    className={className}
    style={{
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 18,
      padding: 16,
      ...style,
    }}
  >
    {children}
  </div>
);

const Pill = ({ t, active, onClick, children, icon: Icon }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "8px 14px", borderRadius: 999, whiteSpace: "nowrap",
      fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif",
      border: `1px solid ${active ? t.accent : t.border}`,
      background: active ? t.accent : "transparent",
      color: active ? "#1A1200" : t.textMuted,
      cursor: "pointer", transition: "all .15s ease", flexShrink: 0,
    }}
  >
    {Icon && <Icon size={14} />}
    {children}
  </button>
);

const ProgressBar = ({ t, value, color }) => (
  <div style={{ height: 8, borderRadius: 999, background: t.bgSoft, overflow: "hidden" }}>
    <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, value))}%`, background: color || t.accent, borderRadius: 999, transition: "width .4s ease" }} />
  </div>
);

const Badge = ({ t, color, children }) => (
  <span style={{
    fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
    background: `${color}22`, color, fontFamily: "Inter, sans-serif", letterSpacing: 0.3,
  }}>{children}</span>
);

const IconBtn = ({ t, icon: Icon, onClick, danger }) => (
  <button onClick={onClick} style={{
    width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: `1px solid ${t.border}`, color: danger ? t.danger : t.textMuted, cursor: "pointer",
  }}>
    <Icon size={14} />
  </button>
);

function Modal({ t, title, onClose, children, wide }) {
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: wide ? 480 : 420, maxHeight: "88%", overflowY: "auto",
          background: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 20, border: `1px solid ${t.border}`, borderBottom: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 600, color: t.text, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const Field = ({ t, label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6, fontFamily: "Inter, sans-serif" }}>{label}</label>
    {children}
  </div>
);

const inputStyle = (t) => ({
  width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.border}`,
  background: t.bgSoft, color: t.text, fontSize: 14, fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box",
});

const btnPrimary = (t) => ({
  padding: "11px 18px", borderRadius: 12, border: "none", background: t.accent, color: "#1A1200",
  fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex",
  alignItems: "center", justifyContent: "center", gap: 8,
});

const btnGhost = (t) => ({
  padding: "11px 18px", borderRadius: 12, border: `1px solid ${t.border}`, background: "transparent", color: t.text,
  fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif",
});

function EmptyState({ t, icon: Icon, title, subtitle }) {
  return (
    <div style={{ textAlign: "center", padding: "36px 16px", color: t.textMuted }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16, background: t.bgSoft, display: "flex", alignItems: "center",
        justifyContent: "center", margin: "0 auto 12px",
      }}>
        <Icon size={22} color={t.textFaint} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{subtitle}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Onboarding                                                          */
/* ------------------------------------------------------------------ */
function Onboarding({ t, onComplete }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", university: "", program: "", semester: "", studyHours: 3, goal: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const steps = [
    { title: "Welcome to UniMate AI", sub: "Let's set up your academic profile so we can personalize everything." },
    { title: "About you", sub: "" },
    { title: "Your study rhythm", sub: "" },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0, background: t.bg, zIndex: 60, display: "flex",
      flexDirection: "column", padding: 24, fontFamily: "Inter, sans-serif",
    }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: 4, flex: 1, borderRadius: 999, background: i <= step ? t.accent : t.border }} />
        ))}
      </div>

      <div style={{ flex: 1 }}>
        {step === 0 && (
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <div style={{
              width: 84, height: 84, borderRadius: 24, margin: "0 auto 22px", display: "flex",
              alignItems: "center", justifyContent: "center",
              background: `radial-gradient(circle at 30% 20%, ${t.accentSoft}, ${t.accent})`,
              boxShadow: `0 0 40px ${t.accent}55`,
            }}>
              <GraduationCap size={38} color="#1A1200" />
            </div>
            <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 28, color: t.text, margin: "0 0 10px" }}>UniMate AI</h1>
            <p style={{ color: t.textMuted, fontSize: 14, lineHeight: 1.6, maxWidth: 300, margin: "0 auto" }}>
              Your timetable, tasks, notes, exams, and study plan — in one calm place.
            </p>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: t.text, marginBottom: 4 }}>About you</h2>
            <p style={{ color: t.textMuted, fontSize: 13, marginBottom: 20 }}>This personalizes your dashboard.</p>
            <Field t={t} label="Full name">
              <input style={inputStyle(t)} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Asad Khan" />
            </Field>
            <Field t={t} label="University / school">
              <input style={inputStyle(t)} value={form.university} onChange={(e) => set("university", e.target.value)} placeholder="FAST-NUCES" />
            </Field>
            <Field t={t} label="Degree / program">
              <input style={inputStyle(t)} value={form.program} onChange={(e) => set("program", e.target.value)} placeholder="BS Computer Science" />
            </Field>
            <Field t={t} label="Current semester">
              <input style={inputStyle(t)} value={form.semester} onChange={(e) => set("semester", e.target.value)} placeholder="5th Semester" />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: t.text, marginBottom: 4 }}>Your study rhythm</h2>
            <p style={{ color: t.textMuted, fontSize: 13, marginBottom: 20 }}>The AI planner uses this as a starting point.</p>
            <Field t={t} label={`Preferred daily study hours — ${form.studyHours}h`}>
              <input type="range" min={1} max={8} value={form.studyHours} onChange={(e) => set("studyHours", +e.target.value)} style={{ width: "100%" }} />
            </Field>
            <Field t={t} label="An academic goal for this semester">
              <textarea style={{ ...inputStyle(t), minHeight: 80, resize: "vertical" }} value={form.goal} onChange={(e) => set("goal", e.target.value)} placeholder="Keep CGPA above 3.5 and stay ahead on assignments." />
            </Field>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        {step > 0 && <button style={btnGhost(t)} onClick={() => setStep((s) => s - 1)}>Back</button>}
        <button
          style={{ ...btnPrimary(t), flex: 1 }}
          onClick={() => {
            if (step < 2) setStep((s) => s + 1);
            else onComplete(form);
          }}
        >
          {step < 2 ? "Continue" : "Enter UniMate AI"} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HOME                                                                 */
/* ------------------------------------------------------------------ */
function Home({ t, state, actions, go }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dayName = DAYS[(new Date().getDay() + 6) % 7];
  const subjById = Object.fromEntries(state.subjects.map((s) => [s.id, s]));

  const todaysClasses = state.timetable
    .filter((c) => c.day === dayName)
    .sort((a, b) => a.start.localeCompare(b.start));

  const todaysTasks = state.tasks.filter((task) => task.due === todayStr());
  const doneCount = todaysTasks.filter((x) => x.done).length;

  const nextClass = todaysClasses.find((c) => {
    const [h, m] = c.start.split(":").map(Number);
    const cd = new Date(); cd.setHours(h, m, 0, 0);
    return cd > new Date();
  });

  const studyMinutesToday = state.studySessions
    .filter((s) => s.date === todayStr())
    .reduce((a, b) => a + b.minutes, 0);

  return (
    <div style={{ padding: "18px 16px 100px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, color: t.text, fontWeight: 600 }}>
          {greeting}{state.profile.name ? `, ${state.profile.name.split(" ")[0]}` : ""} 👋
        </div>
        <div style={{ color: t.textMuted, fontSize: 13.5, marginTop: 2 }}>Let's make progress today.</div>
      </div>

      {/* Streak + summary */}
      <Card t={t} style={{ marginBottom: 14, background: `linear-gradient(135deg, ${t.surfaceAlt}, ${t.surface})` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: t.accent, fontWeight: 700, fontSize: 15 }}>
              <Flame size={17} /> {state.streak || 0}-day streak
            </div>
            <div style={{ color: t.textMuted, fontSize: 12.5, marginTop: 4 }}>
              {doneCount}/{todaysTasks.length || 0} tasks done · {studyMinutesToday}m studied today
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, color: t.text, fontWeight: 700 }}>{state.xp} XP</div>
            <div style={{ color: t.textFaint, fontSize: 11 }}>keep going 🔥</div>
          </div>
        </div>
      </Card>

      {/* Today's schedule */}
      <SectionHeader t={t} title="Today's schedule" onAction={() => go("planner", "timetable")} actionLabel="Timetable" />
      {todaysClasses.length === 0 ? (
        <Card t={t} style={{ marginBottom: 16 }}>
          <EmptyState t={t} icon={Calendar} title="No classes today" subtitle={`Enjoy ${dayName}, or add a class.`} />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {todaysClasses.map((c) => {
            const subj = subjById[c.subject];
            const isNext = nextClass && nextClass.id === c.id;
            return (
              <Card key={c.id} t={t} style={{ display: "flex", alignItems: "center", gap: 12, borderColor: isNext ? t.accent : t.border }}>
                <div style={{ width: 4, height: 36, borderRadius: 4, background: subj?.color || t.accent }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: t.text, fontSize: 14 }}>{subj?.name || "Subject"}</div>
                  <div style={{ color: t.textMuted, fontSize: 12 }}>{c.room} · {c.teacher}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: isNext ? t.accent : t.text, fontWeight: 700 }}>{c.start}</div>
                  {isNext && <Badge t={t} color={t.accent}>NEXT</Badge>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Today's tasks */}
      <SectionHeader t={t} title="Today's tasks" onAction={() => go("planner", "tasks")} actionLabel="See all" />
      {todaysTasks.length === 0 ? (
        <Card t={t} style={{ marginBottom: 16 }}>
          <EmptyState t={t} icon={ListChecks} title="Nothing due today" subtitle="Add a task to stay ahead." />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {todaysTasks.map((task) => (
            <TaskRow key={task.id} t={t} task={task} subj={subjById[task.subject]} onToggle={() => actions.toggleTask(task.id)} />
          ))}
        </div>
      )}

      {/* Smart summary */}
      <SectionHeader t={t} title="Smart daily summary" />
      <Card t={t} style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, color: t.text, lineHeight: 1.7 }}>
          You completed <b>{doneCount} of {todaysTasks.length}</b> tasks today
          {studyMinutesToday > 0 ? <> and studied for <b>{studyMinutesToday} minutes</b></> : ""}.{" "}
          {doneCount === todaysTasks.length && todaysTasks.length > 0 ? "Fully on top of today — nice work! 🔥" : "Keep going!"}
        </div>
      </Card>

      <button style={{ ...btnPrimary(t), width: "100%" }} onClick={() => go("focus")}>
        <Play size={16} /> Start a focus session
      </button>
    </div>
  );
}

function SectionHeader({ t, title, onAction, actionLabel }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, color: t.text }}>{title}</div>
      {onAction && (
        <button onClick={onAction} style={{ background: "transparent", border: "none", color: t.accent, fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 2, fontFamily: "Inter, sans-serif" }}>
          {actionLabel} <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

function TaskRow({ t, task, subj, onToggle, onDelete }) {
  const overdue = task.due && daysUntil(task.due) < 0 && !task.done;
  const prColor = task.priority === "High" ? t.danger : task.priority === "Medium" ? t.warn : t.success;
  return (
    <Card t={t} style={{ display: "flex", alignItems: "center", gap: 12, opacity: task.done ? 0.55 : 1 }}>
      <button
        onClick={onToggle}
        style={{
          width: 22, height: 22, borderRadius: 7, flexShrink: 0, cursor: "pointer",
          border: `2px solid ${task.done ? t.success : t.border}`, background: task.done ? t.success : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {task.done && <Check size={13} color="#0E1120" strokeWidth={3} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: t.text, textDecoration: task.done ? "line-through" : "none" }}>{task.title}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3, flexWrap: "wrap" }}>
          {subj && <span style={{ fontSize: 11, color: subj.color, fontWeight: 600 }}>{subj.name}</span>}
          <span style={{ fontSize: 11, color: t.textFaint }}>· {task.estMinutes}m</span>
          {task.due && <span style={{ fontSize: 11, color: overdue ? t.danger : t.textFaint }}>· {overdue ? "Overdue" : fmtDate(task.due)}</span>}
        </div>
      </div>
      <Badge t={t} color={prColor}>{task.priority}</Badge>
      {onDelete && <IconBtn t={t} icon={Trash2} danger onClick={onDelete} />}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* PLANNER                                                              */
/* ------------------------------------------------------------------ */
function Planner({ t, state, actions, subTab, setSubTab }) {
  const tabs = [
    { id: "timetable", label: "Timetable", icon: Calendar },
    { id: "tasks", label: "Tasks", icon: ListChecks },
    { id: "assignments", label: "Assignments", icon: FileText },
    { id: "attendance", label: "Attendance", icon: PieChartIcon },
    { id: "gpa", label: "GPA", icon: GraduationCap },
    { id: "aiplan", label: "AI Plan", icon: Sparkles },
  ];
  return (
    <div style={{ padding: "18px 16px 100px" }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, color: t.text, fontWeight: 600, marginBottom: 14 }}>Planner</div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        {tabs.map((tb) => (
          <Pill key={tb.id} t={t} icon={tb.icon} active={subTab === tb.id} onClick={() => setSubTab(tb.id)}>{tb.label}</Pill>
        ))}
      </div>
      {subTab === "timetable" && <TimetableView t={t} state={state} actions={actions} />}
      {subTab === "tasks" && <TasksView t={t} state={state} actions={actions} />}
      {subTab === "assignments" && <AssignmentsView t={t} state={state} actions={actions} />}
      {subTab === "attendance" && <AttendanceView t={t} state={state} actions={actions} />}
      {subTab === "gpa" && <GpaView t={t} state={state} actions={actions} />}
      {subTab === "aiplan" && <AiPlanView t={t} state={state} actions={actions} />}
    </div>
  );
}

function TimetableView({ t, state, actions }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ subject: state.subjects[0]?.id || "", day: "Monday", start: "09:00", end: "10:00", room: "", teacher: "" });
  const byId = Object.fromEntries(state.subjects.map((s) => [s.id, s]));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button style={btnPrimary(t)} onClick={() => setAdding(true)}><Plus size={15} /> Add class</button>
      </div>
      {DAYS.map((day) => {
        const classes = state.timetable.filter((c) => c.day === day).sort((a, b) => a.start.localeCompare(b.start));
        if (classes.length === 0) return null;
        return (
          <div key={day} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.textFaint, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>{day}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {classes.map((c) => (
                <Card key={c.id} t={t} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 4, height: 36, borderRadius: 4, background: byId[c.subject]?.color || t.accent }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: t.text }}>{byId[c.subject]?.name}</div>
                    <div style={{ fontSize: 11.5, color: t.textMuted }}>{c.room} · {c.teacher}</div>
                  </div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12.5, color: t.text }}>{c.start}–{c.end}</div>
                  <IconBtn t={t} icon={Trash2} danger onClick={() => actions.removeClass(c.id)} />
                </Card>
              ))}
            </div>
          </div>
        );
      })}
      {state.timetable.length === 0 && <EmptyState t={t} icon={Calendar} title="No classes yet" subtitle="Add your weekly schedule to see it here." />}

      {adding && (
        <Modal t={t} title="Add a class" onClose={() => setAdding(false)}>
          <Field t={t} label="Subject">
            <select style={inputStyle(t)} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field t={t} label="Day">
            <select style={inputStyle(t)} value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Field t={t} label="Start"><input type="time" style={inputStyle(t)} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field></div>
            <div style={{ flex: 1 }}><Field t={t} label="End"><input type="time" style={inputStyle(t)} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field></div>
          </div>
          <Field t={t} label="Classroom"><input style={inputStyle(t)} value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Room 204" /></Field>
          <Field t={t} label="Teacher"><input style={inputStyle(t)} value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} placeholder="Dr. Ahmed" /></Field>
          <button style={{ ...btnPrimary(t), width: "100%", marginTop: 6 }} onClick={() => { actions.addClass(form); setAdding(false); }}>Add class</button>
        </Modal>
      )}
    </div>
  );
}

function TasksView({ t, state, actions }) {
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ title: "", subject: state.subjects[0]?.id || "", priority: "Medium", due: todayStr(), estMinutes: 30 });
  const byId = Object.fromEntries(state.subjects.map((s) => [s.id, s]));

  const filtered = state.tasks.filter((task) => filter === "all" ? true : filter === "done" ? task.done : !task.done);
  const sorted = [...filtered].sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "pending", "done"].map((f) => (
            <Pill key={f} t={t} active={filter === f} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</Pill>
          ))}
        </div>
        <button style={btnPrimary(t)} onClick={() => setAdding(true)}><Plus size={15} /></button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((task) => (
          <TaskRow key={task.id} t={t} task={task} subj={byId[task.subject]} onToggle={() => actions.toggleTask(task.id)} onDelete={() => actions.removeTask(task.id)} />
        ))}
        {sorted.length === 0 && <EmptyState t={t} icon={ListChecks} title="No tasks here" subtitle="Add a task to get started." />}
      </div>

      {adding && (
        <Modal t={t} title="New task" onClose={() => setAdding(false)}>
          <Field t={t} label="Title"><input style={inputStyle(t)} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Complete programming assignment" /></Field>
          <Field t={t} label="Subject">
            <select style={inputStyle(t)} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Field t={t} label="Priority">
                <select style={inputStyle(t)} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </Field>
            </div>
            <div style={{ flex: 1 }}><Field t={t} label="Due date"><input type="date" style={inputStyle(t)} value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></Field></div>
          </div>
          <Field t={t} label={`Estimated time — ${form.estMinutes}m`}>
            <input type="range" min={10} max={240} step={10} value={form.estMinutes} onChange={(e) => setForm({ ...form, estMinutes: +e.target.value })} style={{ width: "100%" }} />
          </Field>
          <button
            style={{ ...btnPrimary(t), width: "100%", marginTop: 6, opacity: form.title ? 1 : 0.5 }}
            disabled={!form.title}
            onClick={() => { actions.addTask(form); setAdding(false); setForm({ ...form, title: "" }); }}
          >Add task</button>
        </Modal>
      )}
    </div>
  );
}

function AssignmentsView({ t, state, actions }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", subject: state.subjects[0]?.id || "", description: "", due: todayStr(), priority: "Medium", estMinutes: 60, status: "Not Started" });
  const byId = Object.fromEntries(state.subjects.map((s) => [s.id, s]));
  const sorted = [...state.assignments].sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  const statusColor = { "Not Started": t.textFaint, "In Progress": t.warn, "Completed": t.success };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button style={btnPrimary(t)} onClick={() => setAdding(true)}><Plus size={15} /> Add assignment</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((a) => {
          const d = daysUntil(a.due);
          const overdue = d < 0 && a.status !== "Completed";
          return (
            <Card key={a.id} t={t} style={{ borderColor: overdue ? t.danger : t.border }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: t.text }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: byId[a.subject]?.color, fontWeight: 600, marginTop: 2 }}>{byId[a.subject]?.name}</div>
                  {a.description && <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 6, lineHeight: 1.5 }}>{a.description}</div>}
                </div>
                <IconBtn t={t} icon={Trash2} danger onClick={() => actions.removeAssignment(a.id)} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Badge t={t} color={a.priority === "High" ? t.danger : a.priority === "Medium" ? t.warn : t.success}>{a.priority}</Badge>
                  <span style={{ fontSize: 11.5, color: overdue ? t.danger : t.textFaint, fontWeight: overdue ? 700 : 400 }}>
                    {overdue ? `${Math.abs(d)}d overdue` : d === 0 ? "Due today" : `${d}d left`}
                  </span>
                </div>
                <select
                  value={a.status}
                  onChange={(e) => actions.updateAssignmentStatus(a.id, e.target.value)}
                  style={{ fontSize: 12, fontWeight: 600, padding: "5px 9px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgSoft, color: statusColor[a.status] }}
                >
                  <option>Not Started</option><option>In Progress</option><option>Completed</option>
                </select>
              </div>
            </Card>
          );
        })}
        {sorted.length === 0 && <EmptyState t={t} icon={FileText} title="No assignments" subtitle="Add one to track its deadline." />}
      </div>

      {adding && (
        <Modal t={t} title="New assignment" onClose={() => setAdding(false)}>
          <Field t={t} label="Title"><input style={inputStyle(t)} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Binary Trees Implementation" /></Field>
          <Field t={t} label="Subject">
            <select style={inputStyle(t)} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field t={t} label="Description"><textarea style={{ ...inputStyle(t), minHeight: 60 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Field t={t} label="Due date"><input type="date" style={inputStyle(t)} value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></Field></div>
            <div style={{ flex: 1 }}>
              <Field t={t} label="Priority">
                <select style={inputStyle(t)} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </Field>
            </div>
          </div>
          <button style={{ ...btnPrimary(t), width: "100%", marginTop: 6, opacity: form.title ? 1 : 0.5 }} disabled={!form.title}
            onClick={() => { actions.addAssignment(form); setAdding(false); setForm({ ...form, title: "", description: "" }); }}>Add assignment</button>
        </Modal>
      )}
    </div>
  );
}

function AttendanceView({ t, state, actions }) {
  const byId = Object.fromEntries(state.subjects.map((s) => [s.id, s]));
  return (
    <div>
      <Card t={t} style={{ marginBottom: 14 }}>
        <Field t={t} label={`Target attendance — ${state.attendanceTarget}%`}>
          <input type="range" min={50} max={100} value={state.attendanceTarget} onChange={(e) => actions.setAttendanceTarget(+e.target.value)} style={{ width: "100%" }} />
        </Field>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {state.subjects.map((s) => {
          const rec = state.attendance[s.id] || { total: 0, attended: 0 };
          const pct = rec.total ? Math.round((rec.attended / rec.total) * 100) : 100;
          const below = pct < state.attendanceTarget;
          // classes needed to hit target: (attended + x) / (total + x) >= target/100
          let neededMsg = "On track";
          if (below) {
            const target = state.attendanceTarget / 100;
            const x = Math.ceil((target * rec.total - rec.attended) / (1 - target));
            neededMsg = `Attend next ${x} in a row to reach ${state.attendanceTarget}%`;
          }
          return (
            <Card key={s.id} t={t}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: t.text }}>{s.name}</div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: below ? t.danger : t.success }}>{pct}%</div>
              </div>
              <ProgressBar t={t} value={pct} color={below ? t.danger : t.success} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
                <div style={{ fontSize: 11.5, color: t.textMuted }}>{rec.attended}/{rec.total} classes · {below ? neededMsg : "On track ✓"}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={btnGhost(t)} onClick={() => actions.markAttendance(s.id, false)}>Missed</button>
                  <button style={{ ...btnPrimary(t) }} onClick={() => actions.markAttendance(s.id, true)}>Attended</button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function GpaView({ t, state, actions }) {
  const [courses, setCourses] = useState([{ id: uid(), name: "", credits: 3, grade: "A" }]);
  const gradePoints = { "A": 4.0, "A-": 3.67, "B+": 3.33, "B": 3.0, "B-": 2.67, "C+": 2.33, "C": 2.0, "C-": 1.67, "D": 1.0, "F": 0 };

  const addRow = () => setCourses((c) => [...c, { id: uid(), name: "", credits: 3, grade: "A" }]);
  const updateRow = (id, patch) => setCourses((c) => c.map((r) => r.id === id ? { ...r, ...patch } : r));
  const removeRow = (id) => setCourses((c) => c.filter((r) => r.id !== id));

  const totalCredits = courses.reduce((a, c) => a + (Number(c.credits) || 0), 0);
  const totalPoints = courses.reduce((a, c) => a + (Number(c.credits) || 0) * (gradePoints[c.grade] || 0), 0);
  const semesterGpa = totalCredits ? (totalPoints / totalCredits).toFixed(2) : "0.00";

  const allSemGpas = state.gpaSemesters.map((s) => s.gpa);
  const cgpa = allSemGpas.length ? (allSemGpas.reduce((a, b) => a + b, 0) / allSemGpas.length).toFixed(2) : "0.00";

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <Card t={t} style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>CUMULATIVE CGPA</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 26, fontWeight: 700, color: t.accent }}>{cgpa}</div>
        </Card>
        <Card t={t} style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>THIS SEMESTER</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 26, fontWeight: 700, color: t.text }}>{semesterGpa}</div>
        </Card>
      </div>

      <SectionHeader t={t} title="Calculate semester GPA" />
      <Card t={t} style={{ marginBottom: 14 }}>
        {courses.map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
            <input placeholder="Subject" value={c.name} onChange={(e) => updateRow(c.id, { name: e.target.value })} style={{ ...inputStyle(t), flex: 2 }} />
            <input type="number" min={1} max={6} value={c.credits} onChange={(e) => updateRow(c.id, { credits: e.target.value })} style={{ ...inputStyle(t), width: 56, flex: "none" }} />
            <select value={c.grade} onChange={(e) => updateRow(c.id, { grade: e.target.value })} style={{ ...inputStyle(t), width: 72, flex: "none" }}>
              {Object.keys(gradePoints).map((g) => <option key={g}>{g}</option>)}
            </select>
            <IconBtn t={t} icon={X} danger onClick={() => removeRow(c.id)} />
          </div>
        ))}
        <button style={{ ...btnGhost(t), width: "100%", marginTop: 4 }} onClick={addRow}><Plus size={14} style={{ marginRight: 4 }} />Add course</button>
        <button
          style={{ ...btnPrimary(t), width: "100%", marginTop: 10 }}
          onClick={() => actions.saveSemesterGpa(parseFloat(semesterGpa))}
        >Save this semester ({semesterGpa})</button>
      </Card>

      <SectionHeader t={t} title="Past semesters" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {state.gpaSemesters.map((s) => (
          <Card key={s.id} t={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 600, color: t.text, fontSize: 13.5 }}>{s.name}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", color: t.accent, fontWeight: 700 }}>{s.gpa.toFixed(2)}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AiPlanView({ t, state, actions }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const subjectsList = state.subjects.map((s) => s.name).join(", ");
      const upcoming = state.assignments.filter((a) => a.status !== "Completed")
        .map((a) => `${a.title} (${state.subjects.find(s => s.id === a.subject)?.name}, due ${a.due})`).join("; ") || "none";
      const prompt = `Create a realistic weekly study plan for a university student.
Subjects: ${subjectsList}.
Upcoming assignments/deadlines: ${upcoming}.
Preferred daily study hours: ${state.profile.studyHours || 3}.
Academic goal: ${state.profile.goal || "stay consistent and do well this semester"}.
Return ONLY JSON in this exact shape, with realistic session times, 15-minute breaks between long sessions, and no overloading (max ${state.profile.studyHours || 3} study hours per day):
{"days":[{"day":"Monday","sessions":[{"time":"9:00 AM","subject":"Data Structures","type":"study","durationMinutes":60}]}]}
Include all 7 days, some may have zero sessions (rest days). "type" is one of "study","break","assignment","revision".`;
      const plan = await askClaude(prompt, { json: true });
      actions.setAiPlan(plan);
    } catch (e) {
      setError("Couldn't generate the plan right now. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card t={t} style={{ marginBottom: 14, background: `linear-gradient(135deg, ${t.surfaceAlt}, ${t.surface})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Sparkles size={18} color={t.accent} />
          <div style={{ fontWeight: 700, color: t.text, fontSize: 14.5 }}>AI Study Planner</div>
        </div>
        <p style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.6, margin: "0 0 12px" }}>
          Generates a realistic weekly schedule from your subjects, deadlines, and available hours. AI-generated — review before relying on it.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...btnPrimary(t), flex: 1 }} onClick={generate} disabled={loading}>
            {loading ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />} {state.aiStudyPlan ? "Regenerate plan" : "Generate my AI study plan"}
          </button>
        </div>
        {error && <div style={{ color: t.danger, fontSize: 12, marginTop: 8 }}>{error}</div>}
      </Card>

      {state.aiStudyPlan && state.aiStudyPlan.days && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {state.aiStudyPlan.days.map((d, i) => (
            <div key={i}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.textFaint, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>{d.day}</div>
              {(!d.sessions || d.sessions.length === 0) ? (
                <Card t={t}><div style={{ fontSize: 12.5, color: t.textMuted }}>Rest day 🌙</div></Card>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {d.sessions.map((s, j) => (
                    <Card key={j} t={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: t.accent, width: 74 }}>{s.time}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{s.subject}</div>
                          <div style={{ fontSize: 11, color: t.textFaint }}>{s.durationMinutes}m · {s.type}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI TAB                                                               */
/* ------------------------------------------------------------------ */
function AiTab({ t, state, actions }) {
  const [subTab, setSubTab] = useState("chat");
  return (
    <div style={{ padding: "18px 16px 100px" }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, color: t.text, fontWeight: 600, marginBottom: 14 }}>AI Assistant</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Pill t={t} icon={MessageSquare} active={subTab === "chat"} onClick={() => setSubTab("chat")}>Chat</Pill>
        <Pill t={t} icon={FileText} active={subTab === "notes"} onClick={() => setSubTab("notes")}>Notes</Pill>
        <Pill t={t} icon={Brain} active={subTab === "quiz"} onClick={() => setSubTab("quiz")}>Quiz</Pill>
      </div>
      {subTab === "chat" && <ChatView t={t} state={state} actions={actions} />}
      {subTab === "notes" && <NotesView t={t} state={state} />}
      {subTab === "quiz" && <QuizView t={t} state={state} actions={actions} />}
    </div>
  );
}

function ChatView({ t, state, actions }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [state.chatMessages, loading]);

  const quickActions = [
    { label: "📚 Explain This Topic", prompt: "Explain the concept of: " },
    { label: "📝 Summarize Notes", prompt: "Summarize these notes: " },
    { label: "🧠 Generate Quiz", prompt: "Generate 5 quiz questions about: " },
    { label: "📅 Plan My Week", prompt: "Help me plan my study week for: " },
    { label: "🎯 Help Me Study", prompt: "Give me a study strategy for: " },
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
    } catch (e) {
      actions.addChatMessage({ role: "assistant", content: "Sorry, I couldn't reach the AI service just now — please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
        {quickActions.map((qa) => (
          <button key={qa.label} onClick={() => setInput(qa.prompt)} style={{
            flexShrink: 0, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 999,
            border: `1px solid ${t.border}`, background: t.surface, color: t.textMuted, cursor: "pointer", fontFamily: "Inter, sans-serif",
          }}>{qa.label}</button>
        ))}
      </div>

      <div style={{ minHeight: 260, display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {state.chatMessages.length === 0 && (
          <EmptyState t={t} icon={Bot} title="Ask me anything academic" subtitle="Concepts, plans, quizzes, summaries — I'm here to help." />
        )}
        {state.chatMessages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "82%", padding: "10px 13px", borderRadius: 14,
              borderBottomRightRadius: m.role === "user" ? 4 : 14,
              borderBottomLeftRadius: m.role === "user" ? 14 : 4,
              background: m.role === "user" ? t.accent : t.surface,
              color: m.role === "user" ? "#1A1200" : t.text,
              border: m.role === "user" ? "none" : `1px solid ${t.border}`,
              fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ color: t.textMuted, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}><Loader2 size={13} className="spin" /> Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, position: "sticky", bottom: 0 }}>
        <input
          style={{ ...inputStyle(t), flex: 1 }}
          placeholder="Ask about a topic, assignment, or plan…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
        />
        <button style={{ ...btnPrimary(t), padding: 12 }} onClick={() => send(input)} disabled={loading}><Send size={16} /></button>
      </div>
    </div>
  );
}

function NotesView({ t, state }) {
  const [notes, setNotes] = useState("");
  const [subject, setSubject] = useState(state.subjects[0]?.id || "");
  const [mode, setMode] = useState("summarize");
  const [lang, setLang] = useState("English");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const modes = [
    { id: "summarize", label: "Summarize" },
    { id: "explain", label: "Explain Simply" },
    { id: "keypoints", label: "Key Points" },
    { id: "flashcards", label: "Flashcards" },
  ];

  const run = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    setResult("");
    try {
      let prompt;
      if (mode === "summarize") prompt = `Summarize the following student notes concisely, in ${lang}:\n\n${notes}`;
      else if (mode === "explain") prompt = `Explain the following student notes in very simple terms, as if to a beginner, in ${lang}:\n\n${notes}`;
      else if (mode === "keypoints") prompt = `Extract the key points as a short bulleted list, in ${lang}, from these notes:\n\n${notes}`;
      else prompt = `Turn the following notes into 6 flashcards. Return ONLY JSON: {"cards":[{"front":"...","back":"..."}]} in ${lang}.\n\n${notes}`;

      if (mode === "flashcards") {
        const data = await askClaude(prompt, { json: true });
        setResult(data);
      } else {
        const text = await askClaude(prompt);
        setResult(text);
      }
    } catch (e) {
      setResult("Couldn't process that right now — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Field t={t} label="Subject">
        <select style={inputStyle(t)} value={subject} onChange={(e) => setSubject(e.target.value)}>
          {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field t={t} label="Paste or write your notes">
        <textarea style={{ ...inputStyle(t), minHeight: 130, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste lecture notes or type here…" />
      </Field>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {modes.map((m) => <Pill key={m.id} t={t} active={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</Pill>)}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <select style={{ ...inputStyle(t), flex: 1 }} value={lang} onChange={(e) => setLang(e.target.value)}>
          <option>English</option><option>Urdu</option><option>Roman Urdu</option>
        </select>
        <button style={btnPrimary(t)} onClick={run} disabled={loading || !notes.trim()}>
          {loading ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />} Run
        </button>
      </div>

      {result && mode !== "flashcards" && (
        <Card t={t}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Sparkles size={13} color={t.accent} /><span style={{ fontSize: 11, color: t.textFaint, fontWeight: 700 }}>AI-GENERATED — VERIFY AGAINST YOUR COURSE MATERIAL</span>
          </div>
          <div style={{ fontSize: 13.5, color: t.text, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{result}</div>
        </Card>
      )}
      {result && mode === "flashcards" && result.cards && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {result.cards.map((c, i) => <Flashcard key={i} t={t} card={c} />)}
        </div>
      )}
    </div>
  );
}

function Flashcard({ t, card }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <Card t={t} onClick={() => setFlipped((f) => !f)} style={{ cursor: "pointer", minHeight: 70, display: "flex", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 10, color: t.textFaint, fontWeight: 700, marginBottom: 4 }}>{flipped ? "ANSWER" : "QUESTION"} · tap to flip</div>
        <div style={{ fontSize: 13.5, color: t.text, lineHeight: 1.5 }}>{flipped ? card.back : card.front}</div>
      </div>
    </Card>
  );
}

function QuizView({ t, state, actions }) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setQuiz(null); setSubmitted(false); setAnswers({});
    try {
      const prompt = `Create a ${difficulty} difficulty quiz of 5 questions (mix of multiple-choice and true/false) on: ${topic}.
Return ONLY JSON: {"questions":[{"id":"q1","type":"mcq","question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]}. For true/false use type "tf" and options ["True","False"].`;
      const data = await askClaude(prompt, { json: true });
      setQuiz(data);
    } catch (e) {
      setQuiz(null);
    } finally {
      setLoading(false);
    }
  };

  const submit = () => {
    setSubmitted(true);
    const correct = quiz.questions.filter((q) => answers[q.id] === q.correctIndex).length;
    actions.recordQuiz({ topic, difficulty, score: correct, total: quiz.questions.length, date: todayStr() });
  };

  const score = quiz ? quiz.questions.filter((q) => answers[q.id] === q.correctIndex).length : 0;

  return (
    <div>
      {!quiz && (
        <Card t={t} style={{ marginBottom: 14 }}>
          <Field t={t} label="Topic or paste study material">
            <textarea style={{ ...inputStyle(t), minHeight: 80 }} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Binary search trees, or paste notes" />
          </Field>
          <Field t={t} label="Difficulty">
            <div style={{ display: "flex", gap: 6 }}>
              {["Easy", "Medium", "Hard"].map((d) => <Pill key={d} t={t} active={difficulty === d} onClick={() => setDifficulty(d)}>{d}</Pill>)}
            </div>
          </Field>
          <button style={{ ...btnPrimary(t), width: "100%" }} onClick={generate} disabled={loading || !topic.trim()}>
            {loading ? <Loader2 size={15} className="spin" /> : <Brain size={15} />} Generate quiz
          </button>
        </Card>
      )}

      {quiz && !submitted && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {quiz.questions.map((q, i) => (
            <Card key={q.id}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text, marginBottom: 10 }}>{i + 1}. {q.question}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {q.options.map((opt, oi) => (
                  <button key={oi} onClick={() => setAnswers({ ...answers, [q.id]: oi })} style={{
                    textAlign: "left", padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13,
                    border: `1.5px solid ${answers[q.id] === oi ? t.accent : t.border}`,
                    background: answers[q.id] === oi ? `${t.accent}18` : "transparent", color: t.text, fontFamily: "Inter, sans-serif",
                  }}>{opt}</button>
                ))}
              </div>
            </Card>
          ))}
          <button style={{ ...btnPrimary(t), width: "100%" }} disabled={Object.keys(answers).length < quiz.questions.length} onClick={submit}>Submit quiz</button>
        </div>
      )}

      {quiz && submitted && (
        <div>
          <Card t={t} style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: t.textMuted, fontWeight: 600 }}>YOUR SCORE</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 30, color: t.accent, fontWeight: 700 }}>{score}/{quiz.questions.length} 🎉</div>
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {quiz.questions.map((q, i) => {
              const correct = answers[q.id] === q.correctIndex;
              return (
                <Card key={q.id} t={t} style={{ borderColor: correct ? t.success : t.danger }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 6 }}>{i + 1}. {q.question}</div>
                  <div style={{ fontSize: 12.5, color: correct ? t.success : t.danger, marginBottom: 4 }}>
                    {correct ? "Correct" : `Correct answer: ${q.options[q.correctIndex]}`}
                  </div>
                  <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>{q.explanation}</div>
                </Card>
              );
            })}
          </div>
          <button style={{ ...btnGhost(t), width: "100%", marginTop: 12 }} onClick={() => { setQuiz(null); setTopic(""); }}>New quiz</button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PROGRESS                                                             */
/* ------------------------------------------------------------------ */
function Progress({ t, state }) {
  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const minutes = state.studySessions.filter((s) => s.date === key).reduce((a, b) => a + b.minutes, 0);
    return { day: d.toLocaleDateString(undefined, { weekday: "short" }), minutes };
  });

  const totalTasks = state.tasks.length;
  const doneTasks = state.tasks.filter((x) => x.done).length;
  const doneAssignments = state.assignments.filter((a) => a.status === "Completed").length;

  const pieData = [
    { name: "Completed", value: doneTasks, color: t.success },
    { name: "Pending", value: Math.max(totalTasks - doneTasks, 0), color: t.border },
  ];

  const bestDay = last7.reduce((best, cur) => (cur.minutes > (best?.minutes || 0) ? cur : best), null);
  const avgQuiz = state.quizHistory.length ? Math.round(state.quizHistory.reduce((a, q) => a + (q.score / q.total) * 100, 0) / state.quizHistory.length) : null;

  const achievementDefs = [
    { id: "first_task", icon: "✅", label: "First Task Completed", earned: doneTasks >= 1 },
    { id: "streak7", icon: "🔥", label: "7-Day Streak", earned: (state.streak || 0) >= 7 },
    { id: "study10", icon: "📚", label: "10 Hours Studied", earned: state.studySessions.reduce((a, b) => a + b.minutes, 0) >= 600 },
    { id: "quizmaster", icon: "🧠", label: "Quiz Master", earned: state.quizHistory.length >= 3 },
  ];

  return (
    <div style={{ padding: "18px 16px 100px" }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, color: t.text, fontWeight: 600, marginBottom: 16 }}>Progress</div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <Card t={t} style={{ flex: 1, textAlign: "center" }}>
          <Flame size={18} color={t.accent} style={{ marginBottom: 4 }} />
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 700, color: t.text }}>{state.streak || 0}</div>
          <div style={{ fontSize: 10.5, color: t.textMuted }}>DAY STREAK</div>
        </Card>
        <Card t={t} style={{ flex: 1, textAlign: "center" }}>
          <Trophy size={18} color={t.accent} style={{ marginBottom: 4 }} />
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 700, color: t.text }}>{state.xp}</div>
          <div style={{ fontSize: 10.5, color: t.textMuted }}>XP POINTS</div>
        </Card>
        <Card t={t} style={{ flex: 1, textAlign: "center" }}>
          <Target size={18} color={t.accent} style={{ marginBottom: 4 }} />
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 700, color: t.text }}>{doneAssignments}</div>
          <div style={{ fontSize: 10.5, color: t.textMuted }}>SUBMITTED</div>
        </Card>
      </div>

      <SectionHeader t={t} title="Study time (last 7 days)" />
      <Card t={t} style={{ marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={last7}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
            <XAxis dataKey="day" stroke={t.textFaint} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke={t.textFaint} fontSize={11} tickLine={false} axisLine={false} width={28} />
            <Tooltip contentStyle={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: t.text }} />
            <Bar dataKey="minutes" fill={t.accent} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <SectionHeader t={t} title="Task completion" />
      <Card t={t} style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <ResponsiveContainer width={100} height={100}>
          <PieChart>
            <Pie data={pieData} dataKey="value" innerRadius={30} outerRadius={45} paddingAngle={2}>
              {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.text, fontFamily: "JetBrains Mono, monospace" }}>{doneTasks}/{totalTasks}</div>
          <div style={{ fontSize: 12, color: t.textMuted }}>tasks completed overall</div>
        </div>
      </Card>

      <SectionHeader t={t} title="Weekly insights" />
      <Card t={t} style={{ marginBottom: 16 }}>
        <ul style={{ margin: 0, paddingLeft: 18, color: t.text, fontSize: 13, lineHeight: 1.9 }}>
          {bestDay && bestDay.minutes > 0 && <li>Your most productive day was <b>{bestDay.day}</b>.</li>}
          {avgQuiz !== null && <li>Average quiz score is <b>{avgQuiz}%</b> across {state.quizHistory.length} quiz{state.quizHistory.length > 1 ? "zes" : ""}.</li>}
          {totalTasks > 0 && <li><b>{Math.round((doneTasks / totalTasks) * 100)}%</b> of tasks completed so far.</li>}
          {!bestDay?.minutes && avgQuiz === null && totalTasks === 0 && <li>Log some study sessions and tasks to see personalized insights here.</li>}
        </ul>
      </Card>

      <SectionHeader t={t} title="Achievements" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {achievementDefs.map((a) => (
          <Card key={a.id} t={t} style={{ textAlign: "center", opacity: a.earned ? 1 : 0.4 }}>
            <div style={{ fontSize: 26, marginBottom: 4 }}>{a.icon}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: t.text }}>{a.label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PROFILE                                                              */
/* ------------------------------------------------------------------ */
function Profile({ t, state, actions, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(state.profile);

  return (
    <div style={{ padding: "18px 16px 100px" }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, color: t.text, fontWeight: 600, marginBottom: 16 }}>Profile</div>

      <Card t={t} style={{ marginBottom: 16, textAlign: "center" }}>
        <div style={{
          width: 68, height: 68, borderRadius: "50%", margin: "0 auto 10px", display: "flex", alignItems: "center",
          justifyContent: "center", background: `radial-gradient(circle at 30% 20%, ${t.accentSoft}, ${t.accent})`, fontFamily: "Fraunces, serif",
          fontSize: 26, fontWeight: 700, color: "#1A1200",
        }}>{(state.profile.name || "U")[0].toUpperCase()}</div>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: t.text }}>{state.profile.name || "Add your name"}</div>
        <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 2 }}>{state.profile.program} {state.profile.semester && `· ${state.profile.semester}`}</div>
        <div style={{ fontSize: 12, color: t.textFaint, marginTop: 2 }}>{state.profile.university}</div>
        {state.profile.goal && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: t.bgSoft, fontSize: 12, color: t.textMuted, textAlign: "left" }}>
            🎯 {state.profile.goal}
          </div>
        )}
        <button style={{ ...btnGhost(t), width: "100%", marginTop: 12 }} onClick={() => setEditing(true)}>Edit profile</button>
      </Card>

      <SectionHeader t={t} title="Settings" />
      <Card t={t} style={{ marginBottom: 10 }}>
        <SettingRow t={t} icon={state.theme === "dark" ? Moon : Sun} label="Appearance">
          <div style={{ display: "flex", gap: 6 }}>
            <Pill t={t} active={state.theme === "dark"} onClick={() => actions.setTheme("dark")}>Dark</Pill>
            <Pill t={t} active={state.theme === "light"} onClick={() => actions.setTheme("light")}>Light</Pill>
          </div>
        </SettingRow>
      </Card>
      <Card t={t} style={{ marginBottom: 10 }}>
        <SettingRow t={t} icon={GraduationCap} label="Language">
          <select style={{ ...inputStyle(t), width: 140 }} value={state.profile.language} onChange={(e) => actions.updateProfile({ language: e.target.value })}>
            <option>English</option><option>Urdu</option><option>Roman Urdu</option>
          </select>
        </SettingRow>
      </Card>
      <Card t={t} style={{ marginBottom: 16 }}>
        {[
          ["classes", "Class reminders"], ["deadlines", "Assignment deadlines"],
          ["exams", "Exam reminders"], ["studySessions", "Planned study sessions"],
        ].map(([key, label], i, arr) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : "none" }}>
            <span style={{ fontSize: 13, color: t.text }}>{label}</span>
            <Toggle t={t} on={state.notifPrefs[key]} onClick={() => actions.toggleNotif(key)} />
          </div>
        ))}
      </Card>

      <button style={{ ...btnGhost(t), width: "100%", color: t.danger, borderColor: t.danger }} onClick={onLogout}>Log out</button>

      {editing && (
        <Modal t={t} title="Edit profile" onClose={() => setEditing(false)}>
          <Field t={t} label="Full name"><input style={inputStyle(t)} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field t={t} label="University"><input style={inputStyle(t)} value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} /></Field>
          <Field t={t} label="Program"><input style={inputStyle(t)} value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} /></Field>
          <Field t={t} label="Semester"><input style={inputStyle(t)} value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} /></Field>
          <Field t={t} label="Goal"><textarea style={{ ...inputStyle(t), minHeight: 70 }} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></Field>
          <button style={{ ...btnPrimary(t), width: "100%" }} onClick={() => { actions.updateProfile(form); setEditing(false); }}>Save changes</button>
        </Modal>
      )}
    </div>
  );
}

function SettingRow({ t, icon: Icon, label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={16} color={t.textMuted} />
        <span style={{ fontSize: 13.5, color: t.text, fontWeight: 500 }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function Toggle({ t, on, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 40, height: 23, borderRadius: 999, border: "none", cursor: "pointer",
      background: on ? t.accent : t.border, position: "relative", flexShrink: 0,
    }}>
      <div style={{
        width: 17, height: 17, borderRadius: "50%", background: "#fff", position: "absolute", top: 3,
        left: on ? 20 : 3, transition: "left .15s ease",
      }} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* FOCUS MODE                                                          */
/* ------------------------------------------------------------------ */
function FocusMode({ t, state, actions, onClose }) {
  const [subject, setSubject] = useState(state.subjects[0]?.id || "");
  const [taskId, setTaskId] = useState("");
  const [minutes, setMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [running, setRunning] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (!onBreak) {
              actions.logStudySession(subject, minutes);
              setOnBreak(true);
              return breakMinutes * 60;
            } else {
              setOnBreak(false);
              setRunning(false);
              return minutes * 60;
            }
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, onBreak, minutes, breakMinutes, subject]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const total = (onBreak ? breakMinutes : minutes) * 60;
  const pct = total ? ((total - secondsLeft) / total) * 100 : 0;
  const R = 90;
  const circumference = 2 * Math.PI * R;

  return (
    <div style={{ position: "absolute", inset: 0, background: t.bg, zIndex: 55, display: "flex", flexDirection: "column", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, color: t.text }}>{onBreak ? "Break" : "Focus session"}</div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textMuted }}><X size={22} /></button>
      </div>

      {!running && (
        <div style={{ marginBottom: 20 }}>
          <Field t={t} label="Subject">
            <select style={inputStyle(t)} value={subject} onChange={(e) => setSubject(e.target.value)}>
              {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field t={t} label="Task (optional)">
            <select style={inputStyle(t)} value={taskId} onChange={(e) => setTaskId(e.target.value)}>
              <option value="">—</option>
              {state.tasks.filter((x) => !x.done).map((tk) => <option key={tk.id} value={tk.id}>{tk.title}</option>)}
            </select>
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Field t={t} label={`Focus — ${minutes}m`}>
                <input type="range" min={10} max={60} step={5} value={minutes} onChange={(e) => { setMinutes(+e.target.value); setSecondsLeft(+e.target.value * 60); }} style={{ width: "100%" }} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field t={t} label={`Break — ${breakMinutes}m`}>
                <input type="range" min={5} max={20} step={5} value={breakMinutes} onChange={(e) => setBreakMinutes(+e.target.value)} style={{ width: "100%" }} />
              </Field>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <svg width={220} height={220} viewBox="0 0 220 220">
          <circle cx={110} cy={110} r={R} fill="none" stroke={t.border} strokeWidth={12} />
          <circle
            cx={110} cy={110} r={R} fill="none" stroke={onBreak ? t.accent2 : t.accent} strokeWidth={12}
            strokeDasharray={circumference} strokeDashoffset={circumference - (pct / 100) * circumference}
            strokeLinecap="round" transform="rotate(-90 110 110)" style={{ transition: "stroke-dashoffset 1s linear" }}
          />
          <text x="110" y="105" textAnchor="middle" fontSize="38" fontFamily="JetBrains Mono, monospace" fontWeight="700" fill={t.text}>{mm}:{ss}</text>
          <text x="110" y="130" textAnchor="middle" fontSize="12" fontFamily="Inter, sans-serif" fill={t.textMuted}>{onBreak ? "break time" : (state.subjects.find(s => s.id === subject)?.name || "focus")}</text>
        </svg>

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button
            style={{ ...btnPrimary(t), padding: "13px 26px" }}
            onClick={() => setRunning((r) => !r)}
          >{running ? <Pause size={17} /> : <Play size={17} />} {running ? "Pause" : "Start"}</button>
          <button style={{ ...btnGhost(t), padding: "13px 20px" }} onClick={() => { setRunning(false); setOnBreak(false); setSecondsLeft(minutes * 60); }}>
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MAIN APP                                                             */
/* ------------------------------------------------------------------ */
export default function App() {
  const [state, setState] = useState(seedState());
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("home");
  const [plannerSubTab, setPlannerSubTab] = useState("timetable");
  const [showFocus, setShowFocus] = useState(false);

  // Load persisted state
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage?.get?.("unimate-state");
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setState((s) => ({ ...s, ...parsed }));
        }
      } catch (e) { /* no saved state yet */ }
      setLoaded(true);
    })();
  }, []);

  // Persist state (debounced-ish, on change)
  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => {
      window.storage?.set?.("unimate-state", JSON.stringify(state)).catch(() => {});
    }, 400);
    return () => clearTimeout(id);
  }, [state, loaded]);

  const t = themes[state.theme] || themes.dark;

  const go = (tabId, sub) => {
    setTab(tabId);
    if (tabId === "planner" && sub) setPlannerSubTab(sub);
    if (tabId === "focus") setShowFocus(true);
  };

  const markActivity = (s) => {
    const today = todayStr();
    if (s.activityDates.includes(today)) return s;
    const dates = [...s.activityDates, today].sort();
    // compute streak
    let streak = 0;
    let cursor = new Date(today + "T00:00:00");
    const set = new Set(dates);
    while (set.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { ...s, activityDates: dates, streak };
  };

  const actions = {
    updateProfile: (patch) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
    setTheme: (theme) => setState((s) => ({ ...s, theme })),
    toggleNotif: (key) => setState((s) => ({ ...s, notifPrefs: { ...s.notifPrefs, [key]: !s.notifPrefs[key] } })),

    addClass: (c) => setState((s) => ({ ...s, timetable: [...s.timetable, { ...c, id: uid() }] })),
    removeClass: (id) => setState((s) => ({ ...s, timetable: s.timetable.filter((c) => c.id !== id) })),

    addTask: (form) => setState((s) => ({ ...s, tasks: [...s.tasks, { ...form, id: uid(), done: false }] })),
    removeTask: (id) => setState((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== id) })),
    toggleTask: (id) => setState((s) => {
      const tasks = s.tasks.map((x) => x.id === id ? { ...x, done: !x.done } : x);
      const becameDone = tasks.find((x) => x.id === id)?.done;
      let next = { ...s, tasks, xp: s.xp + (becameDone ? 10 : -10) };
      if (becameDone) next = markActivity(next);
      return next;
    }),

    addAssignment: (form) => setState((s) => ({ ...s, assignments: [...s.assignments, { ...form, id: uid() }] })),
    removeAssignment: (id) => setState((s) => ({ ...s, assignments: s.assignments.filter((a) => a.id !== id) })),
    updateAssignmentStatus: (id, status) => setState((s) => {
      const assignments = s.assignments.map((a) => a.id === id ? { ...a, status } : a);
      let next = { ...s, assignments, xp: status === "Completed" ? s.xp + 25 : s.xp };
      if (status === "Completed") next = markActivity(next);
      return next;
    }),

    markAttendance: (subjectId, attended) => setState((s) => {
      const rec = s.attendance[subjectId] || { total: 0, attended: 0 };
      return { ...s, attendance: { ...s.attendance, [subjectId]: { total: rec.total + 1, attended: rec.attended + (attended ? 1 : 0) } } };
    }),
    setAttendanceTarget: (v) => setState((s) => ({ ...s, attendanceTarget: v })),

    saveSemesterGpa: (gpa) => setState((s) => ({ ...s, gpaSemesters: [...s.gpaSemesters, { id: uid(), name: `Semester ${s.gpaSemesters.length + 1}`, gpa }] })),

    setAiPlan: (plan) => setState((s) => ({ ...s, aiStudyPlan: plan })),

    addChatMessage: (msg) => setState((s) => ({ ...s, chatMessages: [...s.chatMessages, msg] })),

    recordQuiz: (result) => setState((s) => {
      let next = { ...s, quizHistory: [...s.quizHistory, result], xp: s.xp + result.score * 5 };
      next = markActivity(next);
      return next;
    }),

    logStudySession: (subjectId, mins) => setState((s) => {
      let next = {
        ...s,
        studySessions: [...s.studySessions, { id: uid(), subject: subjectId, minutes: mins, date: todayStr() }],
        xp: s.xp + Math.round(mins / 2),
      };
      next = markActivity(next);
      return next;
    }),
  };

  const completeOnboarding = (form) => {
    setState((s) => ({ ...s, onboarded: true, profile: { ...s.profile, ...form } }));
  };

  const logout = () => {
    setState(seedState());
    setTab("home");
  };

  if (!loaded) {
    return (
      <div style={{ height: 640, background: themes.dark.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={26} color={themes.dark.accent} className="spin" />
      </div>
    );
  }

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "planner", label: "Planner", icon: Calendar },
    { id: "ai", label: "AI", icon: Bot },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div style={{
      maxWidth: 420, margin: "0 auto", height: 720, position: "relative", overflow: "hidden",
      background: t.bg, fontFamily: "Inter, sans-serif", borderRadius: 28, border: `1px solid ${t.border}`,
      boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    }}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        select, input, textarea, button { font-family: 'Inter', sans-serif; }
        input[type=range] { accent-color: ${t.accent}; }
      `}</style>

      <div style={{ height: "100%", overflowY: "auto" }}>
        {tab === "home" && <Home t={t} state={state} actions={actions} go={go} />}
        {tab === "planner" && <Planner t={t} state={state} actions={actions} subTab={plannerSubTab} setSubTab={setPlannerSubTab} />}
        {tab === "ai" && <AiTab t={t} state={state} actions={actions} />}
        {tab === "progress" && <Progress t={t} state={state} />}
        {tab === "profile" && <Profile t={t} state={state} actions={actions} onLogout={logout} />}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, display: "flex",
        background: t.surface, borderTop: `1px solid ${t.border}`, padding: "10px 6px 14px",
      }}>
        {navItems.map((n) => {
          const active = tab === n.id;
          return (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              flex: 1, background: "transparent", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 4,
            }}>
              <n.icon size={20} color={active ? t.accent : t.textFaint} strokeWidth={active ? 2.4 : 2} />
              <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500, color: active ? t.accent : t.textFaint }}>{n.label}</span>
            </button>
          );
        })}
      </div>

      {!state.onboarded && <Onboarding t={t} onComplete={completeOnboarding} />}
      {showFocus && <FocusMode t={t} state={state} actions={actions} onClose={() => setShowFocus(false)} />}
    </div>
  );
}
