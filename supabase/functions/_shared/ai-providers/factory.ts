// ============================================================================
// God Life Backend - AI Provider Factory
// ============================================================================

import type { IAIProvider } from './base.ts';
import { AnthropicProvider } from './anthropic-provider.ts';
import { GeminiProvider } from './gemini-provider.ts';

export type AIProviderType = 'anthropic' | 'gemini';

/**
 * Factory to create AI provider based on environment configuration
 *
 * Usage:
 * 1. Set AI_PROVIDER env var: 'anthropic' or 'gemini' (default: 'gemini')
 * 2. Set corresponding API key:
 *    - ANTHROPIC_API_KEY for Claude
 *    - GEMINI_API_KEY for Gemini
 */
export function createAIProvider(): IAIProvider {
  const provider = (Deno.env.get('AI_PROVIDER') || 'gemini') as AIProviderType;

  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider();

    case 'gemini':
      return new GeminiProvider();

    default:
      throw new Error(
        `Unknown AI provider: ${provider}. Must be 'anthropic' or 'gemini'`,
      );
  }
}

/**
 * Get the current AI provider type from environment
 */
export function getCurrentProvider(): AIProviderType {
  return (Deno.env.get('AI_PROVIDER') || 'gemini') as AIProviderType;
}

/**
 * Check if AI provider is properly configured
 */
export function isAIConfigured(): boolean {
  const provider = getCurrentProvider();

  switch (provider) {
    case 'anthropic':
      return !!Deno.env.get('ANTHROPIC_API_KEY');

    case 'gemini':
      return !!Deno.env.get('GEMINI_API_KEY');

    default:
      return false;
  }
}
