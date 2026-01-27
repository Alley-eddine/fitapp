import { colors } from '../constants/theme';
import { useThemeStore } from '../store/theme';

export const useTheme = () => {
  const isDark = useThemeStore((s) => s.isDark);
  return {
    isDark,
    colors: isDark ? colors.dark : colors.light,
  };
};
