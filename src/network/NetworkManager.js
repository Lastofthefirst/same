import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

// Agricultural word mapping for IP addresses
const IP_WORD_MAP = {
  '192.168.0': 'farm',
  '192.168.1': 'barn',
  '10.0.0': 'field',
  '172.16': 'meadow',
  '127.0.0': 'home'
};

const LAST_OCTET_WORDS = [
  'soil', 'seed', 'corn', 'wheat', 'oats', 'bean', 'pea', 'herb',
  'tree', 'root', 'leaf', 'stem', 'crop', 'plot', 'acre', 'yard'
];

export default class NetworkManager {
  constructor(gameScene) {
    this.gameScene = gameScene;
    this.socket = null;
    this.isHost = false;
    this.playerId = uuidv4();
    this.roomCode = null;
  }

  // Convert IP address to agricultural words
  static ipToWords(ip) {
    const parts = ip.split('.');
    const networkPart = `${parts[0]}.${parts[1]}.${parts[2]}`;
    const hostPart = parseInt(parts[3]);
    
    const networkWord = IP_WORD_MAP[networkPart] || 'unknown';
    const hostWord = LAST_OCTET_WORDS[hostPart % LAST_OCTET_WORDS.length];
    
    return `${networkWord} ${hostWord}`;
  }

  // Convert agricultural words back to IP
  static wordsToIp(words) {
    const [networkWord, hostWord] = words.split(' ');
    
    // Find network part
    let networkPart = null;
    for (const [ip, word] of Object.entries(IP_WORD_MAP)) {
      if (word === networkWord) {
        networkPart = ip;
        break;
      }
    }
    
    if (!networkPart) return null;
    
    // Find host part
    const hostIndex = LAST_OCTET_WORDS.indexOf(hostWord);
    if (hostIndex === -1) return null;
    
    return `${networkPart}.${hostIndex + 1}`;
  }

  async startHost() {
    this.isHost = true;
    
    try {
      // Get local IP address
      const localIp = await this.getLocalIp();
      this.roomCode = NetworkManager.ipToWords(localIp);
      
      console.log(`Hosting game at: ${localIp}`);
      console.log(`Room code: ${this.roomCode}`);
      
      // For now, simulate hosting - in full implementation, 
      // this would start a Socket.IO server
      this.simulateHost();
      
      return this.roomCode;
    } catch (error) {
      console.error('Failed to start host:', error);
      throw error;
    }
  }

  async joinRoom(roomCode) {
    this.isHost = false;
    this.roomCode = roomCode;
    
    try {
      const targetIp = NetworkManager.wordsToIp(roomCode);
      if (!targetIp) {
        throw new Error('Invalid room code');
      }
      
      console.log(`Joining game at: ${targetIp}`);
      console.log(`Room code: ${roomCode}`);
      
      // For now, simulate joining - in full implementation,
      // this would connect to the Socket.IO server
      this.simulateJoin(targetIp);
      
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  }

  // Temporary simulation methods for development
  simulateHost() {
    console.log('Host simulation started');
    // In real implementation, this would use Tauri commands to start server
  }

  simulateJoin(targetIp) {
    console.log(`Client simulation: connecting to ${targetIp}`);
    // In real implementation, this would connect to the server
  }

  async getLocalIp() {
    // For development, return a simulated IP
    // In real implementation, this would use Tauri commands to get actual IP
    return '192.168.0.10';
  }

  sendPlayerUpdate(playerData) {
    if (this.socket) {
      this.socket.emit('player-update', {
        playerId: this.playerId,
        ...playerData
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}