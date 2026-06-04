'use client';

import { useState } from 'react';
import { Briefcase, AlertCircle, CheckCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function JobDescriptionInput() {
  const { setJobDescription, setActiveTab } = useApp();
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!title.trim() || !description.trim()) {
      setError('Job title and description are required.');
      return;
    }
    setJobDescription({ title, company, description });
    setError('');
    setActiveTab('settings');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Briefcase className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Job Description</h2>
        </div>
        <p className="text-gray-500">
          Paste the job posting. We'll tailor your resume to match it for ATS and AI screening.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setError('');
              }}
              placeholder="e.g. Acme Corp"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Description *</label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError('');
            }}
            placeholder="Paste the full job description here..."
            className="w-full h-72 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab('upload')}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow"
        >
          Continue to AI Settings
        </button>
      </div>
    </div>
  );
}
