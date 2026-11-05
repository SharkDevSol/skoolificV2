import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api.dart';
import '../l10n.dart';
import '../tab_handle.dart';
import '../theme.dart';
import '../ui.dart';
import 'attendance_tab.dart' show ethMonths;

class FaultsTab extends StatefulWidget {
  const FaultsTab({
    super.key,
    required this.branch,
    required this.active,
    required this.handle,
  });

  final String branch;
  final bool active;
  final TabHandle handle;

  @override
  State<FaultsTab> createState() => _FaultsTabState();
}

class _FaultsTabState extends State<FaultsTab> {
  bool _loaded = false;
  bool _loading = false;
  String? _error;
  Map<String, dynamic>? _data;

  final _year = TextEditingController();
  String _month = '';
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    widget.handle.refresh = _load;
    if (widget.active) _load();
  }

  @override
  void didUpdateWidget(covariant FaultsTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.branch != widget.branch) {
      _loaded = false;
      if (widget.active) _load();
    } else if (!oldWidget.active && widget.active && !_loaded) {
      _load();
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _year.dispose();
    super.dispose();
  }

  void _queueLoad() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 450), _load);
  }

  Future<void> _load() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final res = await Api.getJson('/super-admin/report/faults', params: {
      'branchCode': widget.branch,
      'year': _year.text.trim(),
      'month': _month,
    });
    if (!mounted) return;
    setState(() {
      _data = res.data;
      _loading = false;
      _loaded = true;
      if (res.data == null) _error = 'Could not load faults. Pull down to retry.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final f = _data;
    final branches = activeBranches(f);
    final maxTotal = branches.fold<int>(1, (m, b) {
      final t = toNum(b['total']);
      return t.toInt() > m ? t.toInt() : m;
    });

    return TabScroll(
      onRefresh: _load,
      children: [
        CardBox(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CardTitle(T.t('filterEthDate')),
              Row(
                children: [
                  Expanded(
                    child: FilterField(
                      label: T.t('year'),
                      child: TextField(
                        controller: _year,
                        keyboardType: TextInputType.number,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        onChanged: (_) => _queueLoad(),
                        style: TextStyle(fontSize: 13, color: c.text),
                        decoration: const InputDecoration(hintText: '2018'),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilterField(
                      label: T.t('month'),
                      child: Container(
                        height: 46,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: c.input,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: c.line),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _month,
                            isExpanded: true,
                            dropdownColor: c.card,
                            icon: Icon(Icons.expand_more_rounded, size: 18, color: c.muted),
                            style: TextStyle(fontSize: 12.5, color: c.text),
                            items: [
                              DropdownMenuItem(value: '', child: Text(T.t('allMonths'))),
                              for (var i = 0; i < ethMonths.length; i++)
                                DropdownMenuItem(value: '${i + 1}', child: Text(ethMonths[i])),
                            ],
                            onChanged: (v) {
                              setState(() => _month = v ?? '');
                              _load();
                            },
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (_loading && !_loaded)
          const LoadingBox(text: 'Loading faults...')
        else if (_error != null)
          CardBox(child: MessageBanner(_error!, isError: true))
        else ...[
          HeroCard(
            label: T.t('faultsCount'),
            value: fmt(f?['grandTotal']),
            sub: 'Recorded across ${branches.length} branches',
          ),
          SectionTitle(T.t('byBranch')),
          if (branches.isEmpty)
            CardBox(child: EmptyBox(T.t('noBranchData')))
          else
            for (final b in branches) _branchCard(c, b, maxTotal),
        ],
      ],
    );
  }

  Widget _branchCard(AppColors c, Map<String, dynamic> b, int maxTotal) {
    final classes = mapList(b['classes']).where((x) => (toNum(x['faults'])) > 0).toList();
    final total = toNum(b['total']);
    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${b['branchName']} — ${fmt(b['total'])} ${T.t('faults')}',
            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: c.text),
          ),
          const SizedBox(height: 10),
          BarTrack(
            value: maxTotal == 0 ? 0.0 : total / maxTotal,
            color: c.red,
          ),
          const SizedBox(height: 10),
          if (classes.isEmpty)
            EmptyBox(T.t('noFaults'))
          else
            DataTableX(
              headers: [T.t('class'), T.t('faults')],
              rows: classes
                  .map((cls) => [
                        cellText(cls['className'], bold: true),
                        cellText(fmt(cls['faults']), bold: true, color: c.red),
                      ])
                  .toList(),
            ),
        ],
      ),
    );
  }
}
