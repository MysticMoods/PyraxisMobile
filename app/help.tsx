import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HelpPage() {
  const bg = useThemeColor({ light: '#f7f9fc', dark: '#0b0c0d' }, 'background');
  const card = useThemeColor({ light: '#fff', dark: '#111' }, 'background');
  const text = useThemeColor({ light: '#111', dark: '#fff' }, 'text');
  const subtle = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const border = useThemeColor({ light: '#e6e9ef', dark: '#1f2937' }, 'icon');
  const toastBg = useThemeColor({ light: '#111', dark: '#111' }, 'background');
  const toastText = useThemeColor({ light: '#fff', dark: '#fff' }, 'text');
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIcon, setToastIcon] = useState<React.ComponentProps<typeof Feather>['name']>('check');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string, icon?: React.ComponentProps<typeof Feather>['name']) => {
    if (icon) setToastIcon(icon);
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 1800);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  async function submit() {
    if (!message.trim()) return showToast('Please enter a message', 'alert-circle');
    setSending(true);
    try {
      const existing = await AsyncStorage.getItem('feedbacks');
      const arr = existing ? JSON.parse(existing) : [];
      arr.unshift({ name, email, message, ts: Date.now() });
      await AsyncStorage.setItem('feedbacks', JSON.stringify(arr));
      setName(''); setEmail(''); setMessage('');
      showToast('Feedback saved locally', 'check');
    } catch {
      showToast('Could not save feedback', 'alert-circle');
    } finally { setSending(false); }
  }

  function openMail() {
    Linking.openURL('mailto:pyraxis.official@gmail.com?subject=Pyraxis%20Feedback').catch(() => showToast('Could not open mail client', 'alert-circle'));
  }

  function openGithub() {
    Linking.openURL('https://github.com/pyraxis.official/PyraxisMobile/issues').catch(() => showToast('Could not open browser', 'alert-circle'));
  }

  return (
    <ThemedView style={{ flex: 1, backgroundColor: bg }}>
      {!!toastMessage && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            top: (insets.top || 0) + 12,
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <View
            style={{
              backgroundColor: toastBg,
              borderRadius: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              maxWidth: '100%',
              opacity: 0.94,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Feather name={toastIcon} size={16} color={toastText} />
            <Text style={{ color: toastText, fontWeight: '600' }}>{toastMessage}</Text>
          </View>
        </View>
      )}
      <View style={{ paddingTop: (insets.top || 12) + 8, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: bg }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
          <Feather name="chevron-left" size={22} color={text} />
        </TouchableOpacity>
        <View>
          <Text style={{ color: text, fontSize: 20, fontWeight: '700' }}>Help & Feedback</Text>
          <Text style={{ color: subtle, fontSize: 13 }}>Report bugs, get support, or suggest features</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border, marginBottom: 14 }}>
          <Text style={{ color: text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Quick Troubleshooting</Text>
          <Text style={{ color: subtle, marginBottom: 6 }}>• Page not loading? Try Reload or check network.</Text>
          <Text style={{ color: subtle, marginBottom: 6 }}>• Downloads not showing? Look in the downloads menu.</Text>
          <Text style={{ color: subtle }}>• Incognito tabs {"don't"} save history or bookmarks.</Text>
        </View>

        <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border, marginBottom: 16 }}>
          <Text style={{ color: text, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Send Feedback</Text>
          <Text style={{ color: subtle, marginBottom: 12 }}>
            Tell us {"what's"} broken or what {"you'd"} like to see. Fields are optional although a short message helps us respond faster.
          </Text>

          <Text style={{ color: subtle, marginBottom: 6 }}>Name</Text>
          <TextInput value={name} onChangeText={setName} placeholder='Your name (optional)' placeholderTextColor={border} style={{ borderWidth: 1, borderColor: border, padding: 10, borderRadius: 8, color: text, marginBottom: 12 }} />

          <Text style={{ color: subtle, marginBottom: 6 }}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder='you@example.com (optional)' placeholderTextColor={border} keyboardType='email-address' style={{ borderWidth: 1, borderColor: border, padding: 10, borderRadius: 8, color: text, marginBottom: 12 }} />

          <Text style={{ color: subtle, marginBottom: 6 }}>Message</Text>
          <TextInput value={message} onChangeText={setMessage} placeholder='Describe the issue or suggestion' placeholderTextColor={border} multiline style={{ borderWidth: 1, borderColor: border, padding: 10, borderRadius: 8, color: text, minHeight: 120, textAlignVertical: 'top', marginBottom: 12 }} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={submit} disabled={sending} style={{ flex: 1, backgroundColor: '#0a7ea4', padding: 12, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>{sending ? 'Saving…' : 'Save feedback'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openMail} style={{ flex: 1, borderWidth: 1, borderColor: border, padding: 12, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: text, fontWeight: '600' }}>Email us</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
          <Text style={{ color: text, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Report an Issue</Text>
          <Text style={{ color: subtle, marginBottom: 12 }}>Prefer tracking on GitHub? Open an issue with steps to reproduce and any logs/screenshots.</Text>
          <TouchableOpacity onPress={openGithub} style={{ borderWidth: 1, borderColor: border, padding: 12, borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ color: text, fontWeight: '600' }}>Open GitHub Issues</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
