"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useThemeStore = void 0;
const zustand_1 = require("zustand");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const react_native_1 = require("react-native");
const getIsDark = (mode) => {
    if (mode === 'system') {
        return react_native_1.Appearance.getColorScheme() === 'dark';
    }
    return mode === 'dark';
};
exports.useThemeStore = (0, zustand_1.create)((set) => ({
    mode: 'system',
    isDark: react_native_1.Appearance.getColorScheme() === 'dark',
    setMode: async (mode) => {
        await async_storage_1.default.setItem('themeMode', mode);
        set({ mode, isDark: getIsDark(mode) });
    },
    loadTheme: async () => {
        try {
            const stored = await async_storage_1.default.getItem('themeMode');
            if (stored) {
                const mode = stored;
                set({ mode, isDark: getIsDark(mode) });
            }
        }
        catch {
            // ignore
        }
    },
}));
//# sourceMappingURL=theme.js.map