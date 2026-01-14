# State Management Guide - 갓생(God Life)

## 1. 상태 관리 아키텍처

### 1.1 선택 기술

**Riverpod 2.x** 사용

```yaml
# pubspec.yaml
dependencies:
  flutter_riverpod: ^2.5.0
  riverpod_annotation: ^2.3.0

dev_dependencies:
  riverpod_generator: ^2.4.0
  build_runner: ^2.4.0
```

### 1.2 상태 분류 체계

```
┌─────────────────────────────────────────────────────────────┐
│                     상태 분류 (State Categories)              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   Server State  │  │   Client State  │                   │
│  │   (서버 상태)    │  │   (클라이언트)   │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                            │
│     ┌─────┴─────┐        ┌─────┴─────┐                      │
│     │           │        │           │                      │
│  ┌──┴──┐    ┌──┴──┐   ┌──┴──┐   ┌──┴──┐                    │
│  │Async│    │Cache│   │Local│   │ UI  │                    │
│  │Data │    │Data │   │State│   │State│                    │
│  └─────┘    └─────┘   └─────┘   └─────┘                    │
│                                                             │
│  예시:                                                       │
│  - 루틴 목록    - 캐시된      - 테마     - 모달 열림         │
│  - 사용자 정보    사용자 정보  - 언어     - 폼 입력값        │
│  - AI 응답       - 오늘의 말씀  - 온보딩   - 스크롤 위치     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Provider 타입 선택 가이드

| Provider 타입 | 용도 | 예시 |
|---------------|------|------|
| `Provider` | 정적 값, 의존성 주입 | Repository, Service |
| `StateProvider` | 단순한 상태 | 선택된 탭 인덱스 |
| `StateNotifierProvider` | 복잡한 상태 + 로직 | 폼 상태, 필터 상태 |
| `FutureProvider` | 일회성 비동기 데이터 | 앱 초기화 |
| `StreamProvider` | 실시간 데이터 | 실시간 알림 |
| `AsyncNotifierProvider` | 비동기 상태 + 로직 | 루틴 목록, 사용자 정보 |

---

## 2. Provider 구조

### 2.1 디렉토리 구조

```
lib/
├── core/
│   └── providers/
│       ├── core_providers.dart      # 핵심 의존성
│       └── provider_logger.dart     # 디버깅용 로거
│
└── features/
    ├── auth/
    │   └── providers/
    │       ├── auth_provider.dart
    │       └── auth_state.dart
    │
    ├── home/
    │   └── providers/
    │       └── home_provider.dart
    │
    ├── routine/
    │   └── providers/
    │       ├── routine_list_provider.dart
    │       ├── routine_detail_provider.dart
    │       └── routine_form_provider.dart
    │
    ├── coaching/
    │   └── providers/
    │       ├── conversation_provider.dart
    │       └── message_provider.dart
    │
    └── settings/
        └── providers/
            ├── theme_provider.dart
            └── user_settings_provider.dart
```

### 2.2 핵심 Provider 정의

```dart
// lib/core/providers/core_providers.dart

import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'core_providers.g.dart';

// HTTP 클라이언트
@riverpod
Dio dio(DioRef ref) {
  final dio = Dio(BaseOptions(
    baseUrl: Environment.apiBaseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 30),
  ));
  
  // 인터셉터 추가
  dio.interceptors.addAll([
    AuthInterceptor(ref),
    LoggingInterceptor(),
    ErrorInterceptor(),
  ]);
  
  return dio;
}

// 로컬 데이터베이스
@riverpod
AppDatabase database(DatabaseRef ref) {
  return AppDatabase();
}

// SharedPreferences
@riverpod
Future<SharedPreferences> sharedPreferences(SharedPreferencesRef ref) async {
  return SharedPreferences.getInstance();
}

// Repository providers
@riverpod
AuthRepository authRepository(AuthRepositoryRef ref) {
  return AuthRepositoryImpl(
    dio: ref.watch(dioProvider),
    storage: ref.watch(secureStorageProvider),
  );
}

@riverpod
RoutineRepository routineRepository(RoutineRepositoryRef ref) {
  return RoutineRepositoryImpl(
    dio: ref.watch(dioProvider),
    database: ref.watch(databaseProvider),
  );
}

@riverpod
CoachingRepository coachingRepository(CoachingRepositoryRef ref) {
  return CoachingRepositoryImpl(
    dio: ref.watch(dioProvider),
  );
}
```

---

## 3. 기능별 상태 관리

### 3.1 인증 상태

```dart
// lib/features/auth/providers/auth_state.dart

@freezed
class AuthState with _$AuthState {
  const factory AuthState({
    @Default(AuthStatus.initial) AuthStatus status,
    User? user,
    String? accessToken,
    String? refreshToken,
    DateTime? tokenExpiresAt,
    String? errorMessage,
  }) = _AuthState;
  
  const AuthState._();
  
  bool get isAuthenticated => 
    status == AuthStatus.authenticated && user != null;
  
  bool get isTokenExpired =>
    tokenExpiresAt != null && DateTime.now().isAfter(tokenExpiresAt!);
}

enum AuthStatus {
  initial,
  loading,
  authenticated,
  unauthenticated,
  error,
}
```

```dart
// lib/features/auth/providers/auth_provider.dart

@riverpod
class Auth extends _$Auth {
  @override
  Future<AuthState> build() async {
    // 저장된 토큰 확인
    final storage = ref.watch(secureStorageProvider);
    final accessToken = await storage.read(key: 'access_token');
    final refreshToken = await storage.read(key: 'refresh_token');
    
    if (accessToken == null) {
      return const AuthState(status: AuthStatus.unauthenticated);
    }
    
    // 토큰 유효성 검증
    try {
      final repo = ref.watch(authRepositoryProvider);
      final user = await repo.getCurrentUser();
      return AuthState(
        status: AuthStatus.authenticated,
        user: user,
        accessToken: accessToken,
        refreshToken: refreshToken,
      );
    } catch (e) {
      // 토큰 만료 시 갱신 시도
      if (refreshToken != null) {
        return _refreshToken(refreshToken);
      }
      return const AuthState(status: AuthStatus.unauthenticated);
    }
  }
  
  Future<void> loginWithSocial(String provider, String token) async {
    state = const AsyncValue.loading();
    
    try {
      final repo = ref.read(authRepositoryProvider);
      final result = await repo.socialLogin(provider, token);
      
      // 토큰 저장
      final storage = ref.read(secureStorageProvider);
      await storage.write(key: 'access_token', value: result.accessToken);
      await storage.write(key: 'refresh_token', value: result.refreshToken);
      
      state = AsyncValue.data(AuthState(
        status: AuthStatus.authenticated,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      ));
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
  
  Future<void> logout() async {
    final storage = ref.read(secureStorageProvider);
    await storage.deleteAll();
    
    state = const AsyncValue.data(
      AuthState(status: AuthStatus.unauthenticated),
    );
  }
  
  Future<AuthState> _refreshToken(String refreshToken) async {
    try {
      final repo = ref.read(authRepositoryProvider);
      final result = await repo.refreshToken(refreshToken);
      
      final storage = ref.read(secureStorageProvider);
      await storage.write(key: 'access_token', value: result.accessToken);
      
      return AuthState(
        status: AuthStatus.authenticated,
        accessToken: result.accessToken,
        refreshToken: refreshToken,
      );
    } catch (e) {
      return const AuthState(status: AuthStatus.unauthenticated);
    }
  }
}
```

### 3.2 루틴 상태

```dart
// lib/features/routine/providers/routine_list_provider.dart

@riverpod
class RoutineList extends _$RoutineList {
  @override
  Future<List<Routine>> build({DateTime? date}) async {
    final repo = ref.watch(routineRepositoryProvider);
    
    // 캐시 우선 로드
    final cached = await repo.getCachedRoutines(date: date);
    if (cached.isNotEmpty) {
      // 백그라운드에서 서버 동기화
      _syncWithServer(date);
      return cached;
    }
    
    // 서버에서 로드
    return repo.getRoutines(date: date);
  }
  
  Future<void> _syncWithServer(DateTime? date) async {
    try {
      final repo = ref.read(routineRepositoryProvider);
      final serverData = await repo.getRoutines(date: date);
      
      // 로컬 캐시 업데이트
      await repo.cacheRoutines(serverData);
      
      // 상태 업데이트
      state = AsyncValue.data(serverData);
    } catch (e) {
      // 동기화 실패는 무시 (캐시 데이터 유지)
    }
  }
  
  // Optimistic Update로 루틴 완료 처리
  Future<void> completeRoutine(String routineId) async {
    final previousState = state;
    
    // 1. 즉시 UI 업데이트 (Optimistic)
    state = state.whenData((routines) {
      return routines.map((r) {
        if (r.id == routineId) {
          return r.copyWith(
            todayStatus: r.todayStatus.copyWith(isCompleted: true),
          );
        }
        return r;
      }).toList();
    });
    
    // 2. 서버 요청
    try {
      final repo = ref.read(routineRepositoryProvider);
      await repo.completeRoutine(routineId);
      
      // 3. 관련 상태 무효화
      ref.invalidate(homeDataProvider);
      ref.invalidate(weeklyStatsProvider);
    } catch (e) {
      // 4. 실패 시 롤백
      state = previousState;
      rethrow;
    }
  }
  
  Future<void> addRoutine(RoutineCreateRequest request) async {
    final repo = ref.read(routineRepositoryProvider);
    final newRoutine = await repo.createRoutine(request);
    
    // 목록에 추가
    state = state.whenData((routines) => [...routines, newRoutine]);
  }
  
  Future<void> deleteRoutine(String routineId) async {
    final previousState = state;
    
    // Optimistic delete
    state = state.whenData(
      (routines) => routines.where((r) => r.id != routineId).toList(),
    );
    
    try {
      final repo = ref.read(routineRepositoryProvider);
      await repo.deleteRoutine(routineId);
    } catch (e) {
      state = previousState;
      rethrow;
    }
  }
  
  // Pull to Refresh
  Future<void> refresh() async {
    ref.invalidateSelf();
  }
}

// 단일 루틴 조회 (Family Provider)
@riverpod
Future<Routine> routineDetail(RoutineDetailRef ref, String routineId) async {
  final repo = ref.watch(routineRepositoryProvider);
  return repo.getRoutineById(routineId);
}
```

### 3.3 AI 코칭 상태

```dart
// lib/features/coaching/providers/conversation_provider.dart

@riverpod
class ConversationList extends _$ConversationList {
  @override
  Future<List<Conversation>> build() async {
    final repo = ref.watch(coachingRepositoryProvider);
    return repo.getConversations();
  }
  
  Future<Conversation> startNewConversation(String initialMessage) async {
    final repo = ref.read(coachingRepositoryProvider);
    final conversation = await repo.createConversation(initialMessage);
    
    // 목록 맨 앞에 추가
    state = state.whenData((list) => [conversation, ...list]);
    
    return conversation;
  }
}

// 메시지 스트리밍을 위한 상태
@riverpod
class ChatMessages extends _$ChatMessages {
  @override
  Future<List<Message>> build(String conversationId) async {
    final repo = ref.watch(coachingRepositoryProvider);
    return repo.getMessages(conversationId);
  }
  
  Future<void> sendMessage(String content) async {
    final conversationId = this.conversationId;
    
    // 사용자 메시지 즉시 추가
    final userMessage = Message(
      id: 'temp_${DateTime.now().millisecondsSinceEpoch}',
      role: MessageRole.user,
      content: content,
      timestamp: DateTime.now(),
    );
    
    state = state.whenData((messages) => [...messages, userMessage]);
    
    // AI 응답 (스트리밍)
    final aiMessage = Message(
      id: 'temp_ai_${DateTime.now().millisecondsSinceEpoch}',
      role: MessageRole.assistant,
      content: '',
      timestamp: DateTime.now(),
      isStreaming: true,
    );
    
    state = state.whenData((messages) => [...messages, aiMessage]);
    
    try {
      final repo = ref.read(coachingRepositoryProvider);
      
      await for (final chunk in repo.sendMessageStream(conversationId, content)) {
        state = state.whenData((messages) {
          final lastIndex = messages.length - 1;
          final updated = messages[lastIndex].copyWith(
            content: messages[lastIndex].content + chunk,
          );
          return [...messages.sublist(0, lastIndex), updated];
        });
      }
      
      // 스트리밍 완료
      state = state.whenData((messages) {
        final lastIndex = messages.length - 1;
        return [
          ...messages.sublist(0, lastIndex),
          messages[lastIndex].copyWith(isStreaming: false),
        ];
      });
      
      // 사용량 업데이트
      ref.invalidate(coachingUsageProvider);
      
    } catch (e) {
      // 에러 처리
      state = state.whenData((messages) {
        return messages.where((m) => !m.id.startsWith('temp_')).toList();
      });
      rethrow;
    }
  }
}

// AI 코칭 사용량
@riverpod
Future<CoachingUsage> coachingUsage(CoachingUsageRef ref) async {
  final repo = ref.watch(coachingRepositoryProvider);
  return repo.getUsage();
}
```

### 3.4 설정/테마 상태

```dart
// lib/features/settings/providers/theme_provider.dart

@riverpod
class AppTheme extends _$AppTheme {
  @override
  ThemeState build() {
    _loadSavedTheme();
    return const ThemeState();
  }
  
  Future<void> _loadSavedTheme() async {
    final prefs = await ref.read(sharedPreferencesProvider.future);
    final themeMode = prefs.getString('theme_mode') ?? 'faith';
    final darkMode = prefs.getString('dark_mode') ?? 'system';
    
    state = ThemeState(
      themeMode: ThemeMode.values.byName(themeMode),
      darkMode: DarkMode.values.byName(darkMode),
    );
  }
  
  Future<void> setThemeMode(ThemeMode mode) async {
    final prefs = await ref.read(sharedPreferencesProvider.future);
    await prefs.setString('theme_mode', mode.name);
    state = state.copyWith(themeMode: mode);
  }
  
  Future<void> setDarkMode(DarkMode mode) async {
    final prefs = await ref.read(sharedPreferencesProvider.future);
    await prefs.setString('dark_mode', mode.name);
    state = state.copyWith(darkMode: mode);
  }
}

@freezed
class ThemeState with _$ThemeState {
  const factory ThemeState({
    @Default(ThemeMode.faith) ThemeMode themeMode,
    @Default(DarkMode.system) DarkMode darkMode,
  }) = _ThemeState;
}

enum ThemeMode { faith, universal }
enum DarkMode { light, dark, system }
```

---

## 4. 캐싱 전략

### 4.1 캐싱 계층 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    캐싱 계층 (Caching Layers)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Level 1: In-Memory Cache (Riverpod)                        │
│  ├── 자동 관리: ref.keepAlive()                             │
│  ├── TTL: Provider별 설정                                   │
│  └── 무효화: ref.invalidate()                               │
│                                                             │
│  Level 2: Local Database (Drift)                            │
│  ├── 오프라인 지원                                          │
│  ├── 영구 저장                                              │
│  └── 동기화 필요                                            │
│                                                             │
│  Level 3: Server (API)                                      │
│  └── Source of Truth                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 TTL (Time To Live) 설정

```dart
// lib/core/cache/cache_config.dart

class CacheConfig {
  // 캐시 만료 시간
  static const Duration homeData = Duration(minutes: 5);
  static const Duration routineList = Duration(minutes: 10);
  static const Duration userProfile = Duration(hours: 1);
  static const Duration insight = Duration(hours: 24);
  static const Duration statistics = Duration(minutes: 30);
  
  // 즉시 무효화가 필요한 데이터
  static const Set<String> noCache = {
    'coachingMessages',
    'notifications',
  };
}
```

### 4.3 Auto-Dispose 및 Keep Alive

```dart
// 자동 캐시 관리 Provider
@riverpod
class RoutineListCached extends _$RoutineListCached {
  Timer? _refreshTimer;
  
  @override
  Future<List<Routine>> build() async {
    // Keep alive 설정 (위젯 unmount 후에도 유지)
    final link = ref.keepAlive();
    
    // TTL 후 자동 dispose
    _refreshTimer = Timer(CacheConfig.routineList, () {
      link.close();
    });
    
    // dispose 시 타이머 정리
    ref.onDispose(() {
      _refreshTimer?.cancel();
    });
    
    final repo = ref.watch(routineRepositoryProvider);
    return repo.getRoutines();
  }
}
```

### 4.4 수동 캐시 무효화

```dart
// lib/core/cache/cache_invalidation.dart

extension CacheInvalidation on WidgetRef {
  /// 루틴 관련 모든 캐시 무효화
  void invalidateRoutineCache() {
    invalidate(routineListProvider);
    invalidate(homeDataProvider);
    invalidate(weeklyStatsProvider);
  }
  
  /// 사용자 데이터 관련 캐시 무효화
  void invalidateUserCache() {
    invalidate(authProvider);
    invalidate(userSettingsProvider);
    invalidate(subscriptionProvider);
  }
  
  /// 전체 캐시 무효화 (로그아웃 시)
  void invalidateAllCache() {
    invalidateRoutineCache();
    invalidateUserCache();
    invalidate(conversationListProvider);
    invalidate(groupListProvider);
  }
}
```

---

## 5. 오프라인 지원

### 5.1 오프라인 상태 감지

```dart
// lib/core/providers/connectivity_provider.dart

@riverpod
Stream<ConnectivityStatus> connectivity(ConnectivityRef ref) {
  return Connectivity().onConnectivityChanged.map((result) {
    if (result.contains(ConnectivityResult.none)) {
      return ConnectivityStatus.offline;
    }
    return ConnectivityStatus.online;
  });
}

enum ConnectivityStatus { online, offline }

// 사용
@riverpod
class RoutineListOfflineAware extends _$RoutineListOfflineAware {
  @override
  Future<List<Routine>> build() async {
    final connectivity = ref.watch(connectivityProvider);
    final repo = ref.watch(routineRepositoryProvider);
    
    return connectivity.when(
      data: (status) async {
        if (status == ConnectivityStatus.offline) {
          // 오프라인: 로컬 캐시만 사용
          return repo.getCachedRoutines();
        }
        // 온라인: 서버에서 가져오고 캐시
        final routines = await repo.getRoutines();
        await repo.cacheRoutines(routines);
        return routines;
      },
      loading: () => repo.getCachedRoutines(),
      error: (_, __) => repo.getCachedRoutines(),
    );
  }
}
```

### 5.2 오프라인 작업 큐

```dart
// lib/core/offline/offline_queue.dart

@riverpod
class OfflineQueue extends _$OfflineQueue {
  @override
  List<PendingAction> build() {
    _loadPendingActions();
    return [];
  }
  
  Future<void> _loadPendingActions() async {
    final db = ref.read(databaseProvider);
    final actions = await db.getPendingActions();
    state = actions;
  }
  
  Future<void> addAction(PendingAction action) async {
    final db = ref.read(databaseProvider);
    await db.insertPendingAction(action);
    state = [...state, action];
  }
  
  Future<void> processQueue() async {
    final connectivity = ref.read(connectivityProvider).value;
    if (connectivity != ConnectivityStatus.online) return;
    
    final db = ref.read(databaseProvider);
    final repo = ref.read(routineRepositoryProvider);
    
    for (final action in state) {
      try {
        await _processAction(action, repo);
        await db.deletePendingAction(action.id);
        state = state.where((a) => a.id != action.id).toList();
      } catch (e) {
        // 실패 시 재시도 카운트 증가
        await db.incrementRetryCount(action.id);
      }
    }
  }
  
  Future<void> _processAction(
    PendingAction action, 
    RoutineRepository repo,
  ) async {
    switch (action.type) {
      case ActionType.completeRoutine:
        await repo.completeRoutine(action.data['routineId']);
        break;
      case ActionType.createRoutine:
        await repo.createRoutine(RoutineCreateRequest.fromJson(action.data));
        break;
      // ... 기타 액션
    }
  }
}

@freezed
class PendingAction with _$PendingAction {
  const factory PendingAction({
    required String id,
    required ActionType type,
    required Map<String, dynamic> data,
    required DateTime createdAt,
    @Default(0) int retryCount,
  }) = _PendingAction;
}

enum ActionType {
  completeRoutine,
  uncompleteRoutine,
  createRoutine,
  updateRoutine,
  deleteRoutine,
}
```

### 5.3 온라인 복귀 시 동기화

```dart
// lib/core/offline/sync_manager.dart

@riverpod
class SyncManager extends _$SyncManager {
  @override
  SyncState build() {
    // 연결 상태 변화 감지
    ref.listen(connectivityProvider, (previous, next) {
      final wasOffline = previous?.value == ConnectivityStatus.offline;
      final isOnline = next.value == ConnectivityStatus.online;
      
      if (wasOffline && isOnline) {
        _syncOnReconnect();
      }
    });
    
    return const SyncState.idle();
  }
  
  Future<void> _syncOnReconnect() async {
    state = const SyncState.syncing();
    
    try {
      // 1. 대기 중인 오프라인 작업 처리
      await ref.read(offlineQueueProvider.notifier).processQueue();
      
      // 2. 서버 데이터와 동기화
      await ref.read(routineListProvider.notifier).refresh();
      await ref.read(homeDataProvider.notifier).refresh();
      
      state = const SyncState.completed();
    } catch (e) {
      state = SyncState.error(e.toString());
    }
  }
}

@freezed
class SyncState with _$SyncState {
  const factory SyncState.idle() = _Idle;
  const factory SyncState.syncing() = _Syncing;
  const factory SyncState.completed() = _Completed;
  const factory SyncState.error(String message) = _Error;
}
```

---

## 6. 폼 상태 관리

### 6.1 루틴 생성/수정 폼

```dart
// lib/features/routine/providers/routine_form_provider.dart

@riverpod
class RoutineForm extends _$RoutineForm {
  @override
  RoutineFormState build({Routine? initialRoutine}) {
    if (initialRoutine != null) {
      return RoutineFormState.fromRoutine(initialRoutine);
    }
    return const RoutineFormState();
  }
  
  void updateName(String name) {
    state = state.copyWith(
      name: name,
      nameError: _validateName(name),
    );
  }
  
  void updateTime(TimeOfDay time) {
    state = state.copyWith(time: time);
  }
  
  void updateDays(List<int> days) {
    state = state.copyWith(
      days: days,
      daysError: days.isEmpty ? '최소 1일 이상 선택해주세요' : null,
    );
  }
  
  void updateCategory(RoutineCategory category) {
    state = state.copyWith(category: category);
  }
  
  String? _validateName(String name) {
    if (name.isEmpty) return '이름을 입력해주세요';
    if (name.length > 50) return '50자 이하로 입력해주세요';
    return null;
  }
  
  bool validate() {
    final nameError = _validateName(state.name);
    final daysError = state.days.isEmpty ? '최소 1일 이상 선택해주세요' : null;
    
    state = state.copyWith(
      nameError: nameError,
      daysError: daysError,
      hasSubmitted: true,
    );
    
    return nameError == null && daysError == null;
  }
  
  Future<Routine?> submit() async {
    if (!validate()) return null;
    
    state = state.copyWith(isSubmitting: true);
    
    try {
      final repo = ref.read(routineRepositoryProvider);
      final request = state.toRequest();
      
      final routine = initialRoutine != null
          ? await repo.updateRoutine(initialRoutine!.id, request)
          : await repo.createRoutine(request);
      
      // 목록 갱신
      ref.invalidate(routineListProvider);
      
      return routine;
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        submitError: e.toString(),
      );
      return null;
    }
  }
}

@freezed
class RoutineFormState with _$RoutineFormState {
  const factory RoutineFormState({
    @Default('') String name,
    String? nameError,
    @Default(null) TimeOfDay? time,
    @Default([1, 2, 3, 4, 5, 6, 7]) List<int> days,
    String? daysError,
    @Default(RoutineCategory.custom) RoutineCategory category,
    @Default('') String description,
    @Default(false) bool reminderEnabled,
    @Default(false) bool hasSubmitted,
    @Default(false) bool isSubmitting,
    String? submitError,
  }) = _RoutineFormState;
  
  factory RoutineFormState.fromRoutine(Routine routine) => RoutineFormState(
    name: routine.name,
    time: routine.schedule.time,
    days: routine.schedule.days,
    category: routine.category,
    description: routine.description ?? '',
    reminderEnabled: routine.schedule.reminderEnabled,
  );
}
```

---

## 7. 에러 처리

### 7.1 전역 에러 핸들러

```dart
// lib/core/providers/error_handler_provider.dart

@riverpod
class GlobalErrorHandler extends _$GlobalErrorHandler {
  @override
  AppError? build() => null;
  
  void handleError(Object error, StackTrace? stackTrace) {
    final appError = _mapError(error);
    state = appError;
    
    // 로깅
    _logError(error, stackTrace);
    
    // 특정 에러 자동 처리
    if (appError is AuthError && appError.code == 'AUTH_006') {
      // Refresh Token 만료 → 로그아웃
      ref.read(authProvider.notifier).logout();
    }
  }
  
  AppError _mapError(Object error) {
    if (error is DioException) {
      return _mapDioError(error);
    }
    if (error is AppError) {
      return error;
    }
    return UnknownError(error.toString());
  }
  
  AppError _mapDioError(DioException error) {
    final response = error.response;
    
    if (response != null) {
      final data = response.data as Map<String, dynamic>?;
      final errorCode = data?['error']?['code'] as String?;
      final message = data?['error']?['message'] as String?;
      
      if (errorCode?.startsWith('AUTH_') == true) {
        return AuthError(code: errorCode!, message: message ?? '인증 오류');
      }
      if (errorCode?.startsWith('BIZ_') == true) {
        return BusinessError(code: errorCode!, message: message ?? '요청 오류');
      }
    }
    
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return NetworkError('연결 시간이 초과되었습니다');
      case DioExceptionType.connectionError:
        return NetworkError('네트워크에 연결할 수 없습니다');
      default:
        return UnknownError(error.message ?? '알 수 없는 오류');
    }
  }
  
  void _logError(Object error, StackTrace? stackTrace) {
    // Sentry 등 에러 추적 서비스 연동
    // Sentry.captureException(error, stackTrace: stackTrace);
  }
  
  void clearError() {
    state = null;
  }
}

// 에러 타입
sealed class AppError {
  String get message;
  String? get code;
}

class AuthError extends AppError {
  @override
  final String code;
  @override
  final String message;
  
  AuthError({required this.code, required this.message});
}

class BusinessError extends AppError {
  @override
  final String code;
  @override
  final String message;
  final Map<String, dynamic>? details;
  
  BusinessError({required this.code, required this.message, this.details});
}

class NetworkError extends AppError {
  @override
  final String message;
  @override
  String? get code => null;
  
  NetworkError(this.message);
}

class UnknownError extends AppError {
  @override
  final String message;
  @override
  String? get code => null;
  
  UnknownError(this.message);
}
```

### 7.2 에러 UI 표시

```dart
// lib/core/widgets/error_listener.dart

class GlobalErrorListener extends ConsumerWidget {
  final Widget child;
  
  const GlobalErrorListener({required this.child, super.key});
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen<AppError?>(globalErrorHandlerProvider, (_, error) {
      if (error == null) return;
      
      switch (error) {
        case AuthError():
          _showAuthError(context, error);
        case BusinessError():
          _showBusinessError(context, error);
        case NetworkError():
          _showNetworkError(context, error);
        case UnknownError():
          _showGenericError(context, error);
      }
    });
    
    return child;
  }
  
  void _showBusinessError(BuildContext context, BusinessError error) {
    // 한도 초과 등 특별 처리
    if (error.code == 'BIZ_001' || error.code == 'BIZ_002') {
      showDialog(
        context: context,
        builder: (_) => UpgradeDialog(message: error.message),
      );
      return;
    }
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(error.message)),
    );
  }
  
  void _showNetworkError(BuildContext context, NetworkError error) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.wifi_off, color: Colors.white),
            const SizedBox(width: 8),
            Text(error.message),
          ],
        ),
        action: SnackBarAction(
          label: '재시도',
          onPressed: () {
            // 마지막 요청 재시도 로직
          },
        ),
      ),
    );
  }
}
```

---

## 8. 디버깅 및 개발 도구

### 8.1 Provider Observer

```dart
// lib/core/providers/provider_logger.dart

class ProviderLogger extends ProviderObserver {
  @override
  void didAddProvider(
    ProviderBase provider,
    Object? value,
    ProviderContainer container,
  ) {
    debugPrint('[Provider] ADD: ${provider.name ?? provider.runtimeType}');
  }
  
  @override
  void didDisposeProvider(
    ProviderBase provider,
    ProviderContainer container,
  ) {
    debugPrint('[Provider] DISPOSE: ${provider.name ?? provider.runtimeType}');
  }
  
  @override
  void didUpdateProvider(
    ProviderBase provider,
    Object? previousValue,
    Object? newValue,
    ProviderContainer container,
  ) {
    debugPrint(
      '[Provider] UPDATE: ${provider.name ?? provider.runtimeType}\n'
      '  Previous: $previousValue\n'
      '  New: $newValue',
    );
  }
  
  @override
  void providerDidFail(
    ProviderBase provider,
    Object error,
    StackTrace stackTrace,
    ProviderContainer container,
  ) {
    debugPrint(
      '[Provider] ERROR: ${provider.name ?? provider.runtimeType}\n'
      '  Error: $error',
    );
  }
}

// main.dart에서 적용
void main() {
  runApp(
    ProviderScope(
      observers: [if (kDebugMode) ProviderLogger()],
      child: const App(),
    ),
  );
}
```

### 8.2 상태 스냅샷

```dart
// 개발 모드에서 현재 상태 확인용
extension DebugExtension on WidgetRef {
  void printStateSnapshot() {
    if (!kDebugMode) return;
    
    debugPrint('=== State Snapshot ===');
    debugPrint('Auth: ${read(authProvider).value}');
    debugPrint('Theme: ${read(appThemeProvider)}');
    debugPrint('Routines: ${read(routineListProvider).value?.length ?? 0} items');
    debugPrint('======================');
  }
}
```
