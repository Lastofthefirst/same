use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};
use tokio::sync::broadcast;
use once_cell::sync::Lazy;

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

// Global server state for shutdown management  
static SERVER_SHUTDOWN: Lazy<Arc<Mutex<Option<broadcast::Sender<()>>>>> = Lazy::new(|| {
    Arc::new(Mutex::new(None))
});

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
    
    println!("[SERVER] Starting game server on {}", addr);
    
    match TcpListener::bind(&addr).await {
        Ok(listener) => {
            // Create shutdown channel
            let (shutdown_tx, shutdown_rx) = broadcast::channel(1);
            
            // Store shutdown sender globally
            {
                let mut shutdown_guard = SERVER_SHUTDOWN.lock().unwrap();
                *shutdown_guard = Some(shutdown_tx);
            }
            
            // Spawn the server in a separate task
            tokio::spawn(async move {
                run_game_server(listener, shutdown_rx).await;
            });
            
            println!("[SERVER] Game server successfully started on port {}", port);
            Ok(format!("Game server started on port {}", port))
        }
        Err(e) => {
            println!("[SERVER] Failed to start server: {}", e);
            Err(format!("Failed to start server: {}", e))
        }
    }
}

#[tauri::command]
async fn stop_game_server() -> Result<String, String> {
    println!("[SERVER] Stopping game server...");
    
    let mut shutdown_guard = SERVER_SHUTDOWN.lock().unwrap();
    
    if let Some(shutdown_tx) = shutdown_guard.take() {
        match shutdown_tx.send(()) {
            Ok(_) => {
                println!("[SERVER] Shutdown signal sent successfully");
                Ok("Game server stopped".to_string())
            }
            Err(e) => {
                println!("[SERVER] Failed to send shutdown signal: {}", e);
                Err(format!("Failed to stop server: {}", e))
            }
        }
    } else {
        println!("[SERVER] No server running to stop");
        Ok("No server running".to_string())
    }
}

async fn run_game_server(listener: TcpListener, mut shutdown_rx: broadcast::Receiver<()>) {
    let game_state: GameState = Arc::new(Mutex::new(HashMap::new()));
    let connections: Connections = Arc::new(Mutex::new(HashMap::new()));
    
    println!("[SERVER] Game server listening for connections...");
    
    loop {
        tokio::select! {
            // Handle new connections
            accept_result = listener.accept() => {
                match accept_result {
                    Ok((stream, addr)) => {
                        println!("[SERVER] New connection from: {}", addr);
                        
                        let game_state = game_state.clone();
                        let connections = connections.clone();
                        
                        tokio::spawn(async move {
                            handle_connection(stream, game_state, connections).await;
                        });
                    }
                    Err(e) => {
                        println!("[SERVER] Error accepting connection: {}", e);
                    }
                }
            }
            // Handle shutdown signal
            _ = shutdown_rx.recv() => {
                println!("[SERVER] Received shutdown signal, stopping server...");
                break;
            }
        }
    }
    
    println!("[SERVER] Game server stopped");
}

async fn handle_connection(stream: TcpStream, game_state: GameState, connections: Connections) {
    println!("[CONNECTION] Attempting to upgrade connection to WebSocket");
    
    let ws_stream = match accept_async(stream).await {
        Ok(ws) => {
            println!("[CONNECTION] Successfully upgraded to WebSocket");
            ws
        },
        Err(e) => {
            println!("[CONNECTION] Error upgrading connection: {}", e);
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
                println!("[CONNECTION] Error sending message: {}", e);
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
                    println!("[MESSAGE] Received raw message: {}", text);
                    
                    if let Ok(game_message) = serde_json::from_str::<GameMessage>(text) {
                        println!("[MESSAGE] Parsed game message type: {}", game_message.r#type);
                        
                        match game_message.r#type.as_str() {
                            "PLAYER_JOIN" => {
                                println!("[PLAYER] Processing PLAYER_JOIN message: {:?}", game_message.data);
                                if let Ok(player_data) = serde_json::from_value::<Player>(game_message.data.clone()) {
                                    println!("[PLAYER] Successfully parsed player data: {:?}", player_data);
                                    player_id = Some(player_data.id.clone());
                                    
                                    // Add player to game state
                                    {
                                        let mut state = game_state.lock().unwrap();
                                        state.insert(player_data.id.clone(), player_data.clone());
                                        println!("[GAME_STATE] Added player to state. Total players: {}", state.len());
                                    }
                                    
                                    // Add connection
                                    {
                                        let mut conns = connections.lock().unwrap();
                                        conns.insert(player_data.id.clone(), tx_clone.clone());
                                        println!("[CONNECTIONS] Added connection. Total connections: {}", conns.len());
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
                                        println!("[LOBBY] Sending lobby info to player: {}", response_text);
                                        let _ = tx_clone.send(Message::Text(response_text));
                                    }
                                } else {
                                    println!("[ERROR] Failed to parse PLAYER_JOIN data as Player struct: {:?}", game_message.data);
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
                                                    println!("[PLAYER] Updated player {} position to ({}, {})", pid, player.x, player.y);
                                                }
                                            }
                                        }
                                    }
                                    
                                    // Broadcast position update to other players
                                    broadcast_to_others(&connections, &game_message, pid).await;
                                }
                            }
                            "GAME_START" => {
                                println!("[GAME] Processing GAME_START message");
                                
                                // Broadcast game start to all players
                                let game_start_message = GameMessage {
                                    r#type: "GAME_START".to_string(),
                                    data: serde_json::json!({
                                        "startedBy": "host",
                                        "timestamp": std::time::SystemTime::now()
                                            .duration_since(std::time::UNIX_EPOCH)
                                            .unwrap()
                                            .as_millis() as u64
                                    }),
                                    player_id: None,
                                    timestamp: std::time::SystemTime::now()
                                        .duration_since(std::time::UNIX_EPOCH)
                                        .unwrap()
                                        .as_millis() as u64,
                                    id: format!("msg_{}", uuid::Uuid::new_v4()),
                                };
                                
                                if let Ok(message_text) = serde_json::to_string(&game_start_message) {
                                    let conns = connections.lock().unwrap();
                                    for (player_id, tx) in conns.iter() {
                                        match tx.send(Message::Text(message_text.clone())) {
                                            Ok(_) => println!("[GAME] Sent game start to player {}", player_id),
                                            Err(e) => println!("[GAME] Failed to send game start to player {}: {}", player_id, e),
                                        }
                                    }
                                }
                            }
                            "HOST_READY" => {
                                println!("[HOST] Processing HOST_READY message: {:?}", game_message.data);
                                
                                // Broadcast host ready state to all players
                                broadcast_to_others(&connections, &game_message, &player_id.clone().unwrap_or_default()).await;
                            }
                            "PLAYER_LEAVE" => {
                                if let Some(pid) = &player_id {
                                    println!("[PLAYER] Player {} leaving", pid);
                                    // Remove player from state
                                    {
                                        let mut state = game_state.lock().unwrap();
                                        state.remove(pid);
                                        println!("[GAME_STATE] Removed player from state. Remaining players: {}", state.len());
                                    }
                                    
                                    // Remove connection
                                    {
                                        let mut conns = connections.lock().unwrap();
                                        conns.remove(pid);
                                        println!("[CONNECTIONS] Removed connection. Remaining connections: {}", conns.len());
                                    }
                                    
                                    // Broadcast updated player list
                                    broadcast_player_list(&game_state, &connections).await;
                                }
                                break;
                            }
                            _ => {
                                println!("[MESSAGE] Unhandled message type: {}", game_message.r#type);
                            }
                        }
                    } else {
                        println!("[ERROR] Failed to parse message as GameMessage: {}", text);
                    }
                }
            }
            Err(e) => {
                println!("[CONNECTION] Error receiving message: {}", e);
                break;
            }
        }
    }
    
    // Clean up on disconnect
    if let Some(pid) = player_id {
        println!("[CLEANUP] Cleaning up player {} on disconnect", pid);
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
    
    println!("[BROADCAST] Broadcasting player list with {} players: {:?}", players.len(), players);
    
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
        println!("[BROADCAST] Sending player list to {} connections", conns.len());
        for (player_id, tx) in conns.iter() {
            match tx.send(Message::Text(message_text.clone())) {
                Ok(_) => println!("[BROADCAST] Successfully sent to player {}", player_id),
                Err(e) => println!("[BROADCAST] Failed to send to player {}: {}", player_id, e),
            }
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
        println!("[BROADCAST] Broadcasting message to {} connections (excluding {})", conns.len() - 1, sender_id);
        for (player_id, tx) in conns.iter() {
            if player_id != sender_id {
                match tx.send(Message::Text(message_text.clone())) {
                    Ok(_) => println!("[BROADCAST] Successfully sent to player {}", player_id),
                    Err(e) => println!("[BROADCAST] Failed to send to player {}: {}", player_id, e),
                }
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, get_local_ip, start_game_server, stop_game_server])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
