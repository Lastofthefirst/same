/**
 * IP to Agricultural Words Mapping
 * Converts IP addresses to memorable farming-themed names
 * Example: 192.168.0.10 -> "farm soil"
 */

// Common agricultural words mapped to IP segments
const IP_SEGMENT_WORDS = {
  // 192.168.0.x mapping - most common
  '192.168.0': 'farm',
  '192.168.1': 'field',
  '192.168.2': 'pasture', 
  '192.168.3': 'meadow',
  '192.168.4': 'orchard',
  '192.168.5': 'garden',
  '192.168.10': 'ranch',
  '192.168.11': 'barn',
  
  // 10.0.0.x mapping
  '10.0.0': 'grove',
  '10.0.1': 'creek',
  '10.1.0': 'valley',
  '10.1.1': 'ridge',
  
  // Other common ranges
  '172.16.0': 'prairie',
  '172.16.1': 'woodland'
};

const HOST_WORDS = {
  // Simple words for low numbers (most common)
  1: 'seed', 2: 'soil', 3: 'root', 4: 'leaf', 5: 'stem',
  6: 'corn', 7: 'bean', 8: 'pea', 9: 'oat', 10: 'hay',
  11: 'rice', 12: 'wheat', 13: 'barley', 14: 'rye', 15: 'millet',
  16: 'apple', 17: 'pear', 18: 'plum', 19: 'cherry', 20: 'berry',
  
  // More specific words for higher numbers
  21: 'carrot', 22: 'beet', 23: 'radish', 24: 'turnip', 25: 'onion',
  26: 'garlic', 27: 'leek', 28: 'chive', 29: 'mint', 30: 'sage',
  31: 'thyme', 32: 'basil', 33: 'dill', 34: 'fennel', 35: 'cumin',
  36: 'pepper', 37: 'tomato', 38: 'squash', 39: 'pumpkin', 40: 'melon',
  
  // Extended vocabulary for higher IPs
  50: 'tractor', 51: 'plow', 52: 'harrow', 53: 'seeder', 54: 'reaper',
  55: 'thresh', 56: 'cultivator', 57: 'sprayer', 58: 'mower', 59: 'rake',
  60: 'shovel', 61: 'hoe', 62: 'spade', 63: 'fork', 64: 'scythe',
  
  // Animals and farm life
  70: 'cow', 71: 'pig', 72: 'sheep', 73: 'goat', 74: 'horse',
  75: 'chicken', 76: 'duck', 77: 'goose', 78: 'turkey', 79: 'rabbit',
  80: 'bee', 81: 'butterfly', 82: 'ladybug', 83: 'worm', 84: 'cricket',
  
  // Weather and seasons
  90: 'rain', 91: 'sun', 92: 'wind', 93: 'frost', 94: 'dew',
  95: 'spring', 96: 'summer', 97: 'autumn', 98: 'winter', 99: 'harvest',
  
  // Fallback for very high numbers
  100: 'granary', 150: 'silo', 200: 'windmill', 250: 'greenhouse'
};

/**
 * Convert IP address to agricultural words
 * @param {string} ipAddress - IP address like "192.168.0.10"
 * @returns {string} - Agricultural name like "farm soil"
 */
export function ipToAgricultural(ipAddress) {
  const parts = ipAddress.split('.');
  if (parts.length !== 4) {
    throw new Error('Invalid IP address format');
  }
  
  const networkPart = parts.slice(0, 3).join('.');
  const hostPart = parseInt(parts[3], 10);
  
  // Get network word
  const networkWord = IP_SEGMENT_WORDS[networkPart] || 'field';
  
  // Get host word
  let hostWord = HOST_WORDS[hostPart];
  
  // Fallback for numbers not in our map
  if (!hostWord) {
    if (hostPart > 250) hostWord = 'greenhouse';
    else if (hostPart > 200) hostWord = 'windmill'; 
    else if (hostPart > 150) hostWord = 'silo';
    else if (hostPart > 100) hostWord = 'granary';
    else {
      // Generate a compound word for unmapped numbers
      const base = Math.floor(hostPart / 10);
      const remainder = hostPart % 10;
      const baseWords = ['crop', 'plot', 'acre', 'lot', 'patch'];
      const modWords = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
      hostWord = remainder === 0 ? baseWords[base % baseWords.length] : 
                 `${baseWords[base % baseWords.length]}${modWords[remainder - 1]}`;
    }
  }
  
  return `${networkWord} ${hostWord}`;
}

/**
 * Convert agricultural words back to IP address
 * @param {string} agriculturalName - Agricultural name like "farm soil"
 * @returns {string|null} - IP address or null if not found
 */
export function agriculturalToIp(agriculturalName) {
  const [networkWord, hostWord] = agriculturalName.toLowerCase().split(' ');
  
  // Find network part
  let networkPart = null;
  for (const [ip, word] of Object.entries(IP_SEGMENT_WORDS)) {
    if (word === networkWord) {
      networkPart = ip;
      break;
    }
  }
  
  if (!networkPart) {
    return null; // Network word not found
  }
  
  // Find host part
  let hostPart = null;
  for (const [num, word] of Object.entries(HOST_WORDS)) {
    if (word === hostWord) {
      hostPart = num;
      break;
    }
  }
  
  if (hostPart === null) {
    return null; // Host word not found
  }
  
  return `${networkPart}.${hostPart}`;
}

/**
 * Get all available network names
 * @returns {string[]} - Array of network words
 */
export function getAvailableNetworks() {
  return Object.values(IP_SEGMENT_WORDS);
}

/**
 * Suggest agricultural name for an IP
 * @param {string} ipAddress - IP address
 * @returns {object} - {name: string, isCommon: boolean}
 */
export function suggestAgricultural(ipAddress) {
  const name = ipToAgricultural(ipAddress);
  const parts = ipAddress.split('.');
  const networkPart = parts.slice(0, 3).join('.');
  const hostPart = parseInt(parts[3], 10);
  
  // Consider common if it's a typical home network range and low host number
  const isCommon = (networkPart.startsWith('192.168') || networkPart.startsWith('10.0')) && hostPart <= 50;
  
  return { name, isCommon };
}