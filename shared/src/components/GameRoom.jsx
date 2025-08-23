import { createSignal, createEffect, onCleanup, For } from "solid-js";

/**
 * Simple game room where players can move around and interact
 */
function GameRoom({ 
  players = [], 
  localPlayer = null, 
  onPlayerMove,
  isHost = false 
}) {
  const [gameArea, setGameArea] = createSignal(null);
  const [localPosition, setLocalPosition] = createSignal({ x: 50, y: 50 });
  const [keys, setKeys] = createSignal({});
  
  // Game constants
  const MOVE_SPEED = 2;
  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 600;
  const PLAYER_SIZE = 30;

  // Handle keyboard input
  const handleKeyDown = (e) => {
    setKeys(prev => ({ ...prev, [e.code]: true }));
  };

  const handleKeyUp = (e) => {
    setKeys(prev => ({ ...prev, [e.code]: false }));
  };

  // Movement update loop
  createEffect(() => {
    const updateLoop = setInterval(() => {
      const currentKeys = keys();
      const pos = localPosition();
      let newX = pos.x;
      let newY = pos.y;

      if (currentKeys['ArrowUp'] || currentKeys['KeyW']) {
        newY = Math.max(0, newY - MOVE_SPEED);
      }
      if (currentKeys['ArrowDown'] || currentKeys['KeyS']) {
        newY = Math.min(GAME_HEIGHT - PLAYER_SIZE, newY + MOVE_SPEED);
      }
      if (currentKeys['ArrowLeft'] || currentKeys['KeyA']) {
        newX = Math.max(0, newX - MOVE_SPEED);
      }
      if (currentKeys['ArrowRight'] || currentKeys['KeyD']) {
        newX = Math.min(GAME_WIDTH - PLAYER_SIZE, newX + MOVE_SPEED);
      }

      if (newX !== pos.x || newY !== pos.y) {
        setLocalPosition({ x: newX, y: newY });
        
        // Notify parent about position change
        if (onPlayerMove && localPlayer) {
          onPlayerMove({
            playerId: localPlayer.id,
            x: newX,
            y: newY
          });
        }
      }
    }, 16); // ~60 FPS

    onCleanup(() => clearInterval(updateLoop));
  });

  // Setup keyboard listeners
  createEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    });
  });

  const getPlayerColor = (playerId) => {
    // Generate consistent color based on player ID
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
      hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const renderPlayer = (player) => {
    const isLocal = localPlayer && player.id === localPlayer.id;
    const position = isLocal ? localPosition() : { x: player.x || 0, y: player.y || 0 };
    
    return (
      <div
        class="game-player"
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${PLAYER_SIZE}px`,
          height: `${PLAYER_SIZE}px`,
          'background-color': getPlayerColor(player.id),
          border: isLocal ? '3px solid #fff' : '2px solid #333',
          'border-radius': '50%',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'font-size': '12px',
          'font-weight': 'bold',
          color: '#fff',
          'text-shadow': '1px 1px 1px rgba(0,0,0,0.5)',
          'z-index': isLocal ? 10 : 5,
          transition: isLocal ? 'none' : 'all 0.1s ease-out'
        }}
      >
        {player.name ? player.name.substring(0, 2).toUpperCase() : '?'}
      </div>
    );
  };

  return (
    <div class="game-room">
      <div class="game-header">
        <h3>🎮 Game Room</h3>
        {isHost && (
          <div class="host-controls">
            <button class="btn btn-small">⏸️ Pause</button>
            <button class="btn btn-small">🔄 Reset Positions</button>
          </div>
        )}
      </div>

      <div 
        class="game-area" 
        ref={setGameArea}
        style={{
          position: 'relative',
          width: `${GAME_WIDTH}px`,
          height: `${GAME_HEIGHT}px`,
          border: '2px solid #8B4513',
          'background-color': '#90EE90',
          'background-image': `
            radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 1px, transparent 1px),
            radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          'background-size': '50px 50px',
          margin: '1rem auto',
          overflow: 'hidden'
        }}
      >
        {/* Render all players */}
        <For each={players()}>
          {(player) => renderPlayer(player)}
        </For>

        {/* Game info overlay */}
        <div 
          class="game-info"
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            'background-color': 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '10px',
            'border-radius': '5px',
            'font-size': '14px'
          }}
        >
          <div>Players: {players().length}</div>
          {localPlayer && (
            <div>Position: ({Math.round(localPosition().x)}, {Math.round(localPosition().y)})</div>
          )}
        </div>
      </div>

      <div class="game-controls">
        <h4>Controls</h4>
        <div class="controls-grid">
          <div class="control-group">
            <strong>Movement:</strong>
            <span>Arrow keys or WASD</span>
          </div>
          <div class="control-group">
            <strong>Action:</strong>
            <span>Spacebar</span>
          </div>
        </div>
      </div>

      <div class="players-list">
        <h4>Players in Room</h4>
        <For each={players()}>
          {(player) => (
            <div class="player-item">
              <div 
                class="player-indicator"
                style={{
                  width: '20px',
                  height: '20px',
                  'background-color': getPlayerColor(player.id),
                  'border-radius': '50%',
                  display: 'inline-block',
                  'margin-right': '10px'
                }}
              ></div>
              <span>{player.name}</span>
              {localPlayer && player.id === localPlayer.id && <span> (You)</span>}
              {!player.connected && <span class="disconnected"> (Disconnected)</span>}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export default GameRoom;