import { createSignal, onMount, onCleanup, createEffect } from "solid-js";
import { createReconnectingWebSocket, generatePlayerId, createMessage } from "@shared/utils/networkUtils";
import GameView from "@shared/components/GameView";

function GameClient({ connectionInfo, gameState, onConnectionSuccess, onConnectionError, onStartGame, onLeaveGame }) {
  const [wsConnection, setWsConnection] = createSignal(null);
  const [players, setPlayers] = createSignal([]);
  const [playerId, setPlayerId] = createSignal(generatePlayerId());
  const [lobbyInfo, setLobbyInfo] = createSignal(null);
  const [connectionStatus, setConnectionStatus] = createSignal('connecting');

  console.log('[GAMECLIENT] Initialized with gameState:', gameState);

  // Debug when gameState prop changes
  createEffect(() => {
    console.log('[GAMECLIENT] gameState prop changed to:', gameState);
  });

  // Create a signal to track the current game state
  const [currentGameState, setCurrentGameState] = createSignal(gameState);
  
  // Update the current game state when the prop changes
  createEffect(() => {
    console.log('[GAMECLIENT] Updating currentGameState from prop:', gameState);
    setCurrentGameState(gameState);
  });

  onMount(() => {
    connectToGame();
  });

  onCleanup(() => {
    const ws = wsConnection();
    if (ws) {
      ws.close();
    }
  });

  const connectToGame = () => {
    if (!connectionInfo) return;

    const { host, port } = connectionInfo;
    const wsUrl = `ws://${host}:${port}`;
    
    setConnectionStatus('connecting');

    const ws = createReconnectingWebSocket(wsUrl, {
      maxReconnectAttempts: 3,
      reconnectInterval: 2000,
      
      onConnect: () => {
        console.log('Connected to game server');
        setConnectionStatus('connected');
        
        // Send join message
        const joinMessage = createMessage(
          'PLAYER_JOIN',
          {
            id: playerId(),
            name: `Player ${Math.floor(Math.random() * 1000)}`,
            x: 0.0,
            y: 0.0,
            connected: true
          },
          playerId()
        );
        ws.send(joinMessage);
        
        onConnectionSuccess();
      },
      
      onMessage: (message) => {
        handleMessage(message);
      },
      
      onDisconnect: () => {
        console.log('Disconnected from game server');
        setConnectionStatus('disconnected');
      },
      
      onError: (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        onConnectionError(error);
      }
    });

    ws.connect();
    setWsConnection(ws);
  };

  const handleMessage = (message) => {
    console.log('Received message:', message);
    
    switch (message.type) {
      case 'PLAYER_LIST':
        console.log('[GAMECLIENT] Player list update, players:', message.data.players || []);
        setPlayers(message.data.players || []);
        break;
        
      case 'LOBBY_INFO':
        console.log('[GAMECLIENT] Lobby info update:', message.data);
        setLobbyInfo(message.data);
        break;
        
      case 'GAME_START':
        console.log('[GAMECLIENT] Game start message received, transitioning to playing state');
        onStartGame();
        break;
        
      case 'PLAYER_UPDATE':
        // Handle player position updates
        // These will be handled by the GameView component
        break;
        
      case 'ERROR':
        onConnectionError(new Error(message.data.message || 'Server error'));
        break;
        
      case 'PONG':
        // Handle ping/pong for connection health
        break;
        
      default:
        console.log('Unhandled message type:', message.type);
    }
  };

  const sendMessage = (type, data = {}) => {
    const ws = wsConnection();
    if (ws && ws.isConnected) {
      const message = createMessage(type, data, playerId());
      ws.send(message);
    }
  };

  const handleLeave = () => {
    sendMessage('PLAYER_LEAVE');
    
    const ws = wsConnection();
    if (ws) {
      ws.close();
    }
    
    onLeaveGame();
  };

  const getStatusText = () => {
    switch (connectionStatus()) {
      case 'connecting':
        return 'Connecting to farm...';
      case 'connected':
        return gameState === 'playing' ? 'In Game' : 'Connected to farm';
      case 'disconnected':
        return 'Disconnected from farm';
      case 'error':
        return 'Connection failed';
      default:
        return 'Unknown status';
    }
  };

  const getStatusDotClass = () => {
    switch (connectionStatus()) {
      case 'connecting':
        return 'status-dot connecting';
      case 'connected':
        return 'status-dot connected';
      case 'error':
      case 'disconnected':
        return 'status-dot error';
      default:
        return 'status-dot';
    }
  };

  return (
    <div class="game-client">
      <div class="connection-status">
        <div class={getStatusDotClass()}></div>
        <span>{getStatusText()}</span>
      </div>

      {(() => {
        const state = currentGameState();
        console.log('[GAMECLIENT] Rendering, currentGameState:', state);
        if (state === 'playing') {
          console.log('[GAMECLIENT] Rendering GameView component');
          try {
            const gameView = (
              <GameView
                connectionInfo={connectionInfo()}
                wsConnection={wsConnection()}
                playerId={playerId()}
                onLeaveGame={handleLeave}
                onMessage={handleMessage}
              />
            );
            console.log('[GAMECLIENT] GameView component created successfully');
            return gameView;
          } catch (error) {
            console.error('[GAMECLIENT] Error creating GameView component:', error);
            return (
              <div class="error-message">
                <p>Failed to load game: {error.message}</p>
              </div>
            );
          }
        } else {
          console.log('[GAMECLIENT] Rendering lobby view');
          return (
            <div class="lobby-view">
              <div class="card">
                <h3>🌾 Farm Lobby</h3>
                
                {lobbyInfo() && (
                  <div class="lobby-info">
                    <p><strong>Farm:</strong> {lobbyInfo().farmName || `${connectionInfo().host}:${connectionInfo().port}`}</p>
                    <p><strong>Status:</strong> {lobbyInfo().status || 'Waiting for players'}</p>
                  </div>
                )}

                <div class="player-list">
                  <h4>👥 Players ({players().length})</h4>
                  {players().length === 0 ? (
                    <p style="text-align: center; color: rgba(255, 255, 255, 0.7);">
                      Waiting for players...
                    </p>
                  ) : (
                    players().map((player) => (
                      <div class="player-item" key={player.id}>
                        {player.name} {player.id === playerId() ? '(You)' : ''}
                      </div>
                    ))
                  )}
                </div>

                <div class="lobby-controls">
                  <button class="btn btn-secondary" onClick={handleLeave}>
                    🚪 Leave Farm
                  </button>
                  
                  {connectionStatus() === 'connected' && (
                    <button 
                      class="btn" 
                      onClick={() => sendMessage('GAME_START')}
                      disabled={players().length < 1}
                    >
                      🌱 Ready to Farm
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }
      })()}
    </div>
  );
}

export default GameClient;