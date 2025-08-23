import Phaser from 'phaser';
import NetworkManager from '../network/NetworkManager';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.players = new Map();
    this.localPlayer = null;
    this.networkManager = null;
  }

  preload() {
    // Create simple colored rectangles for players
    this.load.image('ground', 'data:image/svg+xml;base64,' + btoa(`
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" fill="#8B4513"/>
      </svg>
    `));
    
    this.load.image('player', 'data:image/svg+xml;base64,' + btoa(`
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" fill="#4CAF50"/>
        <circle cx="12" cy="12" r="3" fill="#000"/>
        <circle cx="20" cy="12" r="3" fill="#000"/>
        <path d="M 10 20 Q 16 25 22 20" stroke="#000" stroke-width="2" fill="none"/>
      </svg>
    `));
  }

  create() {
    // Create simple grid background
    this.createBackground();
    
    // Set up input controls
    this.setupControls();
    
    // Create local player
    this.createLocalPlayer();
    
    // Add text for instructions
    this.add.text(10, 10, 'Same Mouth - Multiplayer Lobby', {
      fontSize: '24px',
      fill: '#ffffff'
    });
    
    this.add.text(10, 50, 'Use WASD or Arrow Keys to move', {
      fontSize: '16px',
      fill: '#ffffff'
    });

    this.add.text(10, 80, 'Move around to test the multiplayer lobby!', {
      fontSize: '16px',
      fill: '#90EE90'
    });
  }

  setNetworkManager(networkManager) {
    this.networkManager = networkManager;
    console.log('Network manager set in game scene');
  }

  createBackground() {
    // Create a simple tiled background
    for (let x = 0; x < this.cameras.main.width; x += 32) {
      for (let y = 0; y < this.cameras.main.height; y += 32) {
        this.add.image(x, y, 'ground').setOrigin(0, 0);
      }
    }
  }

  createLocalPlayer() {
    const startX = 400;
    const startY = 300;
    
    this.localPlayer = this.physics.add.sprite(startX, startY, 'player');
    this.localPlayer.setCollideWorldBounds(true);
    
    // Store player in players map
    this.players.set('local', this.localPlayer);
  }

  setupControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
  }

  update() {
    if (this.localPlayer) {
      this.handleMovement();
    }
  }

  handleMovement() {
    const speed = 200;
    const { left, right, up, down } = this.cursors;
    const { W, A, S, D } = this.wasd;
    
    // Reset velocity
    this.localPlayer.setVelocity(0);
    
    // Handle movement
    if (left.isDown || A.isDown) {
      this.localPlayer.setVelocityX(-speed);
    } else if (right.isDown || D.isDown) {
      this.localPlayer.setVelocityX(speed);
    }
    
    if (up.isDown || W.isDown) {
      this.localPlayer.setVelocityY(-speed);
    } else if (down.isDown || S.isDown) {
      this.localPlayer.setVelocityY(speed);
    }
    
    // Send position to network if moved
    if (this.localPlayer.body.velocity.x !== 0 || this.localPlayer.body.velocity.y !== 0) {
      this.networkManager?.sendPlayerUpdate({
        x: this.localPlayer.x,
        y: this.localPlayer.y,
        playerId: 'local'
      });
    }
  }

  addNetworkPlayer(playerId, x, y) {
    if (!this.players.has(playerId)) {
      const player = this.physics.add.sprite(x, y, 'player');
      player.setTint(0xff0000); // Make network players red
      this.players.set(playerId, player);
    }
  }

  updateNetworkPlayer(playerId, x, y) {
    const player = this.players.get(playerId);
    if (player && playerId !== 'local') {
      player.setPosition(x, y);
    }
  }

  removeNetworkPlayer(playerId) {
    const player = this.players.get(playerId);
    if (player && playerId !== 'local') {
      player.destroy();
      this.players.delete(playerId);
    }
  }
}