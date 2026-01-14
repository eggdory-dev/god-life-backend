# God Life App - 프로젝트 구조 상세

## 📁 전체 디렉토리 구조

```
god-life-app/
├── android/                    # Android 네이티브 코드
├── ios/                        # iOS 네이티브 코드
├── lib/                        # Flutter 소스 코드
│   ├── core/                   # 공통 레이어
│   ├── data/                   # 데이터 레이어
│   ├── domain/                 # 도메인 레이어
│   ├── presentation/           # 프레젠테이션 레이어
│   └── main.dart               # 앱 진입점
├── test/                       # 단위 테스트
├── integration_test/           # 통합 테스트
├── docs/                       # 문서
│   ├── prd.md                  # 제품 요구사항 문서
│   ├── DEVELOPMENT_GUIDE.md    # 개발 가이드
│   └── PROJECT_STRUCTURE.md    # 이 문서
├── assets/                     # 리소스 (이미지, 폰트 등)
├── pubspec.yaml                # 패키지 의존성
├── analysis_options.yaml       # Lint 규칙
└── README.md                   # 프로젝트 소개
```

---

## 🎯 Core Layer (`lib/core/`)

공통으로 사용되는 코드, 모든 레이어에서 접근 가능

### `constants/`

앱 전역 상수 및 Enum 정의

```
constants/
├── app_constants.dart      # 앱 설정값
│   ├── AppConstants        # 일반 상수 (최대 루틴 수, 타임아웃 등)
│   ├── ApiEndpoints        # API 엔드포인트
│   └── StorageKeys         # SharedPreferences 키
└── enums.dart              # Enum 정의
    ├── AppTheme            # Faith / Universal
    ├── PersonalityType     # F / T
    ├── RoutineStatus       # active / archived / deleted
    ├── RoutineFrequency    # daily / weekly / custom
    └── ReportType          # daily / weekly / monthly
```

### `errors/`

에러 처리 관련

```
errors/
├── exceptions.dart         # Exception 클래스
│   ├── ServerException
│   ├── NetworkException
│   ├── CacheException
│   └── AuthenticationException
└── failures.dart           # Failure (Freezed)
    └── Failure             # Either<Failure, T> 패턴
```

### `network/`

네트워크 설정 및 인터셉터

```
network/
├── dio_client.dart         # Dio 인스턴스 Provider
└── interceptors/
    ├── auth_interceptor.dart       # JWT 토큰 자동 추가
    ├── error_interceptor.dart      # 에러 변환
    └── logging_interceptor.dart    # 로그 출력
```

### `theme/`

앱 테마 및 스타일

```
theme/
├── app_theme.dart          # ThemeData (Faith/Universal)
├── app_colors.dart         # 색상 정의
└── app_text_styles.dart    # 텍스트 스타일
```

### `utils/`

유틸리티 함수

```
utils/
├── date_utils.dart         # 날짜 포맷팅, 계산
└── validators.dart         # 입력 검증 (이메일, 비밀번호 등)
```

---

## 💾 Data Layer (`lib/data/`)

외부 데이터 소스와의 통신, Repository 구현

### `datasources/`

#### `local/` - 로컬 데이터베이스 (Drift)

```
local/
├── database.dart           # Drift Database 정의
├── tables/
│   ├── routine_table.dart  # 루틴 테이블
│   ├── coaching_table.dart # 코칭 세션 테이블
│   └── report_table.dart   # 리포트 테이블
└── daos/
    ├── routine_dao.dart    # 루틴 DAO
    └── coaching_dao.dart   # 코칭 DAO
```

#### `remote/` - API 클라이언트 (Retrofit)

```
remote/
├── auth_api.dart           # 인증 API
├── routine_api.dart        # 루틴 API
├── coaching_api.dart       # 코칭 API
├── report_api.dart         # 리포트 API
└── user_api.dart           # 사용자 API
```

### `models/`

JSON 직렬화 모델 (Freezed + JsonSerializable)

```
models/
├── user_model.dart         # 사용자 모델
├── routine_model.dart      # 루틴 모델
├── coaching_model.dart     # 코칭 세션 모델
├── message_model.dart      # 메시지 모델
└── report_model.dart       # 리포트 모델
```

**예시:**

```dart
@freezed
class RoutineModel with _$RoutineModel {
  const factory RoutineModel({
    required String id,
    required String name,
    String? description,
    required int streak,
  }) = _RoutineModel;

  factory RoutineModel.fromJson(Map<String, dynamic> json) =>
      _$RoutineModelFromJson(json);
}
```

### `repositories/`

Repository 구현체 (Domain의 인터페이스 구현)

```
repositories/
├── auth_repository_impl.dart
├── routine_repository_impl.dart
├── coaching_repository_impl.dart
└── report_repository_impl.dart
```

---

## 🎨 Domain Layer (`lib/domain/`)

비즈니스 로직, 순수 Dart (외부 의존성 없음)

### `entities/`

순수 비즈니스 객체

```
entities/
├── user.dart               # 사용자 엔티티
├── routine.dart            # 루틴 엔티티
├── coaching_session.dart   # 코칭 세션 엔티티
├── message.dart            # 메시지 엔티티
└── report.dart             # 리포트 엔티티
```

**Model vs Entity:**

- **Model**: JSON 직렬화, API/DB 통신용
- **Entity**: 순수 비즈니스 객체, UI 로직용

### `repositories/`

Repository 인터페이스 (추상 클래스)

```
repositories/
├── auth_repository.dart
├── routine_repository.dart
├── coaching_repository.dart
└── report_repository.dart
```

**예시:**

```dart
abstract class RoutineRepository {
  Future<Either<Failure, List<Routine>>> getRoutines();
  Future<Either<Failure, Routine>> createRoutine(Routine routine);
  Future<Either<Failure, void>> completeRoutine(String id);
}
```

### `usecases/`

Use Case (비즈니스 로직 단위)

```
usecases/
├── auth/
│   ├── login.dart
│   ├── logout.dart
│   └── refresh_token.dart
├── routine/
│   ├── get_routines.dart
│   ├── create_routine.dart
│   ├── complete_routine.dart
│   └── archive_routine.dart
├── coaching/
│   ├── start_coaching_session.dart
│   ├── send_message.dart
│   └── get_coaching_history.dart
└── report/
    ├── generate_report.dart
    └── get_reports.dart
```

**Use Case 패턴:**

```dart
class GetRoutines {
  final RoutineRepository repository;

  GetRoutines(this.repository);

  Future<Either<Failure, List<Routine>>> call() async {
    return await repository.getRoutines();
  }
}
```

---

## 🖼️ Presentation Layer (`lib/presentation/`)

UI 및 상태 관리

### `providers/`

Riverpod Providers

```
providers/
├── auth_provider.dart          # 인증 상태
├── theme_provider.dart         # 테마 상태
├── routine_provider.dart       # 루틴 상태
├── coaching_provider.dart      # 코칭 상태
└── report_provider.dart        # 리포트 상태
```

**Provider 종류:**

- `Provider`: 읽기 전용
- `StateProvider`: 간단한 상태
- `StateNotifierProvider`: 복잡한 상태
- `FutureProvider`: 비동기 데이터
- `StreamProvider`: 스트림 데이터

### `screens/`

화면 단위 위젯

```
screens/
├── onboarding/
│   ├── onboarding_screen.dart          # 온보딩 메인
│   ├── theme_selection_screen.dart     # 테마 선택
│   └── personality_selection_screen.dart # F/T 선택
├── home/
│   ├── home_screen.dart                # 홈 대시보드
│   └── widgets/
│       ├── insight_card.dart           # 인사이트 카드
│       ├── streak_widget.dart          # 연속 달성 위젯
│       └── routine_summary.dart        # 루틴 요약
├── routine/
│   ├── routine_list_screen.dart        # 루틴 목록
│   ├── routine_detail_screen.dart      # 루틴 상세
│   ├── routine_create_screen.dart      # 루틴 생성
│   └── routine_archive_screen.dart     # 보관함
├── coaching/
│   ├── coaching_screen.dart            # 코칭 채팅
│   ├── coaching_history_screen.dart    # 코칭 히스토리
│   └── widgets/
│       ├── message_bubble.dart         # 메시지 버블
│       └── typing_indicator.dart       # 타이핑 인디케이터
├── report/
│   ├── report_list_screen.dart         # 리포트 목록
│   ├── report_detail_screen.dart       # 리포트 상세
│   └── widgets/
│       ├── report_card.dart            # 리포트 카드
│       └── routine_suggestion.dart     # 루틴 제안
└── settings/
    ├── settings_screen.dart            # 설정
    ├── profile_screen.dart             # 프로필
    └── notification_settings_screen.dart # 알림 설정
```

### `widgets/`

재사용 가능한 위젯

```
widgets/
├── common/
│   ├── app_button.dart             # 공통 버튼
│   ├── app_text_field.dart         # 공통 입력 필드
│   ├── loading_indicator.dart      # 로딩 인디케이터
│   ├── error_widget.dart           # 에러 위젯
│   └── empty_state.dart            # 빈 상태 위젯
├── routine/
│   ├── routine_card.dart           # 루틴 카드
│   ├── routine_progress.dart       # 루틴 진행률
│   └── streak_badge.dart           # 연속 달성 배지
├── coaching/
│   ├── coaching_input.dart         # 코칭 입력창
│   └── suggestion_chip.dart        # 제안 칩
└── report/
    ├── chart_widget.dart           # 차트
    └── insight_card.dart           # 인사이트 카드
```

---

## 🧪 Test (`test/`)

```
test/
├── core/
│   └── utils/
│       └── validators_test.dart
├── domain/
│   └── usecases/
│       └── get_routines_test.dart
├── data/
│   └── repositories/
│       └── routine_repository_impl_test.dart
└── presentation/
    └── widgets/
        └── routine_card_test.dart
```

---

## 📦 Assets (`assets/`)

```
assets/
├── images/
│   ├── logo.png
│   ├── onboarding/
│   └── icons/
├── fonts/
│   └── Pretendard/
└── lottie/
    ├── loading.json
    └── success.json
```

**pubspec.yaml 설정:**

```yaml
flutter:
  assets:
    - assets/images/
    - assets/lottie/
  fonts:
    - family: Pretendard
      fonts:
        - asset: assets/fonts/Pretendard/Pretendard-Regular.ttf
        - asset: assets/fonts/Pretendard/Pretendard-Bold.ttf
          weight: 700
```

---

## 🔄 데이터 흐름

```
User Action (UI)
    ↓
Screen/Widget
    ↓
Provider (Riverpod)
    ↓
Use Case (Domain)
    ↓
Repository Interface (Domain)
    ↓
Repository Implementation (Data)
    ↓
Data Source (Remote API / Local DB)
    ↓
Model → Entity 변환
    ↓
Provider 상태 업데이트
    ↓
UI 리렌더링
```

---

## 📝 파일 네이밍 규칙

| 타입       | 네이밍                        | 예시                      |
| ---------- | ----------------------------- | ------------------------- |
| Screen     | `*_screen.dart`               | `home_screen.dart`        |
| Widget     | `*_widget.dart` 또는 `*.dart` | `routine_card.dart`       |
| Provider   | `*_provider.dart`             | `routine_provider.dart`   |
| Repository | `*_repository.dart`           | `routine_repository.dart` |
| Use Case   | 동사 형태                     | `get_routines.dart`       |
| Model      | `*_model.dart`                | `routine_model.dart`      |
| Entity     | 명사 형태                     | `routine.dart`            |
| Test       | `*_test.dart`                 | `routine_test.dart`       |

---

## 🚀 다음 구현 순서

### Phase 1: MVP 기반 구조

1. ✅ Core Layer (완료)
2. 🔄 Domain Layer (진행 중)
   - Entities 정의
   - Repository 인터페이스
   - Use Cases
3. 🔄 Data Layer (진행 중)
   - Models
   - Data Sources
   - Repository 구현
4. 🔄 Presentation Layer (진행 중)
   - Providers
   - Screens
   - Widgets

### Phase 2: 기능 구현

1. 온보딩 플로우
2. 루틴 관리
3. AI 코칭
4. 리포트
5. 알림

### Phase 3: 최적화

1. 성능 최적화
2. 오프라인 지원
3. 에러 처리 강화
4. 테스트 커버리지 확대
