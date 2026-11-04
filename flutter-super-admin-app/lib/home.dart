import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'api.dart';

const kBlue = Color(0xFF1F3B73);
const kGold = Color(0xFFF7941E);
const kGreen = Color(0xFF107C41);
const kRed = Color(0xFFB21E23);
const kPurple = Color(0xFF6A1B9A);

String fmt(num? n) {
  final v = (n ?? 0).toDouble();
  final s = v.toStringAsFixed(0);
  final neg = s.startsWith('-');
  final digits = neg ? s.substring(1) : s;
  final buf = StringBuffer();
  for (int i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buf.write(',');
    buf.write(digits[i]);
  }
  return (neg ? '-' : '') + buf.toString();
}

String birr(num? n) => fmt(n) + ' Birr';

List<Map<String, dynamic>> listOf(dynamic v) {
  if (v is List) return v.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  return [];
}

List<Map<String, dynamic>> byBranchOf(Map<String, dynamic>? d) => listOf(d?['byBranch']);

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _user = TextEditingController();
  final _pass = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    if (_user.text.trim().isEmpty || _pass.text.isEmpty) {
      setState(() => _error = 'Enter username and password');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    final err = await Api.login(_user.text.trim(), _pass.text);
    if (!mounted) return;
    if (err == null) {
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomePage()));
    } else {
      setState(() {
        _error = err;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Card(
              elevation: 6,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              child: Padding(
                padding: const EdgeInsets.all(28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 68,
                      height: 68,
                      decoration: const BoxDecoration(color: kBlue, shape: BoxShape.circle),
                      child: const Center(child: Text('I', style: TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.bold))),
                    ),
                    const SizedBox(height: 16),
                    const Text('IQRA Super Admin', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: kBlue)),
                    const SizedBox(height: 4),
                    const Text('IQRA branches 2 – 5', style: TextStyle(color: Colors.grey)),
                    const SizedBox(height: 24),
                    TextField(controller: _user, decoration: const InputDecoration(labelText: 'Username', border: OutlineInputBorder()), textInputAction: TextInputAction.next),
                    const SizedBox(height: 12),
                    TextField(controller: _pass, obscureText: true, decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder()), onSubmitted: (_) => _submit()),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(_error!, style: const TextStyle(color: kRed)),
                    ],
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: FilledButton(
                        style: FilledButton.styleFrom(backgroundColor: kBlue),
                        onPressed: _loading ? null : _submit,
                        child: _loading
                            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Sign In', style: TextStyle(fontSize: 16)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with SingleTickerProviderStateMixin {
  static const List<String> _branchOptions = ['ALL', 'IQRA2', 'IQRA3', 'IQRA4', 'IQRA5'];
  static const List<String> _tabNames = ['Home', 'Students', 'Attendance', 'Marks', 'Faults', 'Finance', 'Settings'];

  late final TabController _tabController;
  String _branch = 'ALL';
  bool _loading = false;
  String? _error;
  final Map<String, Map<String, dynamic>?> _reports = {};
  final Map<String, DateTime> _cachedAt = {};

  // Settings state
  List<Map<String, dynamic>> _branchAdmins = [];
  final Map<String, TextEditingController> _baUser = {};
  final Map<String, TextEditingController> _baPass = {};
  final _accCurrent = TextEditingController();
  final _accUser = TextEditingController();
  final _accPass = TextEditingController();
  final _dailyRecipients = TextEditingController();
  bool _dailyEnabled = true;
  int _dailyHour = 8;
  String? _settingsMsg;
  bool _settingsLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabNames.length, vsync: this);
    _tabController.addListener(_onTabChanged);
    _initPush();
    _ensureTab(0);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _accCurrent.dispose();
    _accUser.dispose();
    _accPass.dispose();
    _dailyRecipients.dispose();
    for (final c in _baUser.values) {
      c.dispose();
    }
    for (final c in _baPass.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) return;
    _ensureTab(_tabController.index);
    setState(() {});
  }

  Future<void> _initPush() async {
    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();
      final token = await messaging.getToken();
      if (token != null) await Api.registerDevice(token);
    } catch (_) {}
  }

  // Which reports each tab needs (lazy: only the active tab is fetched).
  List<String> _keysFor(int index) {
    switch (index) {
      case 0:
        return ['students', 'attendance', 'finance', 'faults'];
      case 1:
        return ['students'];
      case 2:
        return ['attendance'];
      case 3:
        return ['marks'];
      case 4:
        return ['faults'];
      case 5:
        return ['finance'];
      default:
        return [];
    }
  }

  String _cacheKey(String name) => '$name|$_branch';

  Future<void> _ensureTab(int index, {bool force = false}) async {
    final keys = _keysFor(index);
    if (keys.isEmpty) {
      if (index == 6) await _loadSettings();
      return;
    }
    final now = DateTime.now();
    final stale = keys.where((k) {
      final at = _cachedAt[_cacheKey(k)];
      return force || at == null || now.difference(at).inSeconds > 180;
    }).toList();
    if (stale.isEmpty) return;

    setState(() {
      _loading = true;
      _error = null;
    });
    final params = {'branchCode': _branch};
    final results = await Future.wait(stale.map((key) => Api.get('/super-admin/report/$key', params: params)));
    if (!mounted) return;
    setState(() {
      for (int i = 0; i < stale.length; i++) {
        if (results[i] != null) {
          _reports[_cacheKey(stale[i])] = results[i];
          _cachedAt[_cacheKey(stale[i])] = DateTime.now();
        }
      }
      _loading = false;
      if (results.every((r) => r == null)) _error = 'Could not load data. Check your connection.';
    });
  }

  Map<String, dynamic>? _report(String name) => _reports[_cacheKey(name)];

  Future<void> _loadSettings() async {
    setState(() => _settingsLoading = true);
    final ba = await Api.getJson('/super-admin/branch-admins');
    final daily = await Api.getJson('/super-admin/daily-report/settings');
    if (!mounted) return;
    setState(() {
      if (ba is Map && ba['data'] is List) {
        _branchAdmins = (ba['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        for (final b in _branchAdmins) {
          final code = '${b['branchCode']}';
          _baUser.putIfAbsent(code, () => TextEditingController(text: '${b['username'] ?? ''}'));
          _baPass.putIfAbsent(code, () => TextEditingController());
        }
      }
      if (daily is Map && daily['data'] is Map) {
        final d = Map<String, dynamic>.from(daily['data'] as Map);
        _dailyEnabled = d['daily_report_enabled'] != false;
        _dailyHour = (d['send_hour'] as num?)?.toInt() ?? 8;
        _dailyRecipients.text = (d['recipients'] ?? '').toString();
      }
      _settingsLoading = false;
    });
  }

  Future<void> _saveAccount() async {
    if (_accCurrent.text.trim().isEmpty) {
      setState(() => _settingsMsg = 'Enter your current password');
      return;
    }
    final body = <String, dynamic>{'currentPassword': _accCurrent.text};
    if (_accUser.text.trim().isNotEmpty) body['newUsername'] = _accUser.text.trim();
    if (_accPass.text.isNotEmpty) body['newPassword'] = _accPass.text;
    final r = await Api.put('/super-admin/account', body);
    if (!mounted) return;
    setState(() {
      _settingsMsg = (r?['success'] == true) ? 'Account updated' : (r?['error'] ?? 'Update failed').toString();
      if (r?['success'] == true) {
        _accCurrent.clear();
        _accUser.clear();
        _accPass.clear();
      }
    });
  }

  Future<void> _saveBranchAdmin(String code) async {
    final user = _baUser[code]?.text.trim() ?? '';
    final pass = _baPass[code]?.text ?? '';
    if (user.isEmpty && pass.isEmpty) {
      setState(() => _settingsMsg = 'Enter a new username or password for ' + code);
      return;
    }
    final body = <String, dynamic>{};
    if (user.isNotEmpty) body['username'] = user;
    if (pass.isNotEmpty) body['newPassword'] = pass;
    final r = await Api.put('/super-admin/branch-admins/' + code, body);
    if (!mounted) return;
    setState(() {
      _settingsMsg = (r?['success'] == true) ? (r?['message'] ?? code + ' updated').toString() : (r?['error'] ?? 'Update failed').toString();
      if (r?['success'] == true) _baPass[code]?.clear();
    });
  }

  Future<void> _saveDaily() async {
    final r = await Api.put('/super-admin/daily-report/settings', {
      'daily_report_enabled': _dailyEnabled,
      'recipients': _dailyRecipients.text.trim(),
      'send_hour': _dailyHour,
    });
    if (!mounted) return;
    setState(() => _settingsMsg = (r?['success'] == true) ? 'Daily report settings saved' : (r?['error'] ?? 'Save failed').toString());
  }

  Future<void> _sendDailyNow() async {
    setState(() => _settingsMsg = 'Sending...');
    final r = await Api.post('/super-admin/daily-report/send');
    if (!mounted) return;
    final d = r?['data'];
    final sent = d is Map && d['sent'] == true;
    setState(() => _settingsMsg = sent
        ? 'Daily report sent' + (d['push'] != null && d['push']['sent'] != null ? ' (push: ' + d['push']['sent'] + ')' : '')
        : 'Not sent: ${(d is Map ? (d['reason'] ?? d['status']) : null) ?? 'unknown'}');
  }

  void _changeBranch(String? value) {
    if (value == null || value == _branch) return;
    setState(() {
      _branch = value;
      _reports.clear();
      _cachedAt.clear();
    });
    _ensureTab(_tabController.index, force: true);
  }

  Future<void> _refresh() => _ensureTab(_tabController.index, force: true);

  Future<void> _logout() async {
    await Api.logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginPage()), (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('IQRA Super Admin', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          PopupMenuButton<String>(
            initialValue: _branch,
            onSelected: _changeBranch,
            itemBuilder: (_) => _branchOptions.map((b) => PopupMenuItem(value: b, child: Text(b == 'ALL' ? 'All branches' : b))).toList(),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(children: [
                const Icon(Icons.account_tree_outlined, color: Colors.white, size: 18),
                const SizedBox(width: 6),
                Text(_branch, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              ]),
            ),
          ),
          IconButton(onPressed: _refresh, icon: const Icon(Icons.refresh)),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: kGold,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: _tabNames.map((n) => Tab(text: n)).toList(),
        ),
      ),
      body: Column(
        children: [
          if (_loading) const LinearProgressIndicator(minHeight: 2),
          if (_error != null)
            Container(
              width: double.infinity,
              color: const Color(0xFFFFEBEE),
              padding: const EdgeInsets.all(8),
              child: Text(_error!, style: const TextStyle(color: kRed, fontSize: 12)),
            ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _homeView(),
                _studentsView(),
                _attendanceView(),
                _marksView(),
                _faultsView(),
                _financeView(),
                _settingsView(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statCard(String label, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2))],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
                const SizedBox(height: 2),
                Text(value, style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: color)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _grid(List<Widget> cards) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 2.4,
      children: cards,
    );
  }

  Widget _sectionTitle(String title) => Padding(
        padding: const EdgeInsets.only(top: 20, bottom: 10),
        child: Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: kBlue)),
      );

  Widget _branchTile(String name, String subtitle, String trailing, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
      child: Row(
        children: [
          CircleAvatar(backgroundColor: color.withValues(alpha: 0.1), child: Text(name.isNotEmpty ? name.substring(0, 1) : '?', style: TextStyle(color: color, fontWeight: FontWeight.bold))),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 2),
              Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.black54)),
            ]),
          ),
          Text(trailing, style: TextStyle(fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _empty(String message) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text(message, style: const TextStyle(color: Colors.black45)),
        ),
      );

  // ---------------- HOME ----------------
  Widget _homeView() {
    final students = _report('students');
    final attendance = _report('attendance');
    final finance = _report('finance');
    final faults = _report('faults');
    if (students == null && attendance == null && finance == null && faults == null) {
      return _empty('Loading dashboard...');
    }
    final stuBranches = byBranchOf(students);
    final attByCode = {for (final b in byBranchOf(attendance)) b['branchCode']: b};
    final finByCode = {for (final b in byBranchOf(finance)) b['branchCode']: b};

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(gradient: const LinearGradient(colors: [kBlue, Color(0xFF2F5AA8)]), borderRadius: BorderRadius.circular(20)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Total Students', style: TextStyle(color: Colors.white70, fontSize: 14)),
                const SizedBox(height: 6),
                Text(fmt(students?['grandTotal']), style: const TextStyle(color: Colors.white, fontSize: 38, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Text('${fmt(students?['grandMale'])} boys · ${fmt(students?['grandFemale'])} girls · ${stuBranches.length} branches', style: const TextStyle(color: Colors.white70, fontSize: 13)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _grid([
            _statCard('Attendance', '${fmt(attendance?['grandRate'])}%', kGreen, Icons.check_circle_outline),
            _statCard('Collected', birr(finance?['grandCollected']), kGold, Icons.payments_outlined),
            _statCard('Pending', birr(finance?['grandPending']), kRed, Icons.money_off),
            _statCard('Faults', fmt(faults?['grandTotal']), kPurple, Icons.warning_amber_outlined),
          ]),
          _sectionTitle('By branch'),
          ...stuBranches.map((b) {
            final att = attByCode[b['branchCode']];
            final fin = finByCode[b['branchCode']];
            return _branchTile(
              '${b['branchName'] ?? b['branchCode']}',
              '${fmt(b['total'])} students · ${fmt(att?['rate'])}% · ${birr(fin?['collected'])}',
              fmt(b['total']),
              kBlue,
            );
          }),
        ],
      ),
    );
  }

  // ---------------- STUDENTS ----------------
  Widget _studentsView() {
    final students = _report('students');
    if (students == null) return _empty('Loading students...');
    final branches = byBranchOf(students);
    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _statCard('All students', fmt(students['grandTotal']), kBlue, Icons.people_outline),
          const SizedBox(height: 10),
          _statCard('Boys / Girls', '${fmt(students['grandMale'])} / ${fmt(students['grandFemale'])}', kGreen, Icons.wc),
          const SizedBox(height: 12),
          ...branches.map((b) {
            final classes = listOf(b['classes']);
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ExpansionTile(
                leading: CircleAvatar(backgroundColor: kBlue.withValues(alpha: 0.1), child: Text('${b['branchName'] ?? b['branchCode']}'.substring(0, 1), style: const TextStyle(color: kBlue, fontWeight: FontWeight.bold))),
                title: Text('${b['branchName'] ?? b['branchCode']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text('${fmt(b['total'])} students · ${fmt(b['male'])} boys · ${fmt(b['female'])} girls'),
                children: classes.map((c) {
                  return ListTile(dense: true, title: Text('${c['className']}'), trailing: Text(fmt(c['students']), style: const TextStyle(fontWeight: FontWeight.bold)));
                }).toList(),
              ),
            );
          }),
        ],
      ),
    );
  }

  // ---------------- ATTENDANCE ----------------
  Widget _attendanceView() {
    final attendance = _report('attendance');
    if (attendance == null) return _empty('Loading attendance...');
    final branches = byBranchOf(attendance);
    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _grid([
            _statCard('Rate', '${fmt(attendance['grandRate'])}%', kGreen, Icons.percent),
            _statCard('Records', fmt(attendance['grandTotal']), kBlue, Icons.list_alt),
            _statCard('Present', fmt(attendance['grandPresent']), kGreen, Icons.check),
            _statCard('Absent', fmt(attendance['grandAbsent']), kRed, Icons.close),
            _statCard('Late', fmt(attendance['grandLate']), kGold, Icons.schedule),
            _statCard('Permission', fmt(attendance['grandPermission']), kPurple, Icons.verified_outlined),
          ]),
          _sectionTitle('By branch'),
          ...branches.map((b) => _branchTile(
                '${b['branchName'] ?? b['branchCode']}',
                '${fmt(b['present'])} present · ${fmt(b['absent'])} absent · ${fmt(b['late'])} late',
                '${fmt(b['rate'])}%',
                kGreen,
              )),
        ],
      ),
    );
  }

  // ---------------- MARKS ----------------
  Widget _marksView() {
    final marks = _report('marks');
    if (marks == null) return _empty('Loading marks...');
    final branches = byBranchOf(marks);
    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _grid([
            _statCard('Avg score', fmt(marks['grandAvgScore']), kBlue, Icons.grading),
            _statCard('Graded students', fmt(marks['grandGradedStudents']), kGreen, Icons.people_outline),
            _statCard('Subjects', fmt(marks['grandSubjectsCount']), kGold, Icons.menu_book_outlined),
            _statCard('Term', '${marks['term'] ?? '-'}', kPurple, Icons.event_note),
          ]),
          _sectionTitle('By branch'),
          ...branches.map((b) => _branchTile(
                '${b['branchName'] ?? b['branchCode']}',
                '${fmt(b['totalGradedStudents'])} graded · ${fmt(b['subjectsCount'])} subjects',
                fmt(b['avgScore']),
                kBlue,
              )),
        ],
      ),
    );
  }

  // ---------------- FAULTS ----------------
  Widget _faultsView() {
    final faults = _report('faults');
    if (faults == null) return _empty('Loading faults...');
    final branches = byBranchOf(faults);
    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _statCard('Total faults', fmt(faults['grandTotal']), kPurple, Icons.warning_amber_outlined),
          const SizedBox(height: 12),
          ...branches.map((b) {
            final classes = listOf(b['classes']);
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ExpansionTile(
                leading: CircleAvatar(backgroundColor: kPurple.withValues(alpha: 0.1), child: Icon(Icons.warning_amber_outlined, color: kPurple, size: 20)),
                title: Text('${b['branchName'] ?? b['branchCode']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text('${fmt(b['total'])} faults'),
                children: classes.map((c) => ListTile(dense: true, title: Text('${c['className']}'), trailing: Text(fmt(c['faults']), style: const TextStyle(fontWeight: FontWeight.bold)))).toList(),
              ),
            );
          }),
        ],
      ),
    );
  }

  // ---------------- FINANCE ----------------
  Widget _financeView() {
    final finance = _report('finance');
    if (finance == null) return _empty('Loading finance...');
    final branches = byBranchOf(finance);
    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _grid([
            _statCard('Expected', birr(finance['grandExpected']), kBlue, Icons.account_balance_wallet_outlined),
            _statCard('Collected', birr(finance['grandCollected']), kGreen, Icons.savings_outlined),
            _statCard('Pending', birr(finance['grandPending']), kRed, Icons.money_off),
            _statCard('Collection rate', '${fmt(finance['grandRate'])}%', kGold, Icons.percent),
          ]),
          _sectionTitle('By branch'),
          ...branches.map((b) => _branchTile(
                '${b['branchName'] ?? b['branchCode']}',
                'Collected ${birr(b['collected'])} · Pending ${birr(b['pending'])}',
                birr(b['collected']),
                kGreen,
              )),
        ],
      ),
    );
  }

  // ---------------- SETTINGS ----------------
  Widget _settingsView() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_settingsMsg != null)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: const Color(0xFFE3F2FD), borderRadius: BorderRadius.circular(8)),
            child: Text(_settingsMsg!, style: const TextStyle(color: kBlue, fontSize: 12)),
          ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Account', style: TextStyle(fontWeight: FontWeight.bold, color: kBlue)),
                const SizedBox(height: 10),
                TextField(controller: _accCurrent, obscureText: true, decoration: const InputDecoration(labelText: 'Current password', border: OutlineInputBorder(), isDense: true)),
                const SizedBox(height: 8),
                TextField(controller: _accUser, decoration: InputDecoration(labelText: 'New username (${Api.username ?? ''})', border: const OutlineInputBorder(), isDense: true)),
                const SizedBox(height: 8),
                TextField(controller: _accPass, obscureText: true, decoration: const InputDecoration(labelText: 'New password', border: OutlineInputBorder(), isDense: true)),
                const SizedBox(height: 10),
                SizedBox(width: double.infinity, child: FilledButton(onPressed: _saveAccount, child: const Text('Save account'))),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Branch Admin Accounts (IQRA2 – IQRA5)', style: TextStyle(fontWeight: FontWeight.bold, color: kBlue)),
                const SizedBox(height: 4),
                const Text('Change the username / password of each branch admin page.', style: TextStyle(fontSize: 12, color: Colors.black54)),
                if (_settingsLoading) const Padding(padding: EdgeInsets.all(12), child: LinearProgressIndicator()),
                ..._branchAdmins.map((b) {
                  final code = '${b['branchCode']}';
                  final name = '${b['branchName'] ?? code}';
                  return Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        Row(children: [
                          Expanded(child: TextField(controller: _baUser[code], decoration: InputDecoration(labelText: 'Username', border: const OutlineInputBorder(), isDense: true))),
                          const SizedBox(width: 8),
                          Expanded(child: TextField(controller: _baPass[code], obscureText: true, decoration: const InputDecoration(labelText: 'New password', border: OutlineInputBorder(), isDense: true))),
                          const SizedBox(width: 8),
                          IconButton(onPressed: () => _saveBranchAdmin(code), icon: const Icon(Icons.save, color: kBlue)),
                        ]),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Daily Report Notification', style: TextStyle(fontWeight: FontWeight.bold, color: kBlue)),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Send every day'),
                  subtitle: const Text('Push to this app at the chosen hour (email when SMTP is configured).'),
                  value: _dailyEnabled,
                  onChanged: (v) => setState(() => _dailyEnabled = v),
                ),
                TextField(controller: _dailyRecipients, decoration: const InputDecoration(labelText: 'Email recipients (comma separated)', border: OutlineInputBorder(), isDense: true)),
                const SizedBox(height: 8),
                Row(children: [
                  const Text('Hour: '),
                  DropdownButton<int>(
                    value: _dailyHour,
                    items: List.generate(24, (i) => DropdownMenuItem(value: i, child: Text(i.toString().padLeft(2, '0') + ':00'))),
                    onChanged: (v) => setState(() => _dailyHour = v ?? 8),
                  ),
                ]),
                const SizedBox(height: 8),
                Row(children: [
                  Expanded(child: FilledButton(onPressed: _saveDaily, child: const Text('Save'))),
                  const SizedBox(width: 8),
                  Expanded(child: OutlinedButton(onPressed: _sendDailyNow, child: const Text('Send now'))),
                ]),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 48,
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(foregroundColor: kRed, side: const BorderSide(color: kRed)),
            onPressed: _logout,
            icon: const Icon(Icons.logout),
            label: const Text('Log out'),
          ),
        ),
        const SizedBox(height: 12),
        const Center(child: Text('IQRA Super Admin · 1.0.2', style: TextStyle(color: Colors.black38, fontSize: 12))),
      ],
    );
  }
}
