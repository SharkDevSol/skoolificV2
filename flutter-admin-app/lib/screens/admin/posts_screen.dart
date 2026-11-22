import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:provider/provider.dart';
import '../../app/app_provider.dart';
import '../../core/constants/api_constants.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';

class AdminPostsScreen extends StatefulWidget {
  const AdminPostsScreen({super.key});
  @override
  State<AdminPostsScreen> createState() => _AdminPostsScreenState();
}

class _AdminPostsScreenState extends State<AdminPostsScreen> {
  List<Map<String, dynamic>> _posts = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final posts = await ApiService().getAdminPosts();
      if (!mounted) return;
      setState(() { _posts = posts; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  bool _isVideo(String path) {
    final p = path.toLowerCase();
    return p.endsWith('.mp4') || p.endsWith('.mov') || p.endsWith('.mkv') || p.endsWith('.avi') || p.endsWith('.webm') || p.endsWith('.m4v');
  }

  bool _isImage(String path) {
    final p = path.toLowerCase();
    return p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.png') || p.endsWith('.gif') || p.endsWith('.webp') || p.endsWith('.heic');
  }

  Future<void> _pickImages(List<String> media, StateSetter setSheet) async {
    final picked = await ImagePicker().pickMultiImage(imageQuality: 88);
    if (picked.isEmpty) return;
    setSheet(() => media.addAll(picked.map((f) => f.path)));
  }

  Future<void> _pickVideo(List<String> media, StateSetter setSheet) async {
    final picked = await ImagePicker().pickVideo(source: ImageSource.gallery);
    if (picked == null) return;
    final size = await File(picked.path).length();
    if (size > 200 * 1024 * 1024) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Video is larger than 200 MB.'), backgroundColor: AppColors.danger,
        ));
      }
      return;
    }
    setSheet(() => media.add(picked.path));
  }

  Future<void> _pickFile(List<String> media, StateSetter setSheet) async {
    final picked = await FilePicker.pickFiles();
    if (picked.isEmpty) return;
    for (final file in picked) {
      final path = file.path;
      if (path == null) continue;
      final size = await File(path).length();
      if (size > 50 * 1024 * 1024) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('${file.name} is larger than 50 MB.'),
            backgroundColor: AppColors.danger,
          ));
        }
        continue;
      }
      setSheet(() => media.add(path));
    }
  }

  Future<void> _edit([Map<String, dynamic>? post]) async {
    final app = Provider.of<AppProvider>(context, listen: false);
    final titleCtrl = TextEditingController(text: '${post?['title'] ?? ''}');
    final bodyCtrl = TextEditingController(text: '${post?['body'] ?? ''}');
    final linkCtrl = TextEditingController(text: '${post?['link'] ?? ''}');
    final media = <String>[];
    String audience = 'all';
    final aud = post?['audiences'];
    if (aud is List && aud.isNotEmpty) audience = '${aud.first}';
    final existingMedia = (post?['media'] is List)
        ? (post!['media'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList()
        : <Map<String, dynamic>>[];
    bool saving = false;

    await showDialog(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
      return AlertDialog(
        title: Text(post == null ? 'Create Post' : 'Edit Post'),
        content: SizedBox(
          width: 620,
          child: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Title')),
              const SizedBox(height: 12),
              TextField(controller: bodyCtrl, maxLines: 6, decoration: const InputDecoration(labelText: 'Body')),
              const SizedBox(height: 12),
              TextField(controller: linkCtrl, decoration: const InputDecoration(labelText: 'Link (optional)')),
              const SizedBox(height: 12),
              Wrap(spacing: 8, runSpacing: 8, children: [
                OutlinedButton.icon(
                  onPressed: () => _pickImages(media, setSheet),
                  icon: const Icon(Icons.image),
                  label: const Text('Add images'),
                ),
                OutlinedButton.icon(
                  onPressed: () => _pickVideo(media, setSheet),
                  icon: const Icon(Icons.videocam),
                  label: const Text('Add video (max 200 MB)'),
                ),
                OutlinedButton.icon(
                  onPressed: () => _pickFile(media, setSheet),
                  icon: const Icon(Icons.attach_file),
                  label: const Text('Add file (max 50 MB)'),
                ),
              ]),
              if (media.isNotEmpty) ...[
                const SizedBox(height: 8),
                ...media.map((p) => Row(children: [
                  Icon(_isVideo(p) ? Icons.videocam : Icons.image, size: 16, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Expanded(child: Text(p.split(RegExp(r'[\\/]')).last, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12))),
                  IconButton(icon: const Icon(Icons.close, size: 16), onPressed: () => setSheet(() => media.remove(p))),
                ])),
              ],
              if (existingMedia.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text('${existingMedia.length} existing attachment(s) will be kept.', style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ],
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: audience,
                decoration: const InputDecoration(labelText: 'Audience'),
                items: const [
                  DropdownMenuItem(value: 'all', child: Text('Everyone')),
                  DropdownMenuItem(value: 'students', child: Text('Students')),
                  DropdownMenuItem(value: 'guardians', child: Text('Parents')),
                  DropdownMenuItem(value: 'teachers', child: Text('Teachers')),
                  DropdownMenuItem(value: 'staff', child: Text('Staff')),
                ],
                onChanged: (v) => setSheet(() => audience = v ?? 'all'),
              ),
            ]),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: saving ? null : () async {
              if (titleCtrl.text.trim().isEmpty || bodyCtrl.text.trim().isEmpty) return;
              setSheet(() => saving = true);
              final String? err;
              if (post == null) {
                err = media.isEmpty
                    ? await ApiService().createAdminPost(
                        title: titleCtrl.text.trim(),
                        body: bodyCtrl.text.trim(),
                        link: linkCtrl.text.trim(),
                        adminId: app.user?.id ?? 0,
                        adminName: app.user?.name ?? 'Admin',
                        audience: audience,
                      )
                    : await ApiService().createAdminPostWithMedia(
                        title: titleCtrl.text.trim(),
                        body: bodyCtrl.text.trim(),
                        link: linkCtrl.text.trim(),
                        adminId: app.user?.id ?? 0,
                        adminName: app.user?.name ?? 'Admin',
                        audience: audience,
                        mediaPaths: media,
                      );
              } else {
                err = media.isEmpty
                    ? await ApiService().updateAdminPost(
                        id: int.tryParse('${post['id']}') ?? 0,
                        title: titleCtrl.text.trim(),
                        body: bodyCtrl.text.trim(),
                        link: linkCtrl.text.trim(),
                        audience: audience,
                      )
                    : await ApiService().updateAdminPostWithMedia(
                        id: int.tryParse('${post['id']}') ?? 0,
                        title: titleCtrl.text.trim(),
                        body: bodyCtrl.text.trim(),
                        link: linkCtrl.text.trim(),
                        audience: audience,
                        mediaPaths: media,
                        existingMedia: existingMedia,
                      );
              }
              setSheet(() => saving = false);
              if (!ctx.mounted) return;
              if (err == null) {
                Navigator.pop(ctx);
                await _load();
              } else {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: AppColors.danger));
              }
            },
            child: saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save'),
          ),
        ],
      );
    }));
  }

  Future<void> _delete(Map<String, dynamic> post) async {
    final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Delete post?'),
      content: Text('${post['title'] ?? ''}'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete')),
      ],
    ));
    if (ok != true) return;
    final done = await ApiService().deleteAdminPost(int.tryParse('${post['id']}') ?? 0);
    if (done) await _load();
  }

  Future<void> _open(String url) async {
    if (url.isEmpty) return;
    final uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open attachment')));
      }
    }
  }

  Widget _mediaTile(Map<String, dynamic> m) {
    final url = ApiConstants.postMediaUrl(m);
    final name = '${m['originalname'] ?? m['filename'] ?? ''}';
    final type = '${m['mimetype'] ?? ''}';
    final isVideo = type.startsWith('video') || _isVideo(name);
    final isImage = type.startsWith('image') || _isImage(name);
    if (isImage) {
      return GestureDetector(
        onTap: () => _open(url),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Image.network(
            url,
            width: 150,
            height: 110,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              width: 150, height: 110,
              color: Colors.grey.shade200,
              child: const Icon(Icons.broken_image, color: Colors.grey),
            ),
            loadingBuilder: (_, child, progress) => progress == null ? child : Container(
              width: 150, height: 110, color: Colors.grey.shade100,
              child: const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
            ),
          ),
        ),
      );
    }
    return InkWell(
      onTap: () => _open(url),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 150, height: 110,
        decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.06), borderRadius: BorderRadius.circular(10)),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(isVideo ? Icons.play_circle_fill : Icons.insert_drive_file, size: 34, color: AppColors.primary),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6),
            child: Text(name, maxLines: 2, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10)),
          ),
          const SizedBox(height: 2),
          Text(isVideo ? 'Tap to open video' : 'Tap to open file', style: const TextStyle(fontSize: 9, color: Colors.grey)),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Posts')),
      floatingActionButton: FloatingActionButton.extended(onPressed: () => _edit(), icon: const Icon(Icons.add), label: const Text('Create Post')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                    itemCount: _posts.length,
                    itemBuilder: (context, i) {
                      final p = _posts[i];
                      final media = p['media'];
                      final mediaList = media is List ? media.map((e) => Map<String, dynamic>.from(e as Map)).toList() : <Map<String, dynamic>>[];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              Expanded(child: Text('${p['title'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
                              PopupMenuButton<String>(
                                onSelected: (v) { if (v == 'edit') _edit(p); if (v == 'delete') _delete(p); },
                                itemBuilder: (_) => const [PopupMenuItem(value: 'edit', child: Text('Edit')), PopupMenuItem(value: 'delete', child: Text('Delete'))],
                              ),
                            ]),
                            const SizedBox(height: 4),
                            Text('${p['author_name'] ?? 'Admin'} • ${p['created_at'] ?? ''}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                            const SizedBox(height: 10),
                            Text('${p['body'] ?? ''}'),
                            if (p['link'] != null && '${p['link']}'.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              InkWell(
                                onTap: () => _open('${p['link']}'),
                                child: Text('${p['link']}', style: const TextStyle(color: Colors.blue, decoration: TextDecoration.underline)),
                              ),
                            ],
                            if (mediaList.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Wrap(spacing: 8, runSpacing: 8, children: mediaList.map(_mediaTile).toList()),
                            ],
                          ]),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
