import { For } from 'solid-js';

interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: string;
  role: string;
}

interface GameState {
  players: Record<string, Player>;
  room_code: string;
}

interface LobbyProps {
  gameState: GameState;
  roomCode: string;
  isHost: boolean;
  onStartGame: () => void;
  onBackToMenu: () => void;
}

function Lobby(props: LobbyProps) {
  const playersList = () => Object.values(props.gameState.players);

  return (
    <div class="lobby-container">
      <h1>🌾 Game Lobby 🌾</h1>
      
      <div class="room-info">
        <h2>Room Code: {props.roomCode}</h2>
        <p>Share this code with friends to join!</p>
      </div>

      <div class="player-list">
        <h3>Players ({playersList().length})</h3>
        <For each={playersList()}>
          {(player) => (
            <div class="player-item">
              👤 {player.name} {player.role && `(${player.role})`}
            </div>
          )}
        </For>
        {playersList().length === 0 && (
          <p>Waiting for players to join...</p>
        )}
      </div>

      <div class="menu-buttons">
        {props.isHost && (
          <button 
            class="menu-button" 
            onClick={props.onStartGame}
            disabled={playersList().length < 1}
          >
            🚀 Start Game
          </button>
        )}
        
        {!props.isHost && (
          <p>Waiting for host to start the game...</p>
        )}
        
        <button class="menu-button" onClick={props.onBackToMenu}>
          ← Back to Menu
        </button>
      </div>

      <div style="margin-top: 2rem; opacity: 0.7;">
        <p>💡 Tips:</p>
        <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
          <li>Work together to grow and harvest crops</li>
          <li>Switch roles at designated stations</li>
          <li>Watch out for pests and weeds!</li>
          <li>Pull the wagon to safety when ready</li>
        </ul>
      </div>
    </div>
  );
}

export default Lobby;