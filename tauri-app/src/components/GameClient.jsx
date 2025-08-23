import { createSignal } from "solid-js";
import { ipToAgricultural, agriculturalToIp } from "@shared/utils/ipMapping";
import { createReconnectingWebSocket, generatePlayerId } from "@shared/utils/networkUtils";

// Simple GameView component inline for now
function SimpleGameView({ connectionInfo, wsConnection, playerId, onLeaveGame }) {
  return (
    <div class="game-view">
      <div class="game-header">
        <h3>🌾 Playing in the Farm</h3>
        <button class="btn btn-secondary" onClick={onLeaveGame}>
          🚪 Leave Game
        </button>
      </div>
      
      <div style="width: 100%; height: 60vh; min-height: 400px; border-radius: 1rem; overflow: hidden; background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); display: flex; align-items: center; justify-content: center; color: white;">
        <div style="text-align: center;">
          <h2>🌾 Farm Game View</h2>
          <p>Connected to: {connectionInfo.host}:{connectionInfo.port}</p>
          <p>Player ID: {playerId}</p>
          <p style="margin-top: 2rem; opacity: 0.8;">Game interface would appear here</p>
        </div>
      </div>
      
      <div class="game-controls">
        <p style="text-align: center; color: rgba(255, 255, 255, 0.8); margin: 1rem 0;">
          🎮 Game controls would be here
        </p>
      </div>
    </div>
  );
}

function GameClient({ onBackToMenu }) {
  const [connectionInfo, setConnectionInfo] = createSignal(null);
  const [gameState, setGameState] = createSignal('form'); // 'form', 'connecting', 'connected', 'playing'
  const [farmCode, setFarmCode] = createSignal('');
  const [error, setError] = createSignal('');
  const [wsConnection, setWsConnection] = createSignal(null);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    
    const code = farmCode().trim();
    if (!code) return;
    
    setError('');
    
    try {
      let host, port = 3847;
      
      // Try to parse as agricultural code first
      const ip = agriculturalToIp(code);
      if (ip) {
        host = ip;
      } else if (code.includes(':')) {
        // Parse as IP:port format
        [host, port] = code.split(':');
        port = parseInt(port, 10) || 3847;
      } else if (code.includes('.')) {
        // Parse as just IP
        host = code;
      } else {
        throw new Error('Invalid farm code or IP address');
      }
      
      // Validate IP format
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(host)) {
        throw new Error('Invalid IP address format');
      }
      
      setConnectionInfo({ host, port });
      connectToGame(host, port);
      
    } catch (err) {
      setError(err.message);
    }
  };

  const connectToGame = (host, port) => {
    setGameState('connecting');
    
    const wsUrl = `ws://${host}:${port}`;
    const playerId = generatePlayerId();
    
    const ws = createReconnectingWebSocket(wsUrl, {
      maxReconnectAttempts: 3,
      reconnectInterval: 2000,
      
      onConnect: () => {
        console.log('Connected to game');
        setGameState('connected');
        
        // Send join message
        ws.send({
          type: 'PLAYER_JOIN',
          data: {
            id: playerId,
            name: `Player ${Math.floor(Math.random() * 1000)}`,
            x: 0.0,
            y: 0.0,
            connected: true
          }
        });
      },
      
      onMessage: (message) => {
        if (message.type === 'GAME_START') {
          setGameState('playing');
        }
      },
      
      onDisconnect: () => {
        setGameState('form');
        setError('Disconnected from game');
      },
      
      onError: (error) => {
        console.error('Connection error:', error);
        setGameState('form');
        setError('Failed to connect to game');
      }
    });

    ws.connect();
    setWsConnection(ws);
  };

  const handleLeaveGame = () => {
    const ws = wsConnection();
    if (ws) {
      ws.send({
        type: 'PLAYER_LEAVE',
        data: { timestamp: Date.now() }
      });
      ws.close();
    }
    
    setConnectionInfo(null);
    setWsConnection(null);
    setGameState('form');
    setError('');
    onBackToMenu();
  };

  return (
    <div class="game-client">
      {gameState() === 'form' && (
        <div class="join-form">
          <h2>🚀 Join a Farm</h2>
          
          {error() && (
            <div class="error-message">
              <p>{error()}</p>
            </div>
          )}
          
          <form onSubmit={handleJoinSubmit} class="card">
            <div class="form-group">
              <label for="farmCode">Farm Code or IP Address</label>
              <input
                id="farmCode"
                type="text"
                value={farmCode()}
                onInput={(e) => setFarmCode(e.target.value)}
                placeholder="Enter farm code (e.g., 'farm soil') or IP"
                autocomplete="off"
              />
              <small>
                Example: "farm soil" or "192.168.0.10"
              </small>
            </div>
            
            <div class="form-buttons">
              <button type="submit" class="btn btn-primary">
                🌾 Join Farm
              </button>
              <button type="button" class="btn btn-secondary" onClick={onBackToMenu}>
                ← Back to Menu
              </button>
            </div>
          </form>
        </div>
      )}
      
      {gameState() === 'connecting' && (
        <div class="connecting-state">
          <h2>🌱 Connecting to Farm...</h2>
          <p>Trying to connect to {connectionInfo()?.host}:{connectionInfo()?.port}</p>
          <button class="btn btn-secondary" onClick={onBackToMenu}>
            Cancel
          </button>
        </div>
      )}
      
      {gameState() === 'connected' && (
        <div class="lobby-state">
          <h2>🌾 Connected to Farm</h2>
          <p>Waiting for the host to start the game...</p>
          <div class="lobby-buttons">
            <button class="btn btn-secondary" onClick={handleLeaveGame}>
              🚪 Leave Farm
            </button>
          </div>
        </div>
      )}
      
      {gameState() === 'playing' && connectionInfo() && wsConnection() && (
        <SimpleGameView
          connectionInfo={connectionInfo()}
          wsConnection={wsConnection()}
          playerId={generatePlayerId()}
          onLeaveGame={handleLeaveGame}
        />
      )}
    </div>
  );
}

export default GameClient;