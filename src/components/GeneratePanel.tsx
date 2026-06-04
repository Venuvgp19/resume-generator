'use client';

import { useState, useRef } from 'react';
import {
  Wand2,
  Loader2,
  FileText,
  Mail,
  Award,
  AlertTriangle,
  Download,
  Eye,
  Lightbulb,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ResumeData } from '@/types/resume';

function buildPrompt(resumeData: ResumeData, jd: { title: string; company: string; description: string }, matchData?: any) {
  const matchSection = matchData ? `

PREVIOUS MATCH ANALYSIS (use this to improve the resume):
- Previous Match Score: ${matchData.score}/100
- Matched Skills: ${matchData.matchedSkills?.join(', ') || 'None'}
- Missing Skills: ${matchData.missingKeywords?.join(', ') || matchData.missingSkills?.join(', ') || 'None'}
- Analysis: ${matchData.analysis || 'No previous analysis'}

IMPORTANT: The missing keywords/skills above are what the job wants but the resume may not explicitly show. DO NOT hallucinate experience in these. Instead:
1. Check if the candidate has related experience that could be REPHRASED to include these terms naturally
2. If they have similar skills (e.g., "React" vs "Vue"), mention transferable skills in the summary
3. Only list skills in the skills section if the candidate actually has them or closely related ones
4. For missing keywords that cannot be honestly reflected, leave them out` : '';

  return `You are an expert resume writer and ATS optimization specialist.

SOURCE RESUME (this is the ONLY truth - never invent jobs, roles, skills, or certificates the candidate does not have):
${JSON.stringify(resumeData, null, 2)}

JOB DESCRIPTION:
Title: ${jd.title}
Company: ${jd.company}
${jd.description}
${matchSection}

CRITICAL RULES:
1. Respond in ENGLISH only — job titles, company names, and all proper nouns may be in their original language, but all resume content, summary, bullets, cover letter, email draft, analysis, and keywords MUST be in English.
2. Use keywords from the job description NATURALLY - do not stuff.
3. Keep every job, company, date, degree, and certificate 100% accurate to the source resume.
4. Rephrase bullets to mirror the JD language where the underlying experience supports it.
5. Quantify achievements where the source provides numbers.
6. Add a professional summary aligned to the role.
7. Ensure no hallucinated experience, tools, or certifications.
8. CRITICAL: If a skill/technology is in the job description but NOT in the candidate's resume, do NOT claim they have it. Instead, rephrase existing experience to highlight transferable skills.
9. Return ONLY a JSON object with this exact shape:
{
  "resume": {
    "personalInfo": { "fullName": "", "email": "", "phone": "", "location": "", "linkedin": "", "portfolio": "", "photo": "" },
    "summary": "",
    "experience": [{ "company": "", "role": "", "startDate": "", "endDate": "", "isCurrent": false, "bullets": [""] }],
    "education": [{ "institution": "", "degree": "", "field": "", "startDate": "", "endDate": "" }],
    "skills": [""],
    "certifications": [{ "name": "", "issuer": "", "date": "", "link": "" }],
    "projects": [{ "name": "", "description": "", "technologies": [""], "link": "" }]
  },
  "coverLetter": "",
  "emailDraft": "",
  "atsScore": 0,
  "missingKeywords": [""],
  "matchedKeywords": [""],
  "improvementPointers": [""] // List 3-5 specific suggestions for how the candidate could honestly improve their resume for this role (e.g., "Add quantifiable metrics to your X experience", "Mention Y technology if you have any exposure to it")
}
`;
}

async function callAI(config: any, prompt: string) {
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, prompt }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `API error: ${res.status}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.text;
  } catch (err: any) {
    if (err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please make sure the dev server is running on http://localhost:3000');
    }
    throw err;
  }
}

export default function GeneratePanel() {
  const { resumeData, jobDescription, apiConfig, setGeneratedResume, generatedResume, setActiveTab } = useApp();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const generate = async () => {
    if (!resumeData || !jobDescription) return;
    setGenerating(true);
    setError('');
    setLogs([]);
    try {
      // Load cached match results if available
      let matchData = null;
      try {
        const cachedMatchResults = localStorage.getItem('matchResults');
        if (cachedMatchResults) {
          const matchResults = JSON.parse(cachedMatchResults);
          // Find match result for current job (by description similarity or title/company)
          const jobKey = Object.keys(matchResults).find(key => {
            const result = matchResults[key];
            return result.jobSkills && jobDescription.title && jobDescription.company;
          });
          if (jobKey) {
            matchData = matchResults[jobKey];
            addLog(`Loaded previous match score: ${matchData.score}/100`);
          }
        }
      } catch {
        // Ignore localStorage errors
      }

      addLog('Building prompt...');
      const prompt = buildPrompt(resumeData, jobDescription, matchData);
      addLog('Sending to AI...');
      const raw = await callAI(apiConfig, prompt);
      addLog('Parsing response...');
      const parsed = JSON.parse(raw);

      // Preserve photo from original resumeData (AI doesn't return base64)
      if (resumeData?.personalInfo?.photo && parsed?.resume?.personalInfo) {
        parsed.resume.personalInfo.photo = resumeData.personalInfo.photo;
      }

      setGeneratedResume(parsed);
      addLog('Done!');
    } catch (err: any) {
      setError(err.message || 'Failed to generate resume');
      addLog(`Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const exportPDF = async () => {
    if (!resumeRef.current) return;

    // Use html2pdf.js for text-based, ATS-friendly PDF export
    const html2pdf = (await import('html2pdf.js')).default;

    const opt: any = {
      margin: [12, 12, 12, 12], // top, left, bottom, right in mm
      filename: `${generatedResume?.resume.personalInfo.fullName || 'resume'}.pdf`,
      image: { type: 'jpeg', quality: 0.92 },
      html2canvas: { scale: 1, useCORS: true, backgroundColor: '#ffffff', logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    await html2pdf().set(opt).from(resumeRef.current).save();
  };

  const exportDOCX = async () => {
    const docx = await import('docx');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = docx;
    const r = generatedResume!.resume;
    const children: any[] = [];

    // Header with name
    children.push(
      new Paragraph({
        text: r.personalInfo.fullName,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      })
    );

    // Contact line
    const contactParts = [
      r.personalInfo.email,
      r.personalInfo.phone,
      r.personalInfo.location,
      r.personalInfo.linkedin,
      r.personalInfo.portfolio,
    ].filter(Boolean);

    children.push(
      new Paragraph({
        children: contactParts.map((part, i) => [
          new TextRun({ text: part, size: 20 }),
          i < contactParts.length - 1 ? new TextRun({ text: '  |  ', size: 20, color: '666666' }) : null,
        ]).flat().filter(Boolean) as any,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // Helper for section headers
    const sectionHeader = (text: string) =>
      new Paragraph({
        text: text.toUpperCase(),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: '1e293b',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      });

    // Summary
    children.push(sectionHeader('Professional Summary'));
    children.push(
      new Paragraph({
        text: r.summary,
        spacing: { after: 160 },
      })
    );

    // Experience
    children.push(sectionHeader('Experience'));
    r.experience.forEach((exp) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.role, bold: true, size: 22 }),
            new TextRun({ text: `  |  ${exp.startDate} – ${exp.endDate || 'Present'}`, size: 20, color: '666666' }),
          ],
          spacing: { before: 160, after: 40 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: exp.company, italics: true })],
          spacing: { after: 80 },
        })
      );
      exp.bullets.forEach((b) =>
        children.push(
          new Paragraph({
            text: `• ${b}`,
            spacing: { after: 60 },
            indent: { left: 360 },
          })
        )
      );
      children.push(new Paragraph({ text: '', spacing: { after: 80 } }));
    });

    // Education
    children.push(sectionHeader('Education'));
    r.education.forEach((ed) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${ed.degree}${ed.field ? ` in ${ed.field}` : ''}`,
              bold: true,
            }),
            new TextRun({
              text: `  |  ${ed.institution}`,
              color: '666666',
            }),
          ],
          spacing: { after: 40 },
        })
      );
      if (ed.startDate || ed.endDate) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${ed.startDate || ''}${ed.endDate ? ` – ${ed.endDate}` : ''}`,
                color: '666666',
              }),
            ],
            spacing: { after: 120 },
          })
        );
      }
    });

    // Skills
    children.push(sectionHeader('Skills'));
    children.push(
      new Paragraph({
        text: r.skills.join(' • '),
        spacing: { after: 160 },
      })
    );

    // Certifications
    if (r.certifications.length > 0) {
      children.push(sectionHeader('Certifications'));
      r.certifications.forEach((cert) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: cert.name, bold: true }),
              new TextRun({
                text: `  |  ${cert.issuer}${cert.date ? ` · ${cert.date}` : ''}`,
                color: '666666',
              }),
            ],
            spacing: { after: 80 },
          })
        );
      });
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch = 1440 twips
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${r.personalInfo.fullName || 'resume'}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!resumeData || !jobDescription) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="text-gray-600">Please complete the resume upload and job description steps first.</p>
        <button
          onClick={() => setActiveTab('upload')}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go to Upload
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Wand2 className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Generate & Export</h2>
        </div>
        <p className="text-gray-500">
          We'll tailor your resume to the job, write a cover letter, draft an email, and score ATS fit.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={generate}
          disabled={generating}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow flex items-center gap-2"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {generating ? 'Generating...' : 'Generate'}
        </button>

        {generatedResume && (
          <>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            <button
              onClick={exportPDF}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={exportDOCX}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              DOCX
            </button>
          </>
        )}
      </div>

      {logs.length > 0 && (
        <div className="bg-gray-900 text-green-400 text-xs font-mono rounded-xl p-4 space-y-1 max-h-40 overflow-y-auto">
          {logs.map((l, i) => (
            <div key={i}>{'>'} {l}</div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {generatedResume && (
        <div className="space-y-6">
          {/* ATS Score */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Award className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">ATS Score</h3>
              <span className="ml-auto text-2xl font-bold text-green-600">{generatedResume.atsScore}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${generatedResume.atsScore}%` }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700 mb-1">Matched Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {generatedResume.matchedKeywords.map((k) => (
                    <span key={k} className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">Missing Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {generatedResume.missingKeywords.map((k) => (
                    <span key={k} className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                  <h4 className="font-semibold text-gray-900">Improvement Pointers</h4>
                </div>
                <ul className="space-y-2">
                  {generatedResume.improvementPointers?.map((pointer, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-amber-500 font-bold mt-0.5">{idx + 1}.</span>
                      {pointer}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500 mt-2 italic">
                  Based on previous match analysis. Only add skills/experience you actually have — never fabricate.
                </p>
              </div>
            </div>
          </div>

          {/* Resume Preview - Modern ATS-Friendly Template */}
          {showPreview && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              <div className="ats-resume p-[12mm] max-w-[210mm] mx-auto" ref={resumeRef} style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
                {/* Header */}
                <header className="border-b-2 border-slate-800 pb-6 mb-6">
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
                    {generatedResume.resume.personalInfo.fullName}
                  </h1>
                  <p className="text-lg text-slate-600 font-medium mb-3">
                    {jobDescription?.title || 'IT Professional'}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    {generatedResume.resume.personalInfo.email && (
                      <span>{generatedResume.resume.personalInfo.email}</span>
                    )}
                    {generatedResume.resume.personalInfo.phone && (
                      <span>{generatedResume.resume.personalInfo.phone}</span>
                    )}
                    {generatedResume.resume.personalInfo.location && (
                      <span>{generatedResume.resume.personalInfo.location}</span>
                    )}
                    {generatedResume.resume.personalInfo.linkedin && (
                      <span>{generatedResume.resume.personalInfo.linkedin}</span>
                    )}
                    {generatedResume.resume.personalInfo.portfolio && (
                      <span>{generatedResume.resume.personalInfo.portfolio}</span>
                    )}
                  </div>
                </header>

                {/* Summary */}
                <section className="mb-6">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 mb-3">
                    Professional Summary
                  </h2>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {generatedResume.resume.summary}
                  </p>
                </section>

                {/* Experience */}
                <section className="mb-6">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 mb-4">
                    Experience
                  </h2>
                  <div className="space-y-5">
                    {generatedResume.resume.experience.map((exp, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="text-base font-bold text-slate-900">{exp.role}</h3>
                          <span className="text-sm text-slate-500">
                            {exp.startDate} – {exp.endDate || 'Present'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-700 mb-2">{exp.company}</p>
                        <ul className="space-y-1.5">
                          {exp.bullets.map((b, i) => (
                            <li key={i} className="text-sm text-slate-700 leading-relaxed pl-4 relative">
                              <span className="absolute left-0 text-slate-400">•</span>
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Education */}
                <section className="mb-6">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 mb-4">
                    Education
                  </h2>
                  <div className="space-y-3">
                    {generatedResume.resume.education.map((ed, idx) => (
                      <div key={idx} className="flex justify-between items-baseline">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {ed.degree}{ed.field ? ` in ${ed.field}` : ''}
                          </p>
                          <p className="text-sm text-slate-600">{ed.institution}</p>
                        </div>
                        <span className="text-sm text-slate-500">
                          {ed.startDate}{ed.endDate ? ` – ${ed.endDate}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Skills */}
                <section className="mb-6">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 mb-3">
                    Skills
                  </h2>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {generatedResume.resume.skills.join(' • ')}
                  </p>
                </section>

                {/* Certifications */}
                {generatedResume.resume.certifications.length > 0 && (
                  <section className="mb-6">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 mb-3">
                      Certifications
                    </h2>
                    <div className="space-y-2">
                      {generatedResume.resume.certifications.map((cert, idx) => (
                        <div key={idx} className="flex justify-between items-baseline">
                          <p className="text-sm font-semibold text-slate-800">{cert.name}</p>
                          <span className="text-sm text-slate-500">
                            {cert.issuer}{cert.date ? ` · ${cert.date}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Projects */}
                {generatedResume.resume.projects && generatedResume.resume.projects.length > 0 && (
                  <section className="mb-6">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 mb-4">
                      Projects
                    </h2>
                    <div className="space-y-4">
                      {generatedResume.resume.projects.map((proj, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between items-baseline mb-1">
                            <h3 className="text-sm font-bold text-slate-900">{proj.name}</h3>
                            {proj.link && (
                              <a href={proj.link} className="text-sm text-slate-600 hover:text-slate-900">{proj.link}</a>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed mb-1">{proj.description}</p>
                          <p className="text-sm text-slate-500">
                            {proj.technologies.join(' • ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          )}

          {/* Cover Letter */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Cover Letter</h3>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(generatedResume.coverLetter)}
                className="text-sm text-blue-600 hover:underline"
              >
                Copy
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl">{generatedResume.coverLetter}</pre>
          </div>

          {/* Email Draft */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Email Draft</h3>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(generatedResume.emailDraft)}
                className="text-sm text-blue-600 hover:underline"
              >
                Copy
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl">{generatedResume.emailDraft}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
