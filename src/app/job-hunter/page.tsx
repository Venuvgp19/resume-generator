'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Briefcase, Clock, Filter, Loader2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ScrapingProgress {
  id: string;
  status: string;
  message: string;
  progress: number;
  jobsFound: number;
  currentJob: number;
  totalJobs: number;
  error?: string;
  jobs: any[];
}

export default function JobHunterPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    keywords: '',
    location: '',
    experience: 'all',
    remote: false,
    datePosted: 'any',
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [scrapeId, setScrapeId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ScrapingProgress | null>(null);
  const [showProgressWindow, setShowProgressWindow] = useState(false);

  // Poll for progress when scraping
  useEffect(() => {
    if (!scrapeId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/scrape-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkStatus: true, scrapeId }),
        });
        
        if (!res.ok) {
          clearInterval(pollInterval);
          setLoading(false);
          setError('Failed to get scraping status');
          return;
        }

        const data = await res.json();
        setProgress(data);

        if (data.status === 'done') {
          clearInterval(pollInterval);
          setLoading(false);
          setResults(data.jobs || []);
          setScrapeId(null);
        } else if (data.status === 'error') {
          clearInterval(pollInterval);
          setLoading(false);
          setError(data.error || 'Scraping failed');
          setScrapeId(null);
        }
      } catch (err: any) {
        clearInterval(pollInterval);
        setLoading(false);
        setError(err.message);
        setScrapeId(null);
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [scrapeId]);

  const handleSearch = async () => {
    if (!filters.keywords.trim()) {
      setError('Enter a job title or keywords');
      return;
    }
    setLoading(true);
    setError('');
    setResults([]);
    setProgress(null);
    setShowProgressWindow(true);

    try {
      const res = await fetch('/api/scrape-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start scraping');
      }

      if (data.scrapeId) {
        setScrapeId(data.scrapeId);
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message);
      setShowProgressWindow(false);
    }
  };

  const openJobsViewer = () => router.push('/jobs');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'starting': return 'bg-blue-500';
      default: return 'bg-blue-400 animate-pulse';
    }
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
              <p className="text-xs text-gray-500">Job Hunter</p>
            </div>
          </div>
          <button
            onClick={openJobsViewer}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
          >
            <Briefcase className="w-4 h-4" />
            View Saved Jobs
          </button>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Job Hunter</h2>
          <p className="text-gray-500">Search LinkedIn jobs with filters, then generate tailored resumes for each.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Search className="w-4 h-4" />
                Job Title / Keywords
              </label>
              <input
                type="text"
                value={filters.keywords}
                onChange={(e) => setFilters({ ...filters, keywords: e.target.value })}
                placeholder="e.g. Frontend Engineer, React Developer"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4" />
                Location
              </label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                placeholder="e.g. Remote, New York, India"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Briefcase className="w-4 h-4" />
                Experience Level
              </label>
              <select
                value={filters.experience}
                onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Levels</option>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Clock className="w-4 h-4" />
                Date Posted
              </label>
              <select
                value={filters.datePosted}
                onChange={(e) => setFilters({ ...filters, datePosted: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="any">Any Time</option>
                <option value="day">Past 24 Hours</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.remote}
                  onChange={(e) => setFilters({ ...filters, remote: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Remote Only</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Scraping LinkedIn...' : 'Scrape Jobs'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Progress Window */}
        {showProgressWindow && (
          <div className="mt-8 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${progress ? getStatusColor(progress.status) : 'bg-gray-300'}`} />
                <h3 className="font-bold text-gray-900">Scraping Progress</h3>
              </div>
              <div className="flex items-center gap-2">
                {progress?.status === 'done' && (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">Done!</span>
                  </>
                )}
                {progress?.status === 'error' && (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-red-600 font-medium">Failed</span>
                  </>
                )}
                <button
                  onClick={() => setShowProgressWindow(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  Hide
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">{progress?.message || 'Initializing...'}</span>
                  <span className="text-gray-900 font-bold">{progress?.progress || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress?.progress || 0}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{progress?.jobsFound || 0}</div>
                  <div className="text-xs text-gray-500">Jobs Found</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">{progress?.currentJob || 0}/{progress?.totalJobs || 0}</div>
                  <div className="text-xs text-gray-500">Jobs Detailed</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600 capitalize">{progress?.status || 'idle'}</div>
                  <div className="text-xs text-gray-500">Status</div>
                </div>
              </div>

              {/* Current Job Detail */}
              {progress?.currentJob != null && progress.currentJob > 0 && progress.status !== 'done' && progress.status !== 'error' && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <div className="text-xs text-blue-600 font-medium mb-1">Currently Processing:</div>
                  <div className="text-sm text-gray-700">{progress.message}</div>
                </div>
              )}

              {/* Error */}
              {progress?.error && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
                  {progress.error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <div className="mt-10 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Scraped Jobs ({results.length})</h3>
              <button
                onClick={openJobsViewer}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                View All Saved <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3 text-left">Job Title</th>
                    <th className="px-6 py-3 text-left">Company</th>
                    <th className="px-6 py-3 text-left">Location</th>
                    <th className="px-6 py-3 text-left">Posted</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((job, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{job.title}</td>
                      <td className="px-6 py-4 text-gray-600">{job.company}</td>
                      <td className="px-6 py-4 text-gray-600">{job.location}</td>
                      <td className="px-6 py-4 text-gray-600">{job.postedDate}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/generate?jobId=${job.id}`)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                        >
                          Generate Resume
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
