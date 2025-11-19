import { GameState, GameConfig, DifficultyLevel, Wagon } from '../config/types';
import { getConfigForDifficulty, calculateMapSize } from '../config/difficulties';
import { TileMapGenerator } from './TileMap';
import { PlayerSystem } from '../systems/PlayerSystem';
import { CropSystem } from '../systems/CropSystem';
import { PestSystem, WeedSystem } from '../systems/ThreatSystems';

/**
 * Central game state manager that coordinates all game systems
 */
export class GameStateManager {
  private config: GameConfig;
  private tileMap: TileMapGenerator;
  private playerSystem: PlayerSystem;
  private cropSystem: CropSystem;
  private pestSystem: PestSystem;
  private weedSystem: WeedSystem;
  private wagon: Wagon;
  private cropsHarvested: number = 0;
  private gameStartTime: number = 0;
  private isPaused: boolean = false;
  private pauseRequester: string | null = null;
  private isGameOver: boolean = false;

  constructor(difficulty: DifficultyLevel, playerCount: number) {
    this.config = getConfigForDifficulty(difficulty);
    const mapSize = calculateMapSize(this.config, playerCount);

    // Initialize systems
    this.tileMap = new TileMapGenerator(this.config, playerCount);
    this.tileMap.generate();

    this.playerSystem = new PlayerSystem(this.tileMap);
    this.cropSystem = new CropSystem(this.config, this.tileMap);
    this.pestSystem = new PestSystem(this.config, this.tileMap);
    this.weedSystem = new WeedSystem(this.config, this.tileMap);

    // Set up system integrations
    this.weedSystem.setCropDestroyCallback((x, y) => this.cropSystem.destroyCrop(x, y));

    // Initialize wagon
    const wagonTile = this.tileMap.getMap().flat().find(t => t.wagonPart);
    this.wagon = {
      x: wagonTile?.x || Math.floor(mapSize / 2),
      y: wagonTile?.y || Math.floor(mapSize / 2),
      cropsStored: 0,
      playersGrabbing: [],
      pathTiles: this.getWagonPath()
    };
  }

  private getWagonPath(): { x: number; y: number }[] {
    const pathTiles = this.tileMap.getMap().flat().filter(t => t.type === 'wagon_path');
    return pathTiles.map(t => ({ x: t.x, y: t.y }));
  }

  /**
   * Start the game
   */
  startGame(): void {
    this.gameStartTime = Date.now();
    this.isPaused = false;
    this.isGameOver = false;
  }

  /**
   * Main update loop - should be called every frame/tick
   */
  update(): void {
    if (this.isPaused || this.isGameOver) return;

    // Update all systems
    this.cropSystem.updateCrops();
    this.pestSystem.updatePests();
    this.playerSystem.updateSpeedBoosts();

    // Update pest targets
    this.pestSystem.findTargets(this.cropSystem.getMatureCrops(), this.wagon);
  }

  /**
   * Add a player to the game
   */
  addPlayer(id: string, name: string, x: number, y: number): void {
    this.playerSystem.createPlayer(id, name, x, y);
  }

  /**
   * Move a player
   */
  movePlayer(playerId: string, direction: 'up' | 'down' | 'left' | 'right'): boolean {
    return this.playerSystem.movePlayer(playerId, direction);
  }

  /**
   * Perform an action (context-sensitive based on player role and position)
   */
  performAction(playerId: string): boolean {
    const player = this.playerSystem.getPlayer(playerId);
    if (!player) return false;

    const tile = this.tileMap.getTileAt(player.x, player.y);
    if (!tile) return false;

    switch (player.role) {
      case 'tiller':
        return this.tillSoil(player.x, player.y);

      case 'planter':
        return this.plantSeed(player.x, player.y);

      case 'waterer':
        return this.waterCrops(player.x, player.direction);

      case 'harvester':
        return this.harvestCrop(playerId, player.x, player.y);

      case 'weeder':
        return this.removeWeed(player.x, player.y);

      case 'pest_catcher':
        return this.handlePest(playerId, player.x, player.y, player.direction);
    }

    return false;
  }

  private tillSoil(x: number, y: number): boolean {
    const tile = this.tileMap.getTileAt(x, y);
    if (!tile || tile.type !== 'farmable') return false;

    // Remove weeds if present
    if (tile.hasWeed) {
      this.weedSystem.removeWeed(x, y);
    }

    tile.tilled = true;
    return true;
  }

  private plantSeed(x: number, y: number): boolean {
    const crop = this.cropSystem.plantSeed(x, y);
    return crop !== null;
  }

  private waterCrops(x: number, direction: string): boolean {
    // Water in a triangle pattern (3 tiles in facing direction)
    const tiles = this.getWaterTiles(x, direction);
    let watered = false;

    tiles.forEach(({ x, y }) => {
      if (this.cropSystem.waterCrop(x, y)) {
        watered = true;
      }
    });

    return watered;
  }

  private getWaterTiles(x: number, direction: string): { x: number; y: number }[] {
    const player = this.playerSystem.getAllPlayers().find(p => p.x === x);
    if (!player) return [];

    const tiles: { x: number; y: number }[] = [];
    const px = player.x;
    const py = player.y;

    // Water current tile and tiles in facing direction (triangle pattern)
    tiles.push({ x: px, y: py });

    switch (direction) {
      case 'up':
        tiles.push({ x: px, y: py - 1 });
        tiles.push({ x: px - 1, y: py - 1 });
        tiles.push({ x: px + 1, y: py - 1 });
        break;
      case 'down':
        tiles.push({ x: px, y: py + 1 });
        tiles.push({ x: px - 1, y: py + 1 });
        tiles.push({ x: px + 1, y: py + 1 });
        break;
      case 'left':
        tiles.push({ x: px - 1, y: py });
        tiles.push({ x: px - 1, y: py - 1 });
        tiles.push({ x: px - 1, y: py + 1 });
        break;
      case 'right':
        tiles.push({ x: px + 1, y: py });
        tiles.push({ x: px + 1, y: py - 1 });
        tiles.push({ x: px + 1, y: py + 1 });
        break;
    }

    return tiles;
  }

  private harvestCrop(playerId: string, x: number, y: number): boolean {
    const player = this.playerSystem.getPlayer(playerId);
    if (!player) return false;

    // If carrying crop, deposit at wagon
    if (player.carrying?.type === 'crop') {
      const atWagon = Math.abs(player.x - this.wagon.x) <= 1 &&
                      Math.abs(player.y - this.wagon.y) <= 1;
      if (atWagon) {
        this.wagon.cropsStored++;
        this.cropsHarvested++;
        this.playerSystem.drop(playerId);
        return true;
      }
      return false;
    }

    // Otherwise, try to pick up crop
    const crop = this.cropSystem.getCropAt(x, y);
    if (crop && crop.stage === 'mature') {
      this.cropSystem.harvestCrop(x, y);
      this.playerSystem.pickUp(playerId, 'crop', crop.id);
      return true;
    }

    return false;
  }

  private removeWeed(x: number, y: number): boolean {
    return this.weedSystem.removeWeed(x, y);
  }

  private handlePest(playerId: string, x: number, y: number, direction: string): boolean {
    const player = this.playerSystem.getPlayer(playerId);
    if (!player) return false;

    const tile = this.tileMap.getTileAt(x, y);

    // If carrying pest, try to drop it off
    if (player.carrying?.type === 'pest') {
      if (tile?.type === 'pest_dropoff') {
        this.pestSystem.dropOffPest(player.carrying.id, x, y);
        this.playerSystem.drop(playerId);
        return true;
      }
      return false;
    }

    // Otherwise, try to pick up adjacent pest
    const adjacent = this.getAdjacentInDirection(x, y, direction);
    const pest = this.pestSystem.getPestAt(adjacent.x, adjacent.y);
    if (pest) {
      this.pestSystem.pickUpPest(pest.id);
      this.playerSystem.pickUp(playerId, 'pest', pest.id);
      return true;
    }

    return false;
  }

  private getAdjacentInDirection(x: number, y: number, direction: string): { x: number; y: number } {
    switch (direction) {
      case 'up': return { x, y: y - 1 };
      case 'down': return { x, y: y + 1 };
      case 'left': return { x: x - 1, y };
      case 'right': return { x: x + 1, y };
      default: return { x, y };
    }
  }

  /**
   * Get complete game state
   */
  getState(): any {
    return {
      cropsHarvested: this.cropsHarvested,
      cropCount: this.cropSystem.getCropCount(),
      weedCount: this.weedSystem.getAllWeeds().length,
      pestCount: this.pestSystem.getAllPests().length,
      playerCount: this.playerSystem.getPlayerCount(),
      wagonCrops: this.wagon.cropsStored,
      isGameOver: this.isGameOver,
      gameTime: Date.now() - this.gameStartTime
    };
  }

  /**
   * End the game
   */
  endGame(): void {
    this.isGameOver = true;
  }

  // Expose systems for testing
  getTileMap() { return this.tileMap; }
  getPlayerSystem() { return this.playerSystem; }
  getCropSystem() { return this.cropSystem; }
  getPestSystem() { return this.pestSystem; }
  getWeedSystem() { return this.weedSystem; }
  getWagon() { return this.wagon; }
}
