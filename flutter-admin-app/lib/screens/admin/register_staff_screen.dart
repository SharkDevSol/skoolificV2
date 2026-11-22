import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';

/// Staff registration, mirroring the web /create-register-staff page:
/// pick one of the four staff types, pick a registration form (class table),
/// then fill exactly the columns that /api/staff/columns returns for it.
/// The server generates the username and password, which are shown afterwards.
class RegisterStaffScreen extends StatefulWidget {
  const RegisterStaffScreen({super.key});

  @override
  State<RegisterStaffScreen> createState() => _RegisterStaffScreenState();
}

class _StaffType {
  final String id;
  final String label;
  final String description;
  final IconData icon;
  const _StaffType(this.id, this.label, this.description, this.icon);
}

class _RegisterStaffScreenState extends State<RegisterStaffScreen> {
  static const _types = [
    _StaffType('Supportive Staff', 'Supportive Staff', 'Guards, cleaners, drivers and support workers', Icons.work_outline),
    _StaffType('Administrative Staff', 'Administrative Staff', 'Coordinators, supervisors and office staff', Icons.shield_outlined),
    _StaffType('Teachers', 'Teachers', 'Full-time and part-time teachers', Icons.menu_book_outlined),
    _StaffType('Finance', 'Finance', 'Cashiers, accountants and finance staff', Icons.payments_outlined),
  ];

  static const _standardOptions = <String, List<String>>{
    'gender': ['Male', 'Female'],
    'role': [
      'Teacher', 'Director', 'Coordinator', 'Supervisor', 'Deputy director',
      'Purchaser', 'Cashier', 'Accountant', 'Guard', 'Cleaner',
      'Department Head', 'Counselor', 'Instructor', 'Librarian', 'Nurse',
      'Technician', 'Assistant', 'Manager', 'Trainer', 'Advisor', 'Inspector',
    ],
    'staff_enrollment_type': ['Permanent', 'Contract'],
    'staff_work_time': ['Full Time', 'Part Time'],
  };

  static const _skipColumns = {'id', 'global_staff_id', 'staff_id', 'shift_assignment'};

  String? _type;
  List<String> _forms = [];
  bool _loadingForms = false;
  String _formsError = '';

  String? _form;
  List<Map<String, dynamic>> _columns = [];
  bool _loadingColumns = false;
  String _columnsError = '';
  Map<String, dynamic> _values = {};
  final Map<String, String> _files = {};

  bool _saving = false;
  String _formError = '';
  int _formVersion = 0;

  // Part-time schedule
  List<String> _partDays = [];
  List<String> _partShifts = [];
  Map<String, dynamic> _partOptions = {
    'days': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    'shifts': ['morning', 'afternoon'],
    'default_times': {
      'morning': {'start_time': '07:00', 'end_time': '12:30'},
      'afternoon': {'start_time': '12:30', 'end_time': '17:30'},
    },
  };

  Map<String, dynamic>? _lastResult;
  String _lastName = '';

  @override
  void initState() {
    super.initState();
    _loadPartTimeOptions();
  }

  Future<void> _loadPartTimeOptions() async {
    try {
      final o = await ApiService().getPartTimeOptions();
      if (o.isNotEmpty && mounted) setState(() => _partOptions = o);
    } catch (_) {}
  }

  Future<void> _pickType(String type) async {
    setState(() {
      _type = type;
      _form = null;
      _forms = [];
      _formsError = '';
      _columns = [];
      _values = {};
      _files.clear();
      _lastResult = null;
      _loadingForms = true;
    });
    try {
      final forms = await ApiService().getStaffClasses(type);
      if (!mounted) return;
      setState(() { _forms = forms; _loadingForms = false; });
    } catch (e) {
      if (mounted) setState(() { _formsError = e.toString(); _loadingForms = false; });
    }
  }

  Future<void> _pickForm(String form) async {
    setState(() {
      _form = form;
      _loadingColumns = true;
      _columnsError = '';
      _columns = [];
      _values = {};
      _files.clear();
      _formError = '';
    });
    try {
      final cols = await ApiService().getStaffColumns(_type!, form);
      final values = <String, dynamic>{};
      for (final col in cols) {
        final name = '${col['column_name'] ?? ''}';
        if (name.isEmpty || _skipColumns.contains(name)) continue;
        final dt = '${col['data_type'] ?? ''}';
        if (dt == 'checkbox' || dt == 'boolean') {
          values[name] = false;
        } else if (dt == 'multiple-checkbox') {
          values[name] = <String>[];
        } else if (name == 'staff_work_time') {
          values[name] = 'Full Time';
        } else if (name == 'staff_enrollment_type') {
          values[name] = 'Permanent';
        } else if (name == 'role') {
          values[name] = _type == 'Teachers' ? 'Teacher' : '';
        } else {
          values[name] = '';
        }
      }
      if (!mounted) return;
      setState(() {
        _columns = cols;
        _values = values;
        _loadingColumns = false;
        _partDays = [];
        _partShifts = [];
        _formVersion++;
      });
    } catch (e) {
      if (mounted) setState(() { _columnsError = e.toString(); _loadingColumns = false; });
    }
  }

  void _back() {
    setState(() {
      if (_form != null) {
        _form = null;
        _columns = [];
        _values = {};
        _files.clear();
      } else {
        _type = null;
        _forms = [];
      }
      _formError = '';
    });
  }

  bool _isRequired(Map<String, dynamic> col) {
    final name = '${col['column_name'] ?? ''}';
    if (const ['machine_id', 'global_staff_id', 'staff_id', 'id', 'image_staff', 'phone', 'subject', 'class'].contains(name)) {
      return false;
    }
    return col['is_nullable'] == 'NO' || col['required'] == true;
  }

  String _label(String name) => name
      .split('_')
      .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
      .join(' ');

  List<String> _optionsFor(Map<String, dynamic> col) {
    final name = '${col['column_name'] ?? ''}';
    final raw = col['options'];
    if (raw is List && raw.isNotEmpty) {
      return raw
          .map((o) => o is Map ? '${o['value'] ?? o['label'] ?? ''}' : '$o')
          .where((s) => s.isNotEmpty)
          .toList();
    }
    return _standardOptions[name] ?? const [];
  }

  Future<void> _pickFile(String field) async {
    final file = await FilePicker.pickFile(
      type: field == 'image_staff' ? FileType.image : FileType.any,
    );
    if (file == null) return;
    final path = file.path;
    if (path == null) return;
    final length = await file.length();
    if (length != null && length > 30 * 1024 * 1024) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('File is larger than 30 MB'), backgroundColor: AppColors.danger),
        );
      }
      return;
    }
    setState(() => _files[field] = path);
  }

  List<Map<String, dynamic>> _availabilityForPartTime() {
    final defaults = _partOptions['default_times'] is Map ? _partOptions['default_times'] as Map : const {};
    final list = <Map<String, dynamic>>[];
    for (final day in _partDays) {
      for (final shift in _partShifts) {
        final t = defaults[shift] is Map ? defaults[shift] as Map : const {};
        list.add({
          'day': day,
          'shift': shift,
          'start_time': '${t['start_time'] ?? '07:00'}',
          'end_time': '${t['end_time'] ?? '17:30'}',
          'active': true,
        });
      }
    }
    return list;
  }

  Future<void> _submit() async {
    if (_saving || _form == null || _type == null) return;
    final isPartTime = '${_values['staff_work_time'] ?? ''}' == 'Part Time';
    final isTeacher = _type == 'Teachers' || '${_values['role'] ?? ''}' == 'Teacher';

    // Same required-field checks as the web form.
    for (final name in ['name', 'gender', 'role', 'staff_enrollment_type', 'staff_work_time']) {
      if (_columns.any((c) => '${c['column_name']}' == name) && '${_values[name] ?? ''}'.trim().isEmpty) {
        setState(() => _formError = '${_label(name)} is required');
        return;
      }
    }
    final phone = '${_values['phone'] ?? ''}'.replaceAll(RegExp(r'\D'), '');
    if (phone.isNotEmpty && phone.length < 9) {
      setState(() => _formError = 'Phone must have at least 9 digits');
      return;
    }
    if (isTeacher && isPartTime) {
      if (_partDays.isEmpty || _partShifts.isEmpty) {
        setState(() => _formError = 'Choose the work days and shifts for a part-time teacher');
        return;
      }
    }
    final missingUpload = _columns.any((c) =>
        '${c['data_type']}' == 'upload' && _isRequired(c) && !_files.containsKey('${c['column_name']}'));
    if (missingUpload) {
      setState(() => _formError = 'Please attach every required document');
      return;
    }

    setState(() { _saving = true; _formError = ''; _lastResult = null; });
    try {
      final fields = Map<String, dynamic>.from(_values);
      if (isTeacher && isPartTime) {
        fields['work_days'] = _partDays;
        fields['shifts'] = _partShifts;
        fields['availability'] = _availabilityForPartTime();
        fields['max_hours_per_day'] = 8;
        fields['max_hours_per_week'] = 40;
      }
      final uploadFields = _columns
          .where((c) => '${c['data_type']}' == 'upload')
          .map((c) => '${c['column_name']}')
          .toList();
      final result = await ApiService().addStaff(
        staffType: _type!,
        className: _form!,
        fields: fields,
        uploadFields: uploadFields,
        uploads: Map<String, String>.from(_files),
      );
      if (!mounted) return;
      final name = '${_values['name'] ?? _values['full_name'] ?? ''}';
      setState(() {
        _saving = false;
        _lastName = name;
        _lastResult = result;
      });
      await _showCredentials(result, name);
      if (!mounted) return;
      // Reset values for the next staff member in the same form.
      final reset = <String, dynamic>{};
      for (final col in _columns) {
        final n = '${col['column_name'] ?? ''}';
        if (n.isEmpty || _skipColumns.contains(n)) continue;
        final dt = '${col['data_type'] ?? ''}';
        if (dt == 'checkbox' || dt == 'boolean') {
          reset[n] = false;
        } else if (dt == 'multiple-checkbox') {
          reset[n] = <String>[];
        } else if (n == 'staff_work_time') {
          reset[n] = 'Full Time';
        } else if (n == 'staff_enrollment_type') {
          reset[n] = 'Permanent';
        } else if (n == 'role') {
          reset[n] = _type == 'Teachers' ? 'Teacher' : '';
        } else {
          reset[n] = '';
        }
      }
      setState(() {
        _values = reset;
        _files.clear();
        _partDays = [];
        _partShifts = [];
        _formVersion++;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _saving = false;
          _formError = e is ApiException ? e.message : e.toString();
        });
      }
    }
  }

  Future<void> _showCredentials(Map<String, dynamic> result, String name) async {
    final creds = result['userCredentials'];
    String username = '';
    String password = '';
    String note = '';
    String? credError;
    if (creds is Map) {
      username = '${creds['username'] ?? ''}';
      password = '${creds['password'] ?? ''}';
      note = '${creds['message'] ?? ''}';
      if (creds['error'] != null) credError = '${creds['error']}';
    }
    final teacher = result['teacherData'];
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Staff created'),
        content: SizedBox(
          width: 440,
          child: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name.isEmpty ? 'The staff member was added.' : '$name was added.', style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              if (credError != null)
                Text('Account creation failed: $credError', style: const TextStyle(color: AppColors.danger, fontSize: 12))
              else if (username.isNotEmpty) ...[
                const Text('Login details (auto-generated)', style: TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                _credRow(ctx, 'Username', username),
                _credRow(ctx, 'Password', password),
                if (note.isNotEmpty) Text(note, style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ] else
                const Text('The server did not return login details.', style: TextStyle(fontSize: 12, color: Colors.grey)),
              if (teacher is Map) ...[
                const SizedBox(height: 10),
                Text('Teacher: ${teacher['name'] ?? name} • ${teacher['workTime'] ?? ''}', style: const TextStyle(fontSize: 12, color: AppColors.success)),
              ],
              if (result['schoolSchemaError'] != null) ...[
                const SizedBox(height: 8),
                Text('Teacher table warning: ${result['schoolSchemaError']}', style: const TextStyle(fontSize: 11, color: AppColors.warning)),
              ],
            ]),
          ),
        ),
        actions: [
          FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('Done')),
        ],
      ),
    );
  }

  Widget _credRow(BuildContext ctx, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(children: [
        SizedBox(width: 84, child: Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey))),
        Expanded(child: SelectableText(value, style: const TextStyle(fontWeight: FontWeight.w700))),
        IconButton(
          icon: const Icon(Icons.copy, size: 18),
          tooltip: 'Copy',
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: value));
            if (ctx.mounted) {
              ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('$label copied')));
            }
          },
        ),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_type == null ? 'Register Staff' : 'Register Staff • ${_type!.replaceAll(' Staff', '')}'),
        leading: _type == null
            ? null
            : IconButton(icon: const Icon(Icons.arrow_back), tooltip: 'Back', onPressed: _back),
      ),
      body: _type == null ? _buildTypePicker() : (_form == null ? _buildForms() : _buildForm()),
    );
  }

  Widget _buildTypePicker() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Select Staff Type', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        const Text('Pick the type first, then choose the registration form.', style: TextStyle(fontSize: 12, color: Colors.grey)),
        const SizedBox(height: 12),
        ..._types.map((t) => Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                leading: CircleAvatar(backgroundColor: AppColors.primary.withOpacity(0.12), child: Icon(t.icon, color: AppColors.primary)),
                title: Text(t.label, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text(t.description),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _pickType(t.id),
              ),
            )),
      ],
    );
  }

  Widget _buildForms() {
    if (_loadingForms) return const Center(child: CircularProgressIndicator());
    if (_formsError.isNotEmpty) {
      return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_formsError, textAlign: TextAlign.center)));
    }
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(_type!, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text('${_forms.length} registration form(s)', style: const TextStyle(fontSize: 12, color: Colors.grey)),
        const SizedBox(height: 12),
        if (_forms.isEmpty)
          const Card(child: Padding(padding: EdgeInsets.all(20), child: Text('No forms found for this staff type. Create a registration form on the web first.')))
        else
          ..._forms.map((f) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.folder_open)),
                  title: Text(f.replaceAll('_', ' '), style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Tap to add staff to this form'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _pickForm(f),
                ),
              )),
      ],
    );
  }

  Widget _buildForm() {
    if (_loadingColumns) return const Center(child: CircularProgressIndicator());
    if (_columnsError.isNotEmpty) {
      return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_columnsError, textAlign: TextAlign.center)));
    }
    final fields = <Widget>[];
    for (final col in _columns) {
      final name = '${col['column_name'] ?? ''}';
      if (name.isEmpty || _skipColumns.contains(name)) continue;
      fields.add(Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: _field(col),
      ));
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        Text(_form!.replaceAll('_', ' '), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 2),
        Text('${_type!} • ${_columns.length} fields from the web form', style: const TextStyle(fontSize: 12, color: Colors.grey)),
        const SizedBox(height: 12),
        ...fields,
        if (_lastResult != null) _lastCreatedCard(),
        if (_formError.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.dangerSoft, borderRadius: BorderRadius.circular(10)),
            child: Text(_formError, style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600)),
          ),
        FilledButton.icon(
          onPressed: _saving ? null : _submit,
          icon: _saving
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.person_add),
          label: Text(_saving ? 'Creating...' : 'Create Staff'),
        ),
        const SizedBox(height: 8),
        const Text(
          'The username and password are generated automatically by the server and shown after saving.',
          style: TextStyle(fontSize: 11, color: Colors.grey),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _lastCreatedCard() {
    final creds = _lastResult?['userCredentials'];
    final username = creds is Map ? '${creds['username'] ?? ''}' : '';
    final password = creds is Map ? '${creds['password'] ?? ''}' : '';
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: AppColors.successSoft,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Last created: ${_lastName.isEmpty ? 'staff' : _lastName}', style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.success)),
          if (username.isNotEmpty)
            SelectableText('Username: $username\nPassword: $password', style: const TextStyle(fontSize: 12)),
        ]),
      ),
    );
  }

  Widget _field(Map<String, dynamic> col) {
    final name = '${col['column_name'] ?? ''}';
    final dt = '${col['data_type'] ?? ''}';
    final label = _label(name);
    final required = _isRequired(col);
    final requiredMark = required ? ' *' : '';

    if (dt == 'upload' || name == 'image_staff') {
      final picked = _files[name];
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('$label$requiredMark', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.grey)),
        const SizedBox(height: 6),
        Row(children: [
          OutlinedButton.icon(
            onPressed: () => _pickFile(name),
            icon: const Icon(Icons.upload_file, size: 18),
            label: Text(picked == null ? 'Choose file' : 'Change file'),
          ),
          const SizedBox(width: 8),
          if (picked != null)
            Expanded(child: Text(picked.split(RegExp(r'[\\/]')).last, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12))),
        ]),
        const SizedBox(height: 2),
        Text(
          name == 'image_staff'
              ? 'Staff photo (JPEG, PNG), max 30 MB'
              : 'PDF, Word, Excel, PowerPoint, JPG or PNG, max 30 MB',
          style: const TextStyle(fontSize: 10, color: Colors.grey),
        ),
      ]);
    }

    if (name == 'machine_id') {
      return TextFormField(
        readOnly: true,
        initialValue: 'Auto-generated on submit',
        decoration: const InputDecoration(labelText: 'Machine ID', helperText: '6-digit unique ID, auto-assigned'),
      );
    }

    if (name == 'staff_work_time') {
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        DropdownButtonFormField<String>(
          value: ['Full Time', 'Part Time'].contains('${_values[name]}') ? '${_values[name]}' : 'Full Time',
          decoration: InputDecoration(labelText: '$label$requiredMark'),
          items: const [
            DropdownMenuItem(value: 'Full Time', child: Text('Full Time')),
            DropdownMenuItem(value: 'Part Time', child: Text('Part Time')),
          ],
          onChanged: (v) => setState(() => _values[name] = v ?? 'Full Time'),
        ),
        if ('${_values[name]}' == 'Part Time' && (_type == 'Teachers' || '${_values['role']}' == 'Teacher'))
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: _partTimePicker(),
          ),
      ]);
    }

    if (dt == 'checkbox' || dt == 'boolean') {
      return SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(label),
        value: _values[name] == true,
        onChanged: (v) => setState(() => _values[name] = v),
      );
    }

    if (dt == 'multiple-checkbox') {
      final options = _optionsFor(col);
      final selected = (_values[name] is List ? _values[name] as List : const []).map((e) => '$e').toList();
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('$label$requiredMark', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.grey)),
        const SizedBox(height: 6),
        Wrap(spacing: 6, runSpacing: 6, children: options.map((o) {
          final on = selected.contains(o);
          return FilterChip(
            label: Text(o),
            selected: on,
            onSelected: (v) => setState(() {
              final list = [...selected];
              if (v) {
                list.add(o);
              } else {
                list.remove(o);
              }
              _values[name] = list;
            }),
          );
        }).toList()),
      ]);
    }

    final options = _optionsFor(col);
    if (dt == 'select' || options.isNotEmpty) {
      final current = '${_values[name] ?? ''}';
      return DropdownButtonFormField<String>(
        value: options.contains(current) ? current : null,
        decoration: InputDecoration(labelText: '$label$requiredMark'),
        items: options.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
        onChanged: (v) => setState(() => _values[name] = v ?? ''),
        validator: required ? (v) => (v == null || v.isEmpty) ? 'Required' : null : null,
      );
    }

    if (dt == 'textarea') {
      return TextFormField(
        key: ValueKey('$name-$_formVersion'),
        initialValue: '${_values[name] ?? ''}',
        maxLines: 3,
        decoration: InputDecoration(labelText: '$label$requiredMark', alignLabelWithHint: true),
        onChanged: (v) => _values[name] = v,
      );
    }

    if (dt == 'date') {
      final current = '${_values[name] ?? ''}';
      return TextFormField(
        key: ValueKey('$name-$_formVersion'),
        readOnly: true,
        controller: TextEditingController(text: current),
        decoration: InputDecoration(labelText: '$label$requiredMark', suffixIcon: const Icon(Icons.calendar_today, size: 18)),
        onTap: () async {
          final now = DateTime.now();
          final picked = await showDatePicker(
            context: context,
            initialDate: DateTime.tryParse(current) ?? now,
            firstDate: DateTime(1950),
            lastDate: DateTime(now.year + 10),
          );
          if (picked != null) {
            setState(() {
              _values[name] =
                  '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
            });
          }
        },
      );
    }

    final numeric = dt == 'integer' || dt == 'numeric' || dt == 'number';
    return TextFormField(
      key: ValueKey('$name-$_formVersion'),
      initialValue: '${_values[name] ?? ''}',
      keyboardType: name == 'phone'
          ? TextInputType.phone
          : (numeric ? TextInputType.number : TextInputType.text),
      inputFormatters: numeric ? [FilteringTextInputFormatter.digitsOnly] : null,
      decoration: InputDecoration(
        labelText: '$label$requiredMark',
        helperText: name == 'phone' ? 'At least 9 digits, e.g. 0911234567' : null,
      ),
      onChanged: (v) => _values[name] = v,
      validator: required ? (v) => (v == null || v.trim().isEmpty) ? 'Required' : null : null,
    );
  }

  Widget _partTimePicker() {
    final days = (_partOptions['days'] is List ? _partOptions['days'] as List : const []).map((e) => '$e').toList();
    final shifts = (_partOptions['shifts'] is List ? _partOptions['shifts'] as List : const []).map((e) => '$e').toList();
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.05), borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Part-time schedule (required)', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
        const SizedBox(height: 6),
        Wrap(spacing: 6, runSpacing: 4, children: days.map((d) {
          final on = _partDays.contains(d);
          return FilterChip(
            label: Text(d),
            selected: on,
            onSelected: (v) => setState(() {
              if (v) {
                _partDays.add(d);
              } else {
                _partDays.remove(d);
              }
            }),
          );
        }).toList()),
        const SizedBox(height: 6),
        Wrap(spacing: 6, runSpacing: 4, children: shifts.map((s) {
          final on = _partShifts.contains(s);
          return FilterChip(
            label: Text('${s[0].toUpperCase()}${s.substring(1)}'),
            selected: on,
            onSelected: (v) => setState(() {
              if (v) {
                _partShifts.add(s);
              } else {
                _partShifts.remove(s);
              }
            }),
          );
        }).toList()),
      ]),
    );
  }
}
