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

  Future<void> _load() async {
    loading = true;
    error = null;
    notifyListeners();
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
        // 10.6: load cached data first for instant display, then refresh
        _loadCaches();
        wards = await ApiService().guardianWards(user!.username);
        if (wards.isNotEmpty && selectedWard == null) {
          selectedWard = wards.first;
        } else if (wards.isNotEmpty && selectedWard != null) {
          final index = wards.indexWhere((w) => w.studentName == selectedWard!.studentName);
          selectedWard = index >= 0 ? wards[index] : wards.first;
        }

        // Fetch marks and payments (non-blocking errors)
        try {
          final marksRes = await ApiService().guardianMarks(user!.username);
          marks = marksRes.marks;
          // 10.6: cache per ward
          _marksCache.clear();
          for (final w in wards) {
            _marksCache[w.studentName] =
                marks.where((m) => m.ward == w.studentName).toList();
          }
          _saveCache('marks', marksRes);
        } catch (_) {}
        try {
          payments = await ApiService().guardianPayments(user!.username);
          _paymentsCache.clear();
          _saveCache('payments', payments);
        } catch (_) {}
        // 4.1: prefetch posts (cache for offline too)
        try {
          _allPosts = await ApiService().guardianPosts(user!.branchCode.isNotEmpty
              ? user!.branchCode
              : (StorageService.branchCode ?? ''));
          _saveCache('posts', _allPosts);
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
      final postsJson = StorageService.getOfflineCache('posts');
      if (postsJson != null && _allPosts.isEmpty) {
        _allPosts = ((jsonDecode(postsJson) as List))
            .map((p) => Post.fromJson(p))
            .toList();
      }
    } catch (_) {}
  }

  void selectWard(Ward ward) {
    if (selectedWard?.studentName != ward.studentName) {
      selectedWard = ward;
      notifyListeners();
    }
  }

  void toggleTheme() {
    setThemeMode(themeMode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light);
  }

  void setThemeMode(ThemeMode mode) {
    themeMode = mode;
    StorageService.setTheme(mode == ThemeMode.dark ? 'dark' : (mode == ThemeMode.light ? 'light' : 'system'));
    notifyListeners();
  }

  void setLocale(Locale loc) {
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

