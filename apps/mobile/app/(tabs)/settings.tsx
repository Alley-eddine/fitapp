import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/store/auth';
import { useThemeStore } from '../../src/store/theme';
import { spacing, borderRadius, fontSize } from '../../src/constants/theme';

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setMode = useThemeStore((s) => s.setMode);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const toggleDarkMode = () => {
    void setMode(isDark ? 'light' : 'dark');
  };

  const getTierColor = () => {
    switch (user?.subscriptionTier) {
      case 'premium':
        return '#f59e0b';
      case 'pro':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{user?.name ? user.name.charAt(0) : 'U'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{user?.name || 'User'}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          </View>
          <View style={[styles.tierBadge, { backgroundColor: getTierColor() + '20' }]}>
            <Text style={[styles.tierText, { color: getTierColor() }]}>
              {user?.subscriptionTier ? user.subscriptionTier.toUpperCase() : 'FREE'}
            </Text>
          </View>
        </View>

        {/* Subscription */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUBSCRIPTION</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Pressable style={styles.menuItem}>
            <Ionicons name="star" size={22} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Upgrade to Pro</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.menuItem}>
            <Ionicons name="card" size={22} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Manage Subscription</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PREFERENCES</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.menuItem}>
            <Ionicons name="moon" size={22} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleDarkMode}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.menuItem}>
            <Ionicons name="notifications" size={22} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.menuItem}>
            <Ionicons name="language" size={22} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Language</Text>
            <Text style={[styles.menuValue, { color: colors.textSecondary }]}>English</Text>
          </Pressable>
        </View>

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCOUNT</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Pressable style={styles.menuItem}>
            <Ionicons name="person" size={22} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.menuItem}>
            <Ionicons name="fitness" size={22} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Fitness Goals</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.menuItem}>
            <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Privacy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Support */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUPPORT</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Pressable style={styles.menuItem}>
            <Ionicons name="help-circle" size={22} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Help Center</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.menuItem}>
            <Ionicons name="chatbubble" size={22} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Contact Us</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Logout */}
        <Pressable
          style={[styles.logoutButton, { backgroundColor: colors.error + '15' }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out" size={22} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.textSecondary }]}>FitCoach AI v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: fontSize.xl, fontWeight: '600' },
  profileInfo: { flex: 1, marginLeft: spacing.md },
  profileName: { fontSize: fontSize.lg, fontWeight: '600' },
  profileEmail: { fontSize: fontSize.sm, marginTop: 2 },
  tierBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  tierText: { fontSize: fontSize.xs, fontWeight: '700' },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  section: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  menuText: { flex: 1, fontSize: fontSize.md },
  menuValue: { fontSize: fontSize.md },
  divider: { height: 1, marginLeft: 54 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  logoutText: { fontSize: fontSize.md, fontWeight: '600' },
  version: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
