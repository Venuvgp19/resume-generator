'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function ResumeUploader() {
  const { setResumeData, setActiveTab } = useApp();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'paste'>('file');
  const [error, setError] = useState('');
  const [parsing, setParsing] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      setError('');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const parseResume = async () => {
    setError('');
    setParsing(true);
    try {
      let content = '';

      if (pastedText) {
        content = pastedText;
      } else if (file) {
        console.log('[Upload] Sending file:', file.name, 'size:', file.size, 'type:', file.type);
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/parse-resume', {
          method: 'POST',
          body: formData,
        });
        console.log('[Upload] Response status:', res.status);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.error('[Upload] Parse error:', data);
          throw new Error(data.error || `Failed to parse resume file (status ${res.status}).`);
        }
        content = data.text;
      }

      if (!content.trim()) {
        throw new Error('Please provide a resume file or paste resume text.');
      }

      // Store raw resume text for later use
      localStorage.setItem('rawResumeText', content);

      // Enhanced heuristic extraction with section detection
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
      const email = lines.find(l => /\S+@\S+\.\S+/.test(l)) || '';
      const phone = lines.find(l => /[\+\d\s\-\(\)]{10,}/.test(l)) || '';
      const name = lines[0] || 'Candidate Name';

      // Section extraction using keyword detection
      const extractSection = (startKeywords: string[], endKeywords: string[]) => {
        let startIdx = -1;
        let endIdx = lines.length;
        
        for (let i = 0; i < lines.length; i++) {
          if (startIdx === -1 && startKeywords.some(kw => lines[i].toLowerCase().includes(kw.toLowerCase()))) {
            startIdx = i + 1;
          }
          if (startIdx !== -1 && endKeywords.some(kw => lines[i].toLowerCase().includes(kw.toLowerCase()))) {
            endIdx = i;
            break;
          }
        }
        
        return startIdx !== -1 ? lines.slice(startIdx, endIdx) : [];
      };

      // Extract experience (Experience → Education/Skills/Summary/Projects)
      const experienceLines = extractSection(
        ['experience', 'work experience', 'professional experience', 'employment'],
        ['education', 'skills', 'summary', 'professional summary', 'projects', 'certifications']
      );
      
      const experience = experienceLines.length > 0 ? experienceLines.map(line => ({
        company: line.match(/^[A-Z][^\d]+/)?.[0]?.trim() || '',
        role: line.match(/(?:engineer|analyst|developer|manager|consultant|administrator|specialist|lead)/i)?.[0] || '',
        startDate: line.match(/(?:\d{1,2}\/)?\d{4}/)?.[0] || '',
        endDate: '',
        isCurrent: line.toLowerCase().includes('present') || line.toLowerCase().includes('current'),
        bullets: [line],
      })) : [];

      // Extract education (Education → Skills/Experience/Summary/Projects)
      const educationLines = extractSection(
        ['education', 'academic', 'qualifications', 'degree'],
        ['experience', 'work experience', 'skills', 'summary', 'professional summary', 'projects', 'certifications']
      );
      
      const education = educationLines.length > 0 ? educationLines.map(line => ({
        institution: line.match(/^[A-Z][^\d]+/)?.[0]?.trim() || '',
        degree: line.match(/(?:B\.|M\.|PhD|Bachelor|Master|MBA|MCA|B\.Tech|M\.Tech|B\.E|M\.E|Diploma)/i)?.[0] || '',
        field: line.match(/(?:Computer|Information|Software|Electrical|Mechanical|Science|Technology|Engineering)/i)?.[0] || '',
        startDate: '',
        endDate: '',
      })) : [];

      // Extract skills from explicit Skills section or from content
      const skillsSection = extractSection(
        ['skills', 'technical skills', 'core competencies'],
        ['experience', 'education', 'summary', 'professional summary', 'projects', 'certifications']
      );
      
      let skills: string[] = [];
      if (skillsSection.length > 0) {
        const skillsText = skillsSection.join(' ');
        skills = skillsText
          .split(/[·,;|]/)
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }
      
      // Fallback: extract skills from entire content if no dedicated section
      if (skills.length === 0) {
        const commonSkills = ['Python', 'Linux', 'Solaris', 'Azure', 'Docker', 'Kubernetes', 'AWS', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Bash', 'Shell', 'PowerShell', 'Git', 'CI/CD', 'DevOps', 'System Administration', 'Network Administration', 'IT Infrastructure', 'Cloud Computing'];
        skills = commonSkills.filter(skill => content.toLowerCase().includes(skill.toLowerCase()));
      }

      // Extract certifications
      const certLines = extractSection(
        ['certifications', 'certificates', 'accreditations'],
        ['experience', 'education', 'skills', 'summary', 'professional summary', 'projects']
      );
      
      const certifications = certLines.length > 0 ? certLines.map(line => ({
        name: line,
        issuer: '',
        date: '',
        link: '',
      })) : [];

      setResumeData({
        personalInfo: {
          fullName: name,
          email,
          phone,
          location: '',
        },
        summary: lines.slice(1, 5).join(' '),
        experience,
        education,
        skills,
        certifications,
        projects: [],
      });

      setActiveTab('job');
    } catch (err: any) {
      setError(err.message || 'Failed to parse resume. Try pasting the text instead.');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Upload Your Resume</h2>
        <p className="text-gray-500">
          Upload an existing resume (PDF, DOCX, TXT) or paste the text. We'll use this as the source of truth — no hallucinations.
        </p>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => setUploadMode('file')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            uploadMode === 'file'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Upload File
        </button>
        <button
          onClick={() => setUploadMode('paste')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            uploadMode === 'paste'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Paste Text
        </button>
      </div>

      {uploadMode === 'file' ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition cursor-pointer ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
        >
          <input
            id="resume-upload"
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
          <label htmlFor="resume-upload" className="cursor-pointer block">
            <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="font-medium text-gray-700">
              {file ? file.name : 'Drag & drop or click to upload'}
            </p>
            <p className="text-sm text-gray-400 mt-1">PDF, DOCX, TXT up to 10MB</p>
          </label>
          {file && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              {file.name}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setFile(null);
                }}
                className="ml-2 text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <textarea
          value={pastedText}
          onChange={(e) => {
            setPastedText(e.target.value);
            setError('');
          }}
          placeholder="Paste your full resume text here..."
          className="w-full h-64 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={() => setActiveTab('linkedin')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          Or import from LinkedIn instead →
        </button>
      </div>

      <button
        onClick={parseResume}
        disabled={parsing || (!file && !pastedText.trim())}
        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow"
      >
        {parsing ? 'Parsing...' : 'Continue'}
      </button>
    </div>
  );
}
