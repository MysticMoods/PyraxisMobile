// Force dark theme by default for the app.
// Returning a stable 'dark' string keeps the API compatible with the rest of the codebase.
export function useColorScheme() {
	return 'dark' as const;
}
