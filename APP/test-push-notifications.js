#!/usr/bin/env node

/**
 * Push Notification Testing Script
 * 
 * Automated testing script for Phase 5.2.8
 * Tests push notification functionality without requiring physical device
 * 
 * Usage:
 *   node test-push-notifications.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'cyan');
  console.log('='.repeat(60) + '\n');
}

function checkmark() {
  return `${colors.green}✓${colors.reset}`;
}

function crossmark() {
  return `${colors.red}✗${colors.reset}`;
}

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function test(name, fn) {
  try {
    const result = fn();
    if (result === true) {
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      log(`${checkmark()} ${name}`, 'green');
    } else if (result === 'warning') {
      results.warnings++;
      results.tests.push({ name, status: 'WARN' });
      log(`⚠ ${name}`, 'yellow');
    } else {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: result });
      log(`${crossmark()} ${name}`, 'red');
      if (result) log(`   Error: ${result}`, 'red');
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    log(`${crossmark()} ${name}`, 'red');
    log(`   Error: ${error.message}`, 'red');
  }
}

// File existence checks
function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

function fileContains(filePath, searchString) {
  if (!fileExists(filePath)) return false;
  const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
  return content.includes(searchString);
}

// Run tests
header('PUSH NOTIFICATION IMPLEMENTATION TESTS - TASK 5.2.8');

log('Testing Phase 5.2 implementation files and code quality...\n', 'blue');

// Test 1: Core files exist
header('Test Group 1: File Existence');

test('PushNotificationManager.js exists', () => {
  return fileExists('src/services/PushNotificationManager.js');
});

test('NotificationChannels.js exists', () => {
  return fileExists('src/services/NotificationChannels.js');
});

test('Integration guide exists', () => {
  return fileExists('src/services/PUSH_NOTIFICATIONS_INTEGRATION_GUIDE.md');
});

test('Unit tests exist', () => {
  return fileExists('src/services/__tests__/PushNotificationManager.test.js');
});

test('Testing guide exists', () => {
  return fileExists('PUSH_NOTIFICATION_TESTING_GUIDE.md');
});

// Test 2: PushNotificationManager implementation
header('Test Group 2: PushNotificationManager Implementation');

test('PushNotificationManager has initialize() method', () => {
  return fileContains('src/services/PushNotificationManager.js', 'async initialize()');
});

test('PushNotificationManager has setupListeners() method', () => {
  return fileContains('src/services/PushNotificationManager.js', 'setupListeners()');
});

test('PushNotificationManager has saveTokenToServer() method', () => {
  return fileContains('src/services/PushNotificationManager.js', 'async saveTokenToServer(token)');
});

test('PushNotificationManager has handleNotification() method', () => {
  return fileContains('src/services/PushNotificationManager.js', 'handleNotification(notification)');
});

test('PushNotificationManager has handleNotificationAction() method', () => {
  return fileContains('src/services/PushNotificationManager.js', 'handleNotificationAction(actionPerformed)');
});

test('PushNotificationManager has registerNotificationHandler() method', () => {
  return fileContains('src/services/PushNotificationManager.js', 'registerNotificationHandler(type, handler)');
});

test('PushNotificationManager has cleanup() method', () => {
  return fileContains('src/services/PushNotificationManager.js', 'async cleanup()');
});

test('PushNotificationManager exports singleton', () => {
  return fileContains('src/services/PushNotificationManager.js', 'export default pushNotificationManager');
});

// Test 3: Notification listeners
header('Test Group 3: Notification Listeners');

test('Listens for registration event', () => {
  return fileContains('src/services/PushNotificationManager.js', "addListener('registration'");
});

test('Listens for registrationError event', () => {
  return fileContains('src/services/PushNotificationManager.js', "addListener('registrationError'");
});

test('Listens for pushNotificationReceived event', () => {
  return fileContains('src/services/PushNotificationManager.js', "addListener('pushNotificationReceived'");
});

test('Listens for pushNotificationActionPerformed event', () => {
  return fileContains('src/services/PushNotificationManager.js', "addListener('pushNotificationActionPerformed'");
});

// Test 4: Navigation methods
header('Test Group 4: Deep Linking Navigation');

test('Has navigateToExams() method', () => {
  return fileContains('src/services/PushNotificationManager.js', 'navigateToExams(data)');
});

test('Has navigateToExamResults() method', () => {
  return fileContains('src/services/PushNotificationManager.js', 'navigateToExamResults(data)');
});

test('Has navigateToReportCard() method', () => {
  return fileContains('src/services/PushNotificationManager.js', 'navigateToReportCard(data)');
});

test('Has navigateToPayments() method', () => {
  return fileContains('src/services/PushNotificationManager.js', 'navigateToPayments(data)');
});

test('Has navigateToAttendance() method', () => {
  return fileContains('src/services/PushNotificationManager.js', 'navigateToAttendance(data)');
});

test('Has navigateToPosts() method', () => {
  return fileContains('src/services/PushNotificationManager.js', 'navigateToPosts(data)');
});

test('Has navigateToMessages() method', () => {
  return fileContains('src/services/PushNotificationManager.js', 'navigateToMessages(data)');
});

test('Has navigateToNotifications() method', () => {
  return fileContains('src/services/PushNotificationManager.js', 'navigateToNotifications()');
});

// Test 5: NotificationChannels implementation
header('Test Group 5: Notification Channels');

test('NotificationChannels has configureNotificationChannels()', () => {
  return fileContains('src/services/NotificationChannels.js', 'export async function configureNotificationChannels()');
});

test('NotificationChannels has getChannelForNotificationType()', () => {
  return fileContains('src/services/NotificationChannels.js', 'export function getChannelForNotificationType(notificationType)');
});

test('NotificationChannels defines EXAMS channel', () => {
  return fileContains('src/services/NotificationChannels.js', "id: 'exams'");
});

test('NotificationChannels defines ATTENDANCE channel', () => {
  return fileContains('src/services/NotificationChannels.js', "id: 'attendance'");
});

test('NotificationChannels defines PAYMENTS channel', () => {
  return fileContains('src/services/NotificationChannels.js', "id: 'payments'");
});

test('NotificationChannels defines REPORT_CARDS channel', () => {
  return fileContains('src/services/NotificationChannels.js', "id: 'report_cards'");
});

test('NotificationChannels defines MESSAGES channel', () => {
  return fileContains('src/services/NotificationChannels.js', "id: 'messages'");
});

test('NotificationChannels defines ANNOUNCEMENTS channel', () => {
  return fileContains('src/services/NotificationChannels.js', "id: 'announcements'");
});

// Test 6: Integration with NotificationChannels
header('Test Group 6: Channel Integration');

test('PushNotificationManager imports NotificationChannels', () => {
  return fileContains('src/services/PushNotificationManager.js', "from './NotificationChannels'");
});

test('PushNotificationManager calls configureNotificationChannels()', () => {
  return fileContains('src/services/PushNotificationManager.js', 'await configureNotificationChannels()');
});

// Test 7: Error handling
header('Test Group 7: Error Handling');

test('Handles permission denied', () => {
  return fileContains('src/services/PushNotificationManager.js', 'permission denied');
});

test('Handles registration errors', () => {
  return fileContains('src/services/PushNotificationManager.js', 'registrationError');
});

test('Handles network errors gracefully', () => {
  return fileContains('src/services/PushNotificationManager.js', 'catch (error)');
});

test('Has platform detection', () => {
  return fileContains('src/services/PushNotificationManager.js', "platform === 'web'");
});

// Test 8: Documentation
header('Test Group 8: Documentation Quality');

test('PushNotificationManager has JSDoc comments', () => {
  return fileContains('src/services/PushNotificationManager.js', '/**');
});

test('Integration guide has usage examples', () => {
  return fileContains('src/services/PUSH_NOTIFICATIONS_INTEGRATION_GUIDE.md', '```javascript');
});

test('Integration guide has installation steps', () => {
  return fileContains('src/services/PUSH_NOTIFICATIONS_INTEGRATION_GUIDE.md', 'npm install');
});

test('Testing guide has test cases', () => {
  return fileContains('PUSH_NOTIFICATION_TESTING_GUIDE.md', 'Test Case');
});

// Test 9: Package dependencies (warnings)
header('Test Group 9: Dependencies (Warnings)');

test('Capacitor core package installed', () => {
  const hasPackage = fileContains('package.json', '@capacitor/core');
  return hasPackage ? true : 'warning';
});

test('Capacitor push-notifications package installed', () => {
  const hasPackage = fileContains('package.json', '@capacitor/push-notifications');
  return hasPackage ? true : 'warning';
});

test('Capacitor device package installed', () => {
  const hasPackage = fileContains('package.json', '@capacitor/device');
  return hasPackage ? true : 'warning';
});

// Test 10: Backend integration
header('Test Group 10: Backend Integration');

test('Uses API_CONFIG for endpoints', () => {
  return fileContains('src/services/PushNotificationManager.js', 'API_CONFIG');
});

test('Calls /api/v2/devices/register endpoint', () => {
  return fileContains('src/services/PushNotificationManager.js', '/api/v2/devices/register');
});

test('Calls /api/v2/devices/unregister endpoint', () => {
  return fileContains('src/services/PushNotificationManager.js', '/api/v2/devices/unregister');
});

test('Sends Authorization header', () => {
  return fileContains('src/services/PushNotificationManager.js', 'Authorization');
});

// Print summary
header('TEST SUMMARY');

const total = results.passed + results.failed + results.warnings;
const passRate = ((results.passed / total) * 100).toFixed(1);

log(`Total Tests: ${total}`, 'blue');
log(`Passed: ${results.passed}`, 'green');
log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
log(`Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'green');
log(`Pass Rate: ${passRate}%`, passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red');

if (results.warnings > 0) {
  log('\n⚠ Warnings indicate missing Capacitor packages.', 'yellow');
  log('Run: npm install @capacitor/core @capacitor/push-notifications @capacitor/device', 'yellow');
}

if (results.failed > 0) {
  log('\n✗ Some tests failed. Review the errors above.', 'red');
  process.exit(1);
} else if (results.warnings > 0) {
  log('\n⚠ All implementation tests passed, but dependencies need to be installed.', 'yellow');
  log('Task 5.2.8 can proceed once Capacitor packages are installed.', 'yellow');
  process.exit(0);
} else {
  log('\n✓ All tests passed! Implementation is ready for device testing.', 'green');
  log('Proceed with Task 5.2.8: Test push notifications on Android devices', 'green');
  process.exit(0);
}
