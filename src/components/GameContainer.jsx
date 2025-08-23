import { createSignal, onMount, onCleanup } from 'solid-js';
import Phaser from 'phaser';
import GameScene from '../game/GameScene';

export default function GameContainer(props) {
  const [game, setGame] = createSignal(null);
  let gameContainer;

  onMount(() => {
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameContainer,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      scene: [GameScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    const gameInstance = new Phaser.Game(config);
    setGame(gameInstance);

    // Pass network manager to the game scene
    if (props.networkManager && gameInstance.scene.scenes[0]) {
      gameInstance.scene.scenes[0].setNetworkManager(props.networkManager);
    }
  });

  onCleanup(() => {
    const gameInstance = game();
    if (gameInstance) {
      gameInstance.destroy(true);
    }
  });

  return (
    <div 
      ref={gameContainer} 
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        'justify-content': 'center',
        'align-items': 'center'
      }}
    />
  );
}