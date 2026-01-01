import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/hooks/use-haptics';
import { useThemeColor } from '@/hooks/use-theme-color';

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
  tabCount?: number;
  loading?: boolean;
};

interface NavButtonProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  disabled?: boolean;
  color: string;
  disabledColor: string;
  badge?: number;
  accessibilityLabel: string;
  isSpecial?: boolean;
}

function NavButton({ icon, onPress, disabled, color, disabledColor, badge, accessibilityLabel, isSpecial }: NavButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled) {
      haptics.light();
      Animated.spring(scale, {
        toValue: 0.85,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.iconButtonWrapper}
    >
      <Animated.View style={[styles.iconButton, { transform: [{ scale }] }]}>
        {isSpecial ? (
          <View style={styles.specialButton}>
            <Feather name={icon} size={18} color={disabled ? disabledColor : color} />
            {typeof badge === 'number' && badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <Feather name={icon} size={22} color={disabled ? disabledColor : color} />
            {typeof badge === 'number' && badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
              </View>
            )}
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function BottomNav({ 
  canGoBack, 
  canGoForward, 
  onBack, 
  onForward, 
  onHome, 
  onTabSwitcher, 
  onNewTab, 
  onReload, 
  onOverflow,
  tabCount = 1,
  loading = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  
  const iconColor = useThemeColor({ light: '#1F2937', dark: '#F9FAFB' }, 'text');
  const disabledColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)';
  const bgColor = isDark ? 'rgba(10,10,15,0.95)' : 'rgba(255,255,255,0.95)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8), borderTopColor: borderColor }]}>
      {/* Subtle gradient overlay */}
      <LinearGradient
        colors={isDark ? ['rgba(255,255,255,0.02)', 'transparent'] : ['rgba(0,0,0,0.02)', 'transparent']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      
      {/* Loading progress indicator */}
      {loading && (
        <View style={styles.progressContainer}>
          <LinearGradient
            colors={['#FF6B2C', '#14B8A6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressBar}
          />
        </View>
      )}

      <View style={[styles.row, { backgroundColor: bgColor }]}>
        {/* Navigation group */}
        <View style={styles.navGroup}>
          <NavButton
            icon="arrow-left"
            onPress={onBack}
            disabled={!canGoBack}
            color={iconColor}
            disabledColor={disabledColor}
            accessibilityLabel="Go back"
          />
          <NavButton
            icon="arrow-right"
            onPress={onForward}
            disabled={!canGoForward}
            color={iconColor}
            disabledColor={disabledColor}
            accessibilityLabel="Go forward"
          />
        </View>

        {/* Center home button */}
        <Pressable
          onPress={() => {
            haptics.medium();
            onHome();
          }}
          style={({ pressed }) => [
            styles.homeButton,
            { 
              transform: [{ scale: pressed ? 0.92 : 1 }],
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            },
          ]}
          accessibilityLabel="Go home"
          accessibilityRole="button"
        >
          <Feather name="home" size={20} color={iconColor} />
        </Pressable>

        {/* Actions group */}
        <View style={styles.actionsGroup}>
          <NavButton
            icon="layers"
            onPress={onTabSwitcher}
            color={iconColor}
            disabledColor={disabledColor}
            accessibilityLabel="Tab switcher"
          />
          <NavButton
            icon="plus"
            onPress={onNewTab}
            color={iconColor}
            disabledColor={disabledColor}
            accessibilityLabel="New tab"
          />
          <NavButton
            icon={loading ? 'x' : 'rotate-ccw'}
            onPress={onReload}
            color={iconColor}
            disabledColor={disabledColor}
            accessibilityLabel={loading ? 'Stop loading' : 'Reload page'}
          />
          <NavButton
            icon="more-vertical"
            onPress={onOverflow}
            color={iconColor}
            disabledColor={disabledColor}
            accessibilityLabel="More options"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    width: '30%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButtonWrapper: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  specialButton: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'currentColor',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButton: {
    marginHorizontal: 8,
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#14B8A6',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
