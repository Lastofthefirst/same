import { createSignal, createEffect, For } from "solid-js";
import { generatePlayerId } from "../utils/networkUtils.js";

/**
 * Multi-player manager for supporting multiple players on the same device
 * Shows when viewport is large enough (desktop/tablet landscape)
 */
function MultiPlayerManager({ 
  connectionInfo, 
  wsConnection, 
  onPlayersChange,
  maxPlayers = 4 
}) {
  const [localPlayers, setLocalPlayers] = createSignal([]);
  const [isLargeScreen, setIsLargeScreen] = createSignal(false);

  // Check screen size
  const checkScreenSize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    // Consider large screen if width > 1024px or landscape tablet
    const isLarge = width > 1024 || (width > 768 && width > height);
    setIsLargeScreen(isLarge);
  };

  // Initialize screen size check
  createEffect(() => {
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  });

  // Initialize with one player if large screen
  createEffect(() => {
    if (isLargeScreen() && localPlayers().length === 0) {
      addPlayer();
    }
  });

  // Notify parent when players change
  createEffect(() => {
    onPlayersChange?.(localPlayers());
  });

  const addPlayer = () => {
    if (localPlayers().length >= maxPlayers) return;
    
    const newPlayer = {
      id: generatePlayerId(),
      name: `Player ${localPlayers().length + 1}`,
      keyBinding: getDefaultKeyBinding(localPlayers().length),
      connected: false,
      isLocal: true
    };
    
    setLocalPlayers(prev => [...prev, newPlayer]);
    
    // Auto-connect if websocket is available
    if (wsConnection && wsConnection.isConnected) {
      connectPlayer(newPlayer);
    }
  };

  const removePlayer = (playerId) => {
    const player = localPlayers().find(p => p.id === playerId);
    if (player && player.connected && wsConnection) {
      // Send leave message for this player
      wsConnection.send({
        type: 'PLAYER_LEAVE',
        data: {
          playerId: playerId,
          timestamp: Date.now()
        }
      });
    }
    
    setLocalPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const connectPlayer = (player) => {
    if (!wsConnection || !wsConnection.isConnected) return;
    
    wsConnection.send({
      type: 'PLAYER_JOIN',
      data: {
        id: player.id,
        name: player.name,
        x: Math.random() * 100, // Random starting position
        y: Math.random() * 100,
        connected: true
      }
    });
    
    // Update local state
    setLocalPlayers(prev => 
      prev.map(p => p.id === player.id ? { ...p, connected: true } : p)
    );
  };

  const updatePlayerName = (playerId, newName) => {
    setLocalPlayers(prev =>
      prev.map(p => p.id === playerId ? { ...p, name: newName } : p)
    );
  };

  const getDefaultKeyBinding = (index) => {
    const keyBindings = [
      { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', action: 'Space' },
      { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', action: 'KeyF' },
      { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', action: 'KeyO' },
      { up: 'Numpad8', down: 'Numpad2', left: 'Numpad4', right: 'Numpad6', action: 'Numpad0' }
    ];
    return keyBindings[index % keyBindings.length];
  };

  // Don't show on small screens
  if (!isLargeScreen()) {
    return null;
  }

  return (
    <div class="multi-player-manager">
      <div class="card">
        <h3>🎮 Local Players</h3>
        <p style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 1rem;">
          You can add multiple players to play from this device. Great for local co-op!
        </p>
        
        <div class="local-players-list">
          <For each={localPlayers()}>
            {(player) => (
              <div class="local-player-card">
                <div class="player-header">
                  <input
                    type="text"
                    value={player.name}
                    onInput={(e) => updatePlayerName(player.id, e.target.value)}
                    class="player-name-input"
                    placeholder="Player name"
                  />
                  <div class="player-status">
                    {player.connected ? (
                      <span class="status-connected">🟢 Connected</span>
                    ) : (
                      <button 
                        class="btn-connect"
                        onClick={() => connectPlayer(player)}
                        disabled={!wsConnection || !wsConnection.isConnected}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                  <button 
                    class="btn-remove"
                    onClick={() => removePlayer(player.id)}
                    title="Remove player"
                  >
                    ✕
                  </button>
                </div>
                
                <div class="key-bindings">
                  <small>
                    <strong>Controls:</strong> 
                    ↑{player.keyBinding.up.replace('Key', '').replace('Arrow', '')} 
                    ↓{player.keyBinding.down.replace('Key', '').replace('Arrow', '')} 
                    ←{player.keyBinding.left.replace('Key', '').replace('Arrow', '')} 
                    →{player.keyBinding.right.replace('Key', '').replace('Arrow', '')} 
                    Action: {player.keyBinding.action.replace('Key', '')}
                  </small>
                </div>
              </div>
            )}
          </For>
        </div>
        
        {localPlayers().length < maxPlayers && (
          <button 
            class="btn btn-secondary add-player-btn"
            onClick={addPlayer}
          >
            ➕ Add Local Player
          </button>
        )}
        
        {localPlayers().length >= maxPlayers && (
          <p style="font-size: 0.875rem; opacity: 0.7; text-align: center; margin-top: 1rem;">
            Maximum {maxPlayers} local players reached
          </p>
        )}
      </div>
    </div>
  );
}

export default MultiPlayerManager;