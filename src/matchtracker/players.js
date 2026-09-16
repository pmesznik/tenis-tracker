// ─────────────────────────────────────────────────────────────────────────────
// Tennis Tracker — "pamięć" zawodników: lista znanych nazwisk, podpowiedzi
// przeciwników i ulubieni gracze, wszystko wyliczone z historii meczów
// (atz_matches) zamiast trzymane jako osobny, mogący się rozjechać stan —
// ten sam pure-derive pattern co w scoringEngine.js.
// ─────────────────────────────────────────────────────────────────────────────

const FAVORITES_KEY = "atz_favorite_players";

export function getFavoritePlayers() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "string" && n) : [];
  } catch {
    localStorage.removeItem(FAVORITES_KEY);
    return [];
  }
}

function saveFavorites(list) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  } catch {}
}

// Używane przy imporcie kopii zapasowej (backup.js) do zapisania scalonej
// listy ulubionych naraz.
export function setFavoritePlayers(list) {
  saveFavorites(Array.isArray(list) ? list.filter((n) => typeof n === "string" && n) : []);
}

export function isFavoritePlayer(name) {
  return getFavoritePlayers().includes(name);
}

// Przełącza (dodaje/usuwa) nazwisko na liście ulubionych. Zwraca nową listę.
export function toggleFavoritePlayer(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return getFavoritePlayers();
  const current = getFavoritePlayers();
  const next = current.includes(trimmed) ? current.filter((n) => n !== trimmed) : [...current, trimmed];
  saveFavorites(next);
  return next;
}

// Wszystkie nazwiska, które kiedykolwiek pojawiły się w zapisanym meczu
// (obie drużyny, single i debel), do podpowiedzi przy wpisywaniu.
// opponentCounts[nazwisko][przeciwnik] = ile razy grali przeciwko sobie —
// używane do sortowania podpowiedzi przeciwników od najczęstszych.
export function buildPlayerIndex(matches) {
  const allNamesSet = new Set();
  const opponentCounts = {};

  const bump = (a, b) => {
    if (!opponentCounts[a]) opponentCounts[a] = {};
    opponentCounts[a][b] = (opponentCounts[a][b] || 0) + 1;
  };

  for (const m of matches) {
    const names1 = (m.team1?.names || []).filter(Boolean);
    const names2 = (m.team2?.names || []).filter(Boolean);
    for (const n of names1) allNamesSet.add(n);
    for (const n of names2) allNamesSet.add(n);
    for (const a of names1) {
      for (const b of names2) {
        bump(a, b);
        bump(b, a);
      }
    }
  }

  return {
    allNames: [...allNamesSet].sort((a, b) => a.localeCompare(b)),
    opponentCounts,
  };
}

export function suggestOpponents(index, name, limit = 5) {
  const trimmed = (name || "").trim();
  const counts = index.opponentCounts[trimmed];
  if (!counts) return [];
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([n]) => n);
}
