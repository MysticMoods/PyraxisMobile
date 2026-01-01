import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Image,
    Linking,
    Platform,
    Pressable,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import OfflinePage from './offline';

import { StartPage } from "@/components/start-page";

import { haptics } from "@/hooks/use-haptics";
import { useThemeColor } from "@/hooks/use-theme-color";

import { ThemedView } from "@/components/themed-view";
import { BottomNav } from "@/components/ui/bottom-nav";
import { BottomSheetMenu } from "@/components/ui/bottom-sheet-menu";
import { ModalListItem, ModalSheet } from "@/components/ui/modal-sheet";
import { TabSwitcher } from "@/components/ui/tab-switcher";

import {
    isSearchEngineId,
    SEARCH_ENGINES,
    type SearchEngineId,
} from "@/constants/search-engines";

export default function BrowserScreen() {
    const HOME_INTERNAL = "pyraxis://home";
    const INCOGNITO_INTERNAL = "pyraxis://incognito";

    const params = useLocalSearchParams<{
        input?: string;
        url?: string;
        engine?: string;
    }>();

    const initialInputParam =
        typeof params?.input === "string" && params.input.trim()
            ? params.input
            : undefined;
    const initialUrlParam =
        typeof params?.url === "string" && params.url.trim() ? params.url : undefined;
    const initialEngineParam =
        isSearchEngineId(params?.engine) ? (params.engine as SearchEngineId) : undefined;

    // Tabs state: each tab keeps its own ref and url/history state
    const [tabs, setTabs] = useState(() => [
        {
            id: String(Date.now()),
            url: HOME_INTERNAL,
            canGoBack: false,
            canGoForward: false,
            title: "Home",
            ref: React.createRef<any>(),
            incognito: false,
            desktop: false,
        },
    ]);
    const [activeTabId, setActiveTabId] = useState(tabs[0].id);
    const [address, setAddress] = useState(HOME_INTERNAL);
    const [currentUrl, setCurrentUrl] = useState(HOME_INTERNAL);
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [loading, setLoading] = useState(false);
    const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadStartedAtRef = useRef<number | null>(null);
    const insets = useSafeAreaInsets();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const [bottomNavHeight, setBottomNavHeight] = useState(0);
    const [addressBarHeight, setAddressBarHeight] = useState(0);

    const addressInputRef = useRef<TextInput>(null);

    const APP_LOGO = useMemo(
        () => require("../assets/images/app-icon-72.png"),
        []
    );

    type ToastIcon = React.ComponentProps<typeof Feather>["name"] | "logo";
    type ToastType = "success" | "error" | "info" | "warning";

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastIcon, setToastIcon] = useState<ToastIcon>("bookmark");
    const [toastType, setToastType] = useState<ToastType>("info");
    const toastAnimRef = useRef(new Animated.Value(0)).current;
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const showToast = (message: string, icon?: ToastIcon, type: ToastType = "info") => {
        if (icon) setToastIcon(icon);
        setToastType(type);
        setToastMessage(message);
        
        // Trigger haptic based on type
        if (type === "success") haptics.success();
        else if (type === "error") haptics.error();
        else if (type === "warning") haptics.warning();
        else haptics.light();
        
        // Animate in
        Animated.spring(toastAnimRef, {
            toValue: 1,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
        }).start();
        
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
            Animated.timing(toastAnimRef, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(() => setToastMessage(null));
        }, 2200);
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

    // Loading progress animation
    const loadingProgressAnim = useRef(new Animated.Value(0)).current;
    const loadingOpacityAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        if (loading) {
            loadingProgressAnim.setValue(0);
            Animated.parallel([
                Animated.timing(loadingOpacityAnim, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.loop(
                    Animated.timing(loadingProgressAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: false,
                    })
                ),
            ]).start();
        } else {
            Animated.timing(loadingOpacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [loading, loadingOpacityAnim, loadingProgressAnim]);

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

    const [searchEngine, setSearchEngine] = useState<SearchEngineId>("google");

    const [hydrated, setHydrated] = useState(false);

    const isProbablyUrl = useCallback((t: string) => {
        // Heuristics: has scheme OR looks like domain.tld OR contains a dot with no spaces
        if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t)) return true;
        if (t.includes(" ")) return false;
        // domain.tld or localhost or ip
        if (/^([\w-]+\.)+[a-zA-Z]{2,}$/.test(t)) return true;
        if (/^localhost(?::\d+)?(\/|$)/.test(t)) return true;
        if (/^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(\/|$)/.test(t)) return true;
        return false;
    }, []);

    const parseInputToUrl = useCallback(
        (input: string) => {
        const t = input.trim();
        if (!t) return HOME_INTERNAL;
        if (isProbablyUrl(t)) {
            if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t)) return t;
            return "https://" + t;
        }
        // Treat as search query
        const engine = SEARCH_ENGINES.find((e) => e.id === searchEngine);
        return (engine ?? SEARCH_ENGINES[0]).buildUrl(t);
        },
        [HOME_INTERNAL, isProbablyUrl, searchEngine]
    );

    const navigateTo = useCallback((input: string) => {
        const url = parseInputToUrl(input);
        setAddress(url);
        setCurrentUrl(url);

        const isInternal = url.toLowerCase().startsWith("pyraxis://");
        if (isInternal) {
            setCanGoBack(false);
            setCanGoForward(false);
            setLoading(false);
            clearLoadingTimer();
            setTabs((prev) =>
                prev.map((t) =>
                    t.id === activeTabId
                        ? {
                              ...t,
                              url,
                              canGoBack: false,
                              canGoForward: false,
                              title:
                                  url === HOME_INTERNAL
                                      ? "Home"
                                      : url === INCOGNITO_INTERNAL
                                        ? "Incognito"
                                        : (t.title || "Home"),
                          }
                        : t
                )
            );
            return;
        }

        // Update the active tab URL so the UI swaps from internal StartPage to WebView.
        setTabs((prev) =>
            prev.map((t) =>
                t.id === activeTabId
                    ? {
                          ...t,
                          url,
                          canGoBack: false,
                          canGoForward: false,
                      }
                    : t
            )
        );

        const tab = tabs.find((t) => t.id === activeTabId);
        if (tab?.ref?.current) {
            tab.ref.current.loadUrl?.(url);
            tab.ref.current.injectJavaScript?.(
                'window.location = "' + url + '";'
            );
        }
    }, [activeTabId, parseInputToUrl, tabs]);

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

    function addTab(url = HOME_INTERNAL, options?: { incognito?: boolean }) {
        const currentIsIncog = tabs.find((t) => t.id === activeTabId)?.incognito;
        const isIncog = options?.incognito ?? !!currentIsIncog;
        const initialUrl = isIncog && url === HOME_INTERNAL ? INCOGNITO_INTERNAL : url;
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
            desktop: isIncog ? false : !!settings.desktopSiteDefault,
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
                            url: HOME_INTERNAL,
                            canGoBack: false,
                            canGoForward: false,
                            title: "Home",
                            ref,
                            incognito: false,
                            desktop: false,
                        };
                        setActiveTabId(freshId);
                        setAddress(HOME_INTERNAL);
                        setCurrentUrl(HOME_INTERNAL);
                        return [fresh];
                    }

                    // Still ensure the active tab points to a real tab to avoid a blank WebView.
                    const newActive = next[idx] ?? next[idx - 1] ?? next[0] ?? null;
                    if (newActive) {
                        setActiveTabId(newActive.id);
                        setAddress(newActive.url);
                        setCurrentUrl(newActive.url);
                        setCanGoBack(!!newActive.canGoBack);
                        setCanGoForward(!!newActive.canGoForward);
                    }
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
                        url: HOME_INTERNAL,
                        canGoBack: false,
                        canGoForward: false,
                        title: "Home",
                        ref,
                        incognito: false,
                        desktop: false,
                    };
                    setActiveTabId(freshId);
                    setAddress(HOME_INTERNAL);
                    setCurrentUrl(HOME_INTERNAL);
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
    const [offlineVisible, setOfflineVisible] = useState(false);
    const router = useRouter();

    const appliedInitialNavRef = useRef(false);

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
    const blockedDomains = useMemo(() => ["pyraxis.xo.je"], []);

    const [settings, setSettings] = useState(() => ({
        desktopSiteDefault: false,
        javaScriptEnabled: true,
        thirdPartyCookiesEnabled: true,
        adBlockEnabled: true,
    }));

    const applySettingsRaw = useCallback((settingsRaw: string | null) => {
        if (!settingsRaw) return;
        try {
            const parsed = JSON.parse(settingsRaw);
            if (parsed && typeof parsed === "object") {
                setSettings((prev) => ({
                    ...prev,
                    desktopSiteDefault: !!(parsed as any).desktopSiteDefault,
                    javaScriptEnabled:
                        typeof (parsed as any).javaScriptEnabled === "boolean"
                            ? (parsed as any).javaScriptEnabled
                            : prev.javaScriptEnabled,
                    thirdPartyCookiesEnabled:
                        typeof (parsed as any).thirdPartyCookiesEnabled === "boolean"
                            ? (parsed as any).thirdPartyCookiesEnabled
                            : prev.thirdPartyCookiesEnabled,
                    adBlockEnabled:
                        typeof (parsed as any).adBlockEnabled === "boolean"
                            ? (parsed as any).adBlockEnabled
                            : prev.adBlockEnabled,
                }));
            }
        } catch {}
    }, []);

    const persistSettingsPatch = useCallback(async (patch: Record<string, any>) => {
        try {
            const raw = await AsyncStorage.getItem("settingsV1");
            let base: any = {};
            try {
                const parsed = raw ? JSON.parse(raw) : null;
                if (parsed && typeof parsed === "object") base = parsed;
            } catch {}
            const next = { ...base, ...patch };
            await AsyncStorage.setItem("settingsV1", JSON.stringify(next));
        } catch {}
    }, []);

    // Load settings and persisted lists
    useEffect(() => {
        (async () => {
            try {
                const [engineRaw, settingsRaw] = await Promise.all([
                    AsyncStorage.getItem("searchEngine"),
                    AsyncStorage.getItem("settingsV1"),
                ]);
                const engineFromStorage: SearchEngineId = isSearchEngineId(engineRaw)
                    ? engineRaw
                    : "google";
                setSearchEngine(engineFromStorage);

                applySettingsRaw(settingsRaw);

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
    }, [applySettingsRaw]);

    // Re-sync settings when returning from the Settings screen.
    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            (async () => {
                try {
                    const raw = await AsyncStorage.getItem("settingsV1");
                    if (!cancelled) applySettingsRaw(raw);
                } catch {}
            })();
            return () => {
                cancelled = true;
            };
        }, [applySettingsRaw])
    );

    useEffect(() => {
        if (!hydrated) return;
        if (appliedInitialNavRef.current) return;

        // Apply initial deep link params once (from native home screen or external link)
        if (initialEngineParam) setSearchEngine(initialEngineParam as SearchEngineId);
        const target = initialUrlParam ?? initialInputParam;
        if (target) {
            setTimeout(() => navigateTo(target), 0);
        }

        appliedInitialNavRef.current = true;
    }, [hydrated, initialEngineParam, initialInputParam, initialUrlParam, navigateTo]);

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

        const adBlockNavBlockedHosts = useMemo(
                () =>
                        [
                                "doubleclick.net",
                                "googlesyndication.com",
                                "googleadservices.com",
                                "googletagservices.com",
                                "googletagmanager.com",
                                "adservice.google.com",
                                "adsystem.com",
                                "taboola.com",
                                "outbrain.com",
                                "scorecardresearch.com",
                        ],
                []
        );

        const adBlockInjectedJs = useMemo(() => {
                if (!settings.adBlockEnabled || !settings.javaScriptEnabled) return "true;";

                const css = `
/* Pyraxis adblock (best-effort cosmetic) */
[id^="ad-"] , [id^="ad_"] , [id*="_ad_"] ,
[class~="ad"] , [class^="ad-"] , [class*=" ad-"] ,
[class^="ads-"] , [class*=" ads-"] ,
.ad-container, .ad-wrapper, .ad-banner, .ad-slot, .adunit,
.ads, .adsbox, .adsbygoogle, .advert, .advertisement,
#ad, #ads, #advert, #advertisement,
iframe[id^="google_ads_iframe"], iframe[src*="doubleclick"], iframe[src*="googlesyndication"],
div[id^="google_ads_iframe"],
[aria-label="advertisement" i], [aria-label*="sponsored" i] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
}
`;

                const blockedHostsJson = JSON.stringify(adBlockNavBlockedHosts);
                const cssJson = JSON.stringify(css);

                return `(() => {
    try {
        if (window.__pyraxisAdblockInstalled) return true;
        window.__pyraxisAdblockInstalled = true;

        // Popup / new-window blocker
        try {
            if (!window.__pyraxisOriginalOpen) window.__pyraxisOriginalOpen = window.open;
            window.open = function(){ return null; };
        } catch (e) {}

        const blockedHosts = ${blockedHostsJson};
        const isBlockedUrl = (u) => {
            try {
                const url = new URL(u, location.href);
                const host = (url.hostname || '').toLowerCase();
                for (var i = 0; i < blockedHosts.length; i++) {
                    const h = blockedHosts[i];
                    if (host === h || host.endsWith('.' + h)) return true;
                }
            } catch (e) {}
            return false;
        };

        // Inject CSS for common ad containers
        try {
            var style = document.getElementById('__pyraxis_adblock_css__');
            if (!style) {
                style = document.createElement('style');
                style.id = '__pyraxis_adblock_css__';
                style.textContent = ${cssJson};
                (document.head || document.documentElement).appendChild(style);
            }
        } catch (e) {}

        const sweep = () => {
            try {
                // Remove obvious ad iframes by src host
                const iframes = document.querySelectorAll('iframe[src]');
                for (var i = 0; i < iframes.length; i++) {
                    const fr = iframes[i];
                    const src = fr.getAttribute('src') || '';
                    if (src && isBlockedUrl(src)) {
                        try {
                            if (!fr.getAttribute('data-pyraxis-adblock-hidden')) {
                                fr.setAttribute('data-pyraxis-adblock-hidden', '1');
                                fr.setAttribute('data-pyraxis-adblock-prev-display', fr.style.display || '');
                                fr.setAttribute('data-pyraxis-adblock-prev-visibility', fr.style.visibility || '');
                            }
                        } catch (e) {}
                        fr.style.display = 'none';
                        fr.style.visibility = 'hidden';
                    }
                }
            } catch (e) {}
        };

        sweep();
        const mo = new MutationObserver(() => {
            if (window.__pyraxisAdblockPending) return;
            window.__pyraxisAdblockPending = true;
            setTimeout(() => { window.__pyraxisAdblockPending = false; sweep(); }, 250);
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
                window.__pyraxisAdblockObserver = mo;
    } catch (e) {}
    return true;
})();`;
        }, [adBlockNavBlockedHosts, settings.adBlockEnabled, settings.javaScriptEnabled]);

        const adBlockDisableCleanupJs = useMemo(
                () =>
                        `(() => {
    try {
        var style = document.getElementById('__pyraxis_adblock_css__');
        if (style && style.parentNode) style.parentNode.removeChild(style);

        // Unhide iframes we hid via inline styles
        try {
            var hidden = document.querySelectorAll('[data-pyraxis-adblock-hidden="1"]');
            for (var i = 0; i < hidden.length; i++) {
                var el = hidden[i];
                var prevDisplay = el.getAttribute('data-pyraxis-adblock-prev-display') || '';
                var prevVis = el.getAttribute('data-pyraxis-adblock-prev-visibility') || '';
                try { el.style.display = prevDisplay; } catch (e) {}
                try { el.style.visibility = prevVis; } catch (e) {}
                try {
                    el.removeAttribute('data-pyraxis-adblock-hidden');
                    el.removeAttribute('data-pyraxis-adblock-prev-display');
                    el.removeAttribute('data-pyraxis-adblock-prev-visibility');
                } catch (e) {}
            }
        } catch (e) {}

        if (window.__pyraxisAdblockObserver && window.__pyraxisAdblockObserver.disconnect) {
            try { window.__pyraxisAdblockObserver.disconnect(); } catch (e) {}
            window.__pyraxisAdblockObserver = null;
        }
        if (window.__pyraxisOriginalOpen) {
            try { window.open = window.__pyraxisOriginalOpen; } catch (e) {}
        }
        window.__pyraxisAdblockInstalled = false;
        window.__pyraxisAdblockPending = false;
    } catch (e) {}
    return true;
})();`,
                []
        );

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
                addTab(INCOGNITO_INTERNAL, { incognito: true });
                break;
            case "history":
                setHistoryVisible(true);
                break;
            case "delete-browsing-data":
                setHistory([]);
                setBookmarks([]);
                showToast("Browsing data deleted", "trash-2", "success");
                break;
            case "downloads":
                setDownloadsVisible(true);
                break;
            case "bookmarks":
                setBookmarksVisible(true);
                break;
            case "add-bookmark":
                addBookmark();
                showToast("Bookmark added", "bookmark", "success");
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
                showToast("Saved to bookmarks", "bookmark", "success");
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
            case "adblock":
                // payload is boolean
                {
                    const enabled = !!payload;
                    setSettings((prev) => ({ ...prev, adBlockEnabled: enabled }));
                    persistSettingsPatch({ adBlockEnabled: enabled });
                    if (!enabled) {
                        // Remove our injected styles/observer immediately so ads can reappear.
                        getActiveWebview()?.injectJavaScript?.(adBlockDisableCleanupJs);
                    }
                }
                // Reload so injected logic applies immediately
                setTimeout(() => reloadActive(), 50);
                break;
            case "settings":
                haptics.light();
                try {
                    router.push("/settings");
                } catch {
                    showToast("Could not open settings", "alert-circle", "error");
                }
                break;
            case "help-feedback":
                haptics.light();
                // Navigate to a dedicated Help page
                try {
                    router.push("/help");
                } catch {
                    showToast("Could not open help page", "alert-circle", "error");
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
                        ref={addressInputRef}
                        value={address}
                        onChangeText={setAddress}
                        onSubmitEditing={(e) => navigateTo(e.nativeEvent.text)}
                        placeholder="Enter URL or search"
                        keyboardType="url"
                        autoCapitalize="none"
                        selectTextOnFocus
                        onFocus={() => {
                            const end = (address ?? "").length;
                            requestAnimationFrame(() => {
                                try {
                                    addressInputRef.current?.setNativeProps?.({ selection: { start: 0, end } });
                                } catch {}
                            });
                        }}
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
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                            haptics.success();
                            addBookmark(undefined, true);
                            showToast("Bookmark added", "bookmark", "success");
                        }}
                        style={({ pressed }) => [
                            styles.iconButton,
                            { 
                                opacity: pressed ? 0.7 : 1, 
                                transform: [{ scale: pressed ? 0.9 : 1 }] 
                            }
                        ]}
                    >
                        <Feather name="star" size={18} color={iconColor} />
                    </Pressable>
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
                    <Animated.View
                        style={[
                            styles.loadingOverlay,
                            { opacity: loadingOpacityAnim },
                        ]}
                        pointerEvents="none"
                    >
                        <LinearGradient
                            colors={["#FF6B2C", "#FF8F5C"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.loadingBar}
                        >
                            <Animated.View
                                style={{
                                    ...StyleSheet.absoluteFillObject,
                                    backgroundColor: "rgba(255,255,255,0.4)",
                                    borderRadius: 2,
                                    transform: [{
                                        translateX: loadingProgressAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [-150, 150],
                                        })
                                    }],
                                    width: 60,
                                }}
                            />
                        </LinearGradient>
                    </Animated.View>
                )}
                {/* Render only the active tab's WebView to avoid layout splitting. */}
                {(() => {
                    const activeTab = tabs.find((t) => t.id === activeTabId);
                    if (!activeTab) return null;
                    const activeUrl = typeof activeTab.url === "string" ? activeTab.url : "";
                    const isInternalUrl = activeUrl.toLowerCase().startsWith("pyraxis://");
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
                                        const active = tabs.find((t) => t.id === activeTabId);
                                        navigateTo(active?.incognito ? INCOGNITO_INTERNAL : HOME_INTERNAL);
                                    }}
                                />
                            </View>
                        );
                    }

                    if (isInternalUrl) {
                        const isIncognitoTab = !!activeTab?.incognito;
                        return (
                            <View style={styles.webviewActive}>
                                <StartPage
                                    searchEngine={searchEngine}
                                    setSearchEngine={setSearchEngine}
                                    onSubmitInput={(input) => navigateTo(input)}
                                    onOpenUrl={(url) => navigateTo(url)}
                                    variant={isIncognitoTab ? "incognito" : "normal"}
                                />
                            </View>
                        );
                    }

                    return (
                        <WebView
                            key={`${activeTab.id}:${settings.adBlockEnabled ? "ab1" : "ab0"}:${settings.javaScriptEnabled ? "js1" : "js0"}`}
                            originWhitelist={["*"]}
                            source={{ uri: activeUrl }}
                            ref={activeTab.ref}
                            startInLoadingState
                            onShouldStartLoadWithRequest={(req) => {
                                const reqUrl = (req as any)?.url;
                                if (settings.adBlockEnabled && typeof reqUrl === "string") {
                                    try {
                                        const u = new URL(reqUrl);
                                        const host = (u.hostname || "").toLowerCase();
                                        if (
                                            adBlockNavBlockedHosts.some(
                                                (h) => host === h || host.endsWith("." + h)
                                            )
                                        ) {
                                            return false;
                                        }
                                    } catch {}
                                }
                                if (typeof reqUrl === "string" && reqUrl.toLowerCase().startsWith("pyraxis://")) {
                                    navigateTo(reqUrl);
                                    return false;
                                }
                                return true;
                            }}
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
                                    showToast("Downloading…", "logo", "info");
                                    Linking.openURL(downloadUrl).catch(() => {});
                                }
                            }}
                            style={styles.webviewActive}
                            injectedJavaScriptBeforeContentLoaded={
                                settings.adBlockEnabled && settings.javaScriptEnabled
                                    ? adBlockInjectedJs
                                    : undefined
                            }
                            javaScriptEnabled={!!settings.javaScriptEnabled}
                            domStorageEnabled
                            userAgent={activeTab.desktop ? desktopUA : undefined}
                            incognito={!!activeTab.incognito}
                            sharedCookiesEnabled={!activeTab.incognito}
                            thirdPartyCookiesEnabled={!activeTab.incognito && !!settings.thirdPartyCookiesEnabled}
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
                onAddIncognitoTab={() => addTab(INCOGNITO_INTERNAL, { incognito: true })}
                renderTabPreview={(t, size) => {
                    const url = typeof t.url === "string" ? t.url : "";
                    if (!url.toLowerCase().startsWith("pyraxis://")) return null;

                    // Render at the same size the user sees in the Browser (webviewContainer)
                    // then scale it down into the preview box.
                    const baseW = Math.max(1, windowWidth);
                    const baseH = Math.max(1, windowHeight - bottomNavHeight - addressBarHeight);
                    const scale = Math.min(size.width / baseW, size.height / baseH);

                    return (
                        <View
                            pointerEvents="none"
                            style={{
                                width: size.width,
                                height: size.height,
                                overflow: "hidden",
                                backgroundColor: webviewBg,
                            }}
                        >
                            <View
                                style={{
                                    width: baseW,
                                    height: baseH,
                                    position: "absolute",
                                    left: (size.width - baseW) / 2,
                                    top: (size.height - baseH) / 2,
                                    transform: [{ scale }],
                                }}
                            >
                                <StartPage
                                    searchEngine={searchEngine}
                                    setSearchEngine={setSearchEngine}
                                    onSubmitInput={() => {}}
                                    onOpenUrl={() => {}}
                                    variant={t.incognito ? "incognito" : "normal"}
                                />
                            </View>
                        </View>
                    );
                }}
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
                onHome={() => {
                    const active = tabs.find((t) => t.id === activeTabId);
                    navigateTo(active?.incognito ? INCOGNITO_INTERNAL : HOME_INTERNAL);
                }}
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
                adBlockEnabled={!!settings.adBlockEnabled}
                desktopSite={!!tabs.find((t) => t.id === activeTabId)?.desktop}
            />

            {!!toastMessage && (
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        left: 16,
                        right: 16,
                        top: showTabSwitcher
                            ? (insets.top || 0) + 16
                            : Math.max((insets.top || 0) + 16, addressBarHeight + 10),
                        alignItems: "center",
                        zIndex: 9999,
                        opacity: toastAnimRef,
                        transform: [{
                            translateY: toastAnimRef.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-20, 0],
                            })
                        }, {
                            scale: toastAnimRef.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.9, 1],
                            })
                        }],
                    }}
                >
                    <LinearGradient
                        colors={
                            toastType === "success" ? ["#10B981", "#059669"] :
                            toastType === "error" ? ["#EF4444", "#DC2626"] :
                            toastType === "warning" ? ["#F59E0B", "#D97706"] :
                            ["#3B82F6", "#2563EB"]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            borderRadius: 14,
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            maxWidth: "100%",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            shadowColor: "#000",
                            shadowOpacity: 0.3,
                            shadowRadius: 16,
                            shadowOffset: { width: 0, height: 6 },
                            elevation: 8,
                        }}
                    >
                        {toastIcon === "logo" ? (
                            <View style={{
                                width: 24,
                                height: 24,
                                borderRadius: 6,
                                backgroundColor: "rgba(255,255,255,0.2)",
                                alignItems: "center",
                                justifyContent: "center",
                            }}>
                                <Image
                                    source={APP_LOGO}
                                    style={{ width: 16, height: 16, borderRadius: 3 }}
                                    resizeMode="contain"
                                />
                            </View>
                        ) : (
                            <View style={{
                                width: 24,
                                height: 24,
                                borderRadius: 6,
                                backgroundColor: "rgba(255,255,255,0.2)",
                                alignItems: "center",
                                justifyContent: "center",
                            }}>
                                <Feather name={toastIcon} size={14} color="#fff" />
                            </View>
                        )}
                        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                            {toastMessage}
                        </Text>
                    </LinearGradient>
                </Animated.View>
            )}

            {/* History Sheet */}
            <ModalSheet
                visible={historyVisible}
                onClose={() => setHistoryVisible(false)}
                title="History"
                subtitle={`${history.length} pages visited`}
                icon="clock"
                iconColor="#3B82F6"
                isEmpty={history.length === 0}
                emptyState={{
                    icon: "clock",
                    title: "No browsing history",
                    subtitle: "Pages you visit will appear here for quick access",
                }}
                headerAction={history.length > 0 ? {
                    icon: "trash-2",
                    label: "Clear history",
                    onPress: () => {
                        setHistory([]);
                        showToast("History cleared", "trash-2", "success");
                    },
                } : undefined}
            >
                {history.map((h, i) => {
                    let displayTitle = h.url;
                    try {
                        const urlObj = new URL(h.url);
                        displayTitle = urlObj.hostname.replace("www.", "");
                    } catch {}
                    return (
                        <ModalListItem
                            key={`${h.url}-${i}`}
                            title={displayTitle}
                            subtitle={h.url}
                            icon="globe"
                            iconColor="#3B82F6"
                            timestamp={h.ts}
                            onPress={() => {
                                navigateTo(h.url);
                                setHistoryVisible(false);
                            }}
                            onDelete={() => {
                                setHistory(prev => prev.filter((_, idx) => idx !== i));
                            }}
                        />
                    );
                })}
            </ModalSheet>

            {/* Bookmarks Sheet */}
            <ModalSheet
                visible={bookmarksVisible}
                onClose={() => setBookmarksVisible(false)}
                title="Bookmarks"
                subtitle={`${bookmarks.length} saved`}
                icon="bookmark"
                iconColor="#F59E0B"
                isEmpty={bookmarks.length === 0}
                emptyState={{
                    icon: "bookmark",
                    title: "No bookmarks yet",
                    subtitle: "Tap the star icon to save your favorite pages",
                }}
            >
                {bookmarks.map((b, i) => {
                    let displayTitle = b;
                    try {
                        const urlObj = new URL(b);
                        displayTitle = urlObj.hostname.replace("www.", "");
                    } catch {}
                    return (
                        <ModalListItem
                            key={`${b}-${i}`}
                            title={displayTitle}
                            subtitle={b}
                            icon="star"
                            iconColor="#F59E0B"
                            onPress={() => {
                                navigateTo(b);
                                setBookmarksVisible(false);
                            }}
                            onDelete={() => {
                                setBookmarks(prev => prev.filter((_, idx) => idx !== i));
                            }}
                        />
                    );
                })}
            </ModalSheet>

            {/* Downloads Sheet */}
            <ModalSheet
                visible={downloadsVisible}
                onClose={() => setDownloadsVisible(false)}
                title="Downloads"
                subtitle={`${downloads.length} files`}
                icon="download"
                iconColor="#10B981"
                isEmpty={downloads.length === 0}
                emptyState={{
                    icon: "download",
                    title: "No downloads",
                    subtitle: "Files you download will appear here",
                }}
            >
                {downloads.map((d, i) => (
                    <ModalListItem
                        key={`${d.url}-${i}`}
                        title={d.filename || "Unknown file"}
                        subtitle={d.url}
                        icon="file"
                        iconColor="#10B981"
                        timestamp={d.ts}
                        onPress={() => {
                            Linking.openURL(d.url).catch(() =>
                                showToast("Could not open download", "alert-circle", "error")
                            );
                        }}
                        onDelete={() => {
                            setDownloads(prev => prev.filter((_, idx) => idx !== i));
                        }}
                    />
                ))}
            </ModalSheet>

            {/* Recent Tabs Sheet */}
            <ModalSheet
                visible={recentVisible}
                onClose={() => setRecentVisible(false)}
                title="Recently Closed"
                subtitle={`${closedTabs.length} tabs`}
                icon="rotate-ccw"
                iconColor="#8B5CF6"
                isEmpty={closedTabs.length === 0}
                emptyState={{
                    icon: "rotate-ccw",
                    title: "No recently closed tabs",
                    subtitle: "Tabs you close will appear here so you can reopen them",
                }}
            >
                {closedTabs.map((c, i) => {
                    let displayTitle = c.title || c.url;
                    try {
                        if (!c.title) {
                            const urlObj = new URL(c.url);
                            displayTitle = urlObj.hostname.replace("www.", "");
                        }
                    } catch {}
                    return (
                        <ModalListItem
                            key={`${c.id}-${i}`}
                            title={displayTitle}
                            subtitle={c.url}
                            icon="layout"
                            iconColor="#8B5CF6"
                            onPress={() => {
                                addTab(c.url);
                                setRecentVisible(false);
                            }}
                        />
                    );
                })}
            </ModalSheet>

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
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 999,
        overflow: "hidden",
    },
    loadingBar: {
        flex: 1,
        borderRadius: 2,
        overflow: "hidden",
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
