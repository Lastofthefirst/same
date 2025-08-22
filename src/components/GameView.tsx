import { onMount, createEffect, onCleanup } from 'solid-js';
import { invoke } from '@tauri-apps/api/tauri';

interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: string;
  role: string;
}

interface GameState {
  players: Record<string, Player>;
  room_code: string;
}

interface GameViewProps {
  gameState: GameState;
  playerId: string;
  playerName: string;
  roomCode: string;
  onBackToLobby: () => void;
}

function GameView(props: GameViewProps) {
  let gameContainer: HTMLDivElement;
  let phaserGame: Phaser.Game;

  onMount(async () => {
    // Dynamically import Phaser
    const Phaser = await import('phaser');
    
    // Define the game scene
    class GameScene extends Phaser.Scene {
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      private player!: Phaser.GameObjects.Sprite;
      private players: Map<string, Phaser.GameObjects.Container> = new Map();
      private keys!: any;

      constructor() {
        super({ key: 'GameScene' });
      }

      preload() {
        // Create simple colored rectangles as sprites for now
        this.load.image('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
      }

      create() {
        // Create a larger game world
        this.physics.world.setBounds(0, 0, 1600, 1200);
        
        // Set background color
        this.cameras.main.setBackgroundColor('#4a7c59');
        
        // Enable cursor keys
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.keys = this.input.keyboard!.addKeys('W,S,A,D,SPACE');

        // Create current player
        this.createPlayer();
        
        // Set camera to follow player
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, 1600, 1200);

        // Draw a simple grid for reference
        this.drawGrid();
        
        // Add some placeholder elements
        this.createPlaceholderElements();
      }

      createPlayer() {
        const currentPlayer = props.gameState.players[props.playerId];
        if (currentPlayer) {
          this.player = this.add.sprite(currentPlayer.x, currentPlayer.y, 'player');
          this.player.setDisplaySize(32, 32);
          this.player.setTint(0x90ee90); // Light green for current player
          
          // Add physics
          this.physics.add.existing(this.player);
          (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
          
          // Add direction indicator
          const arrow = this.add.text(0, -20, '↓', { fontSize: '16px', color: '#000' });
          const playerContainer = this.add.container(currentPlayer.x, currentPlayer.y, [this.player, arrow]);
          
          // Add name label
          const nameLabel = this.add.text(0, 20, props.playerName, { 
            fontSize: '12px', 
            color: '#fff',
            backgroundColor: '#000',
            padding: { x: 4, y: 2 }
          });
          nameLabel.setOrigin(0.5);
          playerContainer.add(nameLabel);
        }
      }

      drawGrid() {
        const graphics = this.add.graphics({ lineStyle: { width: 1, color: 0x666666, alpha: 0.3 } });
        
        // Draw vertical lines
        for (let x = 0; x <= 1600; x += 32) {
          graphics.lineBetween(x, 0, x, 1200);
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= 1200; y += 32) {
          graphics.lineBetween(0, y, 1600, y);
        }
      }

      createPlaceholderElements() {
        // Add some placeholder farmable areas
        const farmableColor = 0x8B4513; // Brown for farmable soil
        const obstacleColor = 0x2F4F2F; // Dark green for obstacles
        
        // Create some farmable tiles
        for (let i = 0; i < 20; i++) {
          const x = Phaser.Math.Between(100, 1500);
          const y = Phaser.Math.Between(100, 1100);
          const tile = this.add.rectangle(x, y, 30, 30, farmableColor);
          tile.setStrokeStyle(2, 0x654321);
        }
        
        // Create some obstacle tiles
        for (let i = 0; i < 10; i++) {
          const x = Phaser.Math.Between(100, 1500);
          const y = Phaser.Math.Between(100, 1100);
          const obstacle = this.add.rectangle(x, y, 32, 32, obstacleColor);
          obstacle.setStrokeStyle(2, 0x000000);
        }
        
        // Add role stations
        const roles = ['🔨 Till', '🌱 Plant', '💧 Water', '🌾 Harvest', '🧹 Weed', '🐿️ Pest'];
        roles.forEach((role, index) => {
          const x = 100 + index * 80;
          const y = 50;
          const station = this.add.rectangle(x, y, 60, 40, 0x654321);
          station.setStrokeStyle(2, 0x000000);
          const label = this.add.text(x, y, role, { fontSize: '10px', color: '#fff' });
          label.setOrigin(0.5);
        });
        
        // Add a placeholder wagon
        const wagon = this.add.rectangle(800, 600, 64, 64, 0x8B4513);
        wagon.setStrokeStyle(3, 0x000000);
        const wagonLabel = this.add.text(800, 600, '🚜', { fontSize: '32px' });
        wagonLabel.setOrigin(0.5);
      }

      update() {
        if (!this.player) return;

        const speed = 160;
        let deltaX = 0;
        let deltaY = 0;
        let facing = '';

        // Handle movement
        if (this.cursors.left.isDown || this.keys.A.isDown) {
          deltaX = -speed;
          facing = 'left';
        } else if (this.cursors.right.isDown || this.keys.D.isDown) {
          deltaX = speed;
          facing = 'right';
        }

        if (this.cursors.up.isDown || this.keys.W.isDown) {
          deltaY = -speed;
          facing = 'up';
        } else if (this.cursors.down.isDown || this.keys.S.isDown) {
          deltaY = speed;
          facing = 'down';
        }

        // Apply movement
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(deltaX, deltaY);

        // Update player position in game state if moved
        if (deltaX !== 0 || deltaY !== 0 || facing !== '') {
          invoke('update_player_position', {
            playerId: props.playerId,
            x: this.player.x,
            y: this.player.y,
            facing: facing || props.gameState.players[props.playerId]?.facing || 'down'
          });
        }

        // Handle action button
        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
          console.log('Action button pressed!');
        }
      }
    }

    // Create Phaser game
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: gameContainer.clientWidth,
      height: gameContainer.clientHeight,
      parent: gameContainer,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false
        }
      },
      scene: GameScene,
      backgroundColor: '#4a7c59'
    };

    phaserGame = new Phaser.Game(config);
  });

  onCleanup(() => {
    if (phaserGame) {
      phaserGame.destroy(true);
    }
  });

  return (
    <div class="game-container">
      <div 
        ref={gameContainer!} 
        style="width: 100%; height: 100%;"
      />
      
      <div class="game-controls">
        <button class="control-button" onClick={props.onBackToLobby}>
          ← Back to Lobby
        </button>
        <div style="background: rgba(0,0,0,0.7); padding: 1rem; border-radius: 4px; color: white; font-size: 0.8rem;">
          <div><strong>Controls:</strong></div>
          <div>WASD/Arrows: Move</div>
          <div>Space: Action</div>
          <div><strong>Room:</strong> {props.roomCode}</div>
        </div>
      </div>
    </div>
  );
}

export default GameView;