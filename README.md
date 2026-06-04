# ResumeForge — AI-Powered Resume Generator

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-06B6D4)](https://tailwindcss.com/)
[![Ollama](https://img.shields.io/badge/AI-Ollama-000000)](https://ollama.com/)

An intelligent, ATS-optimized resume generator that leverages AI to create tailored resumes based on your uploaded resume and job descriptions. Built with Next.js, TypeScript, and local AI via Ollama.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Screenshots](#screenshots)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

**ResumeForge** helps job seekers create customized, ATS-friendly resumes in minutes. Upload your existing resume (PDF/DOCX/TXT), paste a job description, and let AI generate a tailored resume that highlights the most relevant skills and experience for that specific role.

The app integrates with local AI models via Ollama (no API keys needed) and includes job scraping, matching, and management features.

---

## Features

### Core Resume Generation
| Feature | Description |
|---------|-------------|
| **Resume Upload** | Upload PDF, DOCX, or TXT resumes with server-side text extraction |
| **Job Description Input** | Paste any job posting to tailor your resume |
| **Photo Upload** | Optional profile photo for generated resumes |
| **AI Settings** | Configure model, temperature, and output format |
| **ATS Optimization** | Generated resumes are structured for Applicant Tracking Systems |
| **Multiple Formats** | Export as PDF, DOCX, or JSON |
| **Cover Letter** | Auto-generate matching cover letters |
| **ATS Report** | Get a compatibility score and improvement tips |
| **Email Draft** | Pre-written outreach email for the job |

### Job Hunter
| Feature | Description |
|---------|-------------|
| **LinkedIn Job Scraping** | Scrape LinkedIn job listings by keyword and location |
| **Job Matching** | AI-powered resume-to-job matching with score |
| **Saved Jobs** | Save and manage interesting job postings |
| **Bulk Generation** | Generate tailored resumes for multiple jobs at once |

### Authentication
| Feature | Description |
|---------|-------------|
| **NextAuth.js** | Secure session-based authentication |
| **Protected Routes** | Resume generation requires login |
| **User Profiles** | Persistent user data and preferences |

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   API Routes     │────▶│   Ollama AI     │
│   (React UI)    │     │   (Server-side)  │     │   (Local LLM)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │
        ▼                        ▼
┌─────────────────┐     ┌──────────────────┐
│  Tailwind CSS   │     │  File Parsing    │
│  (Styling)      │     │  (PDF/DOCX/TXT)  │
└─────────────────┘     └──────────────────┘
```

### Data Flow
1. **Upload** → Resume file is parsed server-side (mammoth for DOCX, pdf-parse for PDF)
2. **Input** → Job description and AI preferences are collected
3. **Generate** → Prompt is sent to local Ollama model via `/api/generate-ollama`
4. **Output** → Structured JSON resume → formatted DOCX/PDF
5. **ATS Check** → Resume is analyzed for keyword match and formatting

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **AI Backend** | Ollama (local LLM) |
| **Auth** | NextAuth.js v5 |
| **Icons** | Lucide React |
| **PDF Export** | html2pdf.js, jspdf |
| **DOCX Export** | docx library |
| **PDF Parsing** | pdf-parse |
| **DOCX Parsing** | mammoth |
| **Job Scraping** | cheerio (HTML parsing) |

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- [Ollama](https://ollama.com/) installed and running locally
- At least one model pulled (e.g., `ollama pull qwen2.5:7b` or `ollama pull kimi-k2.6:cloud`)

### Installation

```bash
# Clone the repo
git clone https://github.com/Venuvgp19/resume-generator.git
cd resume-generator

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Ollama Setup

```bash
# Install Ollama from https://ollama.com/

# Pull a recommended model
ollama pull qwen2.5:7b

# Or for best results
ollama pull kimi-k2.6:cloud

# Ensure Ollama is running
ollama serve
```

---

## Usage Guide

### 1. Upload Your Resume
- Go to **Step 1: Upload Resume**
- Upload your existing resume (PDF, DOCX, or TXT)
- The app extracts text server-side

### 2. Enter Job Description
- Go to **Step 2: Job Description**
- Paste the full job posting
- The AI will tailor your resume to match

### 3. Upload Photo (Optional)
- Go to **Step 3: Photo**
- Upload a professional headshot
- Included in generated DOCX resumes

### 4. Configure AI Settings
- Go to **Step 4: AI Settings**
- Select model (qwen2.5, kimi-k2.6, etc.)
- Adjust temperature (0.1 = strict, 1.0 = creative)
- Choose output format: JSON, DOCX, or PDF

### 5. Generate Resume
- Go to **Step 5: Generate**
- Click "Generate Resume"
- Download your tailored resume
- View ATS report and cover letter

### Job Hunter
- Navigate to **Job Hunter** page
- Enter job title and location
- Scrape LinkedIn listings
- Save interesting jobs
- Generate tailored resumes for saved jobs

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate-ollama` | POST | Generate resume via Ollama AI |
| `/api/generate` | POST | Alternative generation endpoint |
| `/api/parse-resume` | POST | Extract text from PDF/DOCX/TXT |
| `/api/match-job` | POST | Calculate resume-to-job match score |
| `/api/scrape-jobs` | POST | Scrape LinkedIn job listings |
| `/api/jobs` | GET/POST | List or save jobs |
| `/api/save-resume` | POST | Save generated resume |
| `/api/auth/[...nextauth]` | ALL | Authentication handlers |

---

## Project Structure

```
resume-generator/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Main resume builder (5-step wizard)
│   │   ├── job-hunter/page.tsx # LinkedIn job scraper
│   │   ├── jobs/page.tsx       # Saved jobs manager
│   │   ├── auth/signin/page.tsx# Login page
│   │   ├── api/                # Server API routes
│   │   │   ├── generate-ollama/route.ts
│   │   │   ├── parse-resume/route.ts
│   │   │   ├── match-job/route.ts
│   │   │   ├── scrape-jobs/route.ts
│   │   │   └── auth/[...nextauth]/route.ts
│   │   ├── layout.tsx          # Root layout with providers
│   │   └── globals.css         # Global styles
│   ├── components/             # React components
│   │   ├── ResumeUploader.tsx  # Step 1: File upload
│   │   ├── JobDescriptionInput.tsx # Step 2: JD input
│   │   ├── PhotoUploader.tsx   # Step 3: Photo upload
│   │   ├── AISettings.tsx      # Step 4: AI config
│   │   ├── GeneratePanel.tsx   # Step 5: Generation
│   │   ├── AuthNav.tsx         # Auth navigation
│   │   └── LinkedInImport.tsx  # LinkedIn profile import
│   ├── context/
│   │   └── AppContext.tsx      # Global state management
│   ├── types/
│   │   └── resume.ts           # TypeScript interfaces
│   ├── auth.ts                 # NextAuth configuration
│   └── middleware.ts           # Route protection
├── public/                     # Static assets
├── generated-resumes/          # Output directory (auto-created)
├── jobs-data/                  # Scraped job data (auto-created)
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## Screenshots

> _Add screenshots here showing the 5-step wizard, job hunter, and generated resume output._

---

## Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel --prod
```

### Self-Hosted
```bash
npm run build
npm start
```

> **Note:** Ollama must be accessible from the deployment environment, or use a remote Ollama instance.

---

## Environment Variables

Create `.env.local`:

```env
# NextAuth.js
AUTH_SECRET=your-secret-here
AUTH_GITHUB_ID=your-github-app-id
AUTH_GITHUB_SECRET=your-github-app-secret

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=kimi-k2.6:cloud
```

---

## Future Enhancements

- [ ] Multi-language resume generation
- [ ] LinkedIn profile auto-import
- [ ] Resume version history
- [ ] Portfolio website generation
- [ ] Interview question generator
- [ ] Salary insights integration

---

## License

MIT © Venuvgp19

---

> Built with Next.js + Ollama. No API keys, no cloud AI costs — just your own hardware doing the work.
