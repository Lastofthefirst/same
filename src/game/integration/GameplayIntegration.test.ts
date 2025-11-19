import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameStateManager } from '../core/GameStateManager';

/**
 * AUTOMATED GAMEPLAY INTEGRATION TESTS
 * These tests simulate actual gameplay scenarios to ensure all game mechanics
 * work together correctly
 */

describe('Automated Gameplay Integration Tests', () => {
  describe('Complete Game Simulation: Balanced Difficulty', () => {
    it('should successfully play through a complete 2-player game', () => {
      const game = new GameStateManager('balanced', 2);
      game.startGame();

      // Add two players
      game.addPlayer('player1', 'Alice', 10, 10);
      game.addPlayer('player2', 'Bob', 11, 10);

      // Simulate 100 game ticks
      for (let tick = 0; tick < 100; tick++) {
        game.update();
      }

      const state = game.getState();
      expect(state.playerCount).toBe(2);
      expect(state.isGameOver).toBe(false);
    });

    it('should allow players to till, plant, water, and harvest crops', () => {
      const game = new GameStateManager('balanced', 2);
      const tileMap = game.getTileMap();

      // Find a farmable tile
      const farmableTile = tileMap.getMap().flat().find(t => t.type === 'farmable');
      expect(farmableTile).toBeDefined();

      const x = farmableTile!.x;
      const y = farmableTile!.y;

      // Add player at farmable location
      game.addPlayer('farmer', 'Farmer Joe', x, y);
      const player = game.getPlayerSystem().getPlayer('farmer')!;

      // 1. TILL SOIL
      player.role = 'tiller';
      const tilled = game.performAction('farmer');
      expect(tilled).toBe(true);
      expect(farmableTile!.tilled).toBe(true);

      // 2. PLANT SEED
      player.role = 'planter';
      const planted = game.performAction('farmer');
      expect(planted).toBe(true);
      expect(game.getCropSystem().getCropAt(x, y)).toBeDefined();

      // 3. WATER CROP
      player.role = 'waterer';
      game.performAction('farmer');
      const crop = game.getCropSystem().getCropAt(x, y)!;
      expect(crop.watered).toBe(true);

      // 4. WAIT FOR CROP TO MATURE
      vi.useFakeTimers();
      const growthTime = 15000; // 15 seconds per stage

      for (let stage = 0; stage < 5; stage++) {
        // Water all stages to ensure fast growth
        game.performAction('farmer');

        vi.advanceTimersByTime(growthTime + 100);
        game.getCropSystem().updateCrops();
      }

      const matureCrop = game.getCropSystem().getCropAt(x, y);
      expect(matureCrop?.stage).toBe('mature');

      // 5. HARVEST CROP
      player.role = 'harvester';
      const harvested = game.performAction('farmer');
      expect(harvested).toBe(true);
      expect(player.carrying?.type).toBe('crop');

      // 6. DEPOSIT AT WAGON
      const wagon = game.getWagon();
      player.x = wagon.x;
      player.y = wagon.y;
      const deposited = game.performAction('farmer');
      expect(deposited).toBe(true);
      expect(wagon.cropsStored).toBe(1);
      expect(game.getState().cropsHarvested).toBe(1);

      vi.useRealTimers();
    });
  });

  describe('Multi-Player Cooperative Gameplay', () => {
    it('should allow multiple players to work together efficiently', () => {
      const game = new GameStateManager('balanced', 4);
      const tileMap = game.getTileMap();

      // Get multiple farmable tiles
      const farmableTiles = tileMap.getMap().flat()
        .filter(t => t.type === 'farmable')
        .slice(0, 4);

      // Add 4 players with different starting positions
      game.addPlayer('tiller', 'Tiller', farmableTiles[0].x, farmableTiles[0].y);
      game.addPlayer('planter', 'Planter', farmableTiles[1].x, farmableTiles[1].y);
      game.addPlayer('waterer', 'Waterer', farmableTiles[2].x, farmableTiles[2].y);
      game.addPlayer('harvester', 'Harvester', farmableTiles[3].x, farmableTiles[3].y);

      // Set roles
      game.getPlayerSystem().changeRole('tiller', 'tiller');
      game.getPlayerSystem().changeRole('planter', 'planter');
      game.getPlayerSystem().changeRole('waterer', 'waterer');
      game.getPlayerSystem().changeRole('harvester', 'harvester');

      // Tiller tills multiple plots
      for (let i = 0; i < 3; i++) {
        const tile = farmableTiles[i];
        const tiller = game.getPlayerSystem().getPlayer('tiller')!;
        tiller.x = tile.x;
        tiller.y = tile.y;
        game.performAction('tiller');
        expect(tile.tilled).toBe(true);
      }

      // Planter plants seeds
      for (let i = 0; i < 3; i++) {
        const tile = farmableTiles[i];
        const planter = game.getPlayerSystem().getPlayer('planter')!;
        planter.x = tile.x;
        planter.y = tile.y;
        game.performAction('planter');
        expect(game.getCropSystem().getCropAt(tile.x, tile.y)).toBeDefined();
      }

      expect(game.getCropSystem().getCropCount()).toBe(3);
    });

    it('should handle encouragement mechanic between players', () => {
      const game = new GameStateManager('balanced', 2);

      game.addPlayer('player1', 'Alice', 10, 10);
      game.addPlayer('player2', 'Bob', 10, 10); // Same location

      const encouraged = game.getPlayerSystem().tryEncouragement('player1', 'player2');
      expect(encouraged).toBe(true);

      const player1 = game.getPlayerSystem().getPlayer('player1')!;
      const player2 = game.getPlayerSystem().getPlayer('player2')!;

      expect(player1.speedBoost).toBe(true);
      expect(player2.speedBoost).toBe(true);
    });
  });

  describe('Threat System Integration', () => {
    it('should spawn and manage weeds that affect crops', () => {
      const game = new GameStateManager('balanced', 2);
      const tileMap = game.getTileMap();

      const farmableTile = tileMap.getMap().flat().find(t => t.type === 'farmable')!;

      // Plant a crop
      farmableTile.tilled = true;
      game.getCropSystem().plantSeed(farmableTile.x, farmableTile.y);

      // Spawn weed at same location
      game.getWeedSystem().spawnWeed(farmableTile.x, farmableTile.y);

      // Crop should be destroyed
      expect(game.getCropSystem().getCropAt(farmableTile.x, farmableTile.y)).toBeNull();
      expect(farmableTile.hasWeed).toBe(true);
    });

    it('should allow weeder to remove weeds', () => {
      const game = new GameStateManager('balanced', 2);
      const tileMap = game.getTileMap();

      const farmableTile = tileMap.getMap().flat().find(t => t.type === 'farmable')!;

      // Spawn weed
      game.getWeedSystem().spawnWeed(farmableTile.x, farmableTile.y);

      // Add weeder
      game.addPlayer('weeder', 'Weedy', farmableTile.x, farmableTile.y);
      game.getPlayerSystem().changeRole('weeder', 'weeder');

      // Remove weed
      const removed = game.performAction('weeder');
      expect(removed).toBe(true);
      expect(farmableTile.hasWeed).toBe(false);
    });

    it('should spawn and move pests toward crops', () => {
      const game = new GameStateManager('balanced', 2);
      const tileMap = game.getTileMap();

      const farmableTile = tileMap.getMap().flat().find(t => t.type === 'farmable')!;

      // Plant and mature a crop
      farmableTile.tilled = true;
      game.getCropSystem().plantSeed(farmableTile.x, farmableTile.y);
      const crop = game.getCropSystem().getCropAt(farmableTile.x, farmableTile.y)!;
      crop.stage = 'mature';

      // Spawn pest far away
      game.getPestSystem().spawnPest(5, 5);

      // Update pest targets
      game.getPestSystem().findTargets([crop], game.getWagon());

      const pest = game.getPestSystem().getAllPests()[0];
      expect(pest.targetX).toBe(farmableTile.x);
      expect(pest.targetY).toBe(farmableTile.y);
    });

    it('should allow pest catcher to capture and remove pests', () => {
      const game = new GameStateManager('balanced', 2);

      // Spawn pest
      const pest = game.getPestSystem().spawnPest(10, 10)!;

      // Add pest catcher next to pest
      game.addPlayer('catcher', 'Catcher', 9, 10);
      const catcher = game.getPlayerSystem().getPlayer('catcher')!;
      catcher.role = 'pest_catcher';
      catcher.direction = 'right';

      // Pick up pest
      const pickedUp = game.performAction('catcher');
      expect(pickedUp).toBe(true);
      expect(catcher.carrying?.type).toBe('pest');

      // Move to dropoff
      const dropoffTile = game.getTileMap().getMap().flat().find(t => t.type === 'pest_dropoff')!;
      catcher.x = dropoffTile.x;
      catcher.y = dropoffTile.y;

      // Drop off pest
      const droppedOff = game.performAction('catcher');
      expect(droppedOff).toBe(true);
      expect(catcher.carrying).toBeNull();
      expect(game.getPestSystem().getAllPests().length).toBe(0);
    });
  });

  describe('Full Game Scenario: Farm to Finish', () => {
    it('should simulate a complete farming cycle with all mechanics', () => {
      vi.useFakeTimers();

      const game = new GameStateManager('balanced', 3);
      game.startGame();

      const tileMap = game.getTileMap();
      const farmableTiles = tileMap.getMap().flat()
        .filter(t => t.type === 'farmable')
        .slice(0, 5);

      // Add 3 players
      game.addPlayer('farmer1', 'Farmer 1', farmableTiles[0].x, farmableTiles[0].y);
      game.addPlayer('farmer2', 'Farmer 2', farmableTiles[1].x, farmableTiles[1].y);
      game.addPlayer('farmer3', 'Farmer 3', farmableTiles[2].x, farmableTiles[2].y);

      // PHASE 1: Till soil (all players as tillers)
      ['farmer1', 'farmer2', 'farmer3'].forEach((id, index) => {
        const player = game.getPlayerSystem().getPlayer(id)!;
        player.role = 'tiller';
        player.x = farmableTiles[index].x;
        player.y = farmableTiles[index].y;
        game.performAction(id);
      });

      // PHASE 2: Plant seeds (all players as planters)
      ['farmer1', 'farmer2', 'farmer3'].forEach((id, index) => {
        const player = game.getPlayerSystem().getPlayer(id)!;
        player.role = 'planter';
        game.performAction(id);
      });

      expect(game.getCropSystem().getCropCount()).toBe(3);

      // PHASE 3: Water and grow crops
      const growthTime = 15000;
      for (let cycle = 0; cycle < 6; cycle++) {
        // Water as needed
        ['farmer1', 'farmer2', 'farmer3'].forEach((id, index) => {
          const player = game.getPlayerSystem().getPlayer(id)!;
          player.role = 'waterer';
          player.x = farmableTiles[index].x;
          player.y = farmableTiles[index].y;
          game.performAction(id);
        });

        vi.advanceTimersByTime(growthTime);
        game.getCropSystem().updateCrops();
      }

      // All crops should be mature
      const matureCrops = game.getCropSystem().getMatureCrops();
      expect(matureCrops.length).toBeGreaterThan(0);

      // PHASE 4: Harvest crops
      let harvested = 0;
      ['farmer1', 'farmer2', 'farmer3'].forEach((id, index) => {
        const player = game.getPlayerSystem().getPlayer(id)!;
        player.role = 'harvester';
        player.x = farmableTiles[index].x;
        player.y = farmableTiles[index].y;

        if (game.performAction(id)) {
          // Move to wagon and deposit
          const wagon = game.getWagon();
          player.x = wagon.x;
          player.y = wagon.y;
          if (game.performAction(id)) {
            harvested++;
          }
        }
      });

      expect(harvested).toBeGreaterThan(0);
      expect(game.getState().cropsHarvested).toBeGreaterThan(0);
      expect(game.getWagon().cropsStored).toBe(harvested);

      vi.useRealTimers();
    });
  });

  describe('Game Mechanics Validation', () => {
    it('should respect crop growth timing rules', () => {
      vi.useFakeTimers();

      const game = new GameStateManager('balanced', 2);
      const tileMap = game.getTileMap();
      const tile = tileMap.getMap().flat().find(t => t.type === 'farmable')!;

      tile.tilled = true;
      game.getCropSystem().plantSeed(tile.x, tile.y);

      const crop = game.getCropSystem().getCropAt(tile.x, tile.y)!;
      expect(crop.stage).toBe('seed');

      // Shouldn't progress without water (seed requires water)
      vi.advanceTimersByTime(30000);
      game.getCropSystem().updateCrops();
      expect(crop.stage).toBe('seed');

      // Should progress with water
      game.getCropSystem().waterCrop(tile.x, tile.y);
      vi.advanceTimersByTime(15000);
      game.getCropSystem().updateCrops();
      expect(crop.stage).toBe('sprout');

      vi.useRealTimers();
    });

    it('should validate map scaling with player count', () => {
      const game2 = new GameStateManager('balanced', 2);
      const game4 = new GameStateManager('balanced', 4);
      const game6 = new GameStateManager('balanced', 6);

      const size2 = game2.getTileMap().getMapSize();
      const size4 = game4.getTileMap().getMapSize();
      const size6 = game6.getTileMap().getMapSize();

      expect(size2).toBeLessThan(size4);
      expect(size4).toBeLessThan(size6);
    });

    it('should maintain game state correctly', () => {
      vi.useFakeTimers();

      const game = new GameStateManager('balanced', 2);
      game.startGame();

      const initialState = game.getState();
      expect(initialState.cropsHarvested).toBe(0);
      expect(initialState.cropCount).toBe(0);
      expect(initialState.isGameOver).toBe(false);

      // Advance time and run updates
      vi.advanceTimersByTime(1000);

      for (let i = 0; i < 50; i++) {
        game.update();
      }

      const updatedState = game.getState();
      expect(updatedState.gameTime).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });
});
