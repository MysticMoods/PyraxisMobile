import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useMemo, useRef, useState } from "react";
import {
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

type Tab = { id: string; url: string; title?: string; incognito?: boolean };

type Props = {
    visible: boolean;
    tabs: Tab[];
    activeTabId?: string;
    onClose: () => void;
    onSwitch: (id: string) => void;
    onCloseTab: (id: string) => void;
    onAddTab: () => void;
    onAddIncognitoTab?: () => void;
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
    const { width } = useWindowDimensions();
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

    const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const ix = Math.round(e.nativeEvent.contentOffset.x / width);
        setPageIndex(ix);
    };

    function scrollToIndex(ix: number) {
        setPageIndex(ix);
        scrollRef.current?.scrollTo({ x: ix * width, animated: true });
    }

        const PREVIEW_SCALE = 0.35;
        const previewInject = useMemo(
                () => `
                        (function(){
                            try {
                                var s = ${PREVIEW_SCALE};
                                var m = document.querySelector('meta[name="viewport"]');
                                if(!m){ m=document.createElement('meta'); m.name='viewport'; document.head.appendChild(m); }
                                m.setAttribute('content','width=device-width, initial-scale=' + s + ', maximum-scale=' + s + ', user-scalable=no');
                                var html = document.documentElement; var body = document.body || html;
                                html.style.transformOrigin = '0 0';
                                html.style.transform = 'scale(' + s + ')';
                                html.style.width = (100/s) + '%';
                                html.style.height = 'auto';
                                body.style.transform = 'none';
                            } catch(e) {}
                        })();
                        true;
                `,
                []
        );

    function handleAddPress() {
        if (pageIndex === 1) {
            if (props.onAddIncognitoTab) return props.onAddIncognitoTab();
        }
        onAddTab();
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <ThemedView
                style={styles.backdrop}
                lightColor="transparent"
                darkColor="transparent"
            >
                <BlurView
                    intensity={25}
                    tint="default"
                    style={StyleSheet.absoluteFill}
                />
                <TouchableOpacity
                    style={styles.backdropTouchable}
                    onPress={onClose}
                    activeOpacity={1}
                />
                <View
                    style={[
                        styles.sheet,
                        {
                            paddingBottom: Math.max(insets.bottom, 12),
                            backgroundColor: bg,
                        },
                    ]}
                >
                    {/* Tapping empty spaces between cards closes the switcher */}
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                    <View style={styles.header}>
                        <View style={styles.segmentWrapper}>
                            <TouchableOpacity
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
                        pointerEvents="box-none"
                    >
                        {/* Normal tabs page */}
                        <View style={{ width }}>
                            <ScrollView contentContainerStyle={styles.grid} pointerEvents="box-none">
                                {normalTabs.map((t) => (
                                    <View
                                        key={t.id}
                                        style={[styles.card, { backgroundColor: cardBg }]}
                                    >
                                        <TouchableOpacity
                                            onPress={() => {
                                                onSwitch(t.id);
                                                onClose();
                                            }}
                                            style={styles.cardContent}
                                            activeOpacity={0.9}
                                        >
                                            <View style={styles.previewBox}>
                                                <WebView
                                                    source={{ uri: t.url }}
                                                    style={styles.previewWeb}
                                                    javaScriptEnabled
                                                    domStorageEnabled
                                                    pointerEvents="none"
                                                    scrollEnabled={false}
                                                    injectedJavaScript={previewInject}
                                                    injectedJavaScriptBeforeContentLoaded={previewInject}
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
                                            <TouchableOpacity
                                                onPress={() => onCloseTab(t.id)}
                                                style={styles.closeBtn}
                                                accessibilityLabel="Close tab"
                                            >
                                                <Feather name="x" size={18} color={textColor} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Incognito tabs page */}
                        <View style={{ width }}>
                            <ScrollView contentContainerStyle={styles.grid} pointerEvents="box-none">
                                {incogTabs.map((t) => (
                                    <View
                                        key={t.id}
                                        style={[styles.card, { backgroundColor: cardBg }]}
                                    >
                                        <TouchableOpacity
                                            onPress={() => {
                                                onSwitch(t.id);
                                                onClose();
                                            }}
                                            style={styles.cardContent}
                                            activeOpacity={0.9}
                                        >
                                            <View style={styles.previewBox}>
                                                <WebView
                                                    source={{ uri: t.url }}
                                                    style={styles.previewWeb}
                                                    javaScriptEnabled
                                                    domStorageEnabled
                                                    pointerEvents="none"
                                                    scrollEnabled={false}
                                                    injectedJavaScript={previewInject}
                                                    injectedJavaScriptBeforeContentLoaded={previewInject}
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
                                            <TouchableOpacity
                                                onPress={() => onCloseTab(t.id)}
                                                style={styles.closeBtn}
                                                accessibilityLabel="Close tab"
                                            >
                                                <Feather name="x" size={18} color={textColor} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </ScrollView>
                </View>
            </ThemedView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "flex-end" },
    backdropTouchable: { flex: 1 },
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
    grid: { padding: 12, flexDirection: "row", flexWrap: "wrap", gap: 10 },
    card: { width: "42%", borderRadius: 10, padding: 8, marginBottom: 12 },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
    cardUrl: { fontSize: 12, opacity: 0.8 },
    cardActions: { position: "absolute", top: 8, right: 8 },
    closeBtn: { padding: 6 },
    previewBox: {
        height: 120,
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 8,
        backgroundColor: "#000",
    },
    previewWeb: { flex: 1 },
    incogBadge: {
        position: "absolute",
        top: 6,
        right: 6,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 12,
        padding: 4,
    },
});
