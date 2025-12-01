import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useState } from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    TouchableOpacity,
    View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
    visible: boolean;
    onClose: () => void;
    onAction: (action: string, payload?: any) => void;
};

export function BottomSheetMenu({ visible, onClose, onAction }: Props) {
    const bg = useThemeColor({ light: "#fff", dark: "#000" }, "background");
    const rowBg = useThemeColor(
        { light: "#f8f8f8", dark: "#111" },
        "background"
    );
    const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");

    const [desktopSite, setDesktopSite] = useState(false);

    function handle(action: string, payload?: any) {
        onAction(action, payload);
        // keep sheet open for some actions; for now close on every action
        onClose();
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

                <View style={[styles.sheet, { backgroundColor: bg }]}>
                    <ScrollView contentContainerStyle={styles.sheetContent}>
                        {renderRow("New tab", "file", () => handle("new-tab"))}
                        {renderRow("New incognito tab", "user", () =>
                            handle("new-incognito-tab")
                        )}
                        {renderRow("History", "clock", () => handle("history"))}
                        {renderRow("Delete browsing data", "trash", () =>
                            handle("delete-browsing-data")
                        )}
                        {renderRow("Downloads", "download", () =>
                            handle("downloads")
                        )}
                        {renderRow("Bookmarks", "bookmark", () =>
                            handle("bookmarks")
                        )}
                        {renderRow("Recent tabs", "layers", () =>
                            handle("recent-tabs")
                        )}
                        {renderRow("Share", "share", () => handle("share"))}
                        {renderRow("Find in page", "search", () =>
                            handle("find-in-page")
                        )}
                        {renderRow("Translate", "globe", () =>
                            handle("translate")
                        )}
                        {renderRow("Add to Home screen", "home", () =>
                            handle("add-to-home")
                        )}

                        <View
                            style={[
                                styles.rowContainer,
                                { backgroundColor: rowBg },
                            ]}
                        >
                            <View style={styles.rowLeft}>
                                <View
                                    style={{
                                        width: 20,
                                        height: 20,
                                        marginRight: 12,
                                    }}
                                />
                                <ThemedText
                                    style={[
                                        styles.rowText,
                                        { color: textColor },
                                    ]}
                                >
                                    Desktop site
                                </ThemedText>
                            </View>
                            <Switch
                                value={desktopSite}
                                onValueChange={(v) => {
                                    setDesktopSite(v);
                                    onAction("desktop-site", v);
                                }}
                                thumbColor={desktopSite ? "#0a7ea4" : undefined}
                            />
                        </View>

                        {renderRow("Settings", "settings", () =>
                            handle("settings")
                        )}
                        {renderRow("Help & feedback", "help-circle", () =>
                            handle("help-feedback")
                        )}
                    </ScrollView>
                </View>
            </ThemedView>
        </Modal>
    );

    function renderRow(
        title: string,
        icon: React.ComponentProps<typeof Feather>["name"],
        onPress: () => void
    ) {
        const textColorLocal = textColor;
        return (
            <TouchableOpacity
                key={title}
                onPress={onPress}
                style={[styles.rowContainer, { backgroundColor: rowBg }]}
            >
                <View style={styles.rowLeft}>
                    <Feather
                        name={icon}
                        size={20}
                        color={textColorLocal}
                        style={{ marginRight: 12 }}
                    />
                    <ThemedText
                        style={[styles.rowText, { color: textColorLocal }]}
                    >
                        {title}
                    </ThemedText>
                </View>
                <Feather
                    name="chevron-right"
                    size={20}
                    color={textColorLocal}
                />
            </TouchableOpacity>
        );
    }
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: "flex-end",
    },
    backdropTouchable: {
        flex: 1,
    },
    sheet: {
        maxHeight: "80%",
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: "hidden",
    },
    sheetContent: {
        paddingBottom: 24,
    },
    rowContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#222",
    },
    rowLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    rowText: {
        fontSize: 16,
    },
});
