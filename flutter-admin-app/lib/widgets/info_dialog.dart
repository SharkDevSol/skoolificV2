import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// A single labelled value shown in the info popup.
class InfoEntry {
  final String label;
  final String value;
  final bool hidden;
  const InfoEntry(this.label, this.value, {this.hidden = false});
}

Future<void> copyValue(BuildContext context, String label, String value) async {
  if (value.trim().isEmpty) return;
  await Clipboard.setData(ClipboardData(text: value));
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text('$label copied'), duration: const Duration(seconds: 1)),
  );
}

/// Bottom sheet with complete information and a copy icon on every field.
Future<void> showInfoSheet(
  BuildContext context, {
  required String title,
  String? subtitle,
  required List<InfoEntry> entries,
}) {
  final theme = Theme.of(context);
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (ctx) {
      final visible = entries.where((e) => e.value.trim().isNotEmpty).toList();
      return DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.65,
        minChildSize: 0.35,
        maxChildSize: 0.95,
        builder: (ctx, scroll) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 12, 8),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 22,
                    backgroundColor: theme.colorScheme.primary.withOpacity(0.12),
                    child: Text(
                      title.trim().isEmpty ? '?' : title.trim()[0].toUpperCase(),
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        color: theme.colorScheme.primary,
                        fontSize: 18,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                        if (subtitle != null && subtitle.trim().isNotEmpty)
                          Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Close',
                    onPressed: () => Navigator.pop(ctx),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView.separated(
                controller: scroll,
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                itemCount: visible.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (ctx, i) {
                  final e = visible[i];
                  return ListTile(
                    dense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    title: Text(e.label, style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      e.hidden ? '••••••••' : e.value,
                      style: TextStyle(
                        fontSize: 15,
                        color: Theme.of(ctx).textTheme.bodyLarge?.color,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    trailing: IconButton(
                      tooltip: 'Copy ${e.label}',
                      icon: const Icon(Icons.copy_rounded, size: 19),
                      onPressed: () => copyValue(ctx, e.label, e.value),
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: FilledButton.icon(
                onPressed: () async {
                  final text = visible
                      .map((e) => '${e.label}: ${e.hidden ? '' : e.value}')
                      .join('\n');
                  await Clipboard.setData(ClipboardData(text: text));
                  if (ctx.mounted) Navigator.pop(ctx);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('All information copied')),
                    );
                  }
                },
                icon: const Icon(Icons.copy_all),
                label: const Text('Copy all'),
              ),
            ),
          ],
        ),
      );
    },
  );
}
