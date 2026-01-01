import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    DimensionValue,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * A shimmer skeleton loading placeholder.
 * Use for content that's loading.
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';

  const translateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [translateX]);

  const baseColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const shimmerColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [
              {
                translateX: translateX.interpolate({
                  inputRange: [-1, 1],
                  outputRange: [-200, 200],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', shimmerColor, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/**
 * A skeleton group for tab cards in the tab switcher.
 */
export function TabCardSkeleton() {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.tabCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
      <Skeleton width="100%" height={120} borderRadius={12} />
      <View style={styles.tabCardContent}>
        <Skeleton width="80%" height={16} borderRadius={6} />
        <Skeleton width="60%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

/**
 * A skeleton for list items.
 */
export function ListItemSkeleton() {
  return (
    <View style={styles.listItem}>
      <Skeleton width={44} height={44} borderRadius={12} />
      <View style={styles.listItemContent}>
        <Skeleton width="70%" height={16} borderRadius={6} />
        <Skeleton width="50%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 200,
    left: '50%',
  },
  tabCard: {
    width: '48%',
    borderRadius: 16,
    padding: 8,
    marginBottom: 12,
  },
  tabCardContent: {
    marginTop: 12,
    gap: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  listItemContent: {
    flex: 1,
  },
});
