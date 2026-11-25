import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:mime/mime.dart';
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

  /// Auth headers without Content-Type (multipart requests set their own).
  Map<String, String> get _authHeadersOnly {
    final token = StorageService.token ?? '';
    final branch = (StorageService.branchCode ?? '').toUpperCase();
    return {
      'Authorization': 'Bearer $token',
      'x-branch-code': branch,
    };
  }

  Uri _u(String path, [Map<String, String>? query]) {
    final uri = Uri.parse('${ApiConstants.baseUrl}$path');
    return query == null ? uri : uri.replace(queryParameters: {...uri.queryParameters, ...query});
  }

  /// Multipart file content type. Dart's MultipartFile.fromPath otherwise
  /// sends application/octet-stream, which the backend file validation rejects.
  MediaType? _mediaTypeFor(String path) {
    final mime = lookupMimeType(path);
    if (mime == null || mime.isEmpty) return null;
    return MediaType.parse(mime);
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

  /// Retry helper: retries on network errors/timeouts up to [retries] times
  /// with increasing delay. Only retries on connection errors, not HTTP errors.
  Future<T> _retry<T>(
    Future<T> Function() fn, {
    int retries = 3,
    Duration delay = const Duration(milliseconds: 800),
  }) async {
    for (int i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (e) {
        // Don't retry on HTTP exceptions (server responded)
        if (e is ApiException) rethrow;
        // Retry on timeout/socket/connection errors
        if (i == retries - 1) rethrow;
        await Future.delayed(delay * (i + 1));
      }
    }
    throw Exception('retry exhausted');
  }

  /// Details of the most recent failed write (used to detect admin locks,
  /// validation errors etc. instead of a bare `false`).
  int? lastStatusCode;
  String? lastError;

  // ---------------------------------------------------------------- AUTH

  Future<Map<String, dynamic>> adminLogin({
    required String branchCode,
    required String username,
    required String password,
  }) async {
    final res = await http
        .post(
          _u('/api/admin/login'),
          headers: {
            ...ApiConstants.publicHeaders(),
            'x-branch-code': branchCode.trim().toUpperCase(),
          },
          body: jsonEncode({
            'username': username.trim(),
            'password': password,
          }),
        )
        .timeout(const Duration(seconds: 45));
    if (_ok(res)) return jsonDecode(res.body) as Map<String, dynamic>;
    throw ApiException(res.statusCode, _err(res));
  }

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

  Future<String?> changeAdminPassword(
      String username, String currentPassword, String newPassword) async {
    try {
      final res = await http.post(
        _u('/api/user-profile/admin/change-password'),
        headers: _headers,
        body: jsonEncode({
          'username': username,
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        }),
      ).timeout(const Duration(seconds: 20));
      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && data['success'] == true) return null;
      final error = data['error']?.toString() ?? 'Failed to change password';
      final details = data['errors'];
      return details is List && details.isNotEmpty ? '$error: ${details.join(', ')}' : error;
    } catch (e) {
      return e.toString().replaceAll('Exception:', '').trim();
    }
  }

  Future<String?> changeAdminUsername(
      String currentUsername, String newUsername, String password) async {
    try {
      final res = await http.post(
        _u('/api/user-profile/admin/change-username'),
        headers: _headers,
        body: jsonEncode({
          'currentUsername': currentUsername,
          'newUsername': newUsername,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 20));
      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && data['success'] == true) return null;
      final error = data['error']?.toString() ?? 'Failed to change username';
      final details = data['errors'];
      return details is List && details.isNotEmpty ? '$error: ${details.join(', ')}' : error;
    } catch (e) {
      return e.toString().replaceAll('Exception:', '').trim();
    }
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
    try {
      final res = await _retry(
        () => http.get(_u('${ApiConstants.teacherMarkLists}/$enc'), headers: _headers).timeout(const Duration(seconds: 15)),
        retries: 3,
      );
      if (!_ok(res)) return [];
      final data = _safeJson(res.body);
      if (data is Map && data['assignments'] is List) {
        return (data['assignments'] as List)
            .map((a) => TeacherAssignment.fromJson(Map<String, dynamic>.from(a)))
            .toList();
      }
    } catch (_) {}
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
    final res = await _retry(
      () => http.get(_u('${ApiConstants.markList}/$s/$c/$termNumber'), headers: _headers).timeout(const Duration(seconds: 20)),
      retries: 3,
    );
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
    final res = await _retry(
      () => http
          .post(_u(ApiConstants.bulkUpdateMarks),
              headers: _headers,
              body: jsonEncode({
                'subjectName': subjectName,
                'className': className,
                'termNumber': termNumber,
                'marksData': rows,
              }))
          .timeout(const Duration(seconds: 30)),
      retries: 3,
    );
    var ok = _ok(res);
    if (ok) {
      final d = _safeJson(res.body);
      final updated = d is Map ? d['updatedCount'] : null;
      if (updated is num && updated == 0) {
        ok = false;
        lastStatusCode = 422;
        lastError = (d is Map ? d['error']?.toString() : null) ??
            'No marks were saved. Please retry.';
      }
    }
    if (ok) {
      lastStatusCode = null;
      lastError = null;
    } else {
      lastStatusCode = res.statusCode;
      lastError = _err(res);
    }
    return ok;
  }

  /// Global mark-list config (term_count, etc.). Returns {} on failure.
  Future<Map<String, dynamic>> getClassRanking(String className, int termNumber) async {
    try {
      final res = await http.get(
        _u('/api/mark-list/ranking/${Uri.encodeComponent(className)}/$termNumber'),
        headers: _headers,
      ).timeout(const Duration(seconds: 30));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map) return Map<String, dynamic>.from(d);
      }
    } catch (_) {}
    return <String, dynamic>{};
  }

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
    try {
      final res = await _retry(
        () => http.get(_u('${ApiConstants.teacherAssignment}/$enc'), headers: _headers).timeout(const Duration(seconds: 12)),
        retries: 3,
      );
      if (!_ok(res)) return <String, dynamic>{};
      final d = _safeJson(res.body);
      return d is Map<String, dynamic> ? d : <String, dynamic>{};
    } catch (_) {
      return <String, dynamic>{};
    }
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

  Future<List<String>> getClasses() async {
    final res = await http.get(_u('/api/student-list/classes'), headers: _headers).timeout(const Duration(seconds: 15));
    if (!_ok(res)) throw ApiException(res.statusCode, _err(res));
    final data = _safeJson(res.body);
    if (data is List) return data.map((e) => e.toString()).toList();
    return [];
  }

  Future<List<Map<String, dynamic>>> getSubjectsClasses() async {
    final res = await http.get(_u('/api/mark-list/subjects-classes'), headers: _headers).timeout(const Duration(seconds: 20));
    if (!_ok(res)) throw ApiException(res.statusCode, _err(res));
    final data = _safeJson(res.body);
    if (data is List) return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    return [];
  }

  Future<List<Map<String, dynamic>>> getStaffAccess() async {
    try {
      final res = await http.get(_u('/api/admin/staff-access'), headers: _headers).timeout(const Duration(seconds: 25));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is List) return (d['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<String?> updateStaffAccess({
    required int globalStaffId,
    required bool isActive,
    required List<String> permissions,
    String? username,
    String? password,
  }) async {
    try {
      final res = await http.put(_u('/api/admin/staff-access/$globalStaffId'), headers: _headers, body: jsonEncode({
        'is_active': isActive,
        'permissions': permissions,
        if (username != null && username.trim().isNotEmpty) 'username': username.trim(),
        if (password != null && password.trim().isNotEmpty) 'password': password.trim(),
      })).timeout(const Duration(seconds: 25));
      return _ok(res) ? null : _err(res);
    } catch (e) { return e.toString(); }
  }

  Future<List<Map<String, dynamic>>> getStaffCredentials() async {
    try {
      final res = await http.get(_u('/api/admin/staff-access/credentials'), headers: _headers).timeout(const Duration(seconds: 25));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is List) return (d['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<String?> removeStaffAccess(int globalStaffId) async {
    try {
      final res = await http.delete(_u('/api/admin/staff-access/$globalStaffId'), headers: _headers).timeout(const Duration(seconds: 20));
      return _ok(res) ? null : _err(res);
    } catch (e) {
      return e.toString();
    }
  }

  Future<List<Map<String, dynamic>>> getSubAccounts() async {
    try {
      final res = await http.get(_u('/api/admin/sub-accounts'), headers: _headers).timeout(const Duration(seconds: 20));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is List) return (d['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<Map<String, dynamic>?> createSubAccount({
    required String name,
    required String email,
    required String username,
    required String password,
    required List<String> permissions,
  }) async {
    try {
      final res = await http.post(_u('/api/admin/sub-accounts'), headers: _headers, body: jsonEncode({
        'name': name,
        'email': email,
        'username': username,
        'password': password,
        'permissions': permissions,
      })).timeout(const Duration(seconds: 25));
      final d = _safeJson(res.body);
      if (_ok(res)) return d is Map ? Map<String, dynamic>.from(d) : <String, dynamic>{'success': true};
      return {'error': d is Map ? (d['error'] ?? 'Could not create account') : 'Could not create account'};
    } catch (e) {
      return {'error': e.toString()};
    }
  }

  Future<bool> updateSubAccount(int id, Map<String, dynamic> updates) async {
    try {
      final res = await http.put(_u('/api/admin/sub-accounts/$id'), headers: _headers, body: jsonEncode(updates)).timeout(const Duration(seconds: 20));
      return _ok(res);
    } catch (_) {
      return false;
    }
  }

  Future<bool> deleteSubAccount(int id) async {
    try {
      final res = await http.delete(_u('/api/admin/sub-accounts/$id'), headers: _headers).timeout(const Duration(seconds: 20));
      return _ok(res);
    } catch (_) {
      return false;
    }
  }

  Future<String?> createAdminPostWithMedia({
    required String title,
    required String body,
    String link = '',
    required int adminId,
    required String adminName,
    String audience = 'all',
    required List<String> mediaPaths,
  }) async {
    try {
      final req = http.MultipartRequest('POST', _u('/api/posts'));
      final headers = Map<String, String>.from(_headers)..remove('Content-Type');
      req.headers.addAll(headers);
      req.fields['title'] = title;
      req.fields['body'] = body;
      req.fields['link'] = link;
      req.fields['author_type'] = 'admin';
      req.fields['author_id'] = '$adminId';
      req.fields['author_name'] = adminName;
      req.fields['audiences'] = jsonEncode([{'type': audience}]);
      for (final p in mediaPaths) {
        if (File(p).existsSync()) req.files.add(await http.MultipartFile.fromPath('media', p, contentType: _mediaTypeFor(p)));
      }
      final streamed = await req.send().timeout(const Duration(seconds: 300));
      if (streamed.statusCode >= 200 && streamed.statusCode < 300) return null;
      final respBody = await streamed.stream.transform(utf8.decoder).join();
      final d = _safeJson(respBody);
      if (d is Map && d['error'] != null) {
        final details = d['details'];
        return details != null ? '${d['error']}: $details' : '${d['error']}';
      }
      return 'Upload failed (${streamed.statusCode})';
    } catch (e) {
      return e.toString();
    }
  }

  Future<List<Map<String, dynamic>>> getSmsRecipients() async {
    try {
      final res = await http.get(_u('/api/sms/recipients'), headers: _headers).timeout(const Duration(seconds: 30));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        if (d is Map && d['data'] is List) return (d['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<String?> sendSms({required String message, required List<Map<String, dynamic>> recipients}) async {
    try {
      final res = await http.post(_u('/api/sms/send'), headers: _headers, body: jsonEncode({
        'message': message,
        'recipients': recipients,
      })).timeout(const Duration(seconds: 60));
      if (_ok(res)) return null;
      return _err(res);
    } catch (e) { return e.toString(); }
  }

  Future<Map<String, dynamic>> getSmsCounter() async {
    try {
      final res = await http.get(_u('/api/sms/counter'), headers: _headers).timeout(const Duration(seconds: 20));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is Map) {
          final data = Map<String, dynamic>.from(d['data'] as Map);
          if (data['totals'] is Map) return Map<String, dynamic>.from(data['totals'] as Map);
          return data;
        }
        if (d is Map) return Map<String, dynamic>.from(d);
      }
    } catch (_) {}
    return {};
  }

  Future<List<Map<String, dynamic>>> getSmsLogs() async {
    try {
      final res = await http.get(_u('/api/sms/logs'), headers: _headers).timeout(const Duration(seconds: 25));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is List) return (d['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        if (d is List) return d.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<List<dynamic>> getMarkTeachers() async {
    try {
      final res = await http.get(_u('/api/mark-list/teachers'), headers: _headers).timeout(const Duration(seconds: 20));
      if (_ok(res)) { final d = _safeJson(res.body); if (d is List) return d; }
    } catch (_) {}
    return [];
  }

  Future<List<Map<String, dynamic>>> getSubjectClassCombinations() async {
    try {
      final res = await http.get(_u('/api/mark-list/subject-class-combinations'), headers: _headers).timeout(const Duration(seconds: 25));
      if (_ok(res)) { final d = _safeJson(res.body); if (d is List) return d.map((e) => Map<String, dynamic>.from(e as Map)).toList(); }
    } catch (_) {}
    return [];
  }

  Future<List<Map<String, dynamic>>> getTeacherAssignments() async {
    try {
      final res = await http.get(_u('/api/mark-list/teacher-assignments'), headers: _headers).timeout(const Duration(seconds: 25));
      if (_ok(res)) { final d = _safeJson(res.body); if (d is List) return d.map((e) => Map<String, dynamic>.from(e as Map)).toList(); }
    } catch (_) {}
    return [];
  }

  Future<String?> assignTeachers(List<Map<String, dynamic>> assignments) async {
    try {
      final res = await http.post(_u('/api/mark-list/assign-teachers'), headers: _headers, body: jsonEncode({'assignments': assignments})).timeout(const Duration(seconds: 30));
      return _ok(res) ? null : _err(res);
    } catch (e) { return e.toString(); }
  }

  Future<List<Map<String, dynamic>>> getEvaluationForms() async {
    try {
      final res = await http.get(_u('/api/teacher-evaluations/forms'), headers: _headers).timeout(const Duration(seconds: 20));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is List) return (d['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<String?> saveEvaluationForm({int? id, required String name, required List<dynamic> fields, String formType = 'custom', int ratingMax = 5}) async {
    try {
      final body = jsonEncode({
        'name': name,
        'fields': fields,
        'formType': formType,
        'ratingMax': ratingMax,
        'settings': {'comments': formType == 'teaching_quality'},
      });
      final res = id == null
          ? await http.post(_u('/api/teacher-evaluations/forms'), headers: _headers, body: body).timeout(const Duration(seconds: 25))
          : await http.put(_u('/api/teacher-evaluations/forms/$id'), headers: _headers, body: body).timeout(const Duration(seconds: 25));
      return _ok(res) ? null : _err(res);
    } catch (e) { return e.toString(); }
  }

  Future<bool> deleteEvaluationForm(int id) async {
    try {
      final res = await http.delete(_u('/api/teacher-evaluations/forms/$id'), headers: _headers).timeout(const Duration(seconds: 20));
      return _ok(res);
    } catch (_) { return false; }
  }

  Future<List<Map<String, dynamic>>> getEvaluationTeacherOptions() async {
    try {
      final res = await http.get(_u('/api/teacher-evaluations/teacher-options'), headers: _headers).timeout(const Duration(seconds: 20));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is List) {
          return (d['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  Future<String?> submitEvaluation({
    required int formId,
    required String teacherId,
    required String teacherName,
    required String date,
    String note = '',
    String subject = '',
    String subjectClass = '',
    required Map<String, dynamic> data,
  }) async {
    try {
      final res = await http.post(_u('/api/teacher-evaluations/submissions'), headers: _headers, body: jsonEncode({
        'formId': formId, 'teacherId': teacherId, 'teacherName': teacherName,
        'date': date, 'note': note, 'data': data,
        'subject': subject, 'subjectClass': subjectClass,
      })).timeout(const Duration(seconds: 25));
      return _ok(res) ? null : _err(res);
    } catch (e) { return e.toString(); }
  }

  Future<List<Map<String, dynamic>>> getEvaluationSubmissions() async {
    try {
      final res = await http.get(_u('/api/teacher-evaluations/submissions'), headers: _headers).timeout(const Duration(seconds: 25));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is List) return (d['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<List<Map<String, dynamic>>> getLeaveIssues(int month, int year, {String? status}) async {
    try {
      final res = await http.get(
        _u('/api/hr/leave/attendance-issues', {
          'ethMonth': '$month', 'ethYear': '$year',
          if (status != null) 'status': status,
        }),
        headers: _headers,
      ).timeout(const Duration(seconds: 30));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is List) return (d['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<String?> approveLeave(String attendanceId, String reason) async {
    try {
      final res = await http.post(_u('/api/hr/leave/approve-permission'), headers: _headers, body: jsonEncode({'attendanceId': attendanceId, 'reason': reason})).timeout(const Duration(seconds: 25));
      return _ok(res) ? null : _err(res);
    } catch (e) { return e.toString(); }
  }

  Future<String?> rejectLeave(String attendanceId, String reason) async {
    try {
      final res = await http.post(_u('/api/hr/leave/reject-permission'), headers: _headers, body: jsonEncode({'attendanceId': attendanceId, 'reason': reason})).timeout(const Duration(seconds: 25));
      return _ok(res) ? null : _err(res);
    } catch (e) { return e.toString(); }
  }

  Future<List<Map<String, dynamic>>> getLeaveRecords(int month, int year) async {
    try {
      final res = await http.get(
        _u('/api/hr/leave/leave-records', {'ethMonth': '$month', 'ethYear': '$year'}),
        headers: _headers,
      ).timeout(const Duration(seconds: 30));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is List) return (d['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<String?> grantLeave({
    required String staffId,
    required String staffName,
    required String departmentName,
    required int startMonth,
    required int startDay,
    required int startYear,
    required int numberOfDays,
    required String reason,
  }) async {
    try {
      final res = await http.post(_u('/api/hr/leave/grant-leave'), headers: _headers, body: jsonEncode({
        'staffId': staffId,
        'staffName': staffName,
        'departmentName': departmentName,
        'startMonth': startMonth,
        'startDay': startDay,
        'startYear': startYear,
        'numberOfDays': numberOfDays,
        'reason': reason,
      })).timeout(const Duration(seconds: 30));
      return _ok(res) ? null : _err(res);
    } catch (e) { return e.toString(); }
  }

  Future<Map<String, dynamic>> getCurrentEthiopianDate() async {
    try {
      final res = await http.get(_u('/api/academic/student-attendance/current-date'), headers: _headers).timeout(const Duration(seconds: 15));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is Map) return Map<String, dynamic>.from(d['data'] as Map);
      }
    } catch (_) {}
    return {};
  }

  Future<List<String>> getAcademicAttendanceClasses() async {
    try {
      final res = await http.get(_u('/api/academic/student-attendance/classes'), headers: _headers).timeout(const Duration(seconds: 20));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is List) return (d['data'] as List).map((e) => e.toString()).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<List<Map<String, dynamic>>> getAcademicAttendanceStudents(String className) async {
    try {
      final res = await http.get(_u('/api/academic/student-attendance/students', {'class': className}), headers: _headers).timeout(const Duration(seconds: 25));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is List) return (d['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<List<Map<String, dynamic>>> getAcademicAttendanceWeekly({
    required int week,
    required int year,
    required int month,
    required String className,
  }) async {
    try {
      final res = await http.get(_u('/api/academic/student-attendance/weekly', {
        'week': '$week', 'year': '$year', 'month': '$month', 'class': className,
      }), headers: _headers).timeout(const Duration(seconds: 30));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is List) return (d['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<List<Map<String, dynamic>>> getAcademicAttendanceMonthly({
    required int year,
    required int month,
    String? className,
  }) async {
    try {
      final res = await http.get(_u('/api/academic/student-attendance/monthly', {
        'year': '$year', 'month': '$month',
        if (className != null && className.isNotEmpty) 'class': className,
      }), headers: _headers).timeout(const Duration(seconds: 40));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is List) {
          return (d['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  Future<bool> saveAcademicAttendance({
    required String studentId,
    required String className,
    required int ethYear,
    required int ethMonth,
    required int ethDay,
    required String status,
    String checkInTime = '08:00:00',
    String notes = '',
  }) async {
    try {
      final res = await http.put(_u('/api/academic/student-attendance/update'), headers: _headers, body: jsonEncode({
        'studentId': studentId,
        'className': className,
        'ethYear': ethYear,
        'ethMonth': ethMonth,
        'ethDay': ethDay,
        'status': status,
        'checkInTime': checkInTime,
        'notes': notes,
      })).timeout(const Duration(seconds: 25));
      return _ok(res);
    } catch (_) {
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> getEthiopianAttendance(int month, int year) async {
    try {
      final res = await http.get(
        _u('/api/hr/attendance/ethiopian-month', {'ethMonth': '$month', 'ethYear': '$year'}),
        headers: _headers,
      ).timeout(const Duration(seconds: 30));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map && d['data'] is List) {
          return (d['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        }
        if (d is List) return d.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<String?> saveStaffAttendance({
    required String staffId,
    required String staffName,
    required int ethMonth,
    required int ethYear,
    required int ethDay,
    required String statusCode,
    String? checkIn,
    String? checkOut,
    String shiftType = '',
    required String createdBy,
  }) async {
    try {
      final res = await http.post(
        _u('/api/hr/attendance/ethiopian'),
        headers: _headers,
        body: jsonEncode({
          'staffId': staffId,
          'staffName': staffName,
          'ethMonth': ethMonth,
          'ethYear': ethYear,
          'ethDay': ethDay,
          'checkIn': checkIn ?? '00:00',
          'checkOut': checkOut,
          'status': statusCode,
          'source': 'admin_app',
          'createdBy': createdBy,
          if (shiftType.isNotEmpty) 'shiftType': shiftType,
        }),
      ).timeout(const Duration(seconds: 40));
      if (_ok(res)) return null;
      return _err(res);
    } catch (e) {
      return e.toString();
    }
  }

  Future<bool> markEthiopianAttendance({
    required String staffId,
    required String staffName,
    required int ethMonth,
    required int ethYear,
    required int ethDay,
    required String status,
    required String createdBy,
  }) async {
    final present = status == 'P';
    final late = status == 'L';
    final leave = status == 'E';
    final checkIn = present ? '08:00' : (late ? '08:20' : '00:00');
    final checkOut = present || late ? '17:00' : '00:00';
    try {
      final res = await http.post(
        _u('/api/hr/attendance/ethiopian'),
        headers: _headers,
        body: jsonEncode({
          'staffId': staffId,
          'staffName': staffName,
          'ethMonth': ethMonth,
          'ethYear': ethYear,
          'ethDay': ethDay,
          'checkIn': checkIn,
          'checkOut': checkOut,
          'status': leave ? 'LEAVE' : (present ? 'PRESENT' : (late ? 'LATE' : 'ABSENT')),
          'source': 'admin_app',
          'createdBy': createdBy,
        }),
      ).timeout(const Duration(seconds: 30));
      return _ok(res);
    } catch (_) {
      return false;
    }
  }

  Future<List<String>> getStaffClasses(String staffType) async {
    final res = await http.get(
      _u('/api/staff/classes?staffType=${Uri.encodeComponent(staffType)}'),
      headers: _headers,
    ).timeout(const Duration(seconds: 20));
    if (!_ok(res)) throw ApiException(res.statusCode, _err(res));
    final data = _safeJson(res.body);
    if (data is List) return data.map((e) => e.toString()).toList();
    return [];
  }

  Future<List<Map<String, dynamic>>> getStaffData(String staffType, String className) async {
    final res = await http.get(
      _u('/api/staff/data/${Uri.encodeComponent(staffType)}/${Uri.encodeComponent(className)}'),
      headers: _headers,
    ).timeout(const Duration(seconds: 30));
    if (!_ok(res)) throw ApiException(res.statusCode, _err(res));
    final data = _safeJson(res.body);
    if (data is Map && data['data'] is List) {
      return (data['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    if (data is List) return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    return [];
  }

  Future<List<Map<String, dynamic>>> getAdminPosts() async {
    Object? lastError;
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        final res = await http.get(_u('/api/posts/feed?role=admin'), headers: _headers).timeout(const Duration(seconds: 30));
        if (_ok(res)) {
          final data = _safeJson(res.body);
          if (data is List) return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          return [];
        }
        lastError = ApiException(res.statusCode, _err(res));
      } catch (e) {
        lastError = e;
      }
      if (attempt == 0) await Future.delayed(const Duration(milliseconds: 700));
    }
    if (lastError is ApiException) throw lastError;
    throw ApiException(0, lastError?.toString() ?? 'Could not load posts');
  }

  Future<String?> createAdminPost({
    required String title,
    required String body,
    String link = '',
    required int adminId,
    required String adminName,
    String audience = 'all',
  }) async {
    try {
      final res = await http.post(
        _u('/api/posts'),
        headers: _headers,
        body: jsonEncode({
          'title': title,
          'body': body,
          'link': link,
          'author_type': 'admin',
          'author_id': adminId,
          'author_name': adminName,
          'audiences': jsonEncode([
            {'type': audience}
          ]),
        }),
      ).timeout(const Duration(seconds: 20));
      if (_ok(res)) return null;
      return _err(res);
    } catch (e) {
      return e.toString();
    }
  }

  Future<String?> updateAdminPostWithMedia({
    required int id,
    required String title,
    required String body,
    String link = '',
    String audience = 'all',
    required List<String> mediaPaths,
    List<Map<String, dynamic>> existingMedia = const [],
  }) async {
    try {
      final req = http.MultipartRequest('PUT', _u('/api/posts/$id'));
      final headers = Map<String, String>.from(_headers)..remove('Content-Type');
      req.headers.addAll(headers);
      req.fields['title'] = title;
      req.fields['body'] = body;
      req.fields['link'] = link;
      req.fields['audiences'] = jsonEncode([{'type': audience}]);
      req.fields['existing_media'] = jsonEncode(existingMedia);
      for (final p in mediaPaths) {
        if (File(p).existsSync()) req.files.add(await http.MultipartFile.fromPath('media', p, contentType: _mediaTypeFor(p)));
      }
      final streamed = await req.send().timeout(const Duration(seconds: 300));
      if (streamed.statusCode >= 200 && streamed.statusCode < 300) return null;
      final respBody = await streamed.stream.transform(utf8.decoder).join();
      final d = _safeJson(respBody);
      if (d is Map && d['error'] != null) return '${d['error']}';
      return 'Upload failed (${streamed.statusCode})';
    } catch (e) {
      return e.toString();
    }
  }

  Future<String?> updateAdminPost({
    required int id,
    required String title,
    required String body,
    String link = '',
    String audience = 'all',
  }) async {
    try {
      final res = await http.put(
        _u('/api/posts/$id'),
        headers: _headers,
        body: jsonEncode({
          'title': title,
          'body': body,
          'link': link,
          'audiences': jsonEncode([
            {'type': audience}
          ]),
        }),
      ).timeout(const Duration(seconds: 20));
      if (_ok(res)) return null;
      return _err(res);
    } catch (e) {
      return e.toString();
    }
  }

  Future<bool> deleteAdminPost(int id) async {
    try {
      final res = await http.delete(_u('/api/posts/$id'), headers: _headers).timeout(const Duration(seconds: 20));
      return _ok(res);
    } catch (_) {
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> getGuardians() async {
    final res = await http.get(_u('/api/guardian-list/guardians'), headers: _headers).timeout(const Duration(seconds: 30));
    if (!_ok(res)) throw ApiException(res.statusCode, _err(res));
    final data = _safeJson(res.body);
    if (data is List) return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    return [];
  }

  Future<List<Map<String, dynamic>>> getStudentList(String className) async {
    final c = Uri.encodeComponent(className);
    final res = await http.get(_u('/api/student-list/students/$c'), headers: _headers).timeout(const Duration(seconds: 20));
    if (!_ok(res)) throw ApiException(res.statusCode, _err(res));
    final data = _safeJson(res.body);
    if (data is List) return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    return [];
  }

  Future<Map<String, dynamic>> getDashboardStats() async {
    final res = await http.get(_u('/api/dashboard/stats'), headers: _headers).timeout(const Duration(seconds: 20));
    if (!_ok(res)) throw ApiException(res.statusCode, _err(res));
    final data = _safeJson(res.body);
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
  }

  Future<Map<String, dynamic>> getAttendanceAnalytics() async {
    final res = await http.get(_u('/api/dashboard/attendance-analytics'), headers: _headers).timeout(const Duration(seconds: 20));
    if (!_ok(res)) throw ApiException(res.statusCode, _err(res));
    final data = _safeJson(res.body);
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
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
    final res = await _retry(
      () => http.get(_u('${ApiConstants.weeklyAttendance}/$className/$weekStart'), headers: _headers).timeout(const Duration(seconds: 20)),
      retries: 3,
    );
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
    final res = await _retry(
      () => http
          .post(_u(ApiConstants.createWeeklyAttendance),
              headers: _headers,
              body: jsonEncode({
                'className': className,
                'weekStart': weekStart,
                'globalStaffId': globalStaffId,
              }))
          .timeout(const Duration(seconds: 25)),
      retries: 3,
    );
    return _ok(res);
  }

  /// PUT weekly attendance. [records] must contain ALL 7 day values per student.
  Future<bool> updateWeeklyAttendance({
    required String className,
    required String weekStart,
    required int globalStaffId,
    required List<Map<String, dynamic>> records,
  }) async {
    final res = await _retry(
      () => http
          .put(_u('${ApiConstants.weeklyAttendance}/$className/$weekStart'),
              headers: _headers,
              body: jsonEncode({'globalStaffId': globalStaffId, 'records': records}))
          .timeout(const Duration(seconds: 30)),
      retries: 3,
    );
    return _ok(res);
  }

  Future<List<Map<String, dynamic>>> getClassStudents(String className) async {
    try {
      final res = await _retry(
        () => http.get(_u('${ApiConstants.classStudents}/$className'), headers: _headers).timeout(const Duration(seconds: 15)),
        retries: 3,
      );
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
      final res = await _retry(
        () => http.get(_u('${ApiConstants.studentListStudents}/$className'), headers: _headers).timeout(const Duration(seconds: 20)),
        retries: 3,
      );
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  // ------------------------------------------------------------- DISCIPLINE

  Future<List<String>> getAllClasses() async {
    try {
      final res = await http.get(_u(ApiConstants.faultsClasses), headers: _headers).timeout(const Duration(seconds: 12));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d.map((e) => e.toString()).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<List<Map<String, dynamic>>> getFaultStudents(String className) async {
    try {
      final res = await _retry(
        () => http.get(_u('${ApiConstants.faultsStudents}/$className'), headers: _headers).timeout(const Duration(seconds: 15)),
        retries: 3,
      );
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<List<FaultRecord>> getFaultHistory(String className) async {
    try {
      final res = await _retry(
        () => http.get(_u('${ApiConstants.faultsList}/$className'), headers: _headers).timeout(const Duration(seconds: 15)),
        retries: 3,
      );
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

  Future<List<FaultRecord>> getAllFaultHistory() async {
    try {
      final res = await http.get(_u('/api/faults/all-faults'), headers: _headers).timeout(const Duration(seconds: 45));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) {
          return d.map((f) => FaultRecord.fromJson(Map<String, dynamic>.from(f as Map))).toList();
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
        req.files.add(await http.MultipartFile.fromPath('attachment', attachmentPath, contentType: _mediaTypeFor(attachmentPath)));
        final streamed = await req.send().timeout(const Duration(seconds: 30));
        return streamed.statusCode >= 200 && streamed.statusCode < 300;
      }
      final res = await _retry(
        () => http
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
            .timeout(const Duration(seconds: 20)),
        retries: 3,
      );
      return _ok(res);
    } catch (_) {
      return false;
    }
  }

  // ------------------------------------------------------------------ CHAT

  Future<Map<String, List<dynamic>>> getClassTeacherData() async {
    final teachers = await http.get(_u('/api/class-teacher/teachers'), headers: _headers).timeout(const Duration(seconds: 15));
    final classes = await http.get(_u('/api/class-teacher/classes'), headers: _headers).timeout(const Duration(seconds: 15));
    final assignments = await http.get(_u('/api/class-teacher/assignments'), headers: _headers).timeout(const Duration(seconds: 15));
    T parse<T>(http.Response r) {
      if (!_ok(r)) return <dynamic>[] as T;
      final d = _safeJson(r.body);
      return (d is List ? d : <dynamic>[]) as T;
    }
    return {
      'teachers': parse<List<dynamic>>(teachers),
      'classes': parse<List<dynamic>>(classes),
      'assignments': parse<List<dynamic>>(assignments),
    };
  }

  Future<String?> assignClassTeacher({required int globalStaffId, required String teacherName, required String className}) async {
    try {
      final res = await http.post(_u('/api/class-teacher/assign'), headers: _headers, body: jsonEncode({
        'global_staff_id': globalStaffId,
        'teacher_name': teacherName,
        'assigned_class': className,
      })).timeout(const Duration(seconds: 20));
      if (_ok(res)) return null;
      return _err(res);
    } catch (e) {
      return e.toString();
    }
  }

  Future<bool> unassignClassTeacher(String className) async {
    try {
      final res = await http.delete(_u('/api/class-teacher/unassign/${Uri.encodeComponent(className)}'), headers: _headers).timeout(const Duration(seconds: 20));
      return _ok(res);
    } catch (_) {
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> getChatContacts(String type) async {
    try {
      final res = await http.get(_u('/api/chats/contacts/$type'), headers: _headers).timeout(const Duration(seconds: 15));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {}
    return [];
  }

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
          if (File(p).existsSync()) req.files.add(await http.MultipartFile.fromPath('attachments', p, contentType: _mediaTypeFor(p)));
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
      final res = await _retry(
        () => http.get(_u('${ApiConstants.evalBookAssignments}/$teacherId'), headers: _headers).timeout(const Duration(seconds: 15)),
        retries: 3,
      );
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is List) return d.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<bool> submitDailyEvaluation(Map<String, dynamic> data) async {
    final res = await _retry(
      () => http.post(_u(ApiConstants.evalBookDaily), headers: _headers, body: jsonEncode(data)).timeout(const Duration(seconds: 20)),
      retries: 3,
    );
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

  // ------------------------------------------------- STUDENTS / STAFF EDITING

  Future<String?> updateStudent({
    required String className,
    required String schoolId,
    required String classId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      final res = await http.put(
        _u('/api/student-list/student/${Uri.encodeComponent(className)}/'
            '${Uri.encodeComponent(schoolId)}/${Uri.encodeComponent(classId)}'),
        headers: _headers,
        body: jsonEncode(updates),
      ).timeout(const Duration(seconds: 30));
      return _ok(res) ? null : _err(res);
    } catch (e) {
      return e.toString();
    }
  }

  Future<String?> toggleStudentActive({
    required String className,
    required String schoolId,
    required String classId,
    required bool isActive,
  }) async {
    try {
      final res = await http.put(
        _u('/api/student-list/toggle-active/${Uri.encodeComponent(className)}/'
            '${Uri.encodeComponent(schoolId)}/${Uri.encodeComponent(classId)}'),
        headers: _headers,
        body: jsonEncode({'is_active': isActive}),
      ).timeout(const Duration(seconds: 30));
      return _ok(res) ? null : _err(res);
    } catch (e) {
      return e.toString();
    }
  }

  Future<String?> updateStaff({
    required String globalStaffId,
    required String staffType,
    required String className,
    required Map<String, dynamic> updates,
    Map<String, String> uploads = const {},
  }) async {
    try {
      final req = http.MultipartRequest(
        'PUT',
        _u('/api/staff/update/${Uri.encodeComponent(globalStaffId)}'),
      );
      req.headers.addAll(_authHeadersOnly);
      req.fields['staffType'] = staffType;
      req.fields['className'] = className;
      req.fields['updates'] = jsonEncode(updates);
      for (final entry in uploads.entries) {
        req.files.add(await http.MultipartFile.fromPath(
          entry.key,
          entry.value,
          contentType: _mediaTypeFor(entry.value),
        ));
      }
      final streamed = await req.send().timeout(const Duration(seconds: 60));
      final res = await http.Response.fromStream(streamed);
      return _ok(res) ? null : _err(res);
    } catch (e) {
      return e.toString();
    }
  }

  Future<String?> toggleStaffActive(String globalStaffId, bool isActive) async {
    try {
      final res = await http.put(
        _u('/api/staff/toggle-active/${Uri.encodeComponent(globalStaffId)}'),
        headers: _headers,
        body: jsonEncode({'is_active': isActive}),
      ).timeout(const Duration(seconds: 30));
      return _ok(res) ? null : _err(res);
    } catch (e) {
      return e.toString();
    }
  }

  // ------------------------------------------------------ STAFF REGISTRATION

  Future<List<Map<String, dynamic>>> getStaffColumns(
      String staffType, String className) async {
    final res = await http.get(
      _u('/api/staff/columns/${Uri.encodeComponent(staffType)}/'
          '${Uri.encodeComponent(className)}'),
      headers: _headers,
    ).timeout(const Duration(seconds: 30));
    if (!_ok(res)) throw ApiException(res.statusCode, _err(res));
    final data = _safeJson(res.body);
    if (data is List) {
      return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [];
  }

  Future<Map<String, dynamic>> getPartTimeOptions() async {
    try {
      final res = await http
          .get(_u('/api/staff/part-time-options'), headers: _headers)
          .timeout(const Duration(seconds: 20));
      if (_ok(res)) {
        final d = _safeJson(res.body);
        if (d is Map) return Map<String, dynamic>.from(d);
      }
    } catch (_) {}
    return {
      'days': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      'shifts': ['morning', 'afternoon'],
      'default_times': {
        'morning': {'start_time': '07:00', 'end_time': '12:30'},
        'afternoon': {'start_time': '12:30', 'end_time': '17:30'},
      },
    };
  }

  /// Creates the same record as the web /create-register-staff page.
  /// Returns the server response (userCredentials, teacherData, ...).
  Future<Map<String, dynamic>> addStaff({
    required String staffType,
    required String className,
    required Map<String, dynamic> fields,
    List<String> uploadFields = const [],
    Map<String, String> uploads = const {},
  }) async {
    final req = http.MultipartRequest('POST', _u('/api/staff/add-staff'));
    req.headers.addAll(_authHeadersOnly);
    req.fields['staffType'] = staffType;
    req.fields['class'] = className;
    fields.forEach((key, value) {
      if (value == null) return;
      if (value is List || value is Map) {
        req.fields[key] = jsonEncode(value);
      } else if (value is bool) {
        req.fields[key] = value ? 'true' : 'false';
      } else {
        req.fields[key] = value.toString();
      }
    });
    req.fields['uploadFields'] = jsonEncode(uploadFields);
    for (final entry in uploads.entries) {
      req.files.add(await http.MultipartFile.fromPath(
        entry.key,
        entry.value,
        contentType: _mediaTypeFor(entry.value),
      ));
    }
    final streamed = await req.send().timeout(const Duration(seconds: 90));
    final res = await http.Response.fromStream(streamed);
    if (!_ok(res)) throw ApiException(res.statusCode, _err(res));
    final data = _safeJson(res.body);
    return data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
  }

  // --------------------------------------------------------- SUBJECT SETUP

  Future<List<Map<String, dynamic>>> getMarkSubjects() async {
    final res = await http
        .get(_u('/api/mark-list/subjects'), headers: _headers)
        .timeout(const Duration(seconds: 20));
    if (!_ok(res)) throw ApiException(res.statusCode, _err(res));
    final data = _safeJson(res.body);
    if (data is List) {
      return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [];
  }

  Future<List<String>> getMarkClasses() async {
    final res = await http
        .get(_u('/api/mark-list/classes'), headers: _headers)
        .timeout(const Duration(seconds: 25));
    if (!_ok(res)) throw ApiException(res.statusCode, _err(res));
    final data = _safeJson(res.body);
    if (data is List) return data.map((e) => e.toString()).toList();
    return [];
  }

  Future<String?> addMarkSubject(String name) async {
    try {
      final res = await http.post(
        _u('/api/mark-list/add-subject'),
        headers: _headers,
        body: jsonEncode({'subject_name': name}),
      ).timeout(const Duration(seconds: 25));
      return _ok(res) ? null : _err(res);
    } catch (e) {
      return e.toString();
    }
  }

  Future<String?> updateMarkSubject(int id, String name) async {
    try {
      final res = await http.put(
        _u('/api/mark-list/update-subject/$id'),
        headers: _headers,
        body: jsonEncode({'subject_name': name}),
      ).timeout(const Duration(seconds: 25));
      return _ok(res) ? null : _err(res);
    } catch (e) {
      return e.toString();
    }
  }

  Future<String?> deleteMarkSubject(int id) async {
    try {
      final res = await http
          .delete(_u('/api/mark-list/delete-subject/$id'), headers: _headers)
          .timeout(const Duration(seconds: 25));
      return _ok(res) ? null : _err(res);
    } catch (e) {
      return e.toString();
    }
  }

  Future<String?> mapSubjectsClasses(List<Map<String, String>> mappings) async {
    try {
      final res = await http.post(
        _u('/api/mark-list/map-subjects-classes'),
        headers: _headers,
        body: jsonEncode({'mappings': mappings}),
      ).timeout(const Duration(seconds: 40));
      return _ok(res) ? null : _err(res);
    } catch (e) {
      return e.toString();
    }
  }

  // --------------------------------------------------------- UNPAID REASONS

  Future<List<Map<String, dynamic>>> getUnpaidReasons({String? status}) async {
    final res = await http.get(
      _u('/api/admin-unpaid/reasons', status == null ? null : {'status': status}),
      headers: _headers,
    ).timeout(const Duration(seconds: 25));
    if (!_ok(res)) throw ApiException(res.statusCode, _err(res));
    final data = _safeJson(res.body);
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    }
    if (data is List) return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    return [];
  }

  Future<String?> addUnpaidReason({
    required List<Map<String, dynamic>> students,
    required String reason,
    String? expiresAt,
  }) async {
    try {
      final res = await http.post(
        _u('/api/admin-unpaid/reasons'),
        headers: _headers,
        body: jsonEncode({
          'students': students,
          'reason': reason,
          'expiresAt': expiresAt,
        }),
      ).timeout(const Duration(seconds: 30));
      return _ok(res) ? null : _err(res);
    } catch (e) {
      return e.toString();
    }
  }

  Future<String?> deleteUnpaidReason(int id) async {
    try {
      final res = await http
          .delete(_u('/api/admin-unpaid/reasons/$id'), headers: _headers)
          .timeout(const Duration(seconds: 25));
      return _ok(res) ? null : _err(res);
    } catch (e) {
      return e.toString();
    }
  }
}
