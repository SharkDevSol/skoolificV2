import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../app/app_provider.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/page_header.dart';
import '../../models/models.dart';
import '../../core/l10n/app_localizations.dart';

// 8.1: Messages tab — conversations list + chat view, connected to backend
class MessagesTab extends StatefulWidget {
  const MessagesTab({super.key});
  @override
  State<MessagesTab> createState() => _MessagesTabState();
}

class _MessagesTabState extends State<MessagesTab> {
  List<ChatConversation> _conversations = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    final app = Provider.of<AppProvider>(context, listen: false);
    if (app.user == null || app.user!.username.isEmpty) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    if (mounted) setState(() => _loading = true);
    try {
      _conversations = await ApiService().conversations(app.user!.username);
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // FIX 7: app header on Messages page
    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            PageHeader(title: tr(context, 'messages'), icon: Icons.chat_bubble_outline),
            Expanded(
              child: GradientBackground(
                child: RefreshIndicator(
                  onRefresh: _fetch,
        child: ListView(
          padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 100),
          children: [
            SectionTitle(AppLocalizations.tr(context, 'messages')),
            if (_loading)
              const Column(children: [
                SkeletonCard(height: 80),
                SizedBox(height: 12),
                SkeletonCard(height: 80),
                SizedBox(height: 12),
                SkeletonCard(height: 80),
              ])
            else if (_error != null)
              EmptyState(icon: Icons.error_outline, message: _error!)
            else if (_conversations.isEmpty)
              EmptyState(
                  icon: Icons.chat_bubble_outline,
                  message: AppLocalizations.tr(context, 'no_messages'))
            else
              ..._conversations.map((c) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: AppCard(
                      padding: const EdgeInsets.all(16),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => _ChatScreen(conversation: c),
                          ),
                        );
                      },
                      child: Row(
                        children: [
                          AvatarCircle(name: c.title.isNotEmpty ? c.title : 'C', size: 44),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(c.title,
                                    style: theme.textTheme.titleMedium?.copyWith(fontSize: 15)),
                                if (c.lastMessage?.isNotEmpty ?? false) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    c.lastMessage!,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: isDark ? Colors.white54 : AppColors.textMuted,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          if (c.unreadCount > 0)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                '${c.unreadCount}',
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                        ],
                      ),
                    ),
                  )),
          ],
        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
class _ChatScreen extends StatefulWidget {
  final ChatConversation conversation;
  const _ChatScreen({required this.conversation});

  @override
  State<_ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<_ChatScreen> {
  List<ChatMessage> _messages = [];
  bool _loading = true;
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  bool _sending = false;
  // FIX (1B): media attachments the parent picked before sending
  final List<String> _pendingMedia = [];

  Future<void> _pickMedia() async {
    try {
      final picker = ImagePicker();
      final files = <String>[];
      // pick an image from gallery
      final img = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
      if (img != null) files.add(img.path);
      if (files.isEmpty) return;
      setState(() => _pendingMedia.addAll(files));
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not pick file'), duration: Duration(seconds: 2)),
        );
      }
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final app = Provider.of<AppProvider>(context, listen: false);
    final myUsername = app.user?.username ?? '';
    try {
      _messages = await ApiService()
          .conversationMessages(widget.conversation.id, myUsername);
    } catch (_) {}
    if (mounted) {
      setState(() => _loading = false);
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _inputCtrl.text.trim();
    final hasMedia = _pendingMedia.isNotEmpty;
    if ((text.isEmpty && !hasMedia) || _sending) return;
    setState(() => _sending = true);
    _inputCtrl.clear();
    final media = List<String>.from(_pendingMedia);
    setState(() => _pendingMedia.clear());
    try {
      if (media.isNotEmpty) {
        await ApiService().sendMessageWithMedia(widget.conversation.id, text, media);
      } else {
        await ApiService().sendMessage(widget.conversation.id, text);
      }
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not send — check connection'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            AvatarCircle(name: widget.conversation.title.isNotEmpty ? widget.conversation.title : 'C', size: 32),
            const SizedBox(width: 10),
            Expanded(
              child: Text(widget.conversation.title,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: AppLoadingIndicator())
                : _messages.isEmpty
                    ? Center(
                        child: Text(
                          'No messages yet.\nSay hello!',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: isDark ? Colors.white38 : AppColors.textMuted),
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (ctx, i) {
                          final m = _messages[i];
                          return Align(
                            alignment: m.isMine ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              constraints: const BoxConstraints(maxWidth: 280),
                              decoration: BoxDecoration(
                                color: m.isMine
                                    ? AppColors.primary
                                    : (isDark ? const Color(0xFF2A2A2A) : Colors.white),
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(16),
                                  topRight: const Radius.circular(16),
                                  bottomLeft: Radius.circular(m.isMine ? 16 : 4),
                                  bottomRight: Radius.circular(m.isMine ? 4 : 16),
                                ),
                                boxShadow: isDark ? [] : const [softShadow],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // FIX (1B): render attachments — image inline,
                                  // video/file as a tappable link
                                  if (m.attachments.isNotEmpty)
                                    ...m.attachments.map((a) => Padding(
                                      padding: const EdgeInsets.only(bottom: 6),
                                      child: _AttachmentView(att: a, isMine: m.isMine, isDark: isDark),
                                    )),
                                  if (m.content.isNotEmpty)
                                  Text(
                                    m.content,
                                    style: TextStyle(
                                      color: m.isMine ? Colors.white : (isDark ? Colors.white : AppColors.text),
                                      fontSize: 14,
                                      height: 1.4,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    m.time != null ? _shortTime(m.time!) : '',
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: m.isMine ? Colors.white70 : (isDark ? Colors.white38 : AppColors.textMuted),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
          // Input bar
          SafeArea(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                boxShadow: isDark
                    ? []
                    : [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, -2))],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // FIX (1B): pending media chips (name + remove)
                  if (_pendingMedia.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Wrap(
                        spacing: 6,
                        children: _pendingMedia.map((p) => Chip(
                          label: Text(
                            p.split('/').last,
                            style: const TextStyle(fontSize: 11),
                            overflow: TextOverflow.ellipsis,
                          ),
                          deleteIcon: const Icon(Icons.close, size: 14),
                          onDeleted: () => setState(() => _pendingMedia.remove(p)),
                          visualDensity: VisualDensity.compact,
                        )).toList(),
                      ),
                    ),
                  Row(
                children: [
                  // FIX (1B): attach button (image/video/file)
                  CircleAvatar(
                    radius: 22,
                    backgroundColor: isDark ? const Color(0xFF2A2A2A) : AppColors.bg,
                    child: IconButton(
                      icon: Icon(Icons.attach_file, color: AppColors.primary, size: 20),
                      onPressed: _pickMedia,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: TextField(
                      controller: _inputCtrl,
                      onSubmitted: (_) => _send(),
                      textInputAction: TextInputAction.send,
                      decoration: InputDecoration(
                        hintText: 'Type a message...',
                        filled: true,
                        fillColor: isDark ? const Color(0xFF2A2A2A) : AppColors.bg,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    radius: 22,
                    backgroundColor: AppColors.primary,
                    child: IconButton(
                      icon: _sending
                          ? const SizedBox(
                              width: 16, height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.send, color: Colors.white, size: 18),
                      onPressed: _send,
                    ),
                  ),
                ],
              ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _shortTime(String t) {
    if (t.contains('T')) {
      final parts = t.split('T');
      final date = parts[0].length >= 10 ? parts[0].substring(5) : parts[0];
      final time = parts[1].length >= 5 ? parts[1].substring(0, 5) : parts[1];
      return '$date $time';
    }
    return t;
  }
}

// FIX (1B): renders a chat attachment — image inline, video/file as link
class _AttachmentView extends StatelessWidget {
  final ChatAttachment att;
  final bool isMine;
  final bool isDark;
  const _AttachmentView({required this.att, required this.isMine, required this.isDark});

  @override
  Widget build(BuildContext context) {
    if (att.isImage) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.network(
          att.url,
          width: 220,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _fileChip(context),
          loadingBuilder: (_, child, progress) =>
              progress == null ? child : const SizedBox(
            width: 220, height: 120,
            child: Center(child: AppLoadingIndicator()),
          ),
        ),
      );
    }
    return _fileChip(context);
  }

  Widget _fileChip(BuildContext context) {
    final icon = att.isVideo ? Icons.play_circle_outline : Icons.insert_drive_file_outlined;
    return InkWell(
      onTap: () async {
        try {
          await launchUrl(Uri.parse(att.url), mode: LaunchMode.externalApplication);
        } catch (_) {}
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: isDark ? Colors.white12 : Colors.black.withOpacity(0.06),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: isMine ? Colors.white : AppColors.primary),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                att.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  color: isMine ? Colors.white : (isDark ? Colors.white : AppColors.text),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
