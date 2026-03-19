// API Configuration
export const API_CONFIG = {
  // Production URL for cloud deployment
  getApiUrl: () => {
    // For production, use the cloud backend URL
    return "https://unexa-fyp.onrender.com";
  },
  
  // Export the current API URL for backward compatibility
  API_URL: "https://unexa-fyp.onrender.com"
};

// Export for backward compatibility
export const API_URL = API_CONFIG.getApiUrl();
