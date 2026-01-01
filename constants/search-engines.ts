export const SEARCH_ENGINES = [
  {
    id: "brave",
    label: "Brave",
    short: "B",
    buildUrl: (q: string) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "google",
    label: "Google",
    short: "G",
    buildUrl: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "duckduckgo",
    label: "DuckDuckGo",
    short: "D",
    buildUrl: (q: string) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  },
  {
    id: "bing",
    label: "Bing",
    short: "Bi",
    buildUrl: (q: string) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "perplexity",
    label: "Perplexity",
    short: "Px",
    buildUrl: (q: string) => `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "yahoo",
    label: "Yahoo",
    short: "Y",
    buildUrl: (q: string) => `https://search.yahoo.com/search?p=${encodeURIComponent(q)}`,
  },
  {
    id: "startpage",
    label: "StartPage",
    short: "SP",
    buildUrl: (q: string) => `https://www.startpage.com/sp/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "ecosia",
    label: "Ecosia",
    short: "E",
    buildUrl: (q: string) => `https://www.ecosia.org/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "yandex",
    label: "Yandex",
    short: "Ya",
    buildUrl: (q: string) => `https://yandex.com/search/?text=${encodeURIComponent(q)}`,
  },
  {
    id: "swisscows",
    label: "Swisscows",
    short: "Sw",
    buildUrl: (q: string) => `https://swisscows.com/web?query=${encodeURIComponent(q)}`,
  },
  {
    id: "kagi",
    label: "Kagi",
    short: "K",
    buildUrl: (q: string) => `https://kagi.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "mojeek",
    label: "Mojeek",
    short: "M",
    buildUrl: (q: string) => `https://www.mojeek.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "searxng",
    label: "Searxng",
    short: "Sx",
    buildUrl: (q: string) => `https://searx.me/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "openverse",
    label: "Openverse",
    short: "Ov",
    buildUrl: (q: string) => `https://wordpress.org/openverse/search/?q=${encodeURIComponent(q)}`,
  },
  {
    id: "you",
    label: "You.com",
    short: "Yc",
    buildUrl: (q: string) => `https://you.com/search?q=${encodeURIComponent(q)}`,
  },
] as const;

export type SearchEngineId = (typeof SEARCH_ENGINES)[number]['id'];

export function getSearchEngineShort(id: SearchEngineId) {
  return SEARCH_ENGINES.find((e) => e.id === id)?.short ?? id;
}

export function isSearchEngineId(value: unknown): value is SearchEngineId {
  return (
    typeof value === 'string' &&
    (SEARCH_ENGINES as readonly { id: string }[]).some((e) => e.id === value)
  );
}

export function getSearchEngineLabel(id: SearchEngineId) {
  return SEARCH_ENGINES.find((e) => e.id === id)?.label ?? id;
}
