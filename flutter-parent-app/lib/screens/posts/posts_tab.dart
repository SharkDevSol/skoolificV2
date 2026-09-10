import 'package:flutter/material.dart';
import '../../core/l10n/app_localizations.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../core/services/storage_service.dart';
import '../../app/app_provider.dart';
import '../../widgets/app_widgets.dart';
import '../../models/models.dart';

class PostsTab extends StatefulWidget {
  const PostsTab({super.key});
  @override
  State<PostsTab> createState() => _PostsTabState();
}

class _PostsTabState extends State<PostsTab> {
  List<Post> _posts = [];
  bool _loading = true;
  // 4.1: local like state per post id (optimistic UI)
  final Set<String> _likedIds = {};

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    final app = Provider.of<AppProvider>(context, listen: false);
    // 4.1: show cached posts instantly (offline-safe), then refresh
    if (_posts.isEmpty && app.allPosts.isNotEmpty) {
      if (mounted) {
        setState(() {
          _posts = app.allPosts;
          _loading = false;
        });
      }
    }
    // 4.1 fix: fetch by BRANCH/school id from stored branch code (works even
    // before wards load) or from the selected ward
    final schoolId = app.selectedWard?.schoolId ??
        app.user?.branchCode ??
        StorageService.branchCode ??
        (app.wards.isNotEmpty ? app.wards[0].schoolId : '');
    if (schoolId.isEmpty) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final fresh = await ApiService().guardianPosts(schoolId);
      if (mounted) {
        setState(() {
          _posts = fresh;
          _loading = false;
        });
      }
    } catch (_) {
      // offline: keep cached posts
      if (mounted) setState(() => _loading = false);
    }
  }

  // 4.1: like a post — POST to /api/posts/{id}/like with optimistic UI
  Future<void> _likePost(Post post, String baseUrl) async {
    if (_likedIds.contains(post.id)) return;
    setState(() => _likedIds.add(post.id));
    try {
      await ApiService().likePost(post.id);
      setState(() {
        _posts = _posts
            .map((p) => p.id == post.id
                ? Post(
                    id: p.id,
                    title: p.title,
                    body: p.body,
                    authorName: p.authorName,
                    authorImage: p.authorImage,
                    image: p.image,
                    likes: p.likes + 1,
                    liked: true,
                    createdAt: p.createdAt,
                  )
                : p)
            .toList();
      });
    } catch (_) {
      if (mounted) {
        setState(() => _likedIds.remove(post.id));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not like — check connection'), duration: Duration(seconds: 2)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = Provider.of<AppProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return RefreshIndicator(
      onRefresh: _fetch,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SectionTitle(tr(context, 'posts')),
          if (_loading)
            const Column(children: [
              SizedBox(height: 24),
              SkeletonCard(height: 200),
              SizedBox(height: 14),
              SkeletonCard(height: 200),
            ])
          else if (_posts.isEmpty)
            EmptyState(icon: Icons.article_outlined, message: tr(context, 'no_posts'))
          else
            ..._posts.map((p) {
              final liked = _likedIds.contains(p.id) || p.liked;
              return Container(
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E1E1E) : AppColors.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: isDark ? const Color(0xFF2C2C2C) : AppColors.border),
                  boxShadow: isDark ? [] : const [softShadow],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 4.1: image with proper full URL + graceful fallback
                    if (p.image != null && p.image!.isNotEmpty)
                      // FIX 4: tap image -> fullscreen zoomable viewer
                      ClipRRect(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                        child: GestureDetector(
                          onTap: () => _openImageFullscreen(context, p.image!),
                          child: _PostImage(url: p.image!),
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              AvatarCircle(name: p.authorName ?? 'S', size: 34),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(p.authorName ?? 'School',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                      color: isDark ? Colors.white : AppColors.text,
                                    )),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          if (p.title.isNotEmpty)
                            Text(p.title,
                                style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 16,
                                    color: isDark ? Colors.white : AppColors.text)),
                          const SizedBox(height: 6),
                          Text(p.body,
                              style: TextStyle(
                                  color: isDark ? Colors.white70 : AppColors.textSecondary,
                                  fontSize: 14,
                                  height: 1.5)),
                          const SizedBox(height: 12),
                          // 4.1: functional like button
                          InkWell(
                            borderRadius: BorderRadius.circular(20),
                            onTap: () => _likePost(p, ''),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    liked ? Icons.favorite : Icons.favorite_outline,
                                    size: 20,
                                    color: liked ? AppColors.danger : (isDark ? Colors.white54 : AppColors.textMuted),
                                  ),
                                  const SizedBox(width: 6),
                                  Text('${p.likes + (liked && !p.liked ? 1 : 0)}',
                                      style: TextStyle(
                                        color: isDark ? Colors.white54 : AppColors.textMuted,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                      )),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
          const SizedBox(height: 100),
        ],
      ),
    );
  }
}

/// 4.1: post image — resolves relative URLs to the server, dark-friendly placeholder
class _PostImage extends StatelessWidget {
  final String url;
  const _PostImage({required this.url});

  String get resolved {
    if (url.startsWith('http')) return url;
    // relative like /Uploads/posts/xyz.jpg
    return 'https://iqra.skoolific.com$url';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Image.network(
      resolved,
      height: 170,
      width: double.infinity,
      fit: BoxFit.cover,
      loadingBuilder: (ctx, child, progress) {
        if (progress == null) return child;
        return Container(
          height: 170,
          color: isDark ? const Color(0xFF2A2A2A) : AppColors.surfaceAlt,
          child: const Center(child: AppLoadingIndicator()),
        );
      },
      errorBuilder: (_, __, ___) => Container(
        height: 120,
        color: isDark ? const Color(0xFF2A2A2A) : AppColors.surfaceAlt,
        child: Icon(Icons.image_not_supported_outlined,
            size: 40, color: isDark ? Colors.white24 : AppColors.textMuted),
      ),
    );
  }
}


/// FIX 4: fullscreen image viewer with pinch-to-zoom + double-tap
void _openImageFullscreen(BuildContext context, String imageUrl) {
  final resolved =
      imageUrl.startsWith('http') ? imageUrl : 'https://iqra.skoolific.com$imageUrl';
  Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => _FullscreenImage(url: resolved),
    ),
  );
}

class _FullscreenImage extends StatelessWidget {
  final String url;
  const _FullscreenImage({required this.url});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 0.5,
          maxScale: 5,
          child: Image.network(
            url,
            fit: BoxFit.contain,
            width: double.infinity,
            height: double.infinity,
            errorBuilder: (_, __, ___) => const Icon(
                Icons.broken_image_outlined, color: Colors.white38, size: 64),
          ),
        ),
      ),
    );
  }
}
