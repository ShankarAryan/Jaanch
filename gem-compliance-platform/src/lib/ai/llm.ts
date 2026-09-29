import { getAnthropicClient, AI_MODEL } from './anthropic';

/**
 * Provider-agnostic LLM helper.
 *
 * This project was built on Claude. This layer adds a Google Gemini path
 * so the AI features (document extraction, PO recommendation) also work on
 * Gemini's free tier - no credit card, no expiry - when an Anthropic
 * credit balance isn't available.
 *
 * Selection is by which key is set in the environment:
 *   GEMINI_API_KEY    -> Gemini   (https://aistudio.google.com/apikey)
 *   ANTHROPIC_API_KEY -> Claude
 *   neither           -> callers fall back to deterministic output
 *
 * Note: on Gemini's free tier Google may use inputs to improve its models.
 * That's acceptable here because every bidder in this build is synthetic
 * (see SIH26100_Problem_Analysis.md section 9) - don't point this at real
 * PAN/GST/Udyam data on the free tier.
 */

export type LlmProvider = 'gemini' | 'anthropic' | 'none';

export function llmProvider(): LlmProvider {
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return 'none';
}

export function hasLLM(): boolean {
  return llmProvider() !== 'none';
}

export interface LlmFile {
  base64: string;
  mimeType: string;
}

export interface LlmRequest {
  prompt: string;
  file?: LlmFile;
  maxTokens?: number;
  /** Ask the provider to return a bare JSON object. */
  json?: boolean;
}

/** Runs one completion against the configured provider. Throws on failure. */
export async function llmComplete(req: LlmRequest): Promise<string> {
  switch (llmProvider()) {
    case 'gemini':
      return geminiComplete(req);
    case 'anthropic':
      return anthropicComplete(req);
    default:
      throw new Error('No LLM provider configured (set GEMINI_API_KEY or ANTHROPIC_API_KEY).');
  }
}

// --- Gemini (REST, no SDK dependency) ------------------------------------

// Flash-Lite: the newest full Flash models have a near-zero free-tier
// allowance; Flash-Lite has a usable one (~1k requests/day) and is plenty
// for structured extraction + a short summary. Override with GEMINI_MODEL
const GEMINI_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
];

async function geminiComplete({ prompt, file, maxTokens = 800, json }: LlmRequest): Promise<string> {
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (file) {
    parts.push({ inlineData: { mimeType: file.mimeType, data: file.base64 } });
  }
  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      maxOutputTokens: Math.max(maxTokens, 512),
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  });

  const perAttemptMs = file ? 30000 : 12000;
  let lastErr = 'unknown';

  for (const model of GEMINI_MODELS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), perAttemptMs);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY as string },
          body,
          signal: controller.signal,
        },
      );
      clearTimeout(timeout);

      if (res.status === 429 || res.status === 503) {
        lastErr = `HTTP ${res.status}`;
        continue;
      }
      if (!res.ok) {
        throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
      };
      const text =
        data.candidates?.[0]?.content?.parts
          ?.filter((p) => !p.thought)
          .map((p) => p.text ?? '')
          .join('')
          .trim() ?? '';
      if (!text) throw new Error('Gemini returned no text');
      return text;
    } catch (err) {
      clearTimeout(timeout);
      lastErr = err instanceof Error ? err.message : 'unknown';
    }
  }
  throw new Error(`Gemini ${lastErr} (all models exhausted)`);
}

// --- Anthropic (existing SDK) -------------------------------------------

const ANTHROPIC_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

async function anthropicComplete({ prompt, file, maxTokens = 300 }: LlmRequest): Promise<string> {
  const anthropic = getAnthropicClient();

  if (!file) {
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = message.content.find((b) => b.type === 'text');
    return block && block.type === 'text' ? block.text : '';
  }

  if (ANTHROPIC_IMAGE_TYPES.has(file.mimeType)) {
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: file.mimeType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
                data: file.base64,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });
    const block = message.content.find((b) => b.type === 'text');
    return block && block.type === 'text' ? block.text : '';
  }

  // PDF - beta document input in this SDK version (0.32.x).
  const message = await anthropic.beta.messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    betas: ['pdfs-2024-09-25'],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.base64 } },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });
  const block = message.content.find((b) => b.type === 'text');
  return block && block.type === 'text' ? block.text : '';
}
