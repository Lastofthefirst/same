use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};

// Game server state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub id: String,
    pub name: String,
    pub x: f32,
    pub y: f32,
    pub connected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameMessage {
    pub r#type: String,
    pub data: serde_json::Value,
    pub player_id: Option<String>,
    pub timestamp: u64,
    pub id: String,
}

type GameState = Arc<Mutex<HashMap<String, Player>>>;
type Connections = Arc<Mutex<HashMap<String, tokio::sync::mpsc::UnboundedSender<Message>>>>;

// Tauri commands
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_local_ip() -> Result<String, String> {
    match local_ip_address::local_ip() {
        Ok(ip) => Ok(ip.to_string()),
        Err(e) => Err(format!("Failed to get local IP: {}", e)),
    }
}

#[tauri::command]
async fn start_game_server(port: u16) -> Result<String, String> {
    let addr = format!("0.0.0.0:{}", port);
    
    match TcpListener::bind(&addr).await {
        Ok(listener) => {
            // Spawn the server in a separate task
            tokio::spawn(async move {
                run_game_server(listener).await;
            });
            
            Ok(format!("Game server started on port {}", port))
        }
        Err(e) => Err(format!("Failed to start server: {}", e)),
    }
}

async fn run_game_server(listener: TcpListener) {
    let game_state: GameState = Arc::new(Mutex::new(HashMap::new()));
    let connections: Connections = Arc::new(Mutex::new(HashMap::new()));
    
    println!("Game server listening for connections...");
    
    while let Ok((stream, addr)) = listener.accept().await {
        println!("New connection from: {}", addr);
        
        let game_state = game_state.clone();
        let connections = connections.clone();
        
        tokio::spawn(async move {
            handle_connection(stream, game_state, connections).await;
        });
    }
}

async fn handle_connection(stream: TcpStream, game_state: GameState, connections: Connections) {
    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            println!("Error upgrading connection: {}", e);
            return;
        }
    };
    
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
    
    // Handle outgoing messages
    let tx_clone = tx.clone();
    tokio::spawn(async move {
        while let Some(message) = rx.recv().await {
            if let Err(e) = ws_sender.send(message).await {
                println!("Error sending message: {}", e);
                break;
            }
        }
    });
    
    let mut player_id: Option<String> = None;
    
    // Handle incoming messages
    while let Some(message_result) = ws_receiver.next().await {
        match message_result {
            Ok(message) => {
                if let Ok(text) = message.to_text() {
                    if let Ok(game_message) = serde_json::from_str::<GameMessage>(text) {
                        match game_message.r#type.as_str() {
                            "PLAYER_JOIN" => {
                                println!("Received PLAYER_JOIN message: {:?}", game_message.data);
                                // Clone the data to avoid move issues
                                let player_data_value = game_message.data.clone();
                                if let Ok(player_data) = serde_json::from_value::<Player>(player_data_value) {
                                    println!("Successfully parsed player data: {:?}", player_data);
                                    player_id = Some(player_data.id.clone());
                                    
                                    // Add player to game state
                                    {
                                        let mut state = game_state.lock().unwrap();
                                        state.insert(player_data.id.clone(), player_data.clone());
                                        println!("Added player to state. Total players: {}", state.len());
                                    }
                                    
                                    // Add connection
                                    {
                                        let mut conns = connections.lock().unwrap();
                                        conns.insert(player_data.id.clone(), tx_clone.clone());
                                    }
                                    
                                    // Broadcast player list update
                                    broadcast_player_list(&game_state, &connections).await;
                                    
                                    // Send lobby info to new player
                                    let player_count = {
                                        let state = game_state.lock().unwrap();
                                        state.len()
                                    };
                                    let lobby_info = serde_json::json!({
                                        "farmName": "Local Farm",
                                        "status": "waiting",
                                        "playerCount": player_count
                                    });
                                    
                                    let response = GameMessage {
                                        r#type: "LOBBY_INFO".to_string(),
                                        data: lobby_info,
                                        player_id: None,
                                        timestamp: std::time::SystemTime::now()
                                            .duration_since(std::time::UNIX_EPOCH)
                                            .unwrap()
                                            .as_millis() as u64,
                                        id: format!("msg_{}", uuid::Uuid::new_v4()),
                                    };
                                    
                                    if let Ok(response_text) = serde_json::to_string(&response) {
                                        let _ = tx_clone.send(Message::Text(response_text));
                                    }
                                } else {
                                    println!("Failed to parse PLAYER_JOIN data as Player struct: {:?}", game_message.data);
                                }
                            }
                            "PLAYER_UPDATE" => {
                                // Update player position
                                if let Some(pid) = &player_id {
                                    if let Ok(update_data) = serde_json::from_value::<serde_json::Value>(game_message.data.clone()) {
                                        if let (Some(x), Some(y)) = (update_data.get("x"), update_data.get("y")) {
                                            let mut state = game_state.lock().unwrap();
                                            if let Some(player) = state.get_mut(pid) {
                                                if let (Some(x_val), Some(y_val)) = (x.as_f64(), y.as_f64()) {
                                                    player.x = x_val as f32;
                                                    player.y = y_val as f32;
                                                }
                                            }
                                        }
                                    }
                                    
                                    // Broadcast position update to other players
                                    broadcast_to_others(&connections, &game_message, pid).await;
                                }
                            }
                            "PLAYER_LEAVE" => {
                                if let Some(pid) = &player_id {
                                    // Remove player from state
                                    {
                                        let mut state = game_state.lock().unwrap();
                                        state.remove(pid);
                                    }
                                    
                                    // Remove connection
                                    {
                                        let mut conns = connections.lock().unwrap();
                                        conns.remove(pid);
                                    }
                                    
                                    // Broadcast updated player list
                                    broadcast_player_list(&game_state, &connections).await;
                                }
                                break;
                            }
                            _ => {
                                println!("Unhandled message type: {}", game_message.r#type);
                            }
                        }
                    }
                }
            }
            Err(e) => {
                println!("Error receiving message: {}", e);
                break;
            }
        }
    }
    
    // Clean up on disconnect
    if let Some(pid) = player_id {
        // Remove player from state
        {
            let mut state = game_state.lock().unwrap();
            state.remove(&pid);
        }
        
        // Remove connection
        {
            let mut conns = connections.lock().unwrap();
            conns.remove(&pid);
        }
        
        // Broadcast updated player list
        broadcast_player_list(&game_state, &connections).await;
    }
}

async fn broadcast_player_list(game_state: &GameState, connections: &Connections) {
    let players: Vec<Player> = {
        let state = game_state.lock().unwrap();
        state.values().cloned().collect()
    };
    
    println!("Broadcasting player list with {} players: {:?}", players.len(), players);
    
    let message = GameMessage {
        r#type: "PLAYER_LIST".to_string(),
        data: serde_json::json!({ "players": players }),
        player_id: None,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64,
        id: format!("msg_{}", uuid::Uuid::new_v4()),
    };
    
    if let Ok(message_text) = serde_json::to_string(&message) {
        let conns = connections.lock().unwrap();
        println!("Sending to {} connections", conns.len());
        for tx in conns.values() {
            let _ = tx.send(Message::Text(message_text.clone()));
        }
    }
}

async fn broadcast_to_others(
    connections: &Connections,
    message: &GameMessage,
    sender_id: &str,
) {
    if let Ok(message_text) = serde_json::to_string(message) {
        let conns = connections.lock().unwrap();
        for (player_id, tx) in conns.iter() {
            if player_id != sender_id {
                let _ = tx.send(Message::Text(message_text.clone()));
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, get_local_ip, start_game_server])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
