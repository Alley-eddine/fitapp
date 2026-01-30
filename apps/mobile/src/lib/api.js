"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stepsApi = exports.weightApi = exports.workoutApi = exports.profileApi = exports.api = void 0;
const auth_1 = require("../store/auth");
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
class ApiClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        const token = auth_1.useAuthStore.getState().token;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }
    async request(endpoint, options = {}) {
        const { method = 'GET', body, headers = {} } = options;
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: { ...this.getHeaders(), ...headers },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({ error: 'Request failed' })));
            throw new Error(errorData.error ?? 'Request failed');
        }
        return response.json();
    }
    get(endpoint) {
        return this.request(endpoint);
    }
    post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body });
    }
    put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body });
    }
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}
exports.api = new ApiClient(API_URL);
exports.profileApi = {
    get: () => exports.api.get('/api/profile'),
    update: (data) => exports.api.put('/api/profile', data),
};
exports.workoutApi = {
    list: (days = 7) => exports.api.get(`/api/workouts?days=${String(days)}`),
    create: (data) => exports.api.post('/api/workouts', data),
    get: (id) => exports.api.get(`/api/workouts/${id}`),
    delete: (id) => exports.api.delete(`/api/workouts/${id}`),
    weeklyStats: () => exports.api.get('/api/workouts/stats/weekly'),
};
exports.weightApi = {
    list: (days = 30) => exports.api.get(`/api/weight?days=${String(days)}`),
    log: (weight) => exports.api.post('/api/weight', { weight }),
    latest: () => exports.api.get('/api/weight/latest'),
};
exports.stepsApi = {
    list: (days = 7) => exports.api.get(`/api/steps?days=${String(days)}`),
    log: (steps, goal) => exports.api.post('/api/steps', { steps, goal }),
    today: () => exports.api.get('/api/steps/today'),
};
//# sourceMappingURL=api.js.map