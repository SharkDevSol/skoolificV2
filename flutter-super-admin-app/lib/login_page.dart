import 'package:flutter/material.dart';

import 'api.dart';
import 'l10n.dart';
import 'theme.dart';
import 'ui.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({
    super.key,
    required this.dark,
    required this.onThemeToggle,
    required this.onLoggedIn,
  });

  final bool dark;
  final VoidCallback onThemeToggle;
  final VoidCallback onLoggedIn;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _user = TextEditingController();
  final _pass = TextEditingController();
  final _passFocus = FocusNode();
  bool _remember = true;
  bool _loading = false;
  bool _obscure = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPrefs();
  }

  Future<void> _loadPrefs() async {
    final remember = await Api.getRemember();
    final user = await Api.getRememberUser();
    if (!mounted) return;
    setState(() {
      _remember = remember;
      _user.text = user;
    });
  }

  @override
  void dispose() {
    _user.dispose();
    _pass.dispose();
    _passFocus.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_loading) return;
    final u = _user.text.trim();
    final p = _pass.text;
    if (u.isEmpty || p.isEmpty) {
      setState(() => _error = 'Enter your username and password');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    final err = await Api.login(u, p);
    if (!mounted) return;
    if (err == null) {
      await Api.saveRemember(_remember, u);
      if (!mounted) return;
      widget.onLoggedIn();
    } else {
      setState(() {
        _loading = false;
        _error = err;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: widget.dark
                ? const [Color(0xFF170F0D), Color(0xFF2A1010), Color(0xFF170F0D)]
                : const [Color(0xFF8B1A1A), Color(0xFFB21E23), Color(0xFF7E1418)],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              Positioned(
                top: 8,
                right: 8,
                child: IconButton(
                  onPressed: widget.onThemeToggle,
                  tooltip: 'Toggle theme',
                  icon: Icon(
                    widget.dark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                    color: Colors.white.withValues(alpha: 0.85),
                  ),
                ),
              ),
              Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 60, 20, 28),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(22, 26, 22, 22),
                      decoration: BoxDecoration(
                        color: c.card,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: widget.dark ? c.line : Colors.white.withValues(alpha: 0.6),
                        ),
                        boxShadow: const [
                          BoxShadow(color: Color(0x40000000), blurRadius: 34, offset: Offset(0, 16)),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Center(
                            child: Container(
                              width: 58,
                              height: 58,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFFF7941E), Color(0xFFFFB04D)],
                                ),
                                borderRadius: BorderRadius.circular(18),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x55F7941E),
                                    blurRadius: 16,
                                    offset: Offset(0, 6),
                                  ),
                                ],
                              ),
                              child: const Text(
                                'I',
                                style: TextStyle(
                                  color: Color(0xFF8B1A1A),
                                  fontSize: 28,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'IQRA ${T.t('appName')}',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 21,
                              fontWeight: FontWeight.w800,
                              color: c.text,
                              letterSpacing: 0.2,
                            ),
                          ),
                          const SizedBox(height: 5),
                          Text(
                            T.t('loginSub'),
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 12.5, color: c.muted, height: 1.4),
                          ),
                          const SizedBox(height: 20),
                          if (_error != null) ...[
                            MessageBanner(_error!, isError: true),
                          ],
                          TextField(
                            controller: _user,
                            textInputAction: TextInputAction.next,
                            autocorrect: false,
                            style: TextStyle(fontSize: 15, color: c.text),
                            decoration: InputDecoration(
                              hintText: T.t('username'),
                              prefixIcon: Icon(Icons.person_outline_rounded, size: 20, color: c.muted),
                            ),
                            onSubmitted: (_) => _passFocus.requestFocus(),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _pass,
                            focusNode: _passFocus,
                            obscureText: _obscure,
                            textInputAction: TextInputAction.done,
                            style: TextStyle(fontSize: 15, color: c.text),
                            decoration: InputDecoration(
                              hintText: T.t('password'),
                              prefixIcon: Icon(Icons.lock_outline_rounded, size: 20, color: c.muted),
                              suffixIcon: IconButton(
                                onPressed: () => setState(() => _obscure = !_obscure),
                                icon: Icon(
                                  _obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                  size: 19,
                                  color: c.muted,
                                ),
                              ),
                            ),
                            onSubmitted: (_) => _submit(),
                          ),
                          const SizedBox(height: 6),
                          InkWell(
                            onTap: () => setState(() => _remember = !_remember),
                            borderRadius: BorderRadius.circular(8),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 2),
                              child: Row(
                                children: [
                                  SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: Checkbox(
                                      value: _remember,
                                      onChanged: (v) => setState(() => _remember = v ?? false),
                                      activeColor: c.primary,
                                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                      visualDensity: VisualDensity.compact,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Remember me',
                                    style: TextStyle(fontSize: 13, color: c.muted),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            height: 52,
                            child: FilledButton(
                              onPressed: _loading ? null : _submit,
                              style: FilledButton.styleFrom(
                                backgroundColor: c.primary,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              ),
                              child: _loading
                                  ? const SizedBox(
                                      width: 22,
                                      height: 22,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.4,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Text(
                                      T.t('signIn'),
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.2,
                                      ),
                                    ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Text(
                            'IQRA Schools · Super Admin',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 10.5, color: c.muted.withValues(alpha: 0.8)),
                          ),
                        ],
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
}
