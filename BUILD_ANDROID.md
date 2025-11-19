# Building Android APK - Same Mouth

This guide explains how to build Android APKs for the Same Mouth cooperative farming game.

## Prerequisites

### Required Software

1. **Android Studio** (recommended) or Android Command Line Tools
   - Download from: https://developer.android.com/studio

2. **Android SDK**
   - API Level 33 or higher
   - Install via Android Studio SDK Manager

3. **Android NDK**
   - Version 25.x recommended
   - Install via Android Studio SDK Manager or sdkmanager

4. **Java JDK 17**
   - Download from: https://adoptium.net/

5. **Rust**
   - Install from: https://rustup.rs/
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

6. **Node.js & pnpm**
   ```bash
   # Install Node.js v18+
   # Then install pnpm
   npm install -g pnpm
   ```

## Setup Environment Variables

Add these to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
# Android SDK (adjust path to your installation)
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME

# Android NDK
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653

# Java
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64  # Adjust for your system

# Add to PATH
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$JAVA_HOME/bin
```

Reload your shell:
```bash
source ~/.bashrc  # or ~/.zshrc
```

## Verify Installation

```bash
# Check Java
java -version  # Should show version 17.x

# Check Android SDK
sdkmanager --list | head -20

# Check NDK
ls $ANDROID_NDK_HOME

# Check Rust
rustc --version
```

## Building the APK

### Step 1: Clone and Install Dependencies

```bash
git clone https://github.com/Lastofthefirst/same.git
cd same
pnpm install
```

### Step 2: Run Tests (Optional but Recommended)

```bash
pnpm test
# Should see 78 tests passing ✅
```

### Step 3: Initialize Android Project

This only needs to be done once:

```bash
pnpm run tauri:android:init
```

This creates the `src-tauri/gen/android` directory with Android project files.

### Step 4: Build the APK

**Option A: Debug APK (for testing)**
```bash
pnpm run tauri:android:build:apk
```

**Option B: Release APK (for distribution)**

First, create a signing key:
```bash
keytool -genkey -v -keystore same-release.keystore \
  -alias same-key -keyalg RSA -keysize 2048 -validity 10000
```

Then configure signing in `src-tauri/gen/android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file("../../../same-release.keystore")
            storePassword "your-password"
            keyAlias "same-key"
            keyPassword "your-password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

Build release APK:
```bash
pnpm run tauri:android:build:apk -- --release
```

### Step 5: Build AAB (for Google Play)

For Google Play Store submission, build an AAB instead:

```bash
pnpm run tauri:android:build:aab -- --release
```

## Output Locations

After building, find your files at:

**APK:**
```
src-tauri/gen/android/app/build/outputs/apk/debug/app-debug.apk
src-tauri/gen/android/app/build/outputs/apk/release/app-release.apk
```

**AAB:**
```
src-tauri/gen/android/app/build/outputs/bundle/release/app-release.aab
```

## Testing the APK

### Install on Device/Emulator

**Via USB:**
```bash
adb install src-tauri/gen/android/app/build/outputs/apk/debug/app-debug.apk
```

**Via Android Studio:**
1. Open Android Studio
2. Device Manager > Connect device or start emulator
3. Drag APK onto emulator window

### Testing on Physical Device

1. Enable Developer Options on your device:
   - Settings > About Phone > Tap "Build Number" 7 times

2. Enable USB Debugging:
   - Settings > Developer Options > USB Debugging

3. Connect device via USB

4. Install:
   ```bash
   adb devices  # Verify device is connected
   adb install path/to/app-debug.apk
   ```

## Automated GitHub Actions Build

The project includes a GitHub Actions workflow (`.github/workflows/build-apk.yml`) that:

1. Runs all 78 tests
2. Builds both APK and AAB
3. Creates GitHub releases automatically
4. Uploads artifacts

To trigger:
```bash
# Create a new version tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

The workflow will build and attach APK/AAB to the GitHub release.

## Troubleshooting

### "SDK location not found"

Create `local.properties` in `src-tauri/gen/android/`:
```
sdk.dir=/path/to/Android/Sdk
```

### "NDK not found"

```bash
sdkmanager --install "ndk;25.2.9519653"
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653
```

### "Java version mismatch"

Ensure Java 17 is active:
```bash
update-alternatives --config java  # Linux
# Or set JAVA_HOME explicitly
```

### Build fails with "No toolchains found"

Add Android targets to Rust:
```bash
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add i686-linux-android
rustup target add x86_64-linux-android
```

### Permission denied on APK install

On your device:
- Settings > Security > Unknown Sources > Enable
- Or: Settings > Apps > Special Access > Install Unknown Apps

## App Signing for Play Store

### Generate Upload Key

```bash
keytool -genkey -v -keystore upload-keystore.jks \
  -storetype JKS -keyalg RSA -keysize 2048 \
  -validity 10000 -alias upload
```

### Configure Gradle

Edit `src-tauri/gen/android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file("../../../upload-keystore.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias "upload"
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
}
```

### Build for Play Store

```bash
export KEYSTORE_PASSWORD="your-keystore-password"
export KEY_PASSWORD="your-key-password"
pnpm run tauri:android:build:aab -- --release
```

Upload the AAB file to Google Play Console.

## Size Optimization

To reduce APK size:

1. **Enable ProGuard** (in `build.gradle`):
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
    }
}
```

2. **Split APKs by ABI**:
```gradle
android {
    splits {
        abi {
            enable true
            reset()
            include 'armeabi-v7a', 'arm64-v8a'
        }
    }
}
```

## Resources

- [Tauri Android Guide](https://tauri.app/distribute/google-play/)
- [Android Developer Docs](https://developer.android.com/studio/build/building-cmdline)
- [Google Play Console](https://play.google.com/console)

---

**Note**: The first Android build can take 10-30 minutes as it downloads and compiles dependencies. Subsequent builds are much faster (~2-5 minutes).

Built for **Same Mouth** - Cooperative Farming Game 🌾
