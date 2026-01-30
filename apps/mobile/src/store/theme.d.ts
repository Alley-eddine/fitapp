type ThemeMode = 'light' | 'dark' | 'system';
interface ThemeState {
    mode: ThemeMode;
    isDark: boolean;
    setMode: (mode: ThemeMode) => Promise<void>;
    loadTheme: () => Promise<void>;
}
export declare const useThemeStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ThemeState>>;
export {};
//# sourceMappingURL=theme.d.ts.map