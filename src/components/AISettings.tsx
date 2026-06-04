'use client';

import { useState } from 'react';
import { Settings, Key, Server, Thermometer, Info } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ApiConfig } from '@/types/resume';

const PROVIDERS = [
  { id: 'openai' as const, label: 'OpenAI', defaultModel: 'gpt-4o' },
  { id: 'anthropic' as const, label: 'Anthropic', defaultModel: 'claude-3-5-sonnet-20241022' },
  { id: 'google' as const, label: 'Google (Gemini)', defaultModel: 'gemini-1.5-pro' },
  { id: 'ollama' as const, label: 'Ollama (Local)', defaultModel: 'llama3.1' },
  { id: 'custom' as const, label: 'Custom / OpenRouter', defaultModel: '' },
];

export default function AISettings() {
  const { apiConfig, setApiConfig, setActiveTab } = useApp();
  const [config, setConfig] = useState<ApiConfig>(apiConfig);

  const update = (patch: Partial<ApiConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    setApiConfig(next);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">AI Model Settings</h2>
        </div>
        <p className="text-gray-500">
          Choose the AI provider and model that will tailor your resume. Your API key stays in your browser.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => update({ provider: p.id, model: p.defaultModel })}
                className={`px-4 py-3 rounded-xl border text-sm font-medium transition ${
                  config.provider === p.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Key className="w-4 h-4" />
              API Key
            </label>
            <input
              type="password"
              value={config.apiKey || ''}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder="sk-... or your key"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Never leaves your browser. Stored only in memory.</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Server className="w-4 h-4" />
              Base URL (optional)
            </label>
            <input
              type="text"
              value={config.baseUrl || ''}
              onChange={(e) => update({ baseUrl: e.target.value })}
              placeholder={config.provider === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com/v1'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              type="text"
              value={config.model}
              onChange={(e) => update({ model: e.target.value })}
              placeholder="e.g. gpt-4o"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Thermometer className="w-4 h-4" />
              Temperature: {config.temperature ?? 0.7}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={config.temperature ?? 0.7}
              onChange={(e) => update({ temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-2 text-sm text-amber-800">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Lower temperature = more faithful to your actual experience. Higher = more varied wording.
            We recommend 0.5–0.7 for resumes.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab('job')}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
        >
          Back
        </button>
        <button
          onClick={() => setActiveTab('generate')}
          className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow"
        >
          Generate Resume
        </button>
      </div>
    </div>
  );
}
