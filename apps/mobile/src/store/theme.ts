import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  loadTheme: () => Promise<void>;
}

const getIsDark = (mode: ThemeMode): boolean => {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark';
  }
  return mode === 'dark';
};

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  isDark: Appearance.getColorScheme() === 'dark',

  setMode: async (mode) => {
    await AsyncStorage.setItem('themeMode', mode);
    set({ mode, isDark: getIsDark(mode) });
  },

  loadTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem('themeMode');
      if (stored) {
        const mode = stored as ThemeMode;
        set({ mode, isDark: getIsDark(mode) });
      }
    } catch {
      // ignore
    }
  },
}));
