import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('[API] Received request to /api/generate');
    const { config, prompt } = await req.json();
    console.log('[API] Config provider:', config?.provider, 'model:', config?.model);
    
    if (!config || !prompt) {
      console.log('[API] Missing config or prompt');
      return NextResponse.json({ error: 'Missing config or prompt' }, { status: 400 });
    }
    
    if (!config.apiKey && config.provider !== 'ollama') {
      console.log('[API] Missing API key');
      return NextResponse.json({ error: 'API key is required. Please add it in AI Settings.' }, { status: 400 });
    }
    
    let url = config.baseUrl || '';
    let headers: Record<string, string> = {};
    let body: any = {};
    
    if (config.provider === 'openai') {
      url = url || 'https://api.openai.com/v1/chat/completions';
      headers = { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' };
      body = { model: config.model, messages: [{ role: 'user', content: prompt }], temperature: config.temperature ?? 0.7 };
    } else if (config.provider === 'anthropic') {
      url = url || 'https://api.anthropic.com/v1/messages';
      headers = { 'x-api-key': config.apiKey, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' };
      body = { model: config.model, max_tokens: 4096, messages: [{ role: 'user', content: prompt }], temperature: config.temperature ?? 0.7 };
    } else if (config.provider === 'google') {
      url = url || `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
      headers = { 'Content-Type': 'application/json' };
      body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: config.temperature ?? 0.7 } };
    } else if (config.provider === 'ollama') {
      // Ensure baseUrl ends with /api/generate
      url = url ? (url.endsWith('/api/generate') ? url : `${url.replace(/\/$/, '')}/api/generate`) : 'http://localhost:11434/api/generate';
      headers = { 'Content-Type': 'application/json' };
      
      // Auto-detect available models if the specified one might not exist
      let modelName = config.model;
      try {
        const baseUrl = url.replace('/api/generate', '');
        const tagsRes = await fetch(`${baseUrl}/api/tags`, { method: 'GET' });
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          if (tagsData.models && tagsData.models.length > 0) {
            const modelNames = tagsData.models.map((m: any) => m.name);
            // If requested model not available, fallback to first available
            if (!modelNames.includes(config.model)) {
              modelName = modelNames[0];
              console.log('[API] Model', config.model, 'not found, falling back to', modelName);
            }
          }
        }
      } catch {
        // ignore, use original model name
      }
      
      body = { model: modelName, prompt, stream: false, options: { temperature: config.temperature ?? 0.7 } };
    } else {
      url = url || 'https://openrouter.ai/api/v1/chat/completions';
      headers = { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' };
      body = { model: config.model, messages: [{ role: 'user', content: prompt }], temperature: config.temperature ?? 0.7 };
    }
    
    console.log('[API] Calling provider:', config.provider, 'URL:', url);
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const text = await res.text();
      console.log('[API] Provider error:', res.status, text);
      throw new Error(`API error: ${res.status} ${res.statusText} - ${text}`);
    }
    
    const data = await res.json();
    console.log('[API] Success, parsing response');
    
    let text = '';
    if (data.choices?.[0]?.message?.content) text = data.choices[0].message.content;
    else if (data.content?.[0]?.text) text = data.content[0].text;
    else if (data.candidates?.[0]?.content?.parts?.[0]?.text) text = data.candidates[0].content.parts[0].text;
    else if (data.response) text = data.response;
    else text = JSON.stringify(data);
    
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
    
    return NextResponse.json({ text });
  } catch (err: any) {
    console.log('[API] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to generate' }, { status: 500 });
  }
}
