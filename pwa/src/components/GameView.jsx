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

  // Phaser scene functions
  function preloadGame() {
    try {
      // Create simple colored rectangles as placeholders for sprites
      this.load.image('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
      
      // Generate colored rectangles for different players
      const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
      colors.forEach((color, index) => {
        this.load.image(`player_${index}`, createColorRect(color, 32, 32));
      });
    } catch (error) {
      console.error('[GAME] Error in preloadGame:', error);
    }
  }

  function createGame() {
    try {
      // Set up the game world
      this.cameras.main.setBackgroundColor('#90EE90'); // Light green farm background
      
      // Create player sprite
      const playerIndex = Math.floor(Math.random() * 5);
      this.player = this.add.rectangle(400, 300, 32, 32, 0xff6b6b);
      this.player.setStrokeStyle(2, 0xffffff);
      
      // Store player data
      this.playerId = playerId;
      this.players = new Map();
      this.wsConnection = wsConnection;
      
      // Set up input
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,S,A,D');
      
      // Add some visual elements to make it look like a farm
      this.add.text(20, 20, '🌾 Same Mouth Farm 🌾', {
        fontSize: '24px',
        fill: '#2d5016',
        fontFamily: 'Arial'
      });
      
      this.add.text(20, 50, `Player: ${playerId}`, {
        fontSize: '16px', 
        fill: '#2d5016',
        fontFamily: 'Arial'
      });
      
      // Add some farm elements as placeholders
      for (let i = 0; i < 20; i++) {
        const x = Phaser.Math.Between(100, 700);
        const y = Phaser.Math.Between(100, 500);
        const crop = this.add.rectangle(x, y, 16, 16, 0x228b22);
        crop.setStrokeStyle(1, 0x006400);
      }
      
      // Listen for network messages
      this.networkUpdate = (message) => {
        if (message.type === 'PLAYER_UPDATE' && message.data.player_id !== this.playerId) {
          this.updateRemotePlayer(message.data);
        }
      };
      
      // Set up WebSocket message handler if provided
      if (wsConnection && wsConnection.onMessage) {
        const originalOnMessage = wsConnection.onMessage;
        wsConnection.onMessage = (message) => {
          // Call original handler
          originalOnMessage(message);
          
          // Also call our network update handler
          if (this.networkUpdate) {
            this.networkUpdate(message);
          }
        };
      }
    } catch (error) {
      console.error('[GAME] Error in createGame:', error);
    }
  }

  function updateRemotePlayer(data) {
    try {
      // Update remote player position
      const { player_id, x, y } = data;
      
      if (!this.players.has(player_id)) {
        // Create new player sprite if it doesn't exist
        const playerIndex = Array.from(this.players.keys()).length % 5;
        const playerSprite = this.add.rectangle(x, y, 32, 32, 0x4ecdc4);
        playerSprite.setStrokeStyle(2, 0xffffff);
        this.players.set(player_id, playerSprite);
      }
      
      // Update player position
      const playerSprite = this.players.get(player_id);
      if (playerSprite) {
        playerSprite.x = x;
        playerSprite.y = y;
      }
    } catch (error) {
      console.error('[GAME] Error updating remote player:', error);
    }
  }

  function updateGame() {
    try {
      if (!this.player) return;
      
      const speed = 160;
      let moved = false;
      
      // Handle player movement
      if (this.cursors.left.isDown || this.wasd.A.isDown) {
        this.player.x -= speed * this.game.loop.delta / 1000;
        moved = true;
      }
      if (this.cursors.right.isDown || this.wasd.D.isDown) {
        this.player.x += speed * this.game.loop.delta / 1000;
        moved = true;
      }
      if (this.cursors.up.isDown || this.wasd.W.isDown) {
        this.player.y -= speed * this.game.loop.delta / 1000;
        moved = true;
      }
      if (this.cursors.down.isDown || this.wasd.S.isDown) {
        this.player.y += speed * this.game.loop.delta / 1000;
        moved = true;
      }
      
      // Keep player within bounds
      this.player.x = Phaser.Math.Clamp(this.player.x, 16, 784);
      this.player.y = Phaser.Math.Clamp(this.player.y, 16, 584);
      
      // Send position update if moved
      if (moved && this.wsConnection && this.wsConnection.isConnected) {
        const message = createMessage(
          'PLAYER_UPDATE',
          {
            x: this.player.x,
            y: this.player.y
          },
          this.playerId
        );
        this.wsConnection.send(message);
      }
    } catch (error) {
      console.error('[GAME] Error in updateGame:', error);
    }
  }

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