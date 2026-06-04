'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, MapPin, Clock, Wand2, Trash2, ExternalLink, FileText, Upload, CheckCircle, Target, Loader2 } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  postedDate: string;
  link: string;
  description: string;
}

interface MatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  jobSkills: string[];
  analysis: string;
  loading: boolean;
  queued: boolean;
  error?: string;
}

interface MatchQueue {
  jobId: string;
  job: Job;
  status: 'queued' | 'running' | 'done' | 'error';
}

export default function JobsViewerPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasResume, setHasResume] = useState(false);
  const [resumeName, setResumeName] = useState('');
  const [resumeData, setResumeData] = useState<any>(null);
  const [matchResults, setMatchResults] = useState<Record<string, MatchResult>>(() => {
    // Load cached match results from localStorage
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('matchResults');
        return cached ? JSON.parse(cached) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  useEffect(() => {
    fetchJobs();
    // Check if resume exists in localStorage
    const savedResume = localStorage.getItem('resumeData');
    if (savedResume) {
      setHasResume(true);
      try {
        const parsed = JSON.parse(savedResume);
        setResumeName(parsed.personalInfo?.fullName || 'Uploaded Resume');
        setResumeData(parsed);
      } catch {
        setResumeName('Uploaded Resume');
        setResumeData(null);
      }
    }
  }, []);

  // AI-powered match analysis for a single job
  const analyzeJobMatch = useCallback(async (job: Job) => {
    if (!resumeData || !job.description) return;

    // Set loading state for this job
    setMatchResults(prev => ({
      ...prev,
      [job.id]: { ...prev[job.id], loading: true }
    }));

    try {
      const res = await fetch('/api/match-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData,
          jobDescription: {
            title: job.title,
            company: job.company,
            description: job.description,
          }
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to analyze match');
      }

      const result: MatchResult = {
        score: data.score,
        matchedSkills: data.matchedSkills || [],
        missingSkills: data.missingSkills || [],
        jobSkills: data.jobSkills || [],
        analysis: data.analysis || '',
        loading: false,
        queued: false,
      };

      setMatchResults(prev => {
        const updated = { ...prev, [job.id]: result };
        // Save to localStorage
        try {
          localStorage.setItem('matchResults', JSON.stringify(updated));
        } catch {
          // Storage full or disabled
        }
        return updated;
      });
    } catch (err: any) {
      console.error(`[Match] Error analyzing job ${job.id}:`, err.message);
      setMatchResults(prev => ({
        ...prev,
        [job.id]: {
          score: 0,
          matchedSkills: [],
          missingSkills: [],
          jobSkills: [],
          analysis: '',
          loading: false,
          queued: false,
          error: err.message,
        }
      }));
    }
  }, [resumeData]);

  // Manual analysis only — no auto-fire to avoid 429 rate limits

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteJob = async (id: string) => {
    await fetch('/api/jobs', { method: 'DELETE', body: JSON.stringify({ id }) });
    setJobs(jobs.filter((j) => j.id !== id));
    // Also clear cached match result for this job
    setMatchResults(prev => {
      const updated = { ...prev };
      delete updated[id];
      try {
        localStorage.setItem('matchResults', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);

  const analyzeAllJobs = async () => {
    if (!resumeData || jobs.length === 0) return;
    setIsAnalyzingAll(true);
    try {
      for (const job of jobs) {
        if (!matchResults[job.id] || matchResults[job.id]?.error) {
          await analyzeJobMatch(job);
          // Wait a bit between requests to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } finally {
      setIsAnalyzingAll(false);
    }
  };

  const clearAllMatchCache = () => {
    setMatchResults({});
    localStorage.removeItem('matchResults');
  };

  const clearAllJobs = async () => {
    if (!confirm('Are you sure you want to delete ALL saved jobs?')) return;
    try {
      const res = await fetch('/api/jobs', { method: 'DELETE', body: JSON.stringify({ all: true }) });
      if (res.ok) {
        setJobs([]);
        setMatchResults({});
        localStorage.removeItem('matchResults');
      }
    } catch (err) {
      console.error('Failed to clear jobs:', err);
    }
  };

  // Get score color based on percentage
  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 40) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const getScoreBarColor = (score: number): string => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const generateResume = (job: Job) => {
    // Save job as active job description and go to generate
    localStorage.setItem(
      'activeJob',
      JSON.stringify({
        title: job.title,
        company: job.company,
        description: job.description,
      })
    );
    router.push('/generate?source=jobs');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow">
              R
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ResumeForge</h1>
              <p className="text-xs text-gray-500">Saved Jobs</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasResume ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">{resumeName}</span>
              </div>
            ) : (
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm hover:bg-amber-100 transition"
              >
                <Upload className="w-4 h-4" />
                Upload Resume
              </button>
            )}
            <button
              onClick={analyzeAllJobs}
              disabled={isAnalyzingAll || !hasResume}
              className={`px-4 py-2 rounded-lg transition text-sm flex items-center gap-2 ${
                isAnalyzingAll
                  ? 'bg-gray-100 text-gray-500 cursor-wait'
                  : hasResume
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title="Analyze all jobs sequentially"
            >
              {isAnalyzingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Target className="w-4 h-4" />
              )}
              {isAnalyzingAll ? 'Analyzing...' : 'Analyze All'}
            </button>
            <button
              onClick={clearAllMatchCache}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
              title="Clear all cached match scores"
            >
              🗑️ Clear Scores
            </button>
            <button
              onClick={clearAllJobs}
              className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium"
              title="Delete all saved jobs"
            >
              🗑️ Clear All Jobs
            </button>
            <button
              onClick={() => router.push('/job-hunter')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              + New Search
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Saved Jobs</h2>
          <p className="text-gray-500">
            All scraped LinkedIn jobs. Match Score compares your resume skills with job requirements.
          </p>
        </div>

        {!hasResume && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-amber-600" />
              <p className="text-amber-800 text-sm">
                No resume found. Upload your resume first to see Match Scores and generate tailored
                resumes for jobs.
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition"
            >
              Upload Resume
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No saved jobs yet.</p>
            <button
              onClick={() => router.push('/job-hunter')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Go to Job Hunter
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3 text-left">Job</th>
                    <th className="px-6 py-3 text-left">Company / Location</th>
                    <th className="px-6 py-3 text-left">Description Preview</th>
                    <th className="px-6 py-3 text-center">Match Score</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.map((job) => {
                    const matchResult = matchResults[job.id];
                    const score = matchResult?.score ?? 0;
                    const matchedSkills = matchResult?.matchedSkills ?? [];
                    const totalJobSkills = matchResult?.jobSkills?.length ?? 0;
                    const isAnalyzing = matchResult?.loading ?? false;
                    const scoreColor = getScoreColor(score);
                    const barColor = getScoreBarColor(score);

                    return (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{job.title}</div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {job.postedDate || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-700">{job.company}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" /> {job.location || 'N/A'}
                          </div>
                          {job.link && (
                            <a
                              href={job.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                            >
                              <ExternalLink className="w-3 h-3" /> View on LinkedIn
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-600 line-clamp-3 max-w-md">
                            {job.description?.substring(0, 250) || 'No description scraped'}
                            {job.description?.length > 250 && '...'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {hasResume ? (
                            isAnalyzing ? (
                              <div className="flex flex-col items-center gap-2">
                                <div className="relative w-16 h-16 flex items-center justify-center rounded-full border-2 border-gray-200 bg-gray-50">
                                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                </div>
                                <span className="text-xs text-gray-500">Analyzing...</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <div
                                  className={`relative w-16 h-16 flex items-center justify-center rounded-full border-2 ${scoreColor} transition-all hover:scale-105`}
                                >
                                  <div className="text-center z-10">
                                    <span className="text-lg font-bold block leading-tight">
                                      {score}%
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wider opacity-75">
                                      Match
                                    </span>
                                  </div>
                                  <svg
                                    className="absolute inset-0 w-full h-full -rotate-90"
                                    viewBox="0 0 36 36"
                                  >
                                    <path
                                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                      fill="none"
                                      stroke="#e5e7eb"
                                      strokeWidth="2"
                                    />
                                    <path
                                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeDasharray={`${score}, 100`}
                                      className={score > 0 ? barColor : 'text-gray-300'}
                                    />
                                  </svg>
                                </div>
                                {totalJobSkills > 0 && (
                                  <div className="text-xs text-gray-500 text-center">
                                    {matchedSkills.length}/{totalJobSkills} skills
                                    {matchedSkills.length > 0 && (
                                      <div
                                        className="mt-1 max-w-[140px] truncate"
                                        title={matchedSkills.join(', ')}
                                      >
                                        ✓ {matchedSkills.slice(0, 3).join(', ')}
                                        {matchedSkills.length > 3 &&
                                          ` +${matchedSkills.length - 3} more`}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center text-gray-400">
                              <Target className="w-6 h-6 mb-1 opacity-50" />
                              <span className="text-xs">No resume</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {hasResume && (
                              <button
                                onClick={() => analyzeJobMatch(job)}
                                disabled={isAnalyzing || matchResults[job.id]?.score !== undefined}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                                  matchResults[job.id]?.score !== undefined
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : isAnalyzing
                                    ? 'bg-gray-100 text-gray-400 cursor-wait'
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                                }`}
                                title={
                                  matchResults[job.id]?.score !== undefined
                                    ? `Score: ${matchResults[job.id].score}% — Click Re-analyze All to refresh`
                                    : 'AI analyze match'
                                }
                              >
                                {isAnalyzing ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : matchResults[job.id]?.score !== undefined ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : (
                                  <Target className="w-3 h-3" />
                                )}
                                {isAnalyzing
                                  ? 'Analyzing...'
                                  : matchResults[job.id]?.score !== undefined
                                  ? `Score ${matchResults[job.id].score}%`
                                  : 'Analyze'}
                              </button>
                            )}
                            <button
                              onClick={() => generateResume(job)}
                              disabled={!hasResume}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                                hasResume
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                              title={hasResume ? 'Generate tailored resume' : 'Upload a resume first'}
                            >
                              <Wand2 className="w-3 h-3" />
                              Generate
                            </button>
                            <button
                              onClick={() => deleteJob(job.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
