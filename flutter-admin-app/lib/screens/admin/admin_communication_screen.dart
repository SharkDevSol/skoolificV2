import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../app/app_provider.dart';
import '../../core/constants/api_constants.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';

class AdminCommunicationScreen extends StatefulWidget {
  const AdminCommunicationScreen({super.key});
  @override
  State<AdminCommunicationScreen> createState() => _AdminCommunicationScreenState();
}

class _AdminCommunicationScreenState extends State<AdminCommunicationScreen> {
  List<Map<String, dynamic>> _conversations = [];
  List<Map<String, dynamic>> _contacts = [];
  bool _loading = true;
  String? _error;
  String _query = '';

  String get _adminUserId {
    final user = Provider.of<AppProvider>(context, listen: false).user;
    return 'admin_${user?.id ?? 0}';
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final list = await ApiService().getConversations(_adminUserId);
      final contacts = await ApiService().getChatContacts('guardians');
      if (!mounted) return;
      setState(() { _conversations = list; _contacts = contacts; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Map<String, dynamic>? _contactFor(Map<String, dynamic> c) {
    final participants = c['participants'];
    if (participants is! List) return null;
    for (final p in participants) {
      if (p is! Map) continue;
      final uid = '${p['user_id'] ?? ''}';
      if (!uid.startsWith('guardian_')) continue;
      final raw = uid.substring('guardian_'.length);
      for (final g in _contacts) {
        final candidates = {
          '${g['id'] ?? ''}',
          '${g['username'] ?? ''}',
          '${g['phone'] ?? ''}',
          '${g['name'] ?? ''}',
        };
        if (candidates.contains(raw)) return g;
      }
    }
    return null;
  }

  String _studentNames(Map<String, dynamic>? g) {
    if (g == null) return '';
    final list = g['students'];
    if (list is! List) return '';
    return list.map((s) => '${(s as Map)['name'] ?? ''} (${s['class'] ?? ''})').join(', ');
  }

  String _title(Map<String, dynamic> c) {
    final g = _contactFor(c);
    if (g != null) return '${g['name'] ?? ''}';
    final participants = c['participants'];
    if (participants is List) {
      for (final p in participants) {
        if (p is Map && !'${p['user_id']}'.startsWith('admin_')) {
          final name = '${p['user_name'] ?? ''}'.trim();
          if (name.isNotEmpty) return name;
        }
      }
    }
    return '${c['type'] ?? 'Conversation'}';
  }

  Future<void> _newChat() async {
    final app = Provider.of<AppProvider>(context, listen: false);
    if (_contacts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No parent contacts found.')));
      return;
    }
    String search = '';
    final picked = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
        final filtered = _contacts.where((c) {
          final q = search.toLowerCase().trim();
          if (q.isEmpty) return true;
          return '${c['name']} ${c['phone']} ${c['students']}'.toLowerCase().contains(q);
        }).toList();
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.8,
          maxChildSize: 0.95,
          builder: (ctx, scroll) => Column(children: [
            const Padding(padding: EdgeInsets.fromLTRB(16, 0, 16, 8), child: Text('Message a Parent', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: TextField(
                autofocus: true,
                decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search parent or student', isDense: true),
                onChanged: (v) => setSheet(() => search = v),
              ),
            ),
            Expanded(child: ListView.builder(
              controller: scroll,
              itemCount: filtered.length,
              itemBuilder: (context, i) {
                final c = filtered[i];
                final name = '${c['name'] ?? ''}';
                final students = _studentNames(c);
                return ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.family_restroom)),
                  title: Text(name),
                  subtitle: Text('${c['phone'] ?? ''}\n$students'),
                  isThreeLine: students.isNotEmpty,
                  onTap: () => Navigator.pop(ctx, c),
                );
              },
            )),
          ]),
        );
      }),
    );
    if (picked == null || !mounted) return;
    final guardianId = '${picked['id'] ?? picked['username'] ?? picked['phone'] ?? picked['name'] ?? ''}';
    final guardianName = '${picked['name'] ?? ''}';
    final convId = await ApiService().findOrCreateConversation(
      type: 'admin_guardian',
      participants: [
        {'user_id': _adminUserId, 'user_type': 'admin', 'user_name': app.user?.name ?? 'Admin'},
        {'user_id': 'guardian_$guardianId', 'user_type': 'guardian', 'user_name': guardianName},
      ],
    );
    if (convId == null || !mounted) return;
    await Navigator.push(context, MaterialPageRoute(builder: (_) => _AdminChatThread(
      conversationId: convId,
      title: guardianName,
      subtitle: _studentNames(picked),
      adminUserId: _adminUserId,
      adminName: app.user?.name ?? 'Admin',
    )));
    _load();
  }

  List<Map<String, dynamic>> get _filteredConversations {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return _conversations;
    return _conversations.where((c) {
      final g = _contactFor(c);
      return '${_title(c)} ${g?['phone'] ?? ''} ${_studentNames(g)}'.toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final list = _filteredConversations;
    return Scaffold(
      appBar: AppBar(title: const Text('Message')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _newChat,
        icon: const Icon(Icons.add),
        label: const Text('New chat'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
              : Column(children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: TextField(
                      decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search conversation / student', isDense: true),
                      onChanged: (v) => setState(() => _query = v),
                    ),
                  ),
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: _load,
                      child: list.isEmpty
                          ? ListView(children: const [SizedBox(height: 120), Icon(Icons.forum_outlined, size: 56, color: Colors.grey), SizedBox(height: 12), Center(child: Text('No conversations yet'))])
                          : ListView.builder(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                              itemCount: list.length,
                              itemBuilder: (context, i) {
                                final c = list[i];
                                final g = _contactFor(c);
                                final last = c['last_message'];
                                final lastText = last is Map ? '${last['message_text'] ?? ''}' : '';
                                final students = _studentNames(g);
                                return Card(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  child: ListTile(
                                    leading: const CircleAvatar(child: Icon(Icons.chat_bubble_outline)),
                                    title: Text(_title(c)),
                                    subtitle: Text('${students.isEmpty ? 'Students: —' : students}${lastText.isEmpty ? '' : '\n$lastText'}', maxLines: 2, overflow: TextOverflow.ellipsis),
                                    isThreeLine: students.isNotEmpty || lastText.isNotEmpty,
                                    trailing: const Icon(Icons.chevron_right),
                                    onTap: () async {
                                      await Navigator.push(context, MaterialPageRoute(builder: (_) => _AdminChatThread(
                                        conversationId: int.tryParse('${c['id']}') ?? 0,
                                        title: _title(c),
                                        subtitle: students,
                                        adminUserId: _adminUserId,
                                        adminName: Provider.of<AppProvider>(context, listen: false).user?.name ?? 'Admin',
                                      )));
                                      _load();
                                    },
                                  ),
                                );
                              },
                            ),
                    ),
                  ),
                ]),
    );
  }
}

class _AdminChatThread extends StatefulWidget {
  final int conversationId;
  final String title;
  final String subtitle;
  final String adminUserId;
  final String adminName;
  const _AdminChatThread({required this.conversationId, required this.title, this.subtitle = '', required this.adminUserId, required this.adminName});
  @override
  State<_AdminChatThread> createState() => _AdminChatThreadState();
}

class _AdminChatThreadState extends State<_AdminChatThread> {
  final _ctrl = TextEditingController();
  List<dynamic> _messages = [];
  final List<String> _attachments = [];
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final list = await ApiService().getConversationMessages(widget.conversationId);
    if (!mounted) return;
    setState(() { _messages = list; _loading = false; });
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if ((text.isEmpty && _attachments.isEmpty) || _sending) return;
    setState(() => _sending = true);
    await ApiService().sendMessage(
      conversationId: widget.conversationId,
      messageText: text,
      senderId: widget.adminUserId,
      senderType: 'admin',
      senderName: widget.adminName,
      attachmentPaths: _attachments,
    );
    _ctrl.clear();
    _attachments.clear();
    if (!mounted) return;
    setState(() => _sending = false);
    await _load();
  }

  bool _isVideo(String name) {
    final p = name.toLowerCase();
    return p.endsWith('.mp4') || p.endsWith('.mov') || p.endsWith('.mkv') || p.endsWith('.avi') || p.endsWith('.webm') || p.endsWith('.m4v');
  }

  Future<void> _pick(String kind) async {
    if (kind == 'image') {
      final picked = await ImagePicker().pickMultiImage(imageQuality: 88);
      if (picked.isNotEmpty) setState(() => _attachments.addAll(picked.map((e) => e.path)));
      return;
    }
    if (kind == 'video') {
      final picked = await ImagePicker().pickVideo(source: ImageSource.gallery);
      if (picked == null) return;
      final size = await File(picked.path).length();
      if (size > 300 * 1024 * 1024) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Video is larger than 300 MB.'), backgroundColor: AppColors.danger));
        }
        return;
      }
      setState(() => _attachments.add(picked.path));
      return;
    }
    final result = await FilePicker.pickFiles();
    if (result.isEmpty) return;
    for (final f in result) {
      if (f.path == null) continue;
      final size = await File(f.path!).length();
      if (size > 300 * 1024 * 1024) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${f.name} is larger than 300 MB.'), backgroundColor: AppColors.danger));
        }
        continue;
      }
      setState(() => _attachments.add(f.path!));
    }
  }

  Future<void> _open(String url) async {
    if (url.isEmpty) return;
    if (!await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open attachment')));
      }
    }
  }

  Widget _attachmentTile(Map<String, dynamic> a) {
    final url = ApiConstants.attachmentUrl('${a['url'] ?? ''}');
    final name = '${a['original_name'] ?? a['filename'] ?? ''}';
    final type = '${a['file_type'] ?? ''}';
    final isImage = type.startsWith('image') || _isImageName(name);
    final isVideo = type.startsWith('video') || _isVideo(name);
    if (isImage) {
      return GestureDetector(
        onTap: () => _open(url),
        child: Stack(children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(url, width: 160, height: 120, fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(width: 160, height: 120, color: Colors.grey.shade200, child: const Icon(Icons.broken_image)),
            ),
          ),
          Positioned(
            right: 2, bottom: 2,
            child: CircleAvatar(radius: 12, backgroundColor: Theme.of(context).colorScheme.scrim.withOpacity(0.55), child: IconButton(
              padding: EdgeInsets.zero,
              iconSize: 14,
              icon: const Icon(Icons.download, color: Colors.white),
              onPressed: () => _open(url),
            )),
          ),
        ]),
      );
    }
    return InkWell(
      onTap: () => _open(url),
      child: Container(
        width: 180,
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.06), borderRadius: BorderRadius.circular(8)),
        child: Row(children: [
          Icon(isVideo ? Icons.play_circle_fill : Icons.insert_drive_file, color: AppColors.primary),
          const SizedBox(width: 6),
          Expanded(child: Text(name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11))),
          const Icon(Icons.download, size: 16),
        ]),
      ),
    );
  }

  bool _isImageName(String n) {
    final p = n.toLowerCase();
    return p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.png') || p.endsWith('.gif') || p.endsWith('.webp');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(widget.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          if (widget.subtitle.isNotEmpty) Text(widget.subtitle, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.normal)),
        ]),
      ),
      body: Column(children: [
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length,
                  itemBuilder: (context, i) {
                    final m = Map<String, dynamic>.from(_messages[i] as Map);
                    final mine = '${m['sender_id'] ?? ''}' == widget.adminUserId;
                    final rawAttachments = m['attachments'];
                    final attachments = rawAttachments is List
                        ? rawAttachments.map((e) => Map<String, dynamic>.from(e as Map)).toList()
                        : <Map<String, dynamic>>[];
                    return Align(
                      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(10),
                        constraints: const BoxConstraints(maxWidth: 320),
                        decoration: BoxDecoration(
                          color: mine ? AppColors.primary.withOpacity(0.15) : Theme.of(context).cardColor,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          if (!mine) Text('${m['sender_name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          if ('${m['message_text'] ?? ''}'.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text('${m['message_text'] ?? ''}'),
                          ],
                          if (attachments.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Wrap(spacing: 6, runSpacing: 6, children: attachments.map(_attachmentTile).toList()),
                          ],
                          const SizedBox(height: 4),
                          Text('${m['created_at'] ?? ''}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                        ]),
                      ),
                    );
                  },
                ),
        ),
        if (_attachments.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            color: AppColors.primary.withOpacity(0.05),
            child: Column(children: _attachments.map((p) => Row(children: [
              Icon(_isVideo(p) ? Icons.videocam : Icons.attach_file, size: 16, color: AppColors.primary),
              const SizedBox(width: 6),
              Expanded(child: Text(p.split(RegExp(r'[\\/]')).last, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11))),
              IconButton(icon: const Icon(Icons.close, size: 16), onPressed: () => setState(() => _attachments.remove(p))),
            ])).toList()),
          ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 6, 8, 10),
            child: Row(children: [
              PopupMenuButton<String>(
                icon: const Icon(Icons.attach_file),
                onSelected: _pick,
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 'image', child: Text('Image')),
                  PopupMenuItem(value: 'video', child: Text('Video (max 300 MB)')),
                  PopupMenuItem(value: 'file', child: Text('File (max 300 MB)')),
                ],
              ),
              Expanded(child: TextField(controller: _ctrl, decoration: const InputDecoration(hintText: 'Write a message…', isDense: true), textInputAction: TextInputAction.send, onSubmitted: (_) => _send())),
              const SizedBox(width: 8),
              IconButton.filled(onPressed: _sending ? null : _send, icon: _sending ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send)),
            ]),
          ),
        ),
      ]),
    );
  }
}
