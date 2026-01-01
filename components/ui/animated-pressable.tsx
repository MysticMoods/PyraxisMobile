import { haptics } from '@/hooks/use-haptics';
import React, { useRef } from 'react';
import {
    Animated,
    Pressable,
    PressableProps,
    StyleProp,
    ViewStyle,
} from 'react-native';

type ScaleLevel = 'subtle' | 'normal' | 'strong';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale level on press: subtle (0.98), normal (0.95), strong (0.92) */
  scaleLevel?: ScaleLevel;
  /** Whether to trigger haptic feedback */
  hapticFeedback?: boolean;
  /** Type of haptic to trigger */
  hapticType?: 'light' | 'medium' | 'heavy' | 'selection';
  children: React.ReactNode;
}

const scaleValues: Record<ScaleLevel, number> = {
  subtle: 0.98,
  normal: 0.95,
  strong: 0.92,
};

/**
 * An enhanced Pressable with smooth scale animation and optional haptic feedback.
 * Provides delightful micro-interactions for better UX.
 */
export function AnimatedPressable({
  style,
  scaleLevel = 'normal',
  hapticFeedback = true,
  hapticType = 'light',
  onPressIn,
  onPressOut,
  onPress,
  children,
  disabled,
  ...rest
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: any) => {
    if (hapticFeedback && !disabled) {
      haptics[hapticType]();
    }
    Animated.spring(scale, {
      toValue: scaleValues[scaleLevel],
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
    onPressOut?.(e);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/**
 * A TouchableOpacity-like component with spring animation.
 * Great for buttons and interactive elements.
 */
export function SpringButton({
  style,
  scaleLevel = 'normal',
  hapticFeedback = true,
  hapticType = 'medium',
  onPress,
  children,
  disabled,
  ...rest
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (hapticFeedback && !disabled) {
      haptics[hapticType]();
    }
    Animated.spring(scale, {
      toValue: scaleValues[scaleLevel],
      useNativeDriver: true,
      speed: 80,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 12,
    }).start();
  };

  const handlePress = (e: any) => {
    if (!disabled) {
      onPress?.(e);
    }
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      {...rest}
    >
      <Animated.View 
        style={[
          style, 
          { 
            transform: [{ scale }],
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
