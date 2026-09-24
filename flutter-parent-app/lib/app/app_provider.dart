import 'dart:convert';
import 'package:flutter/material.dart';
import '../core/services/storage_service.dart';
import '../core/services/api_service.dart';
import '../models/models.dart';

class AppProvider extends ChangeNotifier {
  User? user;
  List<Ward> wards = [];
  Ward? selectedWard;
  List<Mark> marks = [];
  GuardianPaymentsResponse? payments;

  // 2.4 / 10.5 / 10.6: per-ward data caches for instant switching + offline
  final Map<String, List<Mark>> _marksCache = {};
  final Map<String, GuardianPaymentsResponse> _paymentsCache = {};
  final Map<String, AttendanceMonth> _attendanceCache = {};
  List<Post> _allPosts = [];
  List<Post> get allPosts => _allPosts;

  bool loading = true;
  String? error;

  ThemeMode themeMode = ThemeMode.light;
  Locale locale = const Locale('en');

  AppProvider() {
    _load();
  }

  /// FIX 1: read the JWT expiry locally (no server call). Returns true when
  /// the token is missing, malformed, or past its exp claim.
  bool _tokenExpired() {
    final token = StorageService.token;
    if (token == null || token.isEmpty) return true;
    try {
      final parts = token.split('.');
      if (parts.length != 3) return true;
      final payload = jsonDecode(
          utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))));
      final exp = payload['exp'];
      if (exp is int) {
        return DateTime.fromMillisecondsSinceEpoch(exp * 1000)
            .isBefore(DateTime.now());
      }
      return false; // no exp claim — treat as valid
    } catch (_) {
      return true; // can't parse -> force fresh login
    }
  }

  Future<void> _load() async {
    // FIX 1: silent loading — keep showing existing data while refreshing.
    // Only show the full-screen loading state on very first app start
    // (when there is nothing to show yet).
    final firstLoad = wards.isEmpty && marks.isEmpty && _allPosts.isEmpty;
    if (firstLoad) loading = true;
    error = null;
    if (firstLoad) notifyListeners();
    try {
      // Load saved theme
      final savedTheme = StorageService.theme;
      if (savedTheme == 'dark') {
        themeMode = ThemeMode.dark;
      } else if (savedTheme == 'light') {
        themeMode = ThemeMode.light;
      } else {
        // 10.2: default = follow system theme
        themeMode = ThemeMode.system;
      }

      // Load saved locale
      final savedLocale = StorageService.locale;
      locale = Locale(savedLocale);

      // FIX 1: session still valid? If the JWT expired, DO NOT log the user
      // out (task 4: stay logged in without timeout) — keep them in the app
      // with cached data; API calls just fail silently until re-login.
      if (!StorageService.isLoggedIn) {
        await StorageService.clear();
        user = null;
        wards = [];
        marks = [];
        payments = null;
        _allPosts = [];
        loading = false;
        notifyListeners();
        return; // user will be sent to login by main.dart
      }

      final raw = StorageService.user;
      if (raw != null && raw.isNotEmpty) {
        user = User.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      } else if (StorageService.token != null) {
        user = User(
          id: 0,
          username: '',
          name: '',
          role: 'guardian',
          branchCode: StorageService.branchCode ?? '',
        );
      }
      if (user != null && user!.username.isNotEmpty) {
        // 10.6/final: restore caches FIRST (instant display, before network)
        // so the app shows data immediately, then refresh in the background
        _loadCaches();
        // restore the saved selected ward too (offline-safe)
        if (selectedWard == null) {
          try {
            final savedWardJson = StorageService.getOfflineCache('selectedWard');
            if (savedWardJson != null) {
              selectedWard = Ward.fromJson(jsonDecode(savedWardJson));
            }
          } catch (_) {}
        }
        // FIX (speed 6): run the 4 independent API fetches in PARALLEL
        // instead of one-by-one (wards, marks, payments, posts) — startup
        // is as slow as the SLOWEST request, not the SUM of all four.
        final api = ApiService();
        final results = await Future.wait<Map<String, dynamic>?>([
          api.guardianWards(user!.username).then((v) => <String, dynamic>{'wards': v}).catchError((_) => <String, dynamic>{}),
          api.guardianMarks(user!.username).then((v) => <String, dynamic>{'marks': v}).catchError((_) => <String, dynamic>{}),
          api.guardianPayments(user!.username).then((v) => <String, dynamic>{'payments': v}).catchError((_) => <String, dynamic>{}),
          api.guardianPosts(user!.branchCode.isNotEmpty
              ? user!.branchCode
              : (StorageService.branchCode ?? '')).then((v) => <String, dynamic>{'posts': v}).catchError((_) => <String, dynamic>{}),
        ]);
        // wards
        try {
          final wRes = results[0]?['wards'] as List<Ward>?;
          if (wRes != null) {
            wards = wRes;
            if (wards.isNotEmpty) {
              try {
                StorageService.setOfflineCache('wards', jsonEncode(
                  wards.map((w) => {
                    'studentName': w.studentName,
                    'className': w.className,
                    'schoolId': w.schoolId,
                  }).toList(),
                ));
              } catch (_) {}
            }
            if (wards.isNotEmpty && selectedWard == null) {
              selectedWard = wards.first;
            } else if (wards.isNotEmpty && selectedWard != null) {
              final index = wards.indexWhere((w) => w.studentName == selectedWard!.studentName);
              selectedWard = index >= 0 ? wards[index] : wards.first;
            }
          }
        } catch (_) {}
        // offline fallback: wards from storage
        if (wards.isEmpty) {
          try {
            final wardsJson = StorageService.getOfflineCache('wards');
            if (wardsJson != null) {
              wards = ((jsonDecode(wardsJson) as List))
                  .map((w) => Ward.fromJson(w))
                  .toList();
              if (selectedWard == null && wards.isNotEmpty) {
                selectedWard = wards.first;
              }
            }
          } catch (_) {}
        }
        notifyListeners(); // paint wards immediately
        // marks
        try {
          final marksRes = results[1]?['marks'] as GuardianMarksResponse?;
          if (marksRes != null) {
            marks = marksRes.marks;
            _marksCache.clear();
            for (final w in wards) {
              _marksCache[w.studentName] =
                  marks.where((m) => m.ward == w.studentName).toList();
            }
            _saveCache('marks', marksRes);
          }
        } catch (_) {}
        // payments
        try {
          final pRes = results[2]?['payments'] as GuardianPaymentsResponse?;
          if (pRes != null) {
            payments = pRes;
            _paymentsCache.clear();
            _saveCache('payments', pRes);
          }
        } catch (_) {}
        // posts
        try {
          final postsRes = results[3]?['posts'] as List<Post>?;
          if (postsRes != null) {
            _allPosts = postsRes;
            _saveCache('posts', _allPosts);
          }
        } catch (_) {}
      }
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> refresh() => _load();

  /// T1: silent refresh — fetches fresh data WITHOUT showing loading screens.
  /// Used on app resume; keeps current data visible while updating.
  Future<void> silentRefresh() async {
    if (user == null || user!.username.isEmpty) return;
    try {
      final freshWards = await ApiService().guardianWards(user!.username);
      if (freshWards.isNotEmpty) {
        wards = freshWards;
        if (selectedWard == null ||
            !wards.any((w) => w.studentName == selectedWard!.studentName)) {
          selectedWard = wards.first;
        }
      }
      try {
        final marksRes = await ApiService().guardianMarks(user!.username);
        marks = marksRes.marks;
        _marksCache.clear();
        for (final w in wards) {
          _marksCache[w.studentName] =
              marks.where((m) => m.ward == w.studentName).toList();
        }
        _saveCache('marks', marksRes);
      } catch (_) {}
      try {
        payments = await ApiService().guardianPayments(user!.username);
        _saveCache('payments', payments);
      } catch (_) {}
      try {
        _allPosts = await ApiService().guardianPosts(user!.branchCode);
        _saveCache('posts', _allPosts);
      } catch (_) {}
      notifyListeners();
    } catch (_) {}
  }

  // ---- 2.4: instant ward switching with caches ----
  List<Mark> cachedMarksFor(Ward ward) => _marksCache[ward.studentName] ?? [];

  GuardianPaymentsResponse? cachedPaymentsFor(String username) => _paymentsCache[username];

  List<Post> get cachedPosts => _allPosts;

  AttendanceMonth? cachedAttendance(String key) => _attendanceCache[key];
  void cacheAttendance(String key, AttendanceMonth data) {
    _attendanceCache[key] = data;
  }

  // 10.6: persist caches to local storage for offline use
  void _saveCache(String key, Object? data) {
    try {
      if (data == null) return;
      StorageService.setOfflineCache(key, jsonEncode(data));
    } catch (_) {}
  }

  void _loadCaches() {
    try {
      // T1: restore ALL cached data from local storage — the app opens with
      // data immediately (no manual refresh), even offline.
      final postsJson = StorageService.getOfflineCache('posts');
      if (postsJson != null && _allPosts.isEmpty) {
        _allPosts = ((jsonDecode(postsJson) as List))
            .map((p) => Post.fromJson(p))
            .toList();
      }
      // marks cache (saved as full GuardianMarksResponse)
      if (_marksCache.isEmpty) {
        final marksJson = StorageService.getOfflineCache('marks');
        if (marksJson != null) {
          final res = GuardianMarksResponse.fromJson(jsonDecode(marksJson));
          for (final w in wards) {
            _marksCache[w.studentName] =
                res.marks.where((m) => m.ward == w.studentName).toList();
          }
          if (marks.isEmpty && res.marks.isNotEmpty) marks = res.marks;
        }
      }
      // payments cache
      if (_paymentsCache.isEmpty) {
        final payJson = StorageService.getOfflineCache('payments');
        if (payJson != null) {
          payments = GuardianPaymentsResponse.fromJson(jsonDecode(payJson));
          if (user != null) {
            _paymentsCache[user!.username] = payments!;
          }
        }
      }
      // final T6: wards cache — restore when offline (wards list never loaded)
      if (wards.isEmpty) {
        try {
          final wardsJson = StorageService.getOfflineCache('wards');
          if (wardsJson != null) {
            wards = ((jsonDecode(wardsJson) as List))
                .map((w) => Ward.fromJson(w))
                .toList();
            if (selectedWard == null && wards.isNotEmpty) {
              selectedWard = wards.first;
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  void selectWard(Ward ward) {
    if (selectedWard?.studentName != ward.studentName) {
      selectedWard = ward;
      // final: persist selected ward for offline restore
      try {
        StorageService.setOfflineCache('selectedWard', jsonEncode({
          'studentName': ward.studentName,
          'className': ward.className,
          'schoolId': ward.schoolId,
        }));
      } catch (_) {}
      notifyListeners();
    }
  }

  void toggleTheme() {
    // FIX 1: theme change must NOT trigger data reload — just notify
    themeMode = themeMode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    StorageService.setTheme(themeMode == ThemeMode.dark ? 'dark' : 'light');
    notifyListeners();
  }

  void setThemeMode(ThemeMode mode) {
    // FIX 1: no _load() call — theme is instant, no data refetch
    themeMode = mode;
    StorageService.setTheme(mode == ThemeMode.dark ? 'dark' : (mode == ThemeMode.light ? 'light' : 'system'));
    notifyListeners();
  }

  void setLocale(Locale loc) {
    // FIX 9: locale change is instant, no data refetch
    locale = loc;
    StorageService.setLocale(loc.languageCode);
    notifyListeners();
  }

  Future<void> logout() async {
    await StorageService.clear();
    user = null;
    wards = [];
    selectedWard = null;
    _marksCache.clear();
    _paymentsCache.clear();
    _allPosts = [];
    notifyListeners();
  }
}

// Simple holder for a month of attendance (used by Attendance tab cache)
class AttendanceMonth {
  final List<AttendanceDay> days;
  final AttendanceSummary summary;
  AttendanceMonth({required this.days, required this.summary});
}

