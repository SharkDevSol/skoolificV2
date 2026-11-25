import 'package:flutter/material.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import 'marks_tab.dart';
import 'attendance_tab.dart';

class KGManagementScreen extends StatefulWidget {
  const KGManagementScreen({super.key});
  @override
  State<KGManagementScreen> createState() => _KGManagementScreenState();
}

class _KGManagementScreenState extends State<KGManagementScreen> with SingleTickerProviderStateMixin {
  late final TabController _tc;
  List<String> _classes = [];
  int _termCount = 2;
  String? _selectedClass;
  List<Map<String, dynamic>> _students = [];
  bool _loading = true;
  String? _error;
  bool _savingTerms = false;

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 4, vsync: this);
    _loadConfig();
  }

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  Future<void> _loadConfig() async {
    setState(() { _loading = true; _error = null; });
    try {
      final cfg = await ApiService().getKgClasses();
      final classes = (cfg['classes'] as List?)?.map((e) => '$e').toList() ?? <String>[];
      final selected = _selectedClass != null && classes.contains(_selectedClass) ? _selectedClass : (classes.isNotEmpty ? classes.first : null);
      if (!mounted) return;
      setState(() {
        _classes = classes;
        _termCount = int.tryParse('${cfg['term_count'] ?? 2}') ?? 2;
        _selectedClass = selected;
      });
      await _loadStudents();
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _loadStudents() async {
    if (_selectedClass == null) {
      if (mounted) setState(() { _students = []; _loading = false; });
      return;
    }
    setState(() { _loading = true; });
    try {
      final rows = await ApiService().getStudentRows(_selectedClass!);
      if (!mounted) return;
      setState(() { _students = rows; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Widget _studentsTab() {
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Row(children: [
          Expanded(
            child: DropdownButtonFormField<String>(
              value: _selectedClass,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'KG class', isDense: true),
              items: _classes.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) {
                setState(() => _selectedClass = v);
                _loadStudents();
              },
            ),
          ),
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.10), borderRadius: BorderRadius.circular(20)),
            child: Text('${_students.length} students', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 12)),
          ),
        ]),
      ),
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _students.isEmpty
                ? const Center(child: Text('No KG students found'))
                : RefreshIndicator(
                    onRefresh: _loadStudents,
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                      itemCount: _students.length,
                      itemBuilder: (context, i) {
                        final s = _students[i];
                        final name = '${s['student_name'] ?? s['studentName'] ?? s['name'] ?? ''}';
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: CircleAvatar(child: Text(name.isNotEmpty ? name.substring(0, 1).toUpperCase() : 'K')),
                            title: Text(name),
                            subtitle: Text('${s['guardian_name'] ?? 'Guardian'}${s['guardian_phone'] != null ? ' · ${s['guardian_phone']}' : ''}'),
                          ),
                        );
                      },
                    ),
                  ),
      ),
    ]);
  }

  Widget _settingsTab() {
    return ListView(padding: const EdgeInsets.all(16), children: [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('KG Terms', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 4),
            const Text('Controls the Term dropdown on KG Mark List and KG evaluation.', style: TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 12),
            DropdownButtonFormField<int>(
              value: _termCount,
              decoration: const InputDecoration(labelText: 'Number of KG terms', isDense: true),
              items: const [2, 3, 4].map((n) => DropdownMenuItem(value: n, child: Text('$n Terms'))).toList(),
              onChanged: (v) => setState(() => _termCount = v ?? 2),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _savingTerms ? null : () async {
                  setState(() => _savingTerms = true);
                  final err = await ApiService().saveKgTermCount(_termCount);
                  if (!mounted) return;
                  setState(() => _savingTerms = false);
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(err ?? 'KG term setting saved'),
                    backgroundColor: err == null ? AppColors.success : AppColors.danger,
                  ));
                },
                child: Text(_savingTerms ? 'Saving...' : 'Save KG Terms'),
              ),
            ),
          ]),
        ),
      ),
      Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('KG classes', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            const SizedBox(height: 8),
            if (_classes.isEmpty) const Text('No KG classes found', style: TextStyle(color: Colors.grey)),
            ..._classes.map((c) => ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.child_care),
              title: Text(c),
            )),
          ]),
        ),
      ),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('KG Management'),
        bottom: TabBar(
          controller: _tc,
          isScrollable: true,
          tabs: const [Tab(text: 'Students'), Tab(text: 'Marks'), Tab(text: 'Attendance'), Tab(text: 'Settings')],
        ),
      ),
      body: _error != null
          ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
          : TabBarView(
              controller: _tc,
              children: [
                _studentsTab(),
                const MarksTab(kgOnly: true),
                const AttendanceTab(kgOnly: true),
                _settingsTab(),
              ],
            ),
    );
  }
}
