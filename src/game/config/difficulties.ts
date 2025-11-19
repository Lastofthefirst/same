import { GameConfig, DifficultyLevel } from './types';

/**
 * Difficulty configurations based on project requirements
 */

export const BALANCED_CONFIG: GameConfig = {
  base_map_size: 25,
  map_increment_per_player: 6.3,
  tile_distribution: {
    farmable: 60,
    obstacles: 10,
    roles: 10,
    pest_drop: 5,
    paths: 15
  },
  crop_growth_base_time: 15,
  watering_speed_multiplier: 2,
  water_requirement_frequency: 2,
  weed_spread_interval: 20,
  weed_reversion_time: 60,
  pest_spawn_rate: 1.0,
  initial_weed_count: 17,
  initial_pest_count: 13,
  pest_movement_speed: 0.3,
  crop_thresholds_base: 42,
  difficulty_increase_per_threshold: 63,
  upgrade_thresholds_base: 83,
  upgrade_efficiency_gain: 25,
  scaling_factor: 0.25,
  scaling_methods: {
    threats: 'linear',
    upgrades: 'diminishing_log'
  },
  tilling_speed_multiplier: 0.8,
  encouragement_boost: 1.5,
  encouragement_duration: 10,
  encouragement_cooldown: 10,
  wagon_movement_speed: 0.5
};

export const CHALLENGING_CONFIG: GameConfig = {
  base_map_size: 34,
  map_increment_per_player: 5.1,
  tile_distribution: {
    farmable: 50,
    obstacles: 20,
    roles: 15,
    pest_drop: 5,
    paths: 10
  },
  crop_growth_base_time: 10,
  watering_speed_multiplier: 2,
  water_requirement_frequency: 1,
  weed_spread_interval: 15,
  weed_reversion_time: 45,
  pest_spawn_rate: 1.5,
  initial_weed_count: 26,
  initial_pest_count: 21,
  pest_movement_speed: 0.4,
  crop_thresholds_base: 34,
  difficulty_increase_per_threshold: 106,
  upgrade_thresholds_base: 64,
  upgrade_efficiency_gain: 40,
  scaling_factor: 0.3,
  scaling_methods: {
    threats: 'linear',
    upgrades: 'diminishing_sqrt'
  },
  tilling_speed_multiplier: 0.8,
  encouragement_boost: 1.5,
  encouragement_duration: 10,
  encouragement_cooldown: 10,
  wagon_movement_speed: 0.5
};

export const EXPERT_CONFIG: GameConfig = {
  base_map_size: 42,
  map_increment_per_player: 3.4,
  tile_distribution: {
    farmable: 60,
    obstacles: 15,
    roles: 8,
    pest_drop: 7,
    paths: 10
  },
  crop_growth_base_time: 12,
  watering_speed_multiplier: 2,
  water_requirement_frequency: 3,
  weed_spread_interval: 12,
  weed_reversion_time: 40,
  pest_spawn_rate: 1.2,
  initial_weed_count: 34,
  initial_pest_count: 25,
  pest_movement_speed: 0.5,
  crop_thresholds_base: 50,
  difficulty_increase_per_threshold: 84,
  upgrade_thresholds_base: 105,
  upgrade_efficiency_gain: 50,
  scaling_factor: 0.25,
  scaling_methods: {
    threats: 'exponential_0.7',
    upgrades: 'diminishing_exp_0.7'
  },
  tilling_speed_multiplier: 0.8,
  encouragement_boost: 1.5,
  encouragement_duration: 10,
  encouragement_cooldown: 10,
  wagon_movement_speed: 0.5
};

export function getConfigForDifficulty(difficulty: DifficultyLevel): GameConfig {
  switch (difficulty) {
    case 'balanced':
      return BALANCED_CONFIG;
    case 'challenging':
      return CHALLENGING_CONFIG;
    case 'expert':
      return EXPERT_CONFIG;
  }
}

/**
 * Scaling functions for player count
 */
export function calculateMapSize(config: GameConfig, playerCount: number): number {
  return Math.floor(config.base_map_size + (playerCount * config.map_increment_per_player));
}

export function calculatePlayerMultiplier(config: GameConfig, playerCount: number): number {
  return 1 + (playerCount - 2) * config.scaling_factor;
}

export function scaleInitialWeeds(config: GameConfig, playerCount: number): number {
  const multiplier = calculatePlayerMultiplier(config, playerCount);
  return Math.floor(config.initial_weed_count * multiplier);
}

export function scaleInitialPests(config: GameConfig, playerCount: number): number {
  const multiplier = calculatePlayerMultiplier(config, playerCount);
  return Math.floor(config.initial_pest_count * multiplier);
}

export function scaleCropThreshold(config: GameConfig, playerCount: number): number {
  return Math.floor(config.crop_thresholds_base * playerCount);
}
