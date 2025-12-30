import { useThemeColor } from "@/hooks/use-theme-color";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Easing,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

type Tab = { id: string; url: string; title?: string; incognito?: boolean };

type Props = {
    visible: boolean;
    tabs: Tab[];
    activeTabId?: string;
    onClose: () => void;
    onSwitch: (id: string) => void;
    onCloseTab: (id: string, options?: { fromSwitcher?: boolean }) => void;
    onAddTab: () => void;
    onAddIncognitoTab?: () => void;
    availableHeight?: number;
    bottomNavHeight?: number;
};

export function TabSwitcher(props: Props) {
    const {
        visible,
        tabs,
        onClose,
        onSwitch,
        onCloseTab,
        onAddTab,
    } = props;
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const bg = useThemeColor({ light: "#fff", dark: "#000" }, "background");
    const cardBg = useThemeColor(
        { light: "#f2f2f2", dark: "#111" },
        "background"
    );
    const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");

    const normalTabs = useMemo(() => tabs.filter((t) => !t.incognito), [tabs]);
    const incogTabs = useMemo(() => tabs.filter((t) => t.incognito), [tabs]);

    const scrollRef = useRef<ScrollView>(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [headerH, setHeaderH] = useState(0);

    const isDraggingRef = useRef(false);
    const touchStartedOnControlRef = useRef(false);

    const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const ix = Math.round(e.nativeEvent.contentOffset.x / width);
        setPageIndex(ix);
    };

    function scrollToIndex(ix: number) {
        setPageIndex(ix);
        scrollRef.current?.scrollTo({ x: ix * width, animated: true });
    }

    function handleAddPress() {
        if (pageIndex === 1) {
            if (props.onAddIncognitoTab) return props.onAddIncognitoTab();
        }
        onAddTab();
    }

    // Overlay excludes bottom nav so it stays visible + clickable.
    const bottomNavHeight = props.bottomNavHeight ?? 0;
    const overlayHeight = Math.max(0, height - bottomNavHeight);

    // Compute preview size
    const GRID_PAD = 12;
    const GRID_GAP = 10;
    const CARD_PAD = 8;
        const colWidth = Math.max(100, (width - GRID_PAD * 2 - GRID_GAP) / 2);
        const previewWidth = Math.max(80, colWidth - CARD_PAD * 2);
        const pageHeight = Math.max(0, overlayHeight - headerH);
        const gridVerticalPadding = GRID_PAD + 40;
        const rowsDesired = 2;
        const perRowGapTotal = GRID_GAP * (rowsDesired - 1);
        const cardMetaEstimate = 72;
        const previewHeightLimit = Math.max(100, Math.floor((pageHeight - gridVerticalPadding - perRowGapTotal) / rowsDesired) - cardMetaEstimate);
        const aspect = Math.max(1.6, Math.min(2.3, height / Math.max(1, width)));
        const phoneLikeMinHeight = Math.round(previewWidth * aspect);
        const previewHeight = Math.max(130, Math.min(previewHeightLimit, phoneLikeMinHeight));

    // Use viewport scaling inside the preview WebView so the page looks like a miniature
    // of a device-width view (avoids transform-related blank/white previews on Android).
    const previewScale = Math.max(0.2, Math.min(1, previewWidth / width));
    const injectedViewportJs = useMemo(() => {
        const s = previewScale.toFixed(4);
        return `(() => {\n  try {\n    var head = document.head || document.getElementsByTagName('head')[0];\n    var meta = document.querySelector('meta[name=viewport]');\n    if (!meta) {\n      meta = document.createElement('meta');\n      meta.setAttribute('name', 'viewport');\n      head && head.appendChild(meta);\n    }\n    meta.setAttribute('content', 'width=${width}, initial-scale=${s}, maximum-scale=${s}, user-scalable=no');\n  } catch (e) {}\n})();\ntrue;`;
    }, [previewScale, width]);

    const [mounted, setMounted] = useState(visible);
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(70)).current;

    useEffect(() => {
        if (visible) {
            setMounted(true);
            opacity.stopAnimation();
            translateY.stopAnimation();
            opacity.setValue(0);
            translateY.setValue(70);
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 180,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 220,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start();
        } else if (mounted) {
            opacity.stopAnimation();
            translateY.stopAnimation();
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 160,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 70,
                    duration: 200,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start(({ finished }) => {
                if (finished) setMounted(false);
            });
        }
    }, [mounted, opacity, translateY, visible]);

    if (!mounted) return null;

    return (
        <View pointerEvents={visible ? "box-none" : "none"} style={[styles.overlay, { bottom: bottomNavHeight }]}>
            <Animated.View
                style={{
                    flex: 1,
                    opacity,
                    transform: [{ translateY }],
                }}
            >
                <Pressable
                    style={[
                        styles.sheet,
                        {
                            height: overlayHeight,
                            backgroundColor: bg,
                            paddingBottom: Math.max(insets.bottom, 12),
                        },
                    ]}
                    pointerEvents="auto"
                    onPress={() => {
                        if (!isDraggingRef.current && !touchStartedOnControlRef.current) onClose();
                        touchStartedOnControlRef.current = false;
                    }}
                >
                    {/* Tabs area fills available height; no screen-wide blur overlay */}
                    <View
                        style={[styles.header, { paddingTop: 12 + Math.max(0, insets.top) }]}
                        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
                    >
                        <View style={styles.segmentWrapper}>
                            <TouchableOpacity
                                onPressIn={() => { touchStartedOnControlRef.current = true; }}
                                onPress={() => scrollToIndex(0)}
                                style={[
                                    styles.segmentButton,
                                    pageIndex === 0 && styles.segmentActive,
                                ]}
                                accessibilityLabel="Normal tabs"
                            >
                                <Feather name="layout" size={16} color={textColor} />
                                <Text style={[styles.segmentText, { color: textColor }]}>Tabs</Text>
                                <View style={styles.countPill}>
                                    <Text style={styles.countPillText}>{normalTabs.length}</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPressIn={() => { touchStartedOnControlRef.current = true; }}
                                onPress={() => scrollToIndex(1)}
                                style={[
                                    styles.segmentButton,
                                    pageIndex === 1 && styles.segmentActive,
                                ]}
                                accessibilityLabel="Incognito tabs"
                            >
                                <Feather name="eye-off" size={16} color={textColor} />
                                <Text style={[styles.segmentText, { color: textColor }]}>Incognito</Text>
                                {!!incogTabs.length && (
                                    <View style={styles.countPill}>
                                        <Text style={styles.countPillText}>{incogTabs.length}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            onPressIn={() => { touchStartedOnControlRef.current = true; }}
                            onPress={handleAddPress}
                            style={styles.addButton}
                            accessibilityLabel="New tab"
                        >   
                            <Feather name="plus" size={20} color={textColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={handleMomentumEnd}
                        nestedScrollEnabled={true}
                        directionalLockEnabled={true}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Normal tabs page (2 per row grid) */}
                        <View style={{ width, height: Math.max(0, overlayHeight - headerH) }}>
                            <ScrollView 
                                style={{ flex: 1 }} 
                                contentContainerStyle={[styles.grid, { paddingBottom: 40 }]} 
                                nestedScrollEnabled={true} 
                                showsVerticalScrollIndicator={true} 
                                scrollEnabled={true}
                                onScrollBeginDrag={() => { isDraggingRef.current = true; }}
                                onScrollEndDrag={() => { isDraggingRef.current = false; }}
                                onMomentumScrollBegin={() => { isDraggingRef.current = true; }}
                                onMomentumScrollEnd={() => { isDraggingRef.current = false; }}
                                onTouchEnd={() => {
                                    if (!isDraggingRef.current && !touchStartedOnControlRef.current) onClose();
                                    touchStartedOnControlRef.current = false;
                                }}
                                keyboardShouldPersistTaps="handled"
                            >
                                {normalTabs.map((t) => (
                                    <View key={t.id} style={[styles.card, { backgroundColor: cardBg }]}> 
                                        <TouchableOpacity
                                            onPressIn={() => { touchStartedOnControlRef.current = true; }}
                                            onPress={() => { onSwitch(t.id); onClose(); }}
                                            style={styles.cardContent}
                                            activeOpacity={0.9}
                                        >
                                            <View style={[styles.previewBox, { height: previewHeight, width: previewWidth }] }>
                                                <WebView
                                                    originWhitelist={["*"]}
                                                    source={{ uri: t.url }}
                                                    style={{ width: previewWidth, height: previewHeight, backgroundColor: "#fff" }}
                                                    javaScriptEnabled
                                                    domStorageEnabled
                                                    injectedJavaScriptBeforeContentLoaded={injectedViewportJs}
                                                    pointerEvents="none"
                                                    scrollEnabled={false}
                                                />
                                            </View>
                                            <Text numberOfLines={2} style={[styles.cardTitle, { color: textColor }]}>
                                                {t.title || t.url.replace(/^https?:\/\//, "")}
                                            </Text>
                                            <Text numberOfLines={1} style={[styles.cardUrl, { color: textColor }]}>
                                                {t.url}
                                            </Text>
                                        </TouchableOpacity>
                                        <View style={styles.cardActions}>
                                            <TouchableOpacity onPress={() => onCloseTab(t.id, { fromSwitcher: true })} style={styles.closeBtn} accessibilityLabel="Close tab">
                                                <Feather name="x" size={18} color={textColor} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Incognito tabs page (2 per row grid) */}
                        <View style={{ width, height: Math.max(0, overlayHeight - headerH) }}>
                            <ScrollView 
                                style={{ flex: 1 }} 
                                contentContainerStyle={[styles.grid, { paddingBottom: 40 }]} 
                                nestedScrollEnabled={true} 
                                showsVerticalScrollIndicator={true} 
                                scrollEnabled={true}
                                onScrollBeginDrag={() => { isDraggingRef.current = true; }}
                                onScrollEndDrag={() => { isDraggingRef.current = false; }}
                                onMomentumScrollBegin={() => { isDraggingRef.current = true; }}
                                onMomentumScrollEnd={() => { isDraggingRef.current = false; }}
                                onTouchEnd={() => {
                                    if (!isDraggingRef.current && !touchStartedOnControlRef.current) onClose();
                                    touchStartedOnControlRef.current = false;
                                }}
                                keyboardShouldPersistTaps="handled"
                            >
                                {incogTabs.map((t) => (
                                    <View key={t.id} style={[styles.card, { backgroundColor: cardBg }]}> 
                                        <TouchableOpacity
                                            onPressIn={() => { touchStartedOnControlRef.current = true; }}
                                            onPress={() => { onSwitch(t.id); onClose(); }}
                                            style={styles.cardContent}
                                            activeOpacity={0.9}
                                        >
                                            <View style={[styles.previewBox, { height: previewHeight, width: previewWidth }] }>
                                                <WebView
                                                    originWhitelist={["*"]}
                                                    source={{ uri: t.url }}
                                                    style={{ width: previewWidth, height: previewHeight, backgroundColor: "#fff" }}
                                                    javaScriptEnabled
                                                    domStorageEnabled
                                                    injectedJavaScriptBeforeContentLoaded={injectedViewportJs}
                                                    pointerEvents="none"
                                                    scrollEnabled={false}
                                                    incognito
                                                    cacheEnabled={false}
                                                    thirdPartyCookiesEnabled={false}
                                                    sharedCookiesEnabled={false}
                                                />
                                                <View style={styles.incogBadge}>
                                                    <Feather name="eye-off" size={14} color="#fff" />
                                                </View>
                                            </View>
                                            <Text numberOfLines={2} style={[styles.cardTitle, { color: textColor }]}>
                                                {t.title || t.url.replace(/^https?:\/\//, "")}
                                            </Text>
                                            <Text numberOfLines={1} style={[styles.cardUrl, { color: textColor }]}>
                                                {t.url}
                                            </Text>
                                        </TouchableOpacity>
                                        <View style={styles.cardActions}>
                                            <TouchableOpacity onPress={() => onCloseTab(t.id, { fromSwitcher: true })} style={styles.closeBtn} accessibilityLabel="Close tab">
                                                <Feather name="x" size={18} color={textColor} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </ScrollView>
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        flex: 1,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#222",
    },
    headerText: { fontSize: 18, fontWeight: "700" },
    addButton: { padding: 6 },
    segmentWrapper: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: "#222",
        borderRadius: 20,
        overflow: "hidden",
    },
    segmentButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 6,
    },
    segmentActive: { backgroundColor: "#333" },
    segmentText: { fontWeight: "600" },
    countPill: {
        marginLeft: 6,
        backgroundColor: "#0a7ea4",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    countPillText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    grid: { padding: 12, paddingBottom: 40, flexDirection: "row", flexWrap: "wrap", gap: 10 },
    card: { 
        width: "48%", 
        borderRadius: 12, 
        padding: 8, 
        marginBottom: 12,
        // subtle card shadow like Opera
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
    cardUrl: { fontSize: 12, opacity: 0.8 },
    cardActions: { position: "absolute", top: 8, right: 8 },
    closeBtn: { padding: 6 },
    previewBox: {
        height: 120,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 8,
        backgroundColor: "#fff",
    },
    
    previewWeb: { flex: 1 },
    incogBadge: {
        position: "absolute",
        top: 6,
        left: 6,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 12,
        padding: 4,
    },
});
