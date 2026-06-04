import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const { folderName, data } = await req.json();

  if (!folderName || !data) {
    return NextResponse.json({ error: 'folderName and data are required' }, { status: 400 });
  }

  const safeFolder = folderName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const outputDir = path.join(process.cwd(), 'generated-resumes', safeFolder);

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save resume JSON
    fs.writeFileSync(path.join(outputDir, 'resume.json'), JSON.stringify(data.resume, null, 2));

    // Save cover letter
    fs.writeFileSync(path.join(outputDir, 'cover-letter.txt'), data.coverLetter);

    // Save email draft
    fs.writeFileSync(path.join(outputDir, 'email-draft.txt'), data.emailDraft);

    // Save ATS report
    fs.writeFileSync(
      path.join(outputDir, 'ats-report.json'),
      JSON.stringify(
        {
          atsScore: data.atsScore,
          matchedKeywords: data.matchedKeywords,
          missingKeywords: data.missingKeywords,
        },
        null,
        2
      )
    );

    return NextResponse.json({ success: true, folder: outputDir });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
