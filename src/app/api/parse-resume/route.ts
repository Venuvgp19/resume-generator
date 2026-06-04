import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileEntry = formData.get('file');

    console.log('[parse-resume] File received:', {
      exists: !!fileEntry,
      type: fileEntry?.constructor?.name,
      name: (fileEntry as any)?.name,
      size: (fileEntry as any)?.size,
    });

    if (!fileEntry) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await (fileEntry as any).arrayBuffer();
    console.log('[parse-resume] ArrayBuffer size:', arrayBuffer.byteLength);

    // Get filename from formData metadata or fallback
    const fileName = (fileEntry as any).name || 'upload';
    const ext = fileName.split('.').pop()?.toLowerCase();
    let text = '';

    if (ext === 'docx') {
      try {
        // mammoth expects a Node.js Buffer, not ArrayBuffer
        const buffer = Buffer.from(arrayBuffer);
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } catch (mammothErr: any) {
        console.error('[parse-resume] Mammoth DOCX parse error:', mammothErr.message);
        return NextResponse.json(
          { error: `DOCX parse error: ${mammothErr.message}. The file may be corrupted or not a valid DOCX.` },
          { status: 422 }
        );
      }
    } else if (ext === 'pdf') {
      // Use pdf-parse v1.x (stable, no browser dependencies)
      // Workaround for pdf-parse bug: it tries to load a test file internally
      try {
        const fs = require('fs');
        const path = require('path');
        const pdfBuffer = Buffer.from(arrayBuffer);
        
        // Create a dummy test/data directory with the expected file
        const testDir = path.join(process.cwd(), 'test', 'data');
        const testFile = path.join(testDir, '05-versions-space.pdf');
        
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }
        if (!fs.existsSync(testFile)) {
          // Write a minimal valid PDF to satisfy pdf-parse's internal check
          fs.writeFileSync(testFile, pdfBuffer.slice(0, Math.min(pdfBuffer.length, 1024)));
        }
        
        const pdfParse = require('pdf-parse');
        const result = await pdfParse(pdfBuffer);
        text = result.text || '';
      } catch (e: any) {
        console.error('[parse-resume] PDF parse error:', e.message);
        return NextResponse.json(
          { error: `PDF parse error: ${e.message}. The PDF may be scanned (image-based), encrypted, or corrupted. Try converting to text or using a .txt file.` },
          { status: 422 }
        );
      }
    } else {
      // txt, doc (treat as plain text), or unknown
      text = new TextDecoder().decode(arrayBuffer);
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Could not extract text from file. Try a .txt file or paste the text directly.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error('[parse-resume] Error:', err.message, err.stack);
    return NextResponse.json(
      { error: err.message || 'Failed to parse file' },
      { status: 500 }
    );
  }
}
