import { useState, useEffect, useRef } from "react";
import "./App.css";

const DEFAULT_THESIS = `I manage two portfolios (JPM and Robinhood). I am young, high-risk tolerance, and invest money I don't depend on to live. Stock appreciation is always preferred over dividends.

INVESTMENT STYLE: I operate in two modes. Mode 1 — Tactical short-term hype surf: I identify obvious, time-limited momentum plays (e.g. SpaceX IPO driving Nasdaq, end-of-war cyclical snapback) and go nearly 100% in market to capture them. I am currently in this mode. Mode 2 — Mid/long-term quality: When not surfing a tactical wave, I keep a liquidity reserve (money market) to seize opportunities others miss by being 100% invested. Outside tactical plays, I only invest in quality names with strong fundamentals that match both market momentum and my personal theses. Never chase yield — always chase appreciation.

My core theses:

AI INFRASTRUCTURE STACK: Not betting on AI itself but on what AI needs. First movers on AI gains are full-stack platforms AMZN and GOOGL — they don't rely on third-party contracts and will show AI optimization in upcoming earnings. Behind them: semis (SOXX, AMD, MU) for hardware demand; data center operators split by risk profile — EQIX and DLR for quality/stability with power moats, IREN/CORZ/APLD for high-beta capital appreciation; power/cooling infrastructure VRT and ETN as the true bottleneck winners regardless of which operator wins. Watch CRWV (CoreWeave) as GPU cloud pure play. For data collection feeding robotics/AI pipeline: PLTR (Palantir) and SNOW (Snowflake). Short-term semi hype (SOXX, QQQ) being surfed into SpaceX/Nasdaq momentum but will rotate into data center and power names mid-term.

FARMLAND → DATA CENTER CONVERSION: Data center development is converting agricultural land, driving speculative farmland valuations and reducing food supply. Watch FPI and LAND (farmland REITs) as scarcity beneficiaries. DE (Deere) wins as precision agriculture becomes essential on shrinking productive land.

POST-WAR CYCLICAL ROTATION: End of Iran conflict + new Fed chair with rate-cut history = cyclicals rip. WCC already captured this. Next targets: quality cyclicals in construction (CAT), cybersecurity consolidation (CIBR, PANW, CRWD), and consumer recovery names like ABNB. Watch for M&A in cybersecurity.

HEALTHCARE STRUCTURAL WINNER: Aging US population, job creation concentrated in healthcare, AI-driven logistics optimization. UNH and LLY are core holds.

ENERGY SUPERCYCLE: Half traditional (XLE), half new methods (IREN for Bitcoin/HPC energy, CEG for nuclear). Biden infrastructure bills + data center power demand = multi-year tailwind.

FINTECH AI: HOOD (Robinhood) building toward full financial platform — agentic AI trading, SpaceX IPO access, PDT rule removal. SOFI for AI-underwritten lending. Avoid COIN — too crypto-correlated.

SKEPTICAL ON: Tesla (378x earnings multiple, robotaxi barely exists at scale), pure crypto, and growth names with no path to near-term profitability.

NAMES TO WATCH: PLTR, SNOW, CRWV, VRT, ETN, APLD, SYM, FPI, CEG, ABNB, CRWD, PANW.`;

export default function Refresh() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pwError, setPwError] = useState(false);
  const [thesis, setThesis] = useState(DEFAULT_THESIS);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (loading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [loading]);

  function handleLogin() {
    if (password === "Bull2026") { setAuthed(true); setPwError(false); }
    else setPwError(true);
  }

  async function handleRefresh() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "Bull2026", thesis })
      });
      const data = await res.json();
      if (data.success) {
        setUpdatedAt(data.updatedAt);
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
    setLoading(false);
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1 className="site-title">Dashboard admin</h1>
          <p className="site-date">The Mantegazza Brief — refresh & thesis editor</p>
        </div>
        {authed && <a href="/" style={{ fontSize: 13, color: "#60a5fa" }}>← View site</a>}
      </header>

      {!authed ? (
        <div style={{ maxWidth: 400 }}>
          <p className="muted small mb-sm">Enter admin password to access the dashboard controls.</p>
          <input
            type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Password" className="input mb-sm"
          />
          {pwError && <p className="error-text">Incorrect password.</p>}
          <button className="btn btn-primary" onClick={handleLogin}>Unlock</button>
        </div>
      ) : (
        <div>
          <div className="card mb-lg">
            <h2 className="section-title">Investment thesis</h2>
            <p className="muted small mb-sm">This feeds the Strategy section. Update it before refreshing.</p>
            <textarea value={thesis} onChange={e => setThesis(e.target.value)} rows={6} className="textarea mb-sm" />
          </div>

          <div className="card mb-lg">
            <h2 className="section-title">Refresh all sections</h2>
            <p className="muted small mb-sm">
              Fetches live data for all 6 sections using your thesis above and saves to cache.
              All visitors will immediately see the updated data.
            </p>
            <button className="btn btn-primary" onClick={handleRefresh} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? `⏳ Fetching live data... ${elapsed}s` : "↺ Refresh dashboard"}
            </button>

            {status === "success" && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#0f2918", borderRadius: 8, border: "0.5px solid #1a4a2a" }}>
                <p style={{ fontSize: 13, color: "#4ade80" }}>
                  ✓ Dashboard updated in {elapsed}s — as of {new Date(updatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                  <a href="/" style={{ color: "#60a5fa" }}>View the live site →</a>
                </p>
              </div>
            )}

            {status === "error" && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#2a1010", borderRadius: 8, border: "0.5px solid #4a1a1a" }}>
                <p style={{ fontSize: 13, color: "#f87171" }}>✗ Refresh failed after {elapsed}s. Check API key and try again.</p>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="section-title">Quick actions</h2>
            <div className="flex-col gap-sm">
              <a href="/" style={{ fontSize: 13, color: "#60a5fa" }}>→ View public dashboard</a>
              <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#60a5fa" }}>→ Check API usage & credits</a>
              <a href="https://vercel.com" target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#60a5fa" }}>→ Vercel dashboard</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}