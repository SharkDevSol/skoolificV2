import 'package:flutter/material.dart';

import 'theme.dart';

// ---------------- formatting ----------------

/// Postgres aggregates sometimes arrive as strings — parse safely.
num toNum(dynamic v) {
  if (v is num) return v;
  if (v == null) return 0;
  return num.tryParse(v.toString().trim()) ?? 0;
}

String fmt(dynamic v) {
  if (v == null) return '0';
  num n;
  if (v is num) {
    n = v;
  } else {
    n = num.tryParse(v.toString()) ?? 0;
  }
  final neg = n < 0;
  final s = n.round().abs().toString();
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
    b.write(s[i]);
  }
  return (neg ? '-' : '') + b.toString();
}

String birr(dynamic v) => '${fmt(v)} Birr';

String score(dynamic v) {
  if (v == null) return '0';
  if (v is int) return v.toString();
  if (v is double) return v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(1);
  return v.toString();
}

const allowedBranchCodes = ['IQRA2', 'IQRA3', 'IQRA4', 'IQRA5'];

bool isAllowedBranch(dynamic code) =>
    allowedBranchCodes.contains(code.toString().toUpperCase());

/// Branch entries from a report payload, filtered to the real branches only.
List<Map<String, dynamic>> activeBranches(Map<String, dynamic>? data) {
  if (data == null) return [];
  final raw = data['byBranch'] ?? data['branches'];
  if (raw is! List) return [];
  return raw
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .where((b) => b['error'] == null && isAllowedBranch(b['branchCode'] ?? b['branch_code']))
      .toList();
}

List<Map<String, dynamic>> mapList(dynamic raw) {
  if (raw is! List) return [];
  return raw.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
}

// ---------------- layout ----------------

class CardBox extends StatelessWidget {
  const CardBox({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(14),
    this.margin = const EdgeInsets.only(bottom: 12),
  });

  final Widget child;
  final EdgeInsets padding;
  final EdgeInsets margin;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Container(
      width: double.infinity,
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: c.line),
        boxShadow: [
          BoxShadow(
            color: c.isDark ? const Color(0x59000000) : const Color(0x0F0F172A),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key, this.trailing});

  final String text;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 4, 2, 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 15.5,
                fontWeight: FontWeight.w800,
                color: c.text,
                letterSpacing: 0.15,
              ),
            ),
          ),
          if (trailing != null)
            Text(trailing!, style: TextStyle(fontSize: 11.5, color: c.muted)),
        ],
      ),
    );
  }
}

class CardTitle extends StatelessWidget {
  const CardTitle(this.text, {super.key, this.trailing});

  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              text,
              style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: c.text),
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class HeroCard extends StatelessWidget {
  const HeroCard({
    super.key,
    required this.label,
    required this.value,
    this.sub,
    this.valueSize = 34,
  });

  final String label;
  final String value;
  final String? sub;
  final double valueSize;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [c.primaryDeep, c.primary, const Color(0xFF7E1418)],
        ),
        boxShadow: [
          BoxShadow(
            color: c.primary.withValues(alpha: 0.28),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              color: Color(0xFFFFD9A0),
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.9,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              color: Colors.white,
              fontSize: valueSize,
              fontWeight: FontWeight.w800,
              height: 1.1,
            ),
          ),
          if (sub != null) ...[
            const SizedBox(height: 6),
            Text(
              sub!,
              style: const TextStyle(color: Color(0xFFFFE7C2), fontSize: 12, height: 1.35),
            ),
          ],
        ],
      ),
    );
  }
}

class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.label,
    required this.value,
    this.valueColor,
    this.sub,
    this.trailing,
  });

  final String label;
  final String value;
  final Color? valueColor;
  final String? sub;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return CardBox(
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.all(13),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  maxLines: 2,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: c.muted),
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 21,
                fontWeight: FontWeight.w800,
                color: valueColor ?? c.text,
                height: 1.1,
              ),
            ),
          ),
          if (sub != null) ...[
            const SizedBox(height: 4),
            Text(sub!, style: TextStyle(fontSize: 10.5, color: c.muted, height: 1.3)),
          ],
        ],
      ),
    );
  }
}

/// 2-column responsive stat grid.
class StatGrid extends StatelessWidget {
  const StatGrid({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: LayoutBuilder(
        builder: (context, constraints) {
          const gap = 10.0;
          final w = (constraints.maxWidth - gap) / 2;
          return Wrap(
            spacing: gap,
            runSpacing: gap,
            children: children
                .map((e) => SizedBox(width: w, child: e))
                .toList(),
          );
        },
      ),
    );
  }
}

class Pill extends StatelessWidget {
  const Pill(this.text, {super.key, this.color, this.bg, this.fontSize = 10.5});

  final String text;
  final Color? color;
  final Color? bg;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final fg = color ?? c.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg ?? fg.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: fontSize, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}

class BarTrack extends StatelessWidget {
  const BarTrack({super.key, required this.value, this.color, this.height = 8});

  final double value; // 0..1
  final Color? color;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return ClipRRect(
      borderRadius: BorderRadius.circular(99),
      child: Container(
        height: height,
        color: c.track,
        alignment: Alignment.centerLeft,
        child: FractionallySizedBox(
          widthFactor: value.clamp(0.0, 1.0).toDouble(),
          child: Container(
            decoration: BoxDecoration(
              gradient: color == null
                  ? const LinearGradient(colors: [Color(0xFFF7941E), Color(0xFFFFB04D)])
                  : null,
              color: color,
              borderRadius: BorderRadius.circular(99),
            ),
          ),
        ),
      ),
    );
  }
}

class EmptyBox extends StatelessWidget {
  const EmptyBox(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Center(
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, color: c.muted, fontStyle: FontStyle.italic),
        ),
      ),
    );
  }
}

class LoadingBox extends StatelessWidget {
  const LoadingBox({super.key, this.text = 'Loading...'});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(
        children: [
          SizedBox(
            width: 26,
            height: 26,
            child: CircularProgressIndicator(strokeWidth: 2.6, color: c.primary),
          ),
          const SizedBox(height: 12),
          Text(text, style: TextStyle(fontSize: 12, color: c.muted)),
        ],
      ),
    );
  }
}

class MessageBanner extends StatelessWidget {
  const MessageBanner(
    this.text, {
    super.key,
    this.isError = false,
  });

  final String text;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final fg = isError ? const Color(0xFFB42318) : const Color(0xFF107C41);
    final bg = isError ? const Color(0xFFFEF3F2) : const Color(0xFFECFDF3);
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: c.isDark ? fg.withValues(alpha: 0.18) : bg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: fg.withValues(alpha: 0.3)),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 12, color: c.isDark ? (isError ? const Color(0xFFFF8A80) : const Color(0xFF7EE2A8)) : fg),
      ),
    );
  }
}

// ---------------- inputs ----------------

class FilterField extends StatelessWidget {
  const FilterField({
    super.key,
    required this.label,
    required this.child,
    this.width,
  });

  final String label;
  final Widget child;
  final double? width;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return SizedBox(
      width: width,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 2, bottom: 4),
            child: Text(
              label,
              style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: c.muted),
            ),
          ),
          child,
        ],
      ),
    );
  }
}

class SearchBox extends StatelessWidget {
  const SearchBox({
    super.key,
    required this.hint,
    this.controller,
    this.onChanged,
    this.icon = Icons.search,
  });

  final String hint;
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return TextField(
      controller: controller,
      onChanged: onChanged,
      style: TextStyle(fontSize: 13.5, color: c.text),
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: Icon(icon, size: 18, color: c.muted),
      ),
    );
  }
}

class Toggle extends StatelessWidget {
  const Toggle({super.key, required this.value, required this.onChanged});

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: 46,
        height: 26,
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          color: value ? c.primary : c.track,
          borderRadius: BorderRadius.circular(99),
        ),
        child: AnimatedAlign(
          duration: const Duration(milliseconds: 180),
          alignment: value ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            width: 20,
            height: 20,
            decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
          ),
        ),
      ),
    );
  }
}

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.height = 48,
    this.expanded = true,
    this.danger = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final double height;
  final bool expanded;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final bg = danger ? const Color(0xFFE5484D) : c.primary;
    final child = SizedBox(
      height: height,
      child: FilledButton.icon(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: bg,
          foregroundColor: Colors.white,
          disabledBackgroundColor: bg.withValues(alpha: 0.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          textStyle: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
        ),
        icon: icon == null ? const SizedBox.shrink() : Icon(icon, size: 17),
        label: Text(label),
      ),
    );
    return expanded ? SizedBox(width: double.infinity, child: child) : child;
  }
}

// ---------------- tables ----------------

Widget cellText(dynamic value, {bool bold = false, Color? color, double size = 11.5}) {
  return Text(
    value == null ? '—' : value.toString(),
    style: TextStyle(
      fontSize: size,
      fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
      color: color,
    ),
  );
}

class DataTableX extends StatelessWidget {
  const DataTableX({
    super.key,
    required this.headers,
    required this.rows,
    this.footer,
    this.columnSpacing = 16,
  });

  final List<String> headers;
  final List<List<Widget>> rows;
  final List<Widget>? footer;
  final double columnSpacing;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    if (rows.isEmpty) return const EmptyBox('No records found');
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        columnSpacing: columnSpacing,
        horizontalMargin: 0,
        headingRowHeight: 30,
        dataRowMinHeight: 34,
        dataRowMaxHeight: 120,
        headingRowColor: WidgetStatePropertyAll(c.input),
        border: TableBorder(
          horizontalInside: BorderSide(color: c.line, width: 0.6),
          bottom: BorderSide(color: c.line, width: 0.6),
        ),
        columns: headers
            .map(
              (h) => DataColumn(
                label: Text(
                  h,
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: c.muted,
                  ),
                ),
              ),
            )
            .toList(),
        rows: rows
            .map(
              (r) => DataRow(
                cells: r
                    .map(
                      (w) => DataCell(
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 210),
                          child: w,
                        ),
                      ),
                    )
                    .toList(),
              ),
            )
            .toList(),
      ),
    );
  }
}

/// A compact row line (label left, value right) used in summary cards.
class KV extends StatelessWidget {
  const KV(this.label, this.value, {super.key, this.color, this.bold = true});

  final String label;
  final String value;
  final Color? color;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(
            child: Text(label, style: TextStyle(fontSize: 11.5, color: c.muted)),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 12,
              fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
              color: color ?? c.text,
            ),
          ),
        ],
      ),
    );
  }
}

class TabScroll extends StatelessWidget {
  const TabScroll({
    super.key,
    required this.onRefresh,
    required this.children,
  });

  final Future<void> Function() onRefresh;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return RefreshIndicator(
      color: c.primary,
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 132),
        children: children,
      ),
    );
  }
}

class Segmented extends StatelessWidget {
  const Segmented({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
  });

  final List<String> options;
  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.line),
      ),
      child: Row(
        children: List.generate(options.length, (i) {
          final active = i == value;
          return Expanded(
            child: GestureDetector(
              onTap: () => onChanged(i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 160),
                padding: const EdgeInsets.symmetric(vertical: 9),
                decoration: BoxDecoration(
                  color: active ? c.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  options[i],
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: active ? Colors.white : c.muted,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class PillTabs extends StatelessWidget {
  const PillTabs({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
  });

  final List<String> options;
  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return SizedBox(
      height: 34,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: options.length,
        separatorBuilder: (_, __) => const SizedBox(width: 6),
        itemBuilder: (context, i) {
          final active = i == value;
          return GestureDetector(
            onTap: () => onChanged(i),
            child: Container(
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: active ? c.primary : c.input,
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: active ? c.primary : c.line),
              ),
              child: Text(
                options[i],
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  color: active ? Colors.white : c.muted,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
