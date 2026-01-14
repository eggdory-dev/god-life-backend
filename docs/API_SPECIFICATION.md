# API Specification - 갓생(God Life)

## 1. API 개요

### 1.1 기본 정보

| 항목 | 값 |
|------|-----|
| Base URL | `https://api.godlife.app/v1` |
| 프로토콜 | HTTPS |
| 인증 방식 | Bearer Token (JWT) |
| Content-Type | `application/json` |
| 응답 포맷 | JSON |

### 1.2 공통 헤더

```http
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
X-App-Version: 1.0.0
X-Platform: ios | android
X-Device-Id: <uuid>
Accept-Language: ko-KR | en-US
```

### 1.3 공통 응답 구조

#### 성공 응답
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-12T09:00:00Z",
    "requestId": "req_abc123"
  }
}
```

#### 페이지네이션 응답
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": { ... }
}
```

#### 에러 응답
```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "인증이 만료되었습니다.",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2025-01-12T09:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 2. 에러 코드 정의

### 2.1 인증 에러 (AUTH)

| 코드 | HTTP Status | 메시지 | 설명 |
|------|-------------|--------|------|
| `AUTH_001` | 401 | 인증이 만료되었습니다 | Access Token 만료 |
| `AUTH_002` | 401 | 유효하지 않은 토큰입니다 | 토큰 형식 오류/변조 |
| `AUTH_003` | 401 | 로그인이 필요합니다 | 토큰 미제공 |
| `AUTH_004` | 403 | 접근 권한이 없습니다 | 리소스 권한 없음 |
| `AUTH_005` | 401 | 소셜 인증에 실패했습니다 | OAuth 실패 |
| `AUTH_006` | 401 | Refresh Token이 만료되었습니다 | 재로그인 필요 |
| `AUTH_007` | 429 | 로그인 시도가 너무 많습니다 | Rate limit 초과 |

### 2.2 유효성 에러 (VALID)

| 코드 | HTTP Status | 메시지 | 설명 |
|------|-------------|--------|------|
| `VALID_001` | 400 | 필수 항목이 누락되었습니다 | Required field missing |
| `VALID_002` | 400 | 형식이 올바르지 않습니다 | Format validation 실패 |
| `VALID_003` | 400 | 값이 범위를 벗어났습니다 | Range validation 실패 |
| `VALID_004` | 400 | 중복된 값입니다 | Unique constraint 위반 |
| `VALID_005` | 413 | 파일 크기가 초과되었습니다 | File size limit |

### 2.3 비즈니스 에러 (BIZ)

| 코드 | HTTP Status | 메시지 | 설명 |
|------|-------------|--------|------|
| `BIZ_001` | 403 | 무료 이용 한도를 초과했습니다 | 일일 AI 상담 3회 초과 |
| `BIZ_002` | 403 | 프로 구독이 필요합니다 | Pro 전용 기능 접근 |
| `BIZ_003` | 404 | 리소스를 찾을 수 없습니다 | Not found |
| `BIZ_004` | 409 | 이미 존재하는 리소스입니다 | Conflict |
| `BIZ_005` | 403 | 그룹 인원이 초과되었습니다 | 그룹 인원 제한 |
| `BIZ_006` | 403 | 루틴 개수가 초과되었습니다 | 무료 5개 제한 |

### 2.4 서버 에러 (SYS)

| 코드 | HTTP Status | 메시지 | 설명 |
|------|-------------|--------|------|
| `SYS_001` | 500 | 서버 오류가 발생했습니다 | Internal error |
| `SYS_002` | 503 | 서비스 점검 중입니다 | Maintenance |
| `SYS_003` | 504 | 요청 시간이 초과되었습니다 | Gateway timeout |
| `SYS_004` | 502 | 외부 서비스 오류입니다 | AI API 등 외부 연동 실패 |

---

## 3. 인증 API (Authentication)

### 3.1 소셜 로그인

#### POST `/auth/social`

소셜 로그인으로 인증 및 회원가입을 처리합니다.

**Request**
```json
{
  "provider": "google" | "apple" | "kakao",
  "token": "소셜_제공자_access_token",
  "deviceInfo": {
    "deviceId": "uuid",
    "platform": "ios" | "android",
    "pushToken": "fcm_token_optional"
  }
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "name": "홍길동",
      "profileImage": "https://cdn.godlife.app/profiles/...",
      "provider": "google",
      "isNewUser": false,
      "subscription": {
        "plan": "basic" | "pro",
        "expiresAt": "2025-12-31T23:59:59Z"
      }
    }
  }
}
```

### 3.2 토큰 갱신

#### POST `/auth/refresh`

Access Token을 갱신합니다.

**Request**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "tokenType": "Bearer"
  }
}
```

**Response 401** (Refresh Token 만료)
```json
{
  "success": false,
  "error": {
    "code": "AUTH_006",
    "message": "Refresh Token이 만료되었습니다"
  }
}
```

### 3.3 로그아웃

#### POST `/auth/logout`

현재 세션을 종료합니다.

**Request**
```json
{
  "deviceId": "uuid"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "message": "로그아웃되었습니다"
  }
}
```

---

## 4. 사용자 API (Users)

### 4.1 온보딩 정보 저장

#### PUT `/users/me/onboarding`

최초 가입 시 온보딩 정보를 저장합니다.

**Request**
```json
{
  "interests": ["prayer", "bible", "exercise", "reading"],
  "isFaithUser": true,
  "coachingStyle": "F" | "T",
  "themeMode": "faith" | "universal",
  "notificationEnabled": true,
  "preferredNotificationTime": "07:00"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "onboardingCompleted": true,
    "user": { ... }
  }
}
```

### 4.2 프로필 조회

#### GET `/users/me`

현재 사용자의 프로필을 조회합니다.

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "홍길동",
    "profileImage": "https://cdn.godlife.app/...",
    "settings": {
      "themeMode": "faith",
      "coachingStyle": "F",
      "darkMode": "system",
      "language": "ko"
    },
    "subscription": {
      "plan": "pro",
      "expiresAt": "2025-12-31T23:59:59Z",
      "autoRenew": true
    },
    "stats": {
      "totalRoutines": 8,
      "currentStreak": 14,
      "longestStreak": 30,
      "totalCompletions": 256
    },
    "createdAt": "2024-06-15T10:30:00Z"
  }
}
```

### 4.3 프로필 수정

#### PATCH `/users/me`

**Request**
```json
{
  "name": "새이름",
  "profileImage": "base64_encoded_or_url"
}
```

### 4.4 설정 변경

#### PATCH `/users/me/settings`

**Request**
```json
{
  "themeMode": "universal",
  "coachingStyle": "T",
  "darkMode": "dark",
  "notificationEnabled": true
}
```

---

## 5. 홈 API (Home)

### 5.1 홈 데이터 조회

#### GET `/home`

홈 화면에 필요한 모든 데이터를 한 번에 조회합니다.

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| date | string | N | 조회 날짜 (YYYY-MM-DD), 기본값: 오늘 |

**Response 200**
```json
{
  "success": true,
  "data": {
    "insight": {
      "id": "ins_123",
      "type": "verse" | "quote",
      "content": "여호와는 나의 목자시니 내게 부족함이 없으리로다",
      "source": "시편 23:1",
      "author": null
    },
    "todayProgress": {
      "date": "2025-01-12",
      "totalRoutines": 5,
      "completedRoutines": 3,
      "completionRate": 60,
      "currentStreak": 14
    },
    "upcomingRoutines": [
      {
        "id": "rtn_abc",
        "name": "아침 기도",
        "scheduledTime": "06:30",
        "isCompleted": false,
        "streak": 14
      }
    ],
    "recentActivity": [
      {
        "type": "routine_completed",
        "routineName": "성경 읽기",
        "timestamp": "2025-01-12T07:15:00Z"
      }
    ]
  }
}
```

### 5.2 오늘의 인사이트 조회

#### GET `/home/insight`

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| mode | string | N | faith / universal (기본값: 사용자 설정) |

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "ins_123",
    "type": "verse",
    "content": "항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라",
    "source": "데살로니가전서 5:16-18",
    "reflection": "오늘 하루도 감사함으로 시작해보세요.",
    "imageUrl": "https://cdn.godlife.app/insights/..."
  }
}
```

---

## 6. 루틴 API (Routines)

### 6.1 루틴 목록 조회

#### GET `/routines`

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| date | string | N | 특정 날짜 루틴 (YYYY-MM-DD) |
| status | string | N | active / archived |
| page | number | N | 페이지 번호 (기본값: 1) |
| limit | number | N | 페이지당 개수 (기본값: 20) |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "rtn_abc123",
      "name": "아침 기도",
      "description": "하루를 시작하는 기도 시간",
      "icon": "pray",
      "color": "#7C3AED",
      "category": "spiritual" | "health" | "learning" | "productivity" | "custom",
      "schedule": {
        "type": "daily" | "weekly" | "custom",
        "time": "06:30",
        "days": [1, 2, 3, 4, 5, 6, 7],
        "reminderEnabled": true,
        "reminderMinutesBefore": 10
      },
      "streak": {
        "current": 14,
        "longest": 30
      },
      "todayStatus": {
        "isScheduled": true,
        "isCompleted": false,
        "completedAt": null
      },
      "createdAt": "2024-06-15T10:30:00Z",
      "updatedAt": "2025-01-10T08:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### 6.2 루틴 생성

#### POST `/routines`

**Request**
```json
{
  "name": "저녁 묵상",
  "description": "하루를 돌아보는 시간",
  "icon": "book",
  "color": "#4F46E5",
  "category": "spiritual",
  "schedule": {
    "type": "daily",
    "time": "21:00",
    "days": [1, 2, 3, 4, 5, 6, 7],
    "reminderEnabled": true,
    "reminderMinutesBefore": 15
  }
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "rtn_new123",
    "name": "저녁 묵상",
    ...
  }
}
```

**Response 403** (무료 유저 5개 초과)
```json
{
  "success": false,
  "error": {
    "code": "BIZ_006",
    "message": "루틴 개수가 초과되었습니다",
    "details": {
      "currentCount": 5,
      "maxCount": 5,
      "upgradeRequired": true
    }
  }
}
```

### 6.3 루틴 수정

#### PATCH `/routines/{routineId}`

**Request**
```json
{
  "name": "수정된 루틴명",
  "schedule": {
    "time": "07:00"
  }
}
```

### 6.4 루틴 삭제

#### DELETE `/routines/{routineId}`

**Response 200**
```json
{
  "success": true,
  "data": {
    "message": "루틴이 삭제되었습니다",
    "deletedId": "rtn_abc123"
  }
}
```

### 6.5 루틴 완료 처리

#### POST `/routines/{routineId}/complete`

**Request**
```json
{
  "date": "2025-01-12",
  "note": "오늘은 특별히 집중이 잘 되었다"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "routineId": "rtn_abc123",
    "completedAt": "2025-01-12T06:45:00Z",
    "streak": {
      "current": 15,
      "isNewRecord": false
    },
    "achievement": {
      "unlocked": true,
      "type": "streak_15",
      "title": "2주 연속 달성!"
    }
  }
}
```

### 6.6 루틴 완료 취소

#### DELETE `/routines/{routineId}/complete`

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| date | string | Y | 취소할 날짜 (YYYY-MM-DD) |

---

## 7. AI 코칭 API (Coaching)

### 7.1 대화 목록 조회

#### GET `/coaching/conversations`

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| page | number | N | 페이지 번호 |
| limit | number | N | 페이지당 개수 |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "conv_abc123",
      "title": "아침 루틴 개선하기",
      "lastMessage": "네, 내일부터 시작해볼게요!",
      "messageCount": 12,
      "hasReport": true,
      "createdAt": "2025-01-10T14:30:00Z",
      "updatedAt": "2025-01-10T15:45:00Z"
    }
  ],
  "pagination": { ... }
}
```

### 7.2 대화 상세 조회

#### GET `/coaching/conversations/{conversationId}`

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "conv_abc123",
    "title": "아침 루틴 개선하기",
    "messages": [
      {
        "id": "msg_001",
        "role": "user",
        "content": "아침에 일어나기가 너무 힘들어요",
        "timestamp": "2025-01-10T14:30:00Z"
      },
      {
        "id": "msg_002",
        "role": "assistant",
        "content": "많이 힘드시겠어요. 혹시 밤에 잠들기 어려우신가요?",
        "timestamp": "2025-01-10T14:30:15Z"
      }
    ],
    "report": {
      "id": "rpt_abc",
      "generatedAt": "2025-01-10T15:45:00Z"
    }
  }
}
```

### 7.3 메시지 전송

#### POST `/coaching/conversations/{conversationId}/messages`

**Request**
```json
{
  "content": "아침에 일어나기가 너무 힘들어요"
}
```

**Response 200** (스트리밍 가능)
```json
{
  "success": true,
  "data": {
    "userMessage": {
      "id": "msg_003",
      "role": "user",
      "content": "아침에 일어나기가 너무 힘들어요",
      "timestamp": "2025-01-12T09:00:00Z"
    },
    "assistantMessage": {
      "id": "msg_004",
      "role": "assistant",
      "content": "많이 힘드시겠어요. 혹시 취침 시간이 불규칙하신가요?",
      "timestamp": "2025-01-12T09:00:05Z"
    },
    "usage": {
      "dailyCount": 2,
      "dailyLimit": 3,
      "remaining": 1
    }
  }
}
```

**Response 403** (무료 유저 한도 초과)
```json
{
  "success": false,
  "error": {
    "code": "BIZ_001",
    "message": "무료 이용 한도를 초과했습니다",
    "details": {
      "dailyLimit": 3,
      "usedCount": 3,
      "resetAt": "2025-01-13T00:00:00Z",
      "upgradeRequired": true
    }
  }
}
```

### 7.4 새 대화 시작

#### POST `/coaching/conversations`

**Request**
```json
{
  "initialMessage": "요즘 집중이 잘 안 돼요"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv_new123",
    "title": "새로운 상담",
    "messages": [ ... ]
  }
}
```

### 7.5 컨설팅 리포트 생성

#### POST `/coaching/conversations/{conversationId}/report`

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "rpt_abc123",
    "conversationId": "conv_abc123",
    "diagnosis": {
      "summary": "수면 패턴 불규칙으로 인한 아침 기상 어려움",
      "details": [
        {
          "category": "sleep",
          "issue": "취침 시간 불규칙",
          "severity": "medium"
        }
      ]
    },
    "recommendations": [
      {
        "id": "rec_001",
        "type": "routine",
        "title": "수면 루틴 만들기",
        "description": "매일 밤 11시에 모든 전자기기를 끄고 취침 준비를 시작하세요.",
        "suggestedRoutine": {
          "name": "취침 준비",
          "time": "23:00",
          "category": "health"
        },
        "priority": "high"
      }
    ],
    "generatedAt": "2025-01-12T09:30:00Z"
  }
}
```

### 7.6 추천 루틴 추가

#### POST `/coaching/reports/{reportId}/add-routine`

리포트에서 추천된 루틴을 바로 내 루틴에 추가합니다.

**Request**
```json
{
  "recommendationId": "rec_001"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "routineId": "rtn_new456",
    "message": "루틴이 추가되었습니다"
  }
}
```

---

## 8. 소셜/그룹 API (Social)

### 8.1 그룹 목록 조회

#### GET `/groups`

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| type | string | N | joined / created |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "grp_abc123",
      "name": "아침 기도 모임",
      "description": "매일 아침 함께 기도해요",
      "memberCount": 5,
      "maxMembers": 10,
      "isOwner": true,
      "todayProgress": {
        "completedMembers": 3,
        "totalMembers": 5
      },
      "createdAt": "2024-09-01T00:00:00Z"
    }
  ]
}
```

### 8.2 그룹 생성

#### POST `/groups`

**Request**
```json
{
  "name": "독서 모임",
  "description": "매일 30분씩 함께 읽어요",
  "maxMembers": 10,
  "isPrivate": true
}
```

### 8.3 그룹 초대 링크 생성

#### POST `/groups/{groupId}/invite`

**Response 200**
```json
{
  "success": true,
  "data": {
    "inviteCode": "ABC123",
    "inviteUrl": "https://godlife.app/invite/ABC123",
    "expiresAt": "2025-01-19T00:00:00Z"
  }
}
```

### 8.4 그룹 가입

#### POST `/groups/join`

**Request**
```json
{
  "inviteCode": "ABC123"
}
```

### 8.5 그룹 진행 현황

#### GET `/groups/{groupId}/progress`

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| date | string | N | 조회 날짜 (YYYY-MM-DD) |

**Response 200**
```json
{
  "success": true,
  "data": {
    "date": "2025-01-12",
    "members": [
      {
        "userId": "usr_001",
        "name": "홍길동",
        "profileImage": "...",
        "completionRate": 80,
        "streak": 14,
        "isOnline": true
      }
    ],
    "groupStats": {
      "averageCompletion": 75,
      "groupStreak": 7
    }
  }
}
```

### 8.6 응원 메시지 보내기

#### POST `/groups/{groupId}/cheer`

**Request**
```json
{
  "targetUserId": "usr_002",
  "message": "화이팅! 💪",
  "type": "text" | "emoji"
}
```

---

## 9. 챌린지 API (Challenges)

### 9.1 챌린지 목록

#### GET `/challenges`

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| status | string | N | active / upcoming / completed |
| joined | boolean | N | 참여 중인 챌린지만 |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "chl_abc123",
      "title": "21일 감사 챌린지",
      "description": "매일 감사한 일 3가지를 기록해요",
      "startDate": "2025-01-01",
      "endDate": "2025-01-21",
      "totalDays": 21,
      "participantCount": 1234,
      "isJoined": true,
      "myProgress": {
        "completedDays": 12,
        "currentStreak": 5
      },
      "reward": {
        "type": "badge",
        "title": "감사 마스터"
      }
    }
  ]
}
```

### 9.2 챌린지 참여

#### POST `/challenges/{challengeId}/join`

### 9.3 챌린지 인증

#### POST `/challenges/{challengeId}/verify`

**Request**
```json
{
  "date": "2025-01-12",
  "content": "오늘 감사한 일: 1. 좋은 날씨 2. 맛있는 점심 3. 친구의 격려",
  "imageUrl": "https://..."
}
```

---

## 10. 통계 API (Statistics)

### 10.1 주간 통계

#### GET `/statistics/weekly`

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| weekStart | string | N | 주 시작일 (YYYY-MM-DD) |

**Response 200**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-01-06",
      "end": "2025-01-12"
    },
    "overview": {
      "totalCompletions": 28,
      "totalRoutines": 35,
      "completionRate": 80,
      "averageStreak": 12
    },
    "daily": [
      {
        "date": "2025-01-06",
        "completed": 4,
        "total": 5,
        "rate": 80
      }
    ],
    "byCategory": [
      {
        "category": "spiritual",
        "completed": 14,
        "total": 14,
        "rate": 100
      }
    ],
    "comparison": {
      "previousWeekRate": 75,
      "change": 5,
      "trend": "up"
    }
  }
}
```

### 10.2 월간 통계 (Pro)

#### GET `/statistics/monthly`

### 10.3 연간 통계 (Pro)

#### GET `/statistics/yearly`

### 10.4 성향 분석 (Pro)

#### GET `/statistics/personality`

**Response 200**
```json
{
  "success": true,
  "data": {
    "coachingStyle": "F",
    "preferredTime": "morning",
    "strongCategories": ["spiritual", "health"],
    "improvementAreas": ["learning"],
    "behaviorInsights": [
      {
        "insight": "아침 시간대에 가장 높은 달성률을 보입니다",
        "recommendation": "중요한 루틴을 오전에 배치해보세요"
      }
    ]
  }
}
```

---

## 11. 구독 API (Subscription)

### 11.1 구독 상태 조회

#### GET `/subscription`

**Response 200**
```json
{
  "success": true,
  "data": {
    "plan": "pro",
    "status": "active",
    "startDate": "2025-01-01",
    "expiresAt": "2025-12-31T23:59:59Z",
    "autoRenew": true,
    "paymentMethod": "apple_iap",
    "features": {
      "aiCoachingLimit": "unlimited",
      "routineLimit": "unlimited",
      "groupLimit": 10,
      "advancedStats": true
    }
  }
}
```

### 11.2 구독 구매 검증

#### POST `/subscription/verify`

**Request**
```json
{
  "platform": "ios" | "android",
  "receipt": "base64_encoded_receipt",
  "productId": "godlife_pro_monthly"
}
```

---

## 12. 알림 API (Notifications)

### 12.1 알림 목록

#### GET `/notifications`

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "ntf_abc123",
      "type": "routine_reminder" | "group_cheer" | "challenge_update" | "achievement",
      "title": "아침 기도 시간이에요",
      "body": "오늘도 기도로 하루를 시작해보세요",
      "data": {
        "routineId": "rtn_abc"
      },
      "isRead": false,
      "createdAt": "2025-01-12T06:20:00Z"
    }
  ]
}
```

### 12.2 알림 읽음 처리

#### PATCH `/notifications/{notificationId}/read`

### 12.3 푸시 토큰 등록

#### POST `/notifications/token`

**Request**
```json
{
  "token": "fcm_token",
  "platform": "ios" | "android",
  "deviceId": "uuid"
}
```

---

## 13. Rate Limiting

### 13.1 제한 정책

| 엔드포인트 | 무료 유저 | Pro 유저 |
|-----------|----------|----------|
| AI 코칭 메시지 | 3회/일 | 500회/월 |
| API 전체 | 100회/분 | 300회/분 |
| 파일 업로드 | 10MB/파일 | 50MB/파일 |

### 13.2 Rate Limit 헤더

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705050000
```

---

## 14. Webhook Events

### 14.1 이벤트 타입

| 이벤트 | 설명 |
|--------|------|
| `subscription.created` | 구독 시작 |
| `subscription.renewed` | 구독 갱신 |
| `subscription.cancelled` | 구독 취소 |
| `subscription.expired` | 구독 만료 |

### 14.2 Payload 구조

```json
{
  "event": "subscription.created",
  "timestamp": "2025-01-12T00:00:00Z",
  "data": {
    "userId": "usr_abc123",
    "subscriptionId": "sub_xyz789",
    "plan": "pro"
  }
}
```
