import { useColorScheme } from '@/hooks/use-color-scheme';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SpringButton } from './animated-pressable';

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Accent color for the icon background */
  accentColor?: string;
}

/**
 * A beautiful empty state component with entrance animation.
 * Use for empty lists, no results, etc.
 */
export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  accentColor = '#FF6B2C',
}: EmptyStateProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';

  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 6,
      }),
    ]).start();
  }, [opacity, scale, translateY]);

  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ scale }, { translateY }],
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${accentColor}15` }]}>
        <LinearGradient
          colors={[accentColor, `${accentColor}CC`]}
          style={styles.iconInner}
        >
          <Feather name={icon} size={32} color="#FFFFFF" />
        </LinearGradient>
      </View>

      <Text style={[styles.title, { color: textColor }]}>{title}</Text>

      {subtitle && (
        <Text style={[styles.subtitle, { color: mutedColor }]}>{subtitle}</Text>
      )}

      {actionLabel && onAction && (
        <SpringButton
          onPress={onAction}
          style={styles.actionButton}
          hapticType="medium"
        >
          <LinearGradient
            colors={[accentColor, `${accentColor}DD`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionGradient}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </LinearGradient>
        </SpringButton>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  actionButton: {
    marginTop: 24,
  },
  actionGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
