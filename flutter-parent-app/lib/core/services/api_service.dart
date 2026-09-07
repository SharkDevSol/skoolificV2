import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../services/storage_service.dart';
import '../../models/models.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String _handleError(dynamic e) {
    if (e is SocketException || e.toString().contains('SocketException') || e.toString().contains('Failed host lookup')) {
      return 'Connection issue. Please check your internet.';
    }
    if (e is ApiException) return e.message;
    return 'An unexpected error occurred.';
  }

  Future<Map<String, dynamic>> login({
    required String branchCode,
    required String username,
    required String password,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.login}'),
        headers: ApiConstants.publicHeaders(),
        body: jsonEncode({
          'branchCode': branchCode,
          'username': username,
          'password': password,
          'userType': 'guardian',
        }),
      );
      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && data['success'] == true) {
        return data;
      }
      throw ApiException(data['message'] ?? data['error'] ?? 'Login failed');
    } catch (e) {
      throw ApiException(_handleError(e));
    }
  }

  Map<String, String> _headers() => ApiConstants.authHeaders(
        StorageService.token ?? '',
        StorageService.branchCode ?? '',
      );

  Future<User> guardianProfile(String username) async {
    try {
      final res = await http.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.guardianProfile}/$username'),
        headers: _headers(),
      );
      final data = jsonDecode(res.body);
      if (res.statusCode == 200) {
        final role = data['role'] ?? 'guardian';
        
        // Extract guardian name and phone from the first student if available
        String? guardianName;
        String? guardianPhone;
        if (data['student'] is List && (data['student'] as List).isNotEmpty) {
          final firstStudent = data['student'][0];
          guardianName = firstStudent['guardian_name']?.toString();
          guardianPhone = firstStudent['guardian_phone']?.toString();
        }
        
        return User(
          id: data['id'] ?? 0,
          username: username,
          name: guardianName ?? username,
          role: role,
          branchCode: StorageService.branchCode ?? '',
          phone: guardianPhone,
        );
      }
      throw ApiException('Failed to load profile');
    } catch (e) {
      throw ApiException(_handleError(e));
    }
  }

  Future<List<Ward>> guardianWards(String username) async {
    try {
      final res = await http.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.guardianList}'),
        headers: _headers(),
      );
      if (res.statusCode == 200) {
        final list = jsonDecode(res.body) as List;
        final me = list.firstWhere(
          (g) => g['guardian_username'] == username,
          orElse: () => null,
        );
        if (me != null && me['students'] is List) {
          return (me['students'] as List)
              .map((s) => Ward.fromJson(s))
              .toList();
        }
      }
    } catch (e) {
      // Return empty list on error for wards
    }
    return [];
  }

  Future<GuardianMarksResponse> guardianMarks(String username) async {
    try {
      final res = await http.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.guardianMarks}/$username'),
        headers: _headers(),
      );
      if (res.statusCode == 200) {
        return GuardianMarksResponse.fromJson(jsonDecode(res.body));
      }
      throw ApiException('Failed to load marks');
    } catch (e) {
      throw ApiException(_handleError(e));
    }
  }

  Future<GuardianPaymentsResponse> guardianPayments(String username) async {
    try {
      final res = await http.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.guardianPayments}/$username'),
        headers: _headers(),
      );
      if (res.statusCode == 200) {
        return GuardianPaymentsResponse.fromJson(jsonDecode(res.body));
      }
      throw ApiException('Failed to load payments');
    } catch (e) {
      throw ApiException(_handleError(e));
    }
  }

  Future<List<Post>> guardianPosts(String schoolId) async {
    try {
      final res = await http.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.guardianPosts}/$schoolId'),
        headers: _headers(),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['posts'] is List ? data['posts'] : []);
        return (list as List).map((p) => Post.fromJson(p)).toList();
      }
    } catch (e) {
      // Ignore
    }
    return [];
  }

  // 4.1: like a post — POST /api/posts/{id}/like
  Future<void> likePost(String postId) async {
    final res = await http.post(
      Uri.parse('${ApiConstants.baseUrl}${ApiConstants.postLike}/$postId/like'),
      headers: _headers(),
    );
    if (res.statusCode != 200) {
      throw ApiException('Could not like post');
    }
  }

  // 7.1: discipline faults for a class — GET /api/faults/faults/:className
  Future<List<FaultRecord>> classFaults(String className) async {
    final res = await http.get(
      Uri.parse('${ApiConstants.baseUrl}/api/faults/faults/$className'),
      headers: _headers(),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final list = data is List ? data : (data['faults'] is List ? data['faults'] : []);
      return (list as List).map((f) => FaultRecord.fromJson(f)).toList();
    }
    return [];
  }

  /// FIX 3: real class ranking from server — GET /api/mark-list/full-ranking/:className
  /// Returns {termNumber: {rank, rankDisplay, average}} for ONE student.
  Future<Map<int, Map<String, dynamic>>> studentRanking(
      String className, String studentName) async {
    final res = await http.get(
      Uri.parse('${ApiConstants.baseUrl}/api/mark-list/full-ranking/$className'),
      headers: _headers(),
    );
    if (res.statusCode != 200) return {};
    final data = jsonDecode(res.body);
    final terms = data['terms'] as List? ?? [];
    final target = studentName.trim().toLowerCase();
    final out = <int, Map<String, dynamic>>{};
    for (final t in terms) {
      final rankings = (t['rankings'] as List?) ?? [];
      for (final r in rankings) {
        final name = (r['studentName'] ?? '').toString().trim().toLowerCase();
        if (name == target) {
          out[t['termNumber'] as int] = {
            'rank': r['rank'],
            'rankDisplay': r['rankDisplay'],
            'average': r['average'],
            'total': rankings.length, // students in class
          };
          break;
        }
      }
    }
    return out;
  }

  // 8.1: chat conversations — GET /api/chats/conversations?userId=
  Future<List<ChatConversation>> conversations(String userId) async {
    final res = await http.get(
      Uri.parse('${ApiConstants.baseUrl}${ApiConstants.conversations}?userId=$userId'),
      headers: _headers(),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final list = data is List
          ? data
          : (data['conversations'] is List
              ? data['conversations']
              : (data['data'] is List ? data['data'] : <dynamic>[]));
      return (list as List).map((c) => ChatConversation.fromJson(c)).toList();
    }
    return [];
  }

  // 8.1: messages in a conversation — GET /api/chats/conversations/:id/messages
  Future<List<ChatMessage>> conversationMessages(String conversationId, String myUsername) async {
    final res = await http.get(
      Uri.parse('${ApiConstants.baseUrl}${ApiConstants.conversations}/$conversationId/messages'),
      headers: _headers(),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final list = data is List
          ? data
          : (data['messages'] is List ? data['messages'] : <dynamic>[]);
      return (list as List).map((m) => ChatMessage.fromJson(m, myUsername)).toList();
    }
    return [];
  }

  // 8.1: send message — POST /api/chats/conversations/:id/messages
  Future<void> sendMessage(String conversationId, String content) async {
    final res = await http.post(
      Uri.parse('${ApiConstants.baseUrl}${ApiConstants.conversations}/$conversationId/messages'),
      headers: _headers(),
      body: jsonEncode({'content': content, 'message': content}),
    );
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw ApiException('Could not send message');
    }
  }

  Future<AttendanceSummary> monthlySummary(String className, String schoolId,
      {required int year, required int month}) async {
    try {
      final res = await http.get(
        Uri.parse(
            '${ApiConstants.baseUrl}${ApiConstants.monthlySummary}/$className/$schoolId?year=$year&month=$month'),
        headers: _headers(),
      );
      if (res.statusCode == 200) {
        return AttendanceSummary.fromJson(jsonDecode(res.body));
      }
    } catch (e) {
      throw ApiException(_handleError(e));
    }
    return AttendanceSummary(present: 0, absent: 0, late: 0, leave: 0, total: 0, percentage: 0);
  }

  Future<List<AttendanceDay>> studentAttendance(String className, String schoolId,
      {required int year, required int month}) async {
    try {
      final res = await http.get(
        Uri.parse(
            '${ApiConstants.baseUrl}${ApiConstants.studentAttendance}/$className/$schoolId?year=$year&month=$month'),
        headers: _headers(),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data['attendance'] as List?;
        return list?.map((d) => AttendanceDay.fromJson(d)).toList() ?? [];
      }
    } catch (e) {
      throw ApiException(_handleError(e));
    }
    return [];
  }

  Future<Map<String, dynamic>> chatConversations(String userId) async {
    try {
      final res = await http.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.conversations}?userId=$userId'),
        headers: _headers(),
      );
      if (res.statusCode == 200) return jsonDecode(res.body);
    } catch (e) {
      // Ignore
    }
    return {};
  }
}

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}
