# Mock Data Guide - 갓생(God Life)

## 1. 개요

백엔드 API 준비 전까지 프론트엔드 개발을 위한 로컬 모크 데이터 가이드입니다.

### 1.1 모크 데이터 사용 시점

```
개발 단계          │  데이터 소스
─────────────────┼──────────────────────────
Phase 1: UI 개발  │  ✅ Mock Data (로컬)
Phase 2: API 연동 │  🔄 Mock + Real API (전환 가능)
Phase 3: 배포     │  ✅ Real API
```

---

## 2. 디렉토리 구조

```
lib/
└── core/
    └── mocks/
        ├── mock_data.dart                  # 모든 모크 데이터 export
        ├── data/
        │   ├── mock_users.dart             # 사용자 데이터
        │   ├── mock_routines.dart          # 루틴 데이터
        │   ├── mock_insights.dart          # 인사이트 데이터
        │   ├── mock_conversations.dart     # AI 대화 데이터
        │   └── mock_groups.dart            # 그룹 데이터
        ├── repositories/
        │   ├── mock_auth_repository.dart
        │   ├── mock_routine_repository.dart
        │   ├── mock_coaching_repository.dart
        │   └── mock_group_repository.dart
        └── utils/
            ├── mock_delay.dart             # 네트워크 지연 시뮬레이션
            └── mock_error.dart             # 에러 시뮬레이션
```

---

## 3. 환경 설정

### 3.1 환경 변수

```dart
// lib/core/config/environment.dart

enum Environment {
  development,
  staging,
  production,
}

class AppEnvironment {
  static Environment current = Environment.development;

  // Mock 사용 여부
  static bool get useMockData =>
    current == Environment.development && kDebugMode;

  // API Base URL
  static String get apiBaseUrl {
    switch (current) {
      case Environment.development:
        return 'http://localhost:3000/v1';
      case Environment.staging:
        return 'https://staging-api.godlife.app/v1';
      case Environment.production:
        return 'https://api.godlife.app/v1';
    }
  }
}
```

### 3.2 Feature Flag로 전환 가능

```dart
// lib/core/config/feature_flags.dart

class FeatureFlags {
  // 개별 기능별로 Mock 사용 여부 제어
  static const bool useMockAuth = true;
  static const bool useMockRoutines = true;
  static const bool useMockCoaching = true;
  static const bool useMockGroups = true;

  // 네트워크 지연 시뮬레이션 (ms)
  static const int mockDelay = 500;

  // 에러 시뮬레이션 확률 (0.0 ~ 1.0)
  static const double mockErrorRate = 0.0;
}
```

---

## 4. 모크 데이터 정의

### 4.1 사용자 데이터

```dart
// lib/core/mocks/data/mock_users.dart

import 'package:god_life_app/data/models/user_model.dart';

class MockUsers {
  static final currentUser = UserModel(
    id: 'usr_mock_001',
    email: 'test@example.com',
    name: '홍길동',
    profileImage: null,
    provider: 'google',
    isNewUser: false,
    settings: UserSettingsModel(
      themeMode: 'faith',
      coachingStyle: 'F',
      darkMode: 'system',
      language: 'ko',
      notificationEnabled: true,
      preferredNotificationTime: '07:00',
    ),
    subscription: SubscriptionModel(
      plan: 'basic',
      status: 'active',
      expiresAt: null,
      autoRenew: false,
    ),
    stats: UserStatsModel(
      totalRoutines: 5,
      currentStreak: 14,
      longestStreak: 30,
      totalCompletions: 256,
    ),
    createdAt: DateTime.now().subtract(const Duration(days: 60)),
  );

  static final proUser = currentUser.copyWith(
    id: 'usr_mock_002',
    name: '김프로',
    subscription: SubscriptionModel(
      plan: 'pro',
      status: 'active',
      expiresAt: DateTime.now().add(const Duration(days: 300)),
      autoRenew: true,
    ),
  );
}
```

### 4.2 루틴 데이터

```dart
// lib/core/mocks/data/mock_routines.dart

import 'package:god_life_app/data/models/routine_model.dart';

class MockRoutines {
  static final List<RoutineModel> activeRoutines = [
    RoutineModel(
      id: 'rtn_mock_001',
      name: '아침 기도',
      description: '하루를 시작하는 기도 시간',
      icon: 'pray',
      color: '#7C3AED',
      category: 'spiritual',
      schedule: ScheduleModel(
        type: 'daily',
        time: '06:30',
        days: [1, 2, 3, 4, 5, 6, 7],
        reminderEnabled: true,
        reminderMinutesBefore: 10,
      ),
      streak: StreakModel(
        current: 14,
        longest: 30,
      ),
      todayStatus: TodayStatusModel(
        isScheduled: true,
        isCompleted: false,
        completedAt: null,
      ),
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
    ),

    RoutineModel(
      id: 'rtn_mock_002',
      name: '성경 읽기',
      description: '매일 한 장씩 성경 읽기',
      icon: 'book',
      color: '#4F46E5',
      category: 'spiritual',
      schedule: ScheduleModel(
        type: 'daily',
        time: '07:00',
        days: [1, 2, 3, 4, 5, 6, 7],
        reminderEnabled: true,
        reminderMinutesBefore: 15,
      ),
      streak: StreakModel(
        current: 21,
        longest: 45,
      ),
      todayStatus: TodayStatusModel(
        isScheduled: true,
        isCompleted: true,
        completedAt: DateTime.now().subtract(const Duration(hours: 1)),
      ),
      createdAt: DateTime.now().subtract(const Duration(days: 45)),
      updatedAt: DateTime.now(),
    ),

    RoutineModel(
      id: 'rtn_mock_003',
      name: '운동',
      description: '30분 이상 운동하기',
      icon: 'dumbbell',
      color: '#10B981',
      category: 'health',
      schedule: ScheduleModel(
        type: 'weekly',
        time: '18:00',
        days: [1, 2, 3, 4, 5], // 주중
        reminderEnabled: true,
        reminderMinutesBefore: 30,
      ),
      streak: StreakModel(
        current: 7,
        longest: 12,
      ),
      todayStatus: TodayStatusModel(
        isScheduled: true,
        isCompleted: false,
        completedAt: null,
      ),
      createdAt: DateTime.now().subtract(const Duration(days: 20)),
      updatedAt: DateTime.now().subtract(const Duration(days: 2)),
    ),

    RoutineModel(
      id: 'rtn_mock_004',
      name: '저녁 묵상',
      description: '하루를 돌아보는 시간',
      icon: 'moon',
      color: '#8B5CF6',
      category: 'spiritual',
      schedule: ScheduleModel(
        type: 'daily',
        time: '21:00',
        days: [1, 2, 3, 4, 5, 6, 7],
        reminderEnabled: true,
        reminderMinutesBefore: 10,
      ),
      streak: StreakModel(
        current: 14,
        longest: 25,
      ),
      todayStatus: TodayStatusModel(
        isScheduled: true,
        isCompleted: false,
        completedAt: null,
      ),
      createdAt: DateTime.now().subtract(const Duration(days: 25)),
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
    ),

    RoutineModel(
      id: 'rtn_mock_005',
      name: '독서',
      description: '30분 이상 독서하기',
      icon: 'book-open',
      color: '#F59E0B',
      category: 'learning',
      schedule: ScheduleModel(
        type: 'daily',
        time: '22:00',
        days: [1, 2, 3, 4, 5, 6, 7],
        reminderEnabled: false,
        reminderMinutesBefore: 0,
      ),
      streak: StreakModel(
        current: 5,
        longest: 10,
      ),
      todayStatus: TodayStatusModel(
        isScheduled: true,
        isCompleted: false,
        completedAt: null,
      ),
      createdAt: DateTime.now().subtract(const Duration(days: 15)),
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
  ];

  // 보관된 루틴
  static final List<RoutineModel> archivedRoutines = [
    RoutineModel(
      id: 'rtn_mock_archive_001',
      name: '새벽 기도',
      description: '새벽 5시 기도',
      icon: 'sunrise',
      color: '#EC4899',
      category: 'spiritual',
      schedule: ScheduleModel(
        type: 'daily',
        time: '05:00',
        days: [1, 2, 3, 4, 5, 6, 7],
        reminderEnabled: true,
        reminderMinutesBefore: 10,
      ),
      streak: StreakModel(
        current: 0,
        longest: 60,
      ),
      todayStatus: TodayStatusModel(
        isScheduled: false,
        isCompleted: false,
        completedAt: null,
      ),
      status: 'archived',
      createdAt: DateTime.now().subtract(const Duration(days: 90)),
      updatedAt: DateTime.now().subtract(const Duration(days: 10)),
    ),
  ];
}
```

### 4.3 인사이트 데이터

```dart
// lib/core/mocks/data/mock_insights.dart

import 'package:god_life_app/data/models/insight_model.dart';

class MockInsights {
  static final List<InsightModel> faithInsights = [
    InsightModel(
      id: 'ins_faith_001',
      type: 'verse',
      mode: 'faith',
      content: '항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라',
      source: '데살로니가전서 5:16-18',
      author: null,
      reflection: '오늘 하루도 감사함으로 시작해보세요. 어떤 일이 있어도 기뻐할 수 있는 이유를 찾아보는 것은 어떨까요?',
      imageUrl: null,
      date: DateTime.now(),
    ),

    InsightModel(
      id: 'ins_faith_002',
      type: 'verse',
      mode: 'faith',
      content: '여호와는 나의 목자시니 내게 부족함이 없으리로다',
      source: '시편 23:1',
      author: null,
      reflection: '하나님께서 우리의 필요를 채워주신다는 것을 기억하세요.',
      imageUrl: null,
      date: DateTime.now().subtract(const Duration(days: 1)),
    ),
  ];

  static final List<InsightModel> universalInsights = [
    InsightModel(
      id: 'ins_uni_001',
      type: 'quote',
      mode: 'universal',
      content: '오늘 할 수 있는 일을 내일로 미루지 마라',
      source: null,
      author: '벤자민 프랭클린',
      reflection: '작은 시작이라도 지금 바로 실천해보세요. 미래는 오늘의 선택으로 만들어집니다.',
      imageUrl: null,
      date: DateTime.now(),
    ),

    InsightModel(
      id: 'ins_uni_002',
      type: 'quote',
      mode: 'universal',
      content: '성공은 매일 반복한 작은 노력의 합이다',
      source: null,
      author: '로버트 콜리어',
      reflection: '꾸준함의 힘을 믿으세요. 오늘의 작은 실천이 내일의 큰 변화를 만듭니다.',
      imageUrl: null,
      date: DateTime.now().subtract(const Duration(days: 1)),
    ),
  ];

  // 현재 사용자 테마에 맞는 인사이트 가져오기
  static InsightModel getTodayInsight(String themeMode) {
    return themeMode == 'faith'
        ? faithInsights.first
        : universalInsights.first;
  }
}
```

### 4.4 AI 대화 데이터

```dart
// lib/core/mocks/data/mock_conversations.dart

import 'package:god_life_app/data/models/conversation_model.dart';
import 'package:god_life_app/data/models/message_model.dart';

class MockConversations {
  static final List<ConversationModel> conversations = [
    ConversationModel(
      id: 'conv_mock_001',
      title: '아침 루틴 개선하기',
      lastMessage: '네, 내일부터 시작해볼게요!',
      messageCount: 12,
      hasReport: true,
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 1)),
    ),

    ConversationModel(
      id: 'conv_mock_002',
      title: '집중력 향상',
      lastMessage: '좋은 방법이네요, 감사합니다',
      messageCount: 8,
      hasReport: false,
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
    ),

    ConversationModel(
      id: 'conv_mock_003',
      title: '운동 습관 만들기',
      lastMessage: '화이팅하세요!',
      messageCount: 15,
      hasReport: true,
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
      updatedAt: DateTime.now().subtract(const Duration(days: 3)),
    ),
  ];

  static final Map<String, List<MessageModel>> conversationMessages = {
    'conv_mock_001': [
      MessageModel(
        id: 'msg_001',
        conversationId: 'conv_mock_001',
        role: 'user',
        content: '아침에 일어나기가 너무 힘들어요',
        timestamp: DateTime.now().subtract(const Duration(hours: 2)),
      ),
      MessageModel(
        id: 'msg_002',
        conversationId: 'conv_mock_001',
        role: 'assistant',
        content: '많이 힘드시겠어요. 혹시 밤에 잠들기 어려우신가요?',
        timestamp: DateTime.now().subtract(const Duration(hours: 2, minutes: 1)),
      ),
      MessageModel(
        id: 'msg_003',
        conversationId: 'conv_mock_001',
        role: 'user',
        content: '네 맞아요. 폰을 너무 늦게까지 봐요',
        timestamp: DateTime.now().subtract(const Duration(hours: 2, minutes: 2)),
      ),
      MessageModel(
        id: 'msg_004',
        conversationId: 'conv_mock_001',
        role: 'assistant',
        content: '그렇군요. 취침 전 스마트폰 사용을 줄이면 수면의 질이 많이 개선될 수 있어요. 취침 1시간 전부터는 스마트폰을 침실 밖에 두는 건 어떨까요?',
        timestamp: DateTime.now().subtract(const Duration(hours: 2, minutes: 3)),
      ),
    ],
  };

  // AI 코칭 사용량
  static final CoachingUsageModel usage = CoachingUsageModel(
    dailyCount: 2,
    dailyLimit: 3,
    monthlyCount: 15,
    monthlyLimit: null, // null = unlimited (Pro)
    resetAt: DateTime.now().add(const Duration(hours: 10)), // 오늘 자정
  );
}
```

### 4.5 그룹 데이터

```dart
// lib/core/mocks/data/mock_groups.dart

import 'package:god_life_app/data/models/group_model.dart';

class MockGroups {
  static final List<GroupModel> groups = [
    GroupModel(
      id: 'grp_mock_001',
      name: '아침 기도 모임',
      description: '매일 아침 함께 기도해요',
      memberCount: 5,
      maxMembers: 10,
      isOwner: true,
      todayProgress: GroupProgressModel(
        completedMembers: 3,
        totalMembers: 5,
        completionRate: 60,
      ),
      members: [
        GroupMemberModel(
          userId: 'usr_mock_001',
          name: '홍길동',
          profileImage: null,
          completionRate: 80,
          streak: 14,
          isOnline: true,
        ),
        GroupMemberModel(
          userId: 'usr_mock_002',
          name: '김철수',
          profileImage: null,
          completionRate: 100,
          streak: 21,
          isOnline: true,
        ),
        GroupMemberModel(
          userId: 'usr_mock_003',
          name: '이영희',
          profileImage: null,
          completionRate: 40,
          streak: 7,
          isOnline: false,
        ),
        GroupMemberModel(
          userId: 'usr_mock_004',
          name: '박민수',
          profileImage: null,
          completionRate: 60,
          streak: 10,
          isOnline: false,
        ),
        GroupMemberModel(
          userId: 'usr_mock_005',
          name: '최지현',
          profileImage: null,
          completionRate: 80,
          streak: 15,
          isOnline: true,
        ),
      ],
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
    ),

    GroupModel(
      id: 'grp_mock_002',
      name: '독서 모임',
      description: '매일 30분씩 함께 읽어요',
      memberCount: 8,
      maxMembers: 10,
      isOwner: false,
      todayProgress: GroupProgressModel(
        completedMembers: 6,
        totalMembers: 8,
        completionRate: 75,
      ),
      members: [],
      createdAt: DateTime.now().subtract(const Duration(days: 15)),
    ),
  ];
}
```

---

## 5. Mock Repository 구현

### 5.1 Mock Auth Repository

```dart
// lib/core/mocks/repositories/mock_auth_repository.dart

import 'package:god_life_app/domain/repositories/auth_repository.dart';
import 'package:god_life_app/core/mocks/data/mock_users.dart';
import 'package:god_life_app/core/mocks/utils/mock_delay.dart';
import 'package:dartz/dartz.dart';

class MockAuthRepository implements AuthRepository {
  @override
  Future<Either<Failure, AuthResult>> socialLogin(
    String provider,
    String token,
  ) async {
    await MockDelay.simulate();

    // 성공 시나리오
    return Right(AuthResult(
      accessToken: 'mock_access_token_${DateTime.now().millisecondsSinceEpoch}',
      refreshToken: 'mock_refresh_token',
      expiresIn: 3600,
      user: MockUsers.currentUser,
    ));
  }

  @override
  Future<Either<Failure, AuthResult>> refreshToken(String refreshToken) async {
    await MockDelay.simulate(duration: 200);

    return Right(AuthResult(
      accessToken: 'mock_refreshed_token_${DateTime.now().millisecondsSinceEpoch}',
      refreshToken: refreshToken,
      expiresIn: 3600,
      user: MockUsers.currentUser,
    ));
  }

  @override
  Future<Either<Failure, User>> getCurrentUser() async {
    await MockDelay.simulate(duration: 300);
    return Right(MockUsers.currentUser.toEntity());
  }

  @override
  Future<Either<Failure, void>> logout() async {
    await MockDelay.simulate(duration: 200);
    return const Right(null);
  }
}
```

### 5.2 Mock Routine Repository

```dart
// lib/core/mocks/repositories/mock_routine_repository.dart

import 'package:god_life_app/domain/repositories/routine_repository.dart';
import 'package:god_life_app/core/mocks/data/mock_routines.dart';
import 'package:god_life_app/core/mocks/utils/mock_delay.dart';
import 'package:dartz/dartz.dart';

class MockRoutineRepository implements RoutineRepository {
  // 메모리에 저장 (앱 실행 중 유지)
  List<RoutineModel> _routines = List.from(MockRoutines.activeRoutines);

  @override
  Future<Either<Failure, List<Routine>>> getRoutines({DateTime? date}) async {
    await MockDelay.simulate();

    final entities = _routines.map((model) => model.toEntity()).toList();
    return Right(entities);
  }

  @override
  Future<Either<Failure, Routine>> getRoutineById(String id) async {
    await MockDelay.simulate();

    final routine = _routines.firstWhere(
      (r) => r.id == id,
      orElse: () => throw Exception('Routine not found'),
    );

    return Right(routine.toEntity());
  }

  @override
  Future<Either<Failure, Routine>> createRoutine(
    RoutineCreateRequest request,
  ) async {
    await MockDelay.simulate(duration: 800);

    final newRoutine = RoutineModel(
      id: 'rtn_mock_${DateTime.now().millisecondsSinceEpoch}',
      name: request.name,
      description: request.description,
      icon: request.icon ?? 'star',
      color: request.color ?? '#4F46E5',
      category: request.category,
      schedule: request.schedule,
      streak: StreakModel(current: 0, longest: 0),
      todayStatus: TodayStatusModel(
        isScheduled: true,
        isCompleted: false,
        completedAt: null,
      ),
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    _routines.add(newRoutine);
    return Right(newRoutine.toEntity());
  }

  @override
  Future<Either<Failure, void>> completeRoutine(String id) async {
    await MockDelay.simulate(duration: 500);

    final index = _routines.indexWhere((r) => r.id == id);
    if (index == -1) {
      return Left(Failure.notFound(message: 'Routine not found'));
    }

    _routines[index] = _routines[index].copyWith(
      todayStatus: TodayStatusModel(
        isScheduled: true,
        isCompleted: true,
        completedAt: DateTime.now(),
      ),
      streak: _routines[index].streak.copyWith(
        current: _routines[index].streak.current + 1,
      ),
    );

    return const Right(null);
  }

  @override
  Future<Either<Failure, void>> deleteRoutine(String id) async {
    await MockDelay.simulate(duration: 500);

    _routines.removeWhere((r) => r.id == id);
    return const Right(null);
  }

  // 캐싱 관련 (Mock에서는 항상 메모리)
  @override
  Future<List<Routine>> getCachedRoutines({DateTime? date}) async {
    return _routines.map((m) => m.toEntity()).toList();
  }

  @override
  Future<void> cacheRoutines(List<Routine> routines) async {
    // Mock에서는 no-op
  }
}
```

---

## 6. Provider 전환

### 6.1 Repository Provider 조건부 생성

```dart
// lib/core/providers/core_providers.dart

import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:god_life_app/core/config/feature_flags.dart';
import 'package:god_life_app/core/mocks/repositories/mock_auth_repository.dart';
import 'package:god_life_app/data/repositories/auth_repository_impl.dart';

part 'core_providers.g.dart';

@riverpod
AuthRepository authRepository(AuthRepositoryRef ref) {
  // Feature Flag에 따라 Mock/Real 전환
  if (FeatureFlags.useMockAuth) {
    return MockAuthRepository();
  }

  return AuthRepositoryImpl(
    dio: ref.watch(dioProvider),
    storage: ref.watch(secureStorageProvider),
  );
}

@riverpod
RoutineRepository routineRepository(RoutineRepositoryRef ref) {
  if (FeatureFlags.useMockRoutines) {
    return MockRoutineRepository();
  }

  return RoutineRepositoryImpl(
    dio: ref.watch(dioProvider),
    database: ref.watch(databaseProvider),
  );
}

@riverpod
CoachingRepository coachingRepository(CoachingRepositoryRef ref) {
  if (FeatureFlags.useMockCoaching) {
    return MockCoachingRepository();
  }

  return CoachingRepositoryImpl(
    dio: ref.watch(dioProvider),
  );
}
```

### 6.2 개발 중 실시간 전환

```dart
// lib/core/widgets/dev_tools_overlay.dart (개발 모드에서만 표시)

class DevToolsOverlay extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    if (!kDebugMode) return const SizedBox.shrink();

    return Positioned(
      bottom: 100,
      right: 16,
      child: FloatingActionButton(
        mini: true,
        child: const Icon(Icons.settings),
        onPressed: () {
          showModalBottomSheet(
            context: context,
            builder: (_) => const DevToolsSheet(),
          );
        },
      ),
    );
  }
}

class DevToolsSheet extends ConsumerWidget {
  const DevToolsSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('개발 도구', style: TextStyle(fontSize: 20)),
          const SizedBox(height: 16),

          SwitchListTile(
            title: const Text('Mock Auth 사용'),
            value: FeatureFlags.useMockAuth,
            onChanged: (value) {
              // Feature Flag 업데이트 (StatefulWidget 또는 StateProvider 사용)
              // ref.invalidate(authRepositoryProvider);
            },
          ),

          SwitchListTile(
            title: const Text('Mock Routines 사용'),
            value: FeatureFlags.useMockRoutines,
            onChanged: (value) {
              // ref.invalidate(routineRepositoryProvider);
            },
          ),

          const Divider(),

          ListTile(
            title: const Text('에러 시뮬레이션'),
            trailing: Text('${(FeatureFlags.mockErrorRate * 100).toInt()}%'),
          ),

          ListTile(
            title: const Text('네트워크 지연'),
            trailing: Text('${FeatureFlags.mockDelay}ms'),
          ),
        ],
      ),
    );
  }
}
```

---

## 7. 유틸리티

### 7.1 네트워크 지연 시뮬레이션

```dart
// lib/core/mocks/utils/mock_delay.dart

import 'package:god_life_app/core/config/feature_flags.dart';

class MockDelay {
  /// 네트워크 지연을 시뮬레이션합니다
  static Future<void> simulate({int? duration}) async {
    final delay = duration ?? FeatureFlags.mockDelay;
    await Future.delayed(Duration(milliseconds: delay));
  }

  /// 랜덤 지연 (최소/최대 범위)
  static Future<void> random({int min = 200, int max = 1000}) async {
    final delay = min + (max - min) * (DateTime.now().millisecond % 1000) / 1000;
    await Future.delayed(Duration(milliseconds: delay.toInt()));
  }
}
```

### 7.2 에러 시뮬레이션

```dart
// lib/core/mocks/utils/mock_error.dart

import 'dart:math';
import 'package:god_life_app/core/errors/failures.dart';
import 'package:god_life_app/core/config/feature_flags.dart';

class MockError {
  static final _random = Random();

  /// 설정된 확률에 따라 에러를 발생시킵니다
  static void maybeThrow() {
    if (_random.nextDouble() < FeatureFlags.mockErrorRate) {
      throw _randomError();
    }
  }

  static Failure _randomError() {
    final errors = [
      Failure.network(message: '네트워크 연결 오류'),
      Failure.server(message: '서버 오류'),
      Failure.timeout(message: '요청 시간 초과'),
    ];

    return errors[_random.nextInt(errors.length)];
  }

  /// 특정 에러 강제 발생
  static void throwNetworkError() {
    throw Failure.network(message: '네트워크 연결 오류');
  }

  static void throwServerError() {
    throw Failure.server(message: '서버 오류');
  }

  static void throwAuthError() {
    throw Failure.auth(code: 'AUTH_001', message: '인증이 만료되었습니다');
  }
}
```

---

## 8. 사용 예시

### 8.1 루틴 목록 로딩

```dart
// UI에서는 동일하게 사용 (Mock/Real 자동 전환)
@riverpod
class RoutineList extends _$RoutineList {
  @override
  Future<List<Routine>> build() async {
    // 이 부분은 Mock/Real과 무관하게 동일
    final repo = ref.watch(routineRepositoryProvider);
    return repo.getRoutines();
  }
}
```

### 8.2 개발 중 시나리오 테스트

```dart
// 에러 시나리오 테스트
void testErrorScenario() {
  // feature_flags.dart에서 mockErrorRate = 1.0으로 설정
  // 모든 요청이 에러 발생
}

// 느린 네트워크 테스트
void testSlowNetwork() {
  // feature_flags.dart에서 mockDelay = 3000으로 설정
  // 3초 지연 시뮬레이션
}
```

---

## 9. 실제 API로 전환 시

### 9.1 단계적 전환

```dart
// Phase 1: 모두 Mock
class FeatureFlags {
  static const bool useMockAuth = true;
  static const bool useMockRoutines = true;
  static const bool useMockCoaching = true;
}

// Phase 2: 인증만 Real
class FeatureFlags {
  static const bool useMockAuth = false;      // ✅ Real API
  static const bool useMockRoutines = true;
  static const bool useMockCoaching = true;
}

// Phase 3: 모두 Real
class FeatureFlags {
  static const bool useMockAuth = false;
  static const bool useMockRoutines = false;
  static const bool useMockCoaching = false;
}
```

### 9.2 QA/스테이징 환경

```dart
// lib/main_dev.dart (개발)
void main() {
  AppEnvironment.current = Environment.development;
  runApp(const App());
}

// lib/main_staging.dart (스테이징)
void main() {
  AppEnvironment.current = Environment.staging;
  // 스테이징은 실제 API 사용
  FeatureFlags.useMockAuth = false;
  FeatureFlags.useMockRoutines = false;
  runApp(const App());
}

// lib/main.dart (프로덕션)
void main() {
  AppEnvironment.current = Environment.production;
  runApp(const App());
}
```

---

## 10. 체크리스트

### 개발 시작 전
- [ ] `lib/core/mocks/` 디렉토리 생성
- [ ] 모든 모크 데이터 파일 작성
- [ ] Mock Repository 구현
- [ ] Feature Flags 설정
- [ ] Provider에 조건부 로직 추가

### UI 개발 중
- [ ] Mock 데이터로 모든 화면 구현
- [ ] 로딩 상태 처리
- [ ] 에러 상태 처리
- [ ] 빈 상태 처리

### API 연동 시
- [ ] 실제 API 엔드포인트 확인
- [ ] Response 구조 Mock과 일치 확인
- [ ] 단계적으로 Mock → Real 전환
- [ ] 각 단계마다 QA 진행

### 배포 전
- [ ] 모든 Feature Flags false로 변경
- [ ] Mock 관련 코드 제거 (또는 프로덕션 빌드에서 제외)
- [ ] 실제 API로 전체 테스트
