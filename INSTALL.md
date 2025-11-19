# Installation Guide - Same Mouth Cooperative Farming Game

## Quick Start

### For Users (Download Pre-built)

**Android:**
1. Download the latest APK from [Releases](https://github.com/Lastofthefirst/same/releases)
2. Enable "Install from Unknown Sources" in your Android settings
3. Install the APK and launch the game

**Desktop (Coming Soon):**
- Windows: Download `.msi` installer
- macOS: Download `.dmg` installer
- Linux: Download `.AppImage` or `.deb`

---

## For Developers (Build from Source)

### Prerequisites

**Required:**
- [Node.js](https://nodejs.org/) v18 or higher
- [pnpm](https://pnpm.io/) v8 or higher
- [Rust](https://rustup.rs/) (latest stable)

**For Android builds:**
- [Android Studio](https://developer.android.com/studio)
- Android SDK (API level 33+)
- Android NDK
- Java JDK 17+

**For Desktop builds:**
- Linux: `webkit2gtk` development libraries
- macOS: Xcode Command Line Tools
- Windows: WebView2 (usually pre-installed on Windows 10+)

### Installation Steps

#### 1. Clone the Repository

```bash
git clone https://github.com/Lastofthefirst/same.git
cd same
```

#### 2. Install Dependencies

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install project dependencies
pnpm install
```

#### 3. Development

**Run in Development Mode:**
```bash
# Web development (hot reload)
pnpm run dev

# Desktop development
pnpm run tauri dev
```

**Run Tests:**
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run with coverage
pnpm test:coverage
```

#### 4. Build for Production

**Web Build:**
```bash
pnpm run build
```

**Desktop Build:**
```bash
pnpm run tauri build
```

**Android Build:**

First, initialize Android development:
```bash
pnpm run tauri android init
```

Then build the APK:
```bash
pnpm run tauri android build
```

Or build AAB (for Google Play):
```bash
pnpm run tauri android build --apk
pnpm run tauri android build --aab
```

---

## Project Structure

```
same/
├── src/                          # Frontend source code
│   ├── game/                     # Game engine
│   │   ├── config/              # Difficulty configs & types
│   │   ├── core/                # Core systems (TileMap, GameState)
│   │   ├── systems/             # Game systems (Player, Crop, Pests)
│   │   └── integration/         # Integration tests
│   ├── components/              # UI components (future)
│   ├── test/                    # Test utilities
│   ├── App.tsx                  # Main app component
│   └── index.tsx                # Entry point
├── src-tauri/                   # Tauri backend
│   ├── src/                     # Rust source
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration
├── tests/                       # Integration tests
└── package.json                # Node dependencies

```

---

## Test Suite

The game is built with comprehensive test-driven development:

**Test Coverage: 78 tests passing** ✅

- **TileMap System** (12 tests): Map generation, scaling, tile distribution
- **Player System** (24 tests): Movement, roles, encouragement mechanic
- **Crop System** (20 tests): Lifecycle, growth stages, watering
- **Threat Systems** (10 tests): Pests & weeds with AI behavior
- **Automated Gameplay** (12 tests): Full game simulations

Run tests with:
```bash
pnpm test
```

---

## Troubleshooting

### Android Build Issues

**NDK not found:**
```bash
# Set NDK path in environment
export ANDROID_NDK_HOME=/path/to/ndk
```

**SDK not found:**
```bash
# Set SDK path
export ANDROID_HOME=/path/to/sdk
```

**Build fails with Java version error:**
- Ensure you have JDK 17 installed
- Set `JAVA_HOME` to JDK 17 location

### Desktop Build Issues

**Linux - webkit2gtk not found:**
```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.0-dev

# Fedora
sudo dnf install webkit2gtk4.0-devel

# Arch
sudo pacman -S webkit2gtk
```

**macOS - Missing Command Line Tools:**
```bash
xcode-select --install
```

### Test Failures

If tests fail, ensure you're using:
- Node.js v18+
- Latest dependencies: `pnpm install`

---

## Configuration

### Game Difficulty

Three difficulty levels are pre-configured in `src/game/config/difficulties.ts`:

- **Balanced**: Casual gameplay, forgiving mechanics
- **Challenging**: Faster threats, more aggressive pests
- **Expert**: Maximum difficulty, precise timing required

### Player Scaling

The game automatically scales based on player count (2-8 players):
- Map size increases
- Threat density adjusts
- Crop thresholds scale

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Write tests for new features (TDD approach)
4. Ensure all tests pass: `pnpm test`
5. Commit your changes: `git commit -m "Add feature"`
6. Push to the branch: `git push origin feature-name`
7. Submit a Pull Request

**Development Guidelines:**
- Follow TDD principles (write tests first)
- Maintain 100% test pass rate
- Use TypeScript for type safety
- Follow existing code structure

---

## License

See [LICENSE](LICENSE) file for details.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/Lastofthefirst/same/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Lastofthefirst/same/discussions)

---

Built with ❤️ using SolidJS, Tauri, and PhaserJS
