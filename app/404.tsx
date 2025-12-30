import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

export default function NotFound() {
  const bg = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const text = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg }}>
      <Text style={{ color: text, fontSize: 28, fontWeight: '700', marginBottom: 8 }}>404</Text>
      <Text style={{ color: text, fontSize: 16, marginBottom: 16 }}>Page Not Found</Text>
      <TouchableOpacity onPress={() => { /* user can navigate home via router if desired */ }} style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#222' }}>
        <Text style={{ color: text }}>Go Home</Text>
      </TouchableOpacity>
    </ThemedView>
  );
}
