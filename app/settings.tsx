import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
    SEARCH_ENGINES,
    type SearchEngineId,
    getSearchEngineLabel,
    getSearchEngineShort,
    isSearchEngineId,
} from "@/constants/search-engines";
import { setThemePreference, useColorScheme } from "@/hooks/use-color-scheme";
import { haptics } from "@/hooks/use-haptics";

type ThemePreference = "dark" | "light" | "system";

type SettingsV1 = {
  themePreference: ThemePreference;
  desktopSiteDefault: boolean;
  javaScriptEnabled: boolean;
  thirdPartyCookiesEnabled: boolean;
  adBlockEnabled: boolean;
  autoplayMedia: boolean;
  doNotTrack: boolean;
  saveFormData: boolean;
};

const SETTINGS_KEY = "settingsV1";

const DEFAULT_SETTINGS: SettingsV1 = {
  themePreference: "dark",
  desktopSiteDefault: false,
  javaScriptEnabled: true,
  thirdPartyCookiesEnabled: true,
  adBlockEnabled: true,
  autoplayMedia: true,
  doNotTrack: true,
  saveFormData: true,
};

async function loadSettings(): Promise<SettingsV1> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...(typeof parsed === "object" && parsed ? parsed : null),
      };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

async function saveSettings(next: SettingsV1) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {}
}

// Accent colors
const ACCENT_ORANGE = "#FF6B2C";
const ACCENT_TEAL = "#14B8A6";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const isDark = colorScheme === "dark";

  // Modern color palette
  const bg = isDark ? "#0A0A0F" : "#F8FAFC";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const glassOverlay = isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)";
  const text = isDark ? "#FFFFFF" : "#0F172A";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.5)";
  const sectionText = isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.4)";

  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<SettingsV1>(DEFAULT_SETTINGS);
  const [searchEngine, setSearchEngine] = useState<SearchEngineId>("google");
  const [enginePickerVisible, setEnginePickerVisible] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, engineRaw] = await Promise.all([
        loadSettings(),
        AsyncStorage.getItem("searchEngine"),
      ]);
      setSettings(s);
      setSearchEngine(isSearchEngineId(engineRaw) ? engineRaw : "google");
      setHydrated(true);
    })();
  }, []);

  const engineLabel = getSearchEngineLabel(searchEngine);
  const engineShort = getSearchEngineShort(searchEngine);

  async function updateSettings(patch: Partial<SettingsV1>) {
    haptics.light();
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);

    if (patch.themePreference) {
      await setThemePreference(patch.themePreference);
    }
  }

  async function updateSearchEngine(next: SearchEngineId) {
    haptics.light();
    setSearchEngine(next);
    try {
      await AsyncStorage.setItem("searchEngine", next);
    } catch {}
  }

  async function clearBrowsingData() {
    haptics.success();
    try {
      await Promise.all([
        AsyncStorage.removeItem("history"),
        AsyncStorage.removeItem("bookmarks"),
        AsyncStorage.removeItem("closedTabs"),
        AsyncStorage.removeItem("downloads"),
        AsyncStorage.removeItem("tabsStateV1"),
      ]);
    } catch {}
  }

  const themeOptions: { id: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = useMemo(
    () => [
      { id: "system", label: "Auto", icon: "phone-portrait-outline" },
      { id: "light", label: "Light", icon: "sunny-outline" },
      { id: "dark", label: "Dark", icon: "moon-outline" },
    ],
    []
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: bg }]}>
      {/* Background gradient accents */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={[isDark ? "rgba(255,107,44,0.08)" : "rgba(255,107,44,0.05)", "transparent"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 300 }}
        />
        <LinearGradient
          colors={["transparent", isDark ? "rgba(20,184,166,0.06)" : "rgba(20,184,166,0.03)"]}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 200 }}
        />
      </View>

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: cardBorder,
            paddingTop: Math.max(insets.top, 12) + 8,
            backgroundColor: isDark ? "rgba(10,10,15,0.8)" : "rgba(248,250,252,0.8)",
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            haptics.light();
            router.back();
          }}
          style={styles.headerBtn}
          accessibilityLabel="Back"
          hitSlop={12}
        >
          <View style={[styles.iconCircle, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Feather name="arrow-left" size={18} color={text} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LinearGradient
            colors={[ACCENT_ORANGE, ACCENT_TEAL]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerIcon}
          >
            <Feather name="settings" size={16} color="#fff" />
          </LinearGradient>
          <ThemedText type="subtitle" style={{ color: text, fontSize: 18, fontWeight: "700" }}>
            Settings
          </ThemedText>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Search Section */}
        <Section title="SEARCH" icon="search" sectionText={sectionText}>
          <GlassCard bg={cardBg} border={cardBorder} glassOverlay={glassOverlay}>
            <TouchableOpacity
              onPress={() => {
                haptics.light();
                setEnginePickerVisible(true);
              }}
              style={styles.settingRow}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${ACCENT_ORANGE}20` }]}>
                  <Ionicons name="globe-outline" size={18} color={ACCENT_ORANGE} />
                </View>
                <View>
                  <Text style={[styles.settingTitle, { color: text }]}>Search Engine</Text>
                  <Text style={[styles.settingSubtitle, { color: muted }]}>{engineLabel}</Text>
                </View>
              </View>
              <View style={styles.settingRight}>
                <LinearGradient
                  colors={[ACCENT_ORANGE, "#FF8F5C"]}
                  style={styles.enginePill}
                >
                  <Text style={styles.enginePillText}>{engineShort}</Text>
                </LinearGradient>
                <Feather name="chevron-right" size={16} color={muted} />
              </View>
            </TouchableOpacity>
          </GlassCard>
        </Section>

        {/* Appearance Section */}
        <Section title="APPEARANCE" icon="eye" sectionText={sectionText}>
          <GlassCard bg={cardBg} border={cardBorder} glassOverlay={glassOverlay}>
            <View style={styles.themeSection}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${ACCENT_TEAL}20` }]}>
                  <Ionicons name="color-palette-outline" size={18} color={ACCENT_TEAL} />
                </View>
                <View>
                  <Text style={[styles.settingTitle, { color: text }]}>Theme</Text>
                  <Text style={[styles.settingSubtitle, { color: muted }]}>Choose your preferred look</Text>
                </View>
              </View>
            </View>
            <View style={styles.themeChipsContainer}>
              {themeOptions.map((o) => {
                const selected = settings.themePreference === o.id;
                return (
                  <TouchableOpacity
                    key={o.id}
                    onPress={() => updateSettings({ themePreference: o.id })}
                    style={styles.themeChipWrapper}
                    activeOpacity={0.8}
                  >
                    {selected ? (
                      <LinearGradient
                        colors={[ACCENT_ORANGE, ACCENT_TEAL]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.themeChip}
                      >
                        <Ionicons name={o.icon} size={16} color="#fff" />
                        <Text style={styles.themeChipTextSelected}>{o.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.themeChip, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderWidth: 1, borderColor: cardBorder }]}>
                        <Ionicons name={o.icon} size={16} color={muted} />
                        <Text style={[styles.themeChipText, { color: text }]}>{o.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassCard>
        </Section>

        {/* Browsing Section */}
        <Section title="BROWSING" icon="compass" sectionText={sectionText}>
          <GlassCard bg={cardBg} border={cardBorder} glassOverlay={glassOverlay}>
            <ToggleRowModern
              icon="desktop-outline"
              iconColor="#8B5CF6"
              title="Desktop Mode"
              subtitle="Request desktop versions of sites"
              value={settings.desktopSiteDefault}
              onValueChange={(v) => updateSettings({ desktopSiteDefault: v })}
              text={text}
              muted={muted}
            />
            <View style={[styles.divider, { backgroundColor: cardBorder }]} />
            <ToggleRowModern
              icon="play-circle-outline"
              iconColor="#EC4899"
              title="Autoplay Media"
              subtitle="Allow videos to play automatically"
              value={settings.autoplayMedia}
              onValueChange={(v) => updateSettings({ autoplayMedia: v })}
              text={text}
              muted={muted}
            />
            <View style={[styles.divider, { backgroundColor: cardBorder }]} />
            <ToggleRowModern
              icon="document-text-outline"
              iconColor="#06B6D4"
              title="Save Form Data"
              subtitle="Remember form inputs for autofill"
              value={settings.saveFormData}
              onValueChange={(v) => updateSettings({ saveFormData: v })}
              text={text}
              muted={muted}
            />
          </GlassCard>
        </Section>

        {/* Privacy Section */}
        <Section title="PRIVACY & SECURITY" icon="shield-checkmark" sectionText={sectionText}>
          <GlassCard bg={cardBg} border={cardBorder} glassOverlay={glassOverlay}>
            <ToggleRowModern
              icon="logo-javascript"
              iconColor="#F59E0B"
              title="JavaScript"
              subtitle="Required for most websites"
              value={settings.javaScriptEnabled}
              onValueChange={(v) => updateSettings({ javaScriptEnabled: v })}
              text={text}
              muted={muted}
            />
            <View style={[styles.divider, { backgroundColor: cardBorder }]} />
            <ToggleRowModern
              icon="finger-print-outline"
              iconColor="#10B981"
              title="Third-Party Cookies"
              subtitle="May be needed for some logins"
              value={settings.thirdPartyCookiesEnabled}
              onValueChange={(v) => updateSettings({ thirdPartyCookiesEnabled: v })}
              text={text}
              muted={muted}
            />
            <View style={[styles.divider, { backgroundColor: cardBorder }]} />
            <ToggleRowModern
              icon="eye-off-outline"
              iconColor="#6366F1"
              title="Do Not Track"
              subtitle="Request sites not to track you"
              value={settings.doNotTrack}
              onValueChange={(v) => updateSettings({ doNotTrack: v })}
              text={text}
              muted={muted}
            />
            <View style={[styles.divider, { backgroundColor: cardBorder }]} />
            <ToggleRowModern
              icon="shield-outline"
              iconColor="#EF4444"
              title="Ad Blocker"
              subtitle="Block ads and trackers"
              value={settings.adBlockEnabled}
              onValueChange={(v) => updateSettings({ adBlockEnabled: v })}
              text={text}
              muted={muted}
            />
          </GlassCard>
        </Section>

        {/* Data Section */}
        <Section title="DATA" icon="server" sectionText={sectionText}>
          <GlassCard bg={cardBg} border={cardBorder} glassOverlay={glassOverlay}>
            <TouchableOpacity
              onPress={() => setConfirmClear(true)}
              style={styles.settingRow}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </View>
                <View>
                  <Text style={[styles.settingTitle, { color: text }]}>Clear Browsing Data</Text>
                  <Text style={[styles.settingSubtitle, { color: muted }]}>History, tabs, downloads</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={16} color={muted} />
            </TouchableOpacity>
          </GlassCard>
        </Section>

        {/* About Section */}
        <Section title="ABOUT" icon="information-circle" sectionText={sectionText}>
          <GlassCard bg={cardBg} border={cardBorder} glassOverlay={glassOverlay}>
            <View style={styles.aboutRow}>
              <LinearGradient
                colors={[ACCENT_ORANGE, ACCENT_TEAL]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.appIcon}
              >
                <MaterialCommunityIcons name="web" size={24} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.appName, { color: text }]}>Pyraxis Browser</Text>
                <Text style={[styles.appVersion, { color: muted }]}>Version 1.0.0</Text>
              </View>
            </View>
          </GlassCard>
        </Section>

        {!hydrated && (
          <Text style={{ color: muted, textAlign: "center", marginTop: 20 }}>Loading…</Text>
        )}
      </ScrollView>

      {/* Search Engine Picker Modal */}
      <Modal
        transparent
        visible={enginePickerVisible}
        animationType="fade"
        onRequestClose={() => setEnginePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEnginePickerVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: isDark ? "#0F0F14" : "#FFFFFF" }]}>
            <View style={[styles.modalHandle, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)" }]} />
            <View style={styles.modalHeader}>
              <LinearGradient
                colors={[ACCENT_ORANGE, ACCENT_TEAL]}
                style={styles.modalIcon}
              >
                <Ionicons name="globe-outline" size={18} color="#fff" />
              </LinearGradient>
              <Text style={[styles.modalTitle, { color: text }]}>Choose Search Engine</Text>
            </View>
            <ScrollView style={{ marginTop: 16 }} contentContainerStyle={{ paddingBottom: 16 }}>
              {SEARCH_ENGINES.map((e) => {
                const selected = e.id === searchEngine;
                return (
                  <TouchableOpacity
                    key={e.id}
                    onPress={async () => {
                      await updateSearchEngine(e.id);
                      setEnginePickerVisible(false);
                    }}
                    style={[
                      styles.engineRow,
                      {
                        backgroundColor: selected 
                          ? (isDark ? "rgba(255,107,44,0.12)" : "rgba(255,107,44,0.08)")
                          : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
                        borderColor: selected ? ACCENT_ORANGE : cardBorder,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <LinearGradient
                        colors={selected ? [ACCENT_ORANGE, "#FF8F5C"] : [isDark ? "#2A2A35" : "#E5E7EB", isDark ? "#2A2A35" : "#E5E7EB"]}
                        style={styles.engineBadge}
                      >
                        <Text style={[styles.engineBadgeText, { color: selected ? "#fff" : text }]}>{e.short}</Text>
                      </LinearGradient>
                      <Text style={{ color: text, fontWeight: selected ? "700" : "500", fontSize: 15 }}>
                        {e.label}
                      </Text>
                    </View>
                    {selected && (
                      <LinearGradient
                        colors={[ACCENT_ORANGE, ACCENT_TEAL]}
                        style={styles.checkCircle}
                      >
                        <Feather name="check" size={12} color="#fff" />
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Clear Data Confirmation Modal */}
      <Modal
        transparent
        visible={confirmClear}
        animationType="fade"
        onRequestClose={() => setConfirmClear(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setConfirmClear(false)} />
          <View style={[styles.confirmSheet, { backgroundColor: isDark ? "#0F0F14" : "#FFFFFF" }]}>
            <View style={styles.confirmIcon}>
              <LinearGradient
                colors={["#EF4444", "#F87171"]}
                style={styles.confirmIconInner}
              >
                <Ionicons name="warning-outline" size={28} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={[styles.confirmTitle, { color: text }]}>Clear Browsing Data?</Text>
            <Text style={[styles.confirmSubtitle, { color: muted }]}>
              This will permanently delete your history, saved tabs, bookmarks, and downloads.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                onPress={() => setConfirmClear(false)}
                style={[styles.confirmBtn, styles.confirmBtnCancel, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}
              >
                <Text style={[styles.confirmBtnText, { color: text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  await clearBrowsingData();
                  setConfirmClear(false);
                }}
                style={[styles.confirmBtn, styles.confirmBtnDelete]}
              >
                <LinearGradient
                  colors={["#EF4444", "#DC2626"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                <Text style={[styles.confirmBtnText, { color: "#fff" }]}>Clear Data</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

function Section({ title, icon, sectionText, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; sectionText: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={14} color={sectionText} />
        <Text style={[styles.sectionTitle, { color: sectionText }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function GlassCard({ bg, border, glassOverlay, children }: { bg: string; border: string; glassOverlay: string; children: React.ReactNode }) {
  return (
    <View style={[styles.glassCard, { backgroundColor: bg, borderColor: border }]}>
      <View style={[styles.glassOverlay, { backgroundColor: glassOverlay }]} />
      <View style={styles.glassContent}>{children}</View>
    </View>
  );
}

function ToggleRowModern(props: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  text: string;
  muted: string;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: `${props.iconColor}20` }]}>
          <Ionicons name={props.icon} size={18} color={props.iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.settingTitle, { color: props.text }]}>{props.title}</Text>
          {!!props.subtitle && (
            <Text style={[styles.settingSubtitle, { color: props.muted }]}>{props.subtitle}</Text>
          )}
        </View>
      </View>
      <Switch
        value={props.value}
        onValueChange={props.onValueChange}
        trackColor={{ false: "rgba(120,120,120,0.3)", true: ACCENT_TEAL }}
        thumbColor={props.value ? "#fff" : "#ccc"}
        ios_backgroundColor="rgba(120,120,120,0.3)"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  iconCircle: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  content: { padding: 16, gap: 24 },

  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 4 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },

  glassCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  glassOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  glassContent: { padding: 4 },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingTitle: { fontSize: 15, fontWeight: "600" },
  settingSubtitle: { fontSize: 12, marginTop: 2 },

  divider: { height: 1, marginHorizontal: 14 },

  themeSection: { paddingVertical: 14, paddingHorizontal: 14 },
  themeChipsContainer: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  themeChipWrapper: { flex: 1 },
  themeChip: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  themeChipText: { fontSize: 13, fontWeight: "600" },
  themeChipTextSelected: { fontSize: 13, fontWeight: "700", color: "#fff" },

  enginePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  enginePillText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  aboutRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  appIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  appName: { fontSize: 16, fontWeight: "700" },
  appVersion: { fontSize: 13, marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: "70%",
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  modalIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 18, fontWeight: "700" },

  engineRow: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  engineBadge: { height: 34, minWidth: 44, paddingHorizontal: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  engineBadgeText: { fontWeight: "800", fontSize: 13 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },

  confirmSheet: {
    borderRadius: 28,
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 24,
    alignItems: "center",
  },
  confirmIcon: { marginBottom: 16 },
  confirmIconInner: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  confirmTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  confirmSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  confirmButtons: { flexDirection: "row", gap: 12, marginTop: 24, width: "100%" },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", overflow: "hidden" },
  confirmBtnCancel: {},
  confirmBtnDelete: {},
  confirmBtnText: { fontWeight: "700", fontSize: 15 },
});
