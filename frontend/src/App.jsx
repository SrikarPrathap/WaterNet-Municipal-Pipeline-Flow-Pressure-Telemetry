
import { useCallback, useEffect, useState } from "react";
import {
  Activity, Bell, ChevronDown, Droplets, Gauge, LayoutDashboard,
  LogOut, Menu, Plus, RefreshCw, ShieldCheck, Waves, Wind,
  AlertTriangle, CheckCircle2, Clock3, Zap
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, BarChart, Bar
} from "recharts";
import "./index.css";

const API = "http://localhost:5000";

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit"
  });
}

function AuthPage({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/api/auth/${register ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Request failed");

      if (register) {
        setRegister(false);
        setPassword("");
        setError("Account created. Please sign in.");
      } else {
        localStorage.setItem("waternet_token", data.token);
        onLogin(data.user);
      }
    } catch (err) {
      setError(err.message || "Could not connect to WaterNet");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-visual">
        <div className="brand"><span className="brand-mark"><Droplets /></span> WaterNet</div>
        <div className="auth-hero">
          <span className="eyebrow"><span className="live-dot" /> SMART WATER INFRASTRUCTURE</span>
          <h1>Every drop.<br /><span>Under control.</span></h1>
          <p>Monitor pipeline health, understand water usage, and spot potential leaks from one intelligent dashboard.</p>
          <div className="water-art"><Waves size={155} strokeWidth={0.8} /><Droplets size={65} /></div>
        </div>
        <p className="auth-foot">WATER INTELLIGENCE PLATFORM · 2026</p>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <span className="eyebrow">WELCOME TO WATERNET</span>
          <h2>{register ? "Create your account" : "Welcome back"}</h2>
          <p className="muted">{register ? "Get started with your water monitoring workspace." : "Sign in to access your monitoring workspace."}</p>
          <form onSubmit={submit}>
            {register && <label>Full name<input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required /></label>}
            <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
            <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required /></label>
            {error && <div className={error.startsWith("Account created") ? "notice" : "error-box"}>{error}</div>}
            <button className="primary-btn full-btn" disabled={busy}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"} <span>→</span></button>
          </form>
          <p className="switch-auth">{register ? "Already have an account?" : "New to WaterNet?"} <button onClick={() => { setRegister(!register); setError(""); }}>{register ? "Sign in" : "Create account"}</button></p>
          <div className="secure-note"><ShieldCheck size={16} /> Your account is verified by the WaterNet API.</div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, unit, icon: Icon, tone, foot }) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={19} /></span></div>
      <div className="metric-value">{value}<small> {unit}</small></div>
      <div className="metric-foot"><span className="metric-dot" />{foot}</div>
    </article>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("waternet_token"));
  const [summary, setSummary] = useState({});
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem("waternet_token");
    setToken(null);
    setUser(null);
  }, []);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });
    const data = await response.json();
    if (response.status === 401) {
      logout();
      throw new Error("Session expired. Please sign in again.");
    }
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
  }, [token, logout]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [s, r, a] = await Promise.all([
        request("/api/telemetry/summary"),
        request("/api/telemetry"),
        request("/api/telemetry/alerts")
      ]);
      setSummary(s);
      setReadings(r);
      setAlerts(a);
      setMessage("");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, request]);

useEffect(() => {
  if (!token) return;

  refresh();

  const timer = setInterval(() => {
    refresh();
  }, 10000);

  return () => clearInterval(timer);
}, [token, refresh]);

  async function addTestReading() {
    try {
      setMessage("");
      const leakDemo = Math.random() > 0.7;
      const reading = {
        flow_rate: leakDemo ? 35 : Number((12 + Math.random() * 12).toFixed(2)),
        pressure: leakDemo ? 1.0 : Number((2.1 + Math.random() * 1.2).toFixed(2)),
        turbidity: Number((1 + Math.random() * 3).toFixed(2))
      };
      await request("/api/telemetry", {
        method: "POST",
        body: JSON.stringify(reading)
      });
      setMessage("New sensor reading saved to PostgreSQL.");
      await refresh();
    } catch (err) {
      setMessage(err.message);
    }
  }

  if (!token) return <AuthPage onLogin={u => { setUser(u); setToken(localStorage.getItem("waternet_token")); }} />;

  const chartData = [...readings].reverse().map(r => ({
    time: formatTime(r.recorded_at),
    flow: Number(r.flow_rate),
    pressure: Number(r.pressure),
    turbidity: Number(r.turbidity)
  }));

  const openAlerts = alerts.filter(a => !a.resolved);
  const latest = readings[0];
  const avg = value => summary[value] == null ? "0.00" : Number(summary[value]).toFixed(2);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand"><span className="brand-mark"><Droplets /></span><span>WaterNet<small>WATER INTELLIGENCE</small></span></div>
        <div className="workspace-label">WORKSPACE</div>
        <button className="nav-item active"><LayoutDashboard size={18} /> Overview <span className="nav-active-dot" /></button>
        <div className="side-section">MONITORING</div>
        <button className="nav-item" onClick={() => document.getElementById("flow-panel")?.scrollIntoView({ behavior: "smooth" })}><Activity size={18} /> Flow analytics</button>
        <button className="nav-item" onClick={() => document.getElementById("alerts-panel")?.scrollIntoView({ behavior: "smooth" })}><Bell size={18} /> Alerts <span className="nav-count">{openAlerts.length}</span></button>
        <div className="sidebar-bottom">
          <div className="system-status"><span className="live-dot" /><div><strong>System operational</strong><small>API connected · Port 5000</small></div></div>
          <button className="profile-row" onClick={logout}><span className="avatar">{(user?.name || "W").charAt(0).toUpperCase()}</span><span className="profile-info"><strong>{user?.name || "WaterNet User"}</strong><small>{user?.email || "Signed in"}</small></span><LogOut size={17} /></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)}><Menu /></button>
          <div className="breadcrumbs">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="topbar-right"><span className="status-pill"><span className="live-dot" /> Simulated telemetry</span><button className="icon-btn" title="Refresh data" onClick={refresh}><RefreshCw size={17} className={loading ? "spin" : ""} /></button><span className="top-avatar">{(user?.name || "W").charAt(0).toUpperCase()}</span></div>
        </header>

        <div className="dashboard-content">
          <section className="welcome-row">
            <div><div className="eyebrow">FRIDAY, OCTOBER 16, 2026</div><h1>Water overview <span className="wave-emoji">〰</span></h1><p className="muted">Here’s what’s happening across your water network.</p></div>
            <button className="primary-btn" onClick={addTestReading} disabled={loading}><Plus size={18} /> Add test reading</button>
          </section>

          {message && <div className="notice message-notice">{message}<button onClick={() => setMessage("")}>×</button></div>}

          <section className="metric-grid">
            <MetricCard label="Average flow rate" value={avg("avg_flow_rate")} unit="L/min" icon={Waves} tone="cyan" foot="Today's readings" />
            <MetricCard label="Pipeline pressure" value={latest ? Number(latest.pressure).toFixed(2) : avg("avg_pressure")} unit="bar" icon={Gauge} tone="violet" foot="Latest measurement" />
            <MetricCard label="Water turbidity" value={latest ? Number(latest.turbidity).toFixed(2) : avg("avg_turbidity")} unit="NTU" icon={Droplets} tone="blue" foot="Latest measurement" />
            <MetricCard label="Active alerts" value={summary.active_alerts ?? 0} unit="" icon={AlertTriangle} tone="orange" foot={openAlerts.length ? "Requires attention" : "No open alerts"} />
          </section>

          <section className="chart-grid" id="flow-panel">
            <article className="panel flow-panel">
              <div className="panel-heading"><div><h3>Flow rate analytics</h3><p>Water movement over recent readings</p></div><span className="chart-legend"><i /> Flow rate (L/min)</span></div>
              {chartData.length > 0 ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#18b6c9" stopOpacity={0.25}/><stop offset="95%" stopColor="#18b6c9" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf1f6" vertical={false} /><XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#8995a7", fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#8995a7", fontSize: 11 }} width={40}/><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e6ebf2", fontSize: 12 }}/><Area type="monotone" dataKey="flow" name="Flow rate" stroke="#16aabb" strokeWidth={2.5} fill="url(#flowFill)" /></AreaChart></ResponsiveContainer></div> : <div className="empty-chart"><Activity size={30}/><strong>No telemetry yet</strong><span>Add a test reading to start your chart.</span></div>}
              <div className="panel-footer"><span><Clock3 size={14}/> {readings.length} stored readings</span><span>Source: PostgreSQL</span></div>
            </article>

            <article className="panel pressure-panel">
              <div className="panel-heading"><div><h3>Pressure stability</h3><p>Pipeline pressure history</p></div><span className="mini-tag">BAR</span></div>
              {chartData.length > 0 ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="pressureFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8876ee" stopOpacity={0.22}/><stop offset="100%" stopColor="#8876ee" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf1f6" vertical={false}/><XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#8995a7", fontSize: 11 }}/><YAxis tickLine={false} axisLine={false} tick={{ fill: "#8995a7", fontSize: 11 }} width={35}/><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e6ebf2", fontSize: 12 }}/><Area type="monotone" dataKey="pressure" name="Pressure" stroke="#8876ee" strokeWidth={2.5} fill="url(#pressureFill)"/></AreaChart></ResponsiveContainer></div> : <div className="empty-chart"><Gauge size={30}/><strong>Waiting for data</strong><span>Pressure readings will appear here.</span></div>}
              <div className="panel-footer"><span><span className="metric-dot violet-dot"/>Pressure monitoring</span><span>Simulated data</span></div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel alerts-panel" id="alerts-panel">
              <div className="panel-heading"><div><h3>Network alerts</h3><p>Events that may need attention</p></div><span className="alert-total">{openAlerts.length} open</span></div>
              {alerts.length === 0 ? <div className="empty-alerts"><CheckCircle2 size={24}/><strong>All clear</strong><span>No alerts have been recorded.</span></div> : <div className="alert-list">{alerts.slice(0, 5).map(a => <div className="alert-row" key={a.id}><span className={`alert-symbol ${a.severity === "high" ? "danger" : "warning"}`}><AlertTriangle size={17}/></span><div className="alert-copy"><strong>{a.alert_type.replaceAll("_", " ")}</strong><p>{a.message}</p><small>{formatTime(a.created_at)}</small></div><span className={`severity ${a.severity === "high" ? "severity-high" : "severity-medium"}`}>{a.severity}</span></div>)}</div>}
              <div className="panel-footer"><span><ShieldCheck size={14}/> Rule-based detection</span><span>Demo thresholds</span></div>
            </article>

            <article className="panel readings-panel">
              <div className="panel-heading"><div><h3>Recent readings</h3><p>Latest stored sensor data</p></div><span className="mini-tag">LATEST</span></div>
              <div className="table-scroll"><table><thead><tr><th>TIME</th><th>FLOW</th><th>PRESSURE</th><th>STATUS</th></tr></thead><tbody>{readings.slice(0, 5).map(r => { const leak = Number(r.pressure) < 1.5 && Number(r.flow_rate) > 20; return <tr key={r.id}><td>{formatTime(r.recorded_at)}</td><td>{Number(r.flow_rate).toFixed(1)} <small>L/m</small></td><td>{Number(r.pressure).toFixed(2)} <small>bar</small></td><td><span className={`reading-status ${leak ? "reading-warning" : "reading-normal"}`}><i/>{leak ? "Check" : "Normal"}</span></td></tr>; })}</tbody></table></div>
              {readings.length === 0 && <div className="table-empty">No readings recorded yet.</div>}
              <div className="panel-footer"><span><Zap size={14}/> Auto-updates on refresh</span><button className="text-btn" onClick={refresh}>Refresh data →</button></div>
            </article>
          </section>

          <footer className="page-footer"><span>© 2026 WaterNet Monitoring System</span><span><span className="live-dot"/> Connected to PostgreSQL <b>·</b> Express API</span></footer>
        </div>
      </main>
    </div>
  );
}
