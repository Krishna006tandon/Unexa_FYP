// API Configuration
export const API_CONFIG = {
  // Auto-detect the best URL based on environment
  getApiUrl: () => {
    // For development, you may need to update this based on your network
    const developmentUrls = [
      "http://192.168.29.104:5000", // Current WiFi network
      "http://10.0.2.2:5000",      // Android emulator
      "http://localhost:5000",     // Local testing
    ];
    
    // Return the first configured URL
    return developmentUrls[0];
  },
  
  // Export the current API URL for backward compatibility
  API_URL: "http://192.168.29.104:5000"
};

// Export for backward compatibility
export const API_URL = API_CONFIG.getApiUrl();
