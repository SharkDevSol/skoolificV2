/// Turns raw network/plugin exceptions into short, human messages.
/// The login screen used to show the whole Dart stack text
/// ("ClientException with SocketException: Connection reset by peer ...").
String friendlyError(Object e, {String fallback = 'Something went wrong. Please try again.'}) {
  final raw = e.toString();
  final s = raw.toLowerCase();

  const networkHints = [
    'socketexception',
    'clientexception',
    'connection reset',
    'connection refused',
    'connection closed',
    'connection aborted',
    'failed host lookup',
    'network is unreachable',
    'network is down',
    'no route to host',
    'timed out',
    'timeout',
    'handshake',
    'os error',
    'xmlhttprequest',
    'unable to resolve host',
  ];
  if (networkHints.any(s.contains)) {
    return 'Connection problem. Check your internet and try again.';
  }

  final cleaned = raw
      .replaceAll('Exception:', '')
      .replaceAll('DioException', '')
      .trim();
  return cleaned.isEmpty ? fallback : cleaned;
}
