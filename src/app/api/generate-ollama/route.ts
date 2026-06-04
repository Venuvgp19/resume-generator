import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { prompt, model, temperature, format, system } = await req.json();

  try {
    // Use /api/chat for better instruction following with kimi models
    const body: any = {
      model: model || 'kimi-k2.6:cloud',
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
      stream: false,
      options: { temperature: temperature ?? 0.7 },
    };

    // Force JSON output if format is specified
    if (format === 'json') {
      body.format = {
        type: 'object',
        properties: {
          resume: {
            type: 'object',
            properties: {
              personalInfo: {
                type: 'object',
                properties: {
                  fullName: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  location: { type: 'string' },
                  linkedin: { type: 'string' },
                  portfolio: { type: 'string' },
                  photo: { type: 'string' },
                },
              },
              summary: { type: 'string' },
              experience: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    company: { type: 'string' },
                    role: { type: 'string' },
                    startDate: { type: 'string' },
                    endDate: { type: 'string' },
                    isCurrent: { type: 'boolean' },
                    bullets: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
              education: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    institution: { type: 'string' },
                    degree: { type: 'string' },
                    field: { type: 'string' },
                    startDate: { type: 'string' },
                    endDate: { type: 'string' },
                  },
                },
              },
              skills: { type: 'array', items: { type: 'string' } },
              certifications: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    issuer: { type: 'string' },
                    date: { type: 'string' },
                    link: { type: 'string' },
                  },
                },
              },
              projects: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    technologies: { type: 'array', items: { type: 'string' } },
                    link: { type: 'string' },
                  },
                },
              },
            },
          },
          coverLetter: { type: 'string' },
          emailDraft: { type: 'string' },
          atsScore: { type: 'integer' },
          matchedKeywords: { type: 'array', items: { type: 'string' } },
          missingKeywords: { type: 'array', items: { type: 'string' } },
        },
        required: ['resume', 'coverLetter', 'emailDraft', 'atsScore', 'matchedKeywords', 'missingKeywords'],
      };
    }

    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Ollama error: ${res.status} ${res.statusText} — ${text}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to reach Ollama' }, { status: 500 });
  }
}
