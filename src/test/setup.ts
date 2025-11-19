import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Phaser for unit tests
globalThis.Phaser = {
  Game: vi.fn(),
  Scene: class Scene {},
  GameObjects: {
    Container: class Container {},
    Sprite: class Sprite {},
    Text: class Text {},
    Graphics: class Graphics {}
  },
  Physics: {
    Arcade: {
      Sprite: class ArcadeSprite {}
    }
  },
  Math: {
    Between: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
  }
} as any;
