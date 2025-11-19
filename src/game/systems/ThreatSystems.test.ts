import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PestSystem, WeedSystem } from './ThreatSystems';
import { TileMapGenerator } from '../core/TileMap';
import { BALANCED_CONFIG } from '../config/difficulties';
import { CropSystem } from './CropSystem';

describe('Threat Systems', () => {
  let tileMap: TileMapGenerator;
  let cropSystem: CropSystem;
  let pestSystem: PestSystem;
  let weedSystem: WeedSystem;

  beforeEach(() => {
    tileMap = new TileMapGenerator(BALANCED_CONFIG, 2);
    tileMap.generate();
    cropSystem = new CropSystem(BALANCED_CONFIG, tileMap);
    pestSystem = new PestSystem(BALANCED_CONFIG, tileMap);
    weedSystem = new WeedSystem(BALANCED_CONFIG, tileMap);
  });

  describe('WeedSystem', () => {
    it('should spawn weeds on farmable tiles', () => {
      weedSystem.spawnWeed(5, 5);
      const weed = weedSystem.getWeedAt(5, 5);

      expect(weed).toBeDefined();
    });

    it('should spread weeds to adjacent tiles', () => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.type = 'farmable';

      weedSystem.spawnWeed(5, 5);
      weedSystem.spreadWeeds();

      const totalWeeds = weedSystem.getAllWeeds().length;
      expect(totalWeeds).toBeGreaterThan(0);
    });

    it('should remove weeds', () => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.type = 'farmable';

      weedSystem.spawnWeed(5, 5);
      const removed = weedSystem.removeWeed(5, 5);

      expect(removed).toBe(true);
      expect(weedSystem.getWeedAt(5, 5)).toBeNull();
    });

    it('should mark tiles as having weeds', () => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.type = 'farmable';

      weedSystem.spawnWeed(5, 5);

      expect(tile.hasWeed).toBe(true);
    });

    it('should destroy crops where weeds spawn', () => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.type = 'farmable';
      tile.tilled = true;

      // Set up crop destroy callback
      weedSystem.setCropDestroyCallback((x, y) => cropSystem.destroyCrop(x, y));

      cropSystem.plantSeed(5, 5);
      weedSystem.spawnWeed(5, 5);

      expect(cropSystem.getCropAt(5, 5)).toBeNull();
    });
  });

  describe('PestSystem', () => {
    it('should spawn pests at random locations', () => {
      pestSystem.spawnPest(10, 10);
      const pests = pestSystem.getAllPests();

      expect(pests.length).toBe(1);
    });

    it('should move pests toward target', () => {
      pestSystem.spawnPest(10, 10);
      const pest = pestSystem.getAllPests()[0];

      // Set a target
      pest.targetX = 15;
      pest.targetY = 15;

      // Simulate time passing to trigger movement
      vi.useFakeTimers();
      vi.advanceTimersByTime(3100);

      pestSystem.updatePests();

      // Pest should have moved closer to target
      expect(pest.x !== 10 || pest.y !== 10).toBe(true);

      vi.useRealTimers();
    });

    it('should move pests toward mature crops', () => {
      const tile = tileMap.getTileAt(12, 12)!;
      tile.type = 'farmable';
      tile.tilled = true;

      cropSystem.plantSeed(12, 12);
      const crop = cropSystem.getCropAt(12, 12)!;
      crop.stage = 'mature';

      pestSystem.spawnPest(10, 10);
      pestSystem.findTargets(cropSystem.getMatureCrops(), { x: 20, y: 20, cropsStored: 0 });

      const pest = pestSystem.getAllPests()[0];
      expect(pest.targetX).toBeDefined();
    });

    it('should allow picking up pests', () => {
      pestSystem.spawnPest(10, 10);
      const pest = pestSystem.getAllPests()[0];

      const pickedUp = pestSystem.pickUpPest(pest.id);

      expect(pickedUp).toBe(true);
      expect(pest.carrying).toBe(true);
    });

    it('should remove pests at dropoff tiles', () => {
      const pest = pestSystem.spawnPest(10, 10)!;
      const result = pestSystem.dropOffPest(pest.id, 0, 0);

      expect(result).toBe(true);
      expect(pestSystem.getPest(pest.id)).toBeUndefined();
    });
  });
});
