import 'package:flutter/material.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';

/// Mirrors the web /create-mark-list Subject Setup:
/// Tab 1 Subject Configuration (add / edit / remove subjects)
/// Tab 2 Class-Subject Mapping (add / remove subject per class)
/// Existing mark tables and forms are not touched.
class SubjectSetupScreen extends StatefulWidget {
  const SubjectSetupScreen({super.key});

  @override
  State<SubjectSetupScreen> createState() => _SubjectSetupScreenState();
}

class _SubjectSetupScreenState extends State<SubjectSetupScreen> with SingleTickerProviderStateMixin {
  late final TabController _tc;

  List<Map<String, dynamic>> _subjects = [];
  bool _loadingSubjects = true;
  String _subjectsError = '';
  final _newSubject = TextEditingController();
  bool _adding = false;

  List<String> _classes = [];
  Set<String> _mappings = {};
  bool _loadingMapping = true;
  String _mappingError = '';
  bool _savingMapping = false;

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 2, vsync: this);
    _tc.addListener(() {
      if (!_tc.indexIsChanging) setState(() {});
    });
    _loadSubjects();
    _loadMapping();
  }

  @override
  void dispose() {
    _tc.dispose();
    _newSubject.dispose();
    super.dispose();
  }

  Future<void> _loadSubjects() async {
    setState(() { _loadingSubjects = true; _subjectsError = ''; });
    try {
      final list = await ApiService().getMarkSubjects();
      if (!mounted) return;
      setState(() { _subjects = list; _loadingSubjects = false; });
    } catch (e) {
      if (mounted) setState(() { _subjectsError = e.toString(); _loadingSubjects = false; });
    }
  }

  Future<void> _loadMapping() async {
    setState(() { _loadingMapping = true; _mappingError = ''; });
    try {
      final results = await Future.wait([
        ApiService().getMarkClasses(),
        ApiService().getMarkSubjects(),
        ApiService().getSubjectsClasses(),
      ]);
      final classes = (results[0] as List).map((e) => '$e').toList();
      final subjects = (results[1] as List).cast<Map<String, dynamic>>();
      final rows = (results[2] as List).cast<Map<String, dynamic>>();
      final set = <String>{};
      for (final r in rows) {
        final cls = '${r['class_name'] ?? r['className'] ?? ''}'.trim();
        final sub = '${r['subject_name'] ?? r['subjectName'] ?? ''}'.trim();
        if (cls.isEmpty || sub.isEmpty) continue;
        set.add('$cls||$sub');
      }
      if (!mounted) return;
      setState(() {
        _classes = classes;
        _subjects = subjects;
        _mappings = set;
        _loadingSubjects = false;
        _loadingMapping = false;
      });
    } catch (e) {
      if (mounted) setState(() { _mappingError = e.toString(); _loadingMapping = false; });
    }
  }

  Future<void> _addSubject() async {
    final name = _newSubject.text.trim();
    if (name.isEmpty || _adding) return;
    setState(() => _adding = true);
    final err = await ApiService().addMarkSubject(name);
    if (!mounted) return;
    setState(() => _adding = false);
    if (err == null) {
      _newSubject.clear();
      await _loadSubjects();
      await _loadMapping();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Subject added'), backgroundColor: AppColors.success));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: AppColors.danger));
    }
  }

  Future<void> _editSubject(Map<String, dynamic> s) async {
    final id = int.tryParse('${s['id']}');
    if (id == null) return;
    final ctrl = TextEditingController(text: '${s['subject_name'] ?? ''}');
    bool saving = false;
    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
        return AlertDialog(
          title: const Text('Edit subject'),
          content: TextField(
            controller: ctrl,
            autofocus: true,
            decoration: const InputDecoration(labelText: 'Subject name'),
          ),
          actions: [
            TextButton(onPressed: saving ? null : () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: saving
                  ? null
                  : () async {
                      final name = ctrl.text.trim();
                      if (name.isEmpty) return;
                      setSheet(() => saving = true);
                      final err = await ApiService().updateMarkSubject(id, name);
                      if (!ctx.mounted) return;
                      setSheet(() => saving = false);
                      if (err == null) {
                        Navigator.pop(ctx);
                        if (!mounted) return;
                        await _loadSubjects();
                        await _loadMapping();
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Subject updated'), backgroundColor: AppColors.success));
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: AppColors.danger));
                      }
                    },
              child: saving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Save'),
            ),
          ],
        );
      }),
    );
  }

  Future<void> _deleteSubject(Map<String, dynamic> s) async {
    final id = int.tryParse('${s['id']}');
    if (id == null) return;
    final name = '${s['subject_name'] ?? 'this subject'}';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove subject?'),
        content: Text('Delete "$name"? This cannot be undone. Existing class mappings for it are left alone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final err = await ApiService().deleteMarkSubject(id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(err ?? 'Subject deleted'),
      backgroundColor: err == null ? AppColors.success : AppColors.danger,
    ));
    if (err == null) {
      await _loadSubjects();
      await _loadMapping();
    }
  }

  List<String> _mappedFor(String cls) => _mappings
      .where((k) => k.startsWith('$cls||'))
      .map((k) => k.substring(cls.length + 2))
      .toList()
    ..sort();

  void _toggleMapping(String cls, String subject, bool on) {
    setState(() {
      final key = '$cls||$subject';
      if (on) {
        _mappings.add(key);
      } else {
        _mappings.remove(key);
      }
    });
  }

  Future<void> _saveMappings() async {
    setState(() => _savingMapping = true);
    final list = _mappings.map((k) {
      final i = k.indexOf('||');
      return {'className': k.substring(0, i), 'subjectName': k.substring(i + 2)};
    }).toList();
    final err = await ApiService().mapSubjectsClasses(list);
    if (!mounted) return;
    setState(() => _savingMapping = false);
    if (err == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Class-subject mappings saved'), backgroundColor: AppColors.success));
      await _loadMapping();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: AppColors.danger));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Subject Setup'),
        bottom: TabBar(
          controller: _tc,
          tabs: const [
            Tab(text: 'Subject Configuration'),
            Tab(text: 'Class-Subject Mapping'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tc,
        children: [_buildSubjects(), _buildMapping()],
      ),
      bottomNavigationBar: _tc.index == 1
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: FilledButton.icon(
                  onPressed: _savingMapping ? null : _saveMappings,
                  icon: _savingMapping
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.save),
                  label: Text(_savingMapping ? 'Saving...' : 'Save Mappings'),
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildSubjects() {
    if (_loadingSubjects) return const Center(child: CircularProgressIndicator());
    if (_subjectsError.isNotEmpty) {
      return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_subjectsError, textAlign: TextAlign.center)));
    }
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Row(children: [
          Expanded(
            child: TextField(
              controller: _newSubject,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _addSubject(),
              decoration: const InputDecoration(labelText: 'New subject name', isDense: true),
            ),
          ),
          const SizedBox(width: 8),
          FilledButton.icon(
            onPressed: _adding ? null : _addSubject,
            icon: _adding
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.add),
            label: const Text('Add'),
          ),
        ]),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.10), borderRadius: BorderRadius.circular(20)),
            child: Text('${_subjects.length} subjects', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 12)),
          ),
          const Spacer(),
          TextButton.icon(onPressed: _loadSubjects, icon: const Icon(Icons.refresh, size: 18), label: const Text('Refresh')),
        ]),
      ),
      Expanded(
        child: _subjects.isEmpty
            ? const Center(child: Text('No subjects configured yet.'))
            : ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                itemCount: _subjects.length,
                itemBuilder: (context, i) {
                  final s = _subjects[i];
                  final name = '${s['subject_name'] ?? ''}';
                  return Card(
                    margin: const EdgeInsets.only(bottom: 6),
                    child: ListTile(
                      dense: true,
                      leading: CircleAvatar(
                        radius: 16,
                        backgroundColor: AppColors.primary.withOpacity(0.10),
                        child: Text('${i + 1}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.primary)),
                      ),
                      title: Text(name),
                      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                        IconButton(icon: const Icon(Icons.edit_outlined), tooltip: 'Edit', onPressed: () => _editSubject(s)),
                        IconButton(icon: const Icon(Icons.delete_outline, color: AppColors.danger), tooltip: 'Delete', onPressed: () => _deleteSubject(s)),
                      ]),
                    ),
                  );
                },
              ),
      ),
    ]);
  }

  Widget _buildMapping() {
    if (_loadingMapping) return const Center(child: CircularProgressIndicator());
    if (_mappingError.isNotEmpty) {
      return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_mappingError, textAlign: TextAlign.center)));
    }
    if (_classes.isEmpty) {
      return const Center(child: Text('No classes found.'));
    }
    if (_subjects.isEmpty) {
      return const Center(child: Text('No subjects found. Add subjects first.'));
    }
    final allSubjects = _subjects.map((s) => '${s['subject_name'] ?? ''}').where((s) => s.isNotEmpty).toList()..sort();
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
      children: [
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(color: AppColors.info.withOpacity(0.10), borderRadius: BorderRadius.circular(20)),
            child: Text('${_classes.length} classes • ${_mappings.length} mappings', style: const TextStyle(color: AppColors.info, fontWeight: FontWeight.w800, fontSize: 12)),
          ),
          const Spacer(),
          TextButton.icon(onPressed: _loadMapping, icon: const Icon(Icons.refresh, size: 18), label: const Text('Refresh')),
        ]),
        const SizedBox(height: 4),
        ..._classes.map((cls) {
          final mapped = _mappedFor(cls);
          final remaining = allSubjects.where((s) => !mapped.contains(s)).toList();
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(cls, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15))),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.10), borderRadius: BorderRadius.circular(12)),
                    child: Text('${mapped.length}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.primary)),
                  ),
                ]),
                const SizedBox(height: 8),
                if (mapped.isEmpty)
                  const Text('No subjects assigned', style: TextStyle(fontSize: 12, color: Colors.grey))
                else
                  Wrap(spacing: 6, runSpacing: 6, children: mapped.map((sub) => Chip(
                    label: Text(sub),
                    visualDensity: VisualDensity.compact,
                    onDeleted: () => _toggleMapping(cls, sub, false),
                    deleteIcon: const Icon(Icons.close, size: 16),
                  )).toList()),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: null,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Add subject to this class', isDense: true),
                  items: remaining.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                  onChanged: remaining.isEmpty ? null : (v) {
                    if (v != null) _toggleMapping(cls, v, true);
                  },
                ),
              ]),
            ),
          );
        }),
      ],
    );
  }
}
