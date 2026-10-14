import '../services/storage_service.dart';

class ApiConstants {
  static String get baseUrl {
    final branch = (StorageService.branchCode ?? StorageService.savedBranchCode ?? '').toUpperCase();
    if (branch.contains('BILAL')) {
      return 'https://bilal.skoolific.com';
    }
    return 'https://iqra.skoolific.com';
  }

  // Auth
  static const String login = '/api/v2/branches/login';
  static const String changeUsername = '/api/user-profile/staff/change-username';
  static const String changePassword = '/api/user-profile/staff/change-password';

  // Devices / push
  static const String registerDevice = '/api/devices/register';
  static const String registerDeviceFallback = '/api/guardians/register-device';
  static const String unregisterDevice = '/api/devices/unregister';

  // Mark list
  static const String teacherMarkLists = '/api/mark-list/teacher-mark-lists'; // + /{teacherName}
  static const String markList = '/api/mark-list/mark-list'; // + /{subject}/{class}/{term}
  static const String createMarkForms = '/api/mark-list/create-mark-forms';
  static const String updateMarks = '/api/mark-list/update-marks';
  static const String bulkUpdateMarks = '/api/mark-list/bulk-update-marks';
  static const String markListConfig = '/api/mark-list/config';
  static const String markSubjects = '/api/mark-list/subjects';

  // Class teacher & attendance
  static const String teacherAssignment = '/api/class-teacher/teacher-assignment'; // + /{teacherName}
  static const String schoolDays = '/api/class-teacher/school-days';
  static const String weeklyTables = '/api/class-teacher/weekly-tables'; // + /{class}
  static const String weeklyAttendance = '/api/class-teacher/weekly-attendance'; // + /{class}/{weekStart}
  static const String createWeeklyAttendance = '/api/class-teacher/create-weekly-attendance';
  static const String classStudents = '/api/class-teacher/students'; // + /{class}

  // Student list (full rows incl. guardian info)
  static const String studentListStudents = '/api/student-list/students'; // + /{class}

  // Discipline (faults)
  static const String faultsClasses = '/api/faults/classes';
  static const String faultsStudents = '/api/faults/students'; // + /{class}
  static const String faultsList = '/api/faults/faults'; // + /{class}
  static const String addFault = '/api/faults/add-fault';

  // Chat / messages
  static const String conversations = '/api/chats/conversations';
  static const String messagesRead = '/api/chats/messages/read';
  static const String guardianContacts = '/api/chats/contacts/guardians';
  static const String chatAttachments = '/api/chats/attachments'; // + /{id}
  // full: /api/chats/conversations/{id}/messages
  static const String conversationMessages = '/api/chats/conversations'; // + /{id}/messages

  // Posts / announcements
  static const String postsFeed = '/api/posts/feed'; // ?role=staff
  static const String postLike = '/api/posts'; // PUT + /{id}/like

  // Schedule
  static const String scheduleByTeacher = '/api/schedule/schedule-by-teacher';

  // Evaluation book
  static const String evalBookAssignments = '/api/evaluation-book/assignments/teacher'; // + /{teacherId}
  static const String evalBookDaily = '/api/evaluation-book/daily';
  static const String evalBookDailySend = '/api/evaluation-book/daily/send';

  // Staff evaluations (appraisals)
  static const String staffEvaluations = '/api/evaluations/staff-evaluations'; // + /{id}

  // Branding
  static const String branding = '/api/admin/branding';

  // In-app update manifest (staff app)
  static const String updateManifest = '/downloads/staff-app/version.json';

  static Map<String, String> authHeaders(String token, String branchCode) => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
        'x-branch-code': branchCode.toUpperCase(),
      };

  static Map<String, String> publicHeaders() => {
        'Content-Type': 'application/json',
      };

  /// Full URL for a chat message attachment (works with or without leading slash).
  static String attachmentUrl(String path) {
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return '$baseUrl$path';
    return '$baseUrl/$path';
  }
}
