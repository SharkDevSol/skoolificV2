package com.skoolific.student

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
                "areNotificationsEnabled" -> {
                    try {
                        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
                        val enabled = nm.areNotificationsEnabled()
                        result.success(enabled)
                    } catch (e: Exception) {
                        result.success(true)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

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
                        description = "Marks, attendance, tests, discipline and messages"
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
