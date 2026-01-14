// ============================================================================
// God Life Backend - AI Client (Unified Interface)
// ============================================================================

import type { CoachingContext } from './types.ts';
import { createAIProvider, getCurrentProvider } from './ai-providers/factory.ts';
import type { IAIProvider } from './ai-providers/base.ts';

// Re-export types for backward compatibility
export type {
  AIMessage,
  AIResponse,
  CoachingReport,
} from './ai-providers/base.ts';

export {
  estimateTokens,
  truncateConversation,
} from './ai-providers/base.ts';

/**
 * AI Client wrapper that delegates to configured provider
 * Provides a unified interface regardless of underlying AI service
 */
export class AIClient {
  private provider: IAIProvider;
  private providerType: string;

  constructor() {
    this.providerType = getCurrentProvider();
    this.provider = createAIProvider();
    console.log(`AI Client initialized with provider: ${this.providerType}`);
  }

  /**
   * Send a chat message and get AI response
   */
  async chat(
    messages: Parameters<IAIProvider['chat']>[0],
    context: CoachingContext,
  ) {
    return await this.provider.chat(messages, context);
  }

  /**
   * Stream a chat response (for real-time UI updates)
   */
  chatStream(
    messages: Parameters<IAIProvider['chatStream']>[0],
    context: CoachingContext,
  ) {
    return this.provider.chatStream(messages, context);
  }

  /**
   * Generate a structured coaching report
   */
  async generateReport(
    messages: Parameters<IAIProvider['generateReport']>[0],
    context: CoachingContext,
  ) {
    return await this.provider.generateReport(messages, context);
  }

  /**
   * Test AI connection and validate API key
   */
  async testConnection(): Promise<boolean> {
    return await this.provider.testConnection();
  }

  /**
   * Get current provider name
   */
  getProviderName(): string {
    return this.providerType;
  }
}

/**
 * Factory function to create AI client instance
 * @returns AIClient instance configured with environment settings
 */
export function createAIClient(): AIClient {
  return new AIClient();
}
