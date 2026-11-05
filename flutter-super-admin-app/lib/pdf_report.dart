import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';

import 'ui.dart';

final _red = PdfColor.fromInt(0xFF8B1A1A);
final _gold = PdfColor.fromInt(0xFFF7941E);
final _ink = PdfColor.fromInt(0xFF1E293B);

/// Builds the monthly payment PDF and hands it to the Android share sheet.
Future<void> exportFinancePdf(Map<String, dynamic> f, String branch) async {
  final doc = pw.Document(title: 'IQRA Monthly Payment Report');
  final now = DateTime.now();
  final stamp =
      '${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}_${now.hour.toString().padLeft(2, '0')}${now.minute.toString().padLeft(2, '0')}';
  final branchName = branch == 'ALL' ? 'All Branches (IQRA2 - IQRA5)' : branch;
  final branches = activeBranches(f);
  final unpaid = mapList(f['unpaidStudents']);
  final fees = mapList(f['feeSchedule']);

  final rate = _pct(f['grandCollectedUnlocked'] ?? f['grandCollected'], f['grandExpected']);
  final m1Rate = _pct(f['grandM1Collected'], f['grandM1Expected']);
  final m2Rate = _pct(f['grandM2Collected'], f['grandM2Expected']);

  pw.TextStyle st(double size, {bool bold = false, PdfColor? color}) => pw.TextStyle(
        fontSize: size,
        fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
        color: color ?? _ink,
      );

  pw.Widget section(String title) => pw.Padding(
        padding: const pw.EdgeInsets.only(top: 14, bottom: 6),
        child: pw.Text(
          title,
          style: st(11, bold: true, color: _red),
        ),
      );

  pw.Widget table(List<String> headers, List<List<String>> data,
      {Map<int, pw.TableColumnWidth>? widths}) {
    return pw.TableHelper.fromTextArray(
      headers: headers,
      data: data,
      border: pw.TableBorder.all(color: PdfColor.fromInt(0xFFD9D9D9), width: 0.5),
      headerDecoration: pw.BoxDecoration(color: _red),
      headerStyle: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold, color: PdfColors.white),
      cellStyle: st(7),
      cellPadding: const pw.EdgeInsets.symmetric(horizontal: 3, vertical: 3),
      headerAlignment: pw.Alignment.centerLeft,
      cellAlignment: pw.Alignment.centerLeft,
      columnWidths: widths,
      oddRowDecoration: pw.BoxDecoration(color: PdfColor.fromInt(0xFFFAF7F5)),
    );
  }

  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4.landscape,
      margin: const pw.EdgeInsets.fromLTRB(28, 28, 28, 26),
      header: (ctx) => pw.Container(
        margin: const pw.EdgeInsets.only(bottom: 10),
        padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: pw.BoxDecoration(
          color: _red,
          border: pw.Border(bottom: pw.BorderSide(color: _gold, width: 2.5)),
        ),
        child: pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Expanded(
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(
                    'IQRA EDUCATIONAL COMPLEX',
                    style: pw.TextStyle(fontSize: 15, fontWeight: pw.FontWeight.bold, color: PdfColors.white),
                  ),
                  pw.SizedBox(height: 2),
                  pw.Text(
                    'SUPER ADMIN MONTHLY PAYMENT & FEE AUDIT REPORT',
                    style: pw.TextStyle(fontSize: 8, color: PdfColor.fromInt(0xFFFFD9A0)),
                  ),
                ],
              ),
            ),
            pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.end,
              children: [
                pw.Text(branchName, style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.white)),
                pw.SizedBox(height: 2),
                pw.Text(
                  'Academic Year: ${f['academicYear'] ?? '2019 E.C.'}  |  Month: ${f['currentEthMonthName'] ?? 'Tikimt'}',
                  style: pw.TextStyle(fontSize: 7, color: PdfColor.fromInt(0xFFFFE7C2)),
                ),
                pw.Text(
                  'Generated: ${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')} '
                  '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}',
                  style: pw.TextStyle(fontSize: 7, color: PdfColor.fromInt(0xFFFFE7C2)),
                ),
              ],
            ),
          ],
        ),
      ),
      footer: (ctx) => pw.Container(
        margin: const pw.EdgeInsets.only(top: 6),
        child: pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text('IQRA Super Admin · Confidential', style: st(6.5, color: PdfColor.fromInt(0xFF6B7280))),
            pw.Text('Page ${ctx.pageNumber} of ${ctx.pagesCount}', style: st(6.5, color: PdfColor.fromInt(0xFF6B7280))),
          ],
        ),
      ),
      build: (ctx) => [
        section('1. Executive Financial & Enrollment Summary'),
        table(
          ['Metric', 'Value', 'Financial Metric', 'Amount (ETB)'],
          [
            [
              'Total Active Enrolled Students',
              '${fmt(f['grandStudents'])} students',
              'Total Fee Collected to Date',
              '${fmt(f['grandCollected'])} ETB',
            ],
            [
              'Old / New / Unassigned',
              '${fmt(f['grandOld'])} old  |  ${fmt(f['grandNew'])} new  |  ${fmt(f['grandUnassigned'])} unassigned',
              'Unlocked Due Outstanding (M1-M2)',
              '${fmt(f['grandPendingUnlocked'] ?? f['grandPending'])} ETB',
            ],
            [
              'Paying vs Free Students',
              '${fmt(f['grandPayingStudents'])} paying  |  ${fmt(f['grandFreeStudents'])} free',
              'Advance Prepayments',
              '${fmt(f['grandAdvance'])} ETB',
            ],
            [
              'Unpaid Students (unlocked)',
              '${fmt(f['grandUnpaidUnlocked'])} students',
              'Collected Today',
              '${fmt(f['grandCollectedToday'])} ETB',
            ],
            [
              'Collection Rate (unlocked period)',
              '$rate%',
              'Outstanding (all months)',
              '${fmt(f['grandPendingAll'])} ETB',
            ],
          ],
          widths: {
            0: const pw.FlexColumnWidth(3),
            1: const pw.FlexColumnWidth(3),
            2: const pw.FlexColumnWidth(3),
            3: const pw.FlexColumnWidth(2),
          },
        ),
        section('2. Month-by-Month Target & Collection Performance'),
        table(
          ['Month', 'Status', 'Expected (ETB)', 'Collected (ETB)', 'Pending (ETB)', 'Rate'],
          [
            [
              'Month 1: Meskerem (Tuition + Registration)',
              'Unlocked (Due)',
              fmt(f['grandM1Expected']),
              fmt(f['grandM1Collected']),
              fmt((f['grandM1Expected'] ?? 0) - (f['grandM1Collected'] ?? 0)),
              '$m1Rate%',
            ],
            [
              'Month 2: Tikimt (Monthly Tuition)',
              'Unlocked (Due)',
              fmt(f['grandM2Expected']),
              fmt(f['grandM2Collected']),
              fmt((f['grandM2Expected'] ?? 0) - (f['grandM2Collected'] ?? 0)),
              '$m2Rate%',
            ],
            [
              'Months 3 to 9: Prepayments',
              'Locked (Prepaid)',
              '-',
              fmt(f['grandAdvance']),
              '-',
              'Advance',
            ],
            [
              'TOTAL UNLOCKED (M1 & M2)',
              'Current horizon',
              fmt(f['grandExpectedUnlocked'] ?? f['grandExpected']),
              fmt(f['grandCollectedUnlocked'] ?? f['grandCollected']),
              fmt(f['grandPendingUnlocked'] ?? f['grandPending']),
              '$rate%',
            ],
          ],
        ),
        if (fees.isNotEmpty) ...[
          section('3. Approved Standard Fee Structure'),
          table(
            ['Category', 'Classes', 'Monthly Fee', 'Old Reg', 'New Reg', 'M1 Total (Old)', 'M1 Total (New)'],
            fees
                .map((e) => [
                      (e['category'] ?? '').toString(),
                      (e['classes'] ?? '').toString(),
                      '${fmt(e['monthlyFee'])} ETB',
                      '${fmt(e['oldRegFee'])} ETB',
                      '${fmt(e['newRegFee'])} ETB',
                      '${fmt(e['m1Old'])} ETB',
                      '${fmt(e['m1New'])} ETB',
                    ])
                .toList(),
          ),
        ],
        section('4. Branch Collection Summary'),
        table(
          ['Branch', 'Students', 'Old', 'New', 'Collected (ETB)', 'Outstanding (ETB)', 'Advance (ETB)', 'Rate'],
          branches
              .map((b) => [
                    (b['branchName'] ?? b['branchCode']).toString(),
                    fmt(b['totalStudents']),
                    fmt(b['oldStudents']),
                    fmt(b['newStudents']),
                    fmt(b['collected']),
                    fmt(b['pendingUnlocked'] ?? b['pending']),
                    fmt(b['advanceCollected']),
                    '${b['rate'] ?? 0}%',
                  ])
              .toList(),
          widths: {
            0: const pw.FlexColumnWidth(3),
            1: const pw.FlexColumnWidth(1.1),
            2: const pw.FlexColumnWidth(1),
            3: const pw.FlexColumnWidth(1),
            4: const pw.FlexColumnWidth(1.7),
            5: const pw.FlexColumnWidth(1.7),
            6: const pw.FlexColumnWidth(1.4),
            7: const pw.FlexColumnWidth(0.9),
          },
        ),
        if (unpaid.isNotEmpty) ...[
          section('5. Outstanding Unpaid Students (${unpaid.length})'),
          table(
            ['#', 'Branch', 'Class', 'Student', 'Months', 'Unpaid Months', 'Due (ETB)'],
            List.generate(unpaid.length, (i) {
              final s = unpaid[i];
              final months = s['unpaidMonths'];
              return [
                '${i + 1}',
                (s['branch'] ?? '').toString(),
                (s['class'] ?? '').toString(),
                (s['studentName'] ?? '').toString(),
                '${s['unpaidMonthsCount'] ?? 0}',
                months is List ? months.join(', ') : '—',
                fmt(s['totalDue']),
              ];
            }),
            widths: {
              0: const pw.FlexColumnWidth(0.6),
              1: const pw.FlexColumnWidth(2.2),
              2: const pw.FlexColumnWidth(0.9),
              3: const pw.FlexColumnWidth(4),
              4: const pw.FlexColumnWidth(0.9),
              5: const pw.FlexColumnWidth(2),
              6: const pw.FlexColumnWidth(1.4),
            },
          ),
        ],
        for (final b in branches) ...[
          section('6. ${b['branchName']} — Class Breakdown'),
          table(
            ['Class', 'Total', 'Old', 'New', 'Paying', 'Monthly Fee', 'M1 Paid', 'M2 Paid', 'Unpaid', 'Expected', 'Collected', 'Rate'],
            mapList(b['classes'])
                .where((x) => toNum(x['totalStudents']) > 0)
                .map((c) => [
                      (c['className'] ?? '').toString(),
                      fmt(c['totalStudents']),
                      fmt(c['oldStudents']),
                      fmt(c['newStudents']),
                      fmt(c['payingStudents']),
                      fmt(c['monthlyFee']),
                      fmt(c['m1PaidCount']),
                      fmt(c['m2PaidCount']),
                      fmt(c['unpaidUnlockedCount']),
                      fmt(c['expectedUnlocked'] ?? c['expected']),
                      fmt(c['collectedUnlocked'] ?? c['collected']),
                      '${c['rate'] ?? 0}%',
                    ])
                .toList(),
          ),
        ],
      ],
    ),
  );

  final bytes = await doc.save();
  final dir = await getTemporaryDirectory();
  final file = File('${dir.path}/Iqra_Monthly_Payment_Report_$stamp.pdf');
  await file.writeAsBytes(bytes, flush: true);
  await Share.shareXFiles([XFile(file.path)]);
}

int _pct(dynamic a, dynamic b) {
  final x = toNum(a).toDouble();
  final y = toNum(b).toDouble();
  return y == 0 ? 0 : ((x / y) * 100).round();
}
