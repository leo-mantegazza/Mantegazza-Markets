import { useState, useEffect, useRef } from "react";
import "./App.css";

const DEFAULT_THESIS = "I am bullish on US technology infrastructure, semiconductors, and cybersecurity driven by AI capex cycles. I believe energy transition and defense spending will support industrials. Healthcare and financial services benefit from rate normalization. I am cautious on pure consumer discretionary and overvalued growth names with no path to profitability.";

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