// ============================================================================
// God Life Backend - Anthropic AI Client
// ============================================================================

import Anthropic from 'npm:@anthropic-ai/sdk@0.20.0';
import type { CoachingContext } from './types.ts';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  tokens: number;
}

/**
 * AI Client for coaching conversations using Anthropic Claude
 * Handles conversation context, system prompts, and streaming
 */
export class AIClient {
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

  /**
   * Send a chat message and get AI response
   *
   * @param messages - Conversation history
   * @param context - User context (theme, style, routines)
   * @returns AI response with token count
   */
  async chat(
    messages: AIMessage[],
    context: CoachingContext,
  ): Promise<AIResponse> {
    const systemPrompt = this.buildSystemPrompt(context);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Extract text content from response
    const content = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    const tokens = response.usage.input_tokens + response.usage.output_tokens;

    return {
      content,
      tokens,
    };
  }

  /**
   * Stream a chat response (for real-time UI updates)
   *
   * @param messages - Conversation history
   * @param context - User context
   * @returns Async iterable of text chunks
   */
  async *chatStream(
    messages: AIMessage[],
    context: CoachingContext,
  ): AsyncIterable<string> {
    const systemPrompt = this.buildSystemPrompt(context);

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

  /**
   * Generate a structured coaching report from conversation
   *
   * @param messages - Full conversation history
   * @param context - User context
   * @returns Structured report with diagnosis and recommendations
   */
  async generateReport(
    messages: AIMessage[],
    context: CoachingContext,
  ): Promise<{
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
  }> {
    const systemPrompt = this.buildReportPrompt(context);

    // Summarize conversation for report generation
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
      // Parse JSON response
      const report = JSON.parse(content);
      return report;
    } catch (error) {
      console.error('Failed to parse AI report:', error);
      // Return fallback report
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

  /**
   * Build system prompt based on user context
   * Adapts tone and content based on theme (faith/universal) and style (F/T)
   *
   * @param context - User coaching context
   * @returns System prompt string
   */
  private buildSystemPrompt(context: CoachingContext): string {
    // Base prompt varies by theme
    const basePrompt = context.theme_mode === 'faith'
      ? `당신은 신앙 기반 라이프 코치입니다. 사용자가 경건한 습관을 만들고 영적으로 성장하도록 돕는 것이 목표입니다. 성경적 원리와 기독교 가치관을 바탕으로 조언하되, 강요하지 않고 격려하는 방식으로 대화하세요.`
      : `당신은 라이프 코치입니다. 사용자가 긍정적인 습관을 만들고 개인적 성장을 이루도록 돕는 것이 목표입니다. 실용적이고 과학적인 접근을 바탕으로 조언하세요.`;

    // Tone guidance based on coaching style
    const toneGuidance = context.coaching_style === 'F'
      ? `\n\n**대화 스타일**: 공감적이고 따뜻하며 격려하는 톤을 사용하세요. 감정에 초점을 맞추고 정서적 지원을 제공하세요. "많이 힘드셨겠어요", "정말 잘하고 계시네요" 같은 표현을 사용하세요.`
      : `\n\n**대화 스타일**: 논리적이고 직접적이며 분석적인 톤을 사용하세요. 실용적인 전략과 객관적 분석에 초점을 맞추세요. "이렇게 해보면 어떨까요", "데이터를 보면" 같은 표현을 사용하세요.`;

    // User context
    const userContext = `\n\n**사용자 루틴**: ${
      context.user_routines.length > 0
        ? context.user_routines
          .map(
            (r) =>
              `"${r.name}" (${r.category}, ${r.current_streak}일 연속 달성)`,
          )
          .join(', ')
        : '아직 등록된 루틴이 없습니다'
    }`;

    const recentActivity = context.recent_completions.length > 0
      ? `\n\n**최근 활동**: ${
        context.recent_completions
          .map((c) => `${c.routine_name} (${c.completion_date})`)
          .join(', ')
      }`
      : '';

    // Guidelines
    const guidelines = `\n\n**대화 가이드라인**:
- 응답은 2-4문장으로 간결하게 유지하세요
- 사용자의 상황을 이해하기 위해 명확한 질문을 하세요
- 사용자의 루틴에 맞춤화된 실용적인 조언을 제공하세요
- 진행 상황과 연속 달성(streak)을 축하하세요
- 실패나 어려움이 있을 때 지지적인 태도를 보이세요
- 한국어로 자연스럽고 친근하게 대화하세요`;

    return basePrompt + toneGuidance + userContext + recentActivity +
      guidelines;
  }

  /**
   * Build system prompt for report generation
   * Returns structured JSON format instructions
   *
   * @param context - User coaching context
   * @returns System prompt for report generation
   */
  private buildReportPrompt(context: CoachingContext): string {
    return `당신은 대화 내용을 분석하여 구조화된 코칭 리포트를 생성하는 AI입니다.

**중요**: 응답은 반드시 아래 JSON 형식으로만 작성하세요. 다른 텍스트는 포함하지 마세요.

\`\`\`json
{
  "diagnosisSummary": "1-2문장으로 요약한 진단 내용",
  "diagnosisDetails": [
    {
      "category": "sleep|routine|motivation|time_management|stress|health|spiritual",
      "issue": "구체적인 문제점 설명",
      "severity": "low|medium|high"
    }
  ],
  "recommendations": [
    {
      "id": "rec_1",
      "type": "routine",
      "title": "추천 제목",
      "description": "상세한 추천 내용 (2-3문장)",
      "suggestedRoutine": {
        "name": "루틴 이름",
        "time": "HH:MM",
        "category": "spiritual|health|learning|productivity"
      },
      "priority": "high|medium|low"
    }
  ]
}
\`\`\`

**진단 카테고리 설명**:
- sleep: 수면 패턴 문제
- routine: 루틴 실행 문제
- motivation: 동기부여 부족
- time_management: 시간 관리 문제
- stress: 스트레스/불안
- health: 건강 문제
- spiritual: 영적 성장 문제 (faith 모드)

**추천 타입**:
- routine: 새로운 루틴 추천 (suggestedRoutine 포함)
- advice: 일반적인 조언
- resource: 추가 리소스 제안

**주의사항**:
- 2-4개의 구체적이고 실행 가능한 추천을 제공하세요
- 사용자의 테마 모드(${context.theme_mode})에 맞는 내용으로 작성하세요
- 한국어로 작성하세요
- 반드시 위의 JSON 형식만 출력하세요`;
  }

  /**
   * Test AI connection and validate API key
   *
   * @returns true if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      });
      return response.content.length > 0;
    } catch (error) {
      console.error('AI connection test failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create AI client instance
 * Validates API key on creation
 *
 * @returns AIClient instance
 * @throws Error if API key is missing
 */
export function createAIClient(): AIClient {
  return new AIClient();
}

/**
 * Helper to count tokens in a message (rough estimate)
 * Actual token count may vary
 *
 * @param text - Text to count tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for Korean/English mix
  return Math.ceil(text.length / 4);
}

/**
 * Truncate conversation history to fit token limit
 * Keeps most recent messages within limit
 *
 * @param messages - Full conversation history
 * @param maxTokens - Maximum tokens to keep (default: 3000)
 * @returns Truncated message array
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
