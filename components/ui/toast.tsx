import { useColorScheme } from '@/hooks/use-color-scheme';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Image,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastIcon = React.ComponentProps<typeof Feather>['name'] | 'logo';
type ToastType = 'default' | 'success' | 'error' | 'warning';

interface ToastProps {
  visible: boolean;
  message: string;
  icon?: ToastIcon;
  type?: ToastType;
  /** Duration in ms, default 2000 */
  duration?: number;
  onHide?: () => void;
  /** Position: 'top' or 'bottom' */
  position?: 'top' | 'bottom';
}

const typeColors: Record<ToastType, { bg: readonly [string, string]; icon: string }> = {
  default: { bg: ['#1E1E24', '#15151A'] as const, icon: '#FFFFFF' },
  success: { bg: ['#065F46', '#064E3B'] as const, icon: '#34D399' },
  error: { bg: ['#991B1B', '#7F1D1D'] as const, icon: '#FCA5A5' },
  warning: { bg: ['#92400E', '#78350F'] as const, icon: '#FCD34D' },
};

const APP_LOGO = require('../../assets/images/app-icon-72.png');

export function Toast({
  visible,
  message,
  icon = 'check-circle',
  type = 'default',
  duration = 2000,
  onHide,
  position = 'bottom',
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';

  const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      // Reset values
      translateY.setValue(position === 'top' ? -50 : 50);
      opacity.setValue(0);
      scale.setValue(0.9);

      // Animate in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 10,
        }),
      ]).start();

      // Auto-hide
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: position === 'top' ? -50 : 50,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => onHide?.());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide, opacity, position, scale, translateY]);

  if (!visible) return null;

  const colors = typeColors[type];

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top'
          ? { top: Math.max(insets.top, 16) + 16 }
          : { bottom: Math.max(insets.bottom, 16) + 80 },
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={isDark ? colors.bg : ['#FFFFFF', '#F9FAFB'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.toast}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${colors.icon}20` }]}>
          {icon === 'logo' ? (
            <Image source={APP_LOGO} style={styles.logoIcon} />
          ) : (
            <Feather name={icon} size={18} color={colors.icon} />
          )}
        </View>
        <Text style={[styles.message, { color: isDark ? '#FFFFFF' : '#111827' }]} numberOfLines={2}>
          {message}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
});
