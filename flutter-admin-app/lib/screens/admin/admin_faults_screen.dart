import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../app/app_provider.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import '../../models/models.dart';
import '../../widgets/info_dialog.dart';

class AdminFaultsScreen extends StatefulWidget {
  const AdminFaultsScreen({super.key});
  @override
  State<AdminFaultsScreen> createState() => _AdminFaultsScreenState();
}

class _AdminFaultsScreenState extends State<AdminFaultsScreen> with SingleTickerProviderStateMixin {
  static const _types = [
    'Late Arrival', 'Absence Without Permission', 'Leaving Class Without Permission',
    'Disrespect to Teacher', 'Fighting', 'Bullying', 'Cheating', 'Not Doing Homework',
    'Using Phone in Class', 'Dress Code Violation', 'Damaging School Property', 'Other',
  ];
  late final TabController _tc;
  List<String> _classes = [];
  String? _className;
  List<Map<String, dynamic>> _students = [];
  String? _studentName;
  List<FaultRecord> _classHistory = [];
  List<FaultRecord> _allHistory = [];
  String _type = _types.first;
  String _level = 'Minor';
  String _query = '';
  bool _historyLoading = false;
  final _descCtrl = TextEditingController();
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 2, vsync: this);
    _tc.addListener(() {
      if (!_tc.indexIsChanging && _tc.index == 1) _loadAllHistory();
    });
    _loadClasses();
  }

  @override
  void dispose() {
    _tc.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadClasses() async {
    setState(() { _loading = true; _error = null; });
    try {
      final classes = await ApiService().getClasses();
      if (!mounted) return;
      setState(() { _classes = classes; _className = classes.isNotEmpty ? classes.first : null; });
      await _loadClass();
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _loadClass() async {
    if (_className == null) return;
    setState(() { _loading = true; _error = null; });
    try {
      final students = await ApiService().getFaultStudents(_className!);
      final history = await ApiService().getFaultHistory(_className!);
      if (!mounted) return;
      setState(() {
        _students = students;
        _studentName = students.isNotEmpty ? '${students.first['student_name'] ?? ''}' : null;
        _classHistory = history;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _loadAllHistory() async {
    if (_historyLoading) return;
    setState(() => _historyLoading = true);
    try {
      final all = await ApiService().getAllFaultHistory();
      all.sort((a, b) => '${b.date ?? ''}'.compareTo('${a.date ?? ''}'));
      if (!mounted) return;
      setState(() { _allHistory = all; _historyLoading = false; });
    } catch (_) {
      if (mounted) setState(() => _historyLoading = false);
    }
  }

  Future<void> _save() async {
    final app = Provider.of<AppProvider>(context, listen: false);
    if (_className == null || _studentName == null) return;
    setState(() => _saving = true);
    final ok = await ApiService().addFault(
      studentName: _studentName!,
      className: _className!,
      faultType: _type,
      faultLevel: _level,
      date: DateTime.now().toIso8601String().split('T').first,
      description: _descCtrl.text.trim(),
      reportedBy: app.user?.name ?? 'Admin',
    );
    if (!mounted) return;
    setState(() => _saving = false);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(ok ? 'Fault recorded' : 'Could not record fault'),
      backgroundColor: ok ? AppColors.success : AppColors.danger,
    ));
    if (ok) { _descCtrl.clear(); await _loadClass(); }
  }

  List<FaultRecord> get _filteredHistory {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return _allHistory;
    return _allHistory.where((f) =>
        '${f.studentName} ${f.className} ${f.faultType} ${f.level} ${f.reportedBy ?? ''}'
            .toLowerCase()
            .contains(q)).toList();
  }

  void _showFault(FaultRecord f) {
    showInfoSheet(
      context,
      title: f.studentName,
      subtitle: '${f.className} • ${f.faultType}',
      entries: [
        InfoEntry('Student', f.studentName),
        InfoEntry('Class', f.className),
        InfoEntry('Fault type', f.faultType),
        InfoEntry('Level', f.level),
        InfoEntry('Date', '${f.date ?? ''}'),
        InfoEntry('Description', f.description),
        InfoEntry('Reported by', '${f.reportedBy ?? ''}'),
        InfoEntry('Action taken', '${f.actionTaken ?? ''}'),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Student Faults'),
        bottom: TabBar(controller: _tc, tabs: const [Tab(text: 'Record'), Tab(text: 'History')]),
      ),
      body: TabBarView(controller: _tc, children: [_buildRecord(), _buildHistory()]),
    );
  }

  Widget _buildRecord() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)));
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Record Fault', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _className,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Class', isDense: true),
                items: _classes.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (v) { setState(() => _className = v); _loadClass(); },
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: _studentName,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Student', isDense: true),
                items: _students.map((s) => DropdownMenuItem(value: '${s['student_name'] ?? ''}', child: Text('${s['student_name'] ?? ''}'))).toList(),
                onChanged: (v) => setState(() => _studentName = v),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: _type,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Fault type', isDense: true),
                items: _types.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                onChanged: (v) => setState(() => _type = v ?? _types.first),
              ),
              const SizedBox(height: 10),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'Minor', label: Text('Minor')),
                  ButtonSegment(value: 'Major', label: Text('Major')),
                  ButtonSegment(value: 'Critical', label: Text('Critical')),
                ],
                selected: {_level},
                onSelectionChanged: (v) => setState(() => _level = v.first),
              ),
              const SizedBox(height: 10),
              TextField(controller: _descCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Description / notes', border: OutlineInputBorder())),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.save),
                label: const Text('Record Fault'),
              ),
            ]),
          ),
        ),
        const SizedBox(height: 18),
        Text('History — $_className', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        const SizedBox(height: 8),
        if (_classHistory.isEmpty) const Card(child: Padding(padding: EdgeInsets.all(20), child: Text('No faults recorded for this class.')))
        else ..._classHistory.map((f) => Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: CircleAvatar(child: Text('${f.level.isNotEmpty ? f.level[0] : 'F'}')),
            title: Text('${f.studentName} • ${f.faultType}'),
            subtitle: Text('${f.level} • ${f.date ?? ''}\n${f.description}'),
            isThreeLine: true,
            trailing: const Icon(Icons.info_outline),
            onTap: () => _showFault(f),
          ),
        )),
      ],
    );
  }

  Widget _buildHistory() {
    final list = _filteredHistory;
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Column(children: [
          TextField(
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search by student name or class', isDense: true),
            onChanged: (v) => setState(() => _query = v),
          ),
          const SizedBox(height: 8),
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.10), borderRadius: BorderRadius.circular(20)),
              child: Text('Total faults: ${_allHistory.length}', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 12)),
            ),
            const Spacer(),
            IconButton.filledTonal(onPressed: _loadAllHistory, icon: const Icon(Icons.refresh, size: 18)),
          ]),
        ]),
      ),
      Expanded(
        child: _historyLoading
            ? const Center(child: CircularProgressIndicator())
            : list.isEmpty
                ? const Center(child: Text('No faults found.'))
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    itemCount: list.length,
                    itemBuilder: (context, i) {
                      final f = list[i];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: (f.level == 'Critical' ? AppColors.danger : f.level == 'Major' ? AppColors.warning : AppColors.info).withOpacity(0.12),
                            child: Text('${f.studentName.isNotEmpty ? f.studentName[0] : 'F'}'),
                          ),
                          title: Text('${f.studentName} • ${f.faultType}'),
                          subtitle: Text('${f.className} • ${f.level} • ${f.date ?? ''}\n${f.description}'),
                          isThreeLine: true,
                          trailing: const Icon(Icons.info_outline),
                          onTap: () => _showFault(f),
                        ),
                      );
                    },
                  ),
      ),
    ]);
  }
}
