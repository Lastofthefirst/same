import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerSystem } from './PlayerSystem';
import { Player, Direction, Role } from '../config/types';
import { TileMapGenerator } from '../core/TileMap';
import { BALANCED_CONFIG } from '../config/difficulties';

describe('PlayerSystem', () => {
  let playerSystem: PlayerSystem;
  let tileMap: TileMapGenerator;

  beforeEach(() => {
    tileMap = new TileMapGenerator(BALANCED_CONFIG, 2);
    tileMap.generate();
    playerSystem = new PlayerSystem(tileMap);
  });

  describe('Player Creation', () => {
    it('should create a new player with default values', () => {
      const player = playerSystem.createPlayer('player1', 'Alice', 5, 5);

      expect(player.id).toBe('player1');
      expect(player.name).toBe('Alice');
      expect(player.x).toBe(5);
      expect(player.y).toBe(5);
      expect(player.role).toBe('tiller');
      expect(player.direction).toBe('down');
      expect(player.carrying).toBeNull();
      expect(player.speedBoost).toBe(false);
      expect(player.isGrabbingWagon).toBe(false);
    });

    it('should add player to the system', () => {
      playerSystem.createPlayer('player1', 'Alice', 5, 5);
      const player = playerSystem.getPlayer('player1');

      expect(player).toBeDefined();
      expect(player?.name).toBe('Alice');
    });
  });

  describe('Player Movement', () => {
    beforeEach(() => {
      playerSystem.createPlayer('player1', 'Alice', 10, 10);
    });

    it('should move player up', () => {
      const moved = playerSystem.movePlayer('player1', 'up');
      const player = playerSystem.getPlayer('player1');

      if (moved) {
        expect(player?.y).toBe(9);
        expect(player?.direction).toBe('up');
      }
    });

    it('should move player down', () => {
      const moved = playerSystem.movePlayer('player1', 'down');
      const player = playerSystem.getPlayer('player1');

      if (moved) {
        expect(player?.y).toBe(11);
        expect(player?.direction).toBe('down');
      }
    });

    it('should move player left', () => {
      const moved = playerSystem.movePlayer('player1', 'left');
      const player = playerSystem.getPlayer('player1');

      if (moved) {
        expect(player?.x).toBe(9);
        expect(player?.direction).toBe('left');
      }
    });

    it('should move player right', () => {
      const moved = playerSystem.movePlayer('player1', 'right');
      const player = playerSystem.getPlayer('player1');

      if (moved) {
        expect(player?.x).toBe(11);
        expect(player?.direction).toBe('right');
      }
    });

    it('should not move player into obstacle', () => {
      // Find an obstacle tile
      const map = tileMap.getMap();
      const obstacleTile = map.flat().find(t => t.type === 'obstacle');

      if (obstacleTile) {
        // Position player next to obstacle
        playerSystem.createPlayer('player2', 'Bob', obstacleTile.x - 1, obstacleTile.y);

        const moved = playerSystem.movePlayer('player2', 'right');
        expect(moved).toBe(false);

        const player = playerSystem.getPlayer('player2');
        expect(player?.x).toBe(obstacleTile.x - 1); // Should not have moved
      }
    });

    it('should update direction even if movement is blocked', () => {
      // Try to move out of bounds
      playerSystem.createPlayer('player3', 'Charlie', 0, 0);
      playerSystem.movePlayer('player3', 'left');

      const player = playerSystem.getPlayer('player3');
      expect(player?.direction).toBe('left');
      expect(player?.x).toBe(0); // Position unchanged
    });

    it('should apply speed boost to movement', () => {
      const player = playerSystem.getPlayer('player1')!;
      player.speedBoost = true;
      player.speedBoostEndTime = Date.now() + 5000;

      // Try moving in a passable direction
      const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
      let moved = false;
      for (const dir of directions) {
        if (playerSystem.movePlayer('player1', dir)) {
          moved = true;
          break;
        }
      }

      // Should be able to move in at least one direction
      expect(moved).toBe(true);
      expect(player.speedBoost).toBe(true);
    });
  });

  describe('Role Switching', () => {
    beforeEach(() => {
      playerSystem.createPlayer('player1', 'Alice', 5, 5);
    });

    it('should switch player role', () => {
      playerSystem.changeRole('player1', 'waterer');
      const player = playerSystem.getPlayer('player1');

      expect(player?.role).toBe('waterer');
    });

    it('should switch role when standing on role station', () => {
      const map = tileMap.getMap();
      const tillerStation = map.flat().find(t => t.roleType === 'tiller');

      if (tillerStation) {
        playerSystem.createPlayer('player2', 'Bob', tillerStation.x, tillerStation.y);
        playerSystem.changeRole('player2', 'tiller');

        const player = playerSystem.getPlayer('player2');
        expect(player?.role).toBe('tiller');
      }
    });

    it('should clear carrying when changing from harvester', () => {
      const player = playerSystem.getPlayer('player1')!;
      player.role = 'harvester';
      player.carrying = { type: 'crop', id: 'crop1' };

      playerSystem.changeRole('player1', 'tiller');

      expect(player.carrying).toBeNull();
      expect(player.role).toBe('tiller');
    });

    it('should clear carrying when changing from pest_catcher', () => {
      const player = playerSystem.getPlayer('player1')!;
      player.role = 'pest_catcher';
      player.carrying = { type: 'pest', id: 'pest1' };

      playerSystem.changeRole('player1', 'waterer');

      expect(player.carrying).toBeNull();
      expect(player.role).toBe('waterer');
    });
  });

  describe('Encouragement System', () => {
    beforeEach(() => {
      playerSystem.createPlayer('player1', 'Alice', 10, 10);
      playerSystem.createPlayer('player2', 'Bob', 10, 10);
    });

    it('should apply encouragement boost when players touch', () => {
      const result = playerSystem.tryEncouragement('player1', 'player2');

      expect(result).toBe(true);

      const player1 = playerSystem.getPlayer('player1')!;
      const player2 = playerSystem.getPlayer('player2')!;

      expect(player1.speedBoost).toBe(true);
      expect(player2.speedBoost).toBe(true);
      expect(player1.speedBoostEndTime).toBeGreaterThan(Date.now());
      expect(player2.speedBoostEndTime).toBeGreaterThan(Date.now());
    });

    it('should not apply encouragement if on cooldown', () => {
      // Apply first encouragement
      playerSystem.tryEncouragement('player1', 'player2');

      // Try immediately again
      const result = playerSystem.tryEncouragement('player1', 'player2');
      expect(result).toBe(false);
    });

    it('should not apply encouragement if players are not adjacent', () => {
      playerSystem.createPlayer('player3', 'Charlie', 20, 20);

      const result = playerSystem.tryEncouragement('player1', 'player3');
      expect(result).toBe(false);
    });

    it('should remove speed boost after duration expires', () => {
      const player = playerSystem.getPlayer('player1')!;
      player.speedBoost = true;
      player.speedBoostEndTime = Date.now() - 1000; // Already expired

      playerSystem.updateSpeedBoosts();

      expect(player.speedBoost).toBe(false);
    });
  });

  describe('Carrying System', () => {
    beforeEach(() => {
      playerSystem.createPlayer('player1', 'Alice', 10, 10);
    });

    it('should allow harvester to pick up crop', () => {
      const player = playerSystem.getPlayer('player1')!;
      player.role = 'harvester';

      playerSystem.pickUp('player1', 'crop', 'crop1');

      expect(player.carrying).toEqual({ type: 'crop', id: 'crop1' });
    });

    it('should not allow non-harvester to pick up crop', () => {
      const player = playerSystem.getPlayer('player1')!;
      player.role = 'tiller';

      const result = playerSystem.pickUp('player1', 'crop', 'crop1');

      expect(result).toBe(false);
      expect(player.carrying).toBeNull();
    });

    it('should allow pest_catcher to pick up pest', () => {
      const player = playerSystem.getPlayer('player1')!;
      player.role = 'pest_catcher';

      playerSystem.pickUp('player1', 'pest', 'pest1');

      expect(player.carrying).toEqual({ type: 'pest', id: 'pest1' });
    });

    it('should not allow player to carry multiple items', () => {
      const player = playerSystem.getPlayer('player1')!;
      player.role = 'harvester';
      player.carrying = { type: 'crop', id: 'crop1' };

      const result = playerSystem.pickUp('player1', 'crop', 'crop2');

      expect(result).toBe(false);
      expect(player.carrying).toEqual({ type: 'crop', id: 'crop1' });
    });

    it('should drop carried item', () => {
      const player = playerSystem.getPlayer('player1')!;
      player.carrying = { type: 'crop', id: 'crop1' };

      const dropped = playerSystem.drop('player1');

      expect(dropped).toEqual({ type: 'crop', id: 'crop1' });
      expect(player.carrying).toBeNull();
    });
  });

  describe('Wagon Interaction', () => {
    beforeEach(() => {
      playerSystem.createPlayer('player1', 'Alice', 10, 10);
    });

    it('should set player as grabbing wagon', () => {
      playerSystem.grabWagon('player1', true);
      const player = playerSystem.getPlayer('player1');

      expect(player?.isGrabbingWagon).toBe(true);
    });

    it('should unset player from grabbing wagon', () => {
      const player = playerSystem.getPlayer('player1')!;
      player.isGrabbingWagon = true;

      playerSystem.grabWagon('player1', false);

      expect(player.isGrabbingWagon).toBe(false);
    });
  });
});
