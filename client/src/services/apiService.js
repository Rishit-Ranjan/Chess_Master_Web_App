import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Fetches a user profile by their ID.
 * @param {number} userId The ID of the user.
 * @returns {Promise<Object>} The user profile data.
 */
export const getUserProfile = (userId) => {
    return apiClient.get(`/users/${userId}`);
};

/**
 * Updates a user's profile.
 * @param {number} userId The ID of the user.
 * @param {Object} profileData The data to update (e.g., { name, avatar }).
 * @returns {Promise<Object>} The server response.
 */
export const updateUserProfile = (userId, profileData) => {
        return apiClient.put(`/users/${userId}`, profileData);
};

/**
 * Registers a new user.
 * @param {Object} userData The user's data (e.g., { name, password }).
 * @returns {Promise<Object>} The server response.
 */
export const registerUser = (userData) => {
    return apiClient.post('/users/register', userData);
};

/**
 * Logs in an existing user.
 * @param {Object} credentials The user's credentials (e.g., { name, password }).
 * @returns {Promise<Object>} The user profile data.
 */
export const loginUser = (credentials) => {
    return apiClient.post('/users/login', credentials);
};

