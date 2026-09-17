// ─────────────────────────────────────────────────────────────────────────────
// Tennis Tracker — "rywalizacja drużynowa" (tie): dwie drużyny, wiele
// pojedynczych meczów/debli między nimi. Cienka nakładka na już istniejące
// mecze (atz_matches) — żaden nowy silnik wyników. Wynik rywalizacji to
// liczba wygranych meczów po każdej stronie, jak w Pucharze Davisa. Mecz
// dodany do rywalizacji ma zawsze drużynę A po stronie "team1", drużynę B
// po stronie "team2" (wymuszone przy tworzeniu w MatchSetupPage), więc nie
// trzeba osobno pamiętać, kto był po której stronie.
// ─────────────────────────────────────────────────────────────────────────────
import { deriveWinner } from "./shareLink.js";

const KEY = "atz_team_ties";

function uid() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `tie_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function listTeamTies() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tie) => tie && typeof tie === "object" && tie.id);
  } catch {
    localStorage.removeItem(KEY);
    return [];
  }
}

function saveAll(ties) {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.isArray(ties) ? ties : []));
  } catch {}
}

// Nadpisuje całą listę rywalizacji naraz — używane przy imporcie kopii
// zapasowej (backup.js), gdzie scalanie po id robi wywołujący, tak samo jak
// storage.replaceAllMatches dla meczów.
export function replaceAllTeamTies(ties) {
  saveAll(ties);
}

export function getTeamTie(id) {
  return listTeamTies().find((tie) => tie.id === id) || null;
}

export function createTeamTie(team1Name, team2Name) {
  const now = new Date().toISOString();
  const tie = {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    team1Name,
    team2Name,
    matchIds: [],
  };
  const all = listTeamTies();
  all.unshift(tie);
  saveAll(all);
  return tie;
}

export function updateTeamTie(id, patch) {
  const all = listTeamTies();
  const idx = all.findIndex((tie) => tie.id === id);
  if (idx === -1) return null;
  const updated = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
  all[idx] = updated;
  saveAll(all);
  return updated;
}

export function deleteTeamTie(id) {
  saveAll(listTeamTies().filter((tie) => tie.id !== id));
}

export function addMatchToTie(tieId, matchId) {
  const tie = getTeamTie(tieId);
  if (!tie) return null;
  if (tie.matchIds.includes(matchId)) return tie;
  return updateTeamTie(tieId, { matchIds: [...tie.matchIds, matchId] });
}

// Usuwa mecz z rywalizacji — wywoływane przy kasowaniu meczu (storage.js),
// żeby matchIds nigdy nie wskazywało na już nieistniejący mecz (co zawyżałoby
// "Rozegrano X z Y" o widma po usuniętych meczach).
export function removeMatchFromTie(tieId, matchId) {
  const tie = getTeamTie(tieId);
  if (!tie) return null;
  return updateTeamTie(tieId, { matchIds: tie.matchIds.filter((id) => id !== matchId) });
}

// Wynik rywalizacji — liczy tylko zakończone mecze; mecze wciąż "w trakcie"
// wliczają się do totalCount, ale nie do wonA/wonB dopóki się nie skończą.
export function computeTieScore(tie, matches) {
  let wonA = 0, wonB = 0, playedCount = 0;
  for (const id of tie.matchIds) {
    const m = matches.find((mm) => mm.id === id);
    if (!m || m.status !== "completed") continue;
    playedCount++;
    const winner = deriveWinner(m);
    if (winner === "team1") wonA++;
    else if (winner === "team2") wonB++;
  }
  return { wonA, wonB, playedCount, totalCount: tie.matchIds.length };
}
