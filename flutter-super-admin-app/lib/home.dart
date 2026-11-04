import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'api.dart';

const kBlue = Color(0xFF1F3B73);
const kGold = Color(0xFFF7941E);
const kGreen = Color(0xFF107C41);
const kRed = Color(0xFFB21E23);

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

List<Map<String, dynamic>> byBranch(Map<String, dynamic>? d) {
  final b = d?['byBranch'];
  if (b is List) {
    return b.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
  return [];
}

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
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomePage()),
      );
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
                      child: const Center(
                        child: Text('I', style: TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text('Skoolific Super Admin', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: kBlue)),
                    const SizedBox(height: 4),
                    const Text('IQRA branches 2 – 5', style: TextStyle(color: Colors.grey)),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _user,
                      decoration: const InputDecoration(labelText: 'Username', border: OutlineInputBorder()),
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _pass,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder()),
                      onSubmitted: (_) => _submit(),
                    ),
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

class _HomePageState extends State<HomePage> {
  int _tab = 0;
  String _branch = 'ALL';
  bool _loading = true;
  Map<String, dynamic>? _students;
  Map<String, dynamic>? _attendance;
  Map<String, dynamic>? _finance;
  Map<String, dynamic>? _faults;

  static const List<String> _branches = ['ALL', 'IQRA2', 'IQRA3', 'IQRA4', 'IQRA5'];

  @override
  void initState() {
    super.initState();
    _initPush();
    _load();
  }

  Future<void> _initPush() async {
    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();
      final token = await messaging.getToken();
      if (token != null) await Api.registerDevice(token);
    } catch (_) {}
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final params = {'branchCode': _branch};
    final res = await Future.wait<Map<String, dynamic>?>([
      Api.get('/super-admin/report/students', params: params),
      Api.get('/super-admin/report/attendance', params: params),
      Api.get('/super-admin/report/finance', params: params),
      Api.get('/super-admin/report/faults', params: params),
    ]);
    if (!mounted) return;
    setState(() {
      _students = res[0];
      _attendance = res[1];
      _finance = res[2];
      _faults = res[3];
      _loading = false;
    });
  }

  Future<void> _logout() async {
    await Api.logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final titles = ['Dashboard', 'Students', 'Finance', 'Settings'];
    return Scaffold(
      appBar: AppBar(
        title: Text(titles[_tab], style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          PopupMenuButton<String>(
            initialValue: _branch,
            onSelected: (v) {
              setState(() => _branch = v);
              _load();
            },
            itemBuilder: (_) => _branches
                .map((b) => PopupMenuItem(value: b, child: Text(b == 'ALL' ? 'All branches' : b)))
                .toList(),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  const Icon(Icons.account_tree_outlined, color: Colors.white, size: 18),
                  const SizedBox(width: 6),
                  Text(_branch, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : IndexedStack(
              index: _tab,
              children: [
                _dashboard(),
                _studentsTab(),
                _financeTab(),
                _settingsTab(),
              ],
            ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people), label: 'Students'),
          NavigationDestination(icon: Icon(Icons.payments_outlined), selectedIcon: Icon(Icons.payments), label: 'Finance'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
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

  Widget _dashboard() {
    final stuBranches = byBranch(_students);
    final attByCode = {for (final b in byBranch(_attendance)) b['branchCode']: b};
    final finByCode = {for (final b in byBranch(_finance)) b['branchCode']: b};

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [kBlue, Color(0xFF2F5AA8)]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Total Students', style: TextStyle(color: Colors.white70, fontSize: 14)),
                const SizedBox(height: 6),
                Text(fmt(_students?['grandTotal']), style: const TextStyle(color: Colors.white, fontSize: 38, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Text(
                  '${fmt(_students?['grandMale'])} boys · ${fmt(_students?['grandFemale'])} girls · ${stuBranches.length} branches',
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 2.4,
            children: [
              _statCard('Attendance', '${fmt(_attendance?['grandRate'])}%', kGreen, Icons.check_circle_outline),
              _statCard('Collected', birr(_finance?['grandCollected']), kGold, Icons.payments_outlined),
              _statCard('Pending', birr(_finance?['grandPending']), kRed, Icons.money_off),
              _statCard('Faults', fmt(_faults?['grandTotal']), const Color(0xFF6A1B9A), Icons.warning_amber_outlined),
            ],
          ),
          const SizedBox(height: 20),
          const Text('By branch', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: kBlue)),
          const SizedBox(height: 10),
          ...stuBranches.map((b) {
            final code = b['branchCode'];
            final att = attByCode[code];
            final fin = finByCode[code];
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
              child: Row(
                children: [
                  CircleAvatar(backgroundColor: kBlue.withValues(alpha: 0.1), child: Text('${b['branchName'] ?? code}'.substring(0, 1), style: const TextStyle(color: kBlue, fontWeight: FontWeight.bold))),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${b['branchName'] ?? code}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 2),
                        Text('${fmt(b['total'])} students · ${fmt(att?['rate'])}% · ${birr(fin?['collected'])}', style: const TextStyle(fontSize: 12, color: Colors.black54)),
                      ],
                    ),
                  ),
                  Text(fmt(b['total']), style: const TextStyle(fontWeight: FontWeight.bold, color: kBlue)),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _studentsTab() {
    final branches = byBranch(_students);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _statCard('All students', fmt(_students?['grandTotal']), kBlue, Icons.people_outline),
        const SizedBox(height: 12),
        ...branches.map((b) {
          final classes = (b['classes'] as List? ?? []);
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ExpansionTile(
              leading: CircleAvatar(backgroundColor: kBlue.withValues(alpha: 0.1), child: Text('${b['branchName'] ?? b['branchCode']}'.substring(0, 1), style: const TextStyle(color: kBlue, fontWeight: FontWeight.bold))),
              title: Text('${b['branchName'] ?? b['branchCode']}', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('${fmt(b['total'])} students · ${fmt(b['male'])} boys · ${fmt(b['female'])} girls'),
              children: classes.map<Widget>((c) {
                final cm = Map<String, dynamic>.from(c as Map);
                return ListTile(
                  dense: true,
                  title: Text('${cm['className']}'),
                  trailing: Text('${fmt(cm['students'])}', style: const TextStyle(fontWeight: FontWeight.bold)),
                );
              }).toList(),
            ),
          );
        }),
      ],
    );
  }

  Widget _financeTab() {
    final branches = byBranch(_finance);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _statCard('Expected', birr(_finance?['grandExpected']), kBlue, Icons.account_balance_wallet_outlined),
        const SizedBox(height: 10),
        _statCard('Collected', birr(_finance?['grandCollected']), kGreen, Icons.savings_outlined),
        const SizedBox(height: 10),
        _statCard('Pending', birr(_finance?['grandPending']), kRed, Icons.money_off),
        const SizedBox(height: 16),
        ...branches.map((b) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text('${b['branchName'] ?? b['branchCode']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text('Collected ${birr(b['collected'])} · Pending ${birr(b['pending'])}'),
                trailing: Text(birr(b['collected']), style: const TextStyle(color: kGreen, fontWeight: FontWeight.bold)),
              ),
            )),
      ],
    );
  }

  Widget _settingsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.person_outline, color: kBlue),
                title: const Text('Signed in as'),
                subtitle: Text(Api.username ?? '-'),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.account_tree_outlined, color: kBlue),
                title: const Text('Branch filter'),
                subtitle: Text(_branch == 'ALL' ? 'All branches (IQRA2 – IQRA5)' : _branch),
                trailing: DropdownButton<String>(
                  value: _branch,
                  underline: const SizedBox(),
                  items: _branches.map((b) => DropdownMenuItem(value: b, child: Text(b == 'ALL' ? 'ALL' : b))).toList(),
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() => _branch = v);
                    _load();
                  },
                ),
              ),
              const Divider(height: 1),
              const ListTile(
                leading: Icon(Icons.notifications_active_outlined, color: kGold),
                title: Text('Daily report notification'),
                subtitle: Text('You receive a push notification every day at 08:00 with the latest totals.'),
              ),
            ],
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
        const Center(child: Text('Skoolific Super Admin · 1.0.0', style: TextStyle(color: Colors.black38, fontSize: 12))),
      ],
    );
  }
}
