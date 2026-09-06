class User {
  final int id;
  final String username;
  final String name;
  final String role;
  final String branchCode;
  final String? phone;

  const User({
    required this.id,
    required this.username,
    required this.name,
    required this.role,
    required this.branchCode,
    this.phone,
  });

  factory User.fromJson(Map<String, dynamic> j) => User(
        id: j['id'] is int ? j['id'] : int.tryParse(j['id']?.toString() ?? '') ?? 0,
        username: j['username']?.toString() ?? '',
        name: j['name']?.toString() ?? j['guardian_name']?.toString() ?? '',
        role: j['role']?.toString() ?? 'guardian',
        branchCode: j['branchCode']?.toString() ?? '',
        phone: j['phone']?.toString() ?? j['guardian_phone']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'name': name,
        'role': role,
        'branchCode': branchCode,
        'phone': phone,
      };

  User copyWith({
    int? id,
    String? username,
    String? name,
    String? role,
    String? branchCode,
    String? phone,
  }) {
    return User(
      id: id ?? this.id,
      username: username ?? this.username,
      name: name ?? this.name,
      role: role ?? this.role,
      branchCode: branchCode ?? this.branchCode,
      phone: phone ?? this.phone,
    );
  }
}

class Ward {
  final String schoolId;
  final String studentName;
  final String? className;
  final String? guardianName;
  final int? classId;
  final String? imageUrl;
  final String? gender;
  final String? age;

  Ward({
    required this.schoolId,
    required this.studentName,
    this.className,
    this.guardianName,
    this.classId,
    this.imageUrl,
    this.gender,
    this.age,
  });

  factory Ward.fromJson(Map<String, dynamic> j) => Ward(
        schoolId: j['school_id']?.toString() ?? j['student_id']?.toString() ?? j['schoolId']?.toString() ?? '',
        studentName: j['student_name']?.toString() ?? j['studentName']?.toString() ?? j['name']?.toString() ?? 'Ward',
        className: j['class']?.toString() ?? j['className']?.toString(),
        guardianName: j['guardian_name']?.toString(),
        classId: j['class_id'] is int ? j['class_id'] : int.tryParse(j['class_id']?.toString() ?? ''),
        imageUrl: j['image_student']?.toString(),
        gender: j['gender']?.toString(),
        age: j['age']?.toString(),
      );
}

// === MARKS ===

class Mark {
  final String ward;        // student name
  final String className;   // class identifier
  final String subject;
  final String term;
  final String passStatus;
  final double total;
  final Map<String, dynamic> details;

  Mark({
    required this.ward,
    required this.className,
    required this.subject,
    required this.term,
    required this.passStatus,
    required this.total,
    required this.details,
  });

  factory Mark.fromJson(Map<String, dynamic> j) => Mark(
        ward: j['ward']?.toString() ?? j['student_name']?.toString() ?? '',
        className: j['class']?.toString() ?? '',
        subject: j['subject']?.toString() ?? '',
        term: (j['term'] ?? 1).toString(),
        passStatus: j['pass_status']?.toString() ?? j['passStatus']?.toString() ?? 'Pass',
        total: _toDouble(j['total']),
        details: j['details'] is Map ? Map<String, dynamic>.from(j['details']) : {},
      );
}

class GuardianMarksResponse {
  final List<Ward> wards;
  final List<Mark> marks;
  final List<String> subjects;
  final int termCount;

  GuardianMarksResponse({
    required this.wards,
    required this.marks,
    required this.subjects,
    required this.termCount,
  });

  factory GuardianMarksResponse.fromJson(Map<String, dynamic> j) {
    final data = j['data'] is Map ? j['data'] as Map<String, dynamic> : j;
    return GuardianMarksResponse(
      wards: (data['wards'] as List?)?.map((w) => Ward.fromJson(w)).toList() ?? [],
      marks: (data['marks'] as List?)?.map((m) => Mark.fromJson(m)).toList() ?? [],
      subjects: (data['subjects'] as List?)?.map((s) => s.toString()).toList() ?? [],
      termCount: data['termCount'] is int ? data['termCount'] : 1,
    );
  }
}

// === PAYMENTS ===

class PaymentItem {
  final String description;
  final double amount;
  final String feeCategory;

  PaymentItem({required this.description, required this.amount, required this.feeCategory});

  factory PaymentItem.fromJson(Map<String, dynamic> j) => PaymentItem(
        description: j['description']?.toString() ?? '',
        amount: _toDouble(j['amount']),
        feeCategory: j['feeCategory']?.toString() ?? '',
      );
}

class PaymentRecord {
  final double amount;
  final String method;
  final String? date;
  final String? receiptNumber;

  PaymentRecord({required this.amount, required this.method, this.date, this.receiptNumber});

  factory PaymentRecord.fromJson(Map<String, dynamic> j) => PaymentRecord(
        amount: double.tryParse(j['amount']?.toString() ?? '0') ?? 0,
        method: j['paymentMethod']?.toString() ?? 'Unknown',
        date: j['paymentDate']?.toString(),
        receiptNumber: j['receiptNumber']?.toString(),
      );
}

class MonthlyPayment {
  final String invoiceId;
  final String invoiceNumber;
  final String? receiptNumber;
  final String month;
  final int monthNumber;
  final String? issueDate;
  final String? dueDate;
  final double totalAmount;
  final double paidAmount;
  final double balance;
  final String status;
  final bool isPaid;
  final bool isOverdue;
  final List<PaymentItem> items;
  final List<PaymentRecord> payments;

  MonthlyPayment({
    required this.invoiceId,
    required this.invoiceNumber,
    this.receiptNumber,
    required this.month,
    required this.monthNumber,
    this.issueDate,
    this.dueDate,
    required this.totalAmount,
    required this.paidAmount,
    required this.balance,
    required this.status,
    required this.isPaid,
    required this.isOverdue,
    required this.items,
    required this.payments,
  });

  factory MonthlyPayment.fromJson(Map<String, dynamic> j) => MonthlyPayment(
        invoiceId: j['invoiceId']?.toString() ?? '',
        invoiceNumber: j['invoiceNumber']?.toString() ?? '',
        receiptNumber: j['receiptNumber']?.toString(),
        month: j['month']?.toString() ?? '',
        monthNumber: j['monthNumber'] is int ? j['monthNumber'] : 0,
        issueDate: j['issueDate']?.toString(),
        dueDate: j['dueDate']?.toString(),
        totalAmount: _toDouble(j['totalAmount']),
        paidAmount: _toDouble(j['paidAmount']),
        balance: _toDouble(j['balance']),
        status: j['status']?.toString() ?? 'ISSUED',
        isPaid: j['isPaid'] == true,
        isOverdue: j['isOverdue'] == true,
        items: (j['items'] as List?)?.map((i) => PaymentItem.fromJson(i)).toList() ?? [],
        payments: (j['payments'] as List?)?.map((p) => PaymentRecord.fromJson(p)).toList() ?? [],
      );
}

class PaymentSummary {
  final int totalInvoices;
  final int paidInvoices;
  final int unpaidInvoices;
  final double totalPaid;
  final double totalBalance;
  final int overdueInvoices;

  PaymentSummary({
    required this.totalInvoices,
    required this.paidInvoices,
    required this.unpaidInvoices,
    required this.totalPaid,
    required this.totalBalance,
    required this.overdueInvoices,
  });

  factory PaymentSummary.fromJson(Map<String, dynamic> j) => PaymentSummary(
        totalInvoices: j['totalInvoices'] is int ? j['totalInvoices'] : 0,
        paidInvoices: j['paidInvoices'] is int ? j['paidInvoices'] : 0,
        unpaidInvoices: j['unpaidInvoices'] is int ? j['unpaidInvoices'] : 0,
        totalPaid: _toDouble(j['totalPaid']),
        totalBalance: _toDouble(j['totalBalance']),
        overdueInvoices: j['overdueInvoices'] is int ? j['overdueInvoices'] : 0,
      );
}

class WardPayment {
  final Ward ward;
  final List<MonthlyPayment> monthlyPayments;
  final bool hasInvoices;
  final PaymentSummary summary;

  WardPayment({
    required this.ward,
    required this.monthlyPayments,
    required this.hasInvoices,
    required this.summary,
  });

  factory WardPayment.fromJson(Map<String, dynamic> j) => WardPayment(
        ward: Ward.fromJson(j['ward'] is Map ? j['ward'] : {}),
        monthlyPayments: (j['monthlyPayments'] as List?)
                ?.map((m) => MonthlyPayment.fromJson(m))
                .toList() ??
            [],
        hasInvoices: j['hasInvoices'] == true,
        summary: PaymentSummary.fromJson(j['summary'] is Map ? j['summary'] as Map<String, dynamic> : {}),
      );
}

class GuardianPaymentsResponse {
  final List<WardPayment> wardPayments;
  final int unpaidCount;
  final bool hasUnpaidInvoices;

  GuardianPaymentsResponse({
    required this.wardPayments,
    required this.unpaidCount,
    required this.hasUnpaidInvoices,
  });

  factory GuardianPaymentsResponse.fromJson(Map<String, dynamic> j) {
    final data = j['data'] is Map ? j['data'] as Map<String, dynamic> : j;
    return GuardianPaymentsResponse(
      wardPayments: (data['payments'] as List?)?.map((p) => WardPayment.fromJson(p)).toList() ?? [],
      unpaidCount: data['unpaidCount'] is int ? data['unpaidCount'] : 0,
      hasUnpaidInvoices: data['hasUnpaidInvoices'] == true,
    );
  }
}

// === ATTENDANCE ===

class AttendanceSummary {
  final int present;
  final int absent;
  final int late;
  final int leave;
  final int total;
  final double percentage;

  AttendanceSummary({
    required this.present,
    required this.absent,
    this.late = 0,
    this.leave = 0,
    required this.total,
    this.percentage = 0,
  });

  factory AttendanceSummary.fromJson(Map<String, dynamic> j) {
    final summary = j['summary'] is Map ? j['summary'] as Map<String, dynamic> : j;
    return AttendanceSummary(
      present: _toInt(summary['present']),
      absent: _toInt(summary['absent']),
      late: _toInt(summary['late']),
      leave: _toInt(summary['leave']),
      total: _toInt(summary['total']),
      percentage: _toDouble(j['percentage'] ?? summary['percentage']),
    );
  }

  double get rate => total == 0 ? 0 : (present / total) * 100;
}

class AttendanceDay {
  final int day;
  final String dayOfWeek;
  final String status;
  final String? checkInTime;
  final String? notes;

  AttendanceDay({
    required this.day,
    required this.dayOfWeek,
    required this.status,
    this.checkInTime,
    this.notes,
  });

  factory AttendanceDay.fromJson(Map<String, dynamic> j) => AttendanceDay(
        day: _toInt(j['ethiopian_day']),
        dayOfWeek: j['day_of_week']?.toString() ?? '',
        status: j['status']?.toString() ?? 'ABSENT',
        checkInTime: j['check_in_time']?.toString(),
        notes: j['notes']?.toString(),
      );
}

// === POSTS ===

class Post {
  final String id;
  final String title;
  final String body;
  final String? authorName;
  final String? authorImage;
  final String? image;
  final int likes;
  final bool liked;
  final String? createdAt;

  Post({
    required this.id,
    required this.title,
    required this.body,
    this.authorName,
    this.authorImage,
    this.image,
    this.likes = 0,
    this.liked = false,
    this.createdAt,
  });

  factory Post.fromJson(Map<String, dynamic> j) {
    // Extract first media filename if available
    String? imageUrl;
    if (j['media'] is List && (j['media'] as List).isNotEmpty) {
      final media = j['media'][0];
      if (media is Map && media['filename'] != null) {
        imageUrl = '/Uploads/posts/${media['filename']}';
      }
    }
    imageUrl ??= j['image']?.toString();

    return Post(
      id: j['id']?.toString() ?? '',
      title: j['title']?.toString() ?? '',
      body: j['body']?.toString() ?? j['content']?.toString() ?? '',
      authorName: j['author_name']?.toString() ?? j['authorName']?.toString(),
      authorImage: j['author_image']?.toString() ?? j['authorImage']?.toString(),
      image: imageUrl,
      likes: j['likes'] is num ? j['likes'].toInt() : 0,
      liked: j['liked'] == true,
      createdAt: j['created_at']?.toString() ?? j['createdAt']?.toString(),
    );
  }
}

// === NOTIFICATIONS ===

class NotificationItem {
  final String id;
  final String title;
  final String body;
  final String? time;
  final bool read;

  NotificationItem({
    required this.id,
    required this.title,
    required this.body,
    this.time,
    this.read = false,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> j) => NotificationItem(
        id: j['id']?.toString() ?? '',
        title: j['title']?.toString() ?? '',
        body: j['body']?.toString() ?? j['message']?.toString() ?? '',
        time: j['time']?.toString() ?? j['created_at']?.toString(),
        read: j['read'] == true,
      );
}

// === DISCIPLINE FAULTS (7.1) ===

class FaultRecord {
  final int id;
  final String studentName;
  final String? date;
  final String type;
  final String level;
  final String description;
  final String reportedBy;
  final String? actionTaken;
  final String? attachment;

  FaultRecord({
    required this.id,
    required this.studentName,
    this.date,
    required this.type,
    required this.level,
    required this.description,
    required this.reportedBy,
    this.actionTaken,
    this.attachment,
  });

  factory FaultRecord.fromJson(Map<String, dynamic> j) => FaultRecord(
        id: _toInt(j['id']),
        studentName: j['student_name']?.toString() ?? '',
        date: j['date']?.toString(),
        type: j['type']?.toString() ?? 'Fault',
        level: j['level']?.toString() ?? '—',
        description: j['description']?.toString() ?? '',
        reportedBy: j['reported_by']?.toString() ?? 'Staff',
        actionTaken: j['action_taken']?.toString(),
        attachment: j['attachment']?.toString(),
      );
}

// === CHAT / MESSAGES (8.1) ===

class ChatConversation {
  final String id;
  final String title;
  final String? lastMessage;
  final String? lastTime;
  final int unreadCount;

  ChatConversation({
    required this.id,
    required this.title,
    this.lastMessage,
    this.lastTime,
    this.unreadCount = 0,
  });

  factory ChatConversation.fromJson(Map<String, dynamic> j) {
    // Accept several shapes from the backend
    final participants = j['participants'];
    String title = j['title']?.toString() ??
        j['conversation_title']?.toString() ??
        j['other_participant']?.toString() ??
        j['name']?.toString() ??
        'Conversation';
    if ((title.isEmpty || title == 'Conversation') && participants is List) {
      final names = participants
          .map((p) => p is Map ? (p['name']?.toString() ?? p['username']?.toString() ?? '') : p.toString())
          .where((s) => s.isNotEmpty)
          .toList();
      if (names.isNotEmpty) title = names.join(', ');
    }
    return ChatConversation(
      id: j['id']?.toString() ?? j['conversation_id']?.toString() ?? '',
      title: title,
      lastMessage: j['last_message']?.toString() ?? j['lastMessage']?.toString() ?? j['message']?.toString(),
      lastTime: j['last_message_time']?.toString() ?? j['lastMessageTime']?.toString() ?? j['updated_at']?.toString(),
      unreadCount: j['unread_count'] is int ? j['unread_count'] : _toInt(j['unreadCount']),
    );
  }
}

class ChatMessage {
  final String id;
  final String senderName;
  final String content;
  final String? time;
  final bool isMine;

  ChatMessage({
    required this.id,
    required this.senderName,
    required this.content,
    this.time,
    this.isMine = false,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> j, String myUsername) => ChatMessage(
        id: j['id']?.toString() ?? '',
        senderName: j['sender_name']?.toString() ??
            j['senderName']?.toString() ??
            j['sender']?.toString() ??
            '',
        content: j['content']?.toString() ?? j['message']?.toString() ?? j['body']?.toString() ?? '',
        time: j['created_at']?.toString() ?? j['time']?.toString() ?? j['timestamp']?.toString(),
        isMine: (j['sender_username']?.toString() ?? j['sender']?.toString() ?? '') == myUsername,
      );
}

// === HELPERS ===

double _toDouble(dynamic v) {
  if (v is double) return v;
  if (v is int) return v.toDouble();
  if (v is String) return double.tryParse(v) ?? 0;
  return 0;
}

int _toInt(dynamic v) {
  if (v is int) return v;
  if (v is double) return v.toInt();
  if (v is String) return int.tryParse(v) ?? 0;
  return 0;
}



