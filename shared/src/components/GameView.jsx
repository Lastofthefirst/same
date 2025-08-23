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
        width: window.innerWidth,
        height: window.innerHeight,
        parent: gameContainer(),
        backgroundColor: '#2d5016',
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
        },
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        }
      };

      const game = new Phaser.Game(config);
      setPhaserGame(game);
      
      // Set up message handling from outside the game
      const waitForScene = setInterval(() => {
        if (game.scene.scenes[0]) {
          clearInterval(waitForScene);
          
          // Bind functions to game scenes
          game.scene.scenes[0].createFarmMap = createFarmMap.bind(game.scene.scenes[0]);
          game.scene.scenes[0].createSpecialTiles = createSpecialTiles.bind(game.scene.scenes[0]);
          game.scene.scenes[0].createUI = createUI.bind(game.scene.scenes[0]);
          game.scene.scenes[0].handleResize = handleResize.bind(game.scene.scenes[0]);
          game.scene.scenes[0].updateRemotePlayer = updateRemotePlayer.bind(game.scene.scenes[0]);
          game.scene.scenes[0].performFarmingAction = performFarmingAction.bind(game.scene.scenes[0]);
          game.scene.scenes[0].showActionFeedback = showActionFeedback.bind(game.scene.scenes[0]);
          
          // Set up message handling from outside the game
          const gameScene = game.scene.scenes[0];
          if (onMessage && typeof onMessage === 'function') {
            // Store the original message handler
            const originalHandler = onMessage;
            
            // Create a new handler that also updates the game
            const enhancedHandler = (message) => {
              // Call the original handler first
              originalHandler(message);
              
              // Then handle game-specific updates
              if (gameScene && gameScene.networkUpdate) {
                gameScene.networkUpdate(message);
              }
            };
            
            // If we can override the message handler, do it
            if (wsConnection && wsConnection.onMessage) {
              wsConnection.onMessage = enhancedHandler;
            }
          }
        }
      }, 10);
      
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
      // Game constants
      const TILE_SIZE = 32;
      const MAP_WIDTH = 25;
      const MAP_HEIGHT = 25;
      const WORLD_WIDTH = MAP_WIDTH * TILE_SIZE;
      const WORLD_HEIGHT = MAP_HEIGHT * TILE_SIZE;
      
      // Set world bounds
      this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      
      // Store game data
      this.playerId = playerId;
      this.players = new Map();
      this.wsConnection = wsConnection;
      this.tiles = [];
      this.crops = new Map();
      this.pests = new Map();
      
      // Create tile-based map
      this.createFarmMap();
      
      // Create player sprite
      this.player = this.physics.add.sprite(
        (MAP_WIDTH / 2) * TILE_SIZE, 
        (MAP_HEIGHT / 2) * TILE_SIZE, 
        null
      );
      this.player.setSize(TILE_SIZE - 4, TILE_SIZE - 4);
      this.player.body.setCollideWorldBounds(true);
      
      // Visual representation for player (emoji style)
      this.playerVisual = this.add.text(this.player.x, this.player.y, '🧑‍🌾', {
        fontSize: '28px',
        align: 'center'
      }).setOrigin(0.5, 0.5);
      
      // Set up input
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,S,A,D,SPACE');
      
      // Set up camera to follow player
      this.cameras.main.startFollow(this.player);
      this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      this.cameras.main.setZoom(1.5); // Zoom in for better detail
      
      // Create UI elements
      this.createUI();
      
      // Listen for window resize
      this.scale.on('resize', this.handleResize, this);
      
      // Set up network message handling
      this.networkUpdate = (message) => {
        console.log('[GAME] Received network message:', message);
        if (message.type === 'PLAYER_UPDATE') {
          // Check if this is not our own message
          const senderId = message.player_id || message.data?.player_id;
          if (senderId && senderId !== this.playerId) {
            this.updateRemotePlayer({
              player_id: senderId,
              x: message.data?.x || message.data?.player?.x,
              y: message.data?.y || message.data?.player?.y
            });
          }
        }
      };
      
      console.log('[GAME] Farm created with', MAP_WIDTH, 'x', MAP_HEIGHT, 'tiles');
      
    } catch (error) {
      console.error('[GAME] Error in createGame:', error);
    }
  }

  // Helper function to create the farm map
  function createFarmMap() {
    const TILE_SIZE = 32;
    const MAP_WIDTH = 25;
    const MAP_HEIGHT = 25;
    
    // Create background grid
    for (let x = 0; x < MAP_WIDTH; x++) {
      for (let y = 0; y < MAP_HEIGHT; y++) {
        const tileX = x * TILE_SIZE;
        const tileY = y * TILE_SIZE;
        
        // Determine tile type based on position
        let tileEmoji = '🟫'; // Default dirt
        let tileType = 'dirt';
        
        // Create some variety in the map
        if (Math.random() < 0.1) {
          tileEmoji = '🪨'; // Rocks
          tileType = 'rock';
        } else if (Math.random() < 0.05) {
          tileEmoji = '🌳'; // Trees
          tileType = 'tree';
        } else if (x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1) {
          tileEmoji = '🌿'; // Border grass
          tileType = 'grass';
        }
        
        // Create tile visual
        const tile = this.add.text(tileX + TILE_SIZE/2, tileY + TILE_SIZE/2, tileEmoji, {
          fontSize: '24px',
          align: 'center'
        }).setOrigin(0.5, 0.5);
        
        // Store tile data
        tile.tileData = {
          x: x,
          y: y,
          type: tileType,
          crop: null,
          growth: 0,
          watered: false
        };
        
        this.tiles.push(tile);
      }
    }
    
    // Add some special tiles
    this.createSpecialTiles();
  }

  // Create special tiles (wagon, role stations, etc.)
  function createSpecialTiles() {
    const TILE_SIZE = 32;
    const MAP_WIDTH = 25;
    const MAP_HEIGHT = 25;
    
    // Place wagon in center-ish area
    const wagonX = Math.floor(MAP_WIDTH / 2);
    const wagonY = Math.floor(MAP_HEIGHT / 2) + 3;
    const wagonTile = this.tiles.find(t => t.tileData.x === wagonX && t.tileData.y === wagonY);
    if (wagonTile) {
      wagonTile.setText('🚛');
      wagonTile.tileData.type = 'wagon';
    }
    
    // Add some pre-planted crops for visual appeal
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(3, MAP_WIDTH - 4);
      const y = Phaser.Math.Between(3, MAP_HEIGHT - 4);
      const tile = this.tiles.find(t => t.tileData.x === x && t.tileData.y === y);
      if (tile && tile.tileData.type === 'dirt') {
        tile.setText('🌱');
        tile.tileData.crop = 'corn';
        tile.tileData.growth = 1;
      }
    }
  }

  // Create UI elements
  function createUI() {
    // Fixed UI that stays on screen
    this.uiContainer = this.add.container(0, 0);
    this.uiContainer.setScrollFactor(0); // Fixed to camera
    
    // Game title and instructions
    const title = this.add.text(20, 20, '🌾 Same Mouth Farm 🌾', {
      fontSize: '32px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 4
    });
    
    const instructions = this.add.text(20, 60, 'WASD/Arrows: Move • Space: Plant/Water • Work together!', {
      fontSize: '18px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2
    });
    
    // Game status indicator
    const status = this.add.text(20, 90, '✅ Game Running • Multiplayer Ready', {
      fontSize: '16px',
      fill: '#22c55e',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2
    });
    
    this.uiContainer.add([title, instructions, status]);
    
    // Add player info
    this.playerInfo = this.add.text(20, window.innerHeight - 100, `Player: ${this.playerId}`, {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.playerInfo.setScrollFactor(0);
    
    console.log('[GAME] UI created successfully');
  }

  // Handle window resize
  function handleResize(gameSize) {
    const { width, height } = gameSize;
    this.cameras.main.setViewport(0, 0, width, height);
  }

  function updateRemotePlayer(data) {
    try {
      // Update remote player position
      const { player_id, x, y } = data;
      
      if (!this.players.has(player_id)) {
        // Create new remote player
        const playerEmojis = ['👨‍🌾', '👩‍🌾', '🧑‍🌾', '👨‍🎓', '👩‍🎓'];
        const emoji = playerEmojis[Array.from(this.players.keys()).length % playerEmojis.length];
        
        const playerVisual = this.add.text(x, y, emoji, {
          fontSize: '28px',
          align: 'center'
        }).setOrigin(0.5, 0.5);
        
        this.players.set(player_id, {
          x: x,
          y: y,
          visual: playerVisual
        });
        
        console.log('[GAME] Added remote player:', player_id);
      } else {
        // Update existing player position
        const playerData = this.players.get(player_id);
        playerData.x = x;
        playerData.y = y;
      }
    } catch (error) {
      console.error('[GAME] Error updating remote player:', error);
    }
  }

  function updateGame() {
    try {
      if (!this.player) return;
      
      const speed = 120; // Slightly slower for more precise control
      let moved = false;
      
      // Handle player movement
      if (this.cursors.left.isDown || this.wasd.A.isDown) {
        this.player.setVelocityX(-speed);
        moved = true;
      } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
        this.player.setVelocityX(speed);
        moved = true;
      } else {
        this.player.setVelocityX(0);
      }
      
      if (this.cursors.up.isDown || this.wasd.W.isDown) {
        this.player.setVelocityY(-speed);
        moved = true;
      } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
        this.player.setVelocityY(speed);
        moved = true;
      } else {
        this.player.setVelocityY(0);
      }
      
      // Update player visual to follow physics body
      if (this.playerVisual) {
        this.playerVisual.x = this.player.x;
        this.playerVisual.y = this.player.y;
      }
      
      // Handle space key for farming actions
      if (Phaser.Input.Keyboard.JustDown(this.wasd.SPACE)) {
        this.performFarmingAction();
      }
      
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
      
      // Update remote players
      for (const [playerId, playerData] of this.players) {
        if (playerData.visual) {
          playerData.visual.x = playerData.x;
          playerData.visual.y = playerData.y;
        }
      }
      
    } catch (error) {
      console.error('[GAME] Error in updateGame:', error);
    }
  }

  // Handle farming actions (planting, watering, harvesting)
  function performFarmingAction() {
    try {
      const TILE_SIZE = 32;
      const playerTileX = Math.floor(this.player.x / TILE_SIZE);
      const playerTileY = Math.floor(this.player.y / TILE_SIZE);
      
      const currentTile = this.tiles.find(t => 
        t.tileData.x === playerTileX && t.tileData.y === playerTileY
      );
      
      if (!currentTile) return;
      
      const tileData = currentTile.tileData;
      
      if (tileData.type === 'dirt' && !tileData.crop) {
        // Plant a crop
        currentTile.setText('🌱');
        tileData.crop = 'corn';
        tileData.growth = 1;
        this.showActionFeedback('🌱 Planted!', this.player.x, this.player.y - 40);
        console.log('[FARMING] Planted crop at', playerTileX, playerTileY);
        
      } else if (tileData.crop && tileData.growth < 3 && !tileData.watered) {
        // Water the crop
        tileData.watered = true;
        this.showActionFeedback('💧 Watered!', this.player.x, this.player.y - 40);
        setTimeout(() => {
          if (tileData.crop && tileData.growth < 3) {
            tileData.growth++;
            if (tileData.growth === 2) {
              currentTile.setText('🌾');
            } else if (tileData.growth === 3) {
              currentTile.setText('🌽');
            }
            tileData.watered = false;
          }
        }, 2000); // Crop grows after 2 seconds
        console.log('[FARMING] Watered crop at', playerTileX, playerTileY);
        
      } else if (tileData.crop && tileData.growth === 3) {
        // Harvest the crop
        currentTile.setText('🟫');
        tileData.crop = null;
        tileData.growth = 0;
        tileData.watered = false;
        this.showActionFeedback('🌽 Harvested!', this.player.x, this.player.y - 40);
        console.log('[FARMING] Harvested crop at', playerTileX, playerTileY);
      } else if (tileData.type === 'rock' || tileData.type === 'tree') {
        this.showActionFeedback("❌ Can't farm here!", this.player.x, this.player.y - 40);
      }
      
    } catch (error) {
      console.error('[GAME] Error in farming action:', error);
    }
  }
  
  // Show action feedback
  function showActionFeedback(text, x, y) {
    const feedback = this.add.text(x, y, text, {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5);
    
    // Animate feedback
    this.tweens.add({
      targets: feedback,
      y: y - 30,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        feedback.destroy();
      }
    });
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
    <div class="game-view-fullscreen">
      <div class="game-header-overlay">
        <button class="btn btn-secondary exit-game" onClick={onLeaveGame}>
          🚪 Exit Game
        </button>
        <div class="game-title">🌾 Same Mouth Farm 🌾</div>
      </div>
      
      <div 
        class="game-container-fullscreen"
        ref={setGameContainer}
      ></div>
      
      <style jsx>{`
        .game-view-fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 1000;
          background: #000;
          overflow: hidden;
        }
        
        .game-header-overlay {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1001;
          display: flex;
          align-items: center;
          gap: 20px;
          background: rgba(0, 0, 0, 0.7);
          padding: 10px 20px;
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }
        
        .game-title {
          color: white;
          font-size: 1.5rem;
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }
        
        .exit-game {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: bold;
        }
        
        .exit-game:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }
        
        .game-container-fullscreen {
          width: 100%;
          height: 100%;
          background: #2d5016;
        }
        
        @media (max-width: 768px) {
          .game-header-overlay {
            top: 10px;
            left: 10px;
            right: 10px;
            transform: none;
            justify-content: space-between;
            padding: 8px 12px;
          }
          
          .game-title {
            font-size: 1.2rem;
          }
          
          .exit-game {
            padding: 6px 12px;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}

export default GameView;