import { GameConfig, Tile, TileType, Role } from '../config/types';
import { calculateMapSize } from '../config/difficulties';

export class TileMapGenerator {
  private config: GameConfig;
  private playerCount: number;
  private mapSize: number;
  private tiles: Tile[][] = [];

  constructor(config: GameConfig, playerCount: number) {
    this.config = config;
    this.playerCount = playerCount;
    this.mapSize = calculateMapSize(config, playerCount);
  }

  generate(): Tile[][] {
    // Initialize all tiles as farmable
    this.initializeEmptyMap();

    // Place special tiles in order (wagon first so we don't overwrite it)
    this.placeWagonAndPath();
    this.placeRoleStations();
    this.placePestDropOffs();
    this.placeObstacles();

    return this.tiles;
  }

  private initializeEmptyMap(): void {
    this.tiles = [];
    for (let y = 0; y < this.mapSize; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < this.mapSize; x++) {
        row.push({
          x,
          y,
          type: 'farmable',
          tilled: false,
          watered: false,
          hasWeed: false,
          hasCrop: false,
          hasPest: false,
          hasPlayer: false,
          wagonPart: false
        });
      }
      this.tiles.push(row);
    }
  }

  private placeObstacles(): void {
    const totalTiles = this.mapSize * this.mapSize;
    const obstacleCount = Math.floor(
      (totalTiles * this.config.tile_distribution.obstacles) / 100
    );

    let placed = 0;
    let attempts = 0;
    const maxAttempts = obstacleCount * 10;

    while (placed < obstacleCount && attempts < maxAttempts) {
      const x = Math.floor(Math.random() * this.mapSize);
      const y = Math.floor(Math.random() * this.mapSize);

      if (this.tiles[y][x].type === 'farmable' && !this.tiles[y][x].wagonPart) {
        this.tiles[y][x].type = 'obstacle';
        placed++;
      }
      attempts++;
    }
  }

  private placeWagonAndPath(): void {
    const totalTiles = this.mapSize * this.mapSize;
    const targetPathTiles = Math.floor((totalTiles * this.config.tile_distribution.paths) / 100);

    // Place wagon near center
    const centerX = Math.floor(this.mapSize / 2);
    const centerY = Math.floor(this.mapSize / 2);

    // Wagon occupies 2x2 tiles
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (x < this.mapSize && y < this.mapSize) {
          this.tiles[y][x].type = 'wagon';
          this.tiles[y][x].wagonPart = true;
        }
      }
    }

    // Create main path from wagon to edge
    const pathStartX = centerX + 2;
    const pathY = centerY;
    let pathTilesPlaced = 0;

    for (let x = pathStartX; x < this.mapSize - 1; x++) {
      if (this.tiles[pathY] && this.tiles[pathY][x]) {
        this.tiles[pathY][x].type = 'wagon_path';
        pathTilesPlaced++;
      }
    }

    // Place exit at the end of the main path
    if (this.tiles[pathY] && this.tiles[pathY][this.mapSize - 1]) {
      this.tiles[pathY][this.mapSize - 1].type = 'exit';
      pathTilesPlaced++;
    }

    // Add additional path tiles to meet distribution quota
    let attempts = 0;
    while (pathTilesPlaced < targetPathTiles && attempts < targetPathTiles * 10) {
      const x = Math.floor(Math.random() * this.mapSize);
      const y = Math.floor(Math.random() * this.mapSize);

      if (this.tiles[y][x].type === 'farmable') {
        this.tiles[y][x].type = 'wagon_path';
        pathTilesPlaced++;
      }
      attempts++;
    }
  }

  private placeRoleStations(): void {
    const totalTiles = this.mapSize * this.mapSize;
    const targetRoleTiles = Math.floor((totalTiles * this.config.tile_distribution.roles) / 100);
    const roles: Role[] = ['tiller', 'planter', 'waterer', 'harvester', 'weeder', 'pest_catcher'];

    // Place at least one of each role
    roles.forEach((role, index) => {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 100) {
        const x = Math.floor(Math.random() * this.mapSize);
        const y = Math.floor(Math.random() * this.mapSize);

        if (this.tiles[y][x].type === 'farmable' && !this.tiles[y][x].wagonPart) {
          this.tiles[y][x].type = 'role_station';
          this.tiles[y][x].roleType = role;
          placed = true;
        }
        attempts++;
      }
    });

    // Fill remaining role tiles quota with random roles
    let roleTilesPlaced = 6; // Already placed one of each
    let attempts = 0;

    while (roleTilesPlaced < targetRoleTiles && attempts < targetRoleTiles * 10) {
      const x = Math.floor(Math.random() * this.mapSize);
      const y = Math.floor(Math.random() * this.mapSize);
      const role = roles[Math.floor(Math.random() * roles.length)];

      if (this.tiles[y][x].type === 'farmable' && !this.tiles[y][x].wagonPart) {
        this.tiles[y][x].type = 'role_station';
        this.tiles[y][x].roleType = role;
        roleTilesPlaced++;
      }
      attempts++;
    }
  }

  private placePestDropOffs(): void {
    const totalTiles = this.mapSize * this.mapSize;
    const dropOffCount = Math.max(
      4,
      Math.floor((totalTiles * this.config.tile_distribution.pest_drop) / 100)
    );

    let placed = 0;
    let attempts = 0;

    while (placed < dropOffCount && attempts < dropOffCount * 10) {
      const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
      let x: number, y: number;

      switch (edge) {
        case 0: // top
          x = Math.floor(Math.random() * this.mapSize);
          y = 0;
          break;
        case 1: // right
          x = this.mapSize - 1;
          y = Math.floor(Math.random() * this.mapSize);
          break;
        case 2: // bottom
          x = Math.floor(Math.random() * this.mapSize);
          y = this.mapSize - 1;
          break;
        case 3: // left
          x = 0;
          y = Math.floor(Math.random() * this.mapSize);
          break;
        default:
          x = 0;
          y = 0;
      }

      if (this.tiles[y][x].type === 'farmable') {
        this.tiles[y][x].type = 'pest_dropoff';
        placed++;
      }
      attempts++;
    }
  }

  getTileAt(x: number, y: number): Tile | undefined {
    if (x < 0 || x >= this.mapSize || y < 0 || y >= this.mapSize) {
      return undefined;
    }
    return this.tiles[y][x];
  }

  isPassable(x: number, y: number): boolean {
    const tile = this.getTileAt(x, y);
    if (!tile) return false;

    return tile.type !== 'obstacle';
  }

  getAdjacentTiles(x: number, y: number): Tile[] {
    const adjacent: Tile[] = [];
    const directions = [
      { dx: 0, dy: -1 }, // up
      { dx: 1, dy: 0 },  // right
      { dx: 0, dy: 1 },  // down
      { dx: -1, dy: 0 }  // left
    ];

    directions.forEach(({ dx, dy }) => {
      const tile = this.getTileAt(x + dx, y + dy);
      if (tile) {
        adjacent.push(tile);
      }
    });

    return adjacent;
  }

  getMap(): Tile[][] {
    return this.tiles;
  }

  getMapSize(): number {
    return this.mapSize;
  }
}
