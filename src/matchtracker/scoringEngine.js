// ─────────────────────────────────────────────────────────────────────────────
// Tennis Tracker v0.1.0
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

// null jeśli brak któregoś znacznika czasu (mecz bez zapisanych timestampów).
function durationSince(fromTs, toTs) {
  return fromTs != null && toTs != null ? toTs - fromTs : null;
}

// ─── PRESETY ZASAD ─────────────────────────────────────────────────────────
// gamesPerSet: do ilu gemów wygrywa się seta (normalnego, bez tie-breaka).
// tiebreakAt: przy jakim wyniku gemów pada tie-break (zwykle == gamesPerSet).
// tiebreakTo: do ilu punktów gra się tie-break (różnica min. 2).
// finalSetSuperTiebreak: czy ostatni, decydujący set zastąpiony jest w całości
//   jednym super tie-breakiem (zamiast pełnego seta).
// Etykiety i opisy (bullets) są kluczami tłumaczeń (patrz ../i18n.js), nie
// gotowym tekstem — ten sam preset musi dać się wyświetlić po polsku i
// angielsku bez duplikowania definicji zasad.
export const PRESETS = {
  best_of_3_tb: {
    key: "best_of_3_tb",
    labelKey: "preset.bo3tb.label",
    sets: 3, gamesPerSet: 6, noAd: false,
    tiebreakAt: 6, tiebreakTo: 7,
    finalSetSuperTiebreak: false, finalSetSuperTiebreakTo: 10,
    bulletKeys: ["b.matchTo2Sets", "b.setTo6Games", "b.deuce", "b.tbAt66every"],
  },
  best_of_3_super_tb: {
    key: "best_of_3_super_tb",
    labelKey: "preset.bo3supertb.label",
    sets: 3, gamesPerSet: 6, noAd: false,
    tiebreakAt: 6, tiebreakTo: 7,
    finalSetSuperTiebreak: true, finalSetSuperTiebreakTo: 10,
    bulletKeys: ["b.matchTo2Sets", "b.setTo6Games", "b.deuce", "b.tbAt66", "b.superTbInstead3rd"],
  },
  best_of_3_no_ad: {
    key: "best_of_3_no_ad",
    labelKey: "preset.bo3noad.label",
    sets: 3, gamesPerSet: 6, noAd: true,
    tiebreakAt: 6, tiebreakTo: 7,
    finalSetSuperTiebreak: true, finalSetSuperTiebreakTo: 10,
    bulletKeys: ["b.matchTo2Sets", "b.setTo6Games", "b.noAd", "b.tbAt66", "b.superTbInstead3rd"],
  },
  pro_set_8: {
    key: "pro_set_8",
    labelKey: "preset.proset8.label",
    sets: 1, gamesPerSet: 8, noAd: false,
    tiebreakAt: 8, tiebreakTo: 7,
    finalSetSuperTiebreak: false, finalSetSuperTiebreakTo: 10,
    bulletKeys: ["b.oneSet", "b.setTo8Games", "b.deuce", "b.tbAt88"],
  },
  best_of_5_tb: {
    key: "best_of_5_tb",
    labelKey: "preset.bo5tb.label",
    sets: 5, gamesPerSet: 6, noAd: false,
    tiebreakAt: 6, tiebreakTo: 7,
    finalSetSuperTiebreak: false, finalSetSuperTiebreakTo: 10,
    bulletKeys: ["b.matchTo3Sets", "b.setTo6Games", "b.deuce", "b.tbAt66every"],
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
 * @param {Array<{winner: 'team1'|'team2', t?: number}>} pointLog - `t` to znacznik
 *   czasu (Date.now()) zapisania punktu, używany do liczenia czasu setów.
 * @param {'team1'|'team2'} initialServer - kto serwował na starcie meczu
 * @param {number} [startedAt] - Date.now() z momentu rozpoczęcia meczu (wybór
 *   serwującego), punkt odniesienia dla czasu pierwszego seta.
 */
export function computeScore(rules, pointLog, initialServer = TEAM1, startedAt = null) {
  const sets = []; // ukończone sety: {a,b,isSuperTiebreak,tiebreak?:{a,b},durationMs?}
  // Czas seta liczony jest od końca poprzedniego seta (albo startedAt dla
  // pierwszego) do punktu, który kończy dany set. Świadomie NIE ma osobnego
  // znacznika "początek nowego seta" — przerwa między setami wlicza się więc
  // w czas seta, który po niej następuje (i w czas jego pierwszego punktu).
  let setStartTime = startedAt;
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
        sets.push({ a: curPtsA, b: curPtsB, isSuperTiebreak: true, durationMs: durationSince(setStartTime, pt.t) });
        setStartTime = pt.t ?? setStartTime;
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
        sets.push({ a: curSetGamesA, b: curSetGamesB, isSuperTiebreak: false, tiebreak: { a: curPtsA, b: curPtsB }, durationMs: durationSince(setStartTime, pt.t) });
        setStartTime = pt.t ?? setStartTime;
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
        sets.push({ a, b, isSuperTiebreak: false, durationMs: durationSince(setStartTime, pt.t) });
        setStartTime = pt.t ?? setStartTime;
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
    // Znacznik początku aktualnie trwającego seta (do tykającego zegara w UI) —
    // to samo "koniec poprzedniego seta / start meczu", którego używa liczenie
    // durationMs powyżej, więc oba są ze sobą spójne.
    currentSetStartedAt: matchWinner ? null : setStartTime,
    // Liczba ukończonych gemów w całym meczu — używane do wyliczenia, który z
    // dwojga deblistów serwuje w danym gemie (patrz teamServiceTurnIndex niżej).
    completedGames,
  };
}

// Który to (1-indeksowany) gem serwisowy drużyny `team` w całym meczu, licząc
// razem z aktualnie trwającym gemem — serwis alternuje ściśle co gem, więc
// wystarczy znać parzystość numeru gemu względem initialServer.
export function teamServiceTurnIndex(team, initialServer, completedGames) {
  const currentGameNumber = completedGames + 1; // 1-indeksowany
  const oddCount = Math.ceil(currentGameNumber / 2);
  const evenCount = Math.floor(currentGameNumber / 2);
  return team === initialServer ? oddCount : evenCount;
}

// Imię konkretnego zawodnika serwującego aktualny gem w deblu — wymaga, żeby
// przy starcie meczu ustalono kolejność serwisu obu drużyn (match.serverOrder).
// Świadome uproszczenie: w tie-breaku/super tie-breaku serwis rotuje punkt po
// punkcie między WSZYSTKIMI czterema zawodnikami, czego tu nie liczymy — w tej
// sytuacji funkcja zwraca null, a UI pokazuje tylko drużynę (jak dotychczas).
export function currentServerPlayerName(match, score) {
  if (!match.isDoubles || !match.serverOrder || !score.server || score.game?.isTiebreak) return null;
  const order = match.serverOrder[score.server];
  if (!order || order.length < 2) return null;
  const turnIndex = teamServiceTurnIndex(score.server, match.initialServer || TEAM1, score.completedGames ?? 0);
  return order[(turnIndex - 1) % 2];
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

export function teamLabel(team, team1Names, team2Names, fallback1 = "Gracz 1", fallback2 = "Gracz 2") {
  const names = team === TEAM1 ? team1Names : team2Names;
  return (names || []).filter(Boolean).join(" / ") || (team === TEAM1 ? fallback1 : fallback2);
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
