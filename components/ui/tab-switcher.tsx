import { useColorScheme } from "@/hooks/use-color-scheme";
import { haptics } from "@/hooks/use-haptics";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

type Tab = { id: string; url: string; title?: string; incognito?: boolean };

type PreviewSize = { width: number; height: number };

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
    renderTabPreview?: (tab: Tab, size: PreviewSize) => React.ReactNode | null;
};

export function TabSwitcher(props: Props) {
    const {
        visible,
        tabs,
        activeTabId,
        onClose,
        onSwitch,
        onCloseTab,
        onAddTab,
    } = props;
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const colorScheme = useColorScheme() ?? "dark";
    const isDark = colorScheme === "dark";
    
    const bg = isDark ? "#0A0A0F" : "#F8FAFC";
    const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
    const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
    const textColor = isDark ? "#FFFFFF" : "#0F172A";
    const mutedColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.5)";

    const normalTabs = useMemo(() => tabs.filter((t) => !t.incognito), [tabs]);
    const incogTabs = useMemo(() => tabs.filter((t) => t.incognito), [tabs]);

    const scrollRef = useRef<ScrollView>(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [headerH, setHeaderH] = useState(0);

    const isDraggingRef = useRef(false);
    const touchStartedOnControlRef = useRef(false);

    const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const ix = Math.round(e.nativeEvent.contentOffset.x / width);
        if (ix !== pageIndex) {
            haptics.selection();
        }
        setPageIndex(ix);
    };

    function scrollToIndex(ix: number) {
        haptics.light();
        setPageIndex(ix);
        scrollRef.current?.scrollTo({ x: ix * width, animated: true });
    }

    function handleAddPress() {
        haptics.medium();
        if (pageIndex === 1) {
            if (props.onAddIncognitoTab) return props.onAddIncognitoTab();
        }
        onAddTab();
    }

    function handleTabPress(id: string) {
        haptics.light();
        onSwitch(id);
        onClose();
    }

    function handleCloseTab(id: string) {
        haptics.medium();
        onCloseTab(id, { fromSwitcher: true });
    }

    // Overlay excludes bottom nav so it stays visible + clickable.
    const bottomNavHeight = props.bottomNavHeight ?? 0;
    const overlayHeight = Math.max(0, height - bottomNavHeight);

    // Compute preview size
    // Keep these in sync with `styles.grid` so we reliably fit 2 cards per row.
    const GRID_PAD = 16;
    const GRID_GAP = 12;
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

    const previewSize = useMemo(
        () => ({ width: previewWidth, height: previewHeight }),
        [previewHeight, previewWidth]
    );

    const [mounted, setMounted] = useState(visible);
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(70)).current;

    // When opened, default to the section matching the active tab type.
    useEffect(() => {
        if (!visible) return;
        const active = tabs.find((t) => t.id === activeTabId);
        const desiredIndex = active?.incognito ? 1 : 0;
        setPageIndex(desiredIndex);
        requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ x: desiredIndex * width, animated: false });
        });
    }, [activeTabId, tabs, visible, width]);

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
                        if (!isDraggingRef.current && !touchStartedOnControlRef.current) {
                            haptics.light();
                            onClose();
                        }
                        touchStartedOnControlRef.current = false;
                    }}
                >
                    {/* Header with segment tabs */}
                    <View
                        style={[styles.header, { paddingTop: 12 + Math.max(0, insets.top), borderBottomColor: cardBorder }]}
                        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
                    >
                        <View style={[styles.segmentWrapper, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
                            <Pressable
                                onPressIn={() => { touchStartedOnControlRef.current = true; }}
                                onPress={() => scrollToIndex(0)}
                                style={({ pressed }) => [
                                    styles.segmentButton,
                                    pageIndex === 0 && styles.segmentActive,
                                    { opacity: pressed ? 0.8 : 1 },
                                ]}
                                accessibilityLabel="Normal tabs"
                                accessibilityRole="tab"
                                accessibilityState={{ selected: pageIndex === 0 }}
                            >
                                {pageIndex === 0 && (
                                    <LinearGradient
                                        colors={["#FF6B2C", "#FF8F5C"]}
                                        style={StyleSheet.absoluteFill}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    />
                                )}
                                <View style={styles.segmentContent}>
                                    <Feather name="layout" size={16} color={pageIndex === 0 ? "#fff" : textColor} />
                                    <Text style={[styles.segmentText, { color: pageIndex === 0 ? "#fff" : textColor }]}>Tabs</Text>
                                    <View style={[styles.countPill, pageIndex === 0 && styles.countPillActive]}>
                                        <Text style={[styles.countPillText, pageIndex === 0 && { color: "#FF6B2C" }]}>{normalTabs.length}</Text>
                                    </View>
                                </View>
                            </Pressable>
                            <Pressable
                                onPressIn={() => { touchStartedOnControlRef.current = true; }}
                                onPress={() => scrollToIndex(1)}
                                style={({ pressed }) => [
                                    styles.segmentButton,
                                    pageIndex === 1 && styles.segmentActive,
                                    { opacity: pressed ? 0.8 : 1 },
                                ]}
                                accessibilityLabel="Incognito tabs"
                                accessibilityRole="tab"
                                accessibilityState={{ selected: pageIndex === 1 }}
                            >
                                {pageIndex === 1 && (
                                    <LinearGradient
                                        colors={["#8B5CF6", "#A78BFA"]}
                                        style={StyleSheet.absoluteFill}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    />
                                )}
                                <View style={styles.segmentContent}>
                                    <Feather name="eye-off" size={16} color={pageIndex === 1 ? "#fff" : textColor} />
                                    <Text style={[styles.segmentText, { color: pageIndex === 1 ? "#fff" : textColor }]}>Incognito</Text>
                                    {!!incogTabs.length && (
                                        <View style={[styles.countPill, pageIndex === 1 && styles.countPillActive]}>
                                            <Text style={[styles.countPillText, pageIndex === 1 && { color: "#8B5CF6" }]}>{incogTabs.length}</Text>
                                        </View>
                                    )}
                                </View>
                            </Pressable>
                        </View>
                        <Pressable
                            onPressIn={() => { touchStartedOnControlRef.current = true; }}
                            onPress={handleAddPress}
                            style={({ pressed }) => [
                                styles.addButton,
                                { transform: [{ scale: pressed ? 0.9 : 1 }] },
                            ]}
                            accessibilityLabel="New tab"
                            accessibilityRole="button"
                        >
                            <LinearGradient
                                colors={pageIndex === 1 ? ["#8B5CF6", "#A78BFA"] : ["#FF6B2C", "#FF8F5C"]}
                                style={styles.addButtonGradient}
                            >
                                <Feather name="plus" size={18} color="#fff" />
                            </LinearGradient>
                        </Pressable>
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
                                {normalTabs.length === 0 && (
                                    <View style={styles.emptyState}>
                                        <View style={[styles.emptyIcon, { backgroundColor: "rgba(255,107,44,0.1)" }]}>
                                            <Feather name="layout" size={32} color="#FF6B2C" />
                                        </View>
                                        <Text style={[styles.emptyTitle, { color: textColor }]}>No tabs open</Text>
                                        <Text style={[styles.emptySubtitle, { color: mutedColor }]}>
                                            Tap the + button to start browsing
                                        </Text>
                                    </View>
                                )}
                                {normalTabs.map((t) => {
                                    const isActive = t.id === activeTabId;
                                    return (
                                        <Pressable 
                                            key={t.id} 
                                            onPressIn={() => { touchStartedOnControlRef.current = true; }}
                                            onPress={() => handleTabPress(t.id)}
                                            style={({ pressed }) => [
                                                styles.card, 
                                                { 
                                                    width: colWidth,
                                                    backgroundColor: cardBg,
                                                    borderColor: isActive ? "#FF6B2C" : cardBorder,
                                                    borderWidth: isActive ? 2 : 1,
                                                    transform: [{ scale: pressed ? 0.97 : 1 }],
                                                }
                                            ]}
                                        >
                                            <View style={[styles.previewBox, { height: previewHeight, width: previewWidth }]}>
                                                {(() => {
                                                    const custom = props.renderTabPreview?.(t, previewSize);
                                                    if (custom) return custom;
                                                    return (
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
                                                    );
                                                })()}
                                            </View>
                                            <Text numberOfLines={2} style={[styles.cardTitle, { color: textColor }]}>
                                                {t.title || t.url.replace(/^https?:\/\//, "")}
                                            </Text>
                                            <Text numberOfLines={1} style={[styles.cardUrl, { color: mutedColor }]}>
                                                {t.url}
                                            </Text>
                                            <Pressable 
                                                onPressIn={(e) => {
                                                    touchStartedOnControlRef.current = true;
                                                    // Prevent parent card onPress (switch/open)
                                                    (e as any)?.stopPropagation?.();
                                                }}
                                                onPress={(e) => {
                                                    (e as any)?.stopPropagation?.();
                                                    handleCloseTab(t.id);
                                                }}
                                                style={({ pressed }) => [
                                                    styles.closeBtn, 
                                                    { transform: [{ scale: pressed ? 0.85 : 1 }] }
                                                ]} 
                                                accessibilityLabel="Close tab"
                                                hitSlop={8}
                                            >
                                                <View style={[styles.closeBtnBg, { backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.5)" }]}>
                                                    <Feather name="x" size={14} color="#fff" />
                                                </View>
                                            </Pressable>
                                        </Pressable>
                                    );
                                })}
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
                                {incogTabs.length === 0 && (
                                    <View style={styles.emptyState}>
                                        <View style={[styles.emptyIcon, { backgroundColor: "rgba(139,92,246,0.1)" }]}>
                                            <Feather name="eye-off" size={32} color="#8B5CF6" />
                                        </View>
                                        <Text style={[styles.emptyTitle, { color: textColor }]}>No incognito tabs</Text>
                                        <Text style={[styles.emptySubtitle, { color: mutedColor }]}>
                                            Browse privately without saving history
                                        </Text>
                                    </View>
                                )}
                                {incogTabs.map((t) => {
                                    const isActive = t.id === activeTabId;
                                    return (
                                        <Pressable 
                                            key={t.id} 
                                            onPressIn={() => { touchStartedOnControlRef.current = true; }}
                                            onPress={() => handleTabPress(t.id)}
                                            style={({ pressed }) => [
                                                styles.card, 
                                                { 
                                                    width: colWidth,
                                                    backgroundColor: cardBg,
                                                    borderColor: isActive ? "#8B5CF6" : cardBorder,
                                                    borderWidth: isActive ? 2 : 1,
                                                    transform: [{ scale: pressed ? 0.97 : 1 }],
                                                }
                                            ]}
                                        >
                                            <View style={[styles.previewBox, { height: previewHeight, width: previewWidth }]}>
                                                {(() => {
                                                    const custom = props.renderTabPreview?.(t, previewSize);
                                                    if (custom) return custom;
                                                    return (
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
                                                    );
                                                })()}
                                                <View style={styles.incogBadge}>
                                                    <Feather name="eye-off" size={12} color="#fff" />
                                                </View>
                                            </View>
                                            <Text numberOfLines={2} style={[styles.cardTitle, { color: textColor }]}>
                                                {t.title || t.url.replace(/^https?:\/\//, "")}
                                            </Text>
                                            <Text numberOfLines={1} style={[styles.cardUrl, { color: mutedColor }]}>
                                                {t.url}
                                            </Text>
                                            <Pressable 
                                                onPressIn={(e) => {
                                                    touchStartedOnControlRef.current = true;
                                                    // Prevent parent card onPress (switch/open)
                                                    (e as any)?.stopPropagation?.();
                                                }}
                                                onPress={(e) => {
                                                    (e as any)?.stopPropagation?.();
                                                    handleCloseTab(t.id);
                                                }}
                                                style={({ pressed }) => [
                                                    styles.closeBtn, 
                                                    { transform: [{ scale: pressed ? 0.85 : 1 }] }
                                                ]} 
                                                accessibilityLabel="Close tab"
                                                hitSlop={8}
                                            >
                                                <View style={[styles.closeBtnBg, { backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.5)" }]}>
                                                    <Feather name="x" size={14} color="#fff" />
                                                </View>
                                            </Pressable>
                                        </Pressable>
                                    );
                                })}
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 12,
    },
    headerText: { fontSize: 18, fontWeight: "700" },
    addButton: { 
        borderRadius: 12,
        overflow: "hidden",
    },
    addButtonGradient: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    segmentWrapper: {
        flex: 1,
        flexDirection: "row",
        borderRadius: 14,
        overflow: "hidden",
        padding: 3,
    },
    segmentButton: {
        flex: 1,
        borderRadius: 11,
        overflow: "hidden",
        position: "relative",
    },
    segmentContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    segmentActive: {},
    segmentText: { fontWeight: "600", fontSize: 13 },
    countPill: {
        marginLeft: 4,
        backgroundColor: "rgba(255,255,255,0.15)",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
    },
    countPillActive: {
        backgroundColor: "rgba(255,255,255,0.9)",
    },
    countPillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    grid: { 
        padding: 16, 
        paddingBottom: 40, 
        flexDirection: "row", 
        flexWrap: "wrap", 
        gap: 12,
    },
    card: { 
        width: "47%", 
        borderRadius: 16, 
        padding: 8, 
        position: "relative",
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
    },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 13, fontWeight: "600", marginBottom: 4, marginTop: 8 },
    cardUrl: { fontSize: 11 },
    cardActions: { position: "absolute", top: 8, right: 8 },
    closeBtn: { 
        position: "absolute",
        top: 6,
        right: 6,
        zIndex: 10,
    },
    closeBtnBg: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
    },
    previewBox: {
        height: 120,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#fff",
        position: "relative",
    },
    activeBadge: {
        position: "absolute",
        bottom: 6,
        right: 6,
        backgroundColor: "#FF6B2C",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    activeBadgeText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "700",
    },
    emptyState: {
        flex: 1,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: "center",
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
