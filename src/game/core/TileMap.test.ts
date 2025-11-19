import { describe, it, expect, beforeEach } from 'vitest';
import { TileMapGenerator } from './TileMap';
import { BALANCED_CONFIG, calculateMapSize } from '../config/difficulties';
import { TileType } from '../config/types';

describe('TileMapGenerator', () => {
  describe('Map Generation', () => {
    it('should generate a map with correct size based on player count', () => {
      const generator = new TileMapGenerator(BALANCED_CONFIG, 2);
      const map = generator.generate();

      const expectedSize = calculateMapSize(BALANCED_CONFIG, 2);
      expect(map.length).toBe(expectedSize);
      expect(map[0].length).toBe(expectedSize);
    });

    it('should scale map size correctly for different player counts', () => {
      const gen2 = new TileMapGenerator(BALANCED_CONFIG, 2);
      const gen4 = new TileMapGenerator(BALANCED_CONFIG, 4);
      const gen6 = new TileMapGenerator(BALANCED_CONFIG, 6);

      const map2 = gen2.generate();
      const map4 = gen4.generate();
      const map6 = gen6.generate();

      expect(map2.length).toBeLessThan(map4.length);
      expect(map4.length).toBeLessThan(map6.length);
    });

    it('should initialize all tiles with basic properties', () => {
      const generator = new TileMapGenerator(BALANCED_CONFIG, 2);
      const map = generator.generate();

      map.forEach(row => {
        row.forEach(tile => {
          expect(tile).toHaveProperty('x');
          expect(tile).toHaveProperty('y');
          expect(tile).toHaveProperty('type');
          expect(tile.tilled).toBe(false);
          expect(tile.watered).toBe(false);
          expect(tile.hasWeed).toBe(false);
        });
      });
    });

    it('should distribute tiles according to configured ratios', () => {
      const generator = new TileMapGenerator(BALANCED_CONFIG, 2);
      const map = generator.generate();

      const totalTiles = map.length * map[0].length;
      const tileCounts: Record<string, number> = {};

      map.forEach(row => {
        row.forEach(tile => {
          tileCounts[tile.type] = (tileCounts[tile.type] || 0) + 1;
        });
      });

      const farmablePercent = (tileCounts.farmable / totalTiles) * 100;
      // Allow 10% variance from target
      expect(farmablePercent).toBeGreaterThan(50);
      expect(farmablePercent).toBeLessThan(70);
    });

    it('should place role stations with at least one of each role', () => {
      const generator = new TileMapGenerator(BALANCED_CONFIG, 2);
      const map = generator.generate();

      const roleStations = map.flat().filter(tile => tile.type === 'role_station');
      expect(roleStations.length).toBeGreaterThan(0);

      const roles = new Set(roleStations.map(tile => tile.roleType));
      expect(roles.size).toBe(6);
      expect(roles.has('tiller')).toBe(true);
      expect(roles.has('planter')).toBe(true);
      expect(roles.has('waterer')).toBe(true);
      expect(roles.has('harvester')).toBe(true);
      expect(roles.has('weeder')).toBe(true);
      expect(roles.has('pest_catcher')).toBe(true);
    });

    it('should place exactly one wagon', () => {
      const generator = new TileMapGenerator(BALANCED_CONFIG, 2);
      const map = generator.generate();

      const wagonTiles = map.flat().filter(tile => tile.wagonPart);
      expect(wagonTiles.length).toBeGreaterThan(0);
      expect(wagonTiles.length).toBeLessThanOrEqual(4); // wagon is 4 tiles
    });

    it('should create a wagon path from wagon to exit', () => {
      const generator = new TileMapGenerator(BALANCED_CONFIG, 2);
      const map = generator.generate();

      const pathTiles = map.flat().filter(tile => tile.type === 'wagon_path');
      expect(pathTiles.length).toBeGreaterThan(0);

      const exitTiles = map.flat().filter(tile => tile.type === 'exit');
      expect(exitTiles.length).toBeGreaterThan(0);
    });

    it('should place pest drop-off tiles on map edges', () => {
      const generator = new TileMapGenerator(BALANCED_CONFIG, 2);
      const map = generator.generate();

      const dropOffTiles = map.flat().filter(tile => tile.type === 'pest_dropoff');
      expect(dropOffTiles.length).toBeGreaterThan(0);

      dropOffTiles.forEach(tile => {
        const isOnEdge = tile.x === 0 || tile.x === map.length - 1 ||
                         tile.y === 0 || tile.y === map[0].length - 1;
        expect(isOnEdge).toBe(true);
      });
    });
  });

  describe('Tile Access', () => {
    let generator: TileMapGenerator;
    let map: any[][];

    beforeEach(() => {
      generator = new TileMapGenerator(BALANCED_CONFIG, 2);
      map = generator.generate();
    });

    it('should get tile at specific coordinates', () => {
      const tile = generator.getTileAt(0, 0);
      expect(tile).toBeDefined();
      expect(tile?.x).toBe(0);
      expect(tile?.y).toBe(0);
    });

    it('should return undefined for out of bounds coordinates', () => {
      const tile = generator.getTileAt(-1, -1);
      expect(tile).toBeUndefined();

      const tile2 = generator.getTileAt(1000, 1000);
      expect(tile2).toBeUndefined();
    });

    it('should check if tile is passable', () => {
      const farmableTile = map.flat().find(t => t.type === 'farmable');
      expect(generator.isPassable(farmableTile!.x, farmableTile!.y)).toBe(true);

      const obstacleTile = map.flat().find(t => t.type === 'obstacle');
      if (obstacleTile) {
        expect(generator.isPassable(obstacleTile.x, obstacleTile.y)).toBe(false);
      }
    });

    it('should get adjacent tiles', () => {
      const centerX = Math.floor(map.length / 2);
      const centerY = Math.floor(map[0].length / 2);

      const adjacent = generator.getAdjacentTiles(centerX, centerY);
      expect(adjacent.length).toBeLessThanOrEqual(4);
      expect(adjacent.length).toBeGreaterThan(0);
    });
  });
});
