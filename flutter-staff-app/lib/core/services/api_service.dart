import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import 'storage_service.dart';
import '../../models/models.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);
  @override
  String toString() => message;
}

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  Map<String, String> get _headers {
    final token = StorageService.token ?? '';
    final branch = StorageService.branchCode ?? '';
    return ApiConstants.authHeaders(token, branch);
  }

  Uri _u(String path, [Map<String, String>? query]) {
    final uri = Uri.parse('${ApiConstants.baseUrl}$path');
    return query == null ? uri : uri.replace(queryParameters: {...uri.queryParameters, ...query});
  }

  String _err(http.Response res) {
    try {
      final j = jsonDecode(res.body);
      if (j is Map) {
        return (j['error'] ?? j['message'] ?? j['details'])?.toString() ?? 'HTTP ${res.statusCode}';
      }
    } catch (_) {}
    return 'HTTP ${res.statusCode}';
  }

  bool _ok(http.Response r) => r.statusCode >= 200 && r.statusCode < 300;

  /// Details of the most recent failed write (used to detect admin locks,
  /// validation errors etc. instead of a bare `false`).
  int? lastStatusCode;
  String? lastError;

  // ---------------------------------------------------------------- AUTH

  Future<Map<String, dynamic>> login({
    required String branchCode,
    required String username,
    required String password,
    String userType = 'staff',
  }) async {
    final res = await http
        .post(_u(ApiConstants.login),
            headers: ApiConstants.publicHeaders(),
            body: jsonEncode({
              'branchCode': branchCode.trim().toUpperCase(),
              'username': username.trim(),
              'password': password,
              'userType': userType,
            }))
        .timeout(const Duration(seconds: 15));
    if (_ok(res)) return jsonDecode(res.body) as Map<String, dynamic>;
    throw ApiException(res.statusCode, _err(res));
  }

  Future<Map<String, dynamic>> changeUsername({
    required String currentUsername,
    required String newUsername,
    required String password,
  }) async {
    final res = await http
        .post(_u(ApiConstants.changeUsername),
            headers: _headers,
            body: jsonEncode({
              'currentUsername': currentUsername,
              'newUsername': newUsername,
              'password': password,
            }))
        .timeout(const Duration(seconds: 15));
    return {'ok': _ok(res), 'status': res.statusCode, 'body': _safeJson(res.body)};
  }

  Future<Map<String, dynamic>> changePassword({
    required String username,
    required String currentPassword,
    required String newPassword,
  }) async {
    final res = await http
        .post(_u(ApiConstants.changePassword),
            headers: _headers,
            body: jsonEncode({
              'username': username,
              'currentPassword': currentPassword,
              'newPassword': newPassword,
            }))
        .timeout(const Duration(seconds: 15));
    return {'ok': _ok(res), 'status': res.statusCode, 'body': _safeJson(res.body)};
  }

  Future<bool> registerDevice({
    required String deviceToken,
    required String userId,
    String userType = 'staff',
    String? appVersion,
    String? deviceName,
    String? osVersion,
  }) async {
    try {
      final res = await http
          .post(_u(ApiConstants.registerDevice),
              headers: ApiConstants.publicHeaders(),
              body: jsonEncode({
                'deviceToken': deviceToken,
                'userId': userId,
                'userType': userType,
                'deviceType': 'android',
                if (deviceName != null) 'deviceName': deviceName,
                if (appVersion != null) 'appVersion': appVersion,
                if (osVersion != null) 'osVersion': osVersion,
              }))
          .timeout(const Duration(seconds: 12));
      return _ok(res);
    } catch (_) {
      return false;
    }
  }

  dynamic _safeJson(String s) {
    try {
      return jsonDecode(s);
    } catch (_) {
      return s;
    }
  }

  // ------------------------------------------------------------ MARK LIST

  Future<List<TeacherAssignment>> getTeacherMarkLists(String teacherName) async {
    final enc = Uri.encodeComponent(teacherName.trim());
    final res = await http.get(_u('${ApiConstants.teacherMarkLists}/$enc'), headers: _headers).timeout(const Duration(seconds: 8));
    if (!_ok(res)) return [];
    final data = _safeJson(res.body);
    if (data is Map && data['assignments'] is List) {
      return (data['assignments'] as List)
          .map((a) => TeacherAssignment.fromJson(Map<String, dynamic>.from(a)))
          .toList();
    }
    return [];
  }

  /// GET mark list. Returns the full server payload:
  /// { formId, components, students, markList, config, syncInfo }
  Future<Map<String, dynamic>> getMarkList({
    required String subjectName,
    required String className,
    required int termNumber,
  }) async {
    final s = Uri.encodeComponent(subjectName);
    final c = Uri.encodeComponent(className);
    final res = await http.get(_u('${ApiConstants.markList}/$s/$c/$termNumber'), headers: _headers).timeout(const Duration(seconds: 15));
    if (!_ok(res)) throw ApiException(res.statusCode, _err(res));
    return _safeJson(res.body) as Map<String, dynamic>;
  }

  Future<bool> createMarkForms({
    required String subjectName,
    required String className,
    required int termNumber,
    required List<MarkComponentConfig> components,
  }) async {
    final res = await http
        .post(_u(ApiConstants.createMarkForms),
            headers: _headers,
            body: jsonEncode({
              'subjectName': subjectName,
              'className': className,
              'termNumber': termNumber,
              'markComponents': components.map((c) => c.toJson()).toList(),
            }))
        .timeout(const Duration(seconds: 15));
    return _ok(res);
  }

  /// Bulk save via POST /api/mark-list/bulk-update-marks.
  /// [rows] = [{ 'studentName': 'x', 'marks': {componentKey: value} }] —
  /// matches StudentMarkRow.toSaveRow(). Honors admin locks (403) and
  /// recalculates totals/pass status server-side.
  Future<bool> updateMarks({
    required String subjectName,
    required String className,
    required int termNumber,
    required List<Map<String, dynamic>> rows,
  }) async {
    if (rows.isEmpty) return true;
    final res = await http
        .post(_u(ApiConstants.bulkUpdateMarks),
            headers: _headers,
            body: jsonEncode({
              'subjectName': subjectName,
              'className': className,
              'termNumber': termNumber,
              'marksData': rows,
            }))
        .timeout(const Duration(seconds: 25));
    final ok = _ok(res);
    lastStatusCode = ok ? null : res.statusCode;
    lastError = ok ? null : _err(res);
    return ok;
  }

  /// Global mark-list config (term_count, etc.). Returns {} on failure.
  Future<Map<String, dynamic>> getMarkConfig() async {
    try {
      final res = await http
          .get(_u(ApiConstants.markListConfig), headers: _headers)
          .timeout(const Duration(seconds: 10));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map) return Map<String, dynamic>.from(d);
      }
    } catch (_) {}
    return <String, dynamic>{};
  }

  Future<String?> markListError(http.Response res) async => _ok(res) ? null : _err(res);

  // ------------------------------------------------- CLASS TEACHER / ATTENDANCE

  Future<Map<String, dynamic>> getTeacherAssignment(String teacherName) async {
    final enc = Uri.encodeComponent(teacherName.trim());
    final res = await http.get(_u('${ApiConstants.teacherAssignment}/$enc'), headers: _headers).timeout(const Duration(seconds: 6));
    if (!_ok(res)) return <String, dynamic>{};
    final d = _safeJson(res.body);
    return d is Map<String, dynamic> ? d : <String, dynamic>{};
  }

  Future<List<String>> getSchoolDays() async {
    try {
      final res = await http.get(_u(ApiConstants.schoolDays), headers: _headers).timeout(const Duration(seconds: 10));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['schoolDays'] is List) {
          return (d['schoolDays'] as List).map((e) => e.toString().toLowerCase()).toList();
        }
      }
    } catch (_) {}
    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  }

  Future<List<String>> getWeeklyTables(String className) async {
    try {
      final res = await http.get(_u('${ApiConstants.weeklyTables}/$className'), headers: _headers).timeout(const Duration(seconds: 10));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d.map((e) => e.toString()).toList();
        if (d is Map && d['tables'] is List) return (d['tables'] as List).map((e) => e.toString()).toList();
      }
    } catch (_) {}
    return [];
  }

  /// GET weekly attendance for a class + week (Monday date, YYYY-MM-DD).
  /// Returns { exists: bool, data: [...] }.
  Future<Map<String, dynamic>> getWeeklyAttendance({
    required String className,
    required String weekStart,
  }) async {
    final res = await http.get(_u('${ApiConstants.weeklyAttendance}/$className/$weekStart'), headers: _headers).timeout(const Duration(seconds: 15));
    if (!_ok(res)) throw ApiException(res.statusCode, _err(res));
    final d = _safeJson(res.body);
    if (d is Map<String, dynamic>) return d;
    return <String, dynamic>{'exists': false, 'data': <dynamic>[]};
  }

  Future<bool> createWeeklyAttendance({
    required String className,
    required String weekStart,
    required int globalStaffId,
  }) async {
    final res = await http
        .post(_u(ApiConstants.createWeeklyAttendance),
            headers: _headers,
            body: jsonEncode({
              'className': className,
              'weekStart': weekStart,
              'globalStaffId': globalStaffId,
            }))
        .timeout(const Duration(seconds: 20));
    return _ok(res);
  }

  /// PUT weekly attendance. [records] must contain ALL 7 day values per student.
  Future<bool> updateWeeklyAttendance({
    required String className,
    required String weekStart,
    required int globalStaffId,
    required List<Map<String, dynamic>> records,
  }) async {
    final res = await http
        .put(_u('${ApiConstants.weeklyAttendance}/$className/$weekStart'),
            headers: _headers,
            body: jsonEncode({'globalStaffId': globalStaffId, 'records': records}))
        .timeout(const Duration(seconds: 25));
    return _ok(res);
  }

  Future<List<Map<String, dynamic>>> getClassStudents(String className) async {
    try {
      final res = await http.get(_u('${ApiConstants.classStudents}/$className'), headers: _headers).timeout(const Duration(seconds: 12));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d.map((e) => Map<String, dynamic>.from(e)).toList();
        if (d is Map && d['students'] is List) {
          return (d['students'] as List).map((e) => Map<String, dynamic>.from(e)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  /// Full student rows (includes guardian_username / guardian_phone / class_id).
  Future<List<Map<String, dynamic>>> getStudentRows(String className) async {
    try {
      final res = await http.get(_u('${ApiConstants.studentListStudents}/$className'), headers: _headers).timeout(const Duration(seconds: 15));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  // ------------------------------------------------------------- DISCIPLINE

  Future<List<Map<String, dynamic>>> getFaultStudents(String className) async {
    try {
      final res = await http.get(_u('${ApiConstants.faultsStudents}/$className'), headers: _headers).timeout(const Duration(seconds: 12));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<List<FaultRecord>> getFaultHistory(String className) async {
    try {
      final res = await http.get(_u('${ApiConstants.faultsList}/$className'), headers: _headers).timeout(const Duration(seconds: 12));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) {
          return d.map((f) => FaultRecord.fromJson({
                ...Map<String, dynamic>.from(f),
                'class_name': className,
              })).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  Future<bool> addFault({
    required String studentName,
    required String className,
    required String faultType,
    required String faultLevel,
    required String date,
    required String description,
    required String reportedBy,
    String? attachmentPath,
  }) async {
    try {
      if (attachmentPath != null && attachmentPath.isNotEmpty && File(attachmentPath).existsSync()) {
        final req = http.MultipartRequest('POST', _u(ApiConstants.addFault))
          ..headers.addAll(_headers)
          ..fields['className'] = className
          ..fields['student_name'] = studentName
          ..fields['fault_type'] = faultType
          ..fields['fault_level'] = faultLevel
          ..fields['date'] = date
          ..fields['description'] = description
          ..fields['reported_by'] = reportedBy;
        req.files.add(await http.MultipartFile.fromPath('attachment', attachmentPath));
        final streamed = await req.send().timeout(const Duration(seconds: 30));
        return streamed.statusCode >= 200 && streamed.statusCode < 300;
      }
      final res = await http
          .post(_u(ApiConstants.addFault),
              headers: _headers,
              body: jsonEncode({
                'className': className,
                'student_name': studentName,
                'fault_type': faultType,
                'fault_level': faultLevel,
                'date': date,
                'description': description,
                'reported_by': reportedBy,
              }))
          .timeout(const Duration(seconds: 15));
      return _ok(res);
    } catch (_) {
      return false;
    }
  }

  // ------------------------------------------------------------------ CHAT

  Future<List<Map<String, dynamic>>> getConversations(String userId) async {
    try {
      final res = await http.get(_u(ApiConstants.conversations, {'userId': userId}), headers: _headers).timeout(const Duration(seconds: 12));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d.map((e) => Map<String, dynamic>.from(e)).toList();
        if (d is Map && d['conversations'] is List) {
          return (d['conversations'] as List).map((e) => Map<String, dynamic>.from(e)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  Future<List<dynamic>> getConversationMessages(int conversationId, {int limit = 50, String? before}) async {
    try {
      final res = await http.get(
          _u('${ApiConstants.conversations}/$conversationId/messages',
              {'limit': '$limit', if (before != null) 'before': before}),
          headers: _headers).timeout(const Duration(seconds: 12));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d;
        if (d is Map && d['messages'] is List) return d['messages'] as List;
      }
    } catch (_) {}
    return [];
  }

  /// Create or find a direct conversation. Returns conversation id (or null).
  Future<int?> findOrCreateConversation({
    required List<Map<String, dynamic>> participants,
    String type = 'direct',
    String? className,
  }) async {
    try {
      final body = <String, dynamic>{'type': type, 'participants': participants};
      if (className != null) body['className'] = className;
      final res = await http
          .post(_u(ApiConstants.conversations),
              headers: _headers, body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['id'] != null) return int.tryParse(d['id'].toString());
      }
    } catch (_) {}
    return null;
  }

  Future<Map<String, dynamic>?> sendMessage({
    required int conversationId,
    required String messageText,
    required String senderId,
    required String senderType,
    required String senderName,
    List<String> attachmentPaths = const [],
  }) async {
    try {
      if (attachmentPaths.isNotEmpty) {
        final req = http.MultipartRequest('POST', _u('${ApiConstants.conversations}/$conversationId/messages'))
          ..headers.addAll(_headers)
          ..fields['senderId'] = senderId
          ..fields['senderType'] = senderType
          ..fields['senderName'] = senderName
          ..fields['messageText'] = messageText;
        for (final p in attachmentPaths) {
          if (File(p).existsSync()) req.files.add(await http.MultipartFile.fromPath('attachments', p));
        }
        final streamed = await req.send().timeout(const Duration(seconds: 60));
        final body = await streamed.stream.transform(utf8.decoder).join();
        if (streamed.statusCode >= 200 && streamed.statusCode < 300) {
          final d = _safeJson(body);
          return d is Map<String, dynamic> ? d : null;
        }
        return null;
      }
      final res = await http
          .post(_u('${ApiConstants.conversations}/$conversationId/messages'),
              headers: _headers,
              body: jsonEncode({
                'senderId': senderId,
                'senderType': senderType,
                'senderName': senderName,
                'messageText': messageText,
              }))
          .timeout(const Duration(seconds: 15));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        return d is Map<String, dynamic> ? d : null;
      }
    } catch (_) {}
    return null;
  }

  Future<bool> markConversationRead({required int conversationId, required String userId}) async {
    try {
      final res = await http
          .put(_u(ApiConstants.messagesRead),
              headers: _headers,
              body: jsonEncode({'conversationId': conversationId, 'userId': userId}))
          .timeout(const Duration(seconds: 10));
      return _ok(res);
    } catch (_) {
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> getGuardianContacts() async {
    try {
      final res = await http.get(_u(ApiConstants.guardianContacts), headers: _headers).timeout(const Duration(seconds: 15));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  // ----------------------------------------------------------------- POSTS

  Future<List<Post>> getPosts({String role = 'staff'}) async {
    try {
      final res = await http.get(_u(ApiConstants.postsFeed, {'role': role}), headers: _headers).timeout(const Duration(seconds: 8));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d.map((p) => Post.fromJson(Map<String, dynamic>.from(p))).toList();
        if (d is Map && d['posts'] is List) {
          return (d['posts'] as List).map((p) => Post.fromJson(Map<String, dynamic>.from(p))).toList();
        }
      }
    } catch (e) {
      debugPrint('getPosts error: $e');
    }
    return [];
  }

  Future<bool> likePost(int postId) async {
    try {
      final res = await http.put(_u('${ApiConstants.postLike}/$postId/like'), headers: _headers).timeout(const Duration(seconds: 10));
      return _ok(res);
    } catch (_) {
      return false;
    }
  }

  // -------------------------------------------------------------- SCHEDULE

  Future<List<ScheduleSlot>> getTeacherSchedule(String teacherName) async {
    try {
      final res = await http.get(_u(ApiConstants.scheduleByTeacher), headers: _headers).timeout(const Duration(seconds: 8));
      if (_ok(res)) {
        final data = _safeJson(res.body);
        if (data is Map) {
          Map? my = data[teacherName] as Map?;
          my ??= data[teacherName.trim()] as Map?;
          if (my == null) {
            for (final k in data.keys) {
              if (k.toString().trim().toLowerCase() == teacherName.trim().toLowerCase()) {
                my = data[k] as Map?;
                break;
              }
            }
          }
          if (my != null && my['schedule'] is List) {
            return (my['schedule'] as List)
                .map((s) => ScheduleSlot.fromJson(Map<String, dynamic>.from(s)))
                .toList();
          }
        }
      }
    } catch (_) {}
    return [];
  }

  // --------------------------------------------------------- EVALUATION BOOK

  Future<List<Map<String, dynamic>>> getEvalBookAssignments(int teacherId) async {
    try {
      final res = await http.get(_u('${ApiConstants.evalBookAssignments}/$teacherId'), headers: _headers).timeout(const Duration(seconds: 12));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<bool> submitDailyEvaluation(Map<String, dynamic> data) async {
    final res = await http.post(_u(ApiConstants.evalBookDaily), headers: _headers, body: jsonEncode(data)).timeout(const Duration(seconds: 15));
    return _ok(res);
  }

  Future<List<StaffEvaluation>> getStaffEvaluations(int globalStaffId) async {
    try {
      final res = await http.get(_u('${ApiConstants.staffEvaluations}/$globalStaffId'), headers: _headers).timeout(const Duration(seconds: 12));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d.map((e) => StaffEvaluation.fromJson(Map<String, dynamic>.from(e))).toList();
      }
    } catch (_) {}
    return [];
  }
}
