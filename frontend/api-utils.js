// API Utility Functions for SKULL Frontend
// Handles authentication, API calls, and error handling

class ApiUtils {
    constructor() {
        this.apiBase = this.getApiBase();
        this.token = localStorage.getItem('skullToken') || null;
    }

    // Get API base URL
    getApiBase() {
        if (window.API_CONFIG && typeof window.API_CONFIG.getApiBase === 'function') {
            return window.API_CONFIG.getApiBase();
        }
        
        // Fallback for development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:5000';
        }
        
        // Production fallback
        return window.location.origin.replace(/\/$/, '');
    }

    // Get authentication token
    getToken() {
        this.token = localStorage.getItem('skullToken');
        return this.token;
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('skullToken', token);
    }

    // Clear authentication token
    clearToken() {
        this.token = null;
        localStorage.removeItem('skullToken');
        localStorage.removeItem('skullUser');
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${this.apiBase}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add authorization header if token exists
        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Request failed');
            }

            return { response, data };
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    // POST request
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Authentication methods
    async login(email, password) {
        const { response, data } = await this.post('/api/login', { email, password });
        
        if (data.token) {
            this.setToken(data.token);
            localStorage.setItem('skullUser', JSON.stringify(data.user));
        }

        return data;
    }

    async register(userData) {
        const { response, data } = await this.post('/api/register', userData);
        
        if (data.token) {
            this.setToken(data.token);
            localStorage.setItem('skullUser', JSON.stringify(data.user));
        }

        return data;
    }

    async getProfile() {
        const { response, data } = await this.get('/api/profile');
        return data.user;
    }

    async updateProfile(userData) {
        const { response, data } = await this.put('/api/profile', userData);
        return data.user;
    }

    async getOrders() {
        const { response, data } = await this.get('/api/orders');
        return data.orders || [];
    }

    async getOrder(orderId) {
        const { response, data } = await this.get(`/api/orders/${orderId}`);
        return data.order;
    }

    async createOrder(orderData) {
        const { response, data } = await this.post('/api/orders', orderData);
        return data.order;
    }

    async cancelOrder(orderId) {
        const { response, data } = await this.post(`/api/orders/${orderId}/cancel`);
        return data.order;
    }

    async confirmPayment(orderId, transactionId) {
        const { response, data } = await this.post('/api/payment/confirm', { orderId, transactionId });
        return data.order;
    }

    // Handle API errors
    handleError(error, defaultMessage = 'An error occurred') {
        console.error('API Error:', error);
        
        if (error.message.includes('token') || error.message.includes('Unauthorized')) {
            this.clearToken();
            window.location.href = 'login.html';
            return;
        }

        return error.message || defaultMessage;
    }
}

// Create global instance
const api = new ApiUtils();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiUtils, api };
} else {
    window.ApiUtils = ApiUtils;
    window.api = api;
}
