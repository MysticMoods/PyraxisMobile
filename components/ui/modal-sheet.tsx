import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/hooks/use-haptics';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  iconColor?: string;
  children: React.ReactNode;
  emptyState?: {
    icon: React.ComponentProps<typeof Feather>['name'];
    title: string;
    subtitle: string;
  };
  isEmpty?: boolean;
  headerAction?: {
    icon: React.ComponentProps<typeof Feather>['name'];
    onPress: () => void;
    label: string;
  };
}

export function ModalSheet({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  iconColor = '#FF6B2C',
  children,
  emptyState,
  isEmpty,
  headerAction,
}: ModalSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';

  const bg = isDark ? '#0A0A0F' : '#FFFFFF';
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)';

  const handleClose = () => {
    haptics.light();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: borderColor }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconCircle, { backgroundColor: `${iconColor}15` }]}>
                <Feather name={icon} size={18} color={iconColor} />
              </View>
              <View>
                <Text style={[styles.title, { color: textColor }]}>{title}</Text>
                {subtitle && (
                  <Text style={[styles.subtitle, { color: mutedColor }]}>{subtitle}</Text>
                )}
              </View>
            </View>
            <View style={styles.headerRight}>
              {headerAction && (
                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    headerAction.onPress();
                  }}
                  style={[styles.headerActionBtn, { backgroundColor: cardBg, borderColor }]}
                  accessibilityLabel={headerAction.label}
                >
                  <Feather name={headerAction.icon} size={16} color={mutedColor} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleClose}
                style={[styles.closeBtn, { backgroundColor: cardBg, borderColor }]}
                accessibilityLabel="Close"
              >
                <Feather name="x" size={18} color={textColor} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          {isEmpty && emptyState ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: `${iconColor}10` }]}>
                <Feather name={emptyState.icon} size={32} color={iconColor} />
              </View>
              <Text style={[styles.emptyTitle, { color: textColor }]}>{emptyState.title}</Text>
              <Text style={[styles.emptySubtitle, { color: mutedColor }]}>{emptyState.subtitle}</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.content} 
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  iconColor?: string;
  onPress: () => void;
  onDelete?: () => void;
  timestamp?: number;
}

export function ModalListItem({
  title,
  subtitle,
  icon = 'globe',
  iconColor = '#3B82F6',
  onPress,
  onDelete,
  timestamp,
}: ListItemProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)';

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [
        styles.listItem,
        { 
          backgroundColor: cardBg,
          borderColor,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.listItemIcon, { backgroundColor: `${iconColor}15` }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.listItemContent}>
        <Text numberOfLines={1} style={[styles.listItemTitle, { color: textColor }]}>
          {title}
        </Text>
        {(subtitle || timestamp) && (
          <View style={styles.listItemMeta}>
            {subtitle && (
              <Text numberOfLines={1} style={[styles.listItemSubtitle, { color: mutedColor }]}>
                {subtitle}
              </Text>
            )}
            {timestamp && (
              <Text style={[styles.listItemTime, { color: mutedColor }]}>
                {formatTime(timestamp)}
              </Text>
            )}
          </View>
        )}
      </View>
      {onDelete && (
        <TouchableOpacity
          onPress={() => {
            haptics.medium();
            onDelete();
          }}
          style={styles.deleteBtn}
          hitSlop={8}
        >
          <Feather name="trash-2" size={14} color={mutedColor} />
        </TouchableOpacity>
      )}
      <Feather name="chevron-right" size={16} color={mutedColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  listItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 8,
  },
  listItemSubtitle: {
    fontSize: 12,
    flex: 1,
  },
  listItemTime: {
    fontSize: 11,
  },
  deleteBtn: {
    padding: 6,
  },
});
