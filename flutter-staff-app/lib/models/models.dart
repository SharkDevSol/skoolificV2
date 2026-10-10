class StaffUser {
  final int id;
  final int globalStaffId;
  final String username;
  final String name;
  final String role;
  final String staffType;
  final String? className;
  final String branchCode;
  final StaffProfile? profile;

  StaffUser({
    required this.id,
    required this.globalStaffId,
    required this.username,
    required this.name,
    required this.role,
    required this.staffType,
    this.className,
    required this.branchCode,
    this.profile,
  });

  bool get isTeacher {
    final t = staffType.toLowerCase();
    final r = role.toLowerCase();
    return t.contains('teach') || r.contains('teach');
  }

  factory StaffUser.fromJson(Map<String, dynamic> j, {StaffProfile? profile}) {
    return StaffUser(
      id: j['id'] is int ? j['id'] : int.tryParse(j['id']?.toString() ?? '') ?? 0,
      globalStaffId: j['global_staff_id'] is int
          ? j['global_staff_id']
          : int.tryParse(j['global_staff_id']?.toString() ?? j['globalStaffId']?.toString() ?? '') ?? 0,
      username: j['username']?.toString() ?? '',
      name: j['name']?.toString() ?? '',
      role: j['role']?.toString() ?? 'staff',
      staffType: j['staffType']?.toString() ?? j['staff_type']?.toString() ?? 'Staff',
      className: j['className']?.toString() ?? j['class_name']?.toString(),
      branchCode: j['branchCode']?.toString() ?? j['branch_code']?.toString() ?? '',
      profile: profile ?? (j['profile'] is Map ? StaffProfile.fromJson(Map<String, dynamic>.from(j['profile'])) : null),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'global_staff_id': globalStaffId,
        'username': username,
        'name': name,
        'role': role,
        'staffType': staffType,
        'className': className,
        'branchCode': branchCode,
        if (profile != null) 'profile': profile!.toJson(),
      };
}

class StaffProfile {
  final int id;
  final int globalStaffId;
  final int? staffId;
  final String? imageStaff;
  final String name;
  final String? gender;
  final String? role;
  final String? enrollmentType;
  final String? workTime;
  final String? machineId;
  final String? phone;
  final String? email;
  final String? qualification;

  StaffProfile({
    required this.id,
    required this.globalStaffId,
    this.staffId,
    this.imageStaff,
    required this.name,
    this.gender,
    this.role,
    this.enrollmentType,
    this.workTime,
    this.machineId,
    this.phone,
    this.email,
    this.qualification,
  });

  factory StaffProfile.fromJson(Map<String, dynamic> j) => StaffProfile(
        id: j['id'] is int ? j['id'] : int.tryParse(j['id']?.toString() ?? '') ?? 0,
        globalStaffId: j['global_staff_id'] is int
            ? j['global_staff_id']
            : int.tryParse(j['global_staff_id']?.toString() ?? '') ?? 0,
        staffId: j['staff_id'] is int ? j['staff_id'] : int.tryParse(j['staff_id']?.toString() ?? ''),
        imageStaff: j['image_staff']?.toString(),
        name: j['name']?.toString() ?? '',
        gender: j['gender']?.toString(),
        role: j['role']?.toString(),
        enrollmentType: j['staff_enrollment_type']?.toString(),
        workTime: j['staff_work_time']?.toString(),
        machineId: j['machine_id']?.toString(),
        phone: j['phone']?.toString(),
        email: j['email']?.toString(),
        qualification: j['qualification']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'global_staff_id': globalStaffId,
        'staff_id': staffId,
        'image_staff': imageStaff,
        'name': name,
        'gender': gender,
        'role': role,
        'staff_enrollment_type': enrollmentType,
        'staff_work_time': workTime,
        'machine_id': machineId,
        'phone': phone,
        'email': email,
        'qualification': qualification,
      };
}

class TeacherAssignment {
  final String subjectName;
  final String className;
  final int termNumber;
  final String? subjectClass;
  final String? formId;

  TeacherAssignment({
    required this.subjectName,
    required this.className,
    required this.termNumber,
    this.subjectClass,
    this.formId,
  });

  factory TeacherAssignment.fromJson(Map<String, dynamic> j) => TeacherAssignment(
        subjectName: j['subjectName']?.toString() ?? j['subject']?.toString() ?? '',
        className: j['className']?.toString() ?? j['class']?.toString() ?? '',
        termNumber: j['termNumber'] is int ? j['termNumber'] : int.tryParse(j['termNumber']?.toString() ?? '1') ?? 1,
        subjectClass: j['subjectClass']?.toString(),
        formId: j['formId']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'subjectName': subjectName,
        'className': className,
        'termNumber': termNumber,
        if (subjectClass != null) 'subjectClass': subjectClass,
        if (formId != null) 'formId': formId,
      };

  /// Offline cache key for this assignment's payload — shared between the
  /// prefetcher (AppProvider) and the marks screen so both agree.
  static String cacheKeyFor({
    required String subjectName,
    required String className,
    required int termNumber,
  }) =>
      'marklist_${subjectName}_${className}_$termNumber'
          .replaceAll(RegExp(r'[^\w-]'), '_');

  String get offlineCacheKey => TeacherAssignment.cacheKeyFor(
      subjectName: subjectName, className: className, termNumber: termNumber);
}

class ScheduleSlot {
  final String day;
  final int period;
  final String subject;
  final String className;
  final String? room;
  final String? time;

  ScheduleSlot({
    required this.day,
    required this.period,
    required this.subject,
    required this.className,
    this.room,
    this.time,
  });

  factory ScheduleSlot.fromJson(Map<String, dynamic> j) => ScheduleSlot(
        day: j['day']?.toString().toLowerCase() ?? 'monday',
        period: j['period'] is int ? j['period'] : int.tryParse(j['period']?.toString() ?? '1') ?? 1,
        subject: j['subject']?.toString() ?? '',
        className: j['class']?.toString() ?? j['className']?.toString() ?? '',
        room: j['room']?.toString(),
        time: j['time']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'day': day,
        'period': period,
        'subject': subject,
        'class': className,
        if (room != null) 'room': room,
        if (time != null) 'time': time,
      };
}

class MarkComponentConfig {
  String name;
  int percentage;

  MarkComponentConfig({required this.name, required this.percentage});

  /// Column / payload key the backend uses for this component:
  /// `name.toLowerCase().replaceAll(RegExp(r'[\s\-\.]+'), '_')`
  /// (matches server `component.name.toLowerCase().replace(/[\s\-\.]+/g, '_')`).
  String get componentKey =>
      name.toLowerCase().replaceAll(RegExp(r'[\s\-\.]+'), '_');

  factory MarkComponentConfig.fromJson(Map<String, dynamic> j) => MarkComponentConfig(
        name: j['name']?.toString() ?? '',
        percentage: j['percentage'] is int ? j['percentage'] : int.tryParse(j['percentage']?.toString() ?? '0') ?? 0,
      );

  Map<String, dynamic> toJson() => {'name': name, 'percentage': percentage};
}

class StudentMarkRow {
  final String studentId;
  final String studentName;
  final String? rollNumber;
  final Map<String, double> marks;
  double total;
  String passStatus;

  StudentMarkRow({
    required this.studentId,
    required this.studentName,
    this.rollNumber,
    required this.marks,
    this.total = 0.0,
    this.passStatus = 'Pass',
  });

  /// Server rows are FLAT: {id, student_name, class_id, practical_1: "4.00", total, pass_status, ...}
  /// Mark columns are keyed by componentKey (name normalised), so read that first.
  factory StudentMarkRow.fromServer(Map<String, dynamic> j, List<MarkComponentConfig> components) {
    final parsedMarks = <String, double>{};
    for (final c in components) {
      final v = j[c.componentKey] ?? j[c.name];
      parsedMarks[c.name] = v is num ? v.toDouble() : double.tryParse(v?.toString() ?? '') ?? 0.0;
    }
    return StudentMarkRow(
      studentId: j['id']?.toString() ?? j['student_id']?.toString() ?? '',
      studentName: (j['student_name']?.toString() ?? '').trim(),
      rollNumber: (j['class_id'] ?? j['roll_number'])?.toString(),
      marks: parsedMarks,
      total: j['total'] is num ? (j['total'] as num).toDouble() : double.tryParse(j['total']?.toString() ?? '0') ?? 0.0,
      passStatus: j['pass_status']?.toString() ?? 'Fail',
    );
  }

  factory StudentMarkRow.fromJson(Map<String, dynamic> j) {
    if (j['marks'] is Map) {
      final rawMarks = Map<String, dynamic>.from(j['marks']);
      final parsedMarks = <String, double>{};
      rawMarks.forEach((k, v) {
        parsedMarks[k] = v is num ? v.toDouble() : double.tryParse(v?.toString() ?? '0') ?? 0.0;
      });
      return StudentMarkRow(
        studentId: j['student_id']?.toString() ?? j['school_id']?.toString() ?? j['id']?.toString() ?? '',
        studentName: j['student_name']?.toString() ?? j['name']?.toString() ?? '',
        rollNumber: j['roll_number']?.toString(),
        marks: parsedMarks,
        total: j['total'] is num ? (j['total'] as num).toDouble() : double.tryParse(j['total']?.toString() ?? '0') ?? 0.0,
        passStatus: j['pass_status']?.toString() ?? 'Pass',
      );
    }
    return StudentMarkRow.fromServer(j, const []);
  }

  /// Payload item for POST /api/mark-list/bulk-update-marks
  /// (`{studentName, marks: {componentKey: value}}` — the server looks the
  /// student up by name and clamps each mark to the component percentage).
  Map<String, dynamic> toSaveRow({List<MarkComponentConfig>? components}) {
    final m = <String, double>{};
    if (components != null) {
      for (final c in components) {
        m[c.componentKey] = marks[c.name] ?? 0.0;
      }
    } else {
      marks.forEach((k, v) => m[k] = v);
    }
    return {'studentName': studentName, 'marks': m};
  }

  /// Rule: a component that is non-empty (not 0 / not null) is LOCKED.
  bool isComponentLocked(String component) => (marks[component] ?? 0.0) > 0;
}

class StudentAttendanceItem {
  final String studentId; // school_id
  final String classId; // class_id (roll number inside the class)
  final String studentName;
  String monday, tuesday, wednesday, thursday, friday, saturday, sunday;

  static const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  StudentAttendanceItem({
    required this.studentId,
    this.classId = '',
    required this.studentName,
    this.monday = '',
    this.tuesday = '',
    this.wednesday = '',
    this.thursday = '',
    this.friday = '',
    this.saturday = '',
    this.sunday = '',
  });

  String day(String name) {
    switch (name) {
      case 'monday':
        return monday;
      case 'tuesday':
        return tuesday;
      case 'wednesday':
        return wednesday;
      case 'thursday':
        return thursday;
      case 'friday':
        return friday;
      case 'saturday':
        return saturday;
      default:
        return sunday;
    }
  }

  void setDay(String name, String value) {
    switch (name) {
      case 'monday':
        monday = value;
        break;
      case 'tuesday':
        tuesday = value;
        break;
      case 'wednesday':
        wednesday = value;
        break;
      case 'thursday':
        thursday = value;
        break;
      case 'friday':
        friday = value;
        break;
      case 'saturday':
        saturday = value;
        break;
      default:
        sunday = value;
    }
  }

  factory StudentAttendanceItem.fromJson(Map<String, dynamic> j) => StudentAttendanceItem(
        studentId: (j['school_id'] ?? j['student_id'] ?? j['id'])?.toString() ?? '',
        classId: (j['class_id'] ?? j['roll_number'])?.toString() ?? '',
        studentName: (j['student_name']?.toString() ?? j['name']?.toString() ?? '').trim(),
        monday: (j['monday'] ?? '')?.toString() ?? '',
        tuesday: (j['tuesday'] ?? '')?.toString() ?? '',
        wednesday: (j['wednesday'] ?? '')?.toString() ?? '',
        thursday: (j['thursday'] ?? '')?.toString() ?? '',
        friday: (j['friday'] ?? '')?.toString() ?? '',
        saturday: (j['saturday'] ?? '')?.toString() ?? '',
        sunday: (j['sunday'] ?? '')?.toString() ?? '',
      );

  /// Record shape for PUT /api/class-teacher/weekly-attendance/{class}/{weekStart}
  Map<String, dynamic> toRecord() => {
        'school_id': int.tryParse(studentId) ?? studentId,
        'class_id': int.tryParse(classId) ?? (classId.isEmpty ? null : classId),
        'monday': _v(monday),
        'tuesday': _v(tuesday),
        'wednesday': _v(wednesday),
        'thursday': _v(thursday),
        'friday': _v(friday),
        'saturday': _v(saturday),
        'sunday': _v(sunday),
      };

  static String? _v(String s) => s.isEmpty ? null : s;
}

class FaultRecord {
  final int? id;
  final String studentName;
  final String? studentId;
  final String className;
  final String faultType;
  final String level;
  final String description;
  final String? date;
  final String? actionTaken;
  final String? reportedBy;
  final String? attachment;

  FaultRecord({
    this.id,
    required this.studentName,
    this.studentId,
    required this.className,
    required this.faultType,
    this.level = 'Minor',
    required this.description,
    this.date,
    this.actionTaken,
    this.reportedBy,
    this.attachment,
  });

  factory FaultRecord.fromJson(Map<String, dynamic> j) => FaultRecord(
        id: j['id'] is int ? j['id'] : int.tryParse(j['id']?.toString() ?? ''),
        studentName: j['student_name']?.toString() ?? '',
        studentId: (j['school_id'] ?? j['student_id'] ?? j['class_id'])?.toString(),
        className: j['class_name']?.toString() ?? j['class']?.toString() ?? '',
        faultType: (j['type'] ?? j['fault_type'])?.toString() ?? 'Other',
        level: (j['level'] ?? j['fault_level'])?.toString() ?? 'Minor',
        description: j['description']?.toString() ?? '',
        date: j['date']?.toString() ?? j['created_at']?.toString(),
        actionTaken: j['action_taken']?.toString(),
        reportedBy: j['reported_by']?.toString(),
        attachment: j['attachment']?.toString(),
      );
}

class Post {
  final int id;
  final String title;
  final String body;
  final String? authorName;
  final String? authorType;
  int likes;
  final int comments;
  final String createdAt;
  final List<String> mediaUrls; // absolute paths served under /uploads/posts
  final List<Map<String, dynamic>> media; // {filename, mimetype, originalname}
  final String? link;
  bool isLiked;

  Post({
    required this.id,
    required this.title,
    required this.body,
    this.authorName,
    this.authorType,
    required this.likes,
    required this.comments,
    required this.createdAt,
    required this.mediaUrls,
    this.media = const [],
    this.link,
    this.isLiked = false,
  });

  bool get hasImage => media.any((m) {
        final t = (m['mimetype'] ?? '').toString().toLowerCase();
        return t.startsWith('image/');
      });

  factory Post.fromJson(Map<String, dynamic> j) {
    final mediaList = <String>[];
    final mediaItems = <Map<String, dynamic>>[];
    if (j['media'] is List) {
      for (final m in j['media']) {
        if (m is Map && m['filename'] != null) {
          final name = m['filename'].toString();
          mediaList.add('/uploads/posts/$name');
          mediaItems.add(Map<String, dynamic>.from(m));
        }
      }
    }
    return Post(
      id: j['id'] is int ? j['id'] : int.tryParse(j['id']?.toString() ?? '') ?? 0,
      title: j['title']?.toString() ?? '',
      body: j['body']?.toString() ?? '',
      authorName: j['author_name']?.toString(),
      authorType: j['author_type']?.toString(),
      likes: j['likes'] is int ? j['likes'] : int.tryParse(j['likes']?.toString() ?? '0') ?? 0,
      comments: j['comments'] is int ? j['comments'] : int.tryParse(j['comments']?.toString() ?? '0') ?? 0,
      createdAt: j['created_at']?.toString() ?? DateTime.now().toIso8601String(),
      mediaUrls: mediaList,
      media: mediaItems,
      link: j['link']?.toString(),
      isLiked: j['is_liked'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'body': body,
        'author_name': authorName,
        'author_type': authorType,
        'likes': likes,
        'comments': comments,
        'created_at': createdAt,
        'media': media,
        'link': link,
        'is_liked': isLiked,
      };
}

class StaffEvaluation {
  final int id;
  final String? date;
  final double score;
  final String? evaluator;
  final String? comments;
  final String? strengths;
  final String? improvements;

  StaffEvaluation({
    required this.id,
    this.date,
    this.score = 0.0,
    this.evaluator,
    this.comments,
    this.strengths,
    this.improvements,
  });

  factory StaffEvaluation.fromJson(Map<String, dynamic> j) => StaffEvaluation(
        id: j['id'] is int ? j['id'] : int.tryParse(j['id']?.toString() ?? '') ?? 0,
        date: j['date']?.toString() ?? j['created_at']?.toString(),
        score: j['score'] is num ? (j['score'] as num).toDouble() : double.tryParse(j['score']?.toString() ?? '0') ?? 0.0,
        evaluator: j['evaluator_name']?.toString(),
        comments: j['comments']?.toString(),
        strengths: j['strengths']?.toString(),
        improvements: j['improvements']?.toString(),
      );
}

class ChatMessage {
  final int id;
  final int conversationId;
  final String senderId; // e.g. "teacher_2", "guardian_0949..."
  final String senderType; // teacher | guardian | admin | staff | student
  final String senderName;
  final String text;
  final String createdAt;
  final bool isMe;
  final List<Map<String, dynamic>> attachments;

  ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    this.senderType = '',
    required this.senderName,
    required this.text,
    required this.createdAt,
    required this.isMe,
    this.attachments = const [],
  });

  factory ChatMessage.fromServer(Map<String, dynamic> j, {required String myUserId, required String myUserType}) {
    final atts = <Map<String, dynamic>>[];
    if (j['attachments'] is List) {
      for (final a in j['attachments']) {
        if (a is Map) atts.add(Map<String, dynamic>.from(a));
      }
    }
    final senderId = j['sender_id']?.toString() ?? '';
    final senderType = (j['sender_type'] ?? '').toString();
    return ChatMessage(
      id: j['id'] is int ? j['id'] : int.tryParse(j['id']?.toString() ?? '') ?? 0,
      conversationId: j['conversation_id'] is int
          ? j['conversation_id']
          : int.tryParse(j['conversation_id']?.toString() ?? '0') ?? 0,
      senderId: senderId,
      senderType: senderType,
      senderName: j['sender_name']?.toString() ?? '',
      text: (j['message_text'] ?? j['message'] ?? j['text'] ?? '').toString(),
      createdAt: j['created_at']?.toString() ?? DateTime.now().toIso8601String(),
      isMe: senderId == myUserId || (senderType.isNotEmpty && senderType == myUserType && senderId == myUserId),
      attachments: atts,
    );
  }

  /// Legacy/compat parser (integer sender ids).
  factory ChatMessage.fromJson(Map<String, dynamic> j, int myId) {
    final senderId = j['sender_id']?.toString() ?? '';
    final atts = <Map<String, dynamic>>[];
    if (j['attachments'] is List) {
      for (final a in j['attachments']) {
        if (a is Map) atts.add(Map<String, dynamic>.from(a));
      }
    }
    return ChatMessage(
      id: j['id'] is int ? j['id'] : int.tryParse(j['id']?.toString() ?? '') ?? 0,
      conversationId: j['conversation_id'] is int
          ? j['conversation_id']
          : int.tryParse(j['conversation_id']?.toString() ?? '0') ?? 0,
      senderId: senderId,
      senderType: (j['sender_type'] ?? '').toString(),
      senderName: j['sender_name']?.toString() ?? '',
      text: (j['message_text'] ?? j['message'] ?? j['text'] ?? '').toString(),
      createdAt: j['created_at']?.toString() ?? DateTime.now().toIso8601String(),
      isMe: int.tryParse(senderId) == myId,
      attachments: atts,
    );
  }

  /// Absolute URL for an attachment index (server serves /api/chats/attachments/{id}).
  String attachmentUrl(Map<String, dynamic> a) {
    final id = a['id'];
    if (id != null) return '/api/chats/attachments/$id';
    final f = a['filename']?.toString();
    if (f != null) return '/uploads/chat-attachments/$f';
    return '';
  }

  bool get hasImage => attachments.any((a) => isImageAttachment(a));
  static bool isImageAttachment(Map<String, dynamic> a) {
    final t = (a['file_type'] ?? a['mimetype'] ?? '').toString().toLowerCase();
    if (t.startsWith('image/')) return true;
    final n = (a['original_name'] ?? a['filename'] ?? '').toString().toLowerCase();
    return n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.gif') || n.endsWith('.webp');
  }
}
