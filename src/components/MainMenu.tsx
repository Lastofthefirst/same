import { createSignal } from 'solid-js';

interface MainMenuProps {
  onHostGame: (name: string) => void;
  onJoinGame: (name: string, code: string) => void;
}

function MainMenu(props: MainMenuProps) {
  const [showHostForm, setShowHostForm] = createSignal(false);
  const [showJoinForm, setShowJoinForm] = createSignal(false);
  const [playerName, setPlayerName] = createSignal('');
  const [roomCode, setRoomCode] = createSignal('');

  const handleHostGame = () => {
    if (playerName().trim()) {
      props.onHostGame(playerName());
    }
  };

  const handleJoinGame = () => {
    if (playerName().trim() && roomCode().trim()) {
      props.onJoinGame(playerName(), roomCode());
    }
  };

  return (
    <div class="main-menu">
      <h1 class="game-title">🚜 Same Mouth 🌾</h1>
      <p style="margin-bottom: 2rem; text-align: center; max-width: 500px;">
        Cooperative farming game where players work together to grow and harvest crops
        before being overwhelmed by pests and weeds!
      </p>

      {!showHostForm() && !showJoinForm() && (
        <div class="menu-buttons">
          <button class="menu-button" onClick={() => setShowHostForm(true)}>
            🏠 Host Game
          </button>
          <button class="menu-button" onClick={() => setShowJoinForm(true)}>
            🔗 Join Game
          </button>
        </div>
      )}

      {showHostForm() && (
        <div class="menu-buttons">
          <h3>Host a New Game</h3>
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName()}
            onInput={(e) => setPlayerName(e.currentTarget.value)}
            style="padding: 0.5rem; margin: 1rem; border-radius: 4px; border: none;"
          />
          <div>
            <button class="menu-button" onClick={handleHostGame} disabled={!playerName().trim()}>
              Create Room
            </button>
            <button class="menu-button" onClick={() => setShowHostForm(false)}>
              Back
            </button>
          </div>
        </div>
      )}

      {showJoinForm() && (
        <div class="menu-buttons">
          <h3>Join Existing Game</h3>
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName()}
            onInput={(e) => setPlayerName(e.currentTarget.value)}
            style="padding: 0.5rem; margin: 1rem; border-radius: 4px; border: none;"
          />
          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode()}
            onInput={(e) => setRoomCode(e.currentTarget.value)}
            style="padding: 0.5rem; margin: 1rem; border-radius: 4px; border: none;"
          />
          <div>
            <button class="menu-button" onClick={handleJoinGame} disabled={!playerName().trim() || !roomCode().trim()}>
              Join Room
            </button>
            <button class="menu-button" onClick={() => setShowJoinForm(false)}>
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainMenu;