/**
 * Resume data types
 */
export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  portfolio?: string;
  photo?: string;
}

export interface Experience {
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  bullets: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
  link?: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  link?: string;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  projects: Project[];
}

export interface GeneratedResume {
  resume: ResumeData;
  coverLetter: string;
  emailDraft: string;
  atsScore: number;
  missingKeywords: string[];
  matchedKeywords: string[];
  improvementPointers?: string[];
}

export interface ApiConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'custom';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
}

export interface JobDescription {
  title: string;
  company: string;
  description: string;
}
