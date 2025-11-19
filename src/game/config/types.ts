/**
 * Game configuration types
 */

export type Role = 'tiller' | 'planter' | 'waterer' | 'harvester' | 'weeder' | 'pest_catcher';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type TileType =
  | 'farmable'
  | 'obstacle'
  | 'role_station'
  | 'wagon'
  | 'exit'
  | 'pest_dropoff'
  | 'wagon_path';

export type CropStage = 'seed' | 'sprout' | 'sprout2' | 'sprout3' | 'sprout4' | 'mature';

export type PestType = 'squirrel' | 'rabbit';

export type DifficultyLevel = 'balanced' | 'challenging' | 'expert';

export interface TileDistribution {
  farmable: number;
  obstacles: number;
  roles: number;
  pest_drop: number;
  paths: number;
}

export interface ScalingMethods {
  threats: string;
  upgrades: string;
}

export interface GameConfig {
  base_map_size: number;
  map_increment_per_player: number;
  tile_distribution: TileDistribution;
  crop_growth_base_time: number;
  watering_speed_multiplier: number;
  water_requirement_frequency: number;
  weed_spread_interval: number;
  weed_reversion_time: number;
  pest_spawn_rate: number;
  initial_weed_count: number;
  initial_pest_count: number;
  pest_movement_speed: number;
  crop_thresholds_base: number;
  difficulty_increase_per_threshold: number;
  upgrade_thresholds_base: number;
  upgrade_efficiency_gain: number;
  scaling_factor: number;
  scaling_methods: ScalingMethods;

  // Player mechanics
  tilling_speed_multiplier: number;
  encouragement_boost: number;
  encouragement_duration: number;
  encouragement_cooldown: number;
  wagon_movement_speed: number;
}

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  roleType?: Role;
  tilled: boolean;
  watered: boolean;
  hasWeed: boolean;
  hasCrop: boolean;
  hasPest: boolean;
  hasPlayer: boolean;
  wagonPart: boolean;
}

export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  role: Role;
  direction: Direction;
  carrying: { type: 'crop' | 'pest'; id: string } | null;
  speedBoost: boolean;
  speedBoostEndTime: number;
  lastEncouragementTime: number;
  isGrabbingWagon: boolean;
}

export interface Crop {
  id: string;
  x: number;
  y: number;
  stage: CropStage;
  watered: boolean;
  wateredStages: CropStage[];
  stageStartTime: number;
  canProgress: boolean;
}

export interface Pest {
  id: string;
  x: number;
  y: number;
  type: PestType;
  targetX: number | null;
  targetY: number | null;
  carrying: boolean;
  lastMoveTime: number;
}

export interface Weed {
  id: string;
  x: number;
  y: number;
  spawnTime: number;
}

export interface Wagon {
  x: number;
  y: number;
  cropsStored: number;
  playersGrabbing: string[];
  pathTiles: { x: number; y: number }[];
}

export interface GameState {
  playerCount: number;
  difficulty: DifficultyLevel;
  config: GameConfig;
  mapSize: number;
  tiles: Tile[][];
  players: Map<string, Player>;
  crops: Map<string, Crop>;
  pests: Map<string, Pest>;
  weeds: Map<string, Weed>;
  wagon: Wagon;
  gameTime: number;
  cropsHarvested: number;
  gameStartTime: number;
  isPaused: boolean;
  pauseRequester: string | null;
  isGameOver: boolean;
}
