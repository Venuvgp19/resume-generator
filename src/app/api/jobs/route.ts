import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const JOBS_DIR = path.join(process.cwd(), 'jobs-data');

function getJobs(): any[] {
  if (!fs.existsSync(JOBS_DIR)) return [];
  const files = fs.readdirSync(JOBS_DIR).filter((f) => f.endsWith('.json'));
  const all: any[] = [];
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(JOBS_DIR, file), 'utf-8'));
      if (Array.isArray(data)) all.push(...data);
    } catch {
      // ignore corrupt files
    }
  }
  // Deduplicate by id
  const seen = new Set();
  return all.filter((j) => {
    if (seen.has(j.id)) return false;
    seen.add(j.id);
    return true;
  });
}

export async function GET() {
  const jobs = getJobs();
  return NextResponse.json({ jobs });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  
  // Clear ALL jobs
  if (body.all === true) {
    if (fs.existsSync(JOBS_DIR)) {
      const files = fs.readdirSync(JOBS_DIR).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        fs.unlinkSync(path.join(JOBS_DIR, file));
      }
    }
    return NextResponse.json({ success: true, cleared: true });
  }
  
  // Delete single job
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'id or all:true required' }, { status: 400 });
  
  if (!fs.existsSync(JOBS_DIR)) return NextResponse.json({ success: true });
  const files = fs.readdirSync(JOBS_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const fp = path.join(JOBS_DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
      if (Array.isArray(data)) {
        const filtered = data.filter((j) => j.id !== id);
        if (filtered.length !== data.length) {
          fs.writeFileSync(fp, JSON.stringify(filtered, null, 2));
        }
      }
    } catch {
      // ignore
    }
  }
  return NextResponse.json({ success: true });
}
