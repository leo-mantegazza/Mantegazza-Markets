async function callAnthropicWithSearch(body) {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': process.env.VITE_ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'web-search-2025-03-05'
  };

  let messages = [...body.messages];

  for (let i = 0; i < 5; i++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...body, messages })
    });
    const data = await response.json();

    if (data.type === 'error') return data;

    const textBlocks = data.content?.filter(b => b.type === 'text') || [];
    if (textBlocks.length > 0) return data;

    if (data.stop_reason === 'end_turn' || !data.content?.length) return data;

    messages = [
      ...messages,
      { role: 'assistant', content: data.content },
      {
        role: 'user',
        content: data.content
          .filter(b => b.type === 'server_tool_use')
          .map(b => ({
            type: 'server_tool_result',
            tool_use_id: b.id,
            content: 'Search completed.'
          }))
      }
    ];

    if (messages[messages.length - 1].content.length === 0) return data;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const data = await callAnthropicWithSearch(req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}