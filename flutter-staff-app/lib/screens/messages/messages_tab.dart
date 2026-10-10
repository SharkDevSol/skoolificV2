import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/constants/api_constants.dart';
import '../../core/services/api_service.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/page_header.dart';
import '../../app/app_provider.dart';
import '../../models/models.dart';

class MessagesTab extends StatefulWidget {
  const MessagesTab({super.key});

  @override
  State<MessagesTab> createState() => _MessagesTabState();
}

class _MessagesTabState extends State<MessagesTab> {
  bool _loading = false;
  List<Map<String, dynamic>> _conversations = [];
  Map<String, dynamic>? _activeConversation;
  List<ChatMessage> _messages = [];
  bool _loadingMessages = false;
  bool _sending = false;
  final _msgCtrl = TextEditingController();
  final List<String> _attachments = [];

  String get _myUserId {
    final prov = Provider.of<AppProvider>(context, listen: false);
    final gid = prov.profile?.globalStaffId ?? prov.user?.globalStaffId ?? 0;
    return 'teacher_$gid';
  }

  String get _myName {
    final prov = Provider.of<AppProvider>(context, listen: false);
    return prov.profile?.name.isNotEmpty == true
        ? prov.profile!.name
        : (prov.user?.name.isNotEmpty == true ? prov.user!.name : prov.user!.username);
  }

  @override
  void initState() {
    super.initState();
    _fetchConversations();
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchConversations() async {
    setState(() => _loading = true);
    try {
      final list = await ApiService().getConversations(_myUserId);
      if (mounted) setState(() => _conversations = list);
    } catch (_) {}
    finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openChat(Map<String, dynamic> conv) async {
    final convId = conv['id'] is int
        ? conv['id']
        : int.tryParse(conv['id']?.toString() ?? '0') ?? 0;

    setState(() {
      _activeConversation = conv;
      _loadingMessages = true;
      _messages = [];
      _attachments.clear();
    });

    try {
      final raw = await ApiService().getConversationMessages(convId);
      final parsed = raw
          .map((m) => ChatMessage.fromServer(
                Map<String, dynamic>.from(m as Map),
                myUserId: _myUserId,
                myUserType: 'teacher',
              ))
          .toList();
      parsed.sort((a, b) => a.createdAt.compareTo(b.createdAt));
      if (mounted) setState(() => _messages = parsed);
      await ApiService().markConversationRead(conversationId: convId, userId: _myUserId);
    } catch (_) {}
    finally {
      if (mounted) setState(() => _loadingMessages = false);
    }
  }

  Future<void> _sendMessage() async {
    final text = _msgCtrl.text.trim();
    if (_activeConversation == null) return;
    if (text.isEmpty && _attachments.isEmpty) return;
    final convId = _activeConversation!['id'] is int
        ? _activeConversation!['id']
        : int.tryParse(_activeConversation!['id']?.toString() ?? '0') ?? 0;

    _msgCtrl.clear();
    final localMsg = ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch,
      conversationId: convId,
      senderId: _myUserId,
      senderType: 'teacher',
      senderName: _myName,
      text: text,
      createdAt: DateTime.now().toIso8601String(),
      isMe: true,
    );
    setState(() {
      _messages.add(localMsg);
      _sending = true;
    });

    final paths = List<String>.from(_attachments);
    _attachments.clear();

    final res = await ApiService().sendMessage(
      conversationId: convId,
      messageText: text,
      senderId: _myUserId,
      senderType: 'teacher',
      senderName: _myName,
      attachmentPaths: paths,
    );

    if (mounted) {
      setState(() => _sending = false);
      if (res == null) {
        showError(context, tr(context, 'send_failed'));
      } else {
        try {
          final serverMsg = ChatMessage.fromServer(
            Map<String, dynamic>.from(res),
            myUserId: _myUserId,
            myUserType: 'teacher',
          );
          setState(() {
            _messages.removeWhere((m) => m.id == localMsg.id);
            _messages.add(serverMsg);
          });
        } catch (_) {}
        _fetchConversations();
      }
    }
  }

  Future<void> _pickAttachment() async {
    try {
      final picked = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 1600,
        imageQuality: 80,
      );
      if (picked != null) setState(() => _attachments.add(picked.path));
    } catch (_) {}
  }

  // --------------------------------------------------------- start new chat

  Future<void> _startNewChat() async {
    final prov = Provider.of<AppProvider>(context, listen: false);
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Text(tr(context, 'new_chat'),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            ListTile(
              leading: const CircleAvatar(child: Icon(Icons.groups)),
              title: Text(tr(context, 'class_group')),
              subtitle: Text(tr(context, 'class_group_hint')),
              onTap: () {
                Navigator.pop(ctx);
                _pickClassForGroup(prov);
              },
            ),
            ListTile(
              leading: const CircleAvatar(child: Icon(Icons.person_outline)),
              title: Text(tr(context, 'message_guardian')),
              onTap: () {
                Navigator.pop(ctx);
                _pickGuardian();
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<void> _pickClassForGroup(AppProvider prov) async {
    final classes = <String>{
      ...prov.assignedClasses,
      ...prov.markAssignments.map((a) => a.className),
    }.toList();
    if (classes.isEmpty) {
      if (mounted) showError(context, tr(context, 'no_assignments'));
      return;
    }
    final picked = await showDialog<String>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: Text(tr(context, 'select_class')),
        children: classes
            .map((c) => SimpleDialogOption(
                  onPressed: () => Navigator.pop(ctx, c),
                  child: Text(c, style: const TextStyle(fontWeight: FontWeight.w700)),
                ))
            .toList(),
      ),
    );
    if (picked == null) return;

    // Backend requires >= 2 participants. Add every guardian of the class
    // (so parents actually see the thread) plus a class marker row, which
    // also gives the conversation list a proper "Class G1" title.
    final participants = <Map<String, dynamic>>[
      {'user_id': _myUserId, 'user_type': 'teacher', 'user_name': _myName},
      {
        'user_id': 'class_$picked',
        'user_type': 'class',
        'user_name': 'Class $picked',
      },
    ];
    final contacts = await ApiService().getGuardianContacts();
    for (final c in contacts) {
      final students = c['students'];
      final inClass = students is List &&
          students.any((s) => s is Map && s['class']?.toString() == picked);
      if (!inClass) continue;
      final gid = c['id']?.toString() ?? c['phone']?.toString() ?? '';
      if (gid.isEmpty) continue;
      final uid = gid.startsWith('guardian_') ? gid : 'guardian_$gid';
      if (participants.any((p) => p['user_id'] == uid)) continue;
      participants.add({
        'user_id': uid,
        'user_type': 'guardian',
        'user_name': c['name']?.toString() ?? '',
      });
    }

    final id = await ApiService().findOrCreateConversation(
      type: 'class',
      className: picked,
      participants: participants,
    );
    if (id == null) {
      if (mounted) showError(context, tr(context, 'send_failed'));
      return;
    }
    await _fetchConversations();
    final conv = _conversations.firstWhere(
      (c) => (c['id'] is int ? c['id'] : int.tryParse(c['id']?.toString() ?? '')) == id,
      orElse: () => {
        'id': id,
        'title': 'Class $picked',
        'type': 'class',
        'teacher_class': picked,
      },
    );
    if (mounted) await _openChat(conv);
  }

  Future<void> _pickGuardian() async {
    final guardians = await ApiService().getGuardianContacts();
    if (!mounted) return;
    if (guardians.isEmpty) {
      showError(context, tr(context, 'no_records'));
      return;
    }
    final chosen = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        builder: (ctx, scrollCtrl) => Column(
          children: [
            const SizedBox(height: 12),
            Text(tr(context, 'message_guardian'),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.builder(
                controller: scrollCtrl,
                itemCount: guardians.length,
                itemBuilder: (c, i) {
                  final g = guardians[i];
                  final students = (g['students'] is List)
                      ? (g['students'] as List)
                          .map((s) => s is Map ? (s['name']?.toString() ?? '') : s.toString())
                          .join(', ')
                      : '';
                  return ListTile(
                    leading: AvatarCircle(name: g['name']?.toString() ?? '?', size: 40),
                    title: Text(g['name']?.toString() ??
                        g['username']?.toString() ??
                        g['id'].toString()),
                    subtitle: students.isEmpty ? null : Text(students, maxLines: 1),
                    onTap: () => Navigator.pop(ctx, g),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
    if (chosen == null) return;

    // Guardian sessions are identified as guardian_<phone> (same as the web
    // app) — without the prefix the guardian never sees this conversation.
    final rawGid = chosen['id']?.toString() ?? chosen['username']?.toString() ?? '';
    final guardianId = rawGid.startsWith('guardian_') ? rawGid : 'guardian_$rawGid';

    final id = await ApiService().findOrCreateConversation(
      type: 'direct',
      participants: [
        {'user_id': _myUserId, 'user_type': 'teacher', 'user_name': _myName},
        {
          'user_id': guardianId,
          'user_type': 'guardian',
          'user_name': chosen['name']?.toString() ?? chosen['username']?.toString() ?? '',
        },
      ],
    );
    if (id == null) {
      if (mounted) showError(context, tr(context, 'send_failed'));
      return;
    }
    await _fetchConversations();
    final conv = _conversations.firstWhere(
      (c) => (c['id'] is int ? c['id'] : int.tryParse(c['id']?.toString() ?? '')) == id,
      orElse: () => {
        'id': id,
        'title': chosen['name']?.toString() ?? 'Guardian',
      },
    );
    if (mounted) await _openChat(conv);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            PageHeader(
              title: _activeConversation != null
                  ? _convTitle(_activeConversation!)
                  : tr(context, 'messages'),
              icon: Icons.chat_bubble_outline,
            ),
            Expanded(
              child: _activeConversation != null
                  ? _buildChatView()
                  : _buildConversationsList(),
            ),
          ],
        ),
      ),
      floatingActionButton: _activeConversation == null
          ? FloatingActionButton(
              onPressed: _startNewChat,
              backgroundColor: AppColors.primary,
              child: const Icon(Icons.edit, color: Colors.white),
            )
          : null,
    );
  }

  // ------------------------------------------------------------ list view

  /// The backend stores no title column, so derive a human label from the
  /// participants (type/class marker first, then the other side's name).
  String _convTitle(Map<String, dynamic> conv) {
    final explicit = conv['display_title']?.toString() ??
        conv['title']?.toString() ??
        conv['participant_name']?.toString() ??
        '';
    if (explicit.isNotEmpty && explicit != 'School Staff') return explicit;

    final parts = conv['participants'];
    final list = parts is List ? parts : const [];

    if (conv['type']?.toString() == 'class') {
      final cls = conv['teacher_class']?.toString() ?? '';
      if (cls.isNotEmpty) return 'Class $cls';
      for (final p in list) {
        if (p is Map && p['user_type']?.toString() == 'class') {
          final n = p['user_name']?.toString() ?? '';
          if (n.isNotEmpty) return n;
        }
      }
      return tr(context, 'class_group');
    }

    final names = <String>[];
    for (final p in list) {
      if (p is! Map) continue;
      if ((p['user_id']?.toString() ?? '') == _myUserId) continue;
      final n = p['user_name']?.toString() ?? '';
      if (n.isNotEmpty) names.add(n);
    }
    if (names.isNotEmpty) return names.join(', ');
    return tr(context, 'message_guardian');
  }

  Widget _buildConversationsList() {
    if (_loading) return const Center(child: AppLoadingIndicator());
    if (_conversations.isEmpty) {
      return Center(
        child: EmptyState(
          icon: Icons.chat_outlined,
          message: tr(context, 'no_messages'),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchConversations,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _conversations.length,
        itemBuilder: (context, idx) {
          final conv = _conversations[idx];
          final title = _convTitle(conv);
          final isClass = conv['type']?.toString() == 'class';
          final lastMsg = conv['last_message'] is Map
              ? ((conv['last_message'] as Map)['message_text']?.toString() ??
                  (conv['last_message'] as Map)['messageText']?.toString() ??
                  '')
              : conv['last_message']?.toString() ?? '';
          final unread = int.tryParse(conv['unread_count']?.toString() ?? '0') ?? 0;

          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              padding: const EdgeInsets.all(14),
              onTap: () => _openChat(conv),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 22,
                    backgroundColor: AppColors.primarySoft,
                    child: Icon(
                      isClass ? Icons.groups : Icons.person_outline,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          lastMsg.isEmpty ? tr(context, 'no_messages') : lastMsg,
                          style: const TextStyle(
                              color: AppColors.textSecondary, fontSize: 13),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  if (unread > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '$unread',
                        style: const TextStyle(
                            color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800),
                      ),
                    ),
                  const SizedBox(width: 8),
                  const Icon(Icons.arrow_forward_ios,
                      size: 14, color: AppColors.textMuted),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // ------------------------------------------------------------- chat view

  Widget _buildChatView() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          color: Theme.of(context).cardColor,
          child: Row(
            children: [
              GestureDetector(
                onTap: () {
                  setState(() => _activeConversation = null);
                  _fetchConversations();
                },
                child: Row(
                  children: [
                    const Icon(Icons.arrow_back,
                        size: 18, color: AppColors.primary),
                    const SizedBox(width: 6),
                    Text(tr(context, 'previous'),
                        style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                            fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: _loadingMessages
              ? const Center(child: AppLoadingIndicator())
              : _messages.isEmpty
                  ? Center(
                      child: Text(tr(context, 'no_messages'),
                          style: const TextStyle(color: AppColors.textMuted)))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length,
                      itemBuilder: (context, idx) {
                        final msg = _messages[idx];
                        final isMe = msg.isMe;
                        return Align(
                          alignment:
                              isMe ? Alignment.centerRight : Alignment.centerLeft,
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            constraints: BoxConstraints(
                                maxWidth:
                                    MediaQuery.of(context).size.width * 0.78),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: isMe ? AppColors.primary : AppColors.surfaceAlt,
                              borderRadius: BorderRadius.only(
                                topLeft: const Radius.circular(16),
                                topRight: const Radius.circular(16),
                                bottomLeft: Radius.circular(isMe ? 16 : 4),
                                bottomRight: Radius.circular(isMe ? 4 : 16),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: isMe
                                  ? CrossAxisAlignment.end
                                  : CrossAxisAlignment.start,
                              children: [
                                if (msg.text.isNotEmpty)
                                  Text(
                                    msg.text,
                                    style: TextStyle(
                                      color: isMe ? Colors.white : AppColors.text,
                                      fontSize: 14,
                                    ),
                                  ),
                                if (msg.hasImage)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(10),
                                      child: Image.network(
                                        ApiConstants.attachmentUrl(
                                            msg.attachmentUrl(msg.attachments.firstWhere(
                                                (a) => ChatMessage.isImageAttachment(a),
                                                orElse: () => msg.attachments.first))),
                                        width: 180,
                                        height: 130,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => const Icon(
                                            Icons.broken_image,
                                            color: Colors.white70),
                                      ),
                                    ),
                                  ),
                                if (msg.attachments.isNotEmpty && !msg.hasImage)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Text(
                                      msg.attachments
                                          .map((a) =>
                                              a['original_name']?.toString() ??
                                              'attachment')
                                          .join(', '),
                                      style: TextStyle(
                                        color: isMe ? Colors.white70 : AppColors.textSecondary,
                                        fontSize: 12,
                                        decoration: TextDecoration.underline,
                                      ),
                                    ),
                                  ),
                                const SizedBox(height: 4),
                                Text(
                                  msg.createdAt.contains('T')
                                      ? msg.createdAt.split('T')[1].substring(0, 5)
                                      : '',
                                  style: TextStyle(
                                    color: isMe ? Colors.white60 : AppColors.textMuted,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),

        if (_attachments.isNotEmpty)
          SizedBox(
            height: 74,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _attachments.length,
              itemBuilder: (c, i) => Container(
                margin: const EdgeInsets.only(right: 8, top: 6, bottom: 6),
                child: Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.file(File(_attachments[i]),
                          width: 62, height: 62, fit: BoxFit.cover),
                    ),
                    Positioned(
                      right: 2,
                      top: 2,
                      child: GestureDetector(
                        onTap: () => setState(() => _attachments.removeAt(i)),
                        child: const CircleAvatar(
                          radius: 9,
                          backgroundColor: Colors.black54,
                          child: Icon(Icons.close, size: 12, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          color: Theme.of(context).cardColor,
          child: Row(
            children: [
              IconButton(
                onPressed: _pickAttachment,
                icon: const Icon(Icons.attach_file, color: AppColors.textSecondary),
              ),
              Expanded(
                child: TextField(
                  controller: _msgCtrl,
                  minLines: 1,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: tr(context, 'type_message'),
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24)),
                  ),
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
              const SizedBox(width: 8),
              CircleAvatar(
                radius: 22,
                backgroundColor: AppColors.primary,
                child: _sending
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : IconButton(
                        icon: const Icon(Icons.send, color: Colors.white, size: 18),
                        onPressed: _sendMessage,
                      ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
