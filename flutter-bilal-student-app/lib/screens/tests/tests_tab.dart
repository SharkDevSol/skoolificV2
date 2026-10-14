import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../app/app_provider.dart';
import '../../widgets/app_widgets.dart';
import '../../models/models.dart';
import '../../core/l10n/app_localizations.dart';

class TestsTab extends StatefulWidget {
  const TestsTab({super.key});

  @override
  State<TestsTab> createState() => _TestsTabState();
}

class _TestsTabState extends State<TestsTab> {
  List<Map<String, dynamic>> _tests = [];
  List<Map<String, dynamic>> _results = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    final app = Provider.of<AppProvider>(context, listen: false);
    if (app.user == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    final username = app.user!.username;
    final className = app.user!.className ?? '';
    try {
      final tests = await ApiService().aiStudentTests(username, className);
      final results = await ApiService().aiStudentResults(username);
      if (mounted) {
        setState(() {
          _tests = tests;
          _results = results;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return RefreshIndicator(
      onRefresh: _fetch,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        children: [
          if (_loading)
            const Padding(padding: EdgeInsets.only(top: 32), child: SkeletonCard(height: 200))
          else if (_results.isNotEmpty) ...[
            Text(
              'Results',
              style: theme.textTheme.titleLarge?.copyWith(fontSize: 18, color: theme.primaryColor),
            ),
            const SizedBox(height: 12),
            ..._results.map((r) => _ResultCard(result: r, onTap: () => _openResult(r))),
            const SizedBox(height: 24),
          ],
          if (_tests.isNotEmpty) ...[
            Text(
              'Available Tests',
              style: theme.textTheme.titleLarge?.copyWith(fontSize: 18, color: theme.primaryColor),
            ),
            const SizedBox(height: 12),
            ..._tests.map((t) => _TestCard(test: t)),
          ],
          if (!_loading && _tests.isEmpty && _results.isEmpty)
            EmptyState(
              icon: Icons.quiz_outlined,
              message: 'No tests available yet',
            ),
        ],
      ),
    );
  }

  Future<void> _openResult(Map<String, dynamic> result) async {
    final app = Provider.of<AppProvider>(context, listen: false);
    final examId = result['id'] as int?;
    if (examId == null) return;
    final detail = await ApiService().aiStudentResult(examId, app.user?.username ?? '');
    if (detail == null || !mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => _ResultDetailPage(result: result, detail: detail)),
    );
  }
}

class _ResultCard extends StatelessWidget {
  final Map<String, dynamic> result;
  final VoidCallback onTap;
  const _ResultCard({required this.result, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final earned = (result['earnedMarks'] ?? result['earned_marks'] ?? 0).toString();
    final total = (result['totalMarks'] ?? result['total_marks'] ?? 0).toString();
    final pct = result['percentage'] ?? 0;
    final pending = result['pending'] == true || result['detailsLocked'] == true;
    final subject = result['subject_name']?.toString() ?? result['subject']?.toString() ?? '';

    return AppCard(
      padding: const EdgeInsets.all(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: theme.brightness == Brightness.dark
                    ? const Color(0xFF2C2C2C)
                    : AppColors.primarySoft,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.quiz_outlined, color: theme.primaryColor, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(subject, style: theme.textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text(
                    pending
                        ? 'Result pending...'
                        : 'Score: $earned / $total ($pct%)',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: theme.primaryColor),
          ],
        ),
      ),
    );
  }
}

class _TestCard extends StatelessWidget {
  final Map<String, dynamic> test;
  const _TestCard({required this.test});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final subject = test['subject']?.toString() ?? '';
    final total = test['totalMarks']?.toString() ?? '';
    final completed = test['completed'] == true;

    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: theme.brightness == Brightness.dark
                  ? const Color(0xFF2C2C2C)
                  : AppColors.primarySoft,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.quiz_outlined, color: theme.primaryColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(subject, style: theme.textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(
                  completed ? 'Completed' : 'Total marks: $total',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
          if (completed)
            Icon(Icons.check_circle, color: AppColors.success)
          else
            Icon(Icons.chevron_right, color: theme.primaryColor),
        ],
      ),
    );
  }
}

class _ResultDetailPage extends StatelessWidget {
  final Map<String, dynamic> result;
  final Map<String, dynamic> detail;
  const _ResultDetailPage({required this.result, required this.detail});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final earned = (result['earnedMarks'] ?? result['earned_marks'] ?? 0).toString();
    final total = (result['totalMarks'] ?? result['total_marks'] ?? 0).toString();
    final pct = result['percentage'] ?? 0;
    final questions = (detail['questions'] as List?) ??
        (detail['questionDetails'] as List?) ??
        (detail['items'] as List?) ??
        (detail['answers'] as List?) ??
        (detail['question_details'] as List?) ??
        (detail['result'] as List?) ??
        (detail['details'] as List?) ??
        const [];
    final pending = result['pending'] == true || result['detailsLocked'] == true;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close, color: theme.primaryColor),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Score: $earned / $total ($pct%)',
          style: TextStyle(color: theme.primaryColor, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: questions.isEmpty
          ? Center(
              child: Text(
                pending ? 'Result pending...' : 'No question details available',
                style: theme.textTheme.bodyMedium,
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: questions.length,
              itemBuilder: (context, i) {
                final q = Map<String, dynamic>.from(questions[i] as Map);
                final isCorrect = q['isCorrect'] == true || q['is_correct'] == true || q['correct'] == true;
                final questionText = q['questionText']?.toString() ?? q['question_text']?.toString() ?? q['question']?.toString() ?? q['text']?.toString() ?? '';
                final studentAnswer = q['studentAnswer']?.toString() ?? q['student_answer']?.toString() ?? q['answer']?.toString() ?? q['selectedAnswer']?.toString() ?? '-';
                final correctAnswer = q['correctAnswer']?.toString() ?? q['correct_answer']?.toString() ?? q['correctAnswerText']?.toString() ?? '-';
                final earnedMarks = (q['earnedMarks'] ?? q['earned_marks'] ?? q['marks'] ?? q['score'] ?? 0).toString();
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isCorrect
                        ? AppColors.success.withOpacity(0.12)
                        : AppColors.danger.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isCorrect
                          ? AppColors.success.withOpacity(0.4)
                          : AppColors.danger.withOpacity(0.4),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        questionText,
                        style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 8),
                      Text('Your answer: $studentAnswer', style: theme.textTheme.bodySmall),
                      Text('Correct answer: $correctAnswer', style: theme.textTheme.bodySmall),
                      const SizedBox(height: 4),
                      Text(
                        isCorrect ? 'Correct (+$earnedMarks)' : 'Incorrect (+$earnedMarks)',
                        style: TextStyle(
                          color: isCorrect ? AppColors.success : AppColors.danger,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
