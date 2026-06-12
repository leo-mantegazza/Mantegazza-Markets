import { useState, useEffect, useRef } from "react";
import "./App.css";

const WATCHLIST_SECTORS = [
  "Healthcare", "Financial Services", "Digital Infrastructure",
  "Machinery & Construction", "Energy", "Semiconductors", "Big Tech", "Cybersecurity"
];

const SECTOR_ETFS = [
  { ticker: "XLV", name: "Healthcare" },
  { ticker: "XLF", name: "Financial Services" },
  { ticker: "IGV", name: "Digital Infrastructure" },
  { ticker: "XLI", name: "Machinery & Construction" },
  { ticker: "XLE", name: "Energy" },
  { ticker: "SOXX", name: "Semiconductors" },
  { ticker: "XLK", name: "Big Tech" },
  { ticker: "CIBR", name: "Cybersecurity" },
];

const SECTIONS = ["Overview", "Sectors", "News", "Catalysts", "Macro", "Strategy"];
const SECTION_ICONS = { Overview: "📈", Sectors: "🏭", News: "📰", Catalysts: "📅", Macro: "🌐", Strategy: "💡" };
const ADMIN_PASSWORD = "leo2024";

function extractJSON(text) {
  // Try to extract JSON from markdown code fences first
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch {}
  }
  // Try to find raw JSON object or array
  const objMatch = text.match(/(\{[\s\S]*\})/);
  if (objMatch) {
    try { return JSON.parse(objMatch[1]); } catch {}
  }
  const arrMatch = text.match(/(\[[\s\S]*\])/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[1]); } catch {}
  }
  return null;
}

async function callClaude(systemPrompt, userPrompt) {
  const res = await fetch("/api/claude", {    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  const data = await res.json();
  return data.content?.filter(b => b.type === "text").map(b => b.text).join("\n") || "";
}

function ChangeChip({ value }) {
  if (value === null || value === undefined) return <span className="change-neutral">—</span>;
  const pos = value >= 0;
  return <span className={pos ? "change-pos" : "change-neg"}>{pos ? "+" : ""}{typeof value === "number" ? value.toFixed(2) : value}%</span>;
}
function Badge({ children, type = "info" }) { return <span className={`badge badge-${type}`}>{children}</span>; }
function Card({ children, className = "" }) { return <div className={`card ${className}`}>{children}</div>; }
function LoadingState() { return <div className="loading-state"><div className="spinner" /><span>Fetching live market data...</span></div>; }

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
  return <div><h2 className="section-title">Major weekly news</h2>
    <div className="flex-col gap-sm">{arr.map((n, i) => (
      <Card key={i}>
        <div className="row-between mb-sm"><p className="headline">{n.headline}</p><Badge type={sentMap[n.sentiment] || "info"}>{n.sentiment}</Badge></div>
        <div className="row gap-sm mb-sm"><Badge type="info">{n.sector}</Badge><span className="small muted">{n.date}</span></div>
        <p className="small muted">→ {n.impact}</p>
      </Card>
    ))}</div>
  </div>;
}

function CatalystsSection({ data }) {
  const arr = Array.isArray(data) ? data : [];
  const catMap = { Fed: "danger", CPI: "warning", IPO: "success", Earnings: "info", Geopolitical: "warning", Election: "info", Other: "info" };
  const impactColor = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
  return <div><h2 className="section-title">Next catalysts</h2>
    <div className="flex-col gap-sm">{arr.map((c, i) => (
      <Card key={i} className="catalyst-row">
        <div className="catalyst-date"><span className="small">{c.date}</span></div>
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
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [adminPwError, setAdminPwError] = useState(false);
  const [thesis, setThesis] = useState("I am bullish on US technology infrastructure, semiconductors, and cybersecurity driven by AI capex cycles. I believe energy transition and defense spending will support industrials. Healthcare and financial services benefit from rate normalization. I am cautious on pure consumer discretionary and overvalued growth names with no path to profitability.");
  const [thesisDraft, setThesisDraft] = useState(thesis);
  const [sectionData, setSectionData] = useState({});
  const [loadingSection, setLoadingSection] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const thesisRef = useRef(thesis);

  useEffect(() => { thesisRef.current = thesis; }, [thesis]);

  useEffect(() => {
    if (sectionData[activeSection] || loadingSection === activeSection) return;
    fetchSection(activeSection);
  }, [activeSection, retryCount]);

  async function fetchSection(section) {
    setLoadingSection(section);
    const sectorList = SECTOR_ETFS.map(e => `${e.ticker} (${e.name})`).join(", ");
    try {
      let result = "";
      if (section === "Overview") {
        result = await callClaude(
          `You are a financial market analyst. Search for today's market data and return ONLY a raw JSON object with no markdown, no code fences, no explanation. Format exactly: {"indices":[{"name":"S&P 500","value":"5,123","change":0.45},{"name":"Nasdaq","value":"16,234","change":-0.12},{"name":"Dow","value":"38,900","change":0.21},{"name":"VIX","value":"18.2","change":-2.1}],"movers":[{"ticker":"NVDA","sector":"Semiconductors","change":3.2,"note":"brief reason"},{"ticker":"JPM","sector":"Financial Services","change":-1.1,"note":"brief reason"},{"ticker":"XOM","sector":"Energy","change":1.8,"note":"brief reason"},{"ticker":"PANW","sector":"Cybersecurity","change":2.4,"note":"brief reason"},{"ticker":"UNH","sector":"Healthcare","change":-0.9,"note":"brief reason"}],"summary":"2 sentence summary"}`,
          `Search for today's S&P 500, Nasdaq, Dow Jones, VIX levels and % changes. Also find top movers in: ${WATCHLIST_SECTORS.join(', ')}. Return ONLY the JSON object, nothing else.`
        );
      } else if (section === "Sectors") {
        result = await callClaude(
          `You are a financial analyst. Return ONLY a raw JSON array, no markdown, no code fences. Each item: {"ticker":"XLV","name":"Healthcare","change":0.45,"ytd":3.2,"note":"one-line driver"}`,
          `Get today's % change and YTD return for: ${sectorList}. Return ONLY the JSON array.`
        );
      } else if (section === "News") {
        result = await callClaude(
          `You are a financial news analyst. Return ONLY a raw JSON array of 6 items, no markdown, no code fences. Each: {"headline":"headline","sector":"sector","impact":"US market impact in one sentence","sentiment":"positive|negative|neutral","date":"today or X days ago"}`,
          `Find top financial news this week for: ${WATCHLIST_SECTORS.join(', ')}. Frame global news as US market impact. Return ONLY the JSON array.`
        );
      } else if (section === "Catalysts") {
        result = await callClaude(
          `You are a market analyst. Return ONLY a raw JSON array, no markdown, no code fences. Each: {"event":"name","date":"date","category":"Fed|CPI|IPO|Earnings|Geopolitical|Election|Other","detail":"why it matters","impact":"high|medium|low"}`,
          `List next 8 market-moving events: Fed meetings, CPI, IPOs, key earnings, elections, geopolitical. Return ONLY the JSON array ordered by date.`
        );
      } else if (section === "Macro") {
        result = await callClaude(
          `You are a macro analyst. Return ONLY a raw JSON object, no markdown, no code fences. Format: {"rates":[{"label":"Fed Funds Rate","value":"5.25-5.50%","change":null},{"label":"2Y Treasury","value":"4.8%","change":-0.02},{"label":"10Y Treasury","value":"4.4%","change":0.01}],"fx":[{"label":"DXY","value":"104.2","change":0.15},{"label":"BRL/USD","value":"4.97","change":-0.3},{"label":"CNY/USD","value":"7.24","change":0.05},{"label":"EUR/USD","value":"1.082","change":-0.08}],"equities":[{"label":"Ibovespa","value":"128,450","change":0.6},{"label":"CSI 300","value":"3,580","change":-0.8},{"label":"Euro Stoxx 50","value":"4,920","change":0.3},{"label":"Tadawul","value":"11,200","change":0.2}],"commodities":[{"label":"Brent Crude","value":"$82","change":-0.5}],"commentary":"2 sentence macro outlook"}`,
          `Get current Fed Funds Rate, 2Y/10Y Treasury yields, DXY, BRL/USD, CNY/USD, EUR/USD, Ibovespa, CSI 300, Euro Stoxx 50, Tadawul, Brent crude. Return ONLY the JSON object.`
        );
      } else if (section === "Strategy") {
        result = await callClaude(
          `You are an investment strategist. Return ONLY a raw JSON object, no markdown, no code fences. Format: {"overview":"2 sentence overview","calls":[{"sector":"name","stance":"Overweight|Underweight|Neutral","rationale":"1-2 sentences","conviction":"High|Medium|Low"}],"risks":[{"risk":"name","detail":"1 sentence"},{"risk":"name","detail":"1 sentence"},{"risk":"name","detail":"1 sentence"}],"watchFor":"1-2 sentences on what to monitor"}`,
          `Given this thesis: "${thesisRef.current}" and today's market conditions, give sector calls for: ${WATCHLIST_SECTORS.join(', ')}. Return ONLY the JSON object.`
        );
      }

      const parsed = extractJSON(result);
      setSectionData(prev => ({ ...prev, [section]: parsed || { error: true, raw: result } }));
    } catch (e) {
      setSectionData(prev => ({ ...prev, [section]: { error: true } }));
    }
    setLoadingSection(null);
  }

  function retry() {
    setSectionData(prev => { const n = { ...prev }; delete n[activeSection]; return n; });
    setLoadingSection(null);
    setRetryCount(c => c + 1);
  }

  function handleLogin() {
    if (adminPw === ADMIN_PASSWORD) { setAdminAuthed(true); setAdminPwError(false); setThesisDraft(thesis); }
    else setAdminPwError(true);
  }

  function handleSave() {
    setThesis(thesisDraft);
    setSectionData(prev => { const n = { ...prev }; delete n.Strategy; return n; });
    setAdminOpen(false); setAdminAuthed(false); setAdminPw("");
  }

  const d = sectionData[activeSection];
  const isLoading = loadingSection === activeSection;

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1 className="site-title">Market intelligence</h1>
          <p className="site-date">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        </div>
        <button className="btn" onClick={() => { setAdminOpen(true); setAdminAuthed(false); setAdminPw(""); setAdminPwError(false); }}>⚙ Thesis editor</button>
      </header>

      <nav className="nav">
        {SECTIONS.map(s => (
          <button key={s} className={`nav-btn ${activeSection === s ? "active" : ""}`} onClick={() => setActiveSection(s)}>
            {SECTION_ICONS[s]} {s}
          </button>
        ))}
      </nav>

      <main className="main">
        {isLoading && <LoadingState />}
        {!isLoading && d?.error && (
          <Card>
            <p className="muted">Unable to load data.</p>
            {d.raw && <p className="muted small" style={{marginTop:8, fontFamily:"monospace", fontSize:11}}>{d.raw.slice(0,300)}</p>}
            <button onClick={retry} className="btn" style={{ marginTop: 12 }}>↺ Retry</button>
          </Card>
        )}
        {!isLoading && d && !d.error && (
          <>
            {activeSection === "Overview" && <OverviewSection data={d} />}
            {activeSection === "Sectors" && <SectorsSection data={d} />}
            {activeSection === "News" && <NewsSection data={d} />}
            {activeSection === "Catalysts" && <CatalystsSection data={d} />}
            {activeSection === "Macro" && <MacroSection data={d} />}
            {activeSection === "Strategy" && <StrategySection data={d} />}
          </>
        )}
      </main>

      {adminOpen && (
        <div className="modal-overlay" onClick={() => setAdminOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Thesis editor</h2>
            {!adminAuthed ? (
              <>
                <p className="muted small mb-sm">Enter admin password to edit your investment thesis.</p>
                <input type="password" value={adminPw} onChange={e => setAdminPw(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="Password" className="input mb-sm" />
                {adminPwError && <p className="error-text">Incorrect password.</p>}
                <div className="row gap-sm justify-end">
                  <button className="btn" onClick={() => setAdminOpen(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleLogin}>Unlock</button>
                </div>
              </>
            ) : (
              <>
                <p className="muted small mb-sm">Write your investment beliefs, sector biases, and conviction plays. This feeds the Strategy section.</p>
                <textarea value={thesisDraft} onChange={e => setThesisDraft(e.target.value)} rows={8} className="textarea mb-sm" />
                <div className="row gap-sm justify-end">
                  <button className="btn" onClick={() => setAdminOpen(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSave}>Save & refresh strategy</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}