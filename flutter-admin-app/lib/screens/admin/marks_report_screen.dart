import 'package:flutter/material.dart';
import '../../core/services/api_service.dart';
import 'marks_report_view.dart';

class MarksReportScreen extends StatefulWidget {
  const MarksReportScreen({super.key});
  @override
  State<MarksReportScreen> createState() => _MarksReportScreenState();
}

class _MarksReportScreenState extends State<MarksReportScreen> {
  bool _loading = true;
  String? _error;
  List<String> _classes = [];
  List<Map<String, dynamic>> _subjectClasses = [];
  int _termCount = 2;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final subjectClasses = await ApiService().getSubjectsClasses();
      final config = await ApiService().getMarkConfig();
      final termCount = (int.tryParse('${config['term_count'] ?? config['terms'] ?? 2}') ?? 2).clamp(1, 6);
      final classes = <String>{};
      for (final row in subjectClasses) {
        final c = row['class_name']?.toString() ?? '';
        if (c.isNotEmpty) classes.add(c);
      }
      final sorted = classes.toList()..sort();
      if (!mounted) return;
      setState(() {
        _classes = sorted;
        _subjectClasses = subjectClasses;
        _termCount = termCount;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mark List Report')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
              : MarksReportView(classes: _classes, subjectClasses: _subjectClasses, termCount: _termCount),
    );
  }
}
