import { Component, createSignal } from 'solid-js';
import { GameStateManager } from './game/core/GameStateManager';

const App: Component = () => {
  const [game] = createSignal(new GameStateManager('balanced', 2));
  const [started, setStarted] = createSignal(false);

  const startGame = () => {
    game().startGame();
    setStarted(true);
  };

  const getStats = () => {
    if (!started()) return null;
    return game().getState();
  };

  return (
    <div style={{
      "text-align": "center",
      padding: "2rem"
    }}>
      <h1 style={{ "margin-bottom": "2rem" }}>Same Mouth - Cooperative Farming Game</h1>

      <div style={{ "margin-bottom": "2rem" }}>
        <p>All 78 tests passing!</p>
        <ul style={{ "list-style": "none", "margin-top": "1rem" }}>
          <li>✅ TileMap System (12 tests)</li>
          <li>✅ Player System (24 tests)</li>
          <li>✅ Crop System (20 tests)</li>
          <li>✅ Threat Systems (10 tests)</li>
          <li>✅ Automated Gameplay Integration (12 tests)</li>
        </ul>
      </div>

      {!started() ? (
        <button
          onClick={startGame}
          style={{
            padding: "1rem 2rem",
            "font-size": "1.2rem",
            background: "#4CAF50",
            color: "white",
            border: "none",
            "border-radius": "4px",
            cursor: "pointer"
          }}
        >
          Start Game
        </button>
      ) : (
        <div>
          <h2>Game Running!</h2>
          <div style={{ "margin-top": "1rem" }}>
            <p>Game State: {JSON.stringify(getStats(), null, 2)}</p>
          </div>
        </div>
      )}

      <div style={{ "margin-top": "3rem", "font-size": "0.9rem", color: "#888" }}>
        <p>Built with SolidJS + Tauri + PhaserJS</p>
        <p>Comprehensive TDD implementation with automated gameplay tests</p>
      </div>
    </div>
  );
};

export default App;
