package com.skoolific.guardian

import android.app.NotificationManager
import android.content.Intent
import android.os.Build
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "app.channel.shared.data"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        createSkoolificAlertsChannel()
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "openNotificationSettings" -> {
                    try {
                        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                                putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
                            }
                        } else {
                            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                                data = android.net.Uri.parse("package:$packageName")
                            }
                        }
                        startActivity(intent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("ERROR", e.message, null)
                    }
                }
                // 1.1: report whether notifications are enabled for this app
                "areNotificationsEnabled" -> {
                    try {
                        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
                        val enabled = nm.areNotificationsEnabled()
                        result.success(enabled)
                    } catch (e: Exception) {
                        // Very old Android — assume enabled
                        result.success(true)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    /// T4: create the 'skoolific_alerts' notification channel WITH sound and
    /// vibration. The backend FCM pushes target this channel id; without the
    /// channel, Android 8+ devices show notifications silently.
    private fun createSkoolificAlertsChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
                val existing = nm.getNotificationChannel("skoolific_alerts")
                if (existing == null) {
                    val ch = android.app.NotificationChannel(
                        "skoolific_alerts",
                        "Skoolific Alerts",
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "Marks, attendance, payments, discipline and messages"
                        enableVibration(true)
                        setSound(
                            android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION),
                            android.media.AudioAttributes.Builder()
                                .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build()
                        )
                    }
                    nm.createNotificationChannel(ch)
                }
            } catch (_: Exception) {
            }
        }
    }
}
