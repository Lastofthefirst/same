# Asset Integration Guide for Same Mouth Farming Game

## Overview
Same Mouth is designed to work with emoji placeholders initially, but supports full asset replacement for a polished gaming experience. This guide explains how to add visual assets to the game.

## Current Placeholder System
The game currently uses emoji sprites for all visual elements:
- **Players**: 🧑‍🌾 👨‍🌾 👩‍🌾 (farmer emojis)
- **Tiles**: 🟫 (dirt), 🌿 (grass), 🪨 (rocks), 🌳 (trees)
- **Crops**: 🌱 (seedling), 🌾 (growing), 🌽 (mature corn)
- **Special**: 🚛 (wagon)

## Asset Requirements

### Sprite Dimensions
- **Tile Size**: 32x32 pixels
- **Player Sprites**: 32x32 pixels (with animations)
- **UI Elements**: Variable sizes (specify in config)

### File Formats
- **Preferred**: PNG with transparency
- **Supported**: PNG, JPG, WebP
- **Animations**: Sprite sheets or individual frames

## Adding Assets

### 1. Asset Structure
Create the following folder structure in your project:

```
shared/src/assets/
├── sprites/
│   ├── players/
│   │   ├── farmer-1.png
│   │   ├── farmer-2.png
│   │   └── farmer-3.png
│   ├── tiles/
│   │   ├── dirt.png
│   │   ├── grass.png
│   │   ├── rock.png
│   │   └── tree.png
│   ├── crops/
│   │   ├── seedling.png
│   │   ├── growing.png
│   │   └── mature-corn.png
│   └── objects/
│       └── wagon.png
├── ui/
│   ├── button-bg.png
│   └── panel-bg.png
└── sounds/
    ├── plant.mp3
    ├── water.mp3
    └── harvest.mp3
```

### 2. Update GameView Component

Replace emoji loading in the `preloadGame` function:

```javascript
function preloadGame() {
  try {
    // Load player sprites
    this.load.image('player-1', '/src/assets/sprites/players/farmer-1.png');
    this.load.image('player-2', '/src/assets/sprites/players/farmer-2.png');
    this.load.image('player-3', '/src/assets/sprites/players/farmer-3.png');
    
    // Load tile sprites
    this.load.image('dirt', '/src/assets/sprites/tiles/dirt.png');
    this.load.image('grass', '/src/assets/sprites/tiles/grass.png');
    this.load.image('rock', '/src/assets/sprites/tiles/rock.png');
    this.load.image('tree', '/src/assets/sprites/tiles/tree.png');
    
    // Load crop sprites
    this.load.image('seedling', '/src/assets/sprites/crops/seedling.png');
    this.load.image('growing', '/src/assets/sprites/crops/growing.png');
    this.load.image('mature-corn', '/src/assets/sprites/crops/mature-corn.png');
    
    // Load object sprites
    this.load.image('wagon', '/src/assets/sprites/objects/wagon.png');
    
    // Load UI assets
    this.load.image('button-bg', '/src/assets/ui/button-bg.png');
    this.load.image('panel-bg', '/src/assets/ui/panel-bg.png');
    
    // Load sounds
    this.load.audio('plant-sound', '/src/assets/sounds/plant.mp3');
    this.load.audio('water-sound', '/src/assets/sounds/water.mp3');
    this.load.audio('harvest-sound', '/src/assets/sounds/harvest.mp3');
    
    console.log('[GAME] Assets loaded');
  } catch (error) {
    console.error('[GAME] Error loading assets:', error);
    // Fallback to emoji system
    this.useEmojiMode = true;
  }
}
```

### 3. Update Sprite Creation

Modify the tile and player creation to use assets:

```javascript
// In createFarmMap function, replace:
const tile = this.add.text(tileX + TILE_SIZE/2, tileY + TILE_SIZE/2, tileEmoji, {
  fontSize: '24px',
  align: 'center'
}).setOrigin(0.5, 0.5);

// With:
const spriteKey = this.useEmojiMode ? null : getSpriteKeyForTile(tileType);
const tile = spriteKey 
  ? this.add.sprite(tileX + TILE_SIZE/2, tileY + TILE_SIZE/2, spriteKey)
  : this.add.text(tileX + TILE_SIZE/2, tileY + TILE_SIZE/2, tileEmoji, {
      fontSize: '24px',
      align: 'center'
    });
tile.setOrigin(0.5, 0.5);
```

### 4. Sprite Key Mapping

Add helper functions for asset management:

```javascript
function getSpriteKeyForTile(tileType) {
  const spriteMap = {
    'dirt': 'dirt',
    'grass': 'grass', 
    'rock': 'rock',
    'tree': 'tree',
    'wagon': 'wagon'
  };
  return spriteMap[tileType] || 'dirt';
}

function getSpriteKeyForCrop(crop, growth) {
  if (!crop) return null;
  
  const cropSprites = {
    'corn': {
      1: 'seedling',
      2: 'growing', 
      3: 'mature-corn'
    }
  };
  
  return cropSprites[crop]?.[growth] || 'seedling';
}

function getPlayerSprite(playerIndex) {
  const playerSprites = ['player-1', 'player-2', 'player-3'];
  return playerSprites[playerIndex % playerSprites.length];
}
```

### 5. Animation System (Optional)

For animated sprites, create animation configurations:

```javascript
function createAnimations() {
  // Player walking animation
  this.anims.create({
    key: 'player-walk',
    frames: this.anims.generateFrameNumbers('player-sheet', { start: 0, end: 3 }),
    frameRate: 8,
    repeat: -1
  });
  
  // Crop growing animation
  this.anims.create({
    key: 'crop-grow',
    frames: ['seedling', 'growing', 'mature-corn'],
    frameRate: 2,
    repeat: 0
  });
}
```

### 6. Sound Integration

Add sound effects to farming actions:

```javascript
// In performFarmingAction function, add:
if (!this.useEmojiMode && this.sound) {
  switch (action) {
    case 'plant':
      this.sound.play('plant-sound', { volume: 0.5 });
      break;
    case 'water':
      this.sound.play('water-sound', { volume: 0.5 });
      break;
    case 'harvest':
      this.sound.play('harvest-sound', { volume: 0.5 });
      break;
  }
}
```

## Asset Guidelines

### Visual Style
- **Pixel Art**: 32x32 tiles work well with pixel art style
- **Consistent Style**: All assets should match in art style and color palette
- **Color Palette**: Earth tones (browns, greens) for farming theme
- **Readability**: Ensure sprites are clear at small sizes

### Performance
- **Optimize File Sizes**: Compress images without losing quality
- **Atlas Usage**: Consider using texture atlases for better performance
- **Lazy Loading**: Load assets as needed for better startup time

### Accessibility
- **Color Blind Friendly**: Ensure good contrast and avoid relying solely on color
- **Clear Shapes**: Distinctive silhouettes for different objects
- **Fallback Text**: Keep emoji fallbacks for accessibility

## Testing Assets

1. **Place assets** in the correct folder structure
2. **Update sprite keys** in the code
3. **Test in both Tauri and PWA** environments
4. **Verify fallback** to emoji mode if assets fail to load
5. **Check performance** on different devices

## Future Enhancements

- **Seasonal variations** for tiles and crops
- **Weather effects** (rain, sun animations)
- **Character customization** with different farmer avatars
- **Particle effects** for actions (dust when planting, sparkles when harvesting)
- **Background music** and ambient farm sounds

## Example Asset Pack Structure

A complete asset pack would include:
- 50+ tile variations
- 10+ crop types with growth stages  
- 5+ player character variations
- UI elements and buttons
- Sound effects and music
- Particle effect sprites

The game is designed to gracefully degrade to emoji mode if any assets are missing, ensuring it always remains playable.