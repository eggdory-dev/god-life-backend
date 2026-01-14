// ============================================================================
// God Life Backend - Anthropic Claude AI Provider
// ============================================================================

import Anthropic from 'npm:@anthropic-ai/sdk@0.20.0';
import type { CoachingContext } from '../types.ts';
import type {
  AIMessage,
  AIResponse,
  CoachingReport,
  IAIProvider,
} from './base.ts';
import { buildSystemPrompt, buildReportPrompt } from './prompts.ts';

/**
 * Anthropic Claude AI Provider
 * Premium option with best quality responses
 */
export class AnthropicProvider implements IAIProvider {
  private client: Anthropic;
  private model: string = 'claude-3-5-sonnet-20241022';

  constructor() {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    this.client = new Anthropic({
      apiKey,
    });
  }

  async chat(
    messages: AIMessage[],
    context: CoachingContext,
  ): Promise<AIResponse> {
    const systemPrompt = buildSystemPrompt(context);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const content = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    const tokens = response.usage.input_tokens + response.usage.output_tokens;

    return {
      content,
      tokens,
    };
  }

  async *chatStream(
    messages: AIMessage[],
    context: CoachingContext,
  ): AsyncIterable<string> {
    const systemPrompt = buildSystemPrompt(context);

    const stream = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    });

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        yield chunk.delta.text;
      }
    }
  }

  async generateReport(
    messages: AIMessage[],
    context: CoachingContext,
  ): Promise<CoachingReport> {
    const systemPrompt = buildReportPrompt(context);

    const conversationSummary = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content:
            `Based on this conversation, generate a comprehensive coaching report:\n\n${conversationSummary}`,
        },
      ],
    });

    const content = response.content[0].type === 'text'
      ? response.content[0].text
      : '{}';

    try {
      const report = JSON.parse(content);
      return report;
    } catch (error) {
      console.error('Failed to parse Anthropic report:', error);
      return this.getFallbackReport();
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      });
      return response.content.length > 0;
    } catch (error) {
      console.error('Anthropic connection test failed:', error);
      return false;
    }
  }

  private getFallbackReport(): CoachingReport {
    return {
      diagnosisSummary: '대화 내용을 분석하여 리포트를 생성했습니다.',
      diagnosisDetails: [
        {
          category: 'general',
          issue: '상담 내용 분석 중',
          severity: 'medium',
        },
      ],
      recommendations: [
        {
          id: 'rec_1',
          type: 'advice',
          title: '꾸준한 실천',
          description: '매일 조금씩 실천하는 것이 중요합니다.',
          priority: 'medium',
        },
      ],
    };
  }
}
