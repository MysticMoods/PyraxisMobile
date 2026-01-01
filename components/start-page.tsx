import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  SEARCH_ENGINES,
  type SearchEngineId,
  getSearchEngineLabel,
  getSearchEngineShort,
} from "@/constants/search-engines";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { haptics } from "@/hooks/use-haptics";
import { useThemeColor } from "@/hooks/use-theme-color";

function rgba(hex: string, a: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

type Props = {
  searchEngine: SearchEngineId;
  setSearchEngine: (id: SearchEngineId) => void;
  onSubmitInput: (input: string) => void;
  onOpenUrl: (url: string) => void;
  variant?: "normal" | "incognito";
};

export function StartPage({
  searchEngine,
  setSearchEngine,
  onSubmitInput,
  onOpenUrl,
  variant = "normal",
}: Props) {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const isIncognito = variant === "incognito";

  const [query, setQuery] = useState("");
  const [enginePickerVisible, setEnginePickerVisible] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Entrance animations
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(30)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const quickLinksOpacity = useRef(new Animated.Value(0)).current;
  const quickLinksTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      Animated.parallel([
        Animated.spring(cardOpacity, { toValue: 1, useNativeDriver: true, speed: 12 }),
        Animated.spring(cardTranslateY, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 6 }),
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 6 }),
      ]),
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(quickLinksOpacity, { toValue: 1, useNativeDriver: true, speed: 12 }),
        Animated.spring(quickLinksTranslateY, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 6 }),
      ]),
    ]).start();
  }, [cardOpacity, cardScale, cardTranslateY, quickLinksOpacity, quickLinksTranslateY]);

  // Theme colors — incognito uses a purple/violet stealth palette
  const defaultPageBg = useThemeColor({ light: "#f0f4f8", dark: "#0c0d10" }, "background");
  const defaultCardBg = useThemeColor({ light: "#ffffff", dark: "#16171a" }, "background");
  const defaultCardBorder = useThemeColor({ light: "#e2e8f0", dark: "#27292e" }, "icon");
  const defaultMuted = useThemeColor({ light: "#64748b", dark: "#94a3b8" }, "text");
  const defaultText = useThemeColor({ light: "#0f172a", dark: "#f1f5f9" }, "text");

  const pageBg = isIncognito ? "#0a0a0f" : defaultPageBg;
  const cardBg = isIncognito ? "rgba(20, 18, 30, 0.85)" : defaultCardBg;
  const cardBorder = isIncognito ? "rgba(139, 92, 246, 0.25)" : defaultCardBorder;
  const mutedText = isIncognito ? "#a78bfa" : defaultMuted;
  const text = isIncognito ? "#e2e0ff" : defaultText;
  const tint = isIncognito ? "#8b5cf6" : Colors[colorScheme].tint;

  const engineLabel = getSearchEngineLabel(searchEngine);
  const engineShort = getSearchEngineShort(searchEngine);
  const APP_LOGO = useMemo(() => require("../assets/images/app-icon-72.png"), []);

  const quickLinks = [
    { key: "google", label: "Google", icon: "search" as const, url: "https://www.google.com", color: "#4285F4" },
    { key: "youtube", label: "YouTube", icon: "youtube" as const, url: "https://www.youtube.com", color: "#FF0000" },
    { key: "github", label: "GitHub", icon: "github" as const, url: "https://github.com", color: "#6E5494" },
    { key: "wikipedia", label: "Wikipedia", icon: "book-open" as const, url: "https://en.wikipedia.org", color: "#636466" },
    { key: "reddit", label: "Reddit", icon: "message-circle" as const, url: "https://www.reddit.com", color: "#FF4500" },
    { key: "news", label: "News", icon: "file-text" as const, url: "https://news.google.com", color: "#1A73E8" },
  ];

  const canSearch = query.trim().length > 0;

  function submit() {
    const trimmed = query.trim();
    Keyboard.dismiss();
    if (!trimmed) return;
    haptics.medium();
    onSubmitInput(trimmed);
  }

  function handleQuickLink(url: string) {
    haptics.light();
    onOpenUrl(url);
  }

  function handleEnginePicker() {
    haptics.light();
    setEnginePickerVisible(true);
  }

  function handleEngineSelect(id: SearchEngineId) {
    haptics.selection();
    setSearchEngine(id);
    setEnginePickerVisible(false);
  }

  // Gradient colors per variant
  const gradientPrimary = isIncognito
    ? ["#6d28d9", "#4c1d95"]
    : isDark
      ? ["#0ea5e9", "#0284c7"]
      : ["#38bdf8", "#0ea5e9"];
  const gradientSecondary = isIncognito
    ? ["#7c3aed", "#5b21b6"]
    : isDark
      ? ["#f97316", "#ea580c"]
      : ["#fb923c", "#f97316"];

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      {/* Background accents */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[rgba(gradientPrimary[0], 0.18), "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.blob, { top: -100, left: -80, width: 340, height: 340 }]}
        />
        <LinearGradient
          colors={[rgba(gradientSecondary[0], 0.14), "transparent"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.blob, { bottom: -120, right: -100, width: 380, height: 380 }]}
        />
        {isIncognito && (
          <View style={styles.incognitoRing}>
            <Feather name="eye-off" size={80} color="rgba(139,92,246,0.08)" />
          </View>
        )}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Card with entrance animation */}
        <Animated.View 
          style={[
            styles.mainCard, 
            { 
              backgroundColor: cardBg, 
              borderColor: inputFocused ? tint : cardBorder,
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
            }
          ]}
        >
          {/* Brand */}
          <View style={styles.brandRow}>
            {isIncognito ? (
              <View style={[styles.incognitoIcon, { backgroundColor: rgba(tint, 0.15) }]}>
                <Feather name="eye-off" size={26} color={tint} />
              </View>
            ) : (
              <Image source={APP_LOGO} style={styles.logo} resizeMode="contain" />
            )}
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" style={[styles.brandTitle, { color: text }]}>
                {isIncognito ? "Incognito" : "Pyraxis"}
              </ThemedText>
              <ThemedText style={[styles.brandSubtitle, { color: mutedText }]}>
                {isIncognito ? "Your activity stays private" : "Fast, private, beautiful"}
              </ThemedText>
            </View>
          </View>

          {/* Headline */}
          <ThemedText style={[styles.headline, { color: text }]}>
            {isIncognito ? "Browse without a trace." : "Explore the web, privately."}
          </ThemedText>

          {/* Search bar with focus animation */}
          <Pressable
            onPress={() => inputRef.current?.focus()}
            style={[
              styles.searchBar,
              {
                backgroundColor: isIncognito ? "rgba(30,25,50,0.7)" : isDark ? "#1e1f23" : "#f8fafc",
                borderColor: inputFocused ? tint : (isIncognito ? rgba(tint, 0.35) : cardBorder),
                borderWidth: inputFocused ? 2 : 1.5,
              },
            ]}
          >
            <Pressable
              onPress={handleEnginePicker}
              style={({ pressed }) => [
                styles.enginePill, 
                { 
                  backgroundColor: tint,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                }
              ]}
              accessibilityLabel="Change search engine"
              accessibilityHint="Opens search engine picker"
            >
              <ThemedText type="defaultSemiBold" style={styles.enginePillText}>
                {engineShort}
              </ThemedText>
              <Feather name="chevron-down" size={14} color="#fff" />
            </Pressable>

            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={`Search with ${engineLabel}...`}
              placeholderTextColor={mutedText}
              autoCorrect={false}
              autoCapitalize="none"
              keyboardType={Platform.select({ ios: "web-search", default: "default" })}
              returnKeyType="search"
              onSubmitEditing={submit}
              style={[styles.searchInput, { color: text }]}
              selectionColor={tint}
            />

            <Pressable
              onPress={submit}
              disabled={!canSearch}
              style={({ pressed }) => [
                styles.searchBtn, 
                { 
                  backgroundColor: tint, 
                  opacity: canSearch ? 1 : 0.5,
                  transform: [{ scale: pressed && canSearch ? 0.9 : 1 }],
                }
              ]}
              accessibilityLabel="Search"
              accessibilityRole="button"
            >
              <Feather name="arrow-right" size={18} color="#fff" />
            </Pressable>
          </Pressable>

          {/* Helper */}
          <ThemedText style={[styles.helperText, { color: mutedText }]}>
            {isIncognito
              ? "History, cookies, and site data won't be saved."
              : "Enter a URL or search query to get started."}
          </ThemedText>
        </Animated.View>

        {/* Quick links (normal only) with staggered animation */}
        {!isIncognito && (
          <Animated.View 
            style={[
              styles.quickGrid,
              {
                opacity: quickLinksOpacity,
                transform: [{ translateY: quickLinksTranslateY }],
              }
            ]}
          >
            {quickLinks.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => handleQuickLink(item.url)}
                style={({ pressed }) => [
                  styles.quickButton,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                    borderColor: pressed ? item.color : cardBorder,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
                accessibilityLabel={`Open ${item.label}`}
                accessibilityRole="link"
              >
                <View style={[styles.quickIconWrap, { backgroundColor: `${item.color}20` }]}>
                  <Feather name={item.icon} size={16} color={item.color} />
                </View>
                <ThemedText type="defaultSemiBold" style={{ color: text, fontSize: 13 }}>
                  {item.label}
                </ThemedText>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {/* Incognito tips */}
        {isIncognito && (
          <View style={[styles.tipsCard, { backgroundColor: rgba(tint, 0.08), borderColor: rgba(tint, 0.2) }]}>
            <Feather name="info" size={16} color={tint} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText type="defaultSemiBold" style={{ color: text, fontSize: 13 }}>
                What incognito does
              </ThemedText>
              <ThemedText style={{ color: mutedText, fontSize: 12, lineHeight: 18 }}>
                Pages you visit, cookies, and form data are not saved. Downloads and bookmarks are still kept.
              </ThemedText>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Engine picker modal */}
      <Modal
        transparent
        visible={enginePickerVisible}
        animationType="fade"
        onRequestClose={() => setEnginePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={StyleSheet.absoluteFill} 
            onPress={() => {
              haptics.light();
              setEnginePickerVisible(false);
            }} 
          />
          <View style={[styles.modalSheet, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.modalHandle, { backgroundColor: isDark ? "#444" : "#cbd5e1" }]} />
            <ThemedText type="subtitle" style={[styles.modalTitle, { color: text }]}>
              Choose Search Engine
            </ThemedText>
            <ScrollView style={styles.engineList} contentContainerStyle={styles.engineListContent} showsVerticalScrollIndicator={false}>
              {SEARCH_ENGINES.map((e) => {
                const selected = e.id === searchEngine;
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => handleEngineSelect(e.id)}
                    style={({ pressed }) => [
                      styles.engineRow,
                      {
                        backgroundColor: selected 
                          ? rgba(tint, isDark ? 0.15 : 0.08) 
                          : pressed 
                            ? rgba(tint, 0.05) 
                            : "transparent",
                        borderColor: selected ? rgba(tint, 0.5) : cardBorder,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                    ]}
                    accessibilityLabel={`Select ${e.label}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <View style={styles.engineRowLeft}>
                      <View style={[styles.engineBadge, { backgroundColor: selected ? tint : rgba(tint, 0.2) }]}>
                        <ThemedText type="defaultSemiBold" style={styles.engineBadgeText}>
                          {e.short}
                        </ThemedText>
                      </View>
                      <ThemedText type={selected ? "defaultSemiBold" : "default"} style={{ color: text }}>
                        {e.label}
                      </ThemedText>
                    </View>
                    {selected && <Feather name="check-circle" size={20} color={tint} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blob: {
    position: "absolute",
    borderRadius: 999,
  },
  incognitoRing: {
    position: "absolute",
    top: "30%",
    left: "50%",
    marginLeft: -40,
    opacity: 0.6,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 16,
  },
  mainCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  logo: { width: 48, height: 48, borderRadius: 14 },
  incognitoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  brandSubtitle: { fontSize: 13, marginTop: 2 },
  headline: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.6,
    lineHeight: 32,
    marginBottom: 18,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1.5,
    paddingLeft: 6,
    paddingRight: 6,
    height: 58,
    gap: 8,
  },
  enginePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  enginePillText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  searchBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  helperText: { fontSize: 12, textAlign: "center", marginTop: 14 },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  quickButton: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quickIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  tipsCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 28,
    height: "70%",
    zIndex: 2,
    elevation: 10,
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
    textAlign: "center",
  },
  engineList: { flex: 1 },
  engineListContent: { paddingBottom: 10 },
  engineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  engineRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  engineBadge: {
    height: 34,
    minWidth: 42,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  engineBadgeText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
