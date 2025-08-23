# Same Mouth - Cooperative Farming Game

A multiplayer cooperative farming game built with **Tauri v2**, **SolidJS**, and **PhaserJS**. Players work together to grow crops before being overwhelmed by pests and weeds.

![Game Screenshots](https://github.com/user-attachments/assets/0cab73f4-7f79-41ef-9c17-2ca25319a685)

## 🎮 Game Overview

- **Cooperative farming game** for 2+ players
- **Objective**: Grow and harvest as many crops as possible before being overwhelmed by squirrels, rabbits, and weeds
- **Shared benefits**: Players must work together—all benefits are shared
- **Endgame**: Game ends when players collectively decide to take the wagon away

## 🚀 Features Implemented

### ✅ Multiplayer Foundation
- **Agricultural Room Codes**: IP addresses converted to memorable farming terms (e.g., "farm leaf" = 192.168.0.10)
- **Dual Platform Support**: 
  - Tauri app can host games and join games
  - PWA version for clients to join hosted games
- **Network Architecture**: Ready for Socket.IO implementation with simulation layer

### ✅ Game Engine
- **PhaserJS Integration**: Smooth 2D game engine with physics
- **Player Movement**: WASD/Arrow key controls with real-time updates
- **Lobby System**: Visual lobby for testing multiplayer before full game features

### ✅ UI/UX
- **Themed Interface**: Agricultural green color scheme with farming emojis
- **Responsive Design**: Works across desktop and mobile
- **PWA Support**: Installable web app with offline capabilities

## 🛠️ Technology Stack

- **Frontend**: SolidJS + PhaserJS
- **Backend**: Tauri v2 (Rust)
- **Networking**: Socket.IO (foundation ready)
- **Build**: Vite + PWA Plugin
- **Styling**: Inline styles with agricultural theme

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- pnpm
- Rust (for Tauri builds)

### Quick Start
```bash
# Clone the repository
git clone https://github.com/Lastofthefirst/same.git
cd same

# Install dependencies
pnpm install

# Run development server (web version)
pnpm dev

# Build web version
pnpm build

# Build Tauri app (requires system dependencies)
pnpm run tauri build
```

### Development Notes
- Use `pnpm build` to test web compilation quickly
- Use `pnpm run tauri build` to build the desktop app (may require GTK dependencies on Linux)
- The game runs in browser during development at `http://localhost:1420`

## 🎯 Current Implementation Status

### Phase 1: Foundation ✅ COMPLETE
- [x] PhaserJS game engine integration
- [x] Basic multiplayer lobby system
- [x] Agricultural word mapping for IP addresses
- [x] Tauri + SolidJS setup
- [x] PWA version for clients
- [x] Themed UI with farming aesthetics

### Phase 2: Networking 🔄 IN PROGRESS
- [x] Network manager foundation with simulation
- [x] Room code system (farm words)
- [ ] Actual Socket.IO server implementation
- [ ] Real multiplayer connection testing
- [ ] Player synchronization

### Phase 3: Core Gameplay 📋 PLANNED
- [ ] Tile-based farming mechanics
- [ ] Crop growing and watering systems
- [ ] Pest and weed spawning
- [ ] Cooperative mechanics
- [ ] Wagon system for endgame

### Phase 4: Polish 📋 PLANNED
- [ ] Sound effects and music
- [ ] Advanced UI animations
- [ ] Difficulty scaling
- [ ] Performance optimization

## 🎮 How to Play

### For Hosts (Tauri App)
1. Launch the Tauri application
2. Click "🏠 Host Game"
3. Click "🚀 Start Hosting"
4. Share the room code (e.g., "farm leaf") with other players
5. Wait for players to join, then click "🎮 Start Game"

### For Clients (PWA or Tauri)
1. Open the PWA or Tauri app
2. Click "🌐 Join Game"
3. Enter the room code shared by the host
4. Click "🌐 Join Game" to connect

### In Game
- Use **WASD** or **Arrow Keys** to move your character
- Work cooperatively with other players
- *(Full farming mechanics coming in Phase 3)*

## 🌐 Network Architecture

### Room Code System
The game uses a unique agricultural word mapping system:

- **IP ranges** → **Farm words**:
  - `192.168.0.x` → `farm [crop]`
  - `192.168.1.x` → `barn [crop]`
  - `10.0.0.x` → `field [crop]`

- **Host numbers** → **Crop words**:
  - `.1` → `soil`, `.2` → `seed`, `.3` → `corn`, etc.

**Example**: `192.168.0.10` becomes `"farm leaf"`

### Multiplayer Flow
1. **Host** starts Tauri app, gets agricultural room code
2. **Clients** join via PWA using the room code
3. **Game state** synchronized via Socket.IO (when implemented)
4. **Disconnection handling** allows rejoin with character persistence

## 📁 Project Structure

```
src/
├── components/          # SolidJS UI components
│   ├── GameContainer.jsx    # Phaser game wrapper
│   └── GameLobby.jsx       # Lobby UI with host/join flows
├── game/               # Phaser game logic
│   └── GameScene.js        # Main game scene with player movement
├── network/            # Networking layer
│   └── NetworkManager.js   # Socket.IO manager with room codes
└── utils/              # Utility functions

src-tauri/              # Rust backend
├── Cargo.toml             # Rust dependencies
└── src/                   # Tauri commands and server logic

public/                 # Static assets
├── icon-192.svg           # PWA icon (small)
└── icon-512.svg           # PWA icon (large)
```

## 🔧 Configuration

### Environment Variables
- `TAURI_DEV_HOST`: Development host for Tauri
- `VITE_PWA_MODE`: Enable PWA-specific features

### Key Files
- `vite.config.js`: Build configuration with PWA support
- `src-tauri/tauri.conf.json`: Tauri app configuration
- `package.json`: Dependencies and scripts

## 🐛 Development Notes

### Known Limitations
- **Networking**: Currently simulated - Socket.IO server needs implementation
- **Tauri Build**: May require system GTK dependencies on Linux
- **Bundle Size**: Large due to Phaser (1.5MB) - consider code splitting

### Testing
- **Web Version**: `pnpm build && pnpm serve` for quick testing
- **Multiplayer**: Currently simulated - room codes work but no real networking
- **PWA**: Automatically detects Tauri vs web environment

### Performance Tips
- Game runs at 60 FPS with Phaser's optimized renderer
- PWA caches assets for offline use
- Agricultural word mapping is computed client-side for speed

## 🎨 Design Decisions

### Agricultural Theme
- **Colors**: Deep green (`#2a5d31`) with light green (`#90EE90`) accents
- **Icons**: Farming emojis (🌾, 🏠, 🌐, 🎮)
- **Room Codes**: Agricultural words for memorability and theme consistency

### Technology Choices
- **SolidJS**: Lightweight, reactive UI framework
- **PhaserJS**: Mature 2D game engine with physics
- **Tauri**: Cross-platform desktop apps with web frontend
- **Socket.IO**: Real-time multiplayer communication (planned)

## 🔮 Future Roadmap

### Short Term
1. **Complete Socket.IO Integration**: Real multiplayer networking
2. **Tile-based Farming**: Core crop growing mechanics
3. **Basic Cooperation**: Shared tools and resources

### Medium Term
1. **Advanced Farming**: Multiple crop types, seasons, weather
2. **Pest Management**: Dynamic threat spawning and removal
3. **Progression System**: Unlockable tools and abilities

### Long Term
1. **Multiple Game Modes**: Different farm sizes and difficulties
2. **Campaign Mode**: Story-driven cooperative challenges
3. **Mod Support**: Custom crops, tools, and game modes

## 🤝 Contributing

This project follows the cooperative spirit of the game itself! Key areas for contribution:

1. **Networking**: Complete the Socket.IO server implementation
2. **Game Mechanics**: Implement crop lifecycle and pest systems
3. **UI/UX**: Enhance the farming theme and mobile experience
4. **Performance**: Optimize for lower-end devices

## 📄 License

MIT License - Feel free to fork and build your own farming empire!

---

**Built with ❤️ and 🌾 for cooperative gaming**