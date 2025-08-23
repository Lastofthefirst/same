import { onMount, onCleanup, createSignal } from "solid-js";
import { createMessage } from "@shared/utils/networkUtils";

function GameView({ connectionInfo, wsConnection, playerId, onLeaveGame, onMessage }) {
  const [gameContainer, setGameContainer] = createSignal(null);
  const [phaserGame, setPhaserGame] = createSignal(null);

  onMount(async () => {
    try {
      // Dynamically import Phaser to avoid SSR issues
      const Phaser = await import('phaser');
      
      // Create Phaser game configuration
      const config = {
        type: Phaser.AUTO,
        width: '100%',
        height: '100%',
        parent: gameContainer(),
        backgroundColor: '#4ade80',
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 0 },
            debug: false
          }
        },
        scene: {
          preload: preloadGame,
          create: createGame,
          update: updateGame
        }
      };

      const game = new Phaser.Game(config);
      setPhaserGame(game);
      
      // Register additional message handler if provided
      if (wsConnection && typeof wsConnection.addMessageHandler === 'function' && typeof onMessage === 'function') {
        wsConnection.addMessageHandler(onMessage);
      }
    } catch (error) {
      console.error('[GAME] Failed to initialize Phaser game:', error);
    }
  });

  onCleanup(() => {
    const game = phaserGame();
    if (game) {
      game.destroy(true);
    }
    
    // Remove message handler if it was added
    const ws = wsConnection;
    if (ws && typeof ws.removeMessageHandler === 'function' && typeof onMessage === 'function') {
      ws.removeMessageHandler(onMessage);
    }
  });

  // Helper function to create colored rectangle data URL
  function createColorRect(color, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    return canvas.toDataURL();
  }

  return (
    <div class="game-view">
      <div class="game-header">
        <h3>🌾 Playing in the Farm</h3>
        <button class="btn btn-secondary" onClick={onLeaveGame}>
          🚪 Leave Game
        </button>
      </div>
      
      <div 
        class="game-container"
        ref={setGameContainer}
      ></div>
      
      <div class="game-controls">
        <p style="text-align: center; color: rgba(255, 255, 255, 0.8); margin: 1rem 0;">
          🎮 Use arrow keys or WASD to move around the farm
        </p>
      </div>
    </div>
  );
}

export default GameView;