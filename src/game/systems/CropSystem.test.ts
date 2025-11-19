import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CropSystem } from './CropSystem';
import { Crop, CropStage } from '../config/types';
import { TileMapGenerator } from '../core/TileMap';
import { BALANCED_CONFIG } from '../config/difficulties';

describe('CropSystem', () => {
  let cropSystem: CropSystem;
  let tileMap: TileMapGenerator;

  beforeEach(() => {
    tileMap = new TileMapGenerator(BALANCED_CONFIG, 2);
    tileMap.generate();
    cropSystem = new CropSystem(BALANCED_CONFIG, tileMap);
  });

  describe('Crop Planting', () => {
    it('should plant a seed on tilled soil', () => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.tilled = true;
      tile.type = 'farmable';

      const crop = cropSystem.plantSeed(5, 5);

      expect(crop).toBeDefined();
      expect(crop?.stage).toBe('seed');
      expect(crop?.x).toBe(5);
      expect(crop?.y).toBe(5);
      expect(crop?.watered).toBe(false);
    });

    it('should not plant on untilled soil', () => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.tilled = false;

      const crop = cropSystem.plantSeed(5, 5);

      expect(crop).toBeNull();
    });

    it('should not plant where crop already exists', () => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.tilled = true;
      cropSystem.plantSeed(5, 5);

      const secondCrop = cropSystem.plantSeed(5, 5);

      expect(secondCrop).toBeNull();
    });

    it('should mark tile as having crop', () => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.type = 'farmable';
      tile.tilled = true;

      cropSystem.plantSeed(5, 5);

      expect(tile.hasCrop).toBe(true);
    });
  });

  describe('Crop Watering', () => {
    beforeEach(() => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.type = 'farmable';
      tile.tilled = true;
      cropSystem.plantSeed(5, 5);
    });

    it('should water a crop', () => {
      const result = cropSystem.waterCrop(5, 5);
      const crop = cropSystem.getCropAt(5, 5);

      expect(result).toBe(true);
      expect(crop?.watered).toBe(true);
      expect(crop?.wateredStages).toContain('seed');
    });

    it('should allow watering the same crop multiple times in same stage', () => {
      cropSystem.waterCrop(5, 5);
      const result = cropSystem.waterCrop(5, 5);

      expect(result).toBe(true);
    });

    it('should not water non-existent crop', () => {
      const result = cropSystem.waterCrop(10, 10);

      expect(result).toBe(false);
    });

    it('should track which stages have been watered', () => {
      cropSystem.waterCrop(5, 5);

      const crop = cropSystem.getCropAt(5, 5)!;
      expect(crop.wateredStages).toContain('seed');
    });
  });

  describe('Crop Growth', () => {
    it('should progress to next stage when watered and time elapsed', () => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.type = 'farmable';
      tile.tilled = true;
      cropSystem.plantSeed(5, 5);
      cropSystem.waterCrop(5, 5);

      // Simulate time passing (one growth period)
      const growthTime = BALANCED_CONFIG.crop_growth_base_time * 1000;
      vi.useFakeTimers();
      vi.advanceTimersByTime(growthTime + 100);

      cropSystem.updateCrops();

      const crop = cropSystem.getCropAt(5, 5);
      expect(crop?.stage).toBe('sprout');

      vi.useRealTimers();
    });

    it('should not progress without water on required stages', () => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.type = 'farmable';
      tile.tilled = true;
      cropSystem.plantSeed(5, 5);

      // Don't water (seed stage requires water)
      const growthTime = BALANCED_CONFIG.crop_growth_base_time * 1000 * 3;
      vi.useFakeTimers();
      vi.advanceTimersByTime(growthTime);

      cropSystem.updateCrops();

      const crop = cropSystem.getCropAt(5, 5);
      expect(crop?.stage).toBe('seed'); // Should still be seed

      vi.useRealTimers();
    });

    it('should grow twice as fast when watered', () => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.type = 'farmable';
      tile.tilled = true;
      cropSystem.plantSeed(5, 5);
      cropSystem.waterCrop(5, 5);

      // Advance by one growth period (should be enough with water)
      const growthTime = BALANCED_CONFIG.crop_growth_base_time * 1000;
      vi.useFakeTimers();
      vi.advanceTimersByTime(growthTime + 100);

      cropSystem.updateCrops();

      const crop = cropSystem.getCropAt(5, 5);
      expect(crop?.stage).toBe('sprout');

      vi.useRealTimers();
    });

    it('should progress through all growth stages', () => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.type = 'farmable';
      tile.tilled = true;
      cropSystem.plantSeed(5, 5);

      const stages: CropStage[] = ['seed', 'sprout', 'sprout2', 'sprout3', 'sprout4', 'mature'];
      const growthTime = BALANCED_CONFIG.crop_growth_base_time * 1000;

      vi.useFakeTimers();

      for (let i = 0; i < stages.length - 1; i++) {
        const crop = cropSystem.getCropAt(5, 5)!;

        // Water all stages to ensure fast progression
        cropSystem.waterCrop(5, 5);

        vi.advanceTimersByTime(growthTime + 100);
        cropSystem.updateCrops();
      }

      const finalCrop = cropSystem.getCropAt(5, 5);
      expect(finalCrop?.stage).toBe('mature');

      vi.useRealTimers();
    });

    it('should reset watered status after stage progression', () => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.type = 'farmable';
      tile.tilled = true;
      cropSystem.plantSeed(5, 5);
      cropSystem.waterCrop(5, 5);

      const growthTime = BALANCED_CONFIG.crop_growth_base_time * 1000;
      vi.useFakeTimers();
      vi.advanceTimersByTime(growthTime + 100);

      cropSystem.updateCrops();

      const crop = cropSystem.getCropAt(5, 5);
      expect(crop?.watered).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('Crop Harvesting', () => {
    beforeEach(() => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.type = 'farmable';
      tile.tilled = true;
    });

    it('should harvest mature crop', () => {
      cropSystem.plantSeed(5, 5);
      const crop = cropSystem.getCropAt(5, 5)!;
      crop.stage = 'mature';

      const harvested = cropSystem.harvestCrop(5, 5);

      expect(harvested).toBe(true);
      expect(cropSystem.getCropAt(5, 5)).toBeNull();
    });

    it('should not harvest immature crop', () => {
      cropSystem.plantSeed(5, 5);

      const harvested = cropSystem.harvestCrop(5, 5);

      expect(harvested).toBe(false);
      expect(cropSystem.getCropAt(5, 5)).toBeDefined();
    });

    it('should clear tile crop status after harvesting', () => {
      const tile = tileMap.getTileAt(5, 5)!;
      cropSystem.plantSeed(5, 5);
      const crop = cropSystem.getCropAt(5, 5)!;
      crop.stage = 'mature';

      cropSystem.harvestCrop(5, 5);

      expect(tile.hasCrop).toBe(false);
    });
  });

  describe('Crop Destruction', () => {
    beforeEach(() => {
      const tile = tileMap.getTileAt(5, 5)!;
      tile.type = 'farmable';
      tile.tilled = true;
      cropSystem.plantSeed(5, 5);
    });

    it('should destroy crop by weeds', () => {
      const result = cropSystem.destroyCrop(5, 5);

      expect(result).toBe(true);
      expect(cropSystem.getCropAt(5, 5)).toBeNull();
    });

    it('should clear tile crop status after destruction', () => {
      const tile = tileMap.getTileAt(5, 5)!;

      cropSystem.destroyCrop(5, 5);

      expect(tile.hasCrop).toBe(false);
    });
  });

  describe('Crop Queries', () => {
    it('should get all mature crops', () => {
      const tiles = [
        { x: 5, y: 5 },
        { x: 6, y: 6 },
        { x: 7, y: 7 }
      ];

      tiles.forEach(({ x, y }) => {
        const tile = tileMap.getTileAt(x, y)!;
        tile.type = 'farmable';
        tile.tilled = true;
        cropSystem.plantSeed(x, y);
      });

      // Make first two mature
      const crop1 = cropSystem.getCropAt(5, 5)!;
      const crop2 = cropSystem.getCropAt(6, 6)!;
      crop1.stage = 'mature';
      crop2.stage = 'mature';

      const matureCrops = cropSystem.getMatureCrops();

      expect(matureCrops.length).toBe(2);
    });

    it('should count total crops', () => {
      const tiles = [
        { x: 5, y: 5 },
        { x: 6, y: 6 },
        { x: 7, y: 7 }
      ];

      tiles.forEach(({ x, y }) => {
        const tile = tileMap.getTileAt(x, y)!;
        tile.type = 'farmable';
        tile.tilled = true;
        cropSystem.plantSeed(x, y);
      });

      expect(cropSystem.getCropCount()).toBe(3);
    });
  });
});
