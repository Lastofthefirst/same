import { createSignal } from "solid-js";
import GameLobby from "./components/GameLobby";
import GameContainer from "./components/GameContainer";
import "./App.css";

function App() {
  const [gameState, setGameState] = createSignal('lobby'); // 'lobby' or 'game'
  const [networkManager, setNetworkManager] = createSignal(null);

  const handleGameStart = (manager) => {
    setNetworkManager(manager);
    setGameState('game');
  };

  const handleBackToLobby = () => {
    setGameState('lobby');
    setNetworkManager(null);
  };

  return (
    <main style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0,
      overflow: 'hidden'
    }}>
      {gameState() === 'lobby' ? (
        <GameLobby onGameStart={handleGameStart} />
      ) : (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <button
            onClick={handleBackToLobby}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              'z-index': 1000,
              padding: '10px 15px',
              'background-color': '#666',
              color: 'white',
              border: 'none',
              'border-radius': '5px',
              cursor: 'pointer'
            }}
          >
            ← Back to Lobby
          </button>
          <GameContainer networkManager={networkManager()} />
        </div>
      )}
    </main>
  );
}

export default App;
