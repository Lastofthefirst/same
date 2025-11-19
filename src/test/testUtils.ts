import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

export { describe, it, expect, beforeEach, afterEach, vi };

/**
 * Helper to create a mock game state for testing
 */
export function createMockGameState(overrides = {}) {
  return {
    playerCount: 2,
    difficulty: 'balanced',
    players: [],
    tiles: [],
    crops: [],
    pests: [],
    weeds: [],
    wagon: null,
    gameTime: 0,
    cropsHarvested: 0,
    ...overrides
  };
}

/**
 * Helper to simulate game time progression
 */
export function advanceGameTime(state: any, seconds: number) {
  state.gameTime += seconds * 1000;
}

/**
 * Helper to create a mock tile
 */
export function createMockTile(x: number, y: number, type: string, overrides = {}) {
  return {
    x,
    y,
    type,
    isEmpty: true,
    tilled: false,
    watered: false,
    hasWeed: false,
    hasCrop: false,
    hasPest: false,
    hasPlayer: false,
    ...overrides
  };
}

/**
 * Helper to create a mock player
 */
export function createMockPlayer(id: string, x: number, y: number, overrides = {}) {
  return {
    id,
    x,
    y,
    role: 'tiller',
    direction: 'down',
    carrying: null,
    speedBoost: false,
    speedBoostEndTime: 0,
    ...overrides
  };
}

/**
 * Helper to create a mock crop
 */
export function createMockCrop(x: number, y: number, stage: string, overrides = {}) {
  return {
    x,
    y,
    stage,
    watered: false,
    lastWateredStage: null,
    growthStartTime: Date.now(),
    ...overrides
  };
}

/**
 * Helper to create a mock pest
 */
export function createMockPest(id: string, x: number, y: number, overrides = {}) {
  return {
    id,
    x,
    y,
    type: 'squirrel',
    targetX: null,
    targetY: null,
    carrying: false,
    ...overrides
  };
}
