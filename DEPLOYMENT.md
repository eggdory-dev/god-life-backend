# God Life Backend - 배포 완료 ✅

## 배포 현황

### ✅ Supabase 프로젝트
- **Project ID**: igqnshzqeabezhyeawvx
- **Project URL**: https://igqnshzqeabezhyeawvx.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/igqnshzqeabezhyeawvx

### ✅ 데이터베이스
- 20개 테이블 생성 완료
- RLS 정책 적용 완료
- 함수 및 트리거 생성 완료
- 초기 데이터 시딩 완료

### ✅ Edge Functions (14개)
모든 Edge Functions가 성공적으로 배포되었습니다:

**인증 관련:**
- auth-social - 소셜 로그인 (Google, Apple, Kakao)
- auth-refresh - 토큰 갱신
- auth-logout - 로그아웃

**사용자 관리:**
- users-me - 내 프로필 조회
- users-onboarding - 온보딩 설정
- users-settings - 사용자 설정

**루틴 관리:**
- routines - 루틴 CRUD
- routines-detail - 루틴 상세
- routines-complete - 루틴 완료
- routines-uncomplete - 루틴 완료 취소

**AI 코칭:**
- coaching-conversations - 대화 목록
- coaching-conversation - 대화 조회
- coaching-messages - 메시지 전송
- coaching-report - 코칭 리포트 생성

### ✅ AI Provider 시스템 (모듈형)
두 가지 AI Provider를 지원합니다:

**1. Google Gemini (기본값, 무료)**
- 월 1,500 요청 무료
- 개발/테스트에 적합

**2. Anthropic Claude (프리미엄)**
- 최고 품질
- 프로덕션에 권장

## 환경변수 설정

### 필수 설정

```bash
# 1. AI Provider 설정 (기본값: gemini)
supabase secrets set AI_PROVIDER=gemini

# 2. Gemini API Key 설정
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

### 선택 설정

```bash
# Google OAuth (선택)
supabase secrets set GOOGLE_CLIENT_ID=your-google-client-id
supabase secrets set GOOGLE_SECRET=your-google-secret

# Apple OAuth (선택)
supabase secrets set APPLE_CLIENT_ID=your-apple-client-id
supabase secrets set APPLE_SECRET=your-apple-secret

# Anthropic Claude로 업그레이드 시 (나중에)
supabase secrets set AI_PROVIDER=anthropic
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key
```

## API 키 발급 방법

### Google Gemini API Key (무료)
1. https://makersuite.google.com/app/apikey 접속
2. "Create API Key" 클릭
3. API Key 복사 후 환경변수에 설정

### Anthropic API Key (유료)
1. https://console.anthropic.com 접속
2. 계정 생성 후 API Keys 메뉴
3. 최소 $5 충전 필요

## 다음 단계

### 1. 환경변수 설정
```bash
# Gemini API Key 발급 후 설정
supabase secrets set GEMINI_API_KEY=your-key
```

### 2. API 테스트
```bash
# Function URL 확인
https://igqnshzqeabezhyeawvx.supabase.co/functions/v1/

# 예시: 사용자 정보 조회
curl https://igqnshzqeabezhyeawvx.supabase.co/functions/v1/users-me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. 클라이언트 앱 연결
Flutter/React Native 앱에서 Supabase 연결:

```dart
// Flutter
import 'package:supabase_flutter/supabase_flutter.dart';

await Supabase.initialize(
  url: 'https://igqnshzqeabezhyeawvx.supabase.co',
  anonKey: 'YOUR_ANON_KEY', // Dashboard에서 확인
);
```

## 로컬 개발

```bash
# 로컬 Supabase 시작
supabase start

# 로컬에서 함수 테스트
supabase functions serve

# 데이터베이스 리셋 (개발 시)
supabase db reset
```

## Supabase CLI 명령어

```bash
# 로그인
supabase login

# 프로젝트 상태 확인
supabase status

# 마이그레이션 생성
supabase migration new migration_name

# 마이그레이션 적용
supabase db push

# 함수 배포
supabase functions deploy

# 환경변수 확인
supabase secrets list

# 환경변수 설정
supabase secrets set KEY=value
```

## 모니터링

- **대시보드**: https://supabase.com/dashboard/project/igqnshzqeabezhyeawvx
- **Database**: 쿼리 성능, 테이블 상태
- **Edge Functions**: 호출 횟수, 오류율
- **Auth**: 사용자 통계
- **Storage**: 파일 사용량

## 비용 관리

### 무료 티어 (Gemini 사용 시)
- Supabase: 무료 (500MB 데이터베이스, 1GB 파일)
- Gemini API: 월 1,500 요청 무료

### 유료 전환 시점
- 사용자 증가
- 데이터베이스 용량 초과
- API 호출 증가
- Claude 사용 필요 시

## 트러블슈팅

### Edge Function 오류
```bash
# 로그 확인
supabase functions logs coaching-messages

# 재배포
supabase functions deploy coaching-messages
```

### 데이터베이스 문제
```bash
# 연결 확인
supabase db remote

# 마이그레이션 재적용
supabase db push --include-all
```

### AI Provider 전환
```bash
# Gemini → Claude
supabase secrets set AI_PROVIDER=anthropic
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx

# 함수 재배포 (자동 반영)
supabase functions deploy
```

## 문서 참고

- [Supabase 공식 문서](https://supabase.com/docs)
- [AI Providers 가이드](./supabase/functions/_shared/ai-providers/README.md)
- [Edge Functions 가이드](https://supabase.com/docs/guides/functions)

---

**배포 완료일**: 2026-01-14
**Supabase CLI 버전**: 2.67.1
**AI Provider**: Modular (Gemini/Anthropic)
