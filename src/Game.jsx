import { onMount, onCleanup } from "solid-js";
import Phaser from "phaser";

const Game = (props) => {
  let gameContainer;
  let phaserGame;

  onMount(() => {
    const config = {
      type: Phaser.AUTO,
      width: 1200,
      height: 800,
      parent: gameContainer,
      backgroundColor: '#2d4a2b',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      scene: [MenuScene, GameScene, UIScene]
    };

    phaserGame = new Phaser.Game(config);
    
    // Pass game configuration to Phaser scenes
    phaserGame.registry.set('gameConfig', props.config);
    phaserGame.registry.set('onReturn', props.onReturn);
  });

  onCleanup(() => {
    if (phaserGame) {
      phaserGame.destroy(true);
    }
  });

  return (
    <div class="game-container">
      <div ref={gameContainer} class="phaser-game"></div>
      <div class="game-ui">
        <button class="return-button" onClick={props.onReturn}>
          Return to Menu
        </button>
      </div>
    </div>
  );
};

// Game configuration constants
const DIFFICULTY_CONFIGS = {
  balanced: {
    base_map_size: 30,
    map_increment_per_player: 3,
    tile_distribution: { farmable: 65, obstacles: 15, roles: 5, pest_drop: 5, paths: 10 },
    crop_growth_base_time: 8,
    initial_weed_count: 12,
    initial_pest_count: 8,
    pest_spawn_rate: 1.0,
    crop_thresholds_base: 20,
    scaling_factor: 0.2
  },
  challenging: {
    base_map_size: 34,
    map_increment_per_player: 5,
    tile_distribution: { farmable: 50, obstacles: 20, roles: 15, pest_drop: 5, paths: 10 },
    crop_growth_base_time: 10,
    initial_weed_count: 26,
    initial_pest_count: 21,
    pest_spawn_rate: 1.5,
    crop_thresholds_base: 34,
    scaling_factor: 0.3
  },
  expert: {
    base_map_size: 42,
    map_increment_per_player: 3.4,
    tile_distribution: { farmable: 60, obstacles: 15, roles: 8, pest_drop: 7, paths: 10 },
    crop_growth_base_time: 12,
    initial_weed_count: 34,
    initial_pest_count: 25,
    pest_spawn_rate: 1.2,
    crop_thresholds_base: 50,
    scaling_factor: 0.25
  }
};

// Player control configurations
const PLAYER_CONTROLS = [
  { // Player 1
    up: 'ArrowUp',
    down: 'ArrowDown', 
    left: 'ArrowLeft',
    right: 'ArrowRight',
    action: 'Space'
  },
  { // Player 2
    up: 'KeyW',
    down: 'KeyS',
    left: 'KeyA', 
    right: 'KeyD',
    action: 'KeyQ'
  },
  { // Player 3
    up: 'KeyI',
    down: 'KeyK',
    left: 'KeyJ',
    right: 'KeyL',
    action: 'KeyU'
  },
  { // Player 4
    up: 'Numpad8',
    down: 'Numpad5',
    left: 'Numpad4',
    right: 'Numpad6',
    action: 'Numpad7'
  },
  { // Player 5
    up: 'KeyT',
    down: 'KeyG',
    left: 'KeyF',
    right: 'KeyH',
    action: 'KeyR'
  },
  { // Player 6  
    up: 'KeyO',
    down: 'Semicolon',
    left: 'KeyK',
    right: 'Quote',
    action: 'KeyP'
  },
  { // Player 7
    up: 'Digit8',
    down: 'Digit5',
    left: 'Digit4',
    right: 'Digit6',
    action: 'Digit7'
  },
  { // Player 8
    up: 'KeyY',
    down: 'KeyB',
    left: 'KeyV',
    right: 'KeyN',
    action: 'KeyM'
  }
];

// Tile constants
const TILE_SIZE = 32;
const TILE_TYPES = {
  FARMABLE: 'farmable',
  OBSTACLE: 'obstacle', 
  ROLE_STATION: 'role_station',
  PEST_DROP: 'pest_drop',
  PATH: 'path',
  WAGON: 'wagon',
  EXIT: 'exit'
};

// Menu Scene - Initial game start
class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    // Immediately start the main game
    this.scene.start('GameScene');
  }
}

// Main Game Scene
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.players = [];
    this.crops = [];
    this.pests = [];
    this.weeds = [];
    this.tiles = [];
    this.gameState = {
      score: 0,
      harvestedCrops: 0,
      isGameOver: false,
      isPaused: false
    };
  }

  create() {
    const gameConfig = this.registry.get('gameConfig');
    const difficulty = DIFFICULTY_CONFIGS[gameConfig.difficulty];
    
    // Calculate map size based on player count
    const mapSize = Math.floor(difficulty.base_map_size + (gameConfig.players * difficulty.map_increment_per_player));
    this.mapSize = mapSize;
    
    console.log(`Creating ${mapSize}x${mapSize} map for ${gameConfig.players} players on ${gameConfig.difficulty} difficulty`);
    
    // Generate the game world
    this.generateMap(difficulty);
    this.createPlayers(gameConfig.players);
    this.setupInput();
    this.spawnInitialThreats(difficulty);
    
    // Start UI scene
    this.scene.launch('UIScene');
    
    // Start game loop timers
    this.startGameTimers(difficulty);
  }

  generateMap(difficulty) {
    this.tiles = [];
    const tileDistribution = difficulty.tile_distribution;
    
    // Create 2D array for tiles
    for (let y = 0; y < this.mapSize; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.mapSize; x++) {
        this.tiles[y][x] = this.generateTile(x, y, tileDistribution);
      }
    }
    
    // Ensure we have required special tiles
    this.ensureSpecialTiles();
    
    // Render tiles
    this.renderTiles();
  }

  generateTile(x, y, distribution) {
    // Border tiles are always obstacles
    if (x === 0 || x === this.mapSize - 1 || y === 0 || y === this.mapSize - 1) {
      return {
        x: x,
        y: y,
        type: TILE_TYPES.OBSTACLE,
        sprite: null,
        content: null
      };
    }
    
    const rand = Math.random() * 100;
    let cumulative = 0;
    
    for (const [type, percentage] of Object.entries(distribution)) {
      cumulative += percentage;
      if (rand <= cumulative) {
        return {
          x: x,
          y: y,
          type: this.mapTileType(type),
          sprite: null,
          content: null
        };
      }
    }
    
    // Fallback to farmable
    return {
      x: x,
      y: y,
      type: TILE_TYPES.FARMABLE,
      sprite: null,
      content: null
    };
  }

  mapTileType(configType) {
    const mapping = {
      'farmable': TILE_TYPES.FARMABLE,
      'obstacles': TILE_TYPES.OBSTACLE,
      'roles': TILE_TYPES.ROLE_STATION,
      'pest_drop': TILE_TYPES.PEST_DROP,
      'paths': TILE_TYPES.PATH
    };
    return mapping[configType] || TILE_TYPES.FARMABLE;
  }

  ensureSpecialTiles() {
    // Ensure we have at least one wagon near center
    const centerX = Math.floor(this.mapSize / 2);
    const centerY = Math.floor(this.mapSize / 2);
    this.tiles[centerY][centerX].type = TILE_TYPES.WAGON;
    
    // Add exit tiles at edges (not corners)
    const exitPositions = [
      [Math.floor(this.mapSize / 2), 0],
      [Math.floor(this.mapSize / 2), this.mapSize - 1],
      [0, Math.floor(this.mapSize / 2)],
      [this.mapSize - 1, Math.floor(this.mapSize / 2)]
    ];
    
    exitPositions.forEach(([x, y]) => {
      this.tiles[y][x].type = TILE_TYPES.EXIT;
    });
  }

  renderTiles() {
    for (let y = 0; y < this.mapSize; y++) {
      for (let x = 0; x < this.mapSize; x++) {
        const tile = this.tiles[y][x];
        tile.sprite = this.createTileSprite(tile);
      }
    }
  }

  createTileSprite(tile) {
    const x = tile.x * TILE_SIZE;
    const y = tile.y * TILE_SIZE;
    
    let sprite;
    let color;
    let emoji = '';
    
    switch (tile.type) {
      case TILE_TYPES.FARMABLE:
        color = 0x8B4513; // Brown soil
        emoji = '🌱';
        break;
      case TILE_TYPES.OBSTACLE:
        color = 0x696969; // Gray rocks
        emoji = '🗿';
        break;
      case TILE_TYPES.ROLE_STATION:
        color = 0x4169E1; // Blue
        emoji = '🔧';
        break;
      case TILE_TYPES.PEST_DROP:
        color = 0xFF6347; // Red
        emoji = '🕳️';
        break;
      case TILE_TYPES.PATH:
        color = 0xF5DEB3; // Wheat colored
        emoji = '🛤️';
        break;
      case TILE_TYPES.WAGON:
        color = 0xFFD700; // Gold
        emoji = '🚚';
        break;
      case TILE_TYPES.EXIT:
        color = 0x32CD32; // Green
        emoji = '🚪';
        break;
      default:
        color = 0x8B4513;
        emoji = '🌱';
    }
    
    // Create colored rectangle background
    sprite = this.add.rectangle(x + TILE_SIZE/2, y + TILE_SIZE/2, TILE_SIZE, TILE_SIZE, color);
    
    // Add emoji as text
    const emojiText = this.add.text(x + TILE_SIZE/2, y + TILE_SIZE/2, emoji, {
      fontSize: '20px',
      align: 'center'
    }).setOrigin(0.5);
    
    return { bg: sprite, emoji: emojiText };
  }

  createPlayers(playerCount) {
    this.players = [];
    
    // Find safe spawn positions around the wagon
    const centerX = Math.floor(this.mapSize / 2);
    const centerY = Math.floor(this.mapSize / 2);
    
    const spawnPositions = [
      [centerX - 1, centerY - 1],
      [centerX + 1, centerY - 1], 
      [centerX - 1, centerY + 1],
      [centerX + 1, centerY + 1],
      [centerX - 2, centerY],
      [centerX + 2, centerY],
      [centerX, centerY - 2],
      [centerX, centerY + 2]
    ];
    
    for (let i = 0; i < playerCount; i++) {
      const [spawnX, spawnY] = spawnPositions[i] || [centerX, centerY];
      const player = this.createPlayer(i, spawnX, spawnY);
      this.players.push(player);
    }
  }

  createPlayer(playerId, x, y) {
    const playerEmojis = ['👨‍🌾', '👩‍🌾', '👨‍🔧', '👩‍🔧', '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓'];
    
    const sprite = this.add.text(
      x * TILE_SIZE + TILE_SIZE/2, 
      y * TILE_SIZE + TILE_SIZE/2, 
      playerEmojis[playerId % playerEmojis.length], 
      { fontSize: '24px' }
    ).setOrigin(0.5);
    
    // Add direction indicator 
    const directionIndicator = this.add.triangle(
      x * TILE_SIZE + TILE_SIZE/2, 
      y * TILE_SIZE + TILE_SIZE/2 - 15, 
      0, 5, 5, -5, -5, -5, 
      0x000000
    );
    
    return {
      id: playerId,
      x: x,
      y: y,
      sprite: sprite,
      directionIndicator: directionIndicator,
      role: 'farmer',
      inventory: [],
      controls: PLAYER_CONTROLS[playerId],
      lastMoveTime: 0
    };
  }

  setupInput() {
    // Create keyboard input for all players
    this.input.keyboard.on('keydown', (event) => {
      this.handlePlayerInput(event.code);
    });
  }

  handlePlayerInput(keyCode) {
    if (this.gameState.isPaused || this.gameState.isGameOver) return;
    
    const currentTime = this.time.now;
    
    this.players.forEach(player => {
      // Throttle movement to prevent too rapid movement
      if (currentTime - player.lastMoveTime < 200) return;
      
      const controls = player.controls;
      let newX = player.x;
      let newY = player.y;
      let moved = false;
      
      if (keyCode === controls.up) {
        newY = Math.max(0, player.y - 1);
        moved = true;
      } else if (keyCode === controls.down) {
        newY = Math.min(this.mapSize - 1, player.y + 1);
        moved = true;
      } else if (keyCode === controls.left) {
        newX = Math.max(0, player.x - 1);
        moved = true;
      } else if (keyCode === controls.right) {
        newX = Math.min(this.mapSize - 1, player.x + 1);
        moved = true;
      } else if (keyCode === controls.action) {
        this.handlePlayerAction(player);
        return;
      }
      
      if (moved && this.isValidMove(newX, newY)) {
        this.movePlayer(player, newX, newY);
        player.lastMoveTime = currentTime;
      }
    });
  }

  isValidMove(x, y) {
    const tile = this.tiles[y][x];
    return tile.type !== TILE_TYPES.OBSTACLE;
  }

  movePlayer(player, newX, newY) {
    player.x = newX;
    player.y = newY;
    
    // Update sprite position
    player.sprite.x = newX * TILE_SIZE + TILE_SIZE/2;
    player.sprite.y = newY * TILE_SIZE + TILE_SIZE/2;
    
    // Update direction indicator
    player.directionIndicator.x = newX * TILE_SIZE + TILE_SIZE/2;
    player.directionIndicator.y = newY * TILE_SIZE + TILE_SIZE/2 - 15;
  }

  handlePlayerAction(player) {
    const tile = this.tiles[player.y][player.x];
    
    switch (tile.type) {
      case TILE_TYPES.FARMABLE:
        this.handleFarmingAction(player, tile);
        break;
      case TILE_TYPES.WAGON:
        this.handleWagonAction(player, tile);
        break;
      case TILE_TYPES.ROLE_STATION:
        this.handleRoleChange(player, tile);
        break;
      case TILE_TYPES.PEST_DROP:
        this.handlePestDrop(player, tile);
        break;
    }
  }

  handleFarmingAction(player, tile) {
    if (!tile.content) {
      // Plant crop
      tile.content = {
        type: 'crop',
        stage: 0, // 0: planted, 1: growing, 2: mature
        plantTime: this.time.now,
        needsWater: true
      };
      
      // Update tile visual
      if (tile.sprite.emoji) {
        tile.sprite.emoji.setText('🌰'); // Seed
      }
    } else if (tile.content.type === 'crop' && tile.content.needsWater) {
      // Water crop
      tile.content.needsWater = false;
      tile.content.stage = Math.min(2, tile.content.stage + 1);
      
      // Update visual based on stage
      const stageEmojis = ['🌰', '🌾', '🌽'];
      if (tile.sprite.emoji) {
        tile.sprite.emoji.setText(stageEmojis[tile.content.stage]);
      }
    } else if (tile.content.type === 'crop' && tile.content.stage === 2) {
      // Harvest crop
      player.inventory.push('crop');
      tile.content = null;
      
      // Reset tile visual
      if (tile.sprite.emoji) {
        tile.sprite.emoji.setText('🌱');
      }
    }
  }

  handleWagonAction(player, tile) {
    // Deposit crops
    const cropCount = player.inventory.filter(item => item === 'crop').length;
    if (cropCount > 0) {
      player.inventory = player.inventory.filter(item => item !== 'crop');
      this.gameState.harvestedCrops += cropCount;
      this.gameState.score += cropCount * 10;
    }
  }

  handleRoleChange(player, tile) {
    const roles = ['farmer', 'waterer', 'harvester', 'pest_controller'];
    const currentIndex = roles.indexOf(player.role);
    player.role = roles[(currentIndex + 1) % roles.length];
  }

  handlePestDrop(player, tile) {
    // Drop pests from inventory
    const pestCount = player.inventory.filter(item => item === 'pest').length;
    if (pestCount > 0) {
      player.inventory = player.inventory.filter(item => item !== 'pest');
    }
  }

  spawnInitialThreats(difficulty) {
    // Spawn initial weeds
    for (let i = 0; i < difficulty.initial_weed_count; i++) {
      this.spawnWeed();
    }
    
    // Spawn initial pests
    for (let i = 0; i < difficulty.initial_pest_count; i++) {
      this.spawnPest();
    }
  }

  spawnWeed() {
    const x = Phaser.Math.Between(1, this.mapSize - 2);
    const y = Phaser.Math.Between(1, this.mapSize - 2);
    const tile = this.tiles[y][x];
    
    if (tile.type === TILE_TYPES.FARMABLE && !tile.content) {
      tile.content = {
        type: 'weed',
        growthStage: 0,
        spawnTime: this.time.now
      };
      
      if (tile.sprite.emoji) {
        tile.sprite.emoji.setText('🌿');
      }
      
      this.weeds.push({ x, y, tile });
    }
  }

  spawnPest() {
    const x = Phaser.Math.Between(1, this.mapSize - 2);
    const y = Phaser.Math.Between(1, this.mapSize - 2);
    
    const pestEmojis = ['🐰', '🐿️'];
    const pestEmoji = pestEmojis[Math.floor(Math.random() * pestEmojis.length)];
    
    const sprite = this.add.text(
      x * TILE_SIZE + TILE_SIZE/2,
      y * TILE_SIZE + TILE_SIZE/2,
      pestEmoji,
      { fontSize: '20px' }
    ).setOrigin(0.5);
    
    this.pests.push({
      x: x,
      y: y,
      sprite: sprite,
      moveTimer: 0,
      type: pestEmoji === '🐰' ? 'rabbit' : 'squirrel'
    });
  }

  startGameTimers(difficulty) {
    // Pest movement timer
    this.time.addEvent({
      delay: 3000, // Move every 3 seconds
      callback: this.movePests,
      callbackScope: this,
      loop: true
    });
    
    // Weed growth timer
    this.time.addEvent({
      delay: 5000, // Check weed growth every 5 seconds
      callback: this.updateWeeds,
      callbackScope: this,
      loop: true
    });
    
    // Pest spawning timer
    this.time.addEvent({
      delay: 10000 / difficulty.pest_spawn_rate, // Spawn rate based on difficulty
      callback: this.spawnPest,
      callbackScope: this,
      loop: true
    });
  }

  movePests() {
    this.pests.forEach(pest => {
      const directions = [
        { x: 0, y: -1 }, { x: 0, y: 1 },
        { x: -1, y: 0 }, { x: 1, y: 0 }
      ];
      
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const newX = Phaser.Math.Clamp(pest.x + direction.x, 1, this.mapSize - 2);
      const newY = Phaser.Math.Clamp(pest.y + direction.y, 1, this.mapSize - 2);
      
      if (this.isValidMove(newX, newY)) {
        pest.x = newX;
        pest.y = newY;
        pest.sprite.x = newX * TILE_SIZE + TILE_SIZE/2;
        pest.sprite.y = newY * TILE_SIZE + TILE_SIZE/2;
      }
    });
  }

  updateWeeds() {
    this.weeds.forEach((weed, index) => {
      const ageMs = this.time.now - weed.tile.content.spawnTime;
      const ageSeconds = ageMs / 1000;
      
      // Weeds spread after 15 seconds
      if (ageSeconds > 15 && Math.random() < 0.3) {
        this.spreadWeed(weed.x, weed.y);
      }
    });
  }

  spreadWeed(originX, originY) {
    const directions = [
      { x: 0, y: -1 }, { x: 0, y: 1 },
      { x: -1, y: 0 }, { x: 1, y: 0 }
    ];
    
    directions.forEach(dir => {
      const newX = originX + dir.x;
      const newY = originY + dir.y;
      
      if (newX >= 1 && newX < this.mapSize - 1 && 
          newY >= 1 && newY < this.mapSize - 1) {
        const tile = this.tiles[newY][newX];
        
        if (tile.type === TILE_TYPES.FARMABLE && !tile.content) {
          tile.content = {
            type: 'weed',
            growthStage: 0,
            spawnTime: this.time.now
          };
          
          if (tile.sprite.emoji) {
            tile.sprite.emoji.setText('🌿');
          }
          
          this.weeds.push({ x: newX, y: newY, tile });
        }
      }
    });
  }

  update() {
    // Update game state
    this.registry.set('gameState', this.gameState);
  }
}

// UI Scene - overlays the game with HUD
class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    // Create HUD elements
    this.scoreText = this.add.text(10, 10, 'Score: 0', {
      fontSize: '24px',
      fill: '#ffffff'
    });
    
    this.cropsText = this.add.text(10, 40, 'Crops Harvested: 0', {
      fontSize: '20px', 
      fill: '#ffffff'
    });
    
    this.playersText = this.add.text(10, 70, 'Players: 0', {
      fontSize: '20px',
      fill: '#ffffff'
    });
  }

  update() {
    const gameState = this.registry.get('gameState');
    const gameConfig = this.registry.get('gameConfig');
    
    if (gameState) {
      this.scoreText.setText(`Score: ${gameState.score}`);
      this.cropsText.setText(`Crops Harvested: ${gameState.harvestedCrops}`);
    }
    
    if (gameConfig) {
      this.playersText.setText(`Players: ${gameConfig.players}`);
    }
  }
}

export default Game;