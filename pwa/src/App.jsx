import { createSignal, onMount, onCleanup } from "solid-js";
import { parseJoinUrl } from "@shared/utils/qrGenerator";
import GameClient from "./components/GameClient";
import JoinForm from "./components/JoinForm";
import "./App.css";

function App() {
  const [gameState, setGameState] = createSignal('menu'); // 'menu', 'joining', 'connected', 'playing'
  const [connectionInfo, setConnectionInfo] = createSignal(null);
  const [error, setError] = createSignal(null);

  // Check if we came from a QR code/join link
  onMount(() => {
    const urlParams = parseJoinUrl(window.location.href);
    if (urlParams && urlParams.isValid) {
      setConnectionInfo(urlParams);
      setGameState('joining');
    }
  });

  const handleJoinGame = (info) => {
    setError(null);
    setConnectionInfo(info);
    setGameState('joining');
  };

  const handleConnectionSuccess = () => {
    setGameState('connected');
  };

  const handleConnectionError = (err) => {
    setError(err.message || 'Failed to connect to game');
    setGameState('menu');
  };

  const handleStartGame = () => {
    setGameState('playing');
  };

  const handleLeaveGame = () => {
    setConnectionInfo(null);
    setGameState('menu');
    setError(null);
    
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  return (
    <div class="App farming-bg">
      <div class="container">
        {gameState() === 'menu' && (
          <div class="text-center">
            <h1>🌾 Same Mouth</h1>
            <h2>Cooperative Farming Game</h2>
            <p class="mb-4">Join a farming game hosted on your local network</p>
            
            {error() && (
              <div class="error-message mb-4">
                <p style="color: #ff6b6b; background: rgba(255, 107, 107, 0.1); padding: 1rem; border-radius: 0.5rem;">
                  {error()}
                </p>
              </div>
            )}
            
            <JoinForm onJoin={handleJoinGame} />
            
            <div class="info-section mt-4">
              <h3>How to Play</h3>
              <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                <li>Get the farm code from a Tauri app host</li>
                <li>Enter the code or scan a QR code</li>
                <li>Work together to grow crops and fight pests</li>
                <li>Coordinate with your team to maximize harvest</li>
              </ul>
            </div>
          </div>
        )}

        {(gameState() === 'joining' || gameState() === 'connected' || gameState() === 'playing') && (
          <GameClient
            connectionInfo={connectionInfo()}
            gameState={gameState()}
            onConnectionSuccess={handleConnectionSuccess}
            onConnectionError={handleConnectionError}
            onStartGame={handleStartGame}
            onLeaveGame={handleLeaveGame}
          />
        )}
      </div>
    </div>
  );
}

export default App;