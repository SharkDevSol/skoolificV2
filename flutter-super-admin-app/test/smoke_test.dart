import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:super_admin_app/login_page.dart';
import 'package:super_admin_app/theme.dart';
import 'package:super_admin_app/ui.dart';

void main() {
  test('toNum parses postgres aggregate strings', () {
    expect(toNum('58'), 58);
    expect(toNum(null), 0);
    expect(toNum(12.5), 12.5);
  });

  testWidgets('login screen renders with remember me', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(
      MaterialApp(
        theme: appTheme(false),
        home: LoginPage(
          dark: false,
          onThemeToggle: () {},
          onLoggedIn: () {},
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('IQRA Super Admin'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
    expect(find.text('Remember me'), findsOneWidget);
  });
}
