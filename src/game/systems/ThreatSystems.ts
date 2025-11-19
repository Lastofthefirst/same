import { Pest, Weed, GameConfig, Crop } from '../config/types';
import { TileMapGenerator } from '../core/TileMap';

export class WeedSystem {
  private weeds: Map<string, Weed> = new Map();
  private config: GameConfig;
  private tileMap: TileMapGenerator;
  private nextWeedId = 0;
  private cropDestroyCallback?: (x: number, y: number) => void;

  constructor(config: GameConfig, tileMap: TileMapGenerator) {
    this.config = config;
    this.tileMap = tileMap;
  }

  setCropDestroyCallback(callback: (x: number, y: number) => void): void {
    this.cropDestroyCallback = callback;
  }

  spawnWeed(x: number, y: number): Weed | null {
    const tile = this.tileMap.getTileAt(x, y);
    if (!tile || tile.type !== 'farmable') return null;

    // Destroy any crop at this location
    if (tile.hasCrop && this.cropDestroyCallback) {
      this.cropDestroyCallback(x, y);
    }

    const weed: Weed = {
      id: `weed_${this.nextWeedId++}`,
      x,
      y,
      spawnTime: Date.now()
    };

    this.weeds.set(weed.id, weed);
    tile.hasWeed = true;

    return weed;
  }

  spreadWeeds(): void {
    const weedsToAdd: { x: number; y: number }[] = [];

    this.weeds.forEach(weed => {
      // Random chance to spread
      if (Math.random() < 0.3) {
        const adjacent = this.tileMap.getAdjacentTiles(weed.x, weed.y);
        const farmable = adjacent.filter(t => t.type === 'farmable' && !t.hasWeed);

        if (farmable.length > 0) {
          const target = farmable[Math.floor(Math.random() * farmable.length)];
          weedsToAdd.push({ x: target.x, y: target.y });
        }
      }
    });

    weedsToAdd.forEach(({ x, y }) => this.spawnWeed(x, y));
  }

  removeWeed(x: number, y: number): boolean {
    const weed = this.getWeedAt(x, y);
    if (!weed) return false;

    this.weeds.delete(weed.id);

    const tile = this.tileMap.getTileAt(x, y);
    if (tile) {
      tile.hasWeed = false;
    }

    return true;
  }

  getWeedAt(x: number, y: number): Weed | null {
    for (const weed of this.weeds.values()) {
      if (weed.x === x && weed.y === y) {
        return weed;
      }
    }
    return null;
  }

  getAllWeeds(): Weed[] {
    return Array.from(this.weeds.values());
  }
}

export class PestSystem {
  private pests: Map<string, Pest> = new Map();
  private config: GameConfig;
  private tileMap: TileMapGenerator;
  private nextPestId = 0;

  constructor(config: GameConfig, tileMap: TileMapGenerator) {
    this.config = config;
    this.tileMap = tileMap;
  }

  spawnPest(x: number, y: number): Pest | null {
    const pest: Pest = {
      id: `pest_${this.nextPestId++}`,
      x,
      y,
      type: Math.random() > 0.5 ? 'squirrel' : 'rabbit',
      targetX: null,
      targetY: null,
      carrying: false,
      lastMoveTime: Date.now()
    };

    this.pests.set(pest.id, pest);
    return pest;
  }

  updatePests(): void {
    const now = Date.now();

    this.pests.forEach(pest => {
      if (pest.carrying) return; // Don't move if being carried

      // Move every 3 seconds (slower than players)
      if (now - pest.lastMoveTime < 3000) return;

      if (pest.targetX !== null && pest.targetY !== null) {
        // Move toward target
        const dx = pest.targetX - pest.x;
        const dy = pest.targetY - pest.y;

        if (dx !== 0) {
          const newX = pest.x + Math.sign(dx);
          if (this.tileMap.isPassable(newX, pest.y)) {
            pest.x = newX;
            pest.lastMoveTime = now;
            return;
          }
        }

        if (dy !== 0) {
          const newY = pest.y + Math.sign(dy);
          if (this.tileMap.isPassable(pest.x, newY)) {
            pest.y = newY;
            pest.lastMoveTime = now;
            return;
          }
        }
      } else {
        // Random movement
        const directions = [
          { dx: 0, dy: -1 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 }
        ];

        const dir = directions[Math.floor(Math.random() * directions.length)];
        const newX = pest.x + dir.dx;
        const newY = pest.y + dir.dy;

        if (this.tileMap.isPassable(newX, newY)) {
          pest.x = newX;
          pest.y = newY;
          pest.lastMoveTime = now;
        }
      }
    });
  }

  findTargets(matureCrops: Crop[], wagon: { x: number; y: number; cropsStored: number }): void {
    this.pests.forEach(pest => {
      if (pest.carrying) return;

      // Prefer wagon if it has crops
      if (wagon.cropsStored > 0) {
        pest.targetX = wagon.x;
        pest.targetY = wagon.y;
        return;
      }

      // Otherwise target nearest mature crop
      if (matureCrops.length > 0) {
        let nearest = matureCrops[0];
        let minDist = Math.abs(pest.x - nearest.x) + Math.abs(pest.y - nearest.y);

        matureCrops.forEach(crop => {
          const dist = Math.abs(pest.x - crop.x) + Math.abs(pest.y - crop.y);
          if (dist < minDist) {
            minDist = dist;
            nearest = crop;
          }
        });

        pest.targetX = nearest.x;
        pest.targetY = nearest.y;
      } else {
        pest.targetX = null;
        pest.targetY = null;
      }
    });
  }

  pickUpPest(id: string): boolean {
    const pest = this.pests.get(id);
    if (!pest) return false;

    pest.carrying = true;
    return true;
  }

  dropPest(id: string): boolean {
    const pest = this.pests.get(id);
    if (!pest) return false;

    pest.carrying = false;
    return true;
  }

  dropOffPest(id: string, x: number, y: number): boolean {
    const tile = this.tileMap.getTileAt(x, y);
    if (!tile || tile.type !== 'pest_dropoff') return false;

    this.pests.delete(id);
    return true;
  }

  getPest(id: string): Pest | undefined {
    return this.pests.get(id);
  }

  getPestAt(x: number, y: number): Pest | null {
    for (const pest of this.pests.values()) {
      if (pest.x === x && pest.y === y && !pest.carrying) {
        return pest;
      }
    }
    return null;
  }

  getAllPests(): Pest[] {
    return Array.from(this.pests.values());
  }
}
