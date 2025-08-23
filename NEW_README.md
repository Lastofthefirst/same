# Eat with the Same Mouth

A cooperative farming game built with Tauri (desktop/mobile) and PWA technologies, using SolidJS and Phaser for multiplayer farming fun.

## Project Structure

This project is organized into three main parts:

```
same/
├── tauri-app/          # Tauri application (desktop + mobile + hosting)
├── pwa/               # Progressive Web App (client-only)
├── shared/            # Shared code library (game logic, UI components, utilities)
└── package.json       # Workspace orchestration
```

### 🏠 Tauri App (`tauri-app/`)
- **Desktop & Mobile**: Runs on Windows, macOS, Linux, iOS, Android
- **Game Hosting**: Can host game rooms on local network via WebSocket server
- **Full Features**: Host games, join games, play games
- **Agricultural Networking**: Uses IP-to-farm-words mapping ("192.168.0.10" → "farm soil")

### 📱 PWA (`pwa/`)
- **Web Client**: Runs in any modern browser
- **Join Only**: Can join games hosted by Tauri apps
- **Offline-First**: Works offline once loaded
- **Same UX**: Identical gameplay experience to Tauri app

### 📦 Shared Library (`shared/`)
- **Common Code**: Game logic, UI components, networking utilities
- **IP Mapping**: Agricultural word system for easy network identification
- **Utilities**: QR code generation, WebSocket management, game state

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Rust (for Tauri builds)

### Install Dependencies
```bash
# Install all dependencies across workspace
pnpm run install:all
```

### Development

#### Start PWA Development Server
```bash
pnpm run dev:pwa
# Opens at http://localhost:5173
```

#### Start Tauri Development (Frontend only)
```bash
pnpm run dev:tauri
# Note: Use build for full Tauri testing
```

### Building

#### Build Everything
```bash
pnpm run build:all
```

#### Build Individual Parts
```bash
pnpm run build:pwa       # PWA only
pnpm run build:tauri     # Tauri frontend only
```

#### Build Tauri App (Complete)
```bash
cd tauri-app
pnpm run tauri build    # Full Tauri app with backend
```

## 🎮 How to Play

### Hosting a Game (Tauri App)
1. Open the Tauri app on desktop or mobile
2. Click "Host New Farm"
3. Share the farm code (e.g., "farm soil") with friends
4. Players will appear in the lobby as they join
5. Start the game when everyone is ready

### Joining a Game (PWA or Tauri App)
1. Get the farm code from the host
2. Open PWA at `localhost:5173` or open Tauri app
3. Click "Join Farm" and enter the farm code
4. Wait for the host to start the game

### Agricultural Network Codes
The system automatically converts IP addresses to memorable farm-themed names:
- `192.168.0.10` → `"farm soil"`
- `192.168.1.25` → `"field onion"`
- `10.0.0.5` → `"grove stem"`

## 🌾 Game Overview

**Same Mouth** is a cooperative farming game where 2+ players work together to:
- 🌱 Plant and water crops
- 🐛 Fight off pests and weeds
- 🚜 Share tools and resources
- 🏆 Maximize harvest before being overwhelmed

Players must coordinate and communicate - individual success means nothing without team success!

## 🛠 Technical Architecture

### Multiplayer Networking
- **Host**: Tauri app runs WebSocket server on port 3847
- **Clients**: Connect via WebSocket (PWA or other Tauri apps)
- **Agricultural Codes**: IP addresses mapped to farm words for easy sharing
- **Local Network**: Games run on local network for optimal performance

### Shared Code Approach
- **Same Codebase**: Tauri frontend and PWA share 90% of code
- **Component Reuse**: UI components work in both environments
- **Game Logic**: Identical game behavior across platforms
- **Styling**: Consistent farming-themed design

### Real-time Synchronization
- **Player Movement**: Delta sync every frame
- **Game State**: Synchronized between all clients
- **Disconnection Handling**: Players can rejoin mid-game

## 🔧 Development Notes

### Testing Builds
- Use `pnpm run tauri build` instead of `tauri dev` for full testing
- PWA can be tested with `pnpm run dev:pwa`
- Full multiplayer testing requires building both parts

### Adding Features
- Add shared logic to `shared/src/`
- UI components go in `shared/src/components/`
- Platform-specific features go in respective app directories

### Deployment
- **PWA**: Deploy `pwa/dist/` to any static hosting (Vercel, Netlify, etc.)
- **Tauri**: Build installers for each platform as needed
- **Update URLs**: Change PWA URL in QR codes for production

---

**Built with ❤️ using SolidJS, Tauri v2, Phaser, and lots of farming spirit! 🌾**