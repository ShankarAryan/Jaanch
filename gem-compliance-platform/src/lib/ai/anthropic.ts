import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Lazily-constructed client. Callers must check hasAnthropicKey() (or
 * catch the throw) - every call site in this project falls back to a
 * deterministic template instead of failing, so a missing/expired key
 * never breaks the app during a demo.
 */
export function getAnthropicClient(): Anthropic {
  if (!hasAnthropicKey()) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const AI_MODEL = 'claude-sonnet-4-5-20250929';
