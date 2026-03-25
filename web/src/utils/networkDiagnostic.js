// Network diagnostic utility
export const NetworkDiagnostic = {
  // Test API connectivity
  testApiConnection: async (apiUrl) => {
    try {
      console.log(`Testing connection to: ${apiUrl}`);
      const response = await fetch(`${apiUrl}/api/test`, { 
        method: 'GET',
        timeout: 5000 
      });
      const data = await response.json();
      console.log('API connection successful:', response.status, data);
      return { success: true, status: response.status, data };
    } catch (error) {
      console.error('API connection failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Test basic connectivity
  testBasicConnection: async (apiUrl) => {
    try {
      console.log(`Testing basic connection to: ${apiUrl}`);
      const response = await fetch(`${apiUrl}/`, { 
        method: 'GET',
        timeout: 5000 
      });
      const text = await response.text();
      console.log('Basic connection successful:', response.status, text);
      return { success: true, status: response.status, data: text };
    } catch (error) {
      console.error('Basic connection failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Get current device IP
  getDeviceIP: () => {
    // This would need to be implemented based on your network setup
    return 'Unknown';
  },

  // List possible API URLs for testing
  getPossibleUrls: () => [
    "http://192.168.29.104:5000", // Current WiFi
    "http://10.0.2.2:5000",      // Android emulator
    "http://localhost:5000",     // Local testing
    "http://127.0.0.1:5000",     // Localhost alternative
  ]
};
