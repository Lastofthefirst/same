/**
 * Network utilities for multiplayer game communication
 */

// Default game port (uncommon to avoid conflicts)
export const GAME_PORT = 3847;

// Message types for game communication
export const MESSAGE_TYPES = {
  // Connection
  PLAYER_JOIN: 'player_join',
  PLAYER_LEAVE: 'player_leave',
  PLAYER_LIST: 'player_list',
  
  // Game state
  GAME_STATE: 'game_state',
  PLAYER_UPDATE: 'player_update',
  GAME_START: 'game_start',
  GAME_END: 'game_end',
  
  // Lobby
  LOBBY_INFO: 'lobby_info',
  ROOM_LIST: 'room_list',
  
  // Error handling
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong'
};

/**
 * Create a standardized message for network communication
 * @param {string} type - Message type from MESSAGE_TYPES
 * @param {object} data - Message payload
 * @param {string} playerId - Optional player ID
 * @returns {object} - Standardized message
 */
export function createMessage(type, data = {}, playerId = null) {
  return {
    type,
    data,
    playerId,
    timestamp: Date.now(),
    id: generateMessageId()
  };
}

/**
 * Generate a unique message ID
 * @returns {string} - Unique ID
 */
export function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique player ID
 * @returns {string} - Unique player ID
 */
export function generatePlayerId() {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Validate message structure
 * @param {object} message - Message to validate
 * @returns {boolean} - Whether message is valid
 */
export function validateMessage(message) {
  if (!message || typeof message !== 'object') {
    return false;
  }
  
  if (!message.type || !MESSAGE_TYPES[message.type.toUpperCase()]) {
    return false;
  }
  
  if (!message.timestamp || !message.id) {
    return false;
  }
  
  return true;
}

/**
 * Check if a URL/IP is reachable
 * @param {string} host - Host to check
 * @param {number} port - Port to check
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} - Whether host is reachable
 */
export async function isHostReachable(host, port = GAME_PORT, timeout = 5000) {
  try {
    // For browser environments, we can't directly ping, so we'll try a different approach
    if (typeof window !== 'undefined') {
      // Try to connect via WebSocket
      return new Promise((resolve) => {
        const ws = new WebSocket(`ws://${host}:${port}`);
        const timer = setTimeout(() => {
          ws.close();
          resolve(false);
        }, timeout);
        
        ws.onopen = () => {
          clearTimeout(timer);
          ws.close();
          resolve(true);
        };
        
        ws.onerror = () => {
          clearTimeout(timer);
          resolve(false);
        };
      });
    } else {
      // Node.js environment - could use actual network check
      return true; // Placeholder for server-side implementation
    }
  } catch (error) {
    return false;
  }
}

/**
 * Get local IP address (browser limitation - returns placeholder)
 * @returns {Promise<string>} - Local IP address or placeholder
 */
export async function getLocalIpAddress() {
  // Browser security limitations prevent direct IP detection
  // This would need to be implemented on the Tauri/server side
  return '192.168.0.10'; // Placeholder
}

/**
 * Create WebSocket connection with automatic reconnection
 * @param {string} url - WebSocket URL
 * @param {object} options - Connection options
 * @returns {object} - Enhanced WebSocket wrapper
 */
export function createReconnectingWebSocket(url, options = {}) {
  const {
    maxReconnectAttempts = 5,
    reconnectInterval = 1000,
    onMessage = () => {},
    onConnect = () => {},
    onDisconnect = () => {},
    onError = () => {}
  } = options;
  
  let ws = null;
  let reconnectAttempts = 0;
  let isIntentionallyClosed = false;
  
  const connect = () => {
    try {
      ws = new WebSocket(url);
      
      ws.onopen = () => {
        reconnectAttempts = 0;
        onConnect();
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessage(message);
        } catch (error) {
          onError(new Error('Failed to parse message'));
        }
      };
      
      ws.onclose = () => {
        onDisconnect();
        
        if (!isIntentionallyClosed && reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(connect, reconnectInterval * reconnectAttempts);
        }
      };
      
      ws.onerror = (error) => {
        onError(error);
      };
      
    } catch (error) {
      onError(error);
    }
  };
  
  // Public interface
  return {
    connect,
    
    send(data) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
        return true;
      }
      return false;
    },
    
    close() {
      isIntentionallyClosed = true;
      if (ws) {
        ws.close();
      }
    },
    
    get readyState() {
      return ws ? ws.readyState : WebSocket.CLOSED;
    },
    
    get isConnected() {
      return ws && ws.readyState === WebSocket.OPEN;
    }
  };
}