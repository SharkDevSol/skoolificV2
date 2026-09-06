import 'package:flutter/material.dart';
import 'package:loading_animation_widget/loading_animation_widget.dart';
import '../core/theme/app_theme.dart';

/// A consistent rounded surface card used across the app.
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final VoidCallback? onTap;
  final double radius;
  final double opacity;

  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.color,
    this.onTap,
    this.radius = AppRadius.lg,
    this.opacity = 1.0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = color ?? (isDark ? const Color(0xFF1E1E1E) : AppColors.surface);
    return GestureDetector(
      onTap: onTap,
      child: Opacity(
        opacity: opacity,
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: surface,
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(color: isDark ? const Color(0xFF2C2C2C) : AppColors.border),
            boxShadow: isDark ? [] : const [softShadow],
          ),
          child: child,
        ),
      ),
    );
  }
}

class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final bool expanded;

  const PrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.loading = false,
    this.expanded = true,
  });

  @override
  Widget build(BuildContext context) {
    final btn = ElevatedButton(
      onPressed: loading ? null : onPressed,
      child: loading
          ? SizedBox(
              height: 20,
              width: 40,
              child: LoadingAnimationWidget.staggeredDotsWave(
                color: Colors.white,
                size: 20,
              ),
            )
          : Text(label),
    );
    if (!expanded) return btn;
    return SizedBox(width: double.infinity, child: btn);
  }
}

class SectionTitle extends StatelessWidget {
  final String text;
  final Widget? action;
  const SectionTitle(this.text, {super.key, this.action});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 16, left: 4, right: 4),
        child: Row(
          children: [
            Expanded(
              child: Text(
                text,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            if (action != null) action!,
          ],
        ),
      );
}

class SectionHeader extends StatelessWidget {
  final String text;
  final Widget? action;
  const SectionHeader(this.text, {super.key, this.action});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12, left: 4, right: 4),
        child: Row(
          children: [
            Expanded(
              child: Text(
                text,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
            if (action != null) action!,
          ],
        ),
      );
}

class AppTextField extends StatelessWidget {
  final String label;
  final String hint;
  final TextEditingController controller;
  final bool obscure;
  final VoidCallback? onToggle;
  final bool isPassword;

  AppTextField({
    super.key,
    this.label = '',
    this.hint = '',
    TextEditingController? controller,
    this.obscure = false,
    this.onToggle,
    this.isPassword = false,
  }) : controller = controller ?? _EmptyController();

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (label.isNotEmpty) ...[
            Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
          ],
          TextField(
            controller: controller is _EmptyController ? null : controller,
            obscureText: obscure || isPassword,
            decoration: InputDecoration(
              hintText: hint.isNotEmpty ? hint : label,
              filled: true,
              fillColor: AppColors.surface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(50),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(50),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(50),
                borderSide: const BorderSide(color: AppColors.primary, width: 2),
              ),
              suffixIcon: onToggle != null
                  ? IconButton(
                      icon: Icon(
                        obscure ? Icons.visibility_off : Icons.visibility,
                        color: AppColors.textMuted,
                      ),
                      onPressed: onToggle,
                    )
                  : null,
            ),
          ),
        ],
      );
}

class _EmptyController extends TextEditingController {
  _EmptyController() : super();
}

class StatusPill extends StatelessWidget {
  final String label;
  final Color color;
  final Color bg;
  const StatusPill(this.label, {super.key, required this.color, required this.bg});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: color,
            letterSpacing: 0.4,
          ),
        ),
      );
}

/// Loading indicator using staggeredDotsWave - adapts to dark/light mode
class AppLoadingIndicator extends StatelessWidget {
  const AppLoadingIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Center(
      child: LoadingAnimationWidget.staggeredDotsWave(
        color: isDark ? Colors.white : AppColors.primary,
        size: 40,
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  const EmptyState({super.key, required this.icon, required this.message});

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: const BoxDecoration(
                  color: AppColors.primarySoft,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 34, color: AppColors.primary),
              ),
              const SizedBox(height: 16),
              Text(
                message,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
}

class AvatarCircle extends StatelessWidget {
  final String? name;
  final String? imageUrl;
  final double size;
  final Color bg;

  const AvatarCircle({
    super.key,
    this.name,
    this.imageUrl,
    this.size = 44,
    this.bg = AppColors.primaryLight,
  });

  @override
  Widget build(BuildContext context) {
    final initial = (name != null && name!.isNotEmpty) ? name![0].toUpperCase() : '?';
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: bg,
      backgroundImage: imageUrl != null ? NetworkImage(imageUrl!) : null,
      child: imageUrl == null
          ? Text(initial, style: TextStyle(fontSize: size * 0.4, fontWeight: FontWeight.bold, color: AppColors.primary))
          : null,
    );
  }
}

void showError(BuildContext context, String message) {
  final messenger = ScaffoldMessenger.of(context);
  messenger.showSnackBar(
    SnackBar(
      content: SizedBox(
        width: 340,
        child: Text(message),
      ),
      backgroundColor: AppColors.danger,
      behavior: SnackBarBehavior.floating,
      margin: const EdgeInsets.only(bottom: 16, left: 16, right: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
    ),
  );
}

void showSuccess(BuildContext context, String message) {
  final messenger = ScaffoldMessenger.of(context);
  messenger.showSnackBar(
    SnackBar(
      content: SizedBox(
        width: 340,
        child: Text(message),
      ),
      backgroundColor: AppColors.success,
      behavior: SnackBarBehavior.floating,
      margin: const EdgeInsets.only(bottom: 16, left: 16, right: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
    ),
  );
}

/// Skeleton loading card - now uses staggeredDotsWave instead of shimmer
class SkeletonCard extends StatelessWidget {
  final double height;
  const SkeletonCard({super.key, this.height = 120});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      height: height,
      alignment: Alignment.center,
      child: LoadingAnimationWidget.staggeredDotsWave(
        color: isDark ? Colors.white : AppColors.primary,
        size: 40,
      ),
    );
  }
}

class GradientBackground extends StatelessWidget {
  final Widget child;
  const GradientBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    // 10.3: modern brand background — subtle maroon glow top, warm cream bottom
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          stops: const [0.0, 0.35, 1.0],
          colors: isDark
              ? [
                  const Color(0xFF2A1412),
                  const Color(0xFF151515),
                  const Color(0xFF0D0D0D),
                ]
              : [
                  AppColors.primaryLight.withValues(alpha: 0.55),
                  const Color(0xFFFBF7F5),
                  const Color(0xFFF5EFEA),
                ],
        ),
      ),
      child: child,
    );
  }
}
