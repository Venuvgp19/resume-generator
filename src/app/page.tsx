'use client';

import { useApp } from '@/context/AppContext';
import ResumeUploader from '@/components/ResumeUploader';
import JobDescriptionInput from '@/components/JobDescriptionInput';
import AISettings from '@/components/AISettings';
import GeneratePanel from '@/components/GeneratePanel';
import PhotoUploader from '@/components/PhotoUploader';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { activeTab, setActiveTab } = useApp();
  const router = useRouter();

  const tabs = [
    { id: 'upload', label: '1. Upload Resume' },
    { id: 'job', label: '2. Job Description' },
    { id: 'photo', label: '3. Photo' },
    { id: 'settings', label: '4. AI Settings' },
    { id: 'generate', label: '5. Generate' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow">
              R
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ResumeForge</h1>
              <p className="text-xs text-gray-500">ATS-Optimized Resume Generator</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/job-hunter')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
            >
              🔍 Job Hunter
            </button>
            <button
              onClick={() => router.push('/jobs')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
            >
              📋 Saved Jobs
            </button>
          </div>
        </div>

        {/* Progress Tabs */}
        <div className="max-w-6xl mx-auto px-4 pb-3">
          <div className="flex overflow-x-auto gap-2 pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'upload' && <ResumeUploader />}
        {activeTab === 'job' && <JobDescriptionInput />}
        {activeTab === 'photo' && <PhotoUploader />}
        {activeTab === 'settings' && <AISettings />}
        {activeTab === 'generate' && <GeneratePanel />}
      </section>
    </main>
  );
}
