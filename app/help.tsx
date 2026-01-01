import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/hooks/use-haptics';
import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Accent colors
const ACCENT_ORANGE = '#FF6B2C';
const ACCENT_TEAL = '#14B8A6';
const ACCENT_PURPLE = '#8B5CF6';
const ACCENT_BLUE = '#3B82F6';

export default function HelpPage() {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Colors
  const bg = isDark ? '#0A0A0F' : '#F8FAFC';
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const text = isDark ? '#FFFFFF' : '#0F172A';
  const muted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    if (type === 'success') haptics.success();
    else haptics.error();

    Animated.spring(toastAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();

    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setToastMessage(null));
    }, 2200);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  async function submit() {
    if (!message.trim()) {
      showToast('Please enter a message', 'error');
      return;
    }
    setSending(true);
    try {
      const existing = await AsyncStorage.getItem('feedbacks');
      const arr = existing ? JSON.parse(existing) : [];
      arr.unshift({ name, email, message, ts: Date.now() });
      await AsyncStorage.setItem('feedbacks', JSON.stringify(arr));
      setName('');
      setEmail('');
      setMessage('');
      showToast('Feedback saved! Thank you.', 'success');
    } catch {
      showToast('Could not save feedback', 'error');
    } finally {
      setSending(false);
    }
  }

  function openMail() {
    haptics.light();
    Linking.openURL('mailto:pyraxis.official@gmail.com?subject=Pyraxis%20Feedback').catch(() =>
      showToast('Could not open mail client', 'error')
    );
  }

  function openGithub() {
    haptics.light();
    Linking.openURL('https://github.com/pyraxis.official/PyraxisMobile/issues').catch(() =>
      showToast('Could not open browser', 'error')
    );
  }

  const faqs = [
    {
      q: 'Page not loading?',
      a: 'Try tapping the reload button. If that doesn\'t work, check your internet connection or try a different network.',
      icon: 'wifi-off' as const,
    },
    {
      q: 'Downloads not showing?',
      a: 'Open the overflow menu (⋮) and tap "Downloads". All your downloaded files will appear there.',
      icon: 'download' as const,
    },
    {
      q: 'How does Incognito work?',
      a: 'Incognito tabs don\'t save your browsing history, cookies, or form data. When you close them, everything is gone.',
      icon: 'eye-off' as const,
    },
    {
      q: 'How to clear my data?',
      a: 'Go to Settings → Delete Browsing Data. This will clear your history, bookmarks, and saved tabs.',
      icon: 'trash-2' as const,
    },
  ];

  return (
    <ThemedView style={[styles.container, { backgroundColor: bg }]}>
      {/* Background gradient accents */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={[isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.05)', 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
        />
      </View>

      {/* Toast */}
      {!!toastMessage && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              top: Math.max(insets.top, 16) + 8,
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
                {
                  scale: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={toastType === 'success' ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.toastGradient}
          >
            <View style={styles.toastIcon}>
              <Feather
                name={toastType === 'success' ? 'check' : 'alert-circle'}
                size={14}
                color="#fff"
              />
            </View>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 12) + 8,
            borderBottomColor: cardBorder,
            backgroundColor: isDark ? 'rgba(10,10,15,0.8)' : 'rgba(248,250,252,0.8)',
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            haptics.light();
            router.back();
          }}
          style={styles.backBtn}
          hitSlop={12}
        >
          <View style={[styles.iconCircle, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Feather name="arrow-left" size={18} color={text} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LinearGradient
            colors={[ACCENT_PURPLE, ACCENT_BLUE]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerIconGradient}
          >
            <Feather name="help-circle" size={16} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={[styles.headerTitle, { color: text }]}>Help & Feedback</Text>
            <Text style={[styles.headerSubtitle, { color: muted }]}>We&apos;re here to help</Text>
          </View>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* FAQ Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="help-circle" size={14} color={muted} />
            <Text style={[styles.sectionTitle, { color: muted }]}>FREQUENTLY ASKED</Text>
          </View>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {faqs.map((faq, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  haptics.light();
                  setExpandedFaq(expandedFaq === i ? null : i);
                }}
                style={({ pressed }) => [
                  styles.faqItem,
                  i < faqs.length - 1 && { borderBottomWidth: 1, borderBottomColor: cardBorder },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={styles.faqHeader}>
                  <View style={[styles.faqIcon, { backgroundColor: `${ACCENT_PURPLE}15` }]}>
                    <Feather name={faq.icon} size={16} color={ACCENT_PURPLE} />
                  </View>
                  <Text style={[styles.faqQuestion, { color: text }]}>{faq.q}</Text>
                  <Feather
                    name={expandedFaq === i ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={muted}
                  />
                </View>
                {expandedFaq === i && (
                  <Text style={[styles.faqAnswer, { color: muted }]}>{faq.a}</Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="message-square" size={14} color={muted} />
            <Text style={[styles.sectionTitle, { color: muted }]}>SEND FEEDBACK</Text>
          </View>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.cardDescription, { color: muted }]}>
              Found a bug? Have a suggestion? Let us know!
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: muted }]}>Name (optional)</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={muted}
                style={[
                  styles.input,
                  { backgroundColor: inputBg, borderColor: cardBorder, color: text },
                ]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: muted }]}>Email (optional)</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={muted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.input,
                  { backgroundColor: inputBg, borderColor: cardBorder, color: text },
                ]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: muted }]}>Message</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Describe the issue or your idea..."
                placeholderTextColor={muted}
                multiline
                style={[
                  styles.textarea,
                  { backgroundColor: inputBg, borderColor: cardBorder, color: text },
                ]}
              />
            </View>

            <Pressable
              onPress={() => {
                haptics.medium();
                submit();
              }}
              disabled={sending}
              style={({ pressed }) => [
                styles.submitBtn,
                { opacity: pressed || sending ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={[ACCENT_PURPLE, ACCENT_BLUE]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtnGradient}
              >
                <Feather name="send" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>{sending ? 'Sending...' : 'Send Feedback'}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="zap" size={14} color={muted} />
            <Text style={[styles.sectionTitle, { color: muted }]}>QUICK ACTIONS</Text>
          </View>
          <View style={styles.quickActions}>
            <Pressable
              onPress={openMail}
              style={({ pressed }) => [
                styles.quickAction,
                { backgroundColor: cardBg, borderColor: cardBorder, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${ACCENT_ORANGE}15` }]}>
                <Feather name="mail" size={20} color={ACCENT_ORANGE} />
              </View>
              <Text style={[styles.quickActionTitle, { color: text }]}>Email Us</Text>
              <Text style={[styles.quickActionSubtitle, { color: muted }]}>Direct support</Text>
            </Pressable>

            <Pressable
              onPress={openGithub}
              style={({ pressed }) => [
                styles.quickAction,
                { backgroundColor: cardBg, borderColor: cardBorder, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${ACCENT_TEAL}15` }]}>
                <Ionicons name="logo-github" size={20} color={ACCENT_TEAL} />
              </View>
              <Text style={[styles.quickActionTitle, { color: text }]}>GitHub</Text>
              <Text style={[styles.quickActionSubtitle, { color: muted }]}>Report issues</Text>
            </Pressable>
          </View>
        </View>

        {/* Version info */}
        <View style={styles.versionInfo}>
          <Text style={[styles.versionText, { color: muted }]}>Pyraxis Mobile v3.0</Text>
          <Text style={[styles.versionSubtext, { color: muted }]}>Built With Heart, Built For Everyone.</Text>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {},
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 12,
  },
  headerIconGradient: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  faqItem: {
    paddingVertical: 14,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  faqIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    marginLeft: 44,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 12,
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  versionSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastGradient: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  toastIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
