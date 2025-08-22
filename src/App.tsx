import { createSignal, createEffect, onCleanup } from 'solid-js';
import { invoke } from '@tauri-apps/api/tauri';
import MainMenu from './components/MainMenu';
import Lobby from './components/Lobby';
import GameView from './components/GameView';

export type AppState = 'menu' | 'lobby' | 'game';

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

function App() {
  const [appState, setAppState] = createSignal<AppState>('menu');
  const [playerName, setPlayerName] = createSignal('');
  const [playerId, setPlayerId] = createSignal('');
  const [roomCode, setRoomCode] = createSignal('');
  const [gameState, setGameState] = createSignal<GameState>({ players: {}, room_code: '' });
  const [isHost, setIsHost] = createSignal(false);

  // Generate a unique player ID on app start
  createEffect(() => {
    setPlayerId(Math.random().toString(36).substr(2, 9));
  });

  const hostGame = async (name: string) => {
    try {
      const roomCode = await invoke<string>('create_room');
      setPlayerName(name);
      setRoomCode(roomCode);
      setIsHost(true);
      
      // Join as host
      const state = await invoke<GameState>('join_player', {
        playerId: playerId(),
        playerName: name
      });
      
      setGameState(state);
      setAppState('lobby');
    } catch (error) {
      console.error('Failed to host game:', error);
    }
  };

  const joinGame = async (name: string, code: string) => {
    try {
      setPlayerName(name);
      setRoomCode(code);
      setIsHost(false);
      
      const state = await invoke<GameState>('join_player', {
        playerId: playerId(),
        playerName: name
      });
      
      setGameState(state);
      setAppState('lobby');
    } catch (error) {
      console.error('Failed to join game:', error);
    }
  };

  const startGame = () => {
    setAppState('game');
  };

  const backToMenu = () => {
    setAppState('menu');
    setGameState({ players: {}, room_code: '' });
  };

  return (
    <div class="app">
      {appState() === 'menu' && (
        <MainMenu onHostGame={hostGame} onJoinGame={joinGame} />
      )}
      
      {appState() === 'lobby' && (
        <Lobby
          gameState={gameState()}
          roomCode={roomCode()}
          isHost={isHost()}
          onStartGame={startGame}
          onBackToMenu={backToMenu}
        />
      )}
      
      {appState() === 'game' && (
        <GameView
          gameState={gameState()}
          playerId={playerId()}
          playerName={playerName()}
          roomCode={roomCode()}
          onBackToLobby={() => setAppState('lobby')}
        />
      )}
    </div>
  );
}

export default App;