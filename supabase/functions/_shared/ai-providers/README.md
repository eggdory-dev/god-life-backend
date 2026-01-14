# AI Providers

모듈형 AI Provider 시스템 - 여러 AI 서비스를 쉽게 전환할 수 있습니다.

## 지원하는 Provider

### 1. **Anthropic Claude** (anthropic)
- **모델**: Claude 3.5 Sonnet
- **장점**: 최고 품질의 응답, 한국어 뛰어남
- **비용**: $5 최소 충전 필요
- **사용 사례**: 프로덕션 환경

### 2. **Google Gemini** (gemini)
- **모델**: Gemini 1.5 Flash
- **장점**: 무료 티어 (월 1,500 요청)
- **비용**: 무료로 시작
- **사용 사례**: 개발/테스트 환경

## 사용 방법

### 환경변수 설정

```bash
# AI Provider 선택 (기본값: gemini)
AI_PROVIDER=gemini  # 또는 'anthropic'

# Gemini 사용 시
GEMINI_API_KEY=your-gemini-api-key

# Anthropic 사용 시
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
```

### Supabase 환경변수 설정

```bash
# Gemini로 시작 (무료)
supabase secrets set AI_PROVIDER=gemini
supabase secrets set GEMINI_API_KEY=your-key

# 나중에 Claude로 업그레이드
supabase secrets set AI_PROVIDER=anthropic
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key
```

### 코드에서 사용

```typescript
import { createAIClient } from '../_shared/ai-client.ts';

// AI Client 생성 (자동으로 설정된 provider 사용)
const aiClient = createAIClient();

// 채팅
const response = await aiClient.chat(messages, context);

// 스트리밍
for await (const chunk of aiClient.chatStream(messages, context)) {
  console.log(chunk);
}

// 리포트 생성
const report = await aiClient.generateReport(messages, context);

// 현재 사용 중인 provider 확인
console.log(aiClient.getProviderName()); // 'gemini' or 'anthropic'
```

## Google Gemini API Key 발급

1. https://makersuite.google.com/app/apikey 접속
2. "Create API Key" 클릭
3. Google Cloud 프로젝트 선택 (또는 새로 생성)
4. API Key 복사

**무료 티어:**
- 월 1,500 요청 무료
- 일일 60 요청 제한
- 분당 15 요청 제한

## Anthropic API Key 발급

1. https://console.anthropic.com 접속
2. 계정 생성/로그인
3. API Keys > Create Key
4. 최소 $5 충전 필요

**비용:**
- Input: $3 per million tokens
- Output: $15 per million tokens
- 대략 한국어 1,000자 = 250 tokens

## Provider 추가 방법

새로운 AI Provider를 추가하려면:

1. `IAIProvider` 인터페이스 구현
2. `factory.ts`에 provider 추가
3. 환경변수 설정

```typescript
// new-provider.ts
export class NewProvider implements IAIProvider {
  async chat(messages, context) { ... }
  async *chatStream(messages, context) { ... }
  async generateReport(messages, context) { ... }
  async testConnection() { ... }
}

// factory.ts
case 'newprovider':
  return new NewProvider();
```

## 아키텍처

```
ai-providers/
├── base.ts              # 인터페이스 정의
├── prompts.ts           # 공통 프롬프트
├── anthropic-provider.ts # Claude 구현
├── gemini-provider.ts    # Gemini 구현
├── factory.ts           # Provider 팩토리
└── index.ts             # Barrel export
```

## 권장 사항

**개발 단계:**
- Gemini 사용 (무료)
- `AI_PROVIDER=gemini`

**프로덕션:**
- Claude 사용 (고품질)
- `AI_PROVIDER=anthropic`
- 비용 모니터링 필수

**A/B 테스트:**
- 두 provider를 모두 설정
- 환경변수만 변경하여 전환
