import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
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
import OfflinePage from './offline';

import { useThemeColor } from "@/hooks/use-theme-color";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomNav } from "@/components/ui/bottom-nav";
import { BottomSheetMenu } from "@/components/ui/bottom-sheet-menu";
import { TabSwitcher } from "@/components/ui/tab-switcher";

export default function BrowserScreen() {
    const HOME = "https://pyraxis.xo.je";

    const SEARCH_ENGINES = useMemo(
        () =>
            [
                {
                    id: "google" as const,
                    label: "Google",
                    buildUrl: (q: string) =>
                        `https://www.google.com/search?q=${encodeURIComponent(q)}`,
                },
                {
                    id: "duckduckgo" as const,
                    label: "DuckDuckGo",
                    buildUrl: (q: string) =>
                        `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
                },
                {
                    id: "bing" as const,
                    label: "Bing",
                    buildUrl: (q: string) =>
                        `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
                },
            ] as const,
        []
    );
    type SearchEngineId = (typeof SEARCH_ENGINES)[number]["id"];

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
    const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadStartedAtRef = useRef<number | null>(null);
    const insets = useSafeAreaInsets();
    const [bottomNavHeight, setBottomNavHeight] = useState(0);
    const [addressBarHeight, setAddressBarHeight] = useState(0);

    const APP_LOGO = useMemo(
        () => require("../assets/images/app-icon-72.png"),
        []
    );

    type ToastIcon = React.ComponentProps<typeof Feather>["name"] | "logo";

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastIcon, setToastIcon] = useState<ToastIcon>("bookmark");
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const showToast = (message: string, icon?: ToastIcon) => {
        if (icon) setToastIcon(icon);
        setToastMessage(message);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToastMessage(null), 1800);
    };

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
        };
    }, []);

    const clearLoadingTimer = () => {
        if (loadingTimerRef.current) {
            clearTimeout(loadingTimerRef.current);
            loadingTimerRef.current = null;
        }
    };

    const startLoadingFailsafe = () => {
        clearLoadingTimer();
        loadStartedAtRef.current = Date.now();
        // Failsafe: some sites can keep WebView callbacks from settling.
        loadingTimerRef.current = setTimeout(() => {
            setLoading(false);
            loadingTimerRef.current = null;
        }, 12000);
    };

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

    const toastBg = useThemeColor({ light: "#111", dark: "#111" }, "background");
    const toastText = useThemeColor({ light: "#fff", dark: "#fff" }, "text");

    const [searchEngine, setSearchEngine] = useState<SearchEngineId>("google");

    const [hydrated, setHydrated] = useState(false);

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
        const engine = SEARCH_ENGINES.find((e) => e.id === searchEngine);
        return (engine ?? SEARCH_ENGINES[0]).buildUrl(t);
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

    function closeTab(id: string, options?: { fromSwitcher?: boolean }) {
        setTabs((prev) => {
            const idx = prev.findIndex((t) => t.id === id);
            if (idx === -1) return prev;
            const next = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
            if (id === activeTabId) {
                // If the tab switcher is open, don't auto-switch while closing from it.
                if (options?.fromSwitcher && showTabSwitcher) {
                    if (next.length === 0) {
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
                    // Keep activeTabId as-is (may temporarily point to a closed tab)
                    // until the user selects/creates a tab or closes the switcher.
                    return next;
                }

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
    const [history, setHistory] = useState<{ url: string; ts: number }[]>([]);
    const [closedTabs, setClosedTabs] = useState<
        { id: string; url: string; title?: string }[]
    >([]);
    const [downloads, setDownloads] = useState<
        { url: string; ts: number; filename?: string }[]
    >([]);

    const [historyVisible, setHistoryVisible] = useState(false);
    const [bookmarksVisible, setBookmarksVisible] = useState(false);
    const [downloadsVisible, setDownloadsVisible] = useState(false);
    const [recentVisible, setRecentVisible] = useState(false);
    const [findVisible, setFindVisible] = useState(false);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [offlineVisible, setOfflineVisible] = useState(false);
    const router = useRouter();

    // For web: use navigator.onLine to show offline UI reliably when network is disconnected
    useEffect(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && 'navigator' in window) {
            const update = () => setOfflineVisible(!navigator.onLine);
            update();
            window.addEventListener('online', update);
            window.addEventListener('offline', update);
            return () => {
                window.removeEventListener('online', update);
                window.removeEventListener('offline', update);
            };
        }
    }, []);

    // Blocked domains should not be recorded in history or bookmarks
    const blockedDomains = useMemo(
        () => ["pyraxis.rf.gd", "pyraxis.xo.je"],
        []
    );

    // Persistence preference (legacy UI switch). Data persistence is always enabled.
    const [persistEnabled, setPersistEnabled] = useState<boolean>(true);

    // Load settings and persisted lists
    useEffect(() => {
        (async () => {
            try {
                const [flag, engineRaw] = await Promise.all([
                    AsyncStorage.getItem("persistEnabled"),
                    AsyncStorage.getItem("searchEngine"),
                ]);
                const nextEnabled = flag === "true" ? true : flag === "false" ? false : true;
                setPersistEnabled(nextEnabled);

                const engine =
                    engineRaw === "google" || engineRaw === "duckduckgo" || engineRaw === "bing"
                        ? (engineRaw as SearchEngineId)
                        : "google";
                setSearchEngine(engine);

                const [h, b, t, ct, dl] = await Promise.all([
                    AsyncStorage.getItem("history"),
                    AsyncStorage.getItem("bookmarks"),
                    AsyncStorage.getItem("tabsStateV1"),
                    AsyncStorage.getItem("closedTabs"),
                    AsyncStorage.getItem("downloads"),
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

                if (t) {
                    try {
                        const parsed = JSON.parse(t);
                        type PersistedTab = {
                            id: string;
                            url: string;
                            title?: string;
                            desktop?: boolean;
                        };
                        const savedTabs: PersistedTab[] | null = Array.isArray(parsed?.tabs)
                            ? (parsed.tabs as PersistedTab[])
                            : null;
                        const savedActiveTabId =
                            typeof parsed?.activeTabId === "string" ? parsed.activeTabId : null;
                        if (savedTabs && savedTabs.length) {
                            const restoredTabs: {
                                id: string;
                                url: string;
                                canGoBack: boolean;
                                canGoForward: boolean;
                                title: string;
                                ref: React.RefObject<any>;
                                incognito: boolean;
                                desktop: boolean;
                            }[] = savedTabs
                                .filter(
                                    (x: PersistedTab) =>
                                        typeof x.id === "string" && typeof x.url === "string"
                                )
                                .map((x: PersistedTab) => ({
                                    id: x.id,
                                    url: x.url,
                                    canGoBack: false,
                                    canGoForward: false,
                                    title: typeof x.title === "string" ? x.title : "",
                                    ref: React.createRef<any>(),
                                    incognito: false,
                                    desktop: !!x.desktop,
                                }));

                            if (restoredTabs.length) {
                                setTabs(restoredTabs);
                                const nextActive =
                                    (savedActiveTabId &&
                                    restoredTabs.some(
                                        (x: { id: string }) => x.id === savedActiveTabId
                                    )
                                        ? savedActiveTabId
                                        : restoredTabs[0].id) || restoredTabs[0].id;
                                setActiveTabId(nextActive);
                                const activeUrl = restoredTabs.find(
                                    (x: { id: string; url: string }) => x.id === nextActive
                                )?.url;
                                if (activeUrl) {
                                    setAddress(activeUrl);
                                    setCurrentUrl(activeUrl);
                                }
                            }
                        }
                    } catch {}
                }

                if (ct) {
                    try {
                        const parsed = JSON.parse(ct);
                        if (Array.isArray(parsed)) setClosedTabs(parsed);
                    } catch {}
                }

                if (dl) {
                    try {
                        const parsed = JSON.parse(dl);
                        if (Array.isArray(parsed)) setDownloads(parsed);
                    } catch {}
                }
            } catch {}
            setHydrated(true);
        })();
    }, []);

    // Persist changes when enabled
    useEffect(() => {
        if (!hydrated) return;
        AsyncStorage.setItem("history", JSON.stringify(history)).catch(() => {});
    }, [history, hydrated]);
    useEffect(() => {
        if (!hydrated) return;
        AsyncStorage.setItem("bookmarks", JSON.stringify(bookmarks)).catch(
            () => {}
        );
    }, [bookmarks, hydrated]);

    useEffect(() => {
        if (!hydrated) return;
        AsyncStorage.setItem("closedTabs", JSON.stringify(closedTabs)).catch(
            () => {}
        );
    }, [closedTabs, hydrated]);

    useEffect(() => {
        if (!hydrated) return;
        AsyncStorage.setItem("downloads", JSON.stringify(downloads)).catch(
            () => {}
        );
    }, [downloads, hydrated]);

    useEffect(() => {
        if (!hydrated) return;
        AsyncStorage.setItem("searchEngine", searchEngine).catch(() => {});
    }, [searchEngine, hydrated]);

    useEffect(() => {
        if (!hydrated) return;
        const persistedTabs = tabs
            .filter((t) => !t.incognito)
            .map((t) => ({
                id: t.id,
                url: t.url,
                title: t.title,
                desktop: !!t.desktop,
            }));
        AsyncStorage.setItem(
            "tabsStateV1",
            JSON.stringify({ tabs: persistedTabs, activeTabId })
        ).catch(() => {});
    }, [tabs, activeTabId, hydrated]);

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
                showToast("Browsing data deleted", "trash-2");
                break;
            case "downloads":
                setDownloadsVisible(true);
                break;
            case "bookmarks":
                setBookmarksVisible(true);
                break;
            case "add-bookmark":
                addBookmark();
                showToast("Bookmark added", "bookmark");
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
                showToast("Saved to bookmarks", "bookmark");
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
                // Navigate to a dedicated Help page
                try {
                    router.push("/help");
                } catch {
                    showToast("Could not open help page", "alert-circle");
                }
                break;
            default:
                console.log("Unhandled overflow action", action, payload);
        }
    }

    function onNavigationStateChangeWrap(navState: any) {
        onNavigationStateChange(navState);
        pushHistory(navState.url);
        if (typeof navState?.loading === "boolean") {
            setLoading(navState.loading);
            if (!navState.loading) clearLoadingTimer();
        }
    }

    // Small helpers to record closed tabs for "recent tabs"
    const origCloseTab = closeTab;
    function closeTabAndRecord(id: string, options?: { fromSwitcher?: boolean }) {
        const t = tabs.find((x) => x.id === id);
        if (t)
            setClosedTabs((prev) => {
                const next = [{ id: t.id, url: t.url, title: t.title }, ...prev];
                return next.slice(0, 50);
            });
        origCloseTab(id, options);
    }

    function recordDownload(downloadUrl: string) {
        if (!downloadUrl) return;
        try {
            const u = new URL(downloadUrl);
            const rawName = u.pathname.split("/").pop() || u.pathname || downloadUrl;
            const filename = decodeURIComponent(rawName);
            setDownloads((prev) => {
                const next = [{ url: downloadUrl, ts: Date.now(), filename }, ...prev.filter((d) => d.url !== downloadUrl)];
                return next.slice(0, 50);
            });
            // Open downloads so the user can see the new entry immediately
            setDownloadsVisible(true);
            console.log("Recorded download:", downloadUrl);
        } catch {
            setDownloads((prev) => {
                const next = [{ url: downloadUrl, ts: Date.now(), filename: downloadUrl }, ...prev.filter((d) => d.url !== downloadUrl)];
                return next.slice(0, 50);
            });
            setDownloadsVisible(true);
            console.log("Recorded download (fallback):", downloadUrl);
        }
    }

    function closeTabSwitcher() {
        setShowTabSwitcher(false);
        // If the active tab was closed while the switcher was open, select a remaining tab.
        if (!tabs.some((t) => t.id === activeTabId)) {
            const fallback = tabs[0];
            if (fallback) switchTab(fallback.id);
            else addTab();
        }
    }

    return (
        <ThemedView style={[styles.container, { backgroundColor: webviewBg }]}>
            {!showTabSwitcher && (
                <View
                    style={[
                        styles.addressBar,
                        {
                            paddingTop: (insets.top || 0) + 8,
                            backgroundColor: webviewBg,
                            zIndex: 10,
                        },
                    ]}
                    onLayout={(e) => setAddressBarHeight(e.nativeEvent.layout.height)}
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
                            showToast("Bookmark added", "bookmark");
                        }}
                        style={styles.iconButton}
                    >
                        <Feather name="star" size={18} color={iconColor} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Inline find bar (below URL bar) */}
            {!showTabSwitcher && findVisible && (
                <View
                    style={{
                        paddingHorizontal: 8,
                        paddingBottom: 8,
                        backgroundColor: webviewBg,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: "#222",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        zIndex: 9,
                    }}
                >
                    <Feather name="search" size={16} color={iconColor} />
                    <TextInput
                        placeholder="Find in page"
                        placeholderTextColor={inputBorder}
                        style={[
                            styles.input,
                            {
                                backgroundColor: inputBg,
                                borderColor: inputBorder,
                                color: iconColor,
                            },
                        ]}
                        autoCapitalize="none"
                        returnKeyType="search"
                        onSubmitEditing={(e) => {
                            const q = e.nativeEvent.text.replace(/'/g, "\\'");
                            const js = `try{window.find('${q}');}catch(e){};true;`;
                            getActiveWebview()?.injectJavaScript?.(js);
                        }}
                    />
                    <TouchableOpacity
                        onPress={() => setFindVisible(false)}
                        style={styles.iconButton}
                        accessibilityLabel="Close find"
                    >
                        <Feather name="x" size={18} color={iconColor} />
                    </TouchableOpacity>
                </View>
            )}

            <View
                style={[
                    styles.webviewContainer,
                    { backgroundColor: webviewBg },
                ]}
            >
                {loading && !showTabSwitcher && (
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
                    if (offlineVisible) {
                        return (
                            <View style={styles.webviewActive}>
                                <OfflinePage
                                    onRetry={() => {
                                        setOfflineVisible(false);
                                        reloadActive();
                                    }}
                                    onGoHome={() => {
                                        setOfflineVisible(false);
                                        navigateTo(HOME);
                                    }}
                                />
                            </View>
                        );
                    }

                    return (
                        <WebView
                            key={activeTab.id}
                            originWhitelist={["*"]}
                            source={{ uri: activeTab.url }}
                            ref={activeTab.ref}
                            startInLoadingState
                            onLoadStart={() => {
                                setLoading(true);
                                startLoadingFailsafe();
                            }}
                            onLoadProgress={(e) => {
                                const p = e?.nativeEvent?.progress;
                                // If we're basically done, ensure the overlay disappears.
                                if (typeof p === "number") {
                                    if (p >= 0.9) {
                                        const startedAt = loadStartedAtRef.current;
                                        // Avoid hiding immediately on very fast navigations.
                                        if (!startedAt || Date.now() - startedAt > 400) {
                                            setLoading(false);
                                            clearLoadingTimer();
                                        }
                                    }
                                }
                            }}
                            onLoadEnd={() => {
                                setLoading(false);
                                clearLoadingTimer();
                            }}
                            onError={() => {
                                setLoading(false);
                                clearLoadingTimer();
                                setOfflineVisible(true);
                            }}
                            onNavigationStateChange={onNavigationStateChangeWrap}
                            onFileDownload={({ nativeEvent }) => {
                                const downloadUrl = (nativeEvent as any)?.downloadUrl;
                                if (typeof downloadUrl === "string" && downloadUrl) {
                                    recordDownload(downloadUrl);
                                    showToast("Downloading…", "logo");
                                    Linking.openURL(downloadUrl).catch(() => {});
                                }
                            }}
                            style={styles.webviewActive}
                            javaScriptEnabled
                            domStorageEnabled
                            userAgent={activeTab.desktop ? desktopUA : undefined}
                            incognito={!!activeTab.incognito}
                            sharedCookiesEnabled={!activeTab.incognito}
                            thirdPartyCookiesEnabled={!activeTab.incognito}
                            cacheEnabled={!activeTab.incognito}
                        />
                    );
                })()}
            </View>

            {/* Tab switcher modal */}
            <TabSwitcher
                visible={showTabSwitcher}
                tabs={tabs}
                activeTabId={activeTabId}
                onClose={closeTabSwitcher}
                onSwitch={(id) => switchTab(id)}
                onCloseTab={(id, options) => closeTabAndRecord(id, options)}
                onAddTab={() => addTab()}
                onAddIncognitoTab={() => addTab(HOME, { incognito: true })}
                availableHeight={Math.max(0, (typeof window !== 'undefined' ? window.innerHeight : 0) - bottomNavHeight) || undefined}
                bottomNavHeight={bottomNavHeight}
            />

            {/* Bottom navigation */}
            <View onLayout={(e) => setBottomNavHeight(e.nativeEvent.layout.height)}>
                <BottomNav
                canGoBack={canGoBack}
                canGoForward={canGoForward}
                onBack={goBackActive}
                onForward={goForwardActive}
                onHome={() => navigateTo(HOME)}
                onTabSwitcher={() => setShowTabSwitcher((v) => !v)}
                onNewTab={() => addTab()}
                onReload={reloadActive}
                onOverflow={() => setSheetVisible(true)}
                />
            </View>

            <BottomSheetMenu
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
                onAction={handleOverflowAction}
            />

            {!!toastMessage && (
                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        left: 12,
                        right: 12,
                        top: showTabSwitcher
                            ? (insets.top || 0) + 12
                            : Math.max((insets.top || 0) + 12, addressBarHeight + 6),
                        alignItems: "center",
                        zIndex: 9999,
                    }}
                >
                    <View
                        style={{
                            backgroundColor: toastBg,
                            borderRadius: 10,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            maxWidth: "100%",
                            opacity: 0.94,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            shadowColor: "#000",
                            shadowOpacity: 0.25,
                            shadowRadius: 10,
                            shadowOffset: { width: 0, height: 4 },
                            elevation: 6,
                        }}
                    >
                        {toastIcon === "logo" ? (
                            <Image
                                source={APP_LOGO}
                                style={{ width: 16, height: 16, borderRadius: 3 }}
                                resizeMode="contain"
                            />
                        ) : (
                            <Feather name={toastIcon} size={16} color={toastText} />
                        )}
                        <Text style={{ color: toastText, fontWeight: "600" }}>
                            {toastMessage}
                        </Text>
                    </View>
                </View>
            )}

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

            {/* Downloads modal */}
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
                            maxHeight: "60%",
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                            backgroundColor: webviewBg,
                            padding: 12,
                        }}
                    >
                        <Text style={{ color: iconColor, fontWeight: "600", marginBottom: 8 }}>
                            Downloads
                        </Text>
                        <ScrollView>
                            {downloads.length === 0 ? (
                                <View style={{ paddingVertical: 12 }}>
                                    <Text style={{ color: iconColor }}>
                                        No downloads yet.
                                    </Text>
                                </View>
                            ) : (
                                downloads.map((d, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        onPress={() => {
                                            Linking.openURL(d.url).catch(() =>
                                                showToast("Could not open download", "alert-circle")
                                            );
                                        }}
                                        style={{
                                            paddingVertical: 12,
                                            borderBottomWidth: 1,
                                            borderBottomColor: "#222",
                                        }}
                                    >
                                        <Text style={{ color: iconColor }} numberOfLines={2}>
                                            {d.filename || d.url}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
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
                            {closedTabs.length === 0 ? (
                                <View style={{ padding: 12 }}>
                                    <Text style={{ color: iconColor }}>
                                        No recent tabs.
                                    </Text>
                                </View>
                            ) : (
                                closedTabs.map((c, i) => (
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
                                ))
                            )}
                        </ScrollView>
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

                        <View
                            style={{
                                borderWidth: 1,
                                borderColor: "#222",
                                borderRadius: 8,
                                marginBottom: 12,
                                overflow: "hidden",
                            }}
                        >
                            <View style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
                                <Text style={{ color: iconColor, fontWeight: "600" }}>
                                    Search engine
                                </Text>
                            </View>
                            {SEARCH_ENGINES.map((e) => {
                                const selected = e.id === searchEngine;
                                return (
                                    <TouchableOpacity
                                        key={e.id}
                                        onPress={() => setSearchEngine(e.id)}
                                        style={{
                                            paddingVertical: 10,
                                            paddingHorizontal: 12,
                                            borderTopWidth: 1,
                                            borderTopColor: "#222",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <Text style={{ color: iconColor }}>{e.label}</Text>
                                        {selected && (
                                            <Feather name="check" size={18} color={iconColor} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity
                            onPress={() =>
                                showToast(
                                    "Translate feature not implemented yet",
                                    "info"
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

            {/* Help & feedback handled via dedicated /help page */}
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
