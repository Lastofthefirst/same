import { Crop, CropStage, GameConfig } from '../config/types';
import { TileMapGenerator } from '../core/TileMap';

export class CropSystem {
  private crops: Map<string, Crop> = new Map();
  private config: GameConfig;
  private tileMap: TileMapGenerator;
  private nextCropId = 0;

  constructor(config: GameConfig, tileMap: TileMapGenerator) {
    this.config = config;
    this.tileMap = tileMap;
  }

  plantSeed(x: number, y: number): Crop | null {
    const tile = this.tileMap.getTileAt(x, y);

    // Check if tile is tilled and farmable
    if (!tile || !tile.tilled || tile.type !== 'farmable') {
      return null;
    }

    // Check if crop already exists at this location
    const existing = this.getCropAt(x, y);
    if (existing) {
      return null;
    }

    // Create new crop
    const crop: Crop = {
      id: `crop_${this.nextCropId++}`,
      x,
      y,
      stage: 'seed',
      watered: false,
      wateredStages: [],
      stageStartTime: Date.now(),
      canProgress: false
    };

    this.crops.set(crop.id, crop);
    tile.hasCrop = true;

    return crop;
  }

  waterCrop(x: number, y: number): boolean {
    const crop = this.getCropAt(x, y);
    if (!crop) return false;

    crop.watered = true;

    // Track which stages have been watered
    if (!crop.wateredStages.includes(crop.stage)) {
      crop.wateredStages.push(crop.stage);
    }

    return true;
  }

  updateCrops(): void {
    const now = Date.now();
    const growthPeriod = this.config.crop_growth_base_time * 1000; // Convert to milliseconds

    this.crops.forEach(crop => {
      if (crop.stage === 'mature') return; // Already fully grown

      const timeSinceStageStart = now - crop.stageStartTime;
      const requiredStages: CropStage[] = ['seed', 'sprout2', 'sprout4'];
      const needsWater = requiredStages.includes(crop.stage);

      // Check if crop can progress
      let requiredTime: number;

      if (needsWater) {
        // Must be watered to progress
        if (!crop.watered) {
          return; // Cannot progress without water
        }
        // Watered: only need 1 growth period
        requiredTime = growthPeriod;
      } else {
        // Optional stages: faster if watered
        if (crop.watered) {
          requiredTime = growthPeriod; // 1 period if watered
        } else {
          requiredTime = growthPeriod * 2; // 2 periods if not watered
        }
      }

      // Check if enough time has passed
      if (timeSinceStageStart >= requiredTime) {
        this.advanceCropStage(crop);
      }
    });
  }

  private advanceCropStage(crop: Crop): void {
    const stageOrder: CropStage[] = ['seed', 'sprout', 'sprout2', 'sprout3', 'sprout4', 'mature'];
    const currentIndex = stageOrder.indexOf(crop.stage);

    if (currentIndex < stageOrder.length - 1) {
      crop.stage = stageOrder[currentIndex + 1];
      crop.stageStartTime = Date.now();
      crop.watered = false; // Reset watered status for new stage
    }
  }

  harvestCrop(x: number, y: number): boolean {
    const crop = this.getCropAt(x, y);
    if (!crop || crop.stage !== 'mature') {
      return false;
    }

    // Remove crop
    this.crops.delete(crop.id);

    // Update tile
    const tile = this.tileMap.getTileAt(x, y);
    if (tile) {
      tile.hasCrop = false;
    }

    return true;
  }

  destroyCrop(x: number, y: number): boolean {
    const crop = this.getCropAt(x, y);
    if (!crop) return false;

    this.crops.delete(crop.id);

    // Update tile
    const tile = this.tileMap.getTileAt(x, y);
    if (tile) {
      tile.hasCrop = false;
    }

    return true;
  }

  getCropAt(x: number, y: number): Crop | null {
    for (const crop of this.crops.values()) {
      if (crop.x === x && crop.y === y) {
        return crop;
      }
    }
    return null;
  }

  getCrop(id: string): Crop | undefined {
    return this.crops.get(id);
  }

  getAllCrops(): Crop[] {
    return Array.from(this.crops.values());
  }

  getMatureCrops(): Crop[] {
    return this.getAllCrops().filter(crop => crop.stage === 'mature');
  }

  getCropCount(): number {
    return this.crops.size;
  }
}
