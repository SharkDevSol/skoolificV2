import java.util.Properties

plugins {
    id("com.android.application")
    // FCM push notifications (Google services) — versioned here, applied below
    id("com.google.gms.google-services") version "4.4.2" apply false
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.skoolific.guardian"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = "28.2.13676358"

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.skoolific.guardian"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("upload") {
            // Google Play upload key (from key.properties)
            val keystoreProperties = Properties()
            val keystorePropertiesFile = rootProject.file("key.properties")
            if (keystorePropertiesFile.exists()) {
                keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }
            }
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
        }
    }

    packagingOptions {
        // FIX: the engine artifact (libflutter.so) ships unstripped (165MB);
        // AGP 9 keeps symbols by default. Strip everything on release:
        jniLibs {
            keepDebugSymbols -= "**/*.so"
        }
    }

    buildTypes {
        release {
            // Sign with the upload key for Google Play (falls back to debug
            // signing when key.properties is missing, so --release still runs)
            val keystorePropertiesFile = rootProject.file("key.properties")
            signingConfig = if (keystorePropertiesFile.exists())
                signingConfigs.getByName("upload")
            else
                signingConfigs.getByName("debug")
            // strip debug symbols from native libs (libflutter.so 165MB -> 12MB)
            isMinifyEnabled = false
            isShrinkResources = false
            ndk { debugSymbolLevel = "NONE" }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

// 6.2: FCM — the firebase_messaging Flutter plugin brings the native library;
// we only apply the google-services plugin to read google-services.json.
apply(plugin = "com.google.gms.google-services")
