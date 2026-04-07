// Simple API Configuration for SKULL Frontend
const API_BASE_URL = 'https://skull-backend.onrender.com';

// Get authentication token from localStorage
function getToken() {
    return localStorage.getItem('skullToken');
}

// Set authentication token in localStorage
function setToken(token) {
    localStorage.setItem('skullToken', token);
}

// Clear authentication token
function clearToken() {
    localStorage.removeItem('skullToken');
    localStorage.removeItem('skullUser');
}

// Make API request with proper headers
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    // Add authorization header if token exists
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Request failed');
        }

        return { response, data };
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Login function
async function login(email, password) {
    try {
        const { response, data } = await apiRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        // Store token and user data
        if (data.token) {
            setToken(data.token);
            localStorage.setItem('skullUser', JSON.stringify(data.user));
        }

        return data;
    } catch (error) {
        console.error('Login failed:', error);
        throw error;
    }
}

// Register function
async function register(userData) {
    try {
        const { response, data } = await apiRequest('/api/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        // Store token and user data
        if (data.token) {
            setToken(data.token);
            localStorage.setItem('skullUser', JSON.stringify(data.user));
        }

        return data;
    } catch (error) {
        console.error('Registration failed:', error);
        throw error;
    }
}

// Get user profile
async function getProfile() {
    try {
        const { response, data } = await apiRequest('/api/profile');
        return data.user;
    } catch (error) {
        console.error('Profile fetch failed:', error);
        throw error;
    }
}

// Get user orders
async function getOrders() {
    try {
        const { response, data } = await apiRequest('/api/orders');
        return data.orders || [];
    } catch (error) {
        console.error('Orders fetch failed:', error);
        throw error;
    }
}

// Create order
async function createOrder(orderData) {
    try {
        const { response, data } = await apiRequest('/api/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
        return data.order;
    } catch (error) {
        console.error('Order creation failed:', error);
        throw error;
    }
}

// Handle API errors
function handleApiError(error, defaultMessage = 'An error occurred') {
    console.error('API Error:', error);
    
    // If token is invalid, clear it and redirect to login
    if (error.message.includes('token') || error.message.includes('Unauthorized') || error.message.includes('Invalid token')) {
        clearToken();
        window.location.href = 'login.html';
        return;
    }
    
    // Show user-friendly error message
    alert(error.message || defaultMessage);
}

// Check if user is authenticated
function isAuthenticated() {
    const token = getToken();
    const user = localStorage.getItem('skullUser');
    return !!(token && user);
}

// Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('skullUser');
    return userStr ? JSON.parse(userStr) : null;
}
