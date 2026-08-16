import React, { useMemo, useState } from "react";
import { NavLink, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import {
  Activity, AlertTriangle, BarChart3, BookOpen, CalendarCheck, ClipboardList,
  GraduationCap, LayoutDashboard, LogOut, Menu, Search, Settings, Sparkles,
  UserRound, Users, X, Bell, ChevronRight, CheckCircle2
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";

const demo = {
  student: {
    name: "Dharani Priya", id: "STU-2026-014", department: "CSE (AI & ML)",
    attendance: 82, average: 76, risk: "Medium",
    courses: [
      { name: "Artificial Intelligence", code: "CS601", teacher: "Dr. Priya", attendance: 88, mark: 82 },
      { name: "Machine Learning", code: "CS602", teacher: "Mr. Arun", attendance: 79, mark: 74 },
      { name: "Computer Networks", code: "CS603", teacher: "Dr. Karthik", attendance: 75, mark: 68 },
      { name: "Database Systems", code: "CS604", teacher: "Ms. Meena", attendance: 86, mark: 80 }
    ],
    assignments: [
      { title: "ML Classification Report", course: "Machine Learning", due: "20 Aug 2026", status: "Pending", mark: "-" },
      { title: "Network Protocol Analysis", course: "Computer Networks", due: "23 Aug 2026", status: "Submitted", mark: "82" },
      { title: "SQL Optimization", course: "Database Systems", due: "28 Aug 2026", status: "Evaluated", mark: "76" }
    ],
    results: [
      { subject: "Artificial Intelligence", exam: "Internal 1", mark: 82, grade: "A" },
      { subject: "Machine Learning", exam: "Internal 1", mark: 74, grade: "B+" },
      { subject: "Computer Networks", exam: "Internal 1", mark: 68, grade: "B" },
      { subject: "Database Systems", exam: "Internal 1", mark: 80, grade: "A" }
    ]
  },
  teacher: {
    name: "Dr. Priya Kumar", id: "TCH-018", courses: 4, students: 128,
    pending: 17, average: 74
  },
  admin: { students: 842, teachers: 48, courses: 32, classes: 26, atRisk: 67 }
};

const performance = [
  { subject: "AI", score: 82 }, { subject: "ML", score: 74 },
  { subject: "Networks", score: 68 }, { subject: "DBMS", score: 80 }
];
const trend = [
  { month: "Mar", score: 64 }, { month: "Apr", score: 68 },
  { month: "May", score: 70 }, { month: "Jun", score: 73 },
  { month: "Jul", score: 76 }, { month: "Aug", score: 78 }
];
const riskData = [{ name: "Low", value: 62 }, { name: "Medium", value: 27 }, { name: "High", value: 11 }];

function Layout({ role, children, onLogout }) {
  const [open, setOpen] = useState(false);
  const nav = useMemo(() => {
    if (role === "student") return [
      ["/student/dashboard", "Dashboard", LayoutDashboard],
      ["/student/courses", "Courses", BookOpen],
      ["/student/attendance", "Attendance", CalendarCheck],
      ["/student/assignments", "Assignments", ClipboardList],
      ["/student/results", "Results", BarChart3],
      ["/student/ai", "AI Insights", Sparkles],
      ["/student/profile", "Profile", UserRound]
    ];
    if (role === "teacher") return [
      ["/teacher/dashboard", "Dashboard", LayoutDashboard],
      ["/teacher/courses", "My Courses", BookOpen],
      ["/teacher/students", "Students", Users],
      ["/teacher/attendance", "Attendance", CalendarCheck],
      ["/teacher/assignments", "Assignments", ClipboardList],
      ["/teacher/exams", "Exams & Results", BarChart3],
      ["/teacher/analytics", "Analytics", Activity]
    ];
    return [
      ["/admin/dashboard", "Dashboard", LayoutDashboard],
      ["/admin/students", "Students", Users],
      ["/admin/teachers", "Teachers", GraduationCap],
      ["/admin/courses", "Courses", BookOpen],
      ["/admin/analytics", "Analytics", BarChart3],
      ["/admin/ai", "AI Intelligence", Sparkles],
      ["/admin/reports", "Reports", ClipboardList],
      ["/admin/settings", "Settings", Settings]
    ];
  }, [role]);

  return <div className="app-shell">
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark"><GraduationCap size={21}/></div><div><b>EduIntelli</b><small>Academic Intelligence</small></div></div>
      <div className="role-pill">{role.toUpperCase()}</div>
      <nav>{nav.map(([to, label, Icon]) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
      <button className="logout" onClick={onLogout}><LogOut size={18}/> Logout</button>
    </aside>
    {open && <div className="overlay" onClick={() => setOpen(false)} />}
    <main className="main">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setOpen(true)}><Menu/></button>
        <div className="top-search"><Search size={17}/><input placeholder="Search academic records..." /></div>
        <div className="top-actions"><button className="icon-btn"><Bell size={19}/><i/></button><div className="avatar">{role === "student" ? "DP" : role === "teacher" ? "PK" : "AD"}</div></div>
      </header>
      <div className="content">{children}</div>
    </main>
  </div>
}

function PageTitle({ eyebrow, title, text, action }) {
  return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{text && <p>{text}</p>}</div>{action}</div>
}
function Stat({ label, value, sub, icon: Icon, tone="" }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div></div>
}
function AIBox({ risk="Medium" }) {
  return <div className="ai-box"><div className="ai-head"><span className="ai-icon"><Sparkles size={18}/></span><div><b>AI Academic Insight</b><small>Based on current academic activity</small></div><span className={`risk ${risk.toLowerCase()}`}>{risk} Risk</span></div><p>Your attendance is healthy overall, but Computer Networks is below your current average. Focus on protocol concepts and practice questions before the next assessment.</p><div className="recommendation"><CheckCircle2 size={17}/><span><b>Recommendation:</b> Complete two focused revision sessions this week and maintain attendance above 80%.</span></div></div>
}

function StudentDashboard() {
  const s = demo.student;
  return <><PageTitle eyebrow="Student workspace" title={`Welcome back, ${s.name.split(" ")[0]} 👋`} text="Track your learning, performance and personalized academic insights."/>
    <div className="stats-grid"><Stat label="Attendance" value={`${s.attendance}%`} sub="+4% this month" icon={CalendarCheck} tone="blue"/><Stat label="Average Mark" value={`${s.average}%`} sub="+3% from last month" icon={BarChart3} tone="green"/><Stat label="Courses" value="4" sub="2 assignments due" icon={BookOpen} tone="purple"/><Stat label="Risk Level" value={s.risk} sub="Monitor Networks" icon={AlertTriangle} tone="orange"/></div>
    <div className="grid-2"><section className="card"><div className="section-head"><div><h2>Subject Performance</h2><p>Current assessment average</p></div></div><div className="chart"><ResponsiveContainer width="100%" height={260}><BarChart data={performance}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="subject"/><YAxis domain={[0,100]}/><Tooltip/><Bar dataKey="score" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></div></section><section className="card"><div className="section-head"><div><h2>Progress Trend</h2><p>Last six months</p></div></div><div className="chart"><ResponsiveContainer width="100%" height={260}><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month"/><YAxis domain={[50,100]}/><Tooltip/><Line type="monotone" dataKey="score" strokeWidth={3}/></LineChart></ResponsiveContainer></div></section></div>
    <AIBox risk={s.risk}/>
  </>
}

function StudentCourses() {
  return <><PageTitle eyebrow="Academics" title="My Courses" text="Your current enrolled courses and performance."/><div className="course-grid">{demo.student.courses.map(c => <div className="course-card" key={c.code}><div className="course-cover"><span>{c.code}</span><BookOpen/></div><div className="course-body"><h3>{c.name}</h3><p>{c.teacher}</p><div className="course-meta"><span>Attendance <b>{c.attendance}%</b></span><span>Mark <b>{c.mark}%</b></span></div><div className="progress"><i style={{width:`${c.mark}%`}}/></div></div></div>)}</div></>
}
function StudentAttendance() {
  return <><PageTitle eyebrow="Academics" title="Attendance" text="Monitor attendance across all enrolled courses."/><div className="card table-card"><table><thead><tr><th>Course</th><th>Total Classes</th><th>Present</th><th>Absent</th><th>Attendance</th><th>Status</th></tr></thead><tbody>{demo.student.courses.map(c => <tr key={c.code}><td><b>{c.name}</b><small>{c.code}</small></td><td>45</td><td>{Math.round(c.attendance*0.45)}</td><td>{45-Math.round(c.attendance*0.45)}</td><td><b>{c.attendance}%</b></td><td><span className={`status ${c.attendance >= 75 ? "success" : "danger"}`}>{c.attendance >= 75 ? "Good" : "Low"}</span></td></tr>)}</tbody></table></div></>
}
function StudentAssignments() {
  const [submitted, setSubmitted] = useState({});
  return <><PageTitle eyebrow="Academics" title="Assignments" text="View deadlines, submit work and track evaluation."/><div className="assignment-list">{demo.student.assignments.map(a => <div className="assignment" key={a.title}><div className="assignment-icon"><ClipboardList/></div><div className="assignment-info"><h3>{a.title}</h3><p>{a.course} · Due {a.due}</p></div><span className={`status ${a.status==="Evaluated" ? "success" : a.status==="Submitted" || submitted[a.title] ? "info" : "warning"}`}>{submitted[a.title] ? "Submitted" : a.status}</span>{a.status==="Pending" && !submitted[a.title] && <button className="btn small" onClick={() => setSubmitted(x=>({...x,[a.title]:true}))}>Submit</button>}{a.mark !== "-" && <b className="mark">{a.mark}/100</b>}</div>)}</div></>
}
function StudentResults() {
  return <><PageTitle eyebrow="Academics" title="Results" text="Your examination performance and grades."/><div className="stats-grid"><Stat label="Overall Average" value="76%" sub="Current semester" icon={BarChart3} tone="green"/><Stat label="Highest" value="82%" sub="Artificial Intelligence" icon={GraduationCap} tone="blue"/><Stat label="Subjects" value="4" sub="Completed" icon={BookOpen} tone="purple"/></div><div className="card table-card"><table><thead><tr><th>Subject</th><th>Exam</th><th>Marks</th><th>Grade</th></tr></thead><tbody>{demo.student.results.map(r=><tr key={r.subject}><td><b>{r.subject}</b></td><td>{r.exam}</td><td><b>{r.mark}/100</b></td><td><span className="grade">{r.grade}</span></td></tr>)}</tbody></table></div></>
}
function StudentAI() { return <><PageTitle eyebrow="Artificial Intelligence" title="AI Academic Insights" text="Personalized guidance generated from your academic data."/><AIBox risk="Medium"/><div className="grid-2"><div className="card"><h2>Focus Areas</h2><div className="focus-item"><span>01</span><div><b>Computer Networks</b><p>Current score is 68%. Revise routing, TCP/IP and subnetting.</p></div></div><div className="focus-item"><span>02</span><div><b>Machine Learning</b><p>Practice model evaluation and classification metrics.</p></div></div></div><div className="card"><h2>Academic Signals</h2><div className="signal"><span>Attendance</span><b className="positive">Healthy · 82%</b></div><div className="signal"><span>Assignment completion</span><b className="positive">Good · 91%</b></div><div className="signal"><span>Performance trend</span><b className="positive">Improving</b></div></div></div></> }
function Profile({role}) { const person=role==="student"?demo.student:demo.teacher; return <><PageTitle eyebrow="Account" title="Profile" text="Your academic profile information."/><div className="profile-card"><div className="big-avatar">{role==="student"?"DP":"PK"}</div><div><h2>{person.name}</h2><p>{role==="student"?person.department:"Faculty Member"}</p><span className="status success">Active</span></div></div><div className="card form-grid"><label>Full Name<input value={person.name} readOnly/></label><label>ID<input value={person.id} readOnly/></label><label>Department<input value={role==="student"?person.department:"Computer Science & Engineering"} readOnly/></label><label>Email<input value="user@eduportal.in" readOnly/></label></div></> }

function TeacherDashboard() { const t=demo.teacher; return <><PageTitle eyebrow="Teacher workspace" title={`Good afternoon, ${t.name.split(" ")[1]}`} text="Manage classes, assessments and student performance."/><div className="stats-grid"><Stat label="My Courses" value={t.courses} sub="Active this semester" icon={BookOpen} tone="blue"/><Stat label="Students" value={t.students} sub="Across 4 courses" icon={Users} tone="purple"/><Stat label="Pending Reviews" value={t.pending} sub="Assignments" icon={ClipboardList} tone="orange"/><Stat label="Class Average" value={`${t.average}%`} sub="+2% this month" icon={BarChart3} tone="green"/></div><div className="grid-2"><div className="card"><h2>Class Performance</h2><div className="chart"><ResponsiveContainer width="100%" height={260}><BarChart data={performance}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="subject"/><YAxis domain={[0,100]}/><Tooltip/><Bar dataKey="score" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></div></div><div className="card"><h2>Recent Actions</h2><div className="activity"><span className="dot"/><div><b>12 submissions evaluated</b><p>Machine Learning · Today</p></div></div><div className="activity"><span className="dot"/><div><b>Attendance recorded</b><p>AI Fundamentals · Yesterday</p></div></div><div className="activity"><span className="dot"/><div><b>New assignment created</b><p>Database Systems · 2 days ago</p></div></div></div></div></> }
function TeacherCourses() { return <><PageTitle eyebrow="Teaching" title="My Courses" action={<button className="btn"><BookOpen size={17}/> Create Course</button>}/><div className="course-grid">{["Artificial Intelligence","Machine Learning","Database Systems","Web Development"].map((x,i)=><div className="course-card" key={x}><div className="course-cover"><span>CS60{i+1}</span><BookOpen/></div><div className="course-body"><h3>{x}</h3><p>{[32,38,29,29][i]} students enrolled</p><div className="course-meta"><span>Average <b>{[82,74,80,72][i]}%</b></span><span>Attendance <b>{[88,79,86,76][i]}%</b></span></div><div className="progress"><i style={{width:`${[82,74,80,72][i]}%`}}/></div></div>)}</div></> }
function TeacherStudents() { const students=["Ananya R","Dharani Priya","Kavin M","Nivetha S","Rohit K"]; return <><PageTitle eyebrow="Teaching" title="Students" text="Monitor students across your courses."/><div className="card table-card"><table><thead><tr><th>Student</th><th>Course</th><th>Attendance</th><th>Average</th><th>Risk</th><th>Action</th></tr></thead><tbody>{students.map((s,i)=><tr key={s}><td><b>{s}</b><small>STU-2026-0{i+21}</small></td><td>{["AI","ML","DBMS","AI","Networks"][i]}</td><td>{[91,82,74,88,68][i]}%</td><td>{[84,76,61,81,58][i]}%</td><td><span className={`risk ${i===4?"high":i===2?"medium":"low"}`}>{i===4?"High":i===2?"Medium":"Low"}</span></td><td><button className="text-btn">View</button></td></tr>)}</tbody></table></div></> }
function TeacherAttendance() { const [saved,setSaved]=useState(false); return <><PageTitle eyebrow="Teaching" title="Record Attendance" action={<button className="btn" onClick={()=>setSaved(true)}><CheckCircle2 size={17}/>{saved?"Saved":"Save Attendance"}</button>}/><div className="card"><div className="form-grid"><label>Course<select><option>Artificial Intelligence</option><option>Machine Learning</option></select></label><label>Date<input type="date" defaultValue="2026-08-16"/></label></div><div className="attendance-list">{["Ananya R","Dharani Priya","Kavin M","Nivetha S","Rohit K"].map(s=><div key={s}><b>{s}</b><div className="toggle"><button className="selected">Present</button><button>Absent</button></div></div>)}</div>{saved&&<div className="success-note"><CheckCircle2 size={17}/> Attendance saved successfully.</div>}</div></> }
function TeacherAssignments() { return <><PageTitle eyebrow="Teaching" title="Assignments" action={<button className="btn"><ClipboardList size={17}/> Create Assignment</button>}/><div className="assignment-list">{["ML Classification Report","SQL Optimization","Network Protocol Analysis"].map((a,i)=><div className="assignment" key={a}><div className="assignment-icon"><ClipboardList/></div><div className="assignment-info"><h3>{a}</h3><p>{[38,29,32][i]} submissions · Due {["20 Aug","28 Aug","23 Aug"][i]}</p></div><span className="status info">{[12,7,5][i]} pending</span><button className="text-btn">Review</button></div>)}</div></> }
function TeacherExams() { return <><PageTitle eyebrow="Teaching" title="Exams & Results"/><div className="card table-card"><table><thead><tr><th>Exam</th><th>Course</th><th>Date</th><th>Average</th><th>Action</th></tr></thead><tbody>{["Internal Assessment 1","Mid Semester Examination","Unit Test 2"].map((x,i)=><tr key={x}><td><b>{x}</b></td><td>{["AI","ML","DBMS"][i]}</td><td>{["10 Aug","14 Aug","16 Aug"][i]} 2026</td><td>{[78,72,81][i]}%</td><td><button className="text-btn">Enter Marks</button></td></tr>)}</tbody></table></div></> }
function TeacherAnalytics() { return <><PageTitle eyebrow="Teaching" title="Class Analytics" text="Performance insights across your classes."/><div className="grid-2"><div className="card"><h2>Performance by Subject</h2><div className="chart"><ResponsiveContainer width="100%" height={280}><BarChart data={performance}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="subject"/><YAxis/><Tooltip/><Bar dataKey="score" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></div></div><AIBox risk="Medium"/></div></> }

function AdminDashboard() { const a=demo.admin; return <><PageTitle eyebrow="Administration" title="Institution Overview" text="Academic health, activity and AI-powered insights."/><div className="stats-grid"><Stat label="Students" value={a.students} sub="+28 this semester" icon={Users} tone="blue"/><Stat label="Teachers" value={a.teachers} sub="46 active" icon={GraduationCap} tone="purple"/><Stat label="Courses" value={a.courses} sub="4 departments" icon={BookOpen} tone="green"/><Stat label="At-Risk Students" value={a.atRisk} sub="Needs attention" icon={AlertTriangle} tone="orange"/></div><div className="grid-2"><div className="card"><h2>Academic Performance Trend</h2><div className="chart"><ResponsiveContainer width="100%" height={280}><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month"/><YAxis domain={[50,100]}/><Tooltip/><Line type="monotone" dataKey="score" strokeWidth={3}/></LineChart></ResponsiveContainer></div></div><div className="card"><h2>Risk Distribution</h2><div className="chart"><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={100} label><Cell/><Cell/><Cell/></Pie><Tooltip/></PieChart></ResponsiveContainer></div><div className="legend"><span><i/>Low 62%</span><span><i/>Medium 27%</span><span><i/>High 11%</span></div></div></div><AIBox risk="Medium"/></> }
function AdminTable({type}) { const data= type==="students" ? ["Ananya R","Dharani Priya","Kavin M","Nivetha S","Rohit K"] : type==="teachers" ? ["Dr. Priya Kumar","Mr. Arun Kumar","Dr. Karthik S","Ms. Meena P"] : ["Artificial Intelligence","Machine Learning","Database Systems","Computer Networks"]; return <><PageTitle eyebrow="Administration" title={type[0].toUpperCase()+type.slice(1)} action={<button className="btn">+ Add {type.slice(0,-1)}</button>}/><div className="card table-card"><div className="table-toolbar"><div className="mini-search"><Search size={16}/><input placeholder={`Search ${type}...`}/></div><button className="filter-btn">Filter</button></div><table><thead><tr><th>Name</th><th>ID / Code</th><th>Department</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.map((x,i)=><tr key={x}><td><b>{x}</b></td><td>{type==="courses"?`CS60${i+1}`:`${type==="students"?"STU":"TCH"}-2026-0${i+12}`}</td><td>CSE (AI & ML)</td><td><span className="status success">Active</span></td><td><button className="text-btn">View</button></td></tr>)}</tbody></table></div></> }
function AdminAnalytics() { return <><PageTitle eyebrow="Administration" title="Academic Analytics" text="Institution-wide performance and risk analysis."/><div className="stats-grid"><Stat label="Avg Attendance" value="78%" sub="Across all departments" icon={CalendarCheck} tone="blue"/><Stat label="Avg Performance" value="74%" sub="+3% this semester" icon={BarChart3} tone="green"/><Stat label="Pass Rate" value="91%" sub="+5% from last term" icon={CheckCircle2} tone="purple"/><Stat label="High Risk" value="11%" sub="67 students" icon={AlertTriangle} tone="orange"/></div><div className="grid-2"><div className="card"><h2>Course Performance</h2><div className="chart"><ResponsiveContainer width="100%" height={280}><BarChart data={performance}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="subject"/><YAxis domain={[0,100]}/><Tooltip/><Bar dataKey="score" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></div></div><AIBox risk="Medium"/></div></> }
function AdminAI() { return <><PageTitle eyebrow="Artificial Intelligence" title="Academic Intelligence" text="AI-powered signals for educators and administrators."/><AIBox risk="Medium"/><div className="grid-2"><div className="card"><h2>Priority Signals</h2><div className="signal"><span>High-risk students</span><b className="negative">67</b></div><div className="signal"><span>Weakest subject</span><b>Computer Networks</b></div><div className="signal"><span>Lowest attendance group</span><b className="negative">2nd Year CSE</b></div><div className="signal"><span>Improving cohort</span><b className="positive">3rd Year AI & ML</b></div></div><div className="card"><h2>Recommended Actions</h2><div className="focus-item"><span>01</span><div><b>Attendance intervention</b><p>Contact students below the 75% threshold.</p></div></div><div className="focus-item"><span>02</span><div><b>Targeted revision</b><p>Schedule a Networks revision session.</p></div></div><div className="focus-item"><span>03</span><div><b>Progress monitoring</b><p>Review high-risk students weekly.</p></div></div></div></div></> }
function AdminReports() { return <><PageTitle eyebrow="Administration" title="Academic Reports" action={<button className="btn" onClick={()=>window.print()}>Print Report</button>}/><div className="card report-card"><h2>Institutional Performance Report</h2><p>Generated: 16 August 2026</p><div className="report-grid"><div><span>Total Students</span><b>842</b></div><div><span>Average Attendance</span><b>78%</b></div><div><span>Average Performance</span><b>74%</b></div><div><span>At-Risk Students</span><b>67</b></div></div><h3>Key Findings</h3><ul className="findings"><li>Computer Networks has the lowest current average.</li><li>Students below 75% attendance require follow-up.</li><li>Overall performance has improved during the last six months.</li></ul><div className="report-ai"><Sparkles size={18}/><div><b>AI Summary</b><p>Academic performance is trending upward, but targeted intervention is recommended for low-attendance students and weaker technical subjects.</p></div></div></div></> }
function Login({onLogin}) { const [role,setRole]=useState("student"); const [email,setEmail]=useState(""); const nav=useNavigate(); const submit=e=>{e.preventDefault();onLogin(role);nav(`/${role}/dashboard`)}; return <div className="login-page"><div className="login-art"><div className="login-brand"><div className="brand-mark"><GraduationCap size={22}/></div><b>EduIntelli</b></div><div className="login-copy"><span className="eyebrow">AI-powered education</span><h1>Turn academic data into better learning outcomes.</h1><p>One intelligent portal for students, teachers and administrators.</p><div className="login-feature"><Sparkles/><span><b>Academic Intelligence</b><small>Detect weak areas and generate personalized recommendations.</small></span></div></div></div><div className="login-form"><div className="mobile-brand"><GraduationCap/> EduIntelli</div><span className="eyebrow">Welcome back</span><h1>Sign in</h1><p>Access your academic workspace.</p><form onSubmit={submit}><label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input required type="password" placeholder="••••••••"/></label><label>Demo role<select value={role} onChange={e=>setRole(e.target.value)}><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Administrator</option></select></label><button className="login-btn">Sign in <ChevronRight size={18}/></button></form><div className="demo-note">Demo mode: any valid email/password works. Backend integration can replace this handler.</div></div></div> }

export default function App(){
  const [role,setRole]=useState(localStorage.getItem("demoRole"));
  const navigate=useNavigate(); const location=useLocation();
  const login=r=>{localStorage.setItem("demoRole",r);setRole(r)};
  const logout=()=>{localStorage.removeItem("demoRole");setRole(null);navigate("/")};
  if(!role) return <Routes><Route path="*" element={<Login onLogin={login}/>} /></Routes>;
  const base=role;
  if(!location.pathname.startsWith(`/${base}/`)) navigate(`/${base}/dashboard`,{replace:true});
  return <Layout role={role} onLogout={logout}><Routes>
    {role==="student" && <>
      <Route path="/student/dashboard" element={<StudentDashboard/>}/><Route path="/student/courses" element={<StudentCourses/>}/><Route path="/student/attendance" element={<StudentAttendance/>}/><Route path="/student/assignments" element={<StudentAssignments/>}/><Route path="/student/results" element={<StudentResults/>}/><Route path="/student/ai" element={<StudentAI/>}/><Route path="/student/profile" element={<Profile role="student"/>}/>
    </>}
    {role==="teacher" && <>
      <Route path="/teacher/dashboard" element={<TeacherDashboard/>}/><Route path="/teacher/courses" element={<TeacherCourses/>}/><Route path="/teacher/students" element={<TeacherStudents/>}/><Route path="/teacher/attendance" element={<TeacherAttendance/>}/><Route path="/teacher/assignments" element={<TeacherAssignments/>}/><Route path="/teacher/exams" element={<TeacherExams/>}/><Route path="/teacher/analytics" element={<TeacherAnalytics/>}/>
    </>}
    {role==="admin" && <>
      <Route path="/admin/dashboard" element={<AdminDashboard/>}/><Route path="/admin/students" element={<AdminTable type="students"/>}/><Route path="/admin/teachers" element={<AdminTable type="teachers"/>}/><Route path="/admin/courses" element={<AdminTable type="courses"/>}/><Route path="/admin/analytics" element={<AdminAnalytics/>}/><Route path="/admin/ai" element={<AdminAI/>}/><Route path="/admin/reports" element={<AdminReports/>}/><Route path="/admin/settings" element={<PageTitle eyebrow="Administration" title="Settings" text="Configuration options can be connected to the backend here."/>}/>
    </>}
    <Route path="*" element={<PageTitle eyebrow="404" title="Page not found" text="Use the navigation to continue."/>}/>
  </Routes></Layout>
}