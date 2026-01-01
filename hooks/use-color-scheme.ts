import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

export type ThemePreference = "dark" | "light" | "system";

const THEME_PREF_KEY = "themePreference";

let currentPref: ThemePreference = "dark";
let didInit = false;
const listeners = new Set<(p: ThemePreference) => void>();

function setPrefLocal(next: ThemePreference) {
	currentPref = next;
	for (const l of listeners) l(next);
}

async function initOnce() {
	if (didInit) return;
	didInit = true;
	try {
		const v = await AsyncStorage.getItem(THEME_PREF_KEY);
		if (v === "light" || v === "dark" || v === "system") setPrefLocal(v);
	} catch {}
}

export async function setThemePreference(next: ThemePreference) {
	setPrefLocal(next);
	try {
		await AsyncStorage.setItem(THEME_PREF_KEY, next);
	} catch {}
}

// Defaults to dark to preserve existing app behavior.
export function useColorScheme() {
	const system = useRNColorScheme() ?? "light";
	const [pref, setPref] = useState<ThemePreference>(currentPref);

	useEffect(() => {
		initOnce();
		const handler = (p: ThemePreference) => setPref(p);
		listeners.add(handler);
		return () => {
			listeners.delete(handler);
		};
	}, []);

	if (pref === "system") return system;
	return pref;
}
