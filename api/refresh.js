import { Redis } from '@upstash/redis';

export const maxDuration = 300;

const redis = Redis.fromEnv();

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
      `You are a financial market analyst. Search for today's market data and return ONLY a raw JSON object with no markdown, no code fences. Format: {"indices":[{"name":"S&P 500","value":"5,123","change":0.45},{"name":"Nasdaq","value":"16,234","change":-0.12},{"name":"Dow","value":"38,900","change":0.21},{"name":"VIX","value":"18.2","change":-2.1}],"movers":[{"ticker":"NVDA","sector":"Semiconductors","change":3.2,"note":"brief reason"},{"ticker":"AMZN","sector":"Big Tech","change":1.1,"note":"brief reason"},{"ticker":"EQIX","sector":"Data Centers","change":0.9,"note":"brief reason"},{"ticker":"CEG","sector":"Nuclear Energy","change":1.4,"note":"brief reason"},{"ticker":"HOOD","sector":"Fintech","change":2.1,"note":"brief reason"}],"summary":"2 sentence market summary covering the dominant theme of the day"}`,
      `Search for today's S&P 500, Nasdaq, Dow Jones, and VIX levels with % changes. Then find the top 5 most notable movers today across the entire US market — prioritize names relevant to AI infrastructure, data centers, energy, fintech, cybersecurity, construction, and cyclicals. Include both gainers and losers for balance. Return ONLY the JSON object.`
    );

  } else if (section === 'Sectors') {
    result = await callClaude(
      `You are a financial analyst. Return ONLY a raw JSON array, no markdown. Each item: {"ticker":"XLK","name":"Technology","change":0.45,"ytd":12.3,"note":"one-line driver explaining today's move"}`,
      `Get today's % change and YTD return for these broad sector ETFs: XLK (Technology), XLF (Financial Services), XLV (Healthcare), XLE (Energy), XLU (Utilities), XLI (Industrials), XLB (Materials), XLRE (Real Estate), XLC (Communication Services), XLP (Consumer Staples), XLY (Consumer Discretionary). Also add SOXX (Semiconductors), IGV (Software), CIBR (Cybersecurity), ITB (Homebuilders). For each, write a one-line note on what drove today's performance. Return ONLY the JSON array.`
    );

  } else if (section === 'News') {
    result = await callClaude(
      `You are a financial news analyst writing a professional market brief. Return ONLY a raw JSON array of 8 items, no markdown. Each: {"headline":"concise headline","sector":"sector name","type":"M&A|Earnings|Macro|Geopolitical|IPO|Regulatory|Other","impact":"why this matters for US markets in one sentence","sentiment":"positive|negative|neutral","date":"Mon Jun 16 or X days ago"}. Mix of confirmed news and emerging stories. Always include at least one contrarian or risk story.`,
      `Search for the most important financial and market news from the past 3 days. Cover a broad range: major M&A deals, earnings surprises, macro data (CPI, jobs, Fed), geopolitical developments (Middle East, China, trade), major IPOs or listings, AI and tech industry moves, energy markets, regulatory changes. Do not limit to any specific tickers. Surface stories that a serious market observer would need to know this week, including ones that challenge consensus views. Return ONLY the JSON array.`
    );

  } else if (section === 'Catalysts') {
    result = await callClaude(
      `You are a market analyst. Return ONLY a raw JSON array, no markdown. Each: {"event":"event name","date":"Jun 17 or Jul 3","category":"Fed|CPI|IPO|Earnings|Geopolitical|Election|M&A|Other","detail":"why this matters for markets in 1-2 sentences","impact":"high|medium|low"}. Order by date ascending.`,
      `List the next 12 most important upcoming market catalysts globally. Include: Fed meetings and speeches, CPI/PPI/jobs data releases, major earnings (especially mega-cap tech, banks, energy), significant IPOs, geopolitical events (Middle East ceasefire developments, US-China trade, elections), central bank meetings outside the US (ECB, BOJ, BOE), and any major regulatory or policy decisions expected. Be specific with dates. Return ONLY the JSON array.`
    );

  } else if (section === 'Macro') {
    result = await callClaude(
      `You are a senior macro strategist writing a weekly briefing. Return ONLY a raw JSON object, no markdown. Use this exact format:
{"rates":[{"label":"Fed Funds Rate","value":"4.25-4.50%","change":null},{"label":"2Y Treasury","value":"4.07%","change":-0.05},{"label":"10Y Treasury","value":"4.47%","change":0.02},{"label":"30Y Treasury","value":"4.90%","change":0.01}],"fx":[{"label":"DXY","value":"99.5","change":-0.3},{"label":"EUR/USD","value":"1.159","change":0.2},{"label":"BRL/USD","value":"5.04","change":-0.1},{"label":"CNY/USD","value":"6.76","change":0.0},{"label":"JPY/USD","value":"145.2","change":-0.4}],"equities":[{"label":"Ibovespa","value":"130,200","change":0.8},{"label":"CSI 300","value":"4,784","change":0.3},{"label":"Euro Stoxx 50","value":"6,154","change":0.5},{"label":"Nikkei 225","value":"38,500","change":-0.2},{"label":"Tadawul","value":"11,001","change":0.6}],"commodities":[{"label":"Brent Crude","value":"$81.55","change":-3.6},{"label":"Gold","value":"$3,240","change":0.4},{"label":"Natural Gas","value":"$2.85","change":-1.2},{"label":"Copper","value":"$4.52","change":0.9}],"commentary":"Write 3-4 rich sentences covering: the dominant macro theme this week, Fed/rate path outlook, key cross-asset implications, and what it means for cyclicals vs defensives. Be specific, data-driven, and insightful — not generic."}`,
      `Search for current market data: Fed Funds Rate, 2Y/10Y/30Y Treasury yields, DXY, EUR/USD, BRL/USD, CNY/USD, JPY/USD, Ibovespa, CSI 300, Euro Stoxx 50, Nikkei 225, Tadawul, Brent crude, Gold, Natural Gas, Copper. Also search for the dominant macro narrative this week — Fed stance, inflation data, geopolitical risk, rate expectations. Write a rich 3-4 sentence commentary that synthesizes what all this means for markets. Return ONLY the JSON object.`
    );

  } else if (section === 'Strategy') {
    result = await callClaude(
      `You are an investment strategist. Return ONLY valid JSON, no markdown, no explanation. Exact structure required:
{"overview":"string","convictionPicks":[{"ticker":"string","theme":"string","conviction":"High","rationale":"string"},{"ticker":"string","theme":"string","conviction":"High","rationale":"string"},{"ticker":"string","theme":"string","conviction":"Medium","rationale":"string"},{"ticker":"string","theme":"string","conviction":"Medium","rationale":"string"},{"ticker":"string","theme":"string","conviction":"Low","rationale":"string"}],"calls":[{"sector":"string","stance":"Overweight","rationale":"string","conviction":"High"},{"sector":"string","stance":"Overweight","rationale":"string","conviction":"High"},{"sector":"string","stance":"Neutral","rationale":"string","conviction":"Medium"},{"sector":"string","stance":"Underweight","rationale":"string","conviction":"Medium"}],"watchlist":[{"ticker":"string","reason":"string"},{"ticker":"string","reason":"string"},{"ticker":"string","reason":"string"},{"ticker":"string","reason":"string"},{"ticker":"string","reason":"string"},{"ticker":"string","reason":"string"}],"risks":[{"risk":"string","detail":"string"},{"risk":"string","detail":"string"},{"risk":"string","detail":"string"}],"watchFor":"string"}`,
      `Investor thesis summary: ${thesis.slice(0, 600)}

Core portfolio: EQIX, IREN, CORZ, GOOGL, AMZN, PLTR, PANW, AMD, ARM, HOOD, JPM, CAT, VRT, CEG, ETN, ABNB. Watchlist: CRWV, SNOW, SYM, FPI, SOFI, CRWD, APLD. Also holds BTC and ETH. Rotating out of SOXX, QQQ, MSFT, MU.

Search today's market conditions. Return a JSON strategy object with:
- overview: 2 sharp sentences on current positioning and market stance
- convictionPicks: exactly 5 picks from the core portfolio with theme, conviction (High/Medium/Low), and 1-sentence rationale tied to today's market
- calls: exactly 4 sector calls (mix of Overweight/Neutral/Underweight) for broad sectors relevant to the thesis
- watchlist: exactly 6 names from the watchlist with a short reason each
- risks: exactly 3 specific risks to this portfolio right now
- watchFor: 1-2 sentences on the single most important thing to watch this week

Return ONLY the JSON. No text before or after.`
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