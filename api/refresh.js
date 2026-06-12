import { Redis } from '@upstash/redis';

export const maxDuration = 300;

const redis = Redis.fromEnv();

const WATCHLIST_SECTORS = [
  "Healthcare", "Financial Services", "Digital Infrastructure",
  "Machinery & Construction", "Energy", "Semiconductors", "Big Tech", "Cybersecurity", "Fintech"
];

const WATCHLIST_TICKERS = "UNH, LLY, JPM, COF, AMZN, GOOGL, NVDA, AMD, MU, SOXX, EQIX, DLR, IREN, CORZ, APLD, VRT, ETN, CRWV, XLE, CAT, WCC, CIBR, PANW, CRWD, HOOD, SOFI, PLTR, SNOW, QQQ, VOO, XLV, XLF, IGV, XLI, XLK";

const SECTOR_ETFS = [
  "XLV (Healthcare)", "XLF (Financial Services)", "IGV (Digital Infrastructure)",
  "XLI (Machinery & Construction)", "XLE (Energy)", "SOXX (Semiconductors)",
  "XLK (Big Tech)", "CIBR (Cybersecurity)"
].join(", ");

async function callClaude(systemPrompt, userPrompt) {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': process.env.VITE_ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'web-search-2025-03-05'
  };
  let messages = [{ role: 'user', content: userPrompt }];
  for (let i = 0; i < 5; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers,
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2000, system: systemPrompt, tools: [{ type: 'web_search_20250305', name: 'web_search' }], messages })
    });
    const data = await res.json();
    if (data.type === 'error') throw new Error(data.error.message);
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('\n');
    if (text) return text;
    if (data.stop_reason === 'end_turn' || !data.content?.length) return '';
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
      `You are a financial market analyst. Search for today's market data and return ONLY a raw JSON object with no markdown, no code fences. Format: {"indices":[{"name":"S&P 500","value":"5,123","change":0.45},{"name":"Nasdaq","value":"16,234","change":-0.12},{"name":"Dow","value":"38,900","change":0.21},{"name":"VIX","value":"18.2","change":-2.1}],"movers":[{"ticker":"NVDA","sector":"Semiconductors","change":3.2,"note":"brief reason"},{"ticker":"AMZN","sector":"Big Tech","change":1.1,"note":"brief reason"},{"ticker":"EQIX","sector":"Digital Infrastructure","change":0.9,"note":"brief reason"},{"ticker":"UNH","sector":"Healthcare","change":-0.9,"note":"brief reason"},{"ticker":"HOOD","sector":"Fintech","change":2.1,"note":"brief reason"}],"summary":"2 sentence summary"}`,
      `Search for today's S&P 500, Nasdaq, Dow Jones, VIX levels and % changes. Find top movers among: ${WATCHLIST_TICKERS}. Prioritize movers relevant to AI infrastructure, data centers, healthcare, energy, fintech. Return ONLY the JSON object.`
    );
  } else if (section === 'Sectors') {
    result = await callClaude(
      `You are a financial analyst. Return ONLY a raw JSON array, no markdown. Each item: {"ticker":"XLV","name":"Healthcare","change":0.45,"ytd":3.2,"note":"one-line driver"}`,
      `Get today's % change and YTD return for: ${SECTOR_ETFS}. Return ONLY the JSON array.`
    );
  } else if (section === 'News') {
    result = await callClaude(
      `You are a financial news analyst. Return ONLY a raw JSON array of 8 items, no markdown. Each: {"headline":"headline","sector":"sector","type":"M&A|Earnings|Macro|Geopolitical|IPO|Other","impact":"US market impact in one sentence","sentiment":"positive|negative|neutral","date":"today or X days ago"}. Prioritize news about: AI infrastructure, data centers, energy, healthcare, fintech, cybersecurity, construction/utilities. Always include any significant M&A deals.`,
      `Find the most important financial news and M&A deals this week relevant to: ${WATCHLIST_TICKERS} and sectors: ${WATCHLIST_SECTORS.join(', ')}. Include global news framed as US market impact. Include any major M&A announcements. Return ONLY the JSON array.`
    );
  } else if (section === 'Catalysts') {
    result = await callClaude(
      `You are a market analyst. Return ONLY a raw JSON array, no markdown. Each: {"event":"name","date":"date like Jun 17 or Jul 14","category":"Fed|CPI|IPO|Earnings|Geopolitical|Election|M&A|Other","detail":"why it matters for markets","impact":"high|medium|low"}. Order by date ascending.`,
      `List the next 10 market-moving events including: Fed meetings, CPI releases, major IPOs (especially SpaceX/SPCX), key earnings for ${WATCHLIST_TICKERS}, M&A deals, elections, geopolitical developments around Iran. Return ONLY the JSON array.`
    );
  } else if (section === 'Macro') {
    result = await callClaude(
      `You are a macro analyst. Return ONLY a raw JSON object, no markdown. Format: {"rates":[{"label":"Fed Funds Rate","value":"5.25-5.50%","change":null},{"label":"2Y Treasury","value":"4.8%","change":-0.02},{"label":"10Y Treasury","value":"4.4%","change":0.01}],"fx":[{"label":"DXY","value":"104.2","change":0.15},{"label":"BRL/USD","value":"4.97","change":-0.3},{"label":"CNY/USD","value":"7.24","change":0.05},{"label":"EUR/USD","value":"1.082","change":-0.08}],"equities":[{"label":"Ibovespa","value":"128,450","change":0.6},{"label":"CSI 300","value":"3,580","change":-0.8},{"label":"Euro Stoxx 50","value":"4,920","change":0.3},{"label":"Tadawul","value":"11,200","change":0.2}],"commodities":[{"label":"Brent Crude","value":"$82","change":-0.5}],"commentary":"2 sentence macro outlook focused on rate path and cyclical rotation"}`,
      `Get current Fed Funds Rate, 2Y/10Y Treasury yields, DXY, BRL/USD, CNY/USD, EUR/USD, Ibovespa, CSI 300, Euro Stoxx 50, Tadawul, Brent crude. Return ONLY the JSON object.`
    );
  } else if (section === 'Strategy') {
    result = await callClaude(
      `You are an investment strategist. Return ONLY a raw JSON object, no markdown. Format: {"overview":"2 sentence overview","convictionPicks":[{"ticker":"AMZN","theme":"AI Full-Stack","conviction":"High","rationale":"first to show AI gains in earnings via cloud/logistics optimization"},{"ticker":"EQIX","theme":"Data Center REIT","conviction":"High","rationale":"airport of the internet, power moat, 60% of new deals AI-related"},{"ticker":"VRT","theme":"Power Infrastructure","conviction":"High","rationale":"cooling and power for AI data centers, wins regardless of which operator wins"},{"ticker":"HOOD","theme":"Fintech AI","conviction":"Medium","rationale":"agentic AI trading, SpaceX IPO access, PDT removal tailwinds"},{"ticker":"PLTR","theme":"Data Collection","conviction":"Medium","rationale":"enterprise AI data pipeline, government and commercial contracts growing"}],"calls":[{"sector":"name","stance":"Overweight|Underweight|Neutral","rationale":"1-2 sentences tied to thesis","conviction":"High|Medium|Low"}],"watchlist":[{"ticker":"APLD","reason":"high-beta data center operator, capital appreciation focus"},{"ticker":"CRWV","reason":"GPU cloud pure play, AI compute demand"},{"ticker":"SNOW","reason":"data infrastructure for AI pipelines"},{"ticker":"CEG","reason":"nuclear energy for data center power demand"},{"ticker":"ABNB","reason":"cyclical recovery play post-Iran war rate cut"},{"ticker":"FPI","reason":"farmland REIT benefiting from land scarcity vs data center conversion"}],"risks":[{"risk":"name","detail":"1 sentence"},{"risk":"name","detail":"1 sentence"},{"risk":"name","detail":"1 sentence"}],"watchFor":"1-2 sentences on key events this week"}`,
      `Given this investment thesis: "${thesis}" and today's market conditions, provide strategy. The investor is young, high-risk tolerance, focused on stock appreciation not dividends. They operate in two modes: (1) tactical short-term hype surf when momentum is obvious — currently in this mode near 100% invested; (2) mid/long-term quality names with liquidity reserve for opportunistic entries. Distinguish conviction picks between tactical (short-term momentum) and quality (mid/long-term). Focus on: AI infrastructure stack (AMZN, GOOGL first movers; EQIX, DLR stability; IREN, CORZ, APLD high-beta appreciation; VRT, ETN power bottleneck), post-Iran-war cyclical rotation, healthcare structural growth, energy supercycle, fintech AI (HOOD, SOFI). Flag when to consider rotating tactical gains into quality names. Return ONLY the JSON object.`
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