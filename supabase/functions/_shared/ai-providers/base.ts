// ============================================================================
// God Life Backend - Base AI Provider Interface
// ============================================================================

import type { CoachingContext } from '../types.ts';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  tokens: number;
}

export interface CoachingReport {
  diagnosisSummary: string;
  diagnosisDetails: Array<{
    category: string;
    issue: string;
    severity: string;
  }>;
  recommendations: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    suggestedRoutine?: {
      name: string;
      time: string;
      category: string;
    };
    priority: string;
  }>;
}

/**
 * Base interface for AI providers
 * All AI providers must implement these methods
 */
export interface IAIProvider {
  /**
   * Send a chat message and get AI response
   */
  chat(messages: AIMessage[], context: CoachingContext): Promise<AIResponse>;

  /**
   * Stream a chat response (for real-time UI updates)
   */
  chatStream(
    messages: AIMessage[],
    context: CoachingContext,
  ): AsyncIterable<string>;

  /**
   * Generate a structured coaching report
   */
  generateReport(
    messages: AIMessage[],
    context: CoachingContext,
  ): Promise<CoachingReport>;

  /**
   * Test AI connection and validate API key
   */
  testConnection(): Promise<boolean>;
}

/**
 * Helper to count tokens in a message (rough estimate)
 */
export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for Korean/English mix
  return Math.ceil(text.length / 4);
}

/**
 * Truncate conversation history to fit token limit
 */
export function truncateConversation(
  messages: AIMessage[],
  maxTokens: number = 3000,
): AIMessage[] {
  let totalTokens = 0;
  const truncated: AIMessage[] = [];

  // Iterate from end (most recent) to start
  for (let i = messages.length - 1; i >= 0; i--) {
    const tokens = estimateTokens(messages[i].content);

    if (totalTokens + tokens > maxTokens) {
      break;
    }

    truncated.unshift(messages[i]);
    totalTokens += tokens;
  }

  return truncated;
}
