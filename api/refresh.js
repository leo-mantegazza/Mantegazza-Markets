import { Redis } from '@upstash/redis';

export const maxDuration = 300;

const redis = Redis.fromEnv();

async function callClaude(systemPrompt, userPrompt, useSearch = true) {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': process.env.VITE_ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'web-search-2025-03-05'
  };
  let messages = [{ role: 'user', content: userPrompt }];
  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: systemPrompt,
    messages
  };
  if (useSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  }

  for (let i = 0; i < 5; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers,
      body: JSON.stringify({ ...body, messages })
    });
    const data = await res.json();
    if (data.type === 'error') throw new Error(data.error.message);
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('\n');
    if (text) return text;
    if (data.stop_reason === 'end_turn' || !data.content?.length) return '';
    if (!useSearch) return '';
    const toolResults = data.content.filter(b => b.type === 'server_tool_use').map(b => ({ type: 'server_tool_result', tool_use_id: b.id, content: 'Search completed.' }));
    if (!toolResults.length) return '';
    messages = [...messages, { role: 'assistant', content: data.content }, { role: 'user', content: toolResults }];
  }
  return '';
}

function extractJSON(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) { try { return JSON.parse(fenceMatch[1].trim()); } catch {} }
  const objMatch = text.match(/(\{[\s\S]*\})/);
  if (objMatch) { try { return JSON.parse(objMatch[1]); } catch {} }
  const arrMatch = text.match(/(\[[\s\S]*\])/);
  if (arrMatch) { try { return JSON.parse(arrMatch[1]); } catch {} }
  return null;
}

async function fetchSection(section, thesis) {
  let result = '';

  if (section === 'Overview') {
    result = await callClaude(
      `You are a financial market analyst. Return ONLY a raw JSON object, no markdown, no code fences. Format: {"indices":[{"name":"S&P 500","value":"5,123","change":0.45},{"name":"Nasdaq","value":"16,234","change":-0.12},{"name":"Dow","value":"38,900","change":0.21},{"name":"VIX","value":"18.2","change":-2.1}],"movers":[{"ticker":"NVDA","sector":"Semiconductors","change":3.2,"note":"brief reason"},{"ticker":"AMZN","sector":"Big Tech","change":1.1,"note":"brief reason"},{"ticker":"EQIX","sector":"Data Centers","change":0.9,"note":"brief reason"},{"ticker":"CEG","sector":"Nuclear Energy","change":1.4,"note":"brief reason"},{"ticker":"HOOD","sector":"Fintech","change":2.1,"note":"brief reason"}],"summary":"2 sentence market summary covering the dominant theme of the day"}`,
      `Search for today's S&P 500, Nasdaq, Dow Jones, and VIX levels with % changes. Then find the top 5 most notable movers today across the entire US market — prioritize names relevant to AI infrastructure, data centers, energy, fintech, cybersecurity, and cyclicals. Include both gainers and losers for balance. Return ONLY the JSON object.`
    );

  } else if (section === 'Sectors') {
    result = await callClaude(
      `You are a financial analyst. Return ONLY a raw JSON array, no markdown. Each item is a sector ETF only — do not include individual stocks. Format: {"ticker":"XLK","name":"Technology","change":0.45,"ytd":12.3,"note":"one-line explanation of what drove this sector today"}`,
      `Get today's % change and YTD return for these sector ETFs: XLK (Technology), XLF (Financial Services), XLV (Healthcare), XLE (Energy), XLU (Utilities), XLI (Industrials), XLB (Materials), XLRE (Real Estate), XLC (Communication Services), XLP (Consumer Staples), XLY (Consumer Discretionary), SOXX (Semiconductors), IGV (Software & Cloud), CIBR (Cybersecurity), ITB (Homebuilders). For each, write a one-line note on what drove today's sector move — rotation, macro data, earnings, geopolitical event, etc. No individual stocks. Return ONLY the JSON array.`
    );

  } else if (section === 'News') {
    result = await callClaude(
      `You are a financial news analyst writing a professional market brief. Return ONLY a raw JSON array of 8 items, no markdown. Each: {"headline":"concise headline","sector":"sector name","type":"M&A|Earnings|Macro|Geopolitical|IPO|Regulatory|Other","impact":"why this matters for US markets in one sentence","sentiment":"positive|negative|neutral","date":"Mon Jun 16 or X days ago"}. Always include at least one contrarian or risk story.`,
      `Search for the most important financial and market news from the past 3 days. Cover broadly: major M&A deals, earnings surprises, macro data (CPI, jobs, Fed), geopolitical developments (Middle East, China, trade), major IPOs, AI and tech industry moves, energy markets, regulatory changes. Do not limit to specific tickers. Surface stories a serious market observer must know this week, including ones that challenge consensus views. Return ONLY the JSON array.`
    );

  } else if (section === 'Catalysts') {
    result = await callClaude(
      `You are a market analyst. Return ONLY a raw JSON array, no markdown. Each: {"event":"event name","date":"Jun 17 or Jul 3","category":"Fed|CPI|IPO|Earnings|Geopolitical|Election|M&A|Other","detail":"why this matters for markets in 1-2 sentences","impact":"high|medium|low"}. Order by date ascending.`,
      `List the next 12 most important upcoming market catalysts globally. Include: Fed meetings and speeches, CPI/PPI/jobs releases, major earnings (mega-cap tech, banks, energy), significant IPOs, geopolitical events (Middle East, US-China trade, elections), ECB/BOJ/BOE meetings, and major regulatory decisions. Be specific with dates. Return ONLY the JSON array.`
    );

  } else if (section === 'Macro') {
    result = await callClaude(
      `You are a senior macro strategist. Return ONLY a raw JSON object, no markdown. Exact format:
{"rates":[{"label":"Fed Funds Rate","value":"4.25-4.50%","change":null},{"label":"2Y Treasury","value":"4.07%","change":-0.05},{"label":"10Y Treasury","value":"4.47%","change":0.02},{"label":"30Y Treasury","value":"4.90%","change":0.01}],"fx":[{"label":"DXY","value":"99.5","change":-0.3},{"label":"EUR/USD","value":"1.159","change":0.2},{"label":"BRL/USD","value":"5.04","change":-0.1},{"label":"CNY/USD","value":"6.76","change":0.0},{"label":"JPY/USD","value":"145.2","change":-0.4}],"equities":[{"label":"Ibovespa","value":"130,200","change":0.8},{"label":"CSI 300","value":"4,784","change":0.3},{"label":"Euro Stoxx 50","value":"6,154","change":0.5},{"label":"Nikkei 225","value":"38,500","change":-0.2},{"label":"Tadawul","value":"11,001","change":0.6}],"commodities":[{"label":"Brent Crude","value":"$81.55","change":-3.6},{"label":"Gold","value":"$3,240","change":0.4},{"label":"Natural Gas","value":"$2.85","change":-1.2},{"label":"Copper","value":"$4.52","change":0.9}],"commentary":"3-4 rich sentences: dominant macro theme this week, Fed/rate path outlook, cross-asset implications, what it means for cyclicals vs defensives. Be specific and data-driven."}`,
      `Search for current values: Fed Funds Rate, 2Y/10Y/30Y Treasury yields, DXY, EUR/USD, BRL/USD, CNY/USD, JPY/USD, Ibovespa, CSI 300, Euro Stoxx 50, Nikkei 225, Tadawul, Brent crude, Gold, Natural Gas, Copper prices. Also find the dominant macro narrative this week. Fill in the JSON with real data and write a 3-4 sentence commentary synthesizing what it all means for markets. Return ONLY the JSON object.`
    );

  } else if (section === 'Strategy') {
    // No web search for Strategy — keeps response focused and JSON well-formed
    result = await callClaude(
      `You are an investment strategist. Return ONLY valid JSON with no markdown, no explanation, no text before or after. Required structure:
{"overview":"string","convictionPicks":[{"ticker":"string","theme":"string","conviction":"High","rationale":"string"},{"ticker":"string","theme":"string","conviction":"High","rationale":"string"},{"ticker":"string","theme":"string","conviction":"Medium","rationale":"string"},{"ticker":"string","theme":"string","conviction":"Medium","rationale":"string"},{"ticker":"string","theme":"string","conviction":"Low","rationale":"string"}],"calls":[{"sector":"string","stance":"Overweight","rationale":"string","conviction":"High"},{"sector":"string","stance":"Overweight","rationale":"string","conviction":"High"},{"sector":"string","stance":"Neutral","rationale":"string","conviction":"Medium"},{"sector":"string","stance":"Underweight","rationale":"string","conviction":"Medium"}],"watchlist":[{"ticker":"string","reason":"string"},{"ticker":"string","reason":"string"},{"ticker":"string","reason":"string"},{"ticker":"string","reason":"string"},{"ticker":"string","reason":"string"},{"ticker":"string","reason":"string"}],"risks":[{"risk":"string","detail":"string"},{"risk":"string","detail":"string"},{"risk":"string","detail":"string"}],"watchFor":"string"}`,
      `Investor thesis: ${thesis.slice(0, 500)}

Portfolio: EQIX, IREN, CORZ, GOOGL, AMZN, PLTR, PANW, AMD, ARM, HOOD, JPM, CAT, VRT, CEG, ETN, ABNB. Watchlist: CRWV, SNOW, SYM, FPI, SOFI, CRWD, APLD. Rotating out of SOXX, QQQ, MSFT, MU. Holds BTC + ETH crypto.

Fill in the JSON structure with:
- overview: 2 sentences on current market positioning
- convictionPicks: exactly 5 from the core portfolio above
- calls: exactly 4 sector stances (mix of Overweight/Neutral/Underweight)
- watchlist: exactly 6 from the watchlist above
- risks: exactly 3 portfolio-specific risks
- watchFor: 1-2 sentences on what to monitor this week

Return ONLY the JSON object.`,
      false // no web search
    );
  }

  return extractJSON(result);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const cached = await redis.get('dashboard_data');
    if (cached) return res.json(cached);
    return res.json(null);
  }

  if (req.method === 'POST') {
    const { password, thesis } = req.body;
    if (password !== 'Bull2026') return res.status(401).json({ error: 'Unauthorized' });

    const sections = ['Overview', 'Sectors', 'News', 'Catalysts', 'Macro', 'Strategy'];
    const data = {};

    await Promise.all(sections.map(async section => {
      try {
        data[section] = await fetchSection(section, thesis);
      } catch (e) {
        data[section] = { error: true };
      }
    }));

    const payload = { data, thesis, updatedAt: new Date().toISOString() };
    await redis.set('dashboard_data', payload);
    return res.json({ success: true, updatedAt: payload.updatedAt });
  }

  res.status(405).json({ error: 'Method not allowed' });
}