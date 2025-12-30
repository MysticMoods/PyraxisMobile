import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onRetry?: () => void;
  onGoHome?: () => void;
};

export default function OfflinePage({ onRetry, onGoHome }: Props) {
  const bg = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const text = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg, padding: 20 }}>
      <Text style={{ color: text, fontSize: 22, fontWeight: '700', marginBottom: 8 }}>You{"'"}re offline</Text>
      <Text style={{ color: text, opacity: 0.9, marginBottom: 12, textAlign: 'center' }}>
        This content is available only when you{"'"}re connected to the internet.
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity onPress={() => onRetry?.()} style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#222', marginRight: 8 }}>
          <Text style={{ color: text }}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onGoHome?.()} style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#222' }}>
          <Text style={{ color: text }}>Go Home</Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}
