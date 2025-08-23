import { createSignal, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { ipToAgricultural } from "@shared/utils/ipMapping";
import { createShareableGameInfo } from "@shared/utils/qrGenerator";
import GameHost from "./components/GameHost";
import GameClient from "./components/GameClient";
import "./App.css";

function App() {
  const [mode, setMode] = createSignal('menu'); // 'menu', 'hosting', 'joining', 'playing'
  const [localIp, setLocalIp] = createSignal('');
  const [gameInfo, setGameInfo] = createSignal(null);
  const [error, setError] = createSignal('');

  onMount(async () => {
    try {
      const ip = await invoke("get_local_ip");
      setLocalIp(ip);
    } catch (err) {
      console.error('Failed to get local IP:', err);
      setError('Failed to get network information');
    }
  });

  const handleHostGame = async () => {
    try {
      setError('');
      const port = 3847;
      
      // Start the game server
      const result = await invoke("start_game_server", { port });
      console.log(result);
      
      // Create game info for sharing
      const ip = localIp();
      const agriculturalName = ipToAgricultural(ip);
      const pwaUrl = 'http://localhost:5173'; // Dev server URL - will be configurable
      
      const shareInfo = createShareableGameInfo(ip, port, agriculturalName, pwaUrl);
      setGameInfo(shareInfo);
      setMode('hosting');
      
    } catch (err) {
      console.error('Failed to start game server:', err);
      setError('Failed to start game server: ' + err);
    }
  };

  const handleJoinGame = () => {
    setMode('joining');
  };

  const handleBackToMenu = () => {
    setMode('menu');
    setGameInfo(null);
    setError('');
  };

  return (
    <div class="app">
      <div class="container">
        {mode() === 'menu' && (
          <div class="menu">
            <h1>🌾 Same Mouth</h1>
            <h2>Cooperative Farming Game</h2>
            <p class="subtitle">Work together to grow crops and fight off pests!</p>
            
            {error() && (
              <div class="error-message">
                <p>{error()}</p>
              </div>
            )}
            
            <div class="network-info">
              <p><strong>Your Network:</strong> {localIp() || 'Loading...'}</p>
              {localIp() && (
                <p><strong>Farm Code:</strong> {ipToAgricultural(localIp())}</p>
              )}
            </div>
            
            <div class="menu-buttons">
              <button 
                class="btn btn-primary" 
                onClick={handleHostGame}
                disabled={!localIp()}
              >
                🏠 Host New Farm
              </button>
              
              <button 
                class="btn btn-secondary" 
                onClick={handleJoinGame}
              >
                🚀 Join Farm
              </button>
            </div>
            
            <div class="info-section">
              <h3>About This Game</h3>
              <ul>
                <li>🌱 Plant and water crops together</li>
                <li>🐛 Fight off pests and weeds</li>
                <li>🚜 Share tools and resources</li>
                <li>🏆 Maximize your harvest as a team</li>
              </ul>
            </div>
          </div>
        )}

        {mode() === 'hosting' && (
          <GameHost 
            gameInfo={gameInfo()}
            onBackToMenu={handleBackToMenu}
          />
        )}

        {mode() === 'joining' && (
          <GameClient 
            onBackToMenu={handleBackToMenu}
          />
        )}
      </div>
    </div>
  );
}

export default App;
