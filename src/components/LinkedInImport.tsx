'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Upload, Check, AlertCircle, FileJson, Download, ExternalLink } from 'lucide-react';

interface LinkedInProfile {
  Profile?: {
    FirstName?: string;
    LastName?: string;
    Headline?: string;
    Summary?: string;
    Industry?: string;
    Location?: string;
    EmailAddress?: string;
    PhoneNumbers?: { Number?: string }[];
    Websites?: { Url?: string }[];
  };
  Positions?: {
    Position?: Array<{
      Title?: string;
      Company?: { Name?: string };
      Description?: string;
      StartDate?: { Year?: { $?: string }; Month?: { $?: string } };
      EndDate?: { Year?: { $?: string }; Month?: { $?: string } };
      IsCurrent?: boolean;
    }>;
  };
  Educations?: {
    Education?: Array<{
      SchoolName?: string;
      DegreeName?: string;
      FieldOfStudy?: string;
      StartDate?: { Year?: { $?: string }; Month?: { $?: string } };
      EndDate?: { Year?: { $?: string }; Month?: { $?: string } };
    }>;
  };
  Skills?: {
    Skill?: Array<{ Name?: string }>;
  };
  Certifications?: {
    Certification?: Array<{
      Name?: string;
      Authority?: string;
      StartDate?: { Year?: { $?: string }; Month?: { $?: string } };
    }>;
  };
  Projects?: {
    Project?: Array<{
      Title?: string;
      Description?: string;
      Url?: string;
    }>;
  };
}

export default function LinkedInImport() {
  const { setResumeData, setActiveTab } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [parsedInfo, setParsedInfo] = useState<string>('');

  const parseDate = (dateObj?: { Year?: { $?: string }; Month?: { $?: string } }) => {
    if (!dateObj) return '';
    const year = dateObj.Year?.$ || '';
    const month = dateObj.Month?.$ || '';
    if (year && month) return `${year}-${month.padStart(2, '0')}`;
    return year;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setSuccess(false);
    setParsedInfo('');

    try {
      const text = await file.text();
      let data: LinkedInProfile;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON file. Please upload a valid LinkedIn export file.');
      }

      const profile = data.Profile || {};
      const positions = data.Positions?.Position || [];
      const educations = data.Educations?.Education || [];
      const skills = data.Skills?.Skill || [];
      const certifications = data.Certifications?.Certification || [];
      const projects = data.Projects?.Project || [];

      // Map to ResumeData format
      const resumeData = {
        personalInfo: {
          fullName: `${profile.FirstName || ''} ${profile.LastName || ''}`.trim(),
          email: profile.EmailAddress || '',
          phone: profile.PhoneNumbers?.[0]?.Number || '',
          location: profile.Location || '',
          linkedin: '',
          portfolio: profile.Websites?.[0]?.Url || '',
          photo: '',
        },
        summary: profile.Summary || profile.Headline || '',
        experience: positions.map((pos) => ({
          company: pos.Company?.Name || '',
          role: pos.Title || '',
          startDate: parseDate(pos.StartDate),
          endDate: parseDate(pos.EndDate),
          isCurrent: pos.IsCurrent || false,
          bullets: pos.Description ? pos.Description.split(/\n|•/).filter((b) => b.trim()) : [],
        })),
        education: educations.map((ed) => ({
          institution: ed.SchoolName || '',
          degree: ed.DegreeName || '',
          field: ed.FieldOfStudy || '',
          startDate: parseDate(ed.StartDate),
          endDate: parseDate(ed.EndDate),
        })),
        skills: skills.map((s) => s.Name || '').filter(Boolean),
        certifications: certifications.map((cert) => ({
          name: cert.Name || '',
          issuer: cert.Authority || '',
          date: parseDate(cert.StartDate),
          link: '',
        })),
        projects: projects.map((proj) => ({
          name: proj.Title || '',
          description: proj.Description || '',
          technologies: [],
          link: proj.Url || '',
        })),
      };

      setResumeData(resumeData);
      setSuccess(true);
      setParsedInfo(
        `✓ ${resumeData.experience.length} experience entries\n` +
        `✓ ${resumeData.education.length} education entries\n` +
        `✓ ${resumeData.skills.length} skills\n` +
        `✓ ${resumeData.certifications.length} certifications`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to parse LinkedIn data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <ExternalLink className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">LinkedIn Import</h2>
        </div>
        <p className="text-gray-500">
          Import your LinkedIn profile data directly — no copy-paste needed.
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-blue-900 flex items-center gap-2">
          <Download className="w-5 h-5" />
          How to export your LinkedIn data:
        </h3>
        <ol className="space-y-2 text-sm text-blue-800 list-decimal list-inside">
          <li>Go to LinkedIn → <strong>Settings & Privacy</strong></li>
          <li>Click <strong>Data privacy</strong> → <strong>Get a copy of your data</strong></li>
          <li>Select <strong>"Want something in particular?"</strong> → Check <strong>Profile</strong></li>
          <li>Click <strong>Request archive</strong></li>
          <li>Download the ZIP file and extract it</li>
          <li>Upload the <strong>Profile.json</strong> file below</li>
        </ol>
      </div>

      {/* File Upload */}
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition">
        <input
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="hidden"
          id="linkedin-file"
        />
        <label
          htmlFor="linkedin-file"
          className="cursor-pointer flex flex-col items-center gap-3"
        >
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
            <FileJson className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Click to upload Profile.json</p>
            <p className="text-sm text-gray-500 mt-1">From your LinkedIn data export</p>
          </div>
        </label>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-600 mt-2">Parsing LinkedIn data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-700">
            <Check className="w-5 h-5" />
            <span className="font-semibold">LinkedIn profile imported successfully!</span>
          </div>
          <pre className="text-sm text-green-800 whitespace-pre-wrap">{parsedInfo}</pre>
          <button
            onClick={() => setActiveTab('job')}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            Continue to Job Description →
          </button>
        </div>
      )}

      {/* Alternative manual paste */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Or{" "}
          <button
            onClick={() => setActiveTab('upload')}
            className="text-blue-600 hover:underline font-medium"
          >
            paste your resume manually →
          </button>
        </p>
      </div>
    </div>
  );
}
