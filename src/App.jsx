import { useState, useEffect } from "react";
import "./App.css";

const SECTIONS = ["Overview", "Sectors", "Macro", "News", "Catalysts", "Strategy"];
const SECTION_ICONS = { Overview: "📈", Sectors: "🏭", News: "📰", Catalysts: "📅", Macro: "🌐", Strategy: "💡" };

function ChangeChip({ value }) {
  if (value === null || value === undefined) return <span className="change-neutral">—</span>;
  const pos = value >= 0;
  return <span className={pos ? "change-pos" : "change-neg"}>{pos ? "+" : ""}{typeof value === "number" ? value.toFixed(2) : value}%</span>;
}
function Badge({ children, type = "info" }) { return <span className={`badge badge-${type}`}>{children}</span>; }
function Card({ children, className = "" }) { return <div className={`card ${className}`}>{children}</div>; }

function OverviewSection({ data }) {
  return <div>
    <h2 className="section-title">Equities overview</h2>
    {data.indices && <div className="grid-4 mb-lg">{data.indices.map(idx => (
      <div key={idx.name} className="metric-card">
        <p className="metric-label">{idx.name}</p>
        <p className="metric-value">{idx.value}</p>
        <ChangeChip value={idx.change} />
      </div>
    ))}</div>}
    {data.summary && <Card className="mb-lg"><p className="muted">{data.summary}</p></Card>}
    {data.movers && <><h2 className="section-title">Top movers — watchlist sectors</h2>
      <div className="flex-col gap-sm">{data.movers.map(m => (
        <Card key={m.ticker} className="row-between">
          <div className="row gap-md"><span className="ticker">{m.ticker}</span><Badge type="info">{m.sector}</Badge><span className="muted small">{m.note}</span></div>
          <ChangeChip value={m.change} />
        </Card>
      ))}</div></>}
  </div>;
}

function SectorsSection({ data }) {
  const arr = Array.isArray(data) ? data : [];
  return <div><h2 className="section-title">Sector performance</h2>
    <div className="grid-4">{arr.map(s => (
      <Card key={s.ticker}>
        <div className="row-between mb-sm"><div><p className="ticker">{s.ticker}</p><p className="muted small">{s.name}</p></div><ChangeChip value={s.change} /></div>
        <div className="row-between"><span className="small muted">YTD</span><ChangeChip value={s.ytd} /></div>
        {s.note && <p className="small muted mt-sm">{s.note}</p>}
      </Card>
    ))}</div>
  </div>;
}

function NewsSection({ data }) {
  const arr = Array.isArray(data) ? data : [];
  const sentMap = { positive: "success", negative: "danger", neutral: "warning" };
  const typeMap = { "M&A": "warning", "Earnings": "info", "Macro": "info", "Geopolitical": "danger", "IPO": "success" };
  return <div><h2 className="section-title">Major weekly news</h2>
    <div className="flex-col gap-sm">{arr.map((n, i) => (
      <Card key={i}>
        <div className="row-between mb-sm" style={{ gap: 12 }}>
          <p className="headline">{n.headline}</p>
          <div className="row gap-xs" style={{ flexShrink: 0 }}>
            {n.type && <Badge type={typeMap[n.type] || "info"}>{n.type}</Badge>}
            <Badge type={sentMap[n.sentiment] || "info"}>{n.sentiment}</Badge>
          </div>
        </div>
        <div className="row gap-sm mb-sm"><Badge type="info">{n.sector}</Badge><span className="small muted">{n.date}</span></div>
        <p className="small muted">→ {n.impact}</p>
      </Card>
    ))}</div>
  </div>;
}

function CatalystsSection({ data }) {
  const arr = Array.isArray(data) ? data : [];
  const catMap = { Fed: "danger", CPI: "warning", IPO: "success", Earnings: "info", Geopolitical: "warning", Election: "info", "M&A": "warning", Other: "info" };
  const impactColor = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
  return <div><h2 className="section-title">Next catalysts</h2>
    <div className="flex-col gap-sm">{arr.map((c, i) => (
      <Card key={i} className="catalyst-row">
        <div className="catalyst-date">
          <span className="catalyst-date-text">{c.date}</span>
        </div>
        <div className="catalyst-body">
          <div className="row gap-sm mb-sm"><span className="headline">{c.event}</span><Badge type={catMap[c.category] || "info"}>{c.category}</Badge></div>
          <p className="small muted">{c.detail}</p>
        </div>
        <div className="row gap-xs"><span className="dot" style={{ background: impactColor[c.impact] || "#888" }} /><span className="small muted">{c.impact}</span></div>
      </Card>
    ))}</div>
  </div>;
}

function MacroSection({ data }) {
  const groups = [{ key: "rates", label: "Interest rates" }, { key: "fx", label: "FX" }, { key: "equities", label: "Global equities" }, { key: "commodities", label: "Commodities" }];
  return <div><h2 className="section-title">Macro snapshot</h2>
    {data.commentary && <Card className="mb-lg"><p className="muted">{data.commentary}</p></Card>}
    <div className="grid-4">{groups.map(g => data[g.key] && (
      <Card key={g.key}>
        <p className="group-label">{g.label}</p>
        <div className="flex-col gap-sm">{data[g.key].map(item => (
          <div key={item.label} className="row-between">
            <span className="small muted">{item.label}</span>
            <div className="row gap-sm"><span className="small bold">{item.value}</span>{item.change != null && <ChangeChip value={item.change} />}</div>
          </div>
        ))}</div>
      </Card>
    ))}</div>
  </div>;
}

function StrategySection({ data }) {
  const stanceMap = { Overweight: "success", Underweight: "danger", Neutral: "warning" };
  const convColor = { High: "#22c55e", Medium: "#f59e0b", Low: "#ef4444" };
  return <div><h2 className="section-title">Thesis & strategy</h2>
    {data.overview && <Card className="mb-lg"><p className="muted">{data.overview}</p></Card>}

    {data.convictionPicks && data.convictionPicks.length > 0 && <>
      <h3 className="subsection-title">Conviction picks</h3>
      <div className="grid-4 mb-lg">{data.convictionPicks.map((p, i) => (
        <div key={i} className="conviction-card">
          <div className="row-between mb-xs">
            <span className="ticker">{p.ticker}</span>
            <span className="dot" style={{ background: convColor[p.conviction] || "#888" }} />
          </div>
          <p className="tiny muted mb-xs">{p.theme}</p>
          <p style={{ fontSize: 11, color: "#555", lineHeight: 1.5 }}>{p.rationale}</p>
        </div>
      ))}</div>
    </>}

    {data.calls && <><h3 className="subsection-title">Sector calls</h3>
      <div className="flex-col gap-sm mb-lg">{data.calls.map((c, i) => (
        <Card key={i} className="strategy-row">
          <span className="ticker" style={{ minWidth: 140 }}>{c.sector}</span>
          <p className="small muted flex-1">{c.rationale}</p>
          <div className="flex-col align-end gap-xs">
            <Badge type={stanceMap[c.stance] || "info"}>{c.stance}</Badge>
            <div className="row gap-xs"><span className="dot" style={{ background: convColor[c.conviction] || "#888" }} /><span className="tiny muted">{c.conviction}</span></div>
          </div>
        </Card>
      ))}</div></>}

    {data.watchlist && data.watchlist.length > 0 && <>
      <h3 className="subsection-title">Names to watch</h3>
      <Card className="mb-lg">
        <div className="watch-tickers">{data.watchlist.map((w, i) => (
          <div key={i} className="watch-ticker-item">
            <span className="ticker">{w.ticker}</span>
            <span className="tiny muted">{w.reason}</span>
          </div>
        ))}</div>
      </Card>
    </>}

    {data.risks && <><h3 className="subsection-title">Key risks</h3>
      <div className="flex-col gap-sm mb-lg">{data.risks.map((r, i) => (
        <Card key={i} className="row gap-md"><span style={{ fontSize: 18 }}>⚠️</span>
          <div><p className="bold small mb-xs">{r.risk}</p><p className="small muted">{r.detail}</p></div>
        </Card>
      ))}</div></>}

    {data.watchFor && <div className="watch-banner"><span style={{ fontSize: 16 }}>👁</span>
      <div><p className="small bold mb-xs">Watch this week</p><p className="small">{data.watchFor}</p></div>
    </div>}
  </div>;
}

export default function App() {
  const [activeSection, setActiveSection] = useState("Overview");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    fetch("/api/refresh")
      .then(r => r.json())
      .then(payload => {
        if (payload) {
          setDashboardData(payload.data);
          setUpdatedAt(payload.updatedAt);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const d = dashboardData?.[activeSection];

  return (
    <div className="app">
      <header className="header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 32" width="90" height="32">
              <path d="M4 26 L4 8 L14 20 L24 8 L24 26" stroke="#f0f0f0" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M32 22 L42 10" stroke="#60a5fa" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
              <path d="M36 10 L42 10 L42 16" stroke="#60a5fa" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M50 26 L50 8 L60 20 L70 8 L70 26" stroke="#f0f0f0" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="site-title">The Mantegazza Brief</h1>
          </div>
          <p className="site-date">
            {updatedAt
              ? `Updated ${new Date(updatedAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
              : new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </header>

      <nav className="nav">
        {SECTIONS.map(s => (
          <button key={s} className={`nav-btn ${activeSection === s ? "active" : ""}`} onClick={() => setActiveSection(s)}>
            {SECTION_ICONS[s]} {s}
          </button>
        ))}
      </nav>

      <main className="main">
        {loading && <div className="loading-state"><div className="spinner" /><span>Loading...</span></div>}
        {!loading && !dashboardData && (
          <Card><p className="muted">No data yet. Visit <a href="/refresh" style={{ color: "#60a5fa" }}>/refresh</a> to generate the dashboard.</p></Card>
        )}
        {!loading && d && !d.error && (
          <>
            {activeSection === "Overview" && <OverviewSection data={d} />}
            {activeSection === "Sectors" && <SectorsSection data={d} />}
            {activeSection === "Macro" && <MacroSection data={d} />}
            {activeSection === "News" && <NewsSection data={d} />}
            {activeSection === "Catalysts" && <CatalystsSection data={d} />}
            {activeSection === "Strategy" && <StrategySection data={d} />}
          </>
        )}
        {!loading && d?.error && (
          <Card><p className="muted">Section unavailable. Visit <a href="/refresh" style={{ color: "#60a5fa" }}>/refresh</a> to regenerate.</p></Card>
        )}
      </main>
    </div>
  );
}