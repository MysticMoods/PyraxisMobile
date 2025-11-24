import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Text,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColor } from '@/hooks/use-theme-color';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function BrowserScreen() {
  const webviewRef = useRef(null as any);
  const HOME = 'https://pyraxis.xo.je';

  // Tabs state: each tab keeps its own ref and url/history state
  const [tabs, setTabs] = useState(() => [
    { id: String(Date.now()), url: HOME, canGoBack: false, canGoForward: false, title: 'Home', ref: React.createRef<any>() },
  ]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [address, setAddress] = useState(HOME);
  const [currentUrl, setCurrentUrl] = useState(HOME);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const iconColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const inputBg = useThemeColor({ light: '#fff', dark: '#1e1e1e' }, 'background');
  const inputBorder = useThemeColor({ light: '#ddd', dark: '#333' }, 'icon');
  const webviewBg = useThemeColor({ light: '#fff', dark: '#000' }, 'background');

  function normalizeUrl(input: string) {
    const t = input.trim();
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t)) return t;
    return 'https://' + t;
  }

  function navigateTo(input: string) {
    const url = normalizeUrl(input);
    setAddress(url);
    setCurrentUrl(url);
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab?.ref?.current) {
      tab.ref.current.loadUrl?.(url);
      tab.ref.current.injectJavaScript?.('window.location = "' + url + '";');
    }
  }

  function onNavigationStateChange(navState: any) {
    // Update active tab state
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
    setAddress(navState.url);
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, url: navState.url, canGoBack: navState.canGoBack, canGoForward: navState.canGoForward } : t)));
  }

  function openInExternal() {
    const url = currentUrl || address;
    Linking.openURL(url).catch((e) => Alert.alert('Open failed', String(e)));
  }

  function addTab(url = HOME) {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 7);
    const ref = React.createRef<any>();
    const newTab = { id, url, canGoBack: false, canGoForward: false, title: 'New', ref };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
    setAddress(url);
    setCurrentUrl(url);
  }

  function closeTab(id: string) {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const next = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      if (id === activeTabId) {
        const newActive = next[idx] ?? next[idx - 1] ?? null;
        if (newActive) {
          setActiveTabId(newActive.id);
          setAddress(newActive.url);
          setCurrentUrl(newActive.url);
          setCanGoBack(!!newActive.canGoBack);
          setCanGoForward(!!newActive.canGoForward);
        } else {
          // no tabs left: create a fresh one
          const freshId = String(Date.now()) + 'f';
          const ref = React.createRef<any>();
          const fresh = { id: freshId, url: HOME, canGoBack: false, canGoForward: false, title: 'Home', ref };
          setActiveTabId(freshId);
          setAddress(HOME);
          setCurrentUrl(HOME);
          return [fresh];
        }
      }
      return next;
    });
  }

  function switchTab(id: string) {
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    setActiveTabId(id);
    setAddress(tab.url);
    setCurrentUrl(tab.url);
    setCanGoBack(!!tab.canGoBack);
    setCanGoForward(!!tab.canGoForward);
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: webviewBg }] }>
      <View style={[styles.addressBar, { paddingTop: (insets.top || 0) + 8, backgroundColor: webviewBg, zIndex: 10 }] }>
        <TouchableOpacity
          onPress={() => canGoBack && webviewRef.current?.goBack()}
          style={styles.iconButton}
          accessibilityLabel="Back"
          disabled={!canGoBack}
        >
          <Feather name="arrow-left" size={18} color={canGoBack ? iconColor : '#7f7f7f'} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => canGoForward && webviewRef.current?.goForward()}
          style={styles.iconButton}
          accessibilityLabel="Forward"
          disabled={!canGoForward}
        >
          <Feather name="arrow-right" size={18} color={canGoForward ? iconColor : '#7f7f7f'} />
        </TouchableOpacity>

        <TextInput
          value={address}
          onChangeText={setAddress}
          onSubmitEditing={(e) => navigateTo(e.nativeEvent.text)}
          placeholder="Enter URL or search"
          keyboardType="url"
          autoCapitalize="none"
          style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: iconColor }]}
          placeholderTextColor={inputBorder}
          returnKeyType="go"
        />

        <TouchableOpacity onPress={() => webviewRef.current?.reload()} style={styles.iconButton} accessibilityLabel="Reload">
          <Feather name="rotate-ccw" size={18} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity onPress={openInExternal} style={styles.iconButton} accessibilityLabel="Open external">
          <Feather name="external-link" size={18} color={iconColor} />
        </TouchableOpacity>
      </View>

      <View style={[styles.webviewContainer, { backgroundColor: webviewBg }] }>
        {loading && (
          <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <ActivityIndicator size="small" color={iconColor} />
            <ThemedText>Loading…</ThemedText>
          </View>
        )}
        {/* Render one WebView per tab and show only the active one. This preserves history per-tab. */}
        {tabs.map((t) => (
          <WebView
            key={t.id}
            originWhitelist={["*"]}
            source={{ uri: t.url }}
            ref={t.ref}
            startInLoadingState
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={onNavigationStateChange}
            style={[styles.webview, t.id === activeTabId ? {} : styles.hiddenWebview]}
            javaScriptEnabled
            domStorageEnabled
          />
        ))}
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom || 8 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabList}>
          {tabs.map((t) => (
            <View key={t.id} style={styles.tabItemContainer}>
              <TouchableOpacity onPress={() => switchTab(t.id)} style={[styles.tabItem, t.id === activeTabId ? styles.tabItemActive : undefined]}>
                <Text numberOfLines={1} style={[styles.tabText, t.id === activeTabId ? styles.tabTextActive : undefined]}>
                  {t.title || t.url.replace(/^https?:\/\//, '')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => closeTab(t.id)} style={styles.tabClose}>
                <Text style={styles.tabCloseText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => addTab()} style={styles.newTabButton}>
            <Text style={styles.newTabText}>＋</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: Platform.select({ web: 0, default: 1 }),
    borderColor: '#ddd',
    paddingHorizontal: 8,
    paddingVertical: Platform.select({ ios: 8, android: 6, web: 6 }),
    borderRadius: 6,
    minHeight: 36,
  },
  iconButton: { padding: 6 },
  webviewContainer: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 6,
    borderRadius: 6,
  },
  hiddenWebview: {
    display: 'none',
    height: 0,
    width: 0,
  },
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: '#222',
    backgroundColor: 'transparent',
  },
  tabList: {
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  tabItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#222',
    minWidth: 80,
  },
  tabItemActive: {
    backgroundColor: '#444',
  },
  tabText: {
    color: '#ddd',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  tabClose: {
    marginLeft: 6,
    padding: 6,
  },
  tabCloseText: {
    color: '#bbb',
    fontSize: 16,
  },
  newTabButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#0a7ea4',
  },
  newTabText: { color: '#fff', fontSize: 16 },
});
