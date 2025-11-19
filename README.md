# Same Mouth - Cooperative Farming Game 🌾

A multiplayer cooperative farming game where 2-8 players work together to grow crops, manage threats, and harvest before being overwhelmed by pests and weeds!

[![Tests](https://img.shields.io/badge/tests-78%20passing-brightgreen)](https://github.com/Lastofthefirst/same)
[![Built with](https://img.shields.io/badge/built%20with-SolidJS%20%2B%20Tauri-blue)](https://github.com/Lastofthefirst/same)
[![TDD](https://img.shields.io/badge/development-TDD-orange)](https://github.com/Lastofthefirst/same)

## 🎮 Features

### Cooperative Gameplay
- **2-8 Players**: Work together on dynamically scaled maps
- **6 Unique Roles**: Tiller, Planter, Waterer, Harvester, Weeder, Pest Catcher
- **Encouragement Mechanic**: Touch teammates for speed boosts
- **Shared Success**: All players work toward the same goal

### Complex Game Mechanics
- **Crop Lifecycle**: 6 growth stages (seed → mature)
- **Dynamic Watering**: Required stages + optional speed boosts
- **Pest AI**: Intelligent behavior targeting crops and wagon
- **Weed Spreading**: Adjacent tile infection mechanics
- **Wagon System**: Requires all players to cooperate

### Three Difficulty Levels
- **Balanced**: Casual farming experience
- **Challenging**: Faster threats, aggressive pests
- **Expert**: Maximum difficulty for skilled players

### Player Scaling
Maps and threats automatically scale for 2-8 players maintaining balanced difficulty per player.

## 📦 Installation

**Quick Start:**
```bash
# Download APK (Android)
# See releases: https://github.com/Lastofthefirst/same/releases

# Or build from source
git clone https://github.com/Lastofthefirst/same.git
cd same
pnpm install
pnpm test  # All 78 tests should pass!
```

**Full installation guide:** See [INSTALL.md](INSTALL.md)

## 🧪 Test-Driven Development

Built with comprehensive TDD methodology:

```bash
pnpm test
```

**78 tests passing** covering:
- ✅ TileMap generation & scaling (12 tests)
- ✅ Player movement & roles (24 tests)
- ✅ Crop lifecycle & growth (20 tests)
- ✅ Pest & weed systems (10 tests)
- ✅ **Automated gameplay simulations** (12 tests)

The automated tests literally **play the game** to validate all mechanics work correctly!

## 🎯 Game Roles

### Tiller 🔨
- Tills soil for planting
- Removes weeds (slower than Weeder)
- Auto-till when moving in same direction

### Planter 🌱
- Plants seeds in tilled soil
- Fast and efficient

### Waterer 💧
- Triangle spray pattern (3 tiles)
- No over-watering penalty
- Speeds up crop growth 2x

### Harvester 🌾
- Picks up mature crops
- Deposits at wagon
- Carries one crop at a time

### Weeder 🪴
- Removes weeds quickly
- Prevents spread
- Critical for crop protection

### Pest Catcher 🐿️
- Captures pests
- Carries to dropoff tiles
- One pest at a time

## 🚀 Quick Start (Development)

```bash
# Install dependencies
pnpm install

# Run tests (should see 78 passing!)
pnpm test

# Development mode
pnpm run dev

# Build for production
pnpm run build

# Build Android APK
pnpm run tauri android init
pnpm run tauri android build
```

## 📱 Platforms

- ✅ **Android** (APK available in releases)
- ⏳ **Desktop** (Windows, macOS, Linux - coming soon)
- ⏳ **Web** (PWA for multiplayer clients)

## 🏗️ Tech Stack

- **Frontend**: SolidJS (reactive UI)
- **Backend**: Tauri (Rust for native performance)
- **Game Engine**: PhaserJS (game logic)
- **Testing**: Vitest (comprehensive test suite)
- **Language**: TypeScript (type safety)

## 📊 Project Stats

- **Lines of Code**: ~5,700+
- **Test Coverage**: 78 tests (100% passing)
- **Files**: 28 source files
- **Systems**: 5 major game systems
- **Difficulty Configs**: 3 balanced presets

## 🎨 Game Design

Based on comprehensive requirements document with:
- Dynamic tile distribution algorithms
- Player count scaling formulas
- Growth timing mechanics
- Pest AI behavior patterns
- Difficulty balancing calculations

See [project_requirements.md](project_requirements.md) for full specifications.

## 🤝 Contributing

We welcome contributions! Please:

1. Read [INSTALL.md](INSTALL.md) for development setup
2. Follow TDD principles (write tests first!)
3. Ensure all tests pass before submitting PR
4. Maintain code style and documentation

## 📝 License

[MIT License](LICENSE) - See LICENSE file for details

## 🎉 Credits

Built from scratch using test-driven development methodology, starting from commit `3a77bf8` with just the requirements document.

**Development Highlights:**
- Comprehensive TDD from day one
- Automated gameplay integration tests
- Full game engine implementation
- Three difficulty configurations
- Player scaling algorithms

---

**Status**: ✅ Core game engine complete with 78 passing tests
**Next Steps**: Phaser rendering, multiplayer networking, UI polish

Built with ❤️ for cooperative gaming
