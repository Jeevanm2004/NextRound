import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';

const MODEL_ID = 'gemini-3.5-flash-lite';
const MIN_JD_LENGTH = 25;
const MAX_JD_LENGTH = 20000;

interface AnalyzeRequestBody {
  jobDescription?: unknown;
  company?: unknown;
  role?: unknown;
  recruiterName?: unknown;
  stage?: unknown;
}

interface ParsedJdAnalysis {
  keySkills: string[];
  interviewQuestions: string[];
  followUpNote: string;
}

function getApiErrorDetails(err: unknown): { status: number; message: string } {
  const errObj = err as { status?: number; statusCode?: number; message?: string };
  const rawMessage = typeof errObj?.message === 'string' ? errObj.message : String(err);
  const statusCode = Number(errObj?.status ?? errObj?.statusCode) || 500;

  if (
    statusCode === 403 ||
    rawMessage.includes('PERMISSION_DENIED') ||
    statusCode === 400 && rawMessage.includes('API_KEY_INVALID')
  ) {
    return {
      status: statusCode,
      message:
        'Gemini API key was rejected. Please verify your GEMINI_API_KEY in Settings > Secrets.',
    };
  }

  if (statusCode === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message:
        'Gemini API rate limit or quota reached. Please wait a moment and try again, or check your quota in Settings > Secrets.',
    };
  }

  if (statusCode === 404 || rawMessage.includes('NOT_FOUND')) {
    return {
      status: 404,
      message: `Model "${MODEL_ID}" was not found or is unavailable for the configured API key.`,
    };
  }

  if (statusCode >= 400 && statusCode < 500) {
    return {
      status: statusCode,
      message: rawMessage || 'Invalid request sent to Gemini API.',
    };
  }

  return {
    status: 502,
    message: 'Unable to analyze the job description right now. Please try again in a moment.',
  };
}

function isTransientError(err: unknown): boolean {
  const errObj = err as { status?: number; statusCode?: number; message?: string };
  const code = Number(errObj?.status ?? errObj?.statusCode) || 0;
  return code === 429 || code === 500 || code === 502 || code === 503 || code === 504;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateAndNormalizeAnalysis(rawText: string): ParsedJdAnalysis {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned) as Partial<ParsedJdAnalysis>;

  const keySkills = Array.isArray(parsed.keySkills)
    ? parsed.keySkills
        .map((s) => (typeof s === 'string' ? s.trim() : ''))
        .filter((s) => s.length > 0)
        .slice(0, 10)
    : [];

  const interviewQuestions = Array.isArray(parsed.interviewQuestions)
    ? parsed.interviewQuestions
        .map((q) => (typeof q === 'string' ? q.trim() : ''))
        .filter((q) => q.length > 0)
        .slice(0, 3)
    : [];

  const followUpNote =
    typeof parsed.followUpNote === 'string' ? parsed.followUpNote.trim() : '';

  if (
    keySkills.length === 0 ||
    interviewQuestions.length < 3 ||
    followUpNote.length === 0
  ) {
    throw new Error('Incomplete structured output returned from Gemini.');
  }

  return {
    keySkills,
    interviewQuestions,
    followUpNote,
  };
}

async function createApp() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  // Gracefully catch malformed JSON payloads
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({ error: 'Invalid JSON request body.' });
        return;
      }
      next(err);
    }
  );

  app.post('/api/analyze-jd', async (req, res) => {
    const body = (req.body ?? {}) as AnalyzeRequestBody;
    const rawJd = typeof body.jobDescription === 'string' ? body.jobDescription.trim() : '';

    if (!rawJd) {
      res.status(400).json({
        error: 'Please paste a job description before running AI analysis.',
      });
      return;
    }

    if (rawJd.length < MIN_JD_LENGTH) {
      res.status(400).json({
        error: `Job description is too short (${rawJd.length} characters). Paste at least ${MIN_JD_LENGTH} characters for accurate extraction.`,
      });
      return;
    }

    if (rawJd.length > MAX_JD_LENGTH) {
      res.status(400).json({
        error: `Job description exceeds ${MAX_JD_LENGTH.toLocaleString()} characters. Please trim boilerplate sections and try again.`,
      });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured on the server. Add your API key in Settings > Secrets.',
      });
      return;
    }

    const company =
      typeof body.company === 'string' ? body.company.trim().slice(0, 120) : '';
    const role = typeof body.role === 'string' ? body.role.trim().slice(0, 140) : '';
    const recruiterName =
      typeof body.recruiterName === 'string'
        ? body.recruiterName.trim().slice(0, 100)
        : '';
    const stage = typeof body.stage === 'string' ? body.stage.trim().slice(0, 40) : '';

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const contextLines = [
      company ? `Company: ${company}` : null,
      role ? `Target Role: ${role}` : null,
      recruiterName ? `Recruiter/Contact: ${recruiterName}` : null,
      stage ? `Current Pipeline Stage: ${stage}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = `${contextLines ? `${contextLines}\n\n` : ''}Job Description:
"""
${rawJd}
"""

Analyze the job description above and produce:
1. "keySkills": 5 to 8 concise, high-signal required technical, domain, or leadership skills explicitly emphasized in the job description (short phrases, 1-4 words each).
2. "interviewQuestions": Exactly 3 tailored, substantive interview questions an interviewer is likely to ask for this specific role and stack.
3. "followUpNote": A concise, polished recruiter follow-up message (65-110 words) tailored to this role${company ? ` at ${company}` : ''}${recruiterName ? ` addressed to ${recruiterName}` : ''}, highlighting alignment with 1-2 core requirements from the posting and asking about next steps.`;

    let lastError: unknown = null;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: MODEL_ID,
          contents: prompt,
          config: {
            systemInstruction:
              'You are an executive career strategist and technical interview coach. Return strictly valid JSON matching the requested schema without markdown fences or extra commentary.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                keySkills: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '5 to 8 concise required skills extracted from the job description.',
                },
                interviewQuestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Exactly 3 tailored interview questions grounded in the job description.',
                },
                followUpNote: {
                  type: Type.STRING,
                  description: 'A concise, ready-to-send recruiter follow-up note (65-110 words).',
                },
              },
              required: ['keySkills', 'interviewQuestions', 'followUpNote'],
            },
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error('Empty response received from Gemini.');
        }

        const normalized = validateAndNormalizeAnalysis(text);
        res.json({
          ...normalized,
          analyzedAt: new Date().toISOString(),
          model: MODEL_ID,
        });
        return;
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts && isTransientError(err)) {
          await sleep(400 * Math.pow(2, attempt - 1));
          continue;
        }
        break;
      }
    }

    const details = getApiErrorDetails(lastError);
    res.status(details.status).json({ error: details.message });
  });

  const distDir = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`NextRound server listening on http://0.0.0.0:${port}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start NextRound server:', err);
  process.exit(1);
});
