import { createSignal } from "solid-js";
import { ipToAgricultural, agriculturalToIp } from "@shared/utils/ipMapping";

function JoinForm({ onJoin }) {
  const [farmCode, setFarmCode] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);
  const [inputMethod, setInputMethod] = createSignal('code'); // 'code' or 'ip'

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const code = farmCode().trim();
    if (!code) return;
    
    setIsLoading(true);
    
    try {
      let host, port = 3847;
      
      if (inputMethod() === 'code') {
        // Try to parse as agricultural code (e.g., "farm soil")
        const ip = agriculturalToIp(code);
        if (ip) {
          host = ip;
        } else {
          throw new Error('Invalid farm code. Please check the code and try again.');
        }
      } else {
        // Parse as IP:port format
        if (code.includes(':')) {
          [host, port] = code.split(':');
          port = parseInt(port, 10) || 3847;
        } else {
          host = code;
        }
        
        // Validate IP format
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(host)) {
          throw new Error('Invalid IP address format');
        }
      }
      
      onJoin({ host, port });
      
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setFarmCode(value);
    
    // Auto-detect input method
    if (value.includes('.') || value.includes(':')) {
      setInputMethod('ip');
    } else if (value.includes(' ') || /^[a-zA-Z]+$/.test(value)) {
      setInputMethod('code');
    }
  };

  const getPlaceholder = () => {
    return inputMethod() === 'code' 
      ? 'Enter farm code (e.g., "farm soil")'
      : 'Enter IP address (e.g., 192.168.0.10:3847)';
  };

  const getExample = () => {
    if (inputMethod() === 'code') {
      try {
        const example = ipToAgricultural('192.168.0.10');
        return `Example: "${example}"`;
      } catch {
        return 'Example: "farm soil"';
      }
    } else {
      return 'Example: 192.168.0.10 or 192.168.0.10:3847';
    }
  };

  return (
    <div class="card" style="max-width: 400px;">
      <h3>Join a Farm</h3>
      
      <form onSubmit={handleSubmit}>
        <div class="form-group">
          <label for="farmCode">Farm Code or IP Address</label>
          <input
            id="farmCode"
            type="text"
            value={farmCode()}
            onInput={handleInputChange}
            placeholder={getPlaceholder()}
            disabled={isLoading()}
            autocomplete="off"
          />
          <small style="color: rgba(255, 255, 255, 0.7); font-size: 0.875rem; margin-top: 0.25rem; display: block;">
            {getExample()}
          </small>
        </div>
        
        <div class="form-group" style="margin-bottom: 0;">
          <button 
            type="submit" 
            class="btn" 
            style="width: 100%;"
            disabled={isLoading() || !farmCode().trim()}
          >
            {isLoading() ? '🌱 Connecting...' : '🚀 Join Farm'}
          </button>
        </div>
      </form>
      
      <div style="margin-top: 1rem; text-align: center;">
        <p style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.7);">
          💡 Get the farm code from your Tauri app host or scan a QR code
        </p>
      </div>
    </div>
  );
}

export default JoinForm;