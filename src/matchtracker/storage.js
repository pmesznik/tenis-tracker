// ─────────────────────────────────────────────────────────────────────────────
// Tennis Tracker v0.1.0
// storage.js — lokalne przechowywanie meczów (localStorage), ten sam
// defensywny wzorzec co getFavorites/saveFavorites w App.jsx: przy błędnym
// JSON-ie czyścimy klucz zamiast wywalać całą aplikację.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = "atz_matches";

function uid() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function listMatches() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m) => m && typeof m === "object" && m.id);
  } catch {
    localStorage.removeItem(KEY);
    return [];
  }
}

function saveAll(matches) {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.isArray(matches) ? matches : []));
  } catch {}
}

export function getMatch(id) {
  return listMatches().find((m) => m.id === id) || null;
}

export function createMatch(data) {
  const now = new Date().toISOString();
  const match = {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    status: "in_progress",
    team1: { names: ["Gracz 1"] },
    team2: { names: ["Gracz 2"] },
    isDoubles: false,
    rules: null,
    trackingDepth: "basic",
    date: now.slice(0, 10),
    surface: "Twarda",
    note: "",
    initialServer: "team1",
    pointLog: [],
    finalSetsOverride: null, // dla "Zapisz wynik" — ręcznie wpisany wynik bez pointLog
    ...data,
  };
  const all = listMatches();
  all.unshift(match);
  saveAll(all);
  return match;
}

export function updateMatch(id, patch) {
  const all = listMatches();
  const idx = all.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const updated = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
  all[idx] = updated;
  saveAll(all);
  return updated;
}

export function deleteMatch(id) {
  const all = listMatches().filter((m) => m.id !== id);
  saveAll(all);
}
