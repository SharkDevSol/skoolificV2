import 'package:flutter/material.dart';

import 'api.dart';
import 'l10n.dart';
import 'tab_handle.dart';
import 'tabs/attendance_tab.dart';
import 'tabs/faults_tab.dart';
import 'tabs/finance_tab.dart';
import 'tabs/home_tab.dart';
import 'tabs/marks_tab.dart';
import 'tabs/settings_tab.dart';
import 'tabs/sms_tab.dart';
import 'tabs/students_tab.dart';
import 'theme.dart';
import 'ui.dart';

const _allTabKeys = [
  'home',
  'students',
  'attendance',
  'marks',
  'faults',
  'finance',
  'sms',
  'settings',
];

class Shell extends StatefulWidget {
  const Shell({
    super.key,
    required this.dark,
    required this.onThemeChanged,
    required this.lang,
    required this.onLangChanged,
    required this.onLogout,
  });

  final bool dark;
  final ValueChanged<bool> onThemeChanged;
  final String lang;
  final ValueChanged<String> onLangChanged;
  final Future<void> Function() onLogout;

  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  int _tab = 0;
  String _branch = 'ALL';
  List<Map<String, String>> _branches = [];
  bool _moreOpen = false;
  final Map<String, TabHandle> _handles = {
    for (final k in _allTabKeys) k: TabHandle(),
  };

  bool get _hideFinance => (Api.username ?? '').toLowerCase() == 'abdi';

  List<String> get _primaryKeys =>
      ['home', 'students', if (!_hideFinance) 'finance'];

  static const _secondaryKeys = ['attendance', 'marks', 'faults', 'sms', 'settings'];

  @override
  void initState() {
    super.initState();
    _loadBranches();
  }

  Future<void> _loadBranches() async {
    final res = await Api.getJson('/super-admin/branches');
    final data = res.data;
    final raw = data?['branches'];
    final list = <Map<String, String>>[];
    if (raw is List) {
      for (final b in raw.whereType<Map>()) {
        final code = (b['branch_code'] ?? '').toString();
        final name = (b['branch_name'] ?? code).toString();
        if (isAllowedBranch(code)) list.add({'code': code, 'name': name});
      }
    }
    list.sort((a, b) => a['code']!.compareTo(b['code']!));
    if (!mounted) return;
    setState(() => _branches = list);
  }

  String get _branchLabel => _branch == 'ALL'
      ? T.t('allBranches')
      : (_branches.firstWhere(
            (b) => b['code'] == _branch,
            orElse: () => {'code': _branch, 'name': _branch},
          )['name'] ??
          _branch);

  void _go(String key) {
    final i = _allTabKeys.indexOf(key);
    if (i < 0) return;
    setState(() {
      _tab = i;
      _moreOpen = false;
    });
  }

  void _refresh() {
    _handles[_allTabKeys[_tab]]?.refresh?.call();
  }

  Future<void> _pickBranch() async {
    final c = AppColors.of(context);
    final picked = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        return Container(
          margin: const EdgeInsets.all(12),
          padding: const EdgeInsets.fromLTRB(10, 10, 10, 16),
          decoration: BoxDecoration(
            color: c.card,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: c.line),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 38,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                    color: c.line,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
                Text(
                  T.t('allBranches'),
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: c.text),
                ),
                const SizedBox(height: 8),
                ..._optionsForBranchSheet(c).map(
                  (o) => _branchOption(
                    c,
                    code: o['code']!,
                    name: o['name']!,
                    selected: _branch == o['code'],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
    if (picked != null && picked != _branch) {
      setState(() => _branch = picked);
    }
  }

  List<Map<String, String>> _optionsForBranchSheet(AppColors c) => [
        {'code': 'ALL', 'name': T.t('allBranches')},
        ..._branches,
      ];

  Widget _branchOption(
    AppColors c, {
    required String code,
    required String name,
    required bool selected,
  }) {
    return ListTile(
      dense: true,
      onTap: () => Navigator.of(context).pop(code),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      leading: Container(
        width: 34,
        height: 34,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? c.primary.withValues(alpha: 0.12) : c.input,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: c.line),
        ),
        child: Icon(
          code == 'ALL' ? Icons.apartment_rounded : Icons.school_rounded,
          size: 17,
          color: selected ? c.primary : c.muted,
        ),
      ),
      title: Text(
        name,
        style: TextStyle(
          fontSize: 13.5,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          color: selected ? c.primary : c.text,
        ),
      ),
      subtitle: code == 'ALL' ? null : Text(code, style: TextStyle(fontSize: 10.5, color: c.muted)),
      trailing: selected ? Icon(Icons.check_circle_rounded, color: c.primary, size: 20) : null,
    );
  }

  IconData _iconFor(String key) {
    switch (key) {
      case 'home':
        return Icons.home_rounded;
      case 'students':
        return Icons.people_alt_rounded;
      case 'attendance':
        return Icons.fact_check_rounded;
      case 'marks':
        return Icons.assignment_rounded;
      case 'faults':
        return Icons.warning_amber_rounded;
      case 'finance':
        return Icons.payments_rounded;
      case 'sms':
        return Icons.sms_rounded;
      default:
        return Icons.settings_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Scaffold(
      backgroundColor: c.scaffold,
      body: Column(
        children: [
          _header(c),
          Expanded(
            child: Stack(
              children: [
                IndexedStack(
                  index: _tab,
                  children: [
                    HomeTab(branch: _branch, active: _tab == 0, handle: _handles['home']!),
                    StudentsTab(branch: _branch, active: _tab == 1, handle: _handles['students']!),
                    AttendanceTab(branch: _branch, active: _tab == 2, handle: _handles['attendance']!),
                    MarksTab(branch: _branch, active: _tab == 3, handle: _handles['marks']!),
                    FaultsTab(branch: _branch, active: _tab == 4, handle: _handles['faults']!),
                    FinanceTab(branch: _branch, active: _tab == 5, handle: _handles['finance']!),
                    SmsTab(active: _tab == 6, handle: _handles['sms']!),
                    SettingsTab(
                      active: _tab == 7,
                      handle: _handles['settings']!,
                      dark: widget.dark,
                      onThemeChanged: widget.onThemeChanged,
                      lang: widget.lang,
                      onLangChanged: widget.onLangChanged,
                      onLogout: widget.onLogout,
                    ),
                  ],
                ),
                if (_moreOpen)
                  Positioned.fill(
                    child: GestureDetector(
                      onTap: () => setState(() => _moreOpen = false),
                      child: Container(color: Colors.black.withValues(alpha: 0.36)),
                    ),
                  ),
                if (_moreOpen) _moreSheet(c),
                _bottomNav(c),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _header(AppColors c) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: c.headerGradient,
        ),
        border: const Border(bottom: BorderSide(color: Color(0xFFF7941E), width: 4)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
          child: Column(
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFF7941E), Color(0xFFFFB04D)],
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: const [
                        BoxShadow(color: Color(0x66000000), blurRadius: 12, offset: Offset(0, 4)),
                      ],
                    ),
                    child: const Text(
                      'I',
                      style: TextStyle(
                        color: Color(0xFF8B1A1A),
                        fontSize: 19,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'IQRA ${T.t('appName')}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.3,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _branchLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Color(0xFFFFD9A0), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  InkWell(
                    onTap: _refresh,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 42,
                      height: 42,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.45)),
                      ),
                      child: const Icon(Icons.refresh_rounded, color: Colors.white, size: 21),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: _pickBranch,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.account_tree_rounded, color: Colors.white, size: 17),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Text(
                          _branchLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const Icon(Icons.expand_more_rounded, color: Colors.white, size: 20),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _bottomNav(AppColors c) {
    return Positioned(
      left: 16,
      right: 16,
      bottom: 10,
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 76,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                height: 72,
                decoration: BoxDecoration(
                  color: c.card,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: c.line),
                  boxShadow: [
                    BoxShadow(
                      color: c.isDark ? const Color(0x99000000) : const Color(0x2E0F172A),
                      blurRadius: 34,
                      offset: const Offset(0, 14),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    for (final key in _primaryKeys)
                      Expanded(
                        child: _navItem(
                          c,
                          key: key,
                          active: _tab == _allTabKeys.indexOf(key),
                          onTap: () => _go(key),
                        ),
                      ),
                    const SizedBox(width: 62),
                  ],
                ),
              ),
              Positioned(
                right: 6,
                top: -18,
                child: GestureDetector(
                  onTap: () => setState(() => _moreOpen = !_moreOpen),
                  child: Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: _secondaryKeys.contains(_allTabKeys[_tab])
                          ? const LinearGradient(colors: [Color(0xFFB21E23), Color(0xFFE5484D)])
                          : const LinearGradient(colors: [Color(0xFFF7941E), Color(0xFFFFB04D)]),
                      border: Border.all(color: c.card, width: 4),
                      boxShadow: [
                        BoxShadow(
                          color: (_secondaryKeys.contains(_allTabKeys[_tab])
                                  ? const Color(0xFFB21E23)
                                  : const Color(0xFFF7941E))
                              .withValues(alpha: 0.45),
                          blurRadius: 22,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: AnimatedRotation(
                      turns: _moreOpen ? 0.125 : 0,
                      duration: const Duration(milliseconds: 180),
                      child: Icon(
                        Icons.add_rounded,
                        size: 28,
                        color: _secondaryKeys.contains(_allTabKeys[_tab])
                            ? Colors.white
                            : const Color(0xFF8B1A1A),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _navItem(
    AppColors c, {
    required String key,
    required bool active,
    required VoidCallback onTap,
  }) {
    final color = active ? (c.isDark ? const Color(0xFFFFB04D) : c.primary) : c.muted;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(_iconFor(key), size: 22, color: color),
          const SizedBox(height: 3),
          Text(
            T.t(key),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _moreSheet(AppColors c) {
    return Positioned(
      left: 16,
      right: 16,
      bottom: 96,
      child: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: c.card,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: c.line),
            boxShadow: const [
              BoxShadow(color: Color(0x66000000), blurRadius: 34, offset: Offset(0, 16)),
            ],
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              const gap = 6.0;
              final w = (constraints.maxWidth - gap * 2) / 3;
              return Wrap(
                spacing: gap,
                runSpacing: gap,
                children: _secondaryKeys.map((key) {
                  final active = _allTabKeys[_tab] == key;
                  return SizedBox(
                    width: w,
                    child: InkWell(
                      onTap: () => _go(key),
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
                        decoration: BoxDecoration(
                          color: active
                              ? (c.isDark
                                  ? c.gold.withValues(alpha: 0.18)
                                  : c.primary.withValues(alpha: 0.08))
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Column(
                          children: [
                            Icon(
                              _iconFor(key),
                              size: 23,
                              color: active
                                  ? (c.isDark ? c.goldLight : c.primary)
                                  : (c.isDark ? c.goldLight : c.primary),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              T.t(key),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                color: c.text,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ),
      ),
    );
  }
}
