import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic feedback utilities for enhanced UX.
 * Provides consistent haptic patterns across the app.
 */

export const haptics = {
  /** Light tap - for selections, toggles */
  light: () => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },

  /** Medium tap - for button presses */
  medium: () => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },

  /** Heavy tap - for important actions, deletions */
  heavy: () => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },

  /** Success feedback - for completed actions */
  success: () => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },

  /** Warning feedback - for important alerts */
  warning: () => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },

  /** Error feedback - for errors and destructive actions */
  error: () => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },

  /** Selection changed - for picker/scroll selections */
  selection: () => {
    if (Platform.OS === 'web') return;
    Haptics.selectionAsync().catch(() => {});
  },
};

export function useHaptics() {
  return haptics;
}
