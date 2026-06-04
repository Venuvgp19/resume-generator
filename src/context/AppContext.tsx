'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ResumeData, GeneratedResume, ApiConfig, JobDescription } from '@/types/resume';

interface AppContextType {
  resumeData: ResumeData | null;
  setResumeData: (data: ResumeData | null) => void;
  jobDescription: JobDescription | null;
  setJobDescription: (jd: JobDescription | null) => void;
  generatedResume: GeneratedResume | null;
  setGeneratedResume: (resume: GeneratedResume | null) => void;
  apiConfig: ApiConfig;
  setApiConfig: (config: ApiConfig) => void;
  isGenerating: boolean;
  setIsGenerating: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const defaultApiConfig: ApiConfig = {
  provider: 'ollama',
  model: 'kimi-k2.6:cloud',
  baseUrl: 'http://localhost:11434',
  temperature: 0.7,
};

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or disabled
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [resumeData, _setResumeData] = useState<ResumeData | null>(() =>
    loadFromStorage<ResumeData | null>('resumeData', null)
  );
  const [jobDescription, _setJobDescription] = useState<JobDescription | null>(() =>
    loadFromStorage<JobDescription | null>('jobDescription', null)
  );
  const [generatedResume, setGeneratedResume] = useState<GeneratedResume | null>(null);
  const [apiConfig, _setApiConfig] = useState<ApiConfig>(() =>
    loadFromStorage<ApiConfig>('apiConfig', defaultApiConfig)
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  const setResumeData = useCallback((data: ResumeData | null) => {
    _setResumeData(data);
    if (data) saveToStorage('resumeData', data);
    else localStorage.removeItem('resumeData');
  }, []);

  const setJobDescription = useCallback((jd: JobDescription | null) => {
    _setJobDescription(jd);
    if (jd) saveToStorage('jobDescription', jd);
    else localStorage.removeItem('jobDescription');
  }, []);

  const setApiConfig = useCallback((config: ApiConfig) => {
    _setApiConfig(config);
    saveToStorage('apiConfig', config);
  }, []);

  // Listen for storage changes from other tabs/pages
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'resumeData' && e.newValue) {
        _setResumeData(JSON.parse(e.newValue));
      }
      if (e.key === 'jobDescription' && e.newValue) {
        _setJobDescription(JSON.parse(e.newValue));
      }
      if (e.key === 'apiConfig' && e.newValue) {
        _setApiConfig(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <AppContext.Provider
      value={{
        resumeData,
        setResumeData,
        jobDescription,
        setJobDescription,
        generatedResume,
        setGeneratedResume,
        apiConfig,
        setApiConfig,
        isGenerating,
        setIsGenerating,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
