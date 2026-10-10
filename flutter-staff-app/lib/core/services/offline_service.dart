import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';

import 'api_service.dart';
import 'storage_service.dart';

/// Offline layer: caches last-loaded payloads and queues writes made while
/// the device is offline. Queued writes are flushed automatically whenever
/// connectivity returns (and can be flushed manually).
class OfflineService {
  static const String _queueKey = 'pending_ops';
  static bool _flushing = false;
  static StreamSubscription<List<ConnectivityResult>>? _sub;

  /// Start listening for connectivity so queued work is pushed automatically.
  static void init() {
    _sub?.cancel();
    _sub = Connectivity().onConnectivityChanged.listen((results) {
      final online = results.isNotEmpty && !results.every((r) => r == ConnectivityResult.none);
      if (online) flush();
    });
    // Also drain anything queued in a previous session — connectivity events
    // only fire on CHANGES, so a device that is already online at launch
    // would otherwise keep its queue until the next network flap.
    Future.delayed(const Duration(seconds: 3), () {
      if (pendingCount > 0) flush();
    });
  }

  static void dispose() {
    _sub?.cancel();
    _sub = null;
  }

  static Future<bool> isOnline() async {
    try {
      final results = await Connectivity().checkConnectivity();
      return results.isNotEmpty && !results.every((r) => r == ConnectivityResult.none);
    } catch (_) {
      return true;
    }
  }

  // ------------------------------------------------------------------ cache

  static Future<void> cache(String key, Object? data) async {
    try {
      await StorageService.setOfflineCache(key, jsonEncode(data));
    } catch (_) {}
  }

  static T? readCache<T>(String key) {
    try {
      final raw = StorageService.getOfflineCache(key);
      if (raw == null) return null;
      return jsonDecode(raw) as T;
    } catch (_) {
      return null;
    }
  }

  // ------------------------------------------------------------------ queue

  static List<Map<String, dynamic>> get pendingOps {
    final raw = readCache<List>(_queueKey);
    if (raw == null) return <Map<String, dynamic>>[];
    return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Identity of an op for de-duplication: re-saving the same form/week while
  /// offline replaces the queued op (newest state wins). Types without a key
  /// (e.g. add_fault) always append — every fault is a separate record.
  static String _opKey(Map<String, dynamic> op) {
    switch (op['type']) {
      case 'save_marks':
        return 'save_marks|${op['subjectName']}|${op['className']}|${op['termNumber']}';
      case 'weekly_attendance':
        return 'weekly_attendance|${op['className']}|${op['weekStart']}';
      default:
        return '';
    }
  }

  static Future<void> enqueue(String type, Map<String, dynamic> payload) async {
    final queue = pendingOps;
    final op = {
      'type': type,
      'at': DateTime.now().toIso8601String(),
      ...payload,
    };
    final key = _opKey(op);
    if (key.isNotEmpty) {
      queue.removeWhere((e) => _opKey(e) == key);
    }
    queue.add(op);
    await StorageService.setOfflineCache(_queueKey, jsonEncode(queue));
  }

  static int get pendingCount => pendingOps.length;

  static Future<void> _saveQueue(List<Map<String, dynamic>> ops) async {
    await StorageService.setOfflineCache(_queueKey, jsonEncode(ops));
  }

  /// Push every queued write. Returns the number of ops still failing.
  static Future<int> flush() async {
    if (_flushing) return pendingOps.length;
    if (!await isOnline()) return pendingOps.length;
    _flushing = true;
    try {
      var queue = pendingOps;
      final remaining = <Map<String, dynamic>>[];
      final api = ApiService();

      for (final op in queue) {
        if (!await isOnline()) {
          remaining.add(op);
          continue;
        }
        var ok = false;
        try {
          switch (op['type']) {
            case 'save_marks':
              ok = await api.updateMarks(
                subjectName: '${op['subjectName']}',
                className: '${op['className']}',
                termNumber: int.tryParse('${op['termNumber']}') ?? 1,
                rows: (op['rows'] as List)
                    .map((r) => Map<String, dynamic>.from(r as Map))
                    .toList(),
              );
              break;
            case 'weekly_attendance':
              final className = '${op['className']}';
              final weekStart = '${op['weekStart']}';
              final staffId = int.tryParse('${op['globalStaffId']}') ?? 0;
              final records = (op['records'] as List)
                  .map((r) => Map<String, dynamic>.from(r as Map))
                  .toList();
              ok = await api.updateWeeklyAttendance(
                className: className,
                weekStart: weekStart,
                globalStaffId: staffId,
                records: records,
              );
              if (!ok) {
                // create-before-PUT: the week table may not exist yet (the
                // server answers 404 "create it first"). Creating is safe:
                // a duplicate-week 400 just means it already exists.
                await api.createWeeklyAttendance(
                  className: className,
                  weekStart: weekStart,
                  globalStaffId: staffId,
                );
                ok = await api.updateWeeklyAttendance(
                  className: className,
                  weekStart: weekStart,
                  globalStaffId: staffId,
                  records: records,
                );
              }
              break;
            case 'add_fault':
              ok = await api.addFault(
                studentName: '${op['studentName']}',
                className: '${op['className']}',
                faultType: '${op['faultType']}',
                faultLevel: '${op['faultLevel']}',
                date: '${op['date']}',
                description: '${op['description']}',
                reportedBy: '${op['reportedBy']}',
                attachmentPath: op['attachmentPath'] as String?,
              );
              break;
            default:
              ok = true; // unknown op — drop it
          }
        } catch (_) {
          ok = false;
        }
        if (!ok) remaining.add(op);
      }

      if (queue.length != remaining.length || queue.isEmpty) {
        await _saveQueue(remaining);
      }
      return remaining.length;
    } finally {
      _flushing = false;
    }
  }
}
