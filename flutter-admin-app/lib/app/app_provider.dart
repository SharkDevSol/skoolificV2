import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../core/l10n/app_localizations.dart';
import '../core/services/storage_service.dart';
import '../core/services/api_service.dart';
import '../core/services/offline_service.dart';
import '../core/services/push_service.dart';
import '../models/models.dart';

class AppProvider extends ChangeNotifier {
  StaffUser? user;
  StaffProfile? profile;

  bool isTeacher = false;
  bool isClassTeacher = false;
  List<String> assignedClasses = [];
  String? selectedClass;

  List<TeacherAssignment> markAssignments = [];
  List<ScheduleSlot> schedule = [];
  List<Post> posts = [];

  bool loading = true;
  String? error;

  ThemeMode themeMode = ThemeMode.light;
  Locale locale = const Locale('en');

  AppProvider() {
    _load();
  }

  Future<void> _load() async {
    loading = true;
    notifyListeners();

    try {
      // 1. Theme
      final savedTheme = StorageService.theme;
      if (savedTheme == 'dark') {
        themeMode = ThemeMode.dark;
      } else if (savedTheme == 'light') {
        themeMode = ThemeMode.light;
      } else {
        themeMode = ThemeMode.system;
      }

      // 2. Locale
      final savedLocale = StorageService.locale;
      locale = Locale(savedLocale);
      AppLocalizations.currentLocale = locale;

      // 3. Session
      if (!StorageService.isLoggedIn) {
        user = null;
        profile = null;
        loading = false;
        notifyListeners();
        return;
      }

      final rawUser = StorageService.user;
      final rawProfile = StorageService.profile;

      if (rawProfile != null && rawProfile.isNotEmpty) {
        try {
          profile = StaffProfile.fromJson(jsonDecode(rawProfile));
        } catch (_) {}
      }

      if (rawUser != null && rawUser.isNotEmpty) {
        try {
          user = StaffUser.fromJson(jsonDecode(rawUser), profile: profile);
        } catch (_) {}
      }

      if (user != null) {
        // Teacher role determination
        isTeacher = user!.isTeacher;

        // Show cached data instantly (offline launches keep working), then
        // refresh from the network in the background.
        _hydrateFromCache();

        // Background fetch — the splash screen must not wait on it.
        unawaited(refreshData());
      }
    } catch (e) {
      debugPrint('AppProvider _load error: $e');
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  /// Refresh in parallel: posts + class-teacher status together, then the
  /// mark/schedule fetches (started immediately when the role flag already
  /// says teacher). Old flow ran 4 requests sequentially, which made login
  /// sit on the spinner for minutes.
  Future<void> refreshData() async {
    if (user == null) return;
    final api = ApiService();
    final profileName = profile?.name.isNotEmpty == true ? profile!.name : user!.name;

    final classTeacher = _refreshClassTeacher(api, profileName);
    final rest = <Future<void>>[_refreshPosts(api)];
    var marksStarted = false;
    if (isTeacher) {
      marksStarted = true;
      rest.add(_refreshMarkAssignments(api, profileName));
      rest.add(_refreshSchedule(api, profileName));
    }
    await classTeacher;
    if (isTeacher && !marksStarted) {
      rest.add(_refreshMarkAssignments(api, profileName));
      rest.add(_refreshSchedule(api, profileName));
    }
    await Future.wait(rest);

    // Never block the caller on push registration.
    unawaited(() async {
      try {
        await PushService.ensureRegistered();
      } catch (e) {
        debugPrint('Push registration error: $e');
      }
    }());
    notifyListeners();
  }

  Future<void> _refreshClassTeacher(ApiService api, String profileName) async {
    // Success (even empty) is cached; failures (offline) fall back to the
    // last known state.
    try {
      final assignData = await api.getTeacherAssignment(profileName);
      final raw = assignData['assignments'];
      if (raw is! List) {
        // getTeacherAssignment returns {} on non-2xx/timeout-swallowing
        // paths — applying that as "no assignments" wiped a good cache and
        // made the attendance page show its placeholder while online.
        _hydrateClassTeacher();
        return;
      }
      isClassTeacher = raw.isNotEmpty;
      assignedClasses = raw
          .map((a) => a['assigned_class']?.toString() ?? a['class']?.toString() ?? '')
          .where((c) => c.isNotEmpty)
          .toList();
      if (assignedClasses.isNotEmpty && selectedClass == null) {
        selectedClass = assignedClasses.first;
      }
      if (isClassTeacher) isTeacher = true; // Class teachers can also teach
      await OfflineService.cache('provider_class_teacher', {
        'isClassTeacher': isClassTeacher,
        'assignedClasses': assignedClasses,
        'selectedClass': selectedClass,
      });
    } catch (_) {
      _hydrateClassTeacher();
    }
  }

  Future<void> _refreshMarkAssignments(ApiService api, String profileName) async {
    try {
      markAssignments = await api.getTeacherMarkLists(profileName);
      await OfflineService.cache(
          'provider_mark_assignments', markAssignments.map((a) => a.toJson()).toList());
      await _prefetchMarkPayloads(api);
    } catch (_) {
      _hydrateMarkAssignments();
    }
  }

  /// Download every assignment's payload so ALL lists open offline — before
  /// this, only a list the user had opened while online was cached, which is
  /// why just the first one worked offline.
  Future<void> _prefetchMarkPayloads(ApiService api) async {
    if (markAssignments.isEmpty) return;
    if (!await OfflineService.isOnline()) return;
    final batch = markAssignments.take(15).toList();
    await Future.wait(batch.map((a) async {
      try {
        final payload = await api.getMarkList(
          subjectName: a.subjectName,
          className: a.className,
          termNumber: a.termNumber,
        );
        await OfflineService.cache(a.offlineCacheKey, payload);
      } catch (_) {
        // Leave whatever older copy exists.
      }
    }));
  }

  Future<void> _refreshSchedule(ApiService api, String profileName) async {
    try {
      schedule = await api.getTeacherSchedule(profileName);
      await OfflineService.cache(
          'provider_schedule', schedule.map((s) => s.toJson()).toList());
    } catch (_) {
      _hydrateSchedule();
    }
  }

  Future<void> _refreshPosts(ApiService api) async {
    // getPosts swallows errors, so use connectivity to decide whether an
    // empty result means "no posts" or "offline".
    try {
      final fetchedPosts = await api.getPosts();
      if (fetchedPosts.isNotEmpty) {
        posts = fetchedPosts;
        await OfflineService.cache(
            'provider_posts', fetchedPosts.map((p) => p.toJson()).toList());
      } else if (!await OfflineService.isOnline()) {
        _hydratePosts();
      } else {
        posts = [];
      }
    } catch (_) {
      _hydratePosts();
    }
  }

  // -------------------------------------------------- offline cache hydrate

  void _hydrateFromCache() {
    _hydrateClassTeacher();
    _hydrateMarkAssignments();
    _hydrateSchedule();
    _hydratePosts();
  }

  void _hydrateClassTeacher() {
    final c = OfflineService.readCache<Map<String, dynamic>>('provider_class_teacher');
    if (c == null) return;
    isClassTeacher = c['isClassTeacher'] == true;
    assignedClasses =
        (c['assignedClasses'] as List?)?.map((e) => e.toString()).toList() ?? [];
    final cachedSelected = c['selectedClass'] as String?;
    if (cachedSelected != null && cachedSelected.isNotEmpty) {
      selectedClass ??= cachedSelected;
    } else if (assignedClasses.isNotEmpty) {
      selectedClass ??= assignedClasses.first;
    }
    if (isClassTeacher) isTeacher = true;
  }

  void _hydrateMarkAssignments() {
    if (markAssignments.isNotEmpty) return;
    final cached = OfflineService.readCache<List>('provider_mark_assignments');
    if (cached == null) return;
    markAssignments = cached
        .map((e) => TeacherAssignment.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  void _hydrateSchedule() {
    if (schedule.isNotEmpty) return;
    final cached = OfflineService.readCache<List>('provider_schedule');
    if (cached == null) return;
    schedule = cached
        .map((e) => ScheduleSlot.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  void _hydratePosts() {
    if (posts.isNotEmpty) return;
    final cached = OfflineService.readCache<List>('provider_posts');
    if (cached == null) return;
    posts =
        cached.map((e) => Post.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<void> silentRefresh() async {
    await refreshData();
  }

  /// Keep the stored username in sync after a successful username change
  /// (silentRefresh only re-fetches profile/assignment data, not the user).
  Future<void> updateUsername(String username) async {
    final u = user;
    if (u == null || username.isEmpty || u.username == username) return;
    user = StaffUser.fromJson({...u.toJson(), 'username': username},
        profile: u.profile);
    await StorageService.saveUserJson(jsonEncode(user!.toJson()));
    notifyListeners();
  }

  void setSelectedClass(String cls) {
    selectedClass = cls;
    notifyListeners();
  }

  Future<void> loginSuccess({
    required String token,
    required Map<String, dynamic> userData,
    required Map<String, dynamic> profileData,
    required String branchCode,
  }) async {
    final userJson = jsonEncode(userData);
    final profileJson = jsonEncode(profileData);

    await StorageService.saveSession(
      token: token,
      user: userJson,
      profile: profileJson,
      branchCode: branchCode,
    );

    profile = StaffProfile.fromJson(profileData);
    user = StaffUser.fromJson(userData, profile: profile);
    isTeacher = user!.isTeacher;

    // Login must return immediately — the home screen shows cached/default
    // state now and fills in assignments/schedule/posts in the background
    // (this was the 4-5 minute login spinner).
    notifyListeners();
    unawaited(refreshData());
  }

  Future<void> logout() async {
    await StorageService.clear();
    user = null;
    profile = null;
    isTeacher = false;
    isClassTeacher = false;
    assignedClasses = [];
    selectedClass = null;
    markAssignments = [];
    schedule = [];
    posts = [];
    notifyListeners();
  }

  Future<void> setTheme(ThemeMode mode) async {
    themeMode = mode;
    String val = 'system';
    if (mode == ThemeMode.dark) val = 'dark';
    if (mode == ThemeMode.light) val = 'light';
    await StorageService.setTheme(val);
    notifyListeners();
  }

  Future<void> setLocale(Locale loc) async {
    locale = loc;
    AppLocalizations.currentLocale = loc;
    await StorageService.setLocale(loc.languageCode);
    notifyListeners();
  }
}
