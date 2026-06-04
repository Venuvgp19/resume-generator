import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { resumeData, jobDescription } = await req.json();

    if (!resumeData || !jobDescription) {
      return NextResponse.json(
        { error: 'resumeData and jobDescription are required' },
        { status: 400 }
      );
    }

    // Build a comprehensive prompt for the AI to analyze the match
    const prompt = `You are an expert ATS (Applicant Tracking System) analyzer and job matching specialist.

Your task: Analyze how well the candidate's resume matches the job description. 

Respond in ENGLISH only. All analysis, skills, and output must be in English.

Return ONLY a valid JSON object with no markdown, no explanations, and no text outside the JSON.

The JSON must have exactly this structure:
{
  "score": number, // 0-100 match score
  "matchedSkills": ["skill1", "skill2"], // skills found in BOTH resume and job
  "missingSkills": ["skill3", "skill4"], // skills in job but NOT in resume
  "jobSkills": ["skill1", "skill2", "skill3", "skill4"], // ALL skills found in job description
  "analysis": "Brief 1-2 sentence analysis of the match"
}

Scoring guidelines:
- 80-100: Excellent match - candidate has most required skills and experience
- 60-79: Good match - candidate has many key skills but missing some
- 40-59: Moderate match - candidate has some relevant skills but significant gaps
- 20-39: Weak match - limited skill overlap
- 0-19: Poor match - very few matching skills

Consider:
1. Technical skills (programming languages, frameworks, tools)
2. Soft skills (leadership, communication, teamwork)
3. Years of experience relevance
4. Domain knowledge
5. Education requirements

RESUME DATA:
${JSON.stringify(resumeData, null, 2)}

JOB DESCRIPTION:
Title: ${jobDescription.title || 'N/A'}
Company: ${jobDescription.company || 'N/A'}
Description:
${jobDescription.description || 'No description'}

IMPORTANT: Only return the JSON object. No markdown formatting, no code blocks, no explanations before or after.`;

    // Call Ollama directly with the correct config from openclaw.json
    const ollamaRes = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'kimi-k2.6:cloud',
        prompt: prompt,
        stream: false,
        options: { temperature: 0.7 },
      }),
    });

    if (!ollamaRes.ok) {
      const errorText = await ollamaRes.text();
      console.error('[match-job] Ollama error:', errorText);
      return NextResponse.json(
        { error: `Ollama request failed: ${ollamaRes.status} — ${errorText}` },
        { status: 502 }
      );
    }

    const ollamaData = await ollamaRes.json();
    const rawResponse = ollamaData.response || '';

    // Try to parse the AI response as JSON
    let result;
    try {
      // First try direct JSON parse
      result = JSON.parse(rawResponse);
    } catch {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find anything that looks like JSON
        const possibleJson = rawResponse.match(/\{[\s\S]*\}/);
        if (possibleJson) {
          result = JSON.parse(possibleJson[0]);
        } else {
          throw new Error('Could not parse AI response as JSON');
        }
      }
    }

    // Validate the response structure
    if (typeof result.score !== 'number') {
      result.score = 0;
    }
    if (!Array.isArray(result.matchedSkills)) {
      result.matchedSkills = [];
    }
    if (!Array.isArray(result.missingSkills)) {
      result.missingSkills = [];
    }
    if (!Array.isArray(result.jobSkills)) {
      result.jobSkills = [...result.matchedSkills, ...result.missingSkills];
    }

    // Ensure score is within 0-100
    result.score = Math.max(0, Math.min(100, Math.round(result.score)));

    return NextResponse.json({
      success: true,
      score: result.score,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      jobSkills: result.jobSkills,
      analysis: result.analysis || '',
    });

  } catch (err: any) {
    console.error('[match-job] Error:', err.message);
    return NextResponse.json(
      { error: err.message || 'Failed to analyze job match' },
      { status: 500 }
    );
  }
}
