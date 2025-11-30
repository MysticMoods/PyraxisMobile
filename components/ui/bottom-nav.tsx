import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedView } from '@/components/themed-view';

type Props = {
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack: () => void;
  onForward: () => void;
  onHome: () => void;
  onTabSwitcher: () => void;
  onNewTab: () => void;
  onReload: () => void;
  onOverflow: () => void;
};

export function BottomNav({ canGoBack, canGoForward, onBack, onForward, onHome, onTabSwitcher, onNewTab, onReload, onOverflow }: Props) {
  const insets = useSafeAreaInsets();
  const iconColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');

  return (
    <ThemedView style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.row}>
        <TouchableOpacity onPress={onBack} disabled={!canGoBack} style={styles.iconButton} accessibilityLabel="Back">
          <Feather name="arrow-left" size={20} color={canGoBack ? iconColor : '#8a8a8a'} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onForward} disabled={!canGoForward} style={styles.iconButton} accessibilityLabel="Forward">
          <Feather name="arrow-right" size={20} color={canGoForward ? iconColor : '#8a8a8a'} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onHome} style={styles.iconButton} accessibilityLabel="Home">
          <Feather name="home" size={20} color={iconColor} />
        </TouchableOpacity>

        <View style={styles.spacer} />

        <TouchableOpacity onPress={onTabSwitcher} style={styles.iconButton} accessibilityLabel="Tabs">
          <Feather name="layers" size={20} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onNewTab} style={styles.iconButton} accessibilityLabel="New tab">
          <Feather name="plus" size={20} color={iconColor} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onReload} style={styles.iconButton} accessibilityLabel="Reload">
          <Feather name="rotate-ccw" size={20} color={iconColor} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onOverflow} style={styles.iconButton} accessibilityLabel="Menu">
          <Feather name="more-vertical" size={20} color={iconColor} />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a2a',
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  spacer: { flex: 1 },
});
