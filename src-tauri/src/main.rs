#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Player {
    id: String,
    name: String,
    x: f64,
    y: f64,
    facing: String,
    role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GameState {
    players: HashMap<String, Player>,
    room_code: String,
}

type SharedGameState = Arc<Mutex<GameState>>;
type GameEventSender = broadcast::Sender<String>;

#[tauri::command]
async fn create_room() -> Result<String, String> {
    // Generate a simple room code for now
    let room_code = format!("farm-{}", rand::random::<u16>() % 1000);
    Ok(room_code)
}

#[tauri::command]
async fn get_local_ip() -> Result<String, String> {
    // Simple localhost IP for development
    Ok("127.0.0.1".to_string())
}

#[tauri::command]
async fn join_player(
    state: tauri::State<'_, SharedGameState>,
    player_id: String,
    player_name: String,
) -> Result<GameState, String> {
    let mut game_state = state.lock().unwrap();
    
    let player = Player {
        id: player_id.clone(),
        name: player_name,
        x: 400.0,
        y: 300.0,
        facing: "down".to_string(),
        role: "tiller".to_string(),
    };
    
    game_state.players.insert(player_id, player);
    
    Ok(game_state.clone())
}

#[tauri::command]
async fn update_player_position(
    state: tauri::State<'_, SharedGameState>,
    player_id: String,
    x: f64,
    y: f64,
    facing: String,
) -> Result<(), String> {
    let mut game_state = state.lock().unwrap();
    
    if let Some(player) = game_state.players.get_mut(&player_id) {
        player.x = x;
        player.y = y;
        player.facing = facing;
    }
    
    Ok(())
}

#[tauri::command]
async fn get_game_state(state: tauri::State<'_, SharedGameState>) -> Result<GameState, String> {
    let game_state = state.lock().unwrap();
    Ok(game_state.clone())
}

fn main() {
    let game_state: SharedGameState = Arc::new(Mutex::new(GameState {
        players: HashMap::new(),
        room_code: String::new(),
    }));

    tauri::Builder::default()
        .manage(game_state)
        .invoke_handler(tauri::generate_handler![
            create_room,
            get_local_ip,
            join_player,
            update_player_position,
            get_game_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}