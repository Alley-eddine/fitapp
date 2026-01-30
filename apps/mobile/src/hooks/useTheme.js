"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTheme = void 0;
const theme_1 = require("../constants/theme");
const theme_2 = require("../store/theme");
const useTheme = () => {
    const isDark = (0, theme_2.useThemeStore)((s) => s.isDark);
    return {
        isDark,
        colors: isDark ? theme_1.colors.dark : theme_1.colors.light,
    };
};
exports.useTheme = useTheme;
//# sourceMappingURL=useTheme.js.map