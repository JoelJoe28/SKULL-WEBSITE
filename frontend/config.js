// API Configuration for SKULL Frontend
// Replace YOUR_RENDER_URL with your actual Render backend URL

const API_CONFIG = {
    // Production backend URL (SKULL Backend on Render)
    PRODUCTION_URL: 'https://skull-backend.onrender.com',
    
    // Local development URL
    LOCAL_URL: 'http://localhost:5000',
    
    // Get current API base URL
    getApiBase: function() {
        // Check if we're in development or production
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return this.LOCAL_URL;
        }
        
        // For production, use the Render URL
        return this.PRODUCTION_URL;
    },
    
    // Get current environment
    getEnvironment: function() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'development';
        }
        return 'production';
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
} else {
    window.API_CONFIG = API_CONFIG;
}
