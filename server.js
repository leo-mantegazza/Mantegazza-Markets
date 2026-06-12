import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

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
    if (textBlocks.length > 0) {
      console.log('Got text response after', i + 1, 'turn(s)');
      return data;
    }

    if (data.stop_reason === 'end_turn' || !data.content?.length) return data;

    // Continue conversation with tool results
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

app.post('/api/claude', async (req, res) => {
  try {
    const data = await callAnthropicWithSearch(req.body);
    console.log('Final stop_reason:', data?.stop_reason, '| type:', data?.type);
    console.log('Text blocks:', data?.content?.filter(b => b.type === 'text').length || 0);
    console.log('Text preview:', data?.content?.find(b => b.type === 'text')?.text?.slice(0, 200));
    res.json(data);
  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () => console.log('Proxy running on port 3001'));