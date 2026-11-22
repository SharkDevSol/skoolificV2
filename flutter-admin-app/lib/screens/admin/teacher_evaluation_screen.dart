import 'package:flutter/material.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/info_dialog.dart';

class TeacherEvaluationScreen extends StatefulWidget {
  const TeacherEvaluationScreen({super.key});
  @override
  State<TeacherEvaluationScreen> createState() => _TeacherEvaluationScreenState();
}

class _TeacherEvaluationScreenState extends State<TeacherEvaluationScreen> with SingleTickerProviderStateMixin {
  late final TabController _tc;
  List<Map<String, dynamic>> _forms = [];
  List<Map<String, dynamic>> _submissions = [];
  List<Map<String, dynamic>> _staff = [];
  bool _loading = true;
  String? _error;

  static const _types = ['text', 'textarea', 'number', 'date', 'dropdown', 'multi_select', 'checkbox', 'rating'];
  static const _typeLabels = {
    'text': 'Short text', 'textarea': 'Paragraph', 'number': 'Number', 'date': 'Date',
    'dropdown': 'Dropdown (multi-option)', 'multi_select': 'Multi-select', 'checkbox': 'Checkbox (Yes / No)', 'rating': 'Rating (configurable)',
  };

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() { _tc.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final forms = await ApiService().getEvaluationForms();
      final subs = await ApiService().getEvaluationSubmissions();
      final staff = <Map<String, dynamic>>[];
      final seen = <String>{};
      for (final type in ['Teachers', 'Administrative Staff', 'Supportive Staff']) {
        final classes = await ApiService().getStaffClasses(type);
        for (final cls in classes) {
          try {
            final rows = await ApiService().getStaffData(type, cls);
            for (final r in rows) {
              final id = '${r['global_staff_id'] ?? r['staff_id'] ?? r['id'] ?? ''}';
              final key = id.isNotEmpty ? id : '${r['full_name'] ?? r['name']}';
              if (seen.add(key)) { r['class_name'] = r['class_name'] ?? cls; staff.add(r); }
            }
          } catch (_) {}
        }
      }
      if (!mounted) return;
      setState(() { _forms = forms; _submissions = subs; _staff = staff; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _builder([Map<String, dynamic>? form]) async {
    final nameCtrl = TextEditingController(text: '${form?['name'] ?? ''}');
    final fields = <Map<String, dynamic>>[];
    final raw = form?['fields'];
    if (raw is List) {
      for (final f in raw) {
        if (f is Map) {
          final copy = Map<String, dynamic>.from(f);
          if (copy['options'] is! List) copy['options'] = <String>[];
          fields.add(copy);
        }
      }
    }
    bool saving = false;

    await showDialog(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
      return AlertDialog(
        title: Text(form == null ? 'Create Evaluation Form' : 'Edit Evaluation Form'),
        content: SizedBox(width: 640, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Form name')),
          const SizedBox(height: 12),
          ...fields.asMap().entries.map((e) {
            final i = e.key;
            final f = e.value;
            final type = _types.contains('${f['type']}') ? '${f['type']}' : 'text';
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: TextFormField(
                      initialValue: '${f['label'] ?? ''}',
                      decoration: const InputDecoration(labelText: 'Field label', isDense: true),
                      onChanged: (v) => f['label'] = v,
                    )),
                    IconButton(icon: const Icon(Icons.delete_outline), onPressed: () => setSheet(() => fields.removeAt(i))),
                  ]),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: type,
                    decoration: const InputDecoration(labelText: 'Field type', isDense: true),
                    items: _types.map((t) => DropdownMenuItem(value: t, child: Text(_typeLabels[t] ?? t))).toList(),
                    onChanged: (v) => setSheet(() => f['type'] = v ?? 'text'),
                  ),
                  if (type == 'dropdown' || type == 'multi_select') ...[
                    const SizedBox(height: 8),
                    _OptionEditor(
                      options: (f['options'] as List?)?.map((e) => '$e').toList() ?? [],
                      onChanged: (list) => f['options'] = list,
                    ),
                  ],
                  if (type == 'rating') ...[
                    const SizedBox(height: 8),
                    Row(children: [
                      Expanded(child: DropdownButtonFormField<String>(
                        value: '${f['rating_scale'] ?? 'numeric'}',
                        decoration: const InputDecoration(labelText: 'Rating scale', isDense: true),
                        items: const [
                          DropdownMenuItem(value: 'numeric', child: Text('Numbers 1–N')),
                          DropdownMenuItem(value: 'letter', child: Text('Letters A–F')),
                          DropdownMenuItem(value: 'letter_plus', child: Text('Letters A+ … A- … F')),
                        ],
                        onChanged: (v) => setSheet(() => f['rating_scale'] = v ?? 'numeric'),
                      )),
                      const SizedBox(width: 8),
                      if ('${f['rating_scale'] ?? 'numeric'}' == 'numeric')
                        SizedBox(
                          width: 110,
                          child: DropdownButtonFormField<int>(
                            value: int.tryParse('${f['rating_max'] ?? 5}')?.clamp(2, 20) ?? 5,
                            decoration: const InputDecoration(labelText: 'Max', isDense: true),
                            items: List.generate(19, (i) => DropdownMenuItem(value: i + 2, child: Text('${i + 2}'))),
                            onChanged: (v) => setSheet(() => f['rating_max'] = v ?? 5),
                          ),
                        ),
                    ]),
                  ],
                  if (type == 'checkbox')
                    const Padding(
                      padding: EdgeInsets.only(top: 6),
                      child: Text('Checkbox field: the evaluator ticks or unticks it.', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    ),
                ]),
              ),
            );
          }),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () => setSheet(() => fields.add({
              'label': 'New field',
              'name': 'field_${DateTime.now().millisecondsSinceEpoch}',
              'type': 'text',
              'options': <String>[],
              'rating_scale': 'numeric',
              'rating_max': 5,
            })),
            icon: const Icon(Icons.add),
            label: const Text('Add Field'),
          ),
        ]))),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: saving ? null : () async {
              if (nameCtrl.text.trim().isEmpty) return;
              setSheet(() => saving = true);
              final err = await ApiService().saveEvaluationForm(
                id: form == null ? null : int.tryParse('${form['id']}'),
                name: nameCtrl.text.trim(),
                fields: fields,
              );
              setSheet(() => saving = false);
              if (!ctx.mounted) return;
              if (err == null) { Navigator.pop(ctx); await _load(); }
              else ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: AppColors.danger));
            },
            child: saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save Form'),
          ),
        ],
      );
    }));
  }

  List<String> _ratingOptions(Map<String, dynamic> f) {
    final scale = '${f['rating_scale'] ?? 'numeric'}';
    if (scale == 'letter') return ['A', 'B', 'C', 'D', 'F'];
    if (scale == 'letter_plus') return ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
    final max = (int.tryParse('${f['rating_max'] ?? 5}') ?? 5).clamp(2, 20);
    return List.generate(max, (i) => '${i + 1}');
  }

  Future<void> _useForm(Map<String, dynamic> form) async {
    final fields = form['fields'] is List ? (form['fields'] as List) : [];
    final values = <String, dynamic>{};
    int? staffIndex;
    final noteCtrl = TextEditingController();
    bool saving = false;
    await showDialog(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
      return AlertDialog(
        title: Text('${form['name'] ?? 'Evaluation'}'),
        content: SizedBox(width: 640, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          DropdownButtonFormField<int>(
            value: staffIndex,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Teacher'),
            items: _staff.asMap().entries.map((e) => DropdownMenuItem(value: e.key, child: Text('${e.value['full_name'] ?? e.value['name'] ?? ''}'))).toList(),
            onChanged: (v) => setSheet(() => staffIndex = v),
          ),
          const SizedBox(height: 6),
          Text('Date: ${DateTime.now().toIso8601String().split('T').first}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
          const SizedBox(height: 10),
          ...fields.map((raw) {
            final f = Map<String, dynamic>.from(raw as Map);
            final key = '${f['name'] ?? f['label'] ?? ''}';
            final label = '${f['label'] ?? key}';
            final type = '${f['type'] ?? 'text'}';
            switch (type) {
              case 'number':
                return Padding(padding: const EdgeInsets.only(bottom: 8), child: TextField(keyboardType: TextInputType.number, decoration: InputDecoration(labelText: label, isDense: true), onChanged: (v) => values[key] = v));
              case 'rating':
                final opts = _ratingOptions(f);
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: DropdownButtonFormField<String>(
                    value: values[key] is String && opts.contains(values[key]) ? values[key] as String : null,
                    decoration: InputDecoration(labelText: '$label (${'${f['rating_scale'] ?? 'numeric'}' == 'numeric' ? '1–${opts.length}' : 'grade scale'})', isDense: true),
                    items: opts.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
                    onChanged: (v) => setSheet(() => values[key] = v),
                  ),
                );
              case 'checkbox':
                return CheckboxListTile(dense: true, contentPadding: EdgeInsets.zero, title: Text(label), value: values[key] == true, onChanged: (v) => setSheet(() => values[key] = v));
              case 'dropdown':
                final opts = (f['options'] is List) ? (f['options'] as List).map((e) => '$e').toList() : <String>[];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: DropdownButtonFormField<String>(
                    value: values[key] is String && opts.contains(values[key]) ? values[key] as String : null,
                    decoration: InputDecoration(labelText: label, isDense: true),
                    items: opts.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
                    onChanged: (v) => setSheet(() => values[key] = v),
                  ),
                );
              case 'multi_select':
                final opts = (f['options'] is List) ? (f['options'] as List).map((e) => '$e').toList() : <String>[];
                final selected = (values[key] is List) ? List<String>.from(values[key] as List) : <String>[];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                    Wrap(spacing: 6, runSpacing: 4, children: opts.map((o) => FilterChip(
                      label: Text(o),
                      selected: selected.contains(o),
                      onSelected: (v) { setSheet(() { if (v) selected.add(o); else selected.remove(o); values[key] = List<String>.from(selected); }); },
                    )).toList()),
                  ]),
                );
              case 'textarea':
                return Padding(padding: const EdgeInsets.only(bottom: 8), child: TextField(maxLines: 3, decoration: InputDecoration(labelText: label, isDense: true), onChanged: (v) => values[key] = v));
              default:
                return Padding(padding: const EdgeInsets.only(bottom: 8), child: TextField(decoration: InputDecoration(labelText: label, isDense: true), onChanged: (v) => values[key] = v));
            }
          }),
          const SizedBox(height: 8),
          TextField(controller: noteCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Note (optional)', isDense: true)),
        ]))),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: saving ? null : () async {
              if (staffIndex == null) return;
              setSheet(() => saving = true);
              final s = _staff[staffIndex!];
              final err = await ApiService().submitEvaluation(
                formId: int.tryParse('${form['id']}') ?? 0,
                teacherId: '${s['global_staff_id'] ?? s['staff_id'] ?? s['id'] ?? ''}',
                teacherName: '${s['full_name'] ?? s['name'] ?? ''}',
                date: DateTime.now().toIso8601String().split('T').first,
                note: noteCtrl.text.trim(),
                data: values,
              );
              setSheet(() => saving = false);
              if (!ctx.mounted) return;
              if (err == null) { Navigator.pop(ctx); await _load(); }
              else ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: AppColors.danger));
            },
            child: saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save Evaluation'),
          ),
        ],
      );
    }));
  }

  Map<String, dynamic>? _formById(dynamic id) {
    for (final f in _forms) {
      if ('${f['id']}' == '$id') return f;
    }
    return null;
  }

  void _showSubmission(Map<String, dynamic> s) {
    final form = _formById(s['form_id']);
    final fields = (form?['fields'] is List) ? (form!['fields'] as List) : const [];
    final data = s['data'] is Map ? Map<String, dynamic>.from(s['data'] as Map) : <String, dynamic>{};
    final entries = <InfoEntry>[
      InfoEntry('Teacher', '${s['teacher_name'] ?? ''}'),
      InfoEntry('Form', '${s['form_name'] ?? form?['name'] ?? ''}'),
      InfoEntry('Date', '${s['evaluation_date'] ?? ''}'),
      InfoEntry('Created by', '${s['created_by'] ?? ''}'),
      InfoEntry('Note', '${s['note'] ?? ''}'),
    ];
    for (final raw in fields) {
      final f = Map<String, dynamic>.from(raw as Map);
      final key = '${f['name'] ?? f['label'] ?? ''}';
      final value = data[key];
      final text = value is List ? value.join(', ') : value == true ? 'Yes' : value == false ? 'No' : '${value ?? ''}';
      entries.add(InfoEntry('${f['label'] ?? key}', text));
    }
    if (fields.isEmpty) {
      data.forEach((k, v) => entries.add(InfoEntry(k, v is List ? v.join(', ') : '$v')));
    }
    showInfoSheet(
      context,
      title: '${s['teacher_name'] ?? 'Evaluation'}',
      subtitle: '${s['form_name'] ?? form?['name'] ?? ''} • ${s['evaluation_date'] ?? ''}',
      entries: entries,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Teacher Evaluation'),
        actions: [IconButton(icon: const Icon(Icons.add), tooltip: 'Create form', onPressed: () => _builder())],
        bottom: TabBar(controller: _tc, tabs: const [Tab(text: 'Forms'), Tab(text: 'History')]),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
              : TabBarView(controller: _tc, children: [
                  ListView(padding: const EdgeInsets.all(16), children: [
                    if (_forms.isEmpty) const Card(child: Padding(padding: EdgeInsets.all(20), child: Text('No evaluation forms yet. Tap + to create one.')))
                    else ..._forms.map((f) => Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text('${f['name'] ?? ''}'),
                        subtitle: Text('${(f['fields'] is List) ? (f['fields'] as List).length : 0} fields'),
                        trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                          IconButton(icon: const Icon(Icons.play_arrow), tooltip: 'Use form', onPressed: () => _useForm(f)),
                          IconButton(icon: const Icon(Icons.edit), tooltip: 'Edit', onPressed: () => _builder(f)),
                          IconButton(icon: const Icon(Icons.delete_outline), tooltip: 'Delete', onPressed: () async { await ApiService().deleteEvaluationForm(int.tryParse('${f['id']}') ?? 0); await _load(); }),
                        ]),
                      ),
                    )),
                  ]),
                  ListView(padding: const EdgeInsets.all(16), children: [
                    if (_submissions.isEmpty) const Card(child: Padding(padding: EdgeInsets.all(20), child: Text('No evaluations saved yet.')))
                    else ..._submissions.map((s) => Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text('${s['teacher_name'] ?? ''}'),
                        subtitle: Text('${s['form_name'] ?? ''}\n${s['evaluation_date'] ?? ''} • ${s['created_by'] ?? ''}\n${s['note'] ?? ''}'),
                        isThreeLine: true,
                        trailing: const Icon(Icons.info_outline),
                        onTap: () => _showSubmission(s),
                      ),
                    )),
                  ]),
                ]),
    );
  }
}

class _OptionEditor extends StatefulWidget {
  final List<String> options;
  final ValueChanged<List<String>> onChanged;
  const _OptionEditor({required this.options, required this.onChanged});
  @override
  State<_OptionEditor> createState() => _OptionEditorState();
}

class _OptionEditorState extends State<_OptionEditor> {
  final List<String> _options = [];
  final _ctrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _options.addAll(widget.options);
  }

  void _add() {
    final value = _ctrl.text.trim();
    if (value.isEmpty) return;
    setState(() => _options.add(value));
    _ctrl.clear();
    widget.onChanged(_options);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Options (add as many as you need)', style: TextStyle(fontSize: 11, color: Colors.grey)),
      const SizedBox(height: 4),
      if (_options.isNotEmpty)
        Wrap(spacing: 6, runSpacing: 4, children: _options.map((o) => Chip(
          label: Text(o, style: const TextStyle(fontSize: 11)),
          onDeleted: () {
            setState(() => _options.remove(o));
            widget.onChanged(_options);
          },
          deleteIcon: const Icon(Icons.close, size: 14),
          visualDensity: VisualDensity.compact,
        )).toList()),
      Row(children: [
        Expanded(child: TextField(
          controller: _ctrl,
          decoration: const InputDecoration(hintText: 'Type an option and press +', isDense: true),
          onSubmitted: (_) => _add(),
        )),
        IconButton.filledTonal(onPressed: _add, icon: const Icon(Icons.add)),
      ]),
    ]);
  }
}
