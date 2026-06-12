import { Redis } from '@upstash/redis';

export const maxDuration = 300;

const redis = Redis.fromEnv();

const WATCHLIST_SECTORS = [
  "Healthcare", "Financial Services", "Digital Infrastructure",
  "Machinery & Construction", "Energy", "Semiconductors", "Big Tech", "Cybersecurity"
];

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
      `You are a financial market analyst. Search for today's market data and return ONLY a raw JSON object with no markdown, no code fences, no explanation. Format exactly: {"indices":[{"name":"S&P 500","value":"5,123","change":0.45},{"name":"Nasdaq","value":"16,234","change":-0.12},{"name":"Dow","value":"38,900","change":0.21},{"name":"VIX","value":"18.2","change":-2.1}],"movers":[{"ticker":"NVDA","sector":"Semiconductors","change":3.2,"note":"brief reason"},{"ticker":"JPM","sector":"Financial Services","change":-1.1,"note":"brief reason"},{"ticker":"XOM","sector":"Energy","change":1.8,"note":"brief reason"},{"ticker":"PANW","sector":"Cybersecurity","change":2.4,"note":"brief reason"},{"ticker":"UNH","sector":"Healthcare","change":-0.9,"note":"brief reason"}],"summary":"2 sentence summary"}`,
      `Search for today's S&P 500, Nasdaq, Dow Jones, VIX levels and % changes. Also find top movers in: ${WATCHLIST_SECTORS.join(', ')}. Return ONLY the JSON object.`
    );
  } else if (section === 'Sectors') {
    result = await callClaude(
      `You are a financial analyst. Return ONLY a raw JSON array, no markdown, no code fences. Each item: {"ticker":"XLV","name":"Healthcare","change":0.45,"ytd":3.2,"note":"one-line driver"}`,
      `Get today's % change and YTD return for: ${SECTOR_ETFS}. Return ONLY the JSON array.`
    );
  } else if (section === 'News') {
    result = await callClaude(
      `You are a financial news analyst. Return ONLY a raw JSON array of 6 items, no markdown. Each: {"headline":"headline","sector":"sector","impact":"US market impact in one sentence","sentiment":"positive|negative|neutral","date":"today or X days ago"}`,
      `Find top financial news this week for: ${WATCHLIST_SECTORS.join(', ')}. Frame global news as US market impact. Return ONLY the JSON array.`
    );
  } else if (section === 'Catalysts') {
    result = await callClaude(
      `You are a market analyst. Return ONLY a raw JSON array, no markdown. Each: {"event":"name","date":"date","category":"Fed|CPI|IPO|Earnings|Geopolitical|Election|Other","detail":"why it matters","impact":"high|medium|low"}`,
      `List next 8 market-moving events: Fed meetings, CPI, IPOs, M&As, key earnings, elections, geopolitical. Return ONLY the JSON array ordered by date.`
    );
  } else if (section === 'Macro') {
    result = await callClaude(
      `You are a macro analyst. Return ONLY a raw JSON object, no markdown. Format: {"rates":[{"label":"Fed Funds Rate","value":"5.25-5.50%","change":null},{"label":"2Y Treasury","value":"4.8%","change":-0.02},{"label":"10Y Treasury","value":"4.4%","change":0.01}],"fx":[{"label":"DXY","value":"104.2","change":0.15},{"label":"BRL/USD","value":"4.97","change":-0.3},{"label":"CNY/USD","value":"7.24","change":0.05},{"label":"EUR/USD","value":"1.082","change":-0.08}],"equities":[{"label":"Ibovespa","value":"128,450","change":0.6},{"label":"CSI 300","value":"3,580","change":-0.8},{"label":"Euro Stoxx 50","value":"4,920","change":0.3},{"label":"Tadawul","value":"11,200","change":0.2}],"commodities":[{"label":"Brent Crude","value":"$82","change":-0.5}],"commentary":"2 sentence macro outlook"}`,
      `Get current Fed Funds Rate, 2Y/10Y Treasury yields, DXY, BRL/USD, CNY/USD, EUR/USD, Ibovespa, CSI 300, Euro Stoxx 50, Tadawul, Brent crude. Return ONLY the JSON object.`
    );
  } else if (section === 'Strategy') {
    result = await callClaude(
      `You are an investment strategist. Return ONLY a raw JSON object, no markdown. Format: {"overview":"2 sentence overview","calls":[{"sector":"name","stance":"Overweight|Underweight|Neutral","rationale":"1-2 sentences","conviction":"High|Medium|Low"}],"risks":[{"risk":"name","detail":"1 sentence"},{"risk":"name","detail":"1 sentence"},{"risk":"name","detail":"1 sentence"}],"watchFor":"1-2 sentences"}`,
      `Given this thesis: "${thesis}" and today's market conditions, give sector calls for: ${WATCHLIST_SECTORS.join(', ')}. Return ONLY the JSON object.`
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

    const payload = {
      data,
      thesis,
      updatedAt: new Date().toISOString()
    };

    await redis.set('dashboard_data', payload);
    return res.json({ success: true, updatedAt: payload.updatedAt });
  }

  res.status(405).json({ error: 'Method not allowed' });
}