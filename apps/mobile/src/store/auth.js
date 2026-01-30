"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthStore = void 0;
const zustand_1 = require("zustand");
const SecureStore = __importStar(require("expo-secure-store"));
const react_native_1 = require("react-native");
const storage = {
    async get(key) {
        if (react_native_1.Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        return SecureStore.getItemAsync(key);
    },
    async set(key, value) {
        if (react_native_1.Platform.OS === 'web') {
            localStorage.setItem(key, value);
            return;
        }
        await SecureStore.setItemAsync(key, value);
    },
    async remove(key) {
        if (react_native_1.Platform.OS === 'web') {
            localStorage.removeItem(key);
            return;
        }
        await SecureStore.deleteItemAsync(key);
    },
};
exports.useAuthStore = (0, zustand_1.create)((set) => ({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
    setAuth: async (user, token) => {
        await storage.set('token', token);
        await storage.set('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true, isLoading: false });
    },
    logout: async () => {
        await storage.remove('token');
        await storage.remove('user');
        set({ user: null, token: null, isAuthenticated: false });
    },
    loadToken: async () => {
        try {
            const token = await storage.get('token');
            const userStr = await storage.get('user');
            if (token && userStr) {
                const user = JSON.parse(userStr);
                set({ user, token, isAuthenticated: true, isLoading: false });
            }
            else {
                set({ isLoading: false });
            }
        }
        catch {
            set({ isLoading: false });
        }
    },
}));
//# sourceMappingURL=auth.js.map