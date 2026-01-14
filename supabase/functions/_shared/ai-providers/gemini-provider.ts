// ============================================================================
// God Life Backend - Google Gemini AI Provider
// ============================================================================

import type { CoachingContext } from '../types.ts';
import type {
  AIMessage,
  AIResponse,
  CoachingReport,
  IAIProvider,
} from './base.ts';
import { buildSystemPrompt, buildReportPrompt } from './prompts.ts';

/**
 * Google Gemini AI Provider
 * Free option with good quality (1,500 requests/month free)
 */
export class GeminiProvider implements IAIProvider {
  private apiKey: string;
  private model: string = 'gemini-1.5-flash';
  private apiUrl: string = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    this.apiKey = apiKey;
  }

  async chat(
    messages: AIMessage[],
    context: CoachingContext,
  ): Promise<AIResponse> {
    const systemPrompt = buildSystemPrompt(context);

    // Convert messages to Gemini format
    const contents = this.convertMessagesToGemini(messages, systemPrompt);

    const response = await fetch(
      `${this.apiUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.7,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokens = (data.usageMetadata?.totalTokenCount || 0);

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
    const contents = this.convertMessagesToGemini(messages, systemPrompt);

    const response = await fetch(
      `${this.apiUrl}/models/${this.model}:streamGenerateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.7,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            yield text;
          }
        } catch {
          // Skip invalid JSON
        }
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

    const reportMessages: AIMessage[] = [
      {
        role: 'user',
        content:
          `Based on this conversation, generate a comprehensive coaching report:\n\n${conversationSummary}`,
      },
    ];

    const contents = this.convertMessagesToGemini(reportMessages, systemPrompt);

    const response = await fetch(
      `${this.apiUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.7,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    try {
      // Try to extract JSON from markdown code blocks if present
      let jsonContent = content;
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }

      const report = JSON.parse(jsonContent);
      return report;
    } catch (error) {
      console.error('Failed to parse Gemini report:', error);
      return this.getFallbackReport();
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.apiUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: 'Hello' }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 10,
            },
          }),
        },
      );
      return response.ok;
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }

  private convertMessagesToGemini(
    messages: AIMessage[],
    systemPrompt: string,
  ): Array<{ role: string; parts: Array<{ text: string }> }> {
    // Gemini doesn't have a system message, so prepend it to the first user message
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> =
      [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const role = msg.role === 'assistant' ? 'model' : 'user';

      // Add system prompt to first user message
      const text = (i === 0 && msg.role === 'user')
        ? `${systemPrompt}\n\n${msg.content}`
        : msg.content;

      contents.push({
        role,
        parts: [{ text }],
      });
    }

    return contents;
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
