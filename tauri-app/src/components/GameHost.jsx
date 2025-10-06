import { createSignal, onMount, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { createReconnectingWebSocket, createMessage } from "@shared/utils/networkUtils";
import { MultiPlayerManager, GameView } from "@shared/components";

function GameHost({ gameInfo, onBackToMenu }) {
  const [players, setPlayers] = createSignal([]);
  const [gameState, setGameState] = createSignal('lobby'); // 'lobby', 'starting', 'playing'
  const [serverConnection, setServerConnection] = createSignal(null);
  const [localPlayers, setLocalPlayers] = createSignal([]);
  const [readyToFarm, setReadyToFarm] = createSignal(false);

  onMount(() => {
    // Connect to our own server to monitor the game
    connectToOwnServer();
  });

  onCleanup(() => {
    const connection = serverConnection();
    if (connection) {
      connection.close();
    }
  });

  const connectToOwnServer = () => {
    // Add a small delay to ensure server is fully started
    setTimeout(() => {
      const wsUrl = `ws://${gameInfo.hostIp}:${gameInfo.port}`;
      
      console.log('[HOST] Attempting to connect to own server at:', wsUrl);
      
      const ws = createReconnectingWebSocket(wsUrl, {
        maxReconnectAttempts: 3,
        reconnectInterval: 2000,
        
        onConnect: () => {
          console.log('[HOST] Connected to own server successfully');
          // Send host join message
          const joinMessage = createMessage(
            'PLAYER_JOIN',
            {
              id: 'host',
              name: 'Host',
              x: 50.0,
              y: 50.0,
              connected: true
            },
            'host'
          );
          ws.send(joinMessage);
        },
        
        onMessage: (message) => {
          console.log('[HOST] Received message from server:', message);
          handleServerMessage(message);
        },
        
        onDisconnect: () => {
          console.log('[HOST] Disconnected from own server');
        },
        
        onError: (error) => {
          console.error('[HOST] Connection error:', error);
          console.log('[HOST] This is normal if the server is still starting up...');
        }
      });

      ws.connect();
      setServerConnection(ws);
    }, 1000); // Wait 1 second for server to fully start
  };

  const handleServerMessage = (message) => {
    console.log('Host received message:', message);
    
    switch (message.type) {
      case 'PLAYER_LIST':
        console.log('Player list update:', message.data.players);
        setPlayers(message.data.players || []);
        break;
        
      case 'GAME_START':
        setGameState('playing');
        break;
        
      default:
        console.log('Unhandled host message:', message.type);
    }
  };

  const startGame = () => {
    const connection = serverConnection();
    if (connection && connection.isConnected) {
      setGameState('starting');
      
      const message = createMessage(
        'GAME_START',
        {
          startedBy: 'host',
          timestamp: Date.now()
        },
        'host'  // Host player ID
      );
      connection.send(message);
    }
  };

  const stopServer = async () => {
    try {
      console.log('[HOST] Stopping server...');
      
      // Close WebSocket connection first
      const connection = serverConnection();
      if (connection) {
        connection.close();
        setServerConnection(null);
      }
      
      // Stop the actual server
      const result = await invoke("stop_game_server");
      console.log('[HOST] Server stop result:', result);
      
    } catch (err) {
      console.error('[HOST] Failed to stop server:', err);
    } finally {
      // Always return to menu regardless of server stop success
      onBackToMenu();
    }
  };

  const handleLocalPlayersChange = (newLocalPlayers) => {
    setLocalPlayers(newLocalPlayers);
  };

  const handlePlayerMove = (moveData) => {
    const connection = serverConnection();
    if (connection && connection.isConnected) {
      console.log('[MOVEMENT] Sending player movement:', moveData);
      const message = createMessage(
        'PLAYER_UPDATE',
        {
          x: moveData.x,
          y: moveData.y
        },
        'host'  // Host player ID
      );
      connection.send(message);
    }
  };

  const toggleReadyToFarm = () => {
    const newReadyState = !readyToFarm();
    setReadyToFarm(newReadyState);
    console.log('[READY] Host ready state changed to:', newReadyState);
    
    const connection = serverConnection();
    if (connection && connection.isConnected) {
      const message = createMessage(
        'HOST_READY',
        {
          ready: newReadyState,
          timestamp: Date.now()
        },
        'host'  // Host player ID
      );
      connection.send(message);
    }
  };

  const copyJoinInfo = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
      console.log('Copied to clipboard:', text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div class="game-host">
      <div class="host-header">
        <h2>🌾 Hosting Farm</h2>
        <button class="btn btn-secondary" onClick={stopServer}>
          🛑 Stop Hosting
        </button>
      </div>

      <div class="host-content">
        <div class="connection-info card">
          <h3>📡 Connection Info</h3>
          
          <div class="info-row">
            <label>Farm Code:</label>
            <div class="copy-field">
              <span class="farm-code">{gameInfo.agriculturalName}</span>
              <button 
                class="btn-copy" 
                onClick={() => copyJoinInfo(gameInfo.agriculturalName)}
                title="Copy farm code"
              >
                📋
              </button>
            </div>
          </div>
          
          <div class="info-row">
            <label>IP Address:</label>
            <div class="copy-field">
              <span>{gameInfo.hostIp}:{gameInfo.port}</span>
              <button 
                class="btn-copy" 
                onClick={() => copyJoinInfo(`${gameInfo.hostIp}:${gameInfo.port}`)}
                title="Copy IP address"
              >
                📋
              </button>
            </div>
          </div>
          
          <div class="info-row">
            <label>Join URL:</label>
            <div class="copy-field">
              <span class="join-url">{gameInfo.joinUrl}</span>
              <button 
                class="btn-copy" 
                onClick={() => copyJoinInfo(gameInfo.joinUrl)}
                title="Copy join URL"
              >
                📋
              </button>
            </div>
          </div>
          
          <div class="qr-section">
            <h4>📱 QR Code for Easy Joining</h4>
            <div class="qr-placeholder">
              <p>QR Code would appear here</p>
              <p style="font-size: 0.875rem; opacity: 0.7;">
                Players can scan this to automatically join
              </p>
            </div>
          </div>
        </div>

        <div class="players-section card">
          <h3>👥 Players ({players().length + localPlayers().filter(p => p.connected).length})</h3>
          
          {players().length === 0 && localPlayers().filter(p => p.connected).length === 0 ? (
            <div class="empty-state">
              <p>🌱 Waiting for players to join...</p>
              <p style="font-size: 0.875rem; opacity: 0.7;">
                Share the farm code "{gameInfo.agriculturalName}" with friends
              </p>
            </div>
          ) : (
            <div class="players-list">
              {/* Show remote players */}
              {players().map((player) => (
                <div class="player-card" key={player.id}>
                  <div class="player-info">
                    <span class="player-name">
                      {player.name} {player.id === 'host' ? '(Host)' : ''}
                    </span>
                    <span class="player-status">
                      {player.connected ? '🟢 Connected' : '🔴 Disconnected'}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Show connected local players */}
              {localPlayers().filter(p => p.connected).map((player) => (
                <div class="player-card local-player" key={player.id}>
                  <div class="player-info">
                    <span class="player-name">
                      {player.name} (Local)
                    </span>
                    <span class="player-status">
                      🟢 Connected
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <MultiPlayerManager
          connectionInfo={gameInfo}
          wsConnection={serverConnection()}
          onPlayersChange={handleLocalPlayersChange}
          maxPlayers={4}
        />

        <div class="game-controls card">
          <h3>🎮 Game Controls</h3>
          
          <div class="control-buttons">
            {gameState() === 'lobby' && (
              <>
                <button 
                  class={`btn ${readyToFarm() ? 'btn-success' : 'btn-secondary'}`}
                  onClick={toggleReadyToFarm}
                  style={{
                    'background-color': readyToFarm() ? '#2d5a2d' : '#6c757d',
                    'margin-bottom': '1rem'
                  }}
                >
                  {readyToFarm() ? '✅ Ready to Farm!' : '🌱 Ready to Farm?'}
                </button>
                
                <button 
                  class="btn btn-primary"
                  onClick={startGame}
                  disabled={players().length + localPlayers().filter(p => p.connected).length < 1 || !readyToFarm()}
                >
                  {players().length + localPlayers().filter(p => p.connected).length < 1 
                    ? '🌱 Waiting for Players...' 
                    : !readyToFarm()
                    ? '🌱 Click Ready to Farm first'
                    : `🚀 Start Farm (${players().length + localPlayers().filter(p => p.connected).length} players)`
                  }
                </button>
              </>
            )}
            
            {gameState() === 'starting' && (
              <div class="starting-state">
                <p>🌱 Starting game...</p>
              </div>
            )}
            
            {gameState() === 'playing' && (
              <div class="playing-state">
                <p>🎮 Game is running!</p>
                <button class="btn btn-secondary">
                  ⏸️ Pause Game
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Game View - shown when playing */}
        {gameState() === 'playing' && (
          <GameView 
            connectionInfo={gameInfo}
            wsConnection={serverConnection()}
            playerId="host"
            onLeaveGame={stopServer}
            onMessage={handleServerMessage}
          />
        )}

        <div class="instructions card">
          <h3>📋 How Players Join</h3>
          <ol>
            <li>Open the PWA at <code>localhost:5173</code> (or scan QR code)</li>
            <li>Enter farm code: <strong>"{gameInfo.agriculturalName}"</strong></li>
            <li>Click "Join Farm" to connect</li>
            <li>Players will appear in the list above</li>
            <li>Start the game when everyone has joined</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default GameHost;