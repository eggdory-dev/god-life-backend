# God Life App - 개발 가이드

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [아키텍처](#아키텍처)
3. [프로젝트 구조](#프로젝트-구조)
4. [개발 환경 설정](#개발-환경-설정)
5. [코드 생성](#코드-생성)
6. [주요 기능 구현 가이드](#주요-기능-구현-가이드)
7. [코딩 컨벤션](#코딩-컨벤션)
8. [테스트](#테스트)

---

## 프로젝트 개요

**God Life**는 신앙 기반 습관 관리 및 AI 코칭 앱입니다.

### 핵심 기능

- **테마 전환**: Faith(신앙 기반) / Universal(일반) 테마
- **루틴 관리**: 최대 5개 활성 루틴, 20개 보관함
- **AI 코칭**: 개인화된 대화형 코칭 (일일 제한)
- **리포트**: 주간/월간 성장 분석
- **알림**: 루틴 리마인더, FCM 푸시

### 기술 스택

- **프레임워크**: Flutter 3.9+
- **상태관리**: Riverpod 2.5+
- **네트워크**: Dio + Retrofit
- **로컬 DB**: Drift (SQLite)
- **라우팅**: GoRouter
- **코드 생성**: Freezed, JsonSerializable

---

## 아키텍처

### Clean Architecture (3-Layer)

```
┌─────────────────────────────────────────────┐
│         Presentation Layer                  │
│  (Screens, Widgets, Providers)              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          Domain Layer                       │
│  (Entities, Use Cases, Repository Interface)│
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│           Data Layer                        │
│  (Models, Repository Impl, Data Sources)    │
└─────────────────────────────────────────────┘
```

### 레이어별 책임

#### 1. **Presentation Layer** (`lib/presentation/`)

- UI 렌더링 (Screens, Widgets)
- 사용자 입력 처리
- 상태 관리 (Riverpod Providers)
- UI 로직만 포함, 비즈니스 로직은 Use Case에 위임

#### 2. **Domain Layer** (`lib/domain/`)

- 비즈니스 로직 (Use Cases)
- 엔티티 정의 (순수 Dart 객체)
- Repository 인터페이스 (추상 클래스)
- 외부 의존성 없음 (순수 Dart)

#### 3. **Data Layer** (`lib/data/`)

- Repository 구현체
- 데이터 소스 (Remote API, Local DB)
- 모델 (JSON 직렬화)
- 데이터 변환 (Model ↔ Entity)

#### 4. **Core Layer** (`lib/core/`)

- 공통 유틸리티
- 상수, Enum
- 테마, 스타일
- 에러 처리
- 네트워크 설정

---

## 프로젝트 구조

```
lib/
├── core/                          # 공통 레이어
│   ├── constants/                 # 상수, Enum
│   │   ├── app_constants.dart     # 앱 설정값
│   │   └── enums.dart             # Enum 정의
│   ├── errors/                    # 에러 처리
│   │   ├── exceptions.dart        # Exception 클래스
│   │   └── failures.dart          # Failure (freezed)
│   ├── network/                   # 네트워크 설정
│   │   ├── dio_client.dart        # Dio 인스턴스
│   │   └── interceptors/          # 인터셉터
│   ├── theme/                     # 테마
│   │   ├── app_theme.dart         # ThemeData
│   │   ├── app_colors.dart        # 색상 정의
│   │   └── app_text_styles.dart   # 텍스트 스타일
│   └── utils/                     # 유틸리티
│       ├── date_utils.dart        # 날짜 처리
│       └── validators.dart        # 입력 검증
│
├── data/                          # 데이터 레이어
│   ├── datasources/               # 데이터 소스
│   │   ├── local/                 # 로컬 DB (Drift)
│   │   └── remote/                # API 클라이언트 (Retrofit)
│   ├── models/                    # 데이터 모델 (JSON)
│   └── repositories/              # Repository 구현체
│
├── domain/                        # 도메인 레이어
│   ├── entities/                  # 엔티티 (순수 객체)
│   ├── repositories/              # Repository 인터페이스
│   └── usecases/                  # Use Case (비즈니스 로직)
│
├── presentation/                  # 프레젠테이션 레이어
│   ├── providers/                 # Riverpod Providers
│   ├── screens/                   # 화면
│   │   ├── onboarding/            # 온보딩
│   │   ├── home/                  # 홈
│   │   ├── routine/               # 루틴 관리
│   │   ├── coaching/              # AI 코칭
│   │   ├── report/                # 리포트
│   │   └── settings/              # 설정
│   └── widgets/                   # 재사용 위젯
│       ├── common/                # 공통 위젯
│       ├── routine/               # 루틴 관련
│       ├── coaching/              # 코칭 관련
│       └── report/                # 리포트 관련
│
└── main.dart                      # 앱 진입점
```

---

## 개발 환경 설정

### 1. 의존성 설치

```bash
flutter pub get
```

### 2. 코드 생성 실행

```bash
# 모든 코드 생성 (Freezed, JsonSerializable, Riverpod, Drift)
flutter pub run build_runner build --delete-conflicting-outputs

# Watch 모드 (파일 변경 시 자동 생성)
flutter pub run build_runner watch --delete-conflicting-outputs
```

### 3. Firebase 설정

```bash
# Firebase CLI 설치
npm install -g firebase-tools

# Firebase 로그인
firebase login

# FlutterFire CLI 설치
dart pub global activate flutterfire_cli

# Firebase 프로젝트 설정
flutterfire configure
```

### 4. 환경 변수 설정

`.env` 파일 생성 (루트 디렉토리):

```env
API_BASE_URL=https://api.godlife.app
SENTRY_DSN=your_sentry_dsn
```

---

## 코드 생성

### Freezed (불변 클래스)

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

@freezed
class User with _$User {
  const factory User({
    required String id,
    required String name,
    String? email,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}
```

### Riverpod Provider

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'user_provider.g.dart';

@riverpod
class UserNotifier extends _$UserNotifier {
  @override
  User? build() => null;

  void setUser(User user) {
    state = user;
  }
}
```

### Drift (로컬 DB)

```dart
import 'package:drift/drift.dart';

part 'database.g.dart';

class Routines extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().withLength(min: 1, max: 50)();
  TextColumn get description => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
}

@DriftDatabase(tables: [Routines])
class AppDatabase extends _$AppDatabase {
  AppDatabase(QueryExecutor e) : super(e);

  @override
  int get schemaVersion => 1;
}
```

---

## 주요 기능 구현 가이드

### 1. 새로운 기능 추가 플로우

#### Step 1: Entity 정의 (Domain)

```dart
// lib/domain/entities/routine.dart
class Routine {
  final String id;
  final String name;
  final String? description;
  final int streak;

  const Routine({
    required this.id,
    required this.name,
    this.description,
    required this.streak,
  });
}
```

#### Step 2: Repository Interface (Domain)

```dart
// lib/domain/repositories/routine_repository.dart
abstract class RoutineRepository {
  Future<Either<Failure, List<Routine>>> getRoutines();
  Future<Either<Failure, Routine>> createRoutine(Routine routine);
  Future<Either<Failure, void>> deleteRoutine(String id);
}
```

#### Step 3: Use Case (Domain)

```dart
// lib/domain/usecases/get_routines.dart
class GetRoutines {
  final RoutineRepository repository;

  GetRoutines(this.repository);

  Future<Either<Failure, List<Routine>>> call() async {
    return await repository.getRoutines();
  }
}
```

#### Step 4: Model (Data)

```dart
// lib/data/models/routine_model.dart
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

// Entity 변환
extension RoutineModelX on RoutineModel {
  Routine toEntity() => Routine(
        id: id,
        name: name,
        description: description,
        streak: streak,
      );
}
```

#### Step 5: Data Source (Data)

```dart
// lib/data/datasources/remote/routine_api.dart
@RestApi()
abstract class RoutineApi {
  factory RoutineApi(Dio dio) = _RoutineApi;

  @GET('/routines')
  Future<List<RoutineModel>> getRoutines();

  @POST('/routines')
  Future<RoutineModel> createRoutine(@Body() RoutineModel routine);
}
```

#### Step 6: Repository Implementation (Data)

```dart
// lib/data/repositories/routine_repository_impl.dart
class RoutineRepositoryImpl implements RoutineRepository {
  final RoutineApi api;

  RoutineRepositoryImpl(this.api);

  @override
  Future<Either<Failure, List<Routine>>> getRoutines() async {
    try {
      final models = await api.getRoutines();
      final entities = models.map((m) => m.toEntity()).toList();
      return Right(entities);
    } on ServerException catch (e) {
      return Left(Failure.server(message: e.message));
    } catch (e) {
      return Left(Failure.unknown(message: e.toString()));
    }
  }
}
```

#### Step 7: Provider (Presentation)

```dart
// lib/presentation/providers/routine_provider.dart
@riverpod
class RoutineList extends _$RoutineList {
  @override
  Future<List<Routine>> build() async {
    final useCase = ref.read(getRoutinesUseCaseProvider);
    final result = await useCase();

    return result.fold(
      (failure) => throw failure,
      (routines) => routines,
    );
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => build());
  }
}
```

#### Step 8: UI (Presentation)

```dart
// lib/presentation/screens/routine/routine_screen.dart
class RoutineScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final routinesAsync = ref.watch(routineListProvider);

    return Scaffold(
      body: routinesAsync.when(
        data: (routines) => ListView.builder(
          itemCount: routines.length,
          itemBuilder: (context, index) {
            final routine = routines[index];
            return RoutineCard(routine: routine);
          },
        ),
        loading: () => const CircularProgressIndicator(),
        error: (error, stack) => ErrorWidget(error),
      ),
    );
  }
}
```

---

## 코딩 컨벤션

### 네이밍

- **클래스**: PascalCase (`UserProfile`)
- **변수/함수**: camelCase (`getUserData`)
- **상수**: camelCase with const (`const maxRetryCount = 3`)
- **파일명**: snake_case (`user_profile.dart`)
- **Private**: underscore prefix (`_privateMethod`)

### 파일 구조

```dart
// 1. Imports (Dart SDK → Flutter → Package → Relative)
import 'dart:async';

import 'package:flutter/material.dart';

import 'package:dio/dio.dart';
import 'package:riverpod/riverpod.dart';

import '../core/constants/enums.dart';

// 2. Part 선언
part 'user.freezed.dart';
part 'user.g.dart';

// 3. 클래스 정의
class User {
  // ...
}
```

### 주석

```dart
/// 사용자 정보를 가져옵니다.
///
/// [userId]가 null이면 현재 로그인한 사용자 정보를 반환합니다.
///
/// Returns:
///   - Right(User): 성공 시 사용자 정보
///   - Left(Failure): 실패 시 에러 정보
Future<Either<Failure, User>> getUser(String? userId) async {
  // 구현
}
```

---

## 테스트

### Unit Test

```dart
// test/domain/usecases/get_routines_test.dart
void main() {
  late GetRoutines useCase;
  late MockRoutineRepository mockRepository;

  setUp(() {
    mockRepository = MockRoutineRepository();
    useCase = GetRoutines(mockRepository);
  });

  test('should return list of routines from repository', () async {
    // Arrange
    final routines = [Routine(id: '1', name: 'Test', streak: 0)];
    when(mockRepository.getRoutines())
        .thenAnswer((_) async => Right(routines));

    // Act
    final result = await useCase();

    // Assert
    expect(result, Right(routines));
    verify(mockRepository.getRoutines());
  });
}
```

### Widget Test

```dart
// test/presentation/widgets/routine_card_test.dart
void main() {
  testWidgets('RoutineCard displays routine name', (tester) async {
    final routine = Routine(id: '1', name: 'Test Routine', streak: 5);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: RoutineCard(routine: routine),
        ),
      ),
    );

    expect(find.text('Test Routine'), findsOneWidget);
    expect(find.text('5'), findsOneWidget);
  });
}
```

### Integration Test

```bash
# 통합 테스트 실행
flutter test integration_test/app_test.dart
```

---

## 다음 단계

1. **패키지 설치**: `flutter pub get`
2. **코드 생성**: `flutter pub run build_runner build --delete-conflicting-outputs`
3. **Firebase 설정**: `flutterfire configure`
4. **앱 실행**: `flutter run`

---

## 참고 자료

- [Flutter 공식 문서](https://docs.flutter.dev/)
- [Riverpod 문서](https://riverpod.dev/)
- [Drift 문서](https://drift.simonbinder.eu/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
