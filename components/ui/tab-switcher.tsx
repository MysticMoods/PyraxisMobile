import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Text, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Tab = { id: string; url: string; title?: string; incognito?: boolean };

type Props = {
  visible: boolean;
  tabs: Tab[];
  activeTabId?: string;
  onClose: () => void;
  onSwitch: (id: string) => void;
  onCloseTab: (id: string) => void;
  onAddTab: () => void;
};

export function TabSwitcher({ visible, tabs, activeTabId, onClose, onSwitch, onCloseTab, onAddTab }: Props) {
  const insets = useSafeAreaInsets();
  const bg = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const cardBg = useThemeColor({ light: '#f2f2f2', dark: '#111' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <ThemedView style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouchable} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: bg }]}>
          <View style={styles.header}>
            <ThemedText style={[styles.headerText, { color: textColor }]}>Tabs</ThemedText>
            <TouchableOpacity onPress={onAddTab} style={styles.addButton} accessibilityLabel="New tab">
              <Feather name="plus" size={20} color={textColor} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.grid}>
            {tabs.map((t) => (
              <View key={t.id} style={[styles.card, { backgroundColor: cardBg }]}>
                <TouchableOpacity onPress={() => { onSwitch(t.id); onClose(); }} style={styles.cardContent}>
                  <Text numberOfLines={2} style={[styles.cardTitle, { color: textColor }]}>{t.title || t.url.replace(/^https?:\/\//, '')}</Text>
                  <Text numberOfLines={1} style={[styles.cardUrl, { color: textColor }]}>{t.url}</Text>
                </TouchableOpacity>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => onCloseTab(t.id)} style={styles.closeBtn} accessibilityLabel="Close tab">
                    <Feather name="x" size={18} color={textColor} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTouchable: { flex: 1 },
  sheet: { maxHeight: '85%', borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#222' },
  headerText: { fontSize: 18, fontWeight: '700' },
  addButton: { padding: 6 },
  grid: { padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '48%', borderRadius: 8, padding: 8, marginBottom: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  cardUrl: { fontSize: 12, opacity: 0.8 },
  cardActions: { position: 'absolute', top: 8, right: 8 },
  closeBtn: { padding: 6 },
});
