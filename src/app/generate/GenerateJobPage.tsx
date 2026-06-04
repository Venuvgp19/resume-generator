'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Wand2, Loader2, FileText, Mail, Award, AlertTriangle, Download, Eye, TrendingUp, BarChart3 } from 'lucide-react';
import { ResumeData } from '@/types/resume';

function buildPrompt(resumeData: ResumeData, jd: { title: string; company: string; description: string }, originalRawText: string) {
  return `You are an expert resume writer and ATS optimization specialist.

Your task: Rewrite the candidate's resume to match the job description below. Return ONLY a valid JSON object with no markdown, no explanations, and no text outside the JSON.

The JSON must have exactly this structure:
{
  "resume": {
    "personalInfo": {
      "fullName": "string",
      "email": "string",
      "phone": "string",
      "location": "string",
      "linkedin": "string",
      "portfolio": "string",
      "photo": "string or empty"
    },
    "summary": "string - 2-3 sentences professional summary tailored to the job",
    "experience": [
      {
        "company": "string",
        "role": "string",
        "startDate": "string",
        "endDate": "string or empty",
        "isCurrent": boolean,
        "bullets": ["string - achievement bullet 1", "string - achievement bullet 2"]
      }
    ],
    "education": [
      {
        "institution": "string",
        "degree": "string",
        "field": "string",
        "startDate": "string",
        "endDate": "string or empty"
      }
    ],
    "skills": ["string - skill 1", "string - skill 2"],
    "certifications": [
      {
        "name": "string",
        "issuer": "string",
        "date": "string",
        "link": "string or empty"
      }
    ],
    "projects": [
      {
        "name": "string",
        "description": "string",
        "technologies": ["string"],
        "link": "string or empty"
      }
    ]
  },
  "originalAtsScore": number from 0-100,
  "optimizedAtsScore": number from 0-100,
  "scoreImprovement": number (difference between optimized and original),
  "coverLetter": "string - full cover letter text",
  "emailDraft": "string - full email draft",
  "atsScore": number from 0-100,
  "matchedKeywords": ["string - keyword 1", "string - keyword 2"],
  "missingKeywords": ["string - keyword 1", "string - keyword 2"]
}

CRITICAL RULES:
1. Use ONLY facts from the source resume below. NEVER invent jobs, companies, dates, degrees, skills, or certifications the candidate does not have.
2. The experience array MUST contain every job from the source resume with accurate company names, dates, and roles.
3. Rewrite bullet points to use keywords from the job description NATURALLY.
4. The skills array MUST include all skills from the source resume plus relevant keywords from the job description that the candidate actually knows.
5. Education must exactly match the source resume.
6. If a field has no data, use an empty array [] or empty string "".
7. Calculate "originalAtsScore" by analyzing how well the ORIGINAL resume matches the job description (before any optimization).
8. Calculate "optimizedAtsScore" by analyzing how well the NEW optimized resume matches the job description.
9. "scoreImprovement" = optimizedAtsScore - originalAtsScore.
10. "atsScore" should equal "optimizedAtsScore" for consistency.
11. matchedKeywords are JD keywords found in the optimized resume.
12. missingKeywords are JD keywords NOT found in the optimized resume.
13. Format the resume for maximum ATS compatibility: use standard section headers, avoid tables/columns, use simple bullet points.

SOURCE RESUME (ONLY TRUTH — NEVER HALLUCINATE):
${JSON.stringify(resumeData, null, 2)}

ORIGINAL RESUME RAW TEXT (for accurate original ATS score calculation):
${originalRawText}

JOB DESCRIPTION:
Title: ${jd.title}
Company: ${jd.company}
Description: ${jd.description}

RETURN ONLY THE JSON OBJECT. NO MARKDOWN. NO EXPLANATIONS.`;
}

async function callAI(config: any, prompt: string) {
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
    url = '/api/generate-ollama';
    headers = { 'Content-Type': 'application/json' };
    body = { model: config.model, prompt, temperature: config.temperature ?? 0.7, format: 'json' };
  } else {
    url = url || 'https://openrouter.ai/api/v1/chat/completions';
    headers = { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' };
    body = { model: config.model, messages: [{ role: 'user', content: prompt }], temperature: config.temperature ?? 0.7 };
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  const data = await res.json();

  let text = '';
  if (data.choices?.[0]?.message?.content) text = data.choices[0].message.content;
  else if (data.content?.[0]?.text) text = data.content[0].text;
  else if (data.candidates?.[0]?.content?.parts?.[0]?.text) text = data.candidates[0].content.parts[0].text;
  else if (data.response) text = data.response;
  else if (data.message?.content) text = data.message.content; // Ollama chat format
  else text = JSON.stringify(data);

  // Ollama with format: 'json' returns parsed response in message.content as stringified JSON
  if (typeof text === 'string') {
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  }
  return text;
}

export default function GenerateJobPage() {
  const searchParams = useSearchParams();
  const source = searchParams.get('source');
  const { resumeData: contextResumeData, apiConfig } = useApp();
  const [resumeData, setResumeDataState] = useState<ResumeData | null>(contextResumeData);
  const [job, setJob] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const resumeRef = useRef<HTMLDivElement>(null);

  // Load resumeData from localStorage if context is empty
  useEffect(() => {
    if (!contextResumeData) {
      const savedResume = localStorage.getItem('resumeData');
      if (savedResume) {
        try {
          const parsed = JSON.parse(savedResume);
          setResumeDataState(parsed);
          console.log('[Generate] Loaded resumeData from localStorage fallback');
        } catch (e) {
          console.error('[Generate] Failed to parse resumeData from localStorage');
        }
      }
    } else {
      setResumeDataState(contextResumeData);
    }
  }, [contextResumeData]);

  useEffect(() => {
    // Check Ollama connectivity via our API proxy
    fetch('/api/generate-ollama', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'ping', model: 'kimi-k2.6:cloud' }),
    })
      .then((res) => {
        if (res.ok) setOllamaStatus('ok');
        else setOllamaStatus('error');
      })
      .catch(() => setOllamaStatus('error'));
  }, []);

  useEffect(() => {
    // Load job from localStorage on mount — handles both direct nav and redirect from jobs page
    const saved = localStorage.getItem('activeJob');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setJob(parsed);
        console.log('[Generate] Loaded job from localStorage:', parsed.title, '@', parsed.company);
      } catch (e) {
        console.error('[Generate] Failed to parse activeJob from localStorage');
      }
    } else {
      console.log('[Generate] No activeJob found in localStorage');
    }
  }, []);

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const apiReady = apiConfig.provider === 'ollama';

  const generate = async () => {
    if (!resumeData) {
      setError('No resume data found. Please go back and upload your resume first.');
      return;
    }
    if (!job) {
      setError('No job selected. Please go to Saved Jobs and select a job.');
      return;
    }
    if (!job.description?.trim()) {
      setError('Job description is empty. The scraped job may not have a description.');
      return;
    }
    if (!apiReady) {
      setError('Ollama not configured. Make sure Ollama is running at http://localhost:11434 with model kimi-k2.6:cloud.');
      return;
    }
    setGenerating(true);
    setError('');
    setLogs([]);
    try {
      addLog('Building prompt...');
      const prompt = buildPrompt(resumeData, job, '');
      addLog('Sending to AI...');
      const raw = await callAI(apiConfig, prompt);
      addLog('Parsing response...');
      
      // Try to parse the response
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (parseErr) {
        console.error('Failed to parse AI response as JSON:', raw.substring(0, 500));
        throw new Error('AI returned invalid JSON. The model may not support structured output.');
      }

      // Validate required fields
      if (!parsed.resume || !parsed.coverLetter || !parsed.emailDraft) {
        console.error('Missing fields in AI response:', parsed);
        throw new Error('AI response missing required fields (resume, coverLetter, or emailDraft)');
      }

      // Ensure ATS fields have defaults
      if (typeof parsed.atsScore !== 'number') parsed.atsScore = 0;
      if (!Array.isArray(parsed.matchedKeywords)) parsed.matchedKeywords = [];
      if (!Array.isArray(parsed.missingKeywords)) parsed.missingKeywords = [];

      setResult(parsed);
      addLog('Done! Saving files...');
      await saveFiles(parsed, job);
      addLog('Files saved successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to generate resume');
      addLog(`Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const saveFiles = async (data: any, jobInfo: any) => {
    const folderName = `${jobInfo.company}_${jobInfo.title}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const res = await fetch('/api/save-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName, data }),
    });
    if (!res.ok) throw new Error('Failed to save files');
  };

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    if (!resumeRef.current) return;
    
    // Clone to avoid modifying live DOM
    const clone = resumeRef.current.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.top = '-9999px';
    clone.style.left = '0';
    document.body.appendChild(clone);
    
    // Fix modern CSS colors (lab, oklch, etc.) that html2canvas can't parse
    const allElements = clone.querySelectorAll('*');
    allElements.forEach((el) => {
      const style = (el as HTMLElement).style;
      const computed = window.getComputedStyle(el);
      if (computed.color?.includes('lab') || computed.color?.includes('oklch')) {
        style.color = '#000000';
      }
      if (computed.backgroundColor?.includes('lab') || computed.backgroundColor?.includes('oklch')) {
        style.backgroundColor = '#ffffff';
      }
      if (computed.borderColor?.includes('lab') || computed.borderColor?.includes('oklch')) {
        style.borderColor = '#e5e7eb';
      }
    });
    
    try {
      const canvas = await html2canvas(clone, { scale: 2, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${result?.resume?.personalInfo?.fullName || 'resume'}.pdf`);
    } finally {
      document.body.removeChild(clone);
    }
  };

  const exportDOCX = async () => {
    const docx = await import('docx');
    const { Document, Packer, Paragraph, HeadingLevel, AlignmentType } = docx;
    const r = result!.resume;
    const children: any[] = [];

    children.push(new Paragraph({ text: r.personalInfo.fullName, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }));
    children.push(new Paragraph({ text: `${r.personalInfo.email} | ${r.personalInfo.phone} | ${r.personalInfo.location}`, alignment: AlignmentType.CENTER }));
    children.push(new Paragraph({ text: '' }));
    children.push(new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ text: r.summary }));
    children.push(new Paragraph({ text: '' }));

    children.push(new Paragraph({ text: 'Experience', heading: HeadingLevel.HEADING_2 }));
    r.experience.forEach((exp: any) => {
      children.push(new Paragraph({ text: `${exp.role} — ${exp.company}` }));
      children.push(new Paragraph({ text: `${exp.startDate} – ${exp.endDate || 'Present'}` }));
      exp.bullets.forEach((b: string) => children.push(new Paragraph({ text: `• ${b}` })));
      children.push(new Paragraph({ text: '' }));
    });

    children.push(new Paragraph({ text: 'Education', heading: HeadingLevel.HEADING_2 }));
    r.education.forEach((ed: any) => {
      children.push(new Paragraph({ text: `${ed.degree} in ${ed.field} — ${ed.institution}` }));
      children.push(new Paragraph({ text: `${ed.startDate} – ${ed.endDate || 'Present'}` }));
      children.push(new Paragraph({ text: '' }));
    });

    children.push(new Paragraph({ text: 'Skills', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ text: r.skills.join(', ') }));

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${r.personalInfo.fullName || 'resume'}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 gap-4">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p>No job selected.</p>
        <div className="flex gap-3">
          <a href="/jobs" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go to Saved Jobs</a>
          <a href="/" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Upload Resume</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow">R</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ResumeForge</h1>
              <p className="text-xs text-gray-500">Generate for: {job.title}</p>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
              <p className="text-gray-600">{job.company} · {job.location}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={generate}
                disabled={generating || ollamaStatus !== 'ok'}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow flex items-center gap-2"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate Resume'}
              </button>
              {ollamaStatus === 'checking' && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking Ollama...
                </span>
              )}
              {ollamaStatus === 'error' && (
                <span className="text-xs text-red-600">
                  ⚠️ Ollama not reachable at localhost:11434. Run `ollama serve` first.
                </span>
              )}
              {ollamaStatus === 'ok' && (
                <span className="text-xs text-green-600">✓ Ollama connected</span>
              )}
            </div>
          </div>
        </div>

        {logs.length > 0 && (
          <div className="bg-gray-900 text-green-400 text-xs font-mono rounded-xl p-4 space-y-1 max-h-40 overflow-y-auto">
            {logs.map((l, i) => (
              <div key={i}>{'>'} {l}</div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-sm">{error}</div>
        )}

        {result && (
          <>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">ATS Score</h3>
                <span className="ml-auto text-2xl font-bold text-green-600">{result.atsScore}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${result.atsScore}%` }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700 mb-1">Matched Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {result.matchedKeywords.map((k: string) => (
                      <span key={k} className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs">{k}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-700 mb-1">Missing Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map((k: string) => (
                      <span key={k} className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs">{k}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowPreview(!showPreview)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Eye className="w-4 h-4" /> {showPreview ? 'Hide' : 'Show'} Preview
              </button>
              <button onClick={exportPDF} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <FileText className="w-4 h-4" /> PDF
              </button>
              <button onClick={exportDOCX} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Download className="w-4 h-4" /> DOCX
              </button>
            </div>

            {showPreview && (
              <div ref={resumeRef} className="bg-white border rounded-2xl p-8 shadow-sm space-y-5">
                <div className="text-center space-y-1">
                  {result.resume.personalInfo.photo && (
                    <img src={result.resume.personalInfo.photo} alt="Photo" className="w-24 h-24 rounded-full object-cover mx-auto mb-3 border-4 border-gray-100" />
                  )}
                  <h2 className="text-3xl font-bold text-gray-900">{result.resume.personalInfo.fullName}</h2>
                  <p className="text-gray-600">{result.resume.personalInfo.location} · {result.resume.personalInfo.email} · {result.resume.personalInfo.phone}</p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 border-b pb-1 mb-2">Professional Summary</h3>
                  <p className="text-gray-700 leading-relaxed">{result.resume.summary}</p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 border-b pb-1 mb-2">Experience</h3>
                  <div className="space-y-4">
                    {result.resume.experience.map((exp: any, idx: number) => (
                      <div key={idx}>
                        <div className="flex justify-between items-baseline">
                          <span className="font-semibold text-gray-900">{exp.role}</span>
                          <span className="text-sm text-gray-500">{exp.startDate} – {exp.endDate || 'Present'}</span>
                        </div>
                        <p className="text-gray-600 text-sm">{exp.company}</p>
                        <ul className="list-disc list-inside text-gray-700 text-sm mt-1 space-y-1">
                          {exp.bullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 border-b pb-1 mb-2">Education</h3>
                  <div className="space-y-2">
                    {result.resume.education.map((ed: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{ed.degree} in {ed.field}</p>
                          <p className="text-sm text-gray-600">{ed.institution}</p>
                        </div>
                        <span className="text-sm text-gray-500">{ed.startDate} – {ed.endDate || 'Present'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 border-b pb-1 mb-2">Skills</h3>
                  <p className="text-gray-700 text-sm">{result.resume.skills.join(' · ')}</p>
                </div>
              </div>
            )}

            <div className="bg-white border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Cover Letter</h3>
                </div>
                <button onClick={() => navigator.clipboard.writeText(result.coverLetter)} className="text-sm text-blue-600 hover:underline">Copy</button>
              </div>
              <pre className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl">{result.coverLetter}</pre>
            </div>

            <div className="bg-white border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Email Draft</h3>
                </div>
                <button onClick={() => navigator.clipboard.writeText(result.emailDraft)} className="text-sm text-blue-600 hover:underline">Copy</button>
              </div>
              <pre className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl">{result.emailDraft}</pre>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
