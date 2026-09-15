// ─────────────────────────────────────────────────────────────────────────────
// Tenis Tracker v0.1.0
// scoringEngine.js — czysta logika liczenia wyniku meczu tenisowego.
//
// Kluczowa decyzja architektoniczna: computeScore() NIE trzyma mutowalnego
// stanu "aktualny wynik" krok po kroku. Zamiast tego za każdym razem odtwarza
// (replay) cały wynik od zera na podstawie listy punktów (pointLog). Dzięki
// temu Undo to po prostu "usuń ostatni punkt z listy i policz jeszcze raz" —
// wynik nigdy nie może się rozjechać z historią punktów.
// ─────────────────────────────────────────────────────────────────────────────

export const TEAM1 = "team1";
export const TEAM2 = "team2";

export function otherTeam(team) {
  return team === TEAM1 ? TEAM2 : TEAM1;
}

// ─── PRESETY ZASAD ─────────────────────────────────────────────────────────
// gamesPerSet: do ilu gemów wygrywa się seta (normalnego, bez tie-breaka).
// tiebreakAt: przy jakim wyniku gemów pada tie-break (zwykle == gamesPerSet).
// tiebreakTo: do ilu punktów gra się tie-break (różnica min. 2).
// finalSetSuperTiebreak: czy ostatni, decydujący set zastąpiony jest w całości
//   jednym super tie-breakiem (zamiast pełnego seta).
export const PRESETS = {
  best_of_3_tb: {
    key: "best_of_3_tb",
    label: "Do 2 wygranych setów (z tie-breakiem)",
    sets: 3, gamesPerSet: 6, noAd: false,
    tiebreakAt: 6, tiebreakTo: 7,
    finalSetSuperTiebreak: false, finalSetSuperTiebreakTo: 10,
    bullets: [
      "Mecz do 2 wygranych setów", "Set do 6 gemów", "Zwykły system przewag (deuce)",
      "Tie-break do 7 przy 6:6 (w każdym secie)",
    ],
  },
  best_of_3_super_tb: {
    key: "best_of_3_super_tb",
    label: "Do 2 wygranych setów + super tie-break",
    sets: 3, gamesPerSet: 6, noAd: false,
    tiebreakAt: 6, tiebreakTo: 7,
    finalSetSuperTiebreak: true, finalSetSuperTiebreakTo: 10,
    bullets: [
      "Mecz do 2 wygranych setów", "Set do 6 gemów", "Zwykły system przewag (deuce)",
      "Tie-break do 7 przy 6:6", "Super tie-break zamiast 3. seta",
    ],
  },
  best_of_3_no_ad: {
    key: "best_of_3_no_ad",
    label: "Do 2 wygranych setów, bez przewag + super tie-break",
    sets: 3, gamesPerSet: 6, noAd: true,
    tiebreakAt: 6, tiebreakTo: 7,
    finalSetSuperTiebreak: true, finalSetSuperTiebreakTo: 10,
    bullets: [
      "Mecz do 2 wygranych setów", "Set do 6 gemów", "Bez przewag (punkt decydujący przy 40:40)",
      "Tie-break do 7 przy 6:6", "Super tie-break zamiast 3. seta",
    ],
  },
  pro_set_8: {
    key: "pro_set_8",
    label: "Pro-set do 8 gemów",
    sets: 1, gamesPerSet: 8, noAd: false,
    tiebreakAt: 8, tiebreakTo: 7,
    finalSetSuperTiebreak: false, finalSetSuperTiebreakTo: 10,
    bullets: ["Jeden set", "Set do 8 gemów", "Zwykły system przewag (deuce)", "Tie-break do 7 przy 8:8"],
  },
  best_of_5_tb: {
    key: "best_of_5_tb",
    label: "Do 3 wygranych setów (z tie-breakiem)",
    sets: 5, gamesPerSet: 6, noAd: false,
    tiebreakAt: 6, tiebreakTo: 7,
    finalSetSuperTiebreak: false, finalSetSuperTiebreakTo: 10,
    bullets: [
      "Mecz do 3 wygranych setów", "Set do 6 gemów", "Zwykły system przewag (deuce)",
      "Tie-break do 7 przy 6:6 (w każdym secie)",
    ],
  },
};

export const DEFAULT_PRESET_KEY = "best_of_3_super_tb";

const POINT_LABELS = ["0", "15", "30", "40"];

// Zwraca 'A' | 'B' | null (gem jeszcze trwa).
function gameWinner(pA, pB, noAd) {
  const leader = Math.max(pA, pB);
  if (leader < 4) return null;
  const diff = Math.abs(pA - pB);
  if (noAd && Math.min(pA, pB) >= 3) {
    // Po dojściu do 40:40 w formacie no-Ad kolejny punkt decyduje od razu
    // (złoty punkt) — bez wymogu przewagi 2 punktów.
    return diff >= 1 ? (pA > pB ? "A" : "B") : null;
  }
  return diff >= 2 ? (pA > pB ? "A" : "B") : null;
}

// Etykieta wyniku w geme (0/15/30/40/Ad/Deuce) do wyświetlenia.
function formatGamePoints(pA, pB, noAd) {
  if (pA < 3 && pB < 3) {
    return { a: POINT_LABELS[pA], b: POINT_LABELS[pB], deuce: false };
  }
  if (pA >= 3 && pB >= 3) {
    if (pA === pB) return { a: "40", b: "40", deuce: true, deciding: noAd };
    if (noAd) return { a: "40", b: "40", deuce: true, deciding: true }; // nie powinno się zdarzyć (gem kończy się od razu)
    return pA > pB ? { a: "Ad", b: "40", deuce: false } : { a: "40", b: "Ad", deuce: false };
  }
  return pA >= 3
    ? { a: "40", b: POINT_LABELS[pB], deuce: false }
    : { a: POINT_LABELS[pA], b: "40", deuce: false };
}

// Kto serwuje dany (1-indeksowany) punkt tie-breaka, licząc od pierwszego
// serwującego tie-breaka (rotacja 1-2-2-2...).
function tiebreakServerAt(pointNumber1Indexed, firstServer) {
  if (pointNumber1Indexed <= 1) return firstServer;
  const pairIndex = Math.floor((pointNumber1Indexed - 2) / 2);
  return pairIndex % 2 === 0 ? otherTeam(firstServer) : firstServer;
}

/**
 * Odtwarza cały mecz od zera na podstawie listy punktów.
 * @param {object} rules - patrz PRESETS
 * @param {Array<{winner: 'team1'|'team2'}>} pointLog
 * @param {'team1'|'team2'} initialServer - kto serwował na starcie meczu
 */
export function computeScore(rules, pointLog, initialServer = TEAM1) {
  const sets = []; // ukończone sety: {a,b,isSuperTiebreak,tiebreak?:{a,b}}
  let curSetGamesA = 0, curSetGamesB = 0;
  let curPtsA = 0, curPtsB = 0; // punkty w aktualnym geme / tie-breaku / super-TB
  let setsWonA = 0, setsWonB = 0;
  let completedGames = 0; // do naprzemienności serwisu w całym meczu
  let matchWinner = null;
  let tiebreakFirstServerForCurrentGame = null;

  const setsToWinMatch = Math.ceil(rules.sets / 2);
  const isFinalSet = () => setsWonA + setsWonB === rules.sets - 1;
  const inTiebreakGame = () => curSetGamesA === rules.tiebreakAt && curSetGamesB === rules.tiebreakAt;
  const isSuperTiebreakSet = () =>
    rules.finalSetSuperTiebreak && isFinalSet() && curSetGamesA === 0 && curSetGamesB === 0;

  for (const pt of pointLog) {
    if (matchWinner) break; // punkty po zakończeniu meczu ignorujemy (nie powinny wystąpić)
    const aWins = pt.winner === TEAM1;

    if (isSuperTiebreakSet()) {
      if (aWins) curPtsA++; else curPtsB++;
      const target = rules.finalSetSuperTiebreakTo;
      if (Math.max(curPtsA, curPtsB) >= target && Math.abs(curPtsA - curPtsB) >= 2) {
        sets.push({ a: curPtsA, b: curPtsB, isSuperTiebreak: true });
        if (curPtsA > curPtsB) setsWonA++; else setsWonB++;
        curPtsA = 0; curPtsB = 0; curSetGamesA = 0; curSetGamesB = 0;
        completedGames++;
        if (setsWonA === setsToWinMatch) matchWinner = TEAM1;
        if (setsWonB === setsToWinMatch) matchWinner = TEAM2;
      }
      continue;
    }

    if (inTiebreakGame()) {
      if (tiebreakFirstServerForCurrentGame === null) {
        tiebreakFirstServerForCurrentGame = completedGames % 2 === 0 ? initialServer : otherTeam(initialServer);
      }
      if (aWins) curPtsA++; else curPtsB++;
      const target = rules.tiebreakTo;
      if (Math.max(curPtsA, curPtsB) >= target && Math.abs(curPtsA - curPtsB) >= 2) {
        const aWinsTb = curPtsA > curPtsB;
        if (aWinsTb) curSetGamesA++; else curSetGamesB++;
        sets.push({ a: curSetGamesA, b: curSetGamesB, isSuperTiebreak: false, tiebreak: { a: curPtsA, b: curPtsB } });
        if (curSetGamesA > curSetGamesB) setsWonA++; else setsWonB++;
        curSetGamesA = 0; curSetGamesB = 0; curPtsA = 0; curPtsB = 0;
        completedGames++;
        tiebreakFirstServerForCurrentGame = null;
        if (setsWonA === setsToWinMatch) matchWinner = TEAM1;
        if (setsWonB === setsToWinMatch) matchWinner = TEAM2;
      }
      continue;
    }

    // Zwykły gem
    if (aWins) curPtsA++; else curPtsB++;
    const gw = gameWinner(curPtsA, curPtsB, rules.noAd);
    if (gw) {
      if (gw === "A") curSetGamesA++; else curSetGamesB++;
      curPtsA = 0; curPtsB = 0;
      completedGames++;
      const a = curSetGamesA, b = curSetGamesB;
      if ((a >= rules.gamesPerSet || b >= rules.gamesPerSet) && Math.abs(a - b) >= 2) {
        sets.push({ a, b, isSuperTiebreak: false });
        if (a > b) setsWonA++; else setsWonB++;
        curSetGamesA = 0; curSetGamesB = 0;
        if (setsWonA === setsToWinMatch) matchWinner = TEAM1;
        if (setsWonB === setsToWinMatch) matchWinner = TEAM2;
      }
      // w przeciwnym razie: jeśli a===b===tiebreakAt, kolejny punkt trafi w
      // gałąź inTiebreakGame() automatycznie w następnej iteracji.
    }
  }

  const server = matchWinner
    ? null
    : completedGames % 2 === 0 ? initialServer : otherTeam(initialServer);

  const inTb = !matchWinner && inTiebreakGame();
  const inSuperTb = !matchWinner && isSuperTiebreakSet();

  let game;
  if (matchWinner) {
    game = null;
  } else if (inSuperTb) {
    game = { a: String(curPtsA), b: String(curPtsB), isTiebreak: true, isSuperTiebreak: true, server };
  } else if (inTb) {
    const pointsSoFar = curPtsA + curPtsB;
    const tbServer = tiebreakServerAt(pointsSoFar + 1, tiebreakFirstServerForCurrentGame ?? server);
    game = { a: String(curPtsA), b: String(curPtsB), isTiebreak: true, isSuperTiebreak: false, server: tbServer };
  } else {
    const g = formatGamePoints(curPtsA, curPtsB, rules.noAd);
    game = { a: g.a, b: g.b, deuce: g.deuce, isTiebreak: false, isSuperTiebreak: false, server };
  }

  return {
    sets,
    setsWonA, setsWonB,
    curSetGamesA, curSetGamesB,
    server,
    matchWinner,
    game,
    isMatchPoint: !matchWinner && computeIsMatchPoint(rules, { curPtsA, curPtsB, curSetGamesA, curSetGamesB, setsWonA, setsWonB, setsToWinMatch, inTb, inSuperTb, noAd: rules.noAd }),
  };
}

// Best-effort wykrycie "piłki meczowej" (do ewentualnego podświetlenia w UI).
function computeIsMatchPoint(rules, s) {
  const oneSetFromMatchA = s.setsWonA === s.setsToWinMatch - 1;
  const oneSetFromMatchB = s.setsWonB === s.setsToWinMatch - 1;
  if (!oneSetFromMatchA && !oneSetFromMatchB) return false;
  if (s.inSuperTb) {
    const target = rules.finalSetSuperTiebreakTo;
    return (oneSetFromMatchA && s.curPtsA >= target - 1 && s.curPtsA - s.curPtsB >= 1) ||
           (oneSetFromMatchB && s.curPtsB >= target - 1 && s.curPtsB - s.curPtsA >= 1);
  }
  if (s.inTb) {
    const target = rules.tiebreakTo;
    return (oneSetFromMatchA && s.curPtsA >= target - 1 && s.curPtsA - s.curPtsB >= 1) ||
           (oneSetFromMatchB && s.curPtsB >= target - 1 && s.curPtsB - s.curPtsA >= 1);
  }
  // zwykły gem: sprawdź czy wygrana tego punktu kończy gem I set I mecz
  const oneGameFromSetA = s.curSetGamesA >= rules.gamesPerSet - 1 && s.curSetGamesA - s.curSetGamesB >= 1;
  const oneGameFromSetB = s.curSetGamesB >= rules.gamesPerSet - 1 && s.curSetGamesB - s.curSetGamesA >= 1;
  const gw = gameWinner(s.curPtsA + 1, s.curPtsB, s.noAd) === "A";
  const gwB = gameWinner(s.curPtsA, s.curPtsB + 1, s.noAd) === "B";
  return (oneSetFromMatchA && oneGameFromSetA && gw) || (oneSetFromMatchB && oneGameFromSetB && gwB);
}

// ─── FORMATOWANIE WYNIKU SETÓW (kompatybilne z parseSets() w App.jsx) ────────
export function formatSetsString(sets) {
  return sets.map((s) => {
    if (s.isSuperTiebreak) return `[${s.a}-${s.b}]`;
    if (s.tiebreak) {
      const loser = Math.min(s.tiebreak.a, s.tiebreak.b);
      return `${s.a}-${s.b}(${loser})`;
    }
    return `${s.a}-${s.b}`;
  }).join(" ");
}

export function teamLabel(team, team1Names, team2Names) {
  const names = team === TEAM1 ? team1Names : team2Names;
  return (names || []).filter(Boolean).join(" / ") || (team === TEAM1 ? "Gracz 1" : "Gracz 2");
}

// Wiersz "gemy w każdym secie" do listy meczów — dopełniony placeholderami
// "0-0" dla setów, które jeszcze się nie zaczęły (jak w referencyjnej appce).
export function buildSetRow(rules, score) {
  const row = score.sets.map((s) => formatSetsString([s]));
  if (!score.matchWinner) {
    row.push(`${score.curSetGamesA}-${score.curSetGamesB}`);
    while (row.length < rules.sets) {
      row.push("0-0");
    }
  }
  return row;
}
