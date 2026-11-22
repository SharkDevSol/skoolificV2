import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/app_theme.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/constants/api_constants.dart';
import '../../core/services/api_service.dart';
import '../../core/services/offline_service.dart';
import '../../widgets/app_widgets.dart';
import '../../models/models.dart';

class PostsTab extends StatefulWidget {
  const PostsTab({super.key});

  @override
  State<PostsTab> createState() => _PostsTabState();
}

class _PostsTabState extends State<PostsTab> {
  bool _loading = false;
  List<Post> _posts = [];

  @override
  void initState() {
    super.initState();
    final cached = OfflineService.readCache<List>('posts_feed');
    if (cached != null && cached.isNotEmpty) {
      _posts = cached
          .map((p) => Post.fromJson(Map<String, dynamic>.from(p as Map)))
          .toList();
    }
    _fetchPosts();
  }

  Future<void> _fetchPosts() async {
    setState(() => _loading = true);
    try {
      final posts = await ApiService().getPosts();
      if (mounted) setState(() => _posts = posts);
      await OfflineService.cache(
          'posts_feed', posts.map((p) => p.toJson()).toList());
    } catch (_) {}
    finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleLike(Post post) async {
    setState(() {
      post.isLiked = !post.isLiked;
      post.likes += post.isLiked ? 1 : -1;
    });
    await ApiService().likePost(post.id);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _fetchPosts,
        child: _loading && _posts.isEmpty
            ? const Center(child: AppLoadingIndicator())
            : _posts.isEmpty
                ? EmptyState(
                    icon: Icons.article_outlined,
                    message: tr(context, 'no_posts'),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    itemCount: _posts.length,
                    itemBuilder: (context, idx) {
                      final post = _posts[idx];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        child: AppCard(
                          padding: const EdgeInsets.all(18),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Author row
                              Row(
                                children: [
                                  AvatarCircle(name: post.authorName ?? 'Admin', size: 38),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          post.authorName ?? 'IQRA Administration',
                                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                                        ),
                                        Text(
                                          post.createdAt.split('T')[0],
                                          style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppColors.primarySoft,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Text(
                                      'Official',
                                      style: TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),

                              // Post Title
                              Text(
                                post.title,
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, height: 1.3),
                              ),
                              const SizedBox(height: 8),

                              // Post Body
                              Text(
                                post.body,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: isDark ? Colors.white70 : AppColors.text,
                                  height: 1.5,
                                ),
                              ),

                              // Image Attachment if present
                              if (post.mediaUrls.isNotEmpty) ...[
                                const SizedBox(height: 12),
                                if (post.hasImage)
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(14),
                                    child: CachedNetworkImage(
                                      imageUrl:
                                          ApiConstants.attachmentUrl(post.mediaUrls.first),
                                      fit: BoxFit.cover,
                                      width: double.infinity,
                                      height: 200,
                                      placeholder: (_, __) => const SkeletonCard(height: 200),
                                      errorWidget: (_, __, ___) => const SizedBox(),
                                    ),
                                  )
                                else
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: AppColors.surfaceAlt,
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.attach_file, size: 18),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            post.media.first['originalname']?.toString() ??
                                                post.mediaUrls.first,
                                            style: const TextStyle(
                                                fontSize: 13, fontWeight: FontWeight.w600),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                              ],
                              const SizedBox(height: 14),

                              // Actions: Like, Comment count
                              Row(
                                children: [
                                  GestureDetector(
                                    onTap: () => _handleLike(post),
                                    child: Row(
                                      children: [
                                        Icon(
                                          post.isLiked ? Icons.favorite : Icons.favorite_border,
                                          color: post.isLiked ? AppColors.danger : AppColors.textMuted,
                                          size: 20,
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          '${post.likes}',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: post.isLiked ? AppColors.danger : AppColors.textSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 24),
                                  Row(
                                    children: [
                                      const Icon(Icons.chat_bubble_outline, size: 18, color: AppColors.textMuted),
                                      const SizedBox(width: 6),
                                      Text(
                                        '${post.comments}',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSecondary),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
