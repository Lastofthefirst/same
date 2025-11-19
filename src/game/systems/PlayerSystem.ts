import { Player, Direction, Role } from '../config/types';
import { TileMapGenerator } from '../core/TileMap';

export class PlayerSystem {
  private players: Map<string, Player> = new Map();
  private tileMap: TileMapGenerator;
  private encouragementCooldowns: Map<string, number> = new Map();

  constructor(tileMap: TileMapGenerator) {
    this.tileMap = tileMap;
  }

  createPlayer(id: string, name: string, x: number, y: number): Player {
    const player: Player = {
      id,
      name,
      x,
      y,
      role: 'tiller',
      direction: 'down',
      carrying: null,
      speedBoost: false,
      speedBoostEndTime: 0,
      lastEncouragementTime: 0,
      isGrabbingWagon: false
    };

    this.players.set(id, player);
    return player;
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  movePlayer(playerId: string, direction: Direction): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    // Update direction
    player.direction = direction;

    // Calculate new position
    let newX = player.x;
    let newY = player.y;

    switch (direction) {
      case 'up':
        newY--;
        break;
      case 'down':
        newY++;
        break;
      case 'left':
        newX--;
        break;
      case 'right':
        newX++;
        break;
    }

    // Check if new position is passable
    if (!this.tileMap.isPassable(newX, newY)) {
      return false;
    }

    // Check bounds
    const mapSize = this.tileMap.getMapSize();
    if (newX < 0 || newX >= mapSize || newY < 0 || newY >= mapSize) {
      return false;
    }

    // Move player
    player.x = newX;
    player.y = newY;

    return true;
  }

  changeRole(playerId: string, newRole: Role): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    // Clear carrying if switching away from harvester or pest_catcher
    if ((player.role === 'harvester' || player.role === 'pest_catcher') && player.carrying) {
      player.carrying = null;
    }

    player.role = newRole;
    return true;
  }

  tryEncouragement(playerId1: string, playerId2: string): boolean {
    const player1 = this.players.get(playerId1);
    const player2 = this.players.get(playerId2);

    if (!player1 || !player2) return false;

    // Check if players are adjacent
    const dx = Math.abs(player1.x - player2.x);
    const dy = Math.abs(player1.y - player2.y);
    const isAdjacent = (dx === 0 && dy === 0) || (dx <= 1 && dy <= 1 && dx + dy <= 1);

    if (!isAdjacent) return false;

    // Check cooldowns
    const now = Date.now();
    const cooldown1 = this.encouragementCooldowns.get(playerId1) || 0;
    const cooldown2 = this.encouragementCooldowns.get(playerId2) || 0;

    if (now < cooldown1 || now < cooldown2) return false;

    // Apply speed boost
    const duration = 10000; // 10 seconds
    const endTime = now + duration;

    player1.speedBoost = true;
    player1.speedBoostEndTime = endTime;
    player1.lastEncouragementTime = now;

    player2.speedBoost = true;
    player2.speedBoostEndTime = endTime;
    player2.lastEncouragementTime = now;

    // Set cooldowns
    const cooldownTime = now + 10000; // 10 seconds
    this.encouragementCooldowns.set(playerId1, cooldownTime);
    this.encouragementCooldowns.set(playerId2, cooldownTime);

    return true;
  }

  updateSpeedBoosts(): void {
    const now = Date.now();

    this.players.forEach(player => {
      if (player.speedBoost && now >= player.speedBoostEndTime) {
        player.speedBoost = false;
      }
    });
  }

  pickUp(playerId: string, type: 'crop' | 'pest', itemId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    // Check if already carrying something
    if (player.carrying !== null) return false;

    // Check role permissions
    if (type === 'crop' && player.role !== 'harvester') return false;
    if (type === 'pest' && player.role !== 'pest_catcher') return false;

    player.carrying = { type, id: itemId };
    return true;
  }

  drop(playerId: string): { type: 'crop' | 'pest'; id: string } | null {
    const player = this.players.get(playerId);
    if (!player || !player.carrying) return null;

    const carried = player.carrying;
    player.carrying = null;
    return carried;
  }

  grabWagon(playerId: string, isGrabbing: boolean): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    player.isGrabbingWagon = isGrabbing;
    return true;
  }

  removePlayer(playerId: string): boolean {
    return this.players.delete(playerId);
  }

  getPlayerCount(): number {
    return this.players.size;
  }
}
