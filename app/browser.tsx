import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { useThemeColor } from "@/hooks/use-theme-color";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomNav } from "@/components/ui/bottom-nav";
import { BottomSheetMenu } from "@/components/ui/bottom-sheet-menu";
import { TabSwitcher } from "@/components/ui/tab-switcher";

export default function BrowserScreen() {
    const HOME = "https://pyraxis.xo.je";
    // Tabs state: each tab keeps its own ref and url/history state
    const [tabs, setTabs] = useState(() => [
        {
            id: String(Date.now()),
            url: HOME,
            canGoBack: false,
            canGoForward: false,
            title: "Home",
            ref: React.createRef<any>(),
            incognito: false,
            desktop: false,
        },
    ]);
    const [activeTabId, setActiveTabId] = useState(tabs[0].id);
    const [address, setAddress] = useState(HOME);
    const [currentUrl, setCurrentUrl] = useState(HOME);
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [loading, setLoading] = useState(false);
    const insets = useSafeAreaInsets();

    const iconColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
    const inputBg = useThemeColor(
        { light: "#fff", dark: "#1e1e1e" },
        "background"
    );
    const inputBorder = useThemeColor({ light: "#ddd", dark: "#333" }, "icon");
    const webviewBg = useThemeColor(
        { light: "#fff", dark: "#000" },
        "background"
    );

    function isProbablyUrl(t: string) {
        // Heuristics: has scheme OR looks like domain.tld OR contains a dot with no spaces
        if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t)) return true;
        if (t.includes(" ")) return false;
        // domain.tld or localhost or ip
        if (/^([\w-]+\.)+[a-zA-Z]{2,}$/.test(t)) return true;
        if (/^localhost(?::\d+)?(\/|$)/.test(t)) return true;
        if (/^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(\/|$)/.test(t)) return true;
        return false;
    }

    function parseInputToUrl(input: string) {
        const t = input.trim();
        if (!t) return HOME;
        if (isProbablyUrl(t)) {
            if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t)) return t;
            return "https://" + t;
        }
        // Treat as search query
        const q = encodeURIComponent(t);
        return `https://www.google.com/search?q=${q}`;
    }

    function navigateTo(input: string) {
        const url = parseInputToUrl(input);
        setAddress(url);
        setCurrentUrl(url);
        const tab = tabs.find((t) => t.id === activeTabId);
        if (tab?.ref?.current) {
            tab.ref.current.loadUrl?.(url);
            tab.ref.current.injectJavaScript?.(
                'window.location = "' + url + '";'
            );
        }
    }

    function getActiveWebview() {
        const tab = tabs.find((t) => t.id === activeTabId);
        return tab?.ref?.current;
    }

    function goBackActive() {
        const w = getActiveWebview();
        w?.goBack();
    }

    function goForwardActive() {
        const w = getActiveWebview();
        w?.goForward();
    }

    function reloadActive() {
        const w = getActiveWebview();
        w?.reload();
    }

    function onNavigationStateChange(navState: any) {
        // Update active tab state
        setCanGoBack(navState.canGoBack);
        setCanGoForward(navState.canGoForward);
        setCurrentUrl(navState.url);
        setAddress(navState.url);
        setTabs((prev) =>
            prev.map((t) =>
                t.id === activeTabId
                    ? {
                          ...t,
                          url: navState.url,
                          canGoBack: navState.canGoBack,
                          canGoForward: navState.canGoForward,
                      }
                    : t
            )
        );
    }

    function openInExternal() {
        const url = currentUrl || address;
        Linking.openURL(url).catch((e) =>
            Alert.alert("Open failed", String(e))
        );
    }

    function addTab(url = HOME, options?: { incognito?: boolean }) {
        const currentIsIncog = tabs.find((t) => t.id === activeTabId)?.incognito;
        const isIncog = options?.incognito ?? !!currentIsIncog;
        const incogUrl = "https://pyraxis.rf.gd/incog.html";
        const initialUrl = isIncog ? incogUrl : url;
        const id = String(Date.now()) + Math.random().toString(36).slice(2, 7);
        const ref = React.createRef<any>();
        const newTab = {
            id,
            url: initialUrl,
            canGoBack: false,
            canGoForward: false,
            title: isIncog ? "Incognito" : "New",
            ref,
            incognito: isIncog,
            desktop: false,
        } as any;
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(id);
        setAddress(initialUrl);
        setCurrentUrl(initialUrl);
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
                    const freshId = String(Date.now()) + "f";
                    const ref = React.createRef<any>();
                    const fresh = {
                        id: freshId,
                        url: HOME,
                        canGoBack: false,
                        canGoForward: false,
                        title: "Home",
                        ref,
                        incognito: false,
                        desktop: false,
                    };
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

    // Bottom sheet (overflow menu) state
    const [sheetVisible, setSheetVisible] = useState(false);

    const [showTabSwitcher, setShowTabSwitcher] = useState(false);

    const [bookmarks, setBookmarks] = useState<string[]>([]);
    const [history, setHistory] = useState<Array<{ url: string; ts: number }>>(
        []
    );
    const [closedTabs, setClosedTabs] = useState<
        { id: string; url: string; title?: string }[]
    >([]);

    const [historyVisible, setHistoryVisible] = useState(false);
    const [bookmarksVisible, setBookmarksVisible] = useState(false);
    const [downloadsVisible, setDownloadsVisible] = useState(false);
    const [recentVisible, setRecentVisible] = useState(false);
    const [findVisible, setFindVisible] = useState(false);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [helpVisible, setHelpVisible] = useState(false);

    // Blocked domains should not be recorded in history or bookmarks
    const blockedDomains = useMemo(
        () => ["pyraxis.rf.gd", "pyraxis.xo.je"],
        []
    );

    // Persistence preference: keep history/bookmarks on device
    const [persistEnabled, setPersistEnabled] = useState<boolean>(true);

    // Load settings and optionally persisted lists
    useEffect(() => {
        (async () => {
            try {
                const flag = await AsyncStorage.getItem("persistEnabled");
                const nextEnabled = flag === "true" ? true : flag === "false" ? false : true;
                setPersistEnabled(nextEnabled);
                if (nextEnabled) {
                    const [h, b] = await Promise.all([
                        AsyncStorage.getItem("history"),
                        AsyncStorage.getItem("bookmarks"),
                    ]);
                    if (h) {
                        try {
                            const parsed = JSON.parse(h);
                            if (Array.isArray(parsed)) setHistory(parsed);
                        } catch {}
                    }
                    if (b) {
                        try {
                            const parsed = JSON.parse(b);
                            if (Array.isArray(parsed)) setBookmarks(parsed);
                        } catch {}
                    }
                }
            } catch {}
        })();
    }, []);

    // Persist changes when enabled
    useEffect(() => {
        if (!persistEnabled) return;
        AsyncStorage.setItem("history", JSON.stringify(history)).catch(() => {});
    }, [history, persistEnabled]);
    useEffect(() => {
        if (!persistEnabled) return;
        AsyncStorage.setItem("bookmarks", JSON.stringify(bookmarks)).catch(
            () => {}
        );
    }, [bookmarks, persistEnabled]);

    function addBookmark(url?: string, force: boolean = false) {
        const u = url || currentUrl || address;
        if (!u) return;
        try {
            const host = new URL(u).host;
            if (!force && blockedDomains.some((d) => host.includes(d))) return;
        } catch {}
        setBookmarks((prev) => (prev.includes(u) ? prev : [u, ...prev]));
    }

    function pushHistory(url?: string) {
        const u = url || currentUrl || address;
        if (!u) return;
        // Do not record history for incognito tabs
        const activeTab = tabs.find((t) => t.id === activeTabId);
        if (activeTab?.incognito) return;
        try {
            const host = new URL(u).host;
            if (blockedDomains.some((d) => host.includes(d))) return;
        } catch {}
        // Deduplicate history: keep only one entry per URL, most recent first
        setHistory((prev) => [{ url: u, ts: Date.now() }, ...prev.filter((h) => h.url !== u)]);
    }

    function handleOverflowAction(action: string, payload?: any) {
        // Implement the most useful actions
        switch (action) {
            case "new-tab":
                addTab();
                break;
            case "new-incognito-tab":
                // Explicitly create an incognito tab
                addTab(HOME, { incognito: true });
                // mark latest tab as incognito
                setTabs((prev) =>
                    prev.map((t, i) =>
                        i === prev.length - 1
                            ? { ...t, incognito: true, title: "Incognito" }
                            : t
                    )
                );
                break;
            case "history":
                setHistoryVisible(true);
                break;
            case "delete-browsing-data":
                setHistory([]);
                setBookmarks([]);
                Alert.alert("Browsing data deleted");
                break;
            case "downloads":
                setDownloadsVisible(true);
                break;
            case "bookmarks":
                setBookmarksVisible(true);
                break;
            case "add-bookmark":
                addBookmark();
                Alert.alert("Bookmark added", (currentUrl || address) ?? "");
                break;
            case "recent-tabs":
                setRecentVisible(true);
                break;
            case "share":
                {
                    const u = currentUrl || address;
                    if (u) Share.share({ message: u, url: u }).catch(() => {});
                }
                break;
            case "find-in-page":
                setFindVisible(true);
                break;
            case "add-to-home":
                // As an in-app alternative, add to bookmarks and confirm
                addBookmark();
                Alert.alert(
                    "Added to Home",
                    "Shortcut saved in bookmarks"
                );
                break;
            case "desktop-site":
                // payload is boolean
                setTabs((prev) =>
                    prev.map((t) =>
                        t.id === activeTabId ? { ...t, desktop: payload } : t
                    )
                );
                // Force reload to apply new UA
                setTimeout(() => reloadActive(), 50);
                break;
            case "settings":
                setSettingsVisible(true);
                break;
            case "help-feedback":
                setHelpVisible(true);
                break;
            default:
                console.log("Unhandled overflow action", action, payload);
        }
    }

    function onNavigationStateChangeWrap(navState: any) {
        onNavigationStateChange(navState);
        pushHistory(navState.url);
    }

    // Small helpers to record closed tabs for "recent tabs"
    const origCloseTab = closeTab;
    function closeTabAndRecord(id: string) {
        const t = tabs.find((x) => x.id === id);
        if (t)
            setClosedTabs((prev) => [
                { id: t.id, url: t.url, title: t.title },
                ...prev,
            ]);
        origCloseTab(id);
    }

    return (
        <ThemedView style={[styles.container, { backgroundColor: webviewBg }]}>
            <View
                style={[
                    styles.addressBar,
                    {
                        paddingTop: (insets.top || 0) + 8,
                        backgroundColor: webviewBg,
                        zIndex: 10,
                    },
                ]}
            >
                <TextInput
                    value={address}
                    onChangeText={setAddress}
                    onSubmitEditing={(e) => navigateTo(e.nativeEvent.text)}
                    placeholder="Enter URL or search"
                    keyboardType="url"
                    autoCapitalize="none"
                    style={[
                        styles.input,
                        {
                            backgroundColor: inputBg,
                            borderColor: inputBorder,
                            color: iconColor,
                        },
                    ]}
                    placeholderTextColor={inputBorder}
                    returnKeyType="go"
                />
                <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => {
                        addBookmark(undefined, true);
                        Alert.alert("Bookmark added", (currentUrl || address) ?? "");
                    }}
                    style={styles.iconButton}
                >
                    <Feather name="star" size={18} color={iconColor} />
                </TouchableOpacity>
            </View>

            <View
                style={[
                    styles.webviewContainer,
                    { backgroundColor: webviewBg },
                ]}
            >
                {loading && (
                    <View
                        style={[
                            styles.loadingOverlay,
                            { backgroundColor: "rgba(0,0,0,0.6)" },
                        ]}
                    >
                        <ActivityIndicator size="small" color={iconColor} />
                        <ThemedText>Loading…</ThemedText>
                    </View>
                )}
                {/* Render only the active tab's WebView to avoid layout splitting. */}
                {(() => {
                    const activeTab = tabs.find((t) => t.id === activeTabId);
                    if (!activeTab) return null;
                    const desktopUA =
                        Platform.select({
                            ios: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
                            android:
                                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            default:
                                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        }) || undefined;
                    return (
                        <WebView
                            key={activeTab.id}
                            originWhitelist={["*"]}
                            source={{ uri: activeTab.url }}
                            ref={activeTab.ref}
                            startInLoadingState
                            onLoadStart={() => setLoading(true)}
                            onLoadEnd={() => setLoading(false)}
                            onNavigationStateChange={
                                onNavigationStateChangeWrap
                            }
                            style={styles.webviewActive}
                            javaScriptEnabled
                            domStorageEnabled
                            userAgent={activeTab.desktop ? desktopUA : undefined}
                        />
                    );
                })()}
            </View>

            {/* Tab switcher modal */}
            <TabSwitcher
                visible={showTabSwitcher}
                tabs={tabs}
                activeTabId={activeTabId}
                onClose={() => setShowTabSwitcher(false)}
                onSwitch={(id) => switchTab(id)}
                onCloseTab={(id) => closeTabAndRecord(id)}
                onAddTab={() => addTab()}
                onAddIncognitoTab={() => addTab(HOME, { incognito: true })}
            />

            {/* Bottom navigation */}
            <BottomNav
                canGoBack={canGoBack}
                canGoForward={canGoForward}
                onBack={goBackActive}
                onForward={goForwardActive}
                onHome={() => navigateTo(HOME)}
                onTabSwitcher={() => setShowTabSwitcher(true)}
                onNewTab={() => addTab()}
                onReload={reloadActive}
                onOverflow={() => setSheetVisible(true)}
            />

            <BottomSheetMenu
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
                onAction={handleOverflowAction}
            />

            {/* History modal */}
            <Modal
                visible={historyVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setHistoryVisible(false)}
            >
                <ThemedView style={{ flex: 1, justifyContent: "flex-end" }}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => setHistoryVisible(false)}
                    />
                    <View
                        style={{
                            maxHeight: "60%",
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                            backgroundColor: webviewBg,
                        }}
                    >
                        <ScrollView>
                            {history.length === 0 ? (
                                <View style={{ padding: 12 }}>
                                    <Text style={{ color: iconColor }}>
                                        No history.
                                    </Text>
                                </View>
                            ) : (
                                history.map((h, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        onPress={() => {
                                            navigateTo(h.url);
                                            setHistoryVisible(false);
                                        }}
                                        style={{
                                            padding: 12,
                                            borderBottomWidth: 1,
                                            borderBottomColor: "#222",
                                        }}
                                    >
                                        <Text style={{ color: iconColor }}>
                                            {h.url}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </ThemedView>
            </Modal>

            {/* Bookmarks modal */}
            <Modal
                visible={bookmarksVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setBookmarksVisible(false)}
            >
                <ThemedView style={{ flex: 1, justifyContent: "flex-end" }}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => setBookmarksVisible(false)}
                    />
                    <View
                        style={{
                            maxHeight: "60%",
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                            backgroundColor: webviewBg,
                        }}
                    >
                        <ScrollView>
                            {bookmarks.length === 0 ? (
                                <View style={{ padding: 12 }}>
                                    <Text style={{ color: iconColor }}>
                                        No bookmarks.
                                    </Text>
                                </View>
                            ) : (
                                bookmarks.map((b, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        onPress={() => {
                                            navigateTo(b);
                                            setBookmarksVisible(false);
                                        }}
                                        style={{
                                            padding: 12,
                                            borderBottomWidth: 1,
                                            borderBottomColor: "#222",
                                        }}
                                    >
                                        <Text style={{ color: iconColor }}>
                                            {b}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </ThemedView>
            </Modal>

            {/* Downloads modal (placeholder) */}
            <Modal
                visible={downloadsVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setDownloadsVisible(false)}
            >
                <ThemedView style={{ flex: 1, justifyContent: "flex-end" }}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => setDownloadsVisible(false)}
                    />
                    <View
                        style={{
                            maxHeight: "40%",
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                            backgroundColor: webviewBg,
                            padding: 12,
                        }}
                    >
                        <Text style={{ color: iconColor }}>
                            No downloads yet.
                        </Text>
                    </View>
                </ThemedView>
            </Modal>

            {/* Recent tabs modal */}
            <Modal
                visible={recentVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setRecentVisible(false)}
            >
                <ThemedView style={{ flex: 1, justifyContent: "flex-end" }}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => setRecentVisible(false)}
                    />
                    <View
                        style={{
                            maxHeight: "60%",
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                            backgroundColor: webviewBg,
                        }}
                    >
                        <ScrollView>
                            {closedTabs.map((c, i) => (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => {
                                        addTab(c.url);
                                        setRecentVisible(false);
                                    }}
                                    style={{
                                        padding: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: "#222",
                                    }}
                                >
                                    <Text style={{ color: iconColor }}>
                                        {c.title || c.url}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </ThemedView>
            </Modal>

            {/* Find in page modal */}
            <Modal
                visible={findVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setFindVisible(false)}
            >
                <ThemedView style={{ flex: 1, justifyContent: "flex-end" }}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => setFindVisible(false)}
                    />
                    <View style={{ padding: 12, backgroundColor: webviewBg }}>
                        <TextInput
                            placeholder="Find in page"
                            placeholderTextColor={inputBorder}
                            style={[styles.input, { marginBottom: 8 }]}
                            onSubmitEditing={(e) => {
                                const q = e.nativeEvent.text.replace(
                                    /'/g,
                                    "\\'"
                                );
                                const js = `try{window.find('${q}');}catch(e){};true;`;
                                getActiveWebview()?.injectJavaScript?.(js);
                                setFindVisible(false);
                            }}
                        />
                    </View>
                </ThemedView>
            </Modal>

            {/* Settings modal (placeholder) */}
            <Modal
                visible={settingsVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setSettingsVisible(false)}
            >
                <ThemedView style={{ flex: 1, justifyContent: "flex-end" }}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => setSettingsVisible(false)}
                    />
                    <View
                        style={{
                            maxHeight: "40%",
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                            backgroundColor: webviewBg,
                            padding: 12,
                        }}
                    >
                        <Text style={{ color: iconColor, marginBottom: 8 }}>
                            Settings
                        </Text>
                        <TouchableOpacity
                            onPress={() =>
                                Alert.alert(
                                    "Translate",
                                    "Translate feature not implemented yet"
                                )
                            }
                            style={{
                                paddingVertical: 10,
                                paddingHorizontal: 12,
                                borderWidth: 1,
                                borderColor: "#222",
                                borderRadius: 8,
                                marginBottom: 12,
                            }}
                        >
                            <Text style={{ color: iconColor }}>
                                Translate (placeholder)
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={async () => {
                                const next = !persistEnabled;
                                setPersistEnabled(next);
                                try {
                                    await AsyncStorage.setItem(
                                        "persistEnabled",
                                        next ? "true" : "false"
                                    );
                                } catch {}
                            }}
                            style={{
                                paddingVertical: 10,
                                paddingHorizontal: 12,
                                borderWidth: 1,
                                borderColor: "#222",
                                borderRadius: 8,
                            }}
                        >
                            <Text style={{ color: iconColor }}>
                                {persistEnabled
                                    ? "Keep history on device: On"
                                    : "Keep history on device: Off"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ThemedView>
            </Modal>

            {/* Help & feedback modal */}
            <Modal
                visible={helpVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setHelpVisible(false)}
            >
                <ThemedView style={{ flex: 1, justifyContent: "flex-end" }}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => setHelpVisible(false)}
                    />
                    <View
                        style={{
                            maxHeight: "40%",
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                            backgroundColor: webviewBg,
                            padding: 16,
                        }}
                    >
                        <Text style={{ color: iconColor, fontWeight: "700", fontSize: 16, marginBottom: 6 }}>
                            Pyraxis Browser — Help & Feedback
                        </Text>
                        <Text style={{ color: iconColor, opacity: 0.9, marginBottom: 12 }}>
                            - Search from the address bar: type a query or URL.
                            {"\n"}- Use the menu to open new/Incognito tabs, bookmarks, history.
                            {"\n"}- "Add to Home" saves a shortcut in bookmarks.
                        </Text>
                        <View style={{ flexDirection: "row", gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => Linking.openURL("mailto:feedback@pyraxis.app?subject=Feedback")}
                                style={{ borderWidth: 1, borderColor: "#222", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
                            >
                                <Text style={{ color: iconColor }}>Send feedback</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => Linking.openURL("https://github.com/MysticMoods/PyraxisMobile/issues")}
                                style={{ borderWidth: 1, borderColor: "#222", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
                            >
                                <Text style={{ color: iconColor }}>Report an issue</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ThemedView>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    addressBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 6,
        gap: 8,
    },
    input: {
        flex: 1,
        borderWidth: Platform.select({ web: 0, default: 1 }),
        borderColor: "#ddd",
        paddingHorizontal: 8,
        paddingVertical: Platform.select({ ios: 8, android: 6, web: 6 }),
        borderRadius: 6,
        minHeight: 36,
    },
    iconButton: { padding: 6 },

    webviewContainer: {
        flex: 1,
        backgroundColor: "#fff",
        position: "relative",
    },
    webviewActive: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    },
    webviewHidden: {
        position: "absolute",
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: "none",
    },

    loadingOverlay: {
        position: "absolute",
        top: 8,
        right: 8,
        zIndex: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "rgba(255,255,255,0.9)",
        padding: 6,
        borderRadius: 6,
    },

    tabBar: {
        borderTopWidth: 1,
        borderTopColor: "#222",
        backgroundColor: "transparent",
    },
    tabList: {
        alignItems: "center",
        paddingHorizontal: 8,
        gap: 8,
    },
    tabItemContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 8,
    },
    tabItem: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: "#222",
        minWidth: 80,
    },
    tabItemActive: {
        backgroundColor: "#444",
    },
    tabText: {
        color: "#ddd",
    },
    tabTextActive: {
        color: "#fff",
        fontWeight: "600",
    },
    tabClose: {
        marginLeft: 6,
        padding: 6,
    },
    tabCloseText: {
        color: "#bbb",
        fontSize: 16,
    },
    newTabButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: "#0a7ea4",
    },
    newTabText: { color: "#fff", fontSize: 16 },
});
