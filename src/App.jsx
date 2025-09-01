import { createSignal, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import Game from "./Game";

function App() {
  const [currentView, setCurrentView] = createSignal("menu");
  const [gameConfig, setGameConfig] = createSignal({
    players: 2,
    difficulty: "balanced"
  });

  return (
    <main class="app">
      {currentView() === "menu" && (
        <div class="menu">
          <h1>Same Mouth - Cooperative Farming</h1>
          <div class="menu-content">
            <div class="player-config">
              <label>Number of Players:</label>
              <select 
                value={gameConfig().players} 
                onChange={(e) => setGameConfig(prev => ({...prev, players: parseInt(e.target.value)}))}
              >
                {Array.from({length: 7}, (_, i) => (
                  <option value={i + 2}>{i + 2} Players</option>
                ))}
              </select>
            </div>
            
            <div class="difficulty-config">
              <label>Difficulty:</label>
              <select 
                value={gameConfig().difficulty} 
                onChange={(e) => setGameConfig(prev => ({...prev, difficulty: e.target.value}))}
              >
                <option value="balanced">Balanced</option>
                <option value="challenging">Rapid Overgrowth</option>
                <option value="expert">Precision Farming</option>
              </select>
            </div>
            
            <button class="start-button" onClick={() => setCurrentView("game")}>
              Start Game
            </button>
            
            <button class="instructions-button" onClick={() => setCurrentView("instructions")}>
              Instructions
            </button>
          </div>
        </div>
      )}
      
      {currentView() === "game" && (
        <Game 
          config={gameConfig()} 
          onReturn={() => setCurrentView("menu")}
        />
      )}
      
      {currentView() === "instructions" && (
        <div class="instructions">
          <h2>How to Play</h2>
          <div class="instructions-content">
            <h3>Objective</h3>
            <p>Work together to grow and harvest as many crops as possible before being overwhelmed by pests and weeds!</p>
            
            <h3>Controls</h3>
            <div class="controls-grid">
              <div class="player-controls">
                <h4>Player 1</h4>
                <p>Arrow Keys - Move</p>
                <p>Space - Action</p>
              </div>
              <div class="player-controls">
                <h4>Player 2</h4>
                <p>WASD - Move</p>
                <p>Q - Action</p>
              </div>
              <div class="player-controls">
                <h4>Player 3</h4>
                <p>IJKL - Move</p>
                <p>U - Action</p>
              </div>
              <div class="player-controls">
                <h4>Player 4</h4>
                <p>Numpad 8456 - Move</p>
                <p>Numpad 7 - Action</p>
              </div>
            </div>
            
            <h3>Gameplay</h3>
            <ul>
              <li>Plant crops on farmable tiles (brown soil)</li>
              <li>Water crops to help them grow faster</li>
              <li>Harvest mature crops and bring them to the wagon</li>
              <li>Clear weeds before they spread too much</li>
              <li>Manage pests by bringing them to pest drop-off zones</li>
              <li>Switch roles at special tiles to gain new abilities</li>
              <li>Work together - everyone benefits from shared success!</li>
            </ul>
            
            <button onClick={() => setCurrentView("menu")}>Back to Menu</button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
