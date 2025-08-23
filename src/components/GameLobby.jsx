import { createSignal } from 'solid-js';
import NetworkManager from '../network/NetworkManager';

export default function GameLobby(props) {
  const [gameMode, setGameMode] = createSignal('menu'); // 'menu', 'host', 'join', 'lobby', 'game'
  const [roomCode, setRoomCode] = createSignal('');
  const [joinCode, setJoinCode] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');
  const [networkManager, setNetworkManager] = createSignal(null);

  const startHosting = async () => {
    setLoading(true);
    setError('');
    
    try {
      const manager = new NetworkManager(null);
      const code = await manager.startHost();
      
      setNetworkManager(manager);
      setRoomCode(code);
      setGameMode('lobby');
    } catch (err) {
      setError('Failed to start hosting: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async () => {
    if (!joinCode().trim()) {
      setError('Please enter a room code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const manager = new NetworkManager(null);
      await manager.joinRoom(joinCode().trim());
      
      setNetworkManager(manager);
      setRoomCode(joinCode());
      setGameMode('game');
      props.onGameStart?.(manager);
    } catch (err) {
      setError('Failed to join game: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startGame = () => {
    setGameMode('game');
    props.onGameStart?.(networkManager());
  };

  const backToMenu = () => {
    const manager = networkManager();
    if (manager) {
      manager.disconnect();
      setNetworkManager(null);
    }
    setGameMode('menu');
    setError('');
    setRoomCode('');
    setJoinCode('');
  };

  return (
    <div style={{
      display: 'flex',
      'flex-direction': 'column',
      'align-items': 'center',
      'justify-content': 'center',
      height: '100vh',
      padding: '20px',
      'background-color': '#2a5d31',
      color: 'white',
      'font-family': 'Arial, sans-serif'
    }}>
      {gameMode() === 'menu' && (
        <div style={{ 'text-align': 'center' }}>
          <h1 style={{ 'margin-bottom': '30px', color: '#90EE90' }}>
            🌾 Same Mouth - Cooperative Farming 🌾
          </h1>
          <p style={{ 'margin-bottom': '30px', 'max-width': '500px', 'line-height': '1.5' }}>
            Work together to grow crops before being overwhelmed by pests and weeds!
          </p>
          
          <div style={{ display: 'flex', gap: '20px', 'flex-direction': 'column', 'align-items': 'center' }}>
            <button 
              onClick={() => setGameMode('host')}
              style={{
                padding: '15px 30px',
                'font-size': '18px',
                'background-color': '#4CAF50',
                color: 'white',
                border: 'none',
                'border-radius': '8px',
                cursor: 'pointer',
                width: '200px'
              }}
            >
              🏠 Host Game
            </button>
            
            <button 
              onClick={() => setGameMode('join')}
              style={{
                padding: '15px 30px',
                'font-size': '18px',
                'background-color': '#2196F3',
                color: 'white',
                border: 'none',
                'border-radius': '8px',
                cursor: 'pointer',
                width: '200px'
              }}
            >
              🌐 Join Game
            </button>
          </div>
        </div>
      )}

      {gameMode() === 'host' && (
        <div style={{ 'text-align': 'center' }}>
          <h2>Host a New Game</h2>
          <p>Your device will host the game for others to join</p>
          
          <button 
            onClick={startHosting}
            disabled={loading()}
            style={{
              padding: '15px 30px',
              'font-size': '18px',
              'background-color': loading() ? '#666' : '#4CAF50',
              color: 'white',
              border: 'none',
              'border-radius': '8px',
              cursor: loading() ? 'not-allowed' : 'pointer',
              'margin-right': '10px'
            }}
          >
            {loading() ? '🔄 Starting...' : '🚀 Start Hosting'}
          </button>
          
          <button 
            onClick={backToMenu}
            style={{
              padding: '15px 30px',
              'font-size': '18px',
              'background-color': '#666',
              color: 'white',
              border: 'none',
              'border-radius': '8px',
              cursor: 'pointer'
            }}
          >
            ← Back
          </button>
          
          {error() && (
            <p style={{ color: '#ff6b6b', 'margin-top': '20px' }}>
              {error()}
            </p>
          )}
        </div>
      )}

      {gameMode() === 'join' && (
        <div style={{ 'text-align': 'center' }}>
          <h2>Join a Game</h2>
          <p>Enter the room code shared by the host</p>
          
          <div style={{ 'margin': '20px 0' }}>
            <input
              type="text"
              placeholder="e.g., farm soil"
              value={joinCode()}
              onInput={(e) => setJoinCode(e.target.value)}
              style={{
                padding: '12px',
                'font-size': '16px',
                'border-radius': '8px',
                border: '2px solid #ccc',
                'margin-right': '10px',
                width: '200px'
              }}
            />
          </div>
          
          <button 
            onClick={joinGame}
            disabled={loading()}
            style={{
              padding: '15px 30px',
              'font-size': '18px',
              'background-color': loading() ? '#666' : '#2196F3',
              color: 'white',
              border: 'none',
              'border-radius': '8px',
              cursor: loading() ? 'not-allowed' : 'pointer',
              'margin-right': '10px'
            }}
          >
            {loading() ? '🔄 Joining...' : '🌐 Join Game'}
          </button>
          
          <button 
            onClick={backToMenu}
            style={{
              padding: '15px 30px',
              'font-size': '18px',
              'background-color': '#666',
              color: 'white',
              border: 'none',
              'border-radius': '8px',
              cursor: 'pointer'
            }}
          >
            ← Back
          </button>
          
          {error() && (
            <p style={{ color: '#ff6b6b', 'margin-top': '20px' }}>
              {error()}
            </p>
          )}
        </div>
      )}

      {gameMode() === 'lobby' && (
        <div style={{ 'text-align': 'center' }}>
          <h2>Game Lobby - You're the Host!</h2>
          <div style={{ 
            'background-color': '#1a4d20',
            padding: '20px',
            'border-radius': '10px',
            'margin': '20px 0',
            'max-width': '400px'
          }}>
            <h3>Room Code:</h3>
            <p style={{ 
              'font-size': '24px', 
              'font-weight': 'bold',
              color: '#90EE90',
              'margin': '10px 0'
            }}>
              {roomCode()}
            </p>
            <p style={{ 'font-size': '14px', opacity: '0.8' }}>
              Share this code with other players so they can join your game
            </p>
          </div>
          
          <div style={{ 'margin': '20px 0' }}>
            <p>Waiting for players to join...</p>
            <p style={{ 'font-size': '14px', opacity: '0.8' }}>
              Players connected: 1 (You)
            </p>
          </div>
          
          <button 
            onClick={startGame}
            style={{
              padding: '15px 30px',
              'font-size': '18px',
              'background-color': '#4CAF50',
              color: 'white',
              border: 'none',
              'border-radius': '8px',
              cursor: 'pointer',
              'margin-right': '10px'
            }}
          >
            🎮 Start Game
          </button>
          
          <button 
            onClick={backToMenu}
            style={{
              padding: '15px 30px',
              'font-size': '18px',
              'background-color': '#666',
              color: 'white',
              border: 'none',
              'border-radius': '8px',
              cursor: 'pointer'
            }}
          >
            ← Cancel
          </button>
        </div>
      )}
    </div>
  );
}