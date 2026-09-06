class ApiConstants {
  static const String baseUrl = 'https://iqra.skoolific.com';

  // Auth
  static const String login = '/api/v2/branches/login';

  // Guardian
  static const String guardianProfile = '/api/students/guardian-profile'; // + /{username}
  static const String guardianList = '/api/guardian-list/guardians';
  static const String guardianPosts = '/api/posts/profile/guardian'; // + /{schoolId}

  // Marks
  static const String guardianMarks = '/api/mark-list/guardian-marks'; // + /{username}
  static const String fullRanking = '/api/mark-list/full-ranking'; // + /{className}

  // Payments
  static const String guardianPayments = '/api/guardian-payments'; // + /{username}

  // Attendance
  static const String studentAttendance =
      '/api/guardian-student-attendance/student-attendance'; // /{class}/{schoolId}?year&month
  static const String monthlySummary =
      '/api/guardian-student-attendance/monthly-summary'; // /{class}/{schoolId}?year&month
  static const String attendanceTrends =
      '/api/guardian-student-attendance/trends'; // /{class}/{schoolId}
  static const String attendanceReport =
      '/api/guardian-attendance/report'; // /{class}/{schoolId}/{year}/{month}

  // Evaluation book
  static const String evalBookDailyGuardian =
      '/api/evaluation-book/daily/guardian'; // + /{guardianId}
  static const String evalBookDailyClass =
      '/api/evaluation-book/daily/class'; // + /{class}
  static const String evalFeedback = '/api/evaluation-book/feedback';

  // Posts
  static const String postLike = '/api/posts'; // + /{id}/like

  // Chat
  static const String conversations = '/api/chats/conversations';
  static const String chatContacts = '/api/chats/contacts/teachers';
  static const String messagesRead = '/api/chats/messages/read';

  // Branding
  static const String branding = '/api/admin/branding';

  static Map<String, String> authHeaders(String token, String branchCode) => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
        'x-branch-code': branchCode.toUpperCase(),
      };

  static Map<String, String> publicHeaders() => {
        'Content-Type': 'application/json',
      };
}
