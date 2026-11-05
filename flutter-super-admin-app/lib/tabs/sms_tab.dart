import 'package:flutter/material.dart';

import '../api.dart';
import '../tab_handle.dart';
import '../theme.dart';
import '../ui.dart';

const _templateLabels = <String, String>{
  'student_welcome': 'Student Welcome',
  'guardian_welcome': 'Guardian Welcome',
  'payment_receipt': 'Payment Receipt',
  'staff_welcome': 'Staff Welcome',
  'staff_credential_change': 'Credential Change',
  'notification': 'Notification',
  'manual_compose': 'Manual Compose',
};

String _labelFor(dynamic key) {
  final k = (key ?? '').toString();
  if (k.isEmpty) return 'Custom / Other';
  return _templateLabels[k] ?? k;
}

class SmsTab extends StatefulWidget {
  const SmsTab({
    super.key,
    required this.active,
    required this.handle,
  });

  final bool active;
  final TabHandle handle;

  @override
  State<SmsTab> createState() => _SmsTabState();
}

class _SmsTabState extends State<SmsTab> {
  bool _loaded = false;
  bool _loading = false;
  String? _error;

  Map<String, dynamic>? _totals;
  List<Map<String, dynamic>> _byTemplate = [];
  List<Map<String, dynamic>> _logs = [];
  List<Map<String, dynamic>> _recipients = [];
  List<Map<String, dynamic>> _templates = [];

  final _message = TextEditingController();
  final _search = TextEditingController();
  String _group = 'all';
  String _classFilter = '';
  final Set<String> _selected = {};
  String _templateFilter = '';
  String _statusFilter = '';
  bool _sending = false;
  String? _sendResult;
  String? _sendingId;

  @override
  void initState() {
    super.initState();
    widget.handle.refresh = _load;
    _message.addListener(() => setState(() {}));
    _search.addListener(() => setState(() {}));
    if (widget.active) _load();
  }

  @override
  void didUpdateWidget(covariant SmsTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!oldWidget.active && widget.active && !_loaded) _load();
  }

  @override
  void dispose() {
    _message.dispose();
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final results = await Future.wait([
      Api.getJson('/sms/counter'),
      Api.getJson('/sms/logs', params: {
        'limit': '50',
        if (_templateFilter.isNotEmpty) 'template': _templateFilter,
        if (_statusFilter.isNotEmpty) 'status': _statusFilter,
      }),
      Api.getJson('/sms/recipients', params: {
        'group': _group,
        if (_classFilter.isNotEmpty) 'class': _classFilter,
      }),
      Api.getJson('/sms/templates'),
    ]);
    if (!mounted) return;
    final counter = results[0].data;
    setState(() {
      _totals = counter?['totals'] is Map
          ? Map<String, dynamic>.from(counter!['totals'])
          : null;
      _byTemplate = mapList(counter?['byTemplate']);
      _logs = mapList(results[1].map?['data']);
      _recipients = mapList(results[2].map?['data']);
      _templates = mapList(results[3].map?['data']);
      _loading = false;
      _loaded = true;
      if (_byTemplate.isEmpty && _logs.isEmpty && _recipients.isEmpty) {
        _error = 'Could not load SMS data. Pull down to retry.';
      }
    });
  }

  List<String> get _classOptions {
    final set = <String>{};
    for (final r in _recipients) {
      final cls = (r['class'] ?? '').toString();
      if (cls.isNotEmpty) set.add(cls);
    }
    final list = set.toList()..sort();
    return list;
  }

  List<Map<String, dynamic>> get _visibleRecipients {
    final q = _search.text.trim().toLowerCase();
    if (q.isEmpty) return _recipients;
    return _recipients
        .where((r) =>
            (r['name'] ?? '').toString().toLowerCase().contains(q) ||
            (r['phone'] ?? '').toString().contains(q))
        .toList();
  }

  int get _segments => _message.text.isEmpty ? 1 : (_message.text.length / 159).ceil();

  Future<void> _send() async {
    if (_message.text.trim().isEmpty) {
      _snack('Write a message first');
      return;
    }
    if (_selected.isEmpty) {
      _snack('Select at least one recipient');
      return;
    }
    final ok = await _confirm(
      'Send SMS?',
      'Send this message to ${_selected.length} recipient(s)?\n\nCredits: ${_segments * _selected.length}',
    );
    if (ok != true) return;
    setState(() {
      _sending = true;
      _sendResult = null;
    });
    final recipients = _recipients.where((r) => _selected.contains(r['phone'].toString())).toList();
    final res = await Api.postJson('/sms/send', {
      'message': _message.text.trim(),
      'recipients': recipients,
    });
    if (!mounted) return;
    final d = res.data;
    setState(() {
      _sending = false;
      if (d != null) {
        _sendResult = '${d['sent'] ?? 0} sent · ${d['failed'] ?? 0} failed · ${d['credits'] ?? 0} credits used';
        _selected.clear();
        _message.clear();
      } else {
        _sendResult = res.errorMessage ?? 'Failed to send SMS';
      }
    });
    _load();
  }

  Future<void> _resendOne(dynamic id) async {
    setState(() => _sendingId = id.toString());
    final res = await Api.postJson('/sms/resend/$id', {});
    if (!mounted) return;
    setState(() => _sendingId = null);
    if (!res.ok) _snack(res.errorMessage ?? 'Resend failed');
    _load();
  }

  Future<void> _resendAll() async {
    final failed = _totals?['failed'] ?? 0;
    final ok = await _confirm('Resend failed SMS?', 'Queue all $failed failed SMS for sending again?');
    if (ok != true) return;
    final res = await Api.postJson('/sms/resend-all-failed', {});
    if (!mounted) return;
    if (res.ok) {
      _snack('Queued ${res.data?['count'] ?? 0} SMS');
      _load();
    } else {
      _snack(res.errorMessage ?? 'Resend failed');
    }
  }

  Future<bool?> _confirm(String title, String body) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirm')),
        ],
      ),
    );
  }

  void _snack(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return TabScroll(
      onRefresh: _load,
      children: [
        CardBox(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'SMS Counter',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: c.text),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Every SMS sent by this branch, counted and grouped by template.',
                      style: TextStyle(fontSize: 11, color: c.muted, height: 1.35),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: _loading ? null : _load,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
                ),
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: const Text('Refresh', style: TextStyle(fontSize: 11)),
              ),
            ],
          ),
        ),
        if (_loading && !_loaded)
          const LoadingBox(text: 'Loading SMS...')
        else if (_error != null)
          CardBox(child: MessageBanner(_error!, isError: true))
        else ...[
          _composeCard(c),
          if (_sendResult != null)
            CardBox(
              child: MessageBanner(
                _sendResult!,
                isError: _sendResult!.contains('failed') && !_sendResult!.contains('0 failed'),
              ),
            ),
          if (_totals != null)
            StatGrid(
              children: [
                StatCard(
                  label: 'Total SMS Sent',
                  value: fmt(_totals!['total_sends']),
                  sub: '${fmt(_totals!['total_segments'])} credits',
                ),
                StatCard(
                  label: 'Sent Today',
                  value: fmt(_totals!['today_sends']),
                  sub: '${fmt(_totals!['today_segments'])} credits today',
                ),
                StatCard(
                  label: 'Delivered',
                  value: fmt(_totals!['sent']),
                  valueColor: c.green,
                ),
                StatCard(
                  label: 'Pending',
                  value: fmt(_totals!['pending']),
                  valueColor: c.amber,
                ),
                StatCard(
                  label: 'Failed',
                  value: fmt(_totals!['failed']),
                  valueColor: c.red,
                ),
              ],
            ),
          CardBox(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CardTitle('Sends by Template'),
                if (_byTemplate.isEmpty)
                  const EmptyBox('No SMS sent yet for this branch.')
                else
                  ..._byTemplate.map((t) {
                    final sends = toNum(t['sends']);
                    final maxSends = _byTemplate.fold<num>(
                      1,
                      (m, x) => toNum(x['sends']) > m ? toNum(x['sends']) : m,
                    );
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  _labelFor(t['template_key']),
                                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: c.text),
                                ),
                              ),
                              Text(
                                '$sends SMS',
                                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: c.muted),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          BarTrack(value: maxSends == 0 ? 0.0 : sends / maxSends, height: 7),
                          const SizedBox(height: 3),
                          Text(
                            '${fmt(t['sent'])} sent · ${fmt(t['failed'])} failed · ${fmt(t['segments'])} credits',
                            style: TextStyle(fontSize: 9.5, color: c.muted),
                          ),
                        ],
                      ),
                    );
                  }),
              ],
            ),
          ),
          _logsCard(c),
        ],
      ],
    );
  }

  Widget _composeCard(AppColors c) {
    final visible = _visibleRecipients;
    final shown = visible.take(60).toList();
    final allSelected = visible.isNotEmpty && visible.every((r) => _selected.contains(r['phone'].toString()));

    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CardTitle('Write & Send SMS'),
          TextField(
            controller: _message,
            maxLines: 4,
            style: TextStyle(fontSize: 13, color: c.text),
            decoration: const InputDecoration(hintText: 'Type your message here...'),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(
                '${_message.text.length} chars',
                style: TextStyle(
                  fontSize: 10.5,
                  color: _message.text.length > 159 ? c.red : c.muted,
                ),
              ),
              const Spacer(),
              Text(
                '$_segments SMS each · ${_segments * _selected.length} credits',
                style: TextStyle(fontSize: 10.5, color: c.muted),
              ),
            ],
          ),
          if (_templates.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              height: 44,
              padding: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(
                color: c.input,
                borderRadius: BorderRadius.circular(11),
                border: Border.all(color: c.line),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  dropdownColor: c.card,
                  hint: Text('Insert template...', style: TextStyle(fontSize: 12, color: c.muted)),
                  icon: Icon(Icons.expand_more_rounded, size: 18, color: c.muted),
                  style: TextStyle(fontSize: 12, color: c.text),
                  items: _templates
                      .where((t) => t['is_active'] != false)
                      .map((t) => DropdownMenuItem(
                            value: (t['template_text'] ?? '').toString(),
                            child: Text(_labelFor(t['template_key']), overflow: TextOverflow.ellipsis),
                          ))
                      .toList(),
                  onChanged: (v) {
                    if (v != null && v.isNotEmpty) _message.text = v;
                  },
                ),
              ),
            ),
          ],
          const SizedBox(height: 14),
          Text(
            'RECIPIENTS',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: c.muted, letterSpacing: 0.7),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: _miniDropdown(
                  c,
                  value: _group,
                  items: const [
                    {'value': 'all', 'label': 'All'},
                    {'value': 'guardians', 'label': 'Guardians'},
                    {'value': 'students', 'label': 'Students'},
                    {'value': 'staff', 'label': 'Staff'},
                  ],
                  onChanged: (v) {
                    setState(() {
                      _group = v ?? 'all';
                      _selected.clear();
                    });
                    _load();
                  },
                ),
              ),
              if (_classOptions.isNotEmpty) ...[
                const SizedBox(width: 6),
                Expanded(
                  child: _miniDropdown(
                    c,
                    value: _classFilter,
                    items: [
                      {'value': '', 'label': 'All classes'},
                      for (final cls in _classOptions) {'value': cls, 'label': cls},
                    ],
                    onChanged: (v) {
                      setState(() {
                        _classFilter = v ?? '';
                        _selected.clear();
                      });
                      _load();
                    },
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 6),
          SearchBox(
            hint: 'Search name or phone...',
            controller: _search,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () {
                    setState(() {
                      if (allSelected) {
                        for (final r in visible) {
                          _selected.remove(r['phone'].toString());
                        }
                      } else {
                        for (final r in visible) {
                          _selected.add(r['phone'].toString());
                        }
                      }
                    });
                  },
                  child: Row(
                    children: [
                      Icon(
                        allSelected ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded,
                        size: 19,
                        color: allSelected ? c.primary : c.muted,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Select all (${visible.length})',
                        style: TextStyle(fontSize: 11, color: c.text),
                      ),
                    ],
                  ),
                ),
              ),
              Text(
                '${_selected.length} selected',
                style: TextStyle(fontSize: 10.5, color: c.muted),
              ),
            ],
          ),
          const SizedBox(height: 4),
          if (shown.isEmpty)
            const EmptyBox('No recipients found.')
          else
            ...shown.map((r) {
              final phone = r['phone'].toString();
              final selected = _selected.contains(phone);
              return InkWell(
                onTap: () => setState(() {
                  if (selected) {
                    _selected.remove(phone);
                  } else {
                    _selected.add(phone);
                  }
                }),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 5),
                  child: Row(
                    children: [
                      Icon(
                        selected ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded,
                        size: 19,
                        color: selected ? c.primary : c.muted,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              (r['name'] ?? '—').toString(),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: c.text),
                            ),
                            Text(
                              '+${r['phone']}${r['class'] != null ? ' · ${r['class']}' : ''}',
                              style: TextStyle(fontSize: 9.5, color: c.muted),
                            ),
                          ],
                        ),
                      ),
                      Pill(
                        r['type'] == 'guardian'
                            ? 'Guardian'
                            : r['type'] == 'staff'
                                ? 'Staff'
                                : 'Student',
                        fontSize: 9,
                      ),
                    ],
                  ),
                ),
              );
            }),
          if (visible.length > shown.length)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                'Showing ${shown.length} of ${visible.length}. Use search to narrow the list.',
                style: TextStyle(fontSize: 10, color: c.muted),
              ),
            ),
          const SizedBox(height: 10),
          PrimaryButton(
            label: _sending ? 'Sending...' : 'Send SMS (${_selected.length})',
            onPressed: _sending ? null : _send,
            icon: Icons.send_rounded,
          ),
        ],
      ),
    );
  }

  Widget _logsCard(AppColors c) {
    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CardTitle('Recent Sends'),
          Row(
            children: [
              Expanded(
                child: _miniDropdown(
                  c,
                  value: _templateFilter,
                  items: [
                    {'value': '', 'label': 'All templates'},
                    for (final e in _templateLabels.entries)
                      {'value': e.key, 'label': e.value},
                  ],
                  onChanged: (v) {
                    setState(() => _templateFilter = v ?? '');
                    _load();
                  },
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: _miniDropdown(
                  c,
                  value: _statusFilter,
                  items: const [
                    {'value': '', 'label': 'All statuses'},
                    {'value': 'sent', 'label': 'Sent'},
                    {'value': 'pending', 'label': 'Pending'},
                    {'value': 'failed', 'label': 'Failed'},
                  ],
                  onChanged: (v) {
                    setState(() => _statusFilter = v ?? '');
                    _load();
                  },
                ),
              ),
            ],
          ),
          if (toNum(_totals?['failed']) > 0)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _resendAll,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: c.red,
                    side: BorderSide(color: c.red.withValues(alpha: 0.5)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
                  ),
                  icon: const Icon(Icons.replay_rounded, size: 16),
                  label: Text(
                    'Resend all failed (${fmt(_totals?['failed'])})',
                    style: const TextStyle(fontSize: 11),
                  ),
                ),
              ),
            ),
          const SizedBox(height: 8),
          if (_logs.isEmpty)
            const EmptyBox('No SMS logs yet.')
          else
            ..._logs.map((log) {
              final status = (log['status'] ?? '').toString();
              final color = status == 'sent' ? c.green : (status == 'pending' ? c.amber : c.red);
              return Container(
                margin: const EdgeInsets.only(bottom: 7),
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: c.input,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: c.line),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            (log['recipient_name'] ?? '—').toString(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: c.text),
                          ),
                        ),
                        Pill(
                          status == 'sent' ? 'Sent' : status == 'pending' ? 'Pending' : 'Failed',
                          color: color,
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${_labelFor(log['template_key'])} · +${log['phone'] ?? '—'}',
                      style: TextStyle(fontSize: 9.5, color: c.muted),
                    ),
                    if (status == 'failed')
                      Text(
                        (log['error'] ?? 'Waiting for phone worker...').toString(),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 10, color: c.red),
                      )
                    else
                      Text(
                        (log['message'] ?? '').toString(),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 10, color: c.muted),
                      ),
                    if (status == 'failed')
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: _sendingId == log['id']?.toString() ? null : () => _resendOne(log['id']),
                          style: TextButton.styleFrom(
                            minimumSize: const Size(0, 28),
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                          ),
                          child: const Text('Retry', style: TextStyle(fontSize: 10.5)),
                        ),
                      ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _miniDropdown(
    AppColors c, {
    required String value,
    required List<Map<String, String>> items,
    required ValueChanged<String?> onChanged,
  }) {
    final safe = items.any((i) => i['value'] == value) ? value : items.first['value']!;
    return Container(
      height: 42,
      padding: const EdgeInsets.symmetric(horizontal: 9),
      decoration: BoxDecoration(
        color: c.input,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: c.line),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: safe,
          isExpanded: true,
          dropdownColor: c.card,
          icon: Icon(Icons.expand_more_rounded, size: 17, color: c.muted),
          style: TextStyle(fontSize: 11, color: c.text),
          items: items
              .map((i) => DropdownMenuItem(
                    value: i['value'],
                    child: Text(i['label']!, overflow: TextOverflow.ellipsis),
                  ))
              .toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }
}
