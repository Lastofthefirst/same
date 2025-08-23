/**
 * QR Code Generator for joining games
 * Generates QR codes containing PWA URL with game join information
 */

/**
 * Generate a join game URL for the PWA
 * @param {string} hostIp - IP address of the host
 * @param {number} port - Port number (defaults to game port)
 * @param {string} roomId - Optional room identifier
 * @param {string} pwaBaseUrl - Base URL of the PWA (dev server or deployed)
 * @returns {string} - Complete join URL
 */
export function generateJoinUrl(hostIp, port = 3847, roomId = null, pwaBaseUrl = 'http://localhost:5173') {
  const params = new URLSearchParams({
    host: hostIp,
    port: port.toString()
  });
  
  if (roomId) {
    params.set('room', roomId);
  }
  
  return `${pwaBaseUrl}/join?${params.toString()}`;
}

/**
 * Generate QR code data URL for joining a game
 * Uses a simple QR code generation approach
 * @param {string} joinUrl - The join URL to encode
 * @returns {string} - QR code as data URL
 */
export function generateQRCode(joinUrl) {
  // For now, we'll use a placeholder approach
  // In a real implementation, we'd use a QR code library like qrcode
  const encodedData = encodeURIComponent(joinUrl);
  
  // Return a placeholder data URL that indicates QR code generation
  // This will be replaced with actual QR generation when we add the library
  return `data:text/plain;charset=utf-8,QR_PLACEHOLDER:${encodedData}`;
}

/**
 * Create a simple text-based QR code alternative for development
 * @param {string} joinUrl - The join URL
 * @returns {string} - Human-readable join instructions
 */
export function generateJoinInstructions(joinUrl, agriculturalName = null) {
  const instructions = [];
  
  if (agriculturalName) {
    instructions.push(`🌾 Farm Code: ${agriculturalName}`);
  }
  
  instructions.push(`📱 Join URL: ${joinUrl}`);
  instructions.push(`💡 Or scan QR code to join the game`);
  
  return instructions.join('\n');
}

/**
 * Parse join parameters from URL
 * @param {string} url - Join URL or current page URL
 * @returns {object|null} - Parsed join parameters or null
 */
export function parseJoinUrl(url) {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    const host = params.get('host');
    const port = params.get('port');
    const room = params.get('room');
    
    if (!host || !port) {
      return null;
    }
    
    return {
      host,
      port: parseInt(port, 10),
      room: room || null,
      isValid: true
    };
  } catch (error) {
    return null;
  }
}

/**
 * Create shareable game information for display
 * @param {string} hostIp - Host IP address  
 * @param {number} port - Game port
 * @param {string} agriculturalName - Agricultural name for the network
 * @param {string} pwaBaseUrl - PWA base URL
 * @returns {object} - Shareable game info
 */
export function createShareableGameInfo(hostIp, port, agriculturalName, pwaBaseUrl) {
  const joinUrl = generateJoinUrl(hostIp, port, null, pwaBaseUrl);
  const qrCodeData = generateQRCode(joinUrl);
  const instructions = generateJoinInstructions(joinUrl, agriculturalName);
  
  return {
    hostIp,
    port,
    agriculturalName,
    joinUrl,
    qrCodeData,
    instructions,
    shortCode: agriculturalName || `${hostIp}:${port}`
  };
}