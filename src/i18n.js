// ─────────────────────────────────────────────────────────────────────────────
// Tennis Tracker — i18n (polski / angielski).
//
// Wybór języka jest jawny (ekran przy pierwszym uruchomieniu) i zapamiętany
// w localStorage — apka NIE zgaduje języka z ustawień systemu, żeby uniknąć
// niespodzianek (np. telefonu w innym języku niż ten, którym gracz mówi).
// Można go zmienić w dowolnym momencie małą flagą w górnym pasku.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext } from "react";

export const LANG_KEY = "atz_lang";
export const LANGS = ["pl", "en"];

const dict = {
  pl: {
    "common.back": "Wróć",
    "common.share": "Udostępnij",
    "common.delete": "Usuń",
    "common.deleteMatch": "Usuń mecz",
    "common.confirmDeleteMatch": "Usunąć ten mecz?",
    "common.fullName": "Imię i nazwisko",
    "common.partner": "Partner/ka",
    "common.player1": "Gracz 1",
    "common.player2": "Gracz 2",
    "common.matchNotFound": "Mecz nie znaleziony",
    "common.next": "Dalej →",
    "common.undo": "Cofnij",
    "common.vs": "vs.",
    "common.setLabel": "Set {n}",

    "list.newMatch": "Nowy mecz",
    "list.saveResult": "Zapisz wynik",
    "list.emptyTitle": "Brak zapisanych meczów",
    "list.emptyHint": 'Zacznij od "Nowy mecz", żeby śledzić wynik na żywo.',
    "list.inProgress": "W trakcie",

    "setup.titleNew": "Nowy mecz",
    "setup.titleManual": "Zapisz wynik",
    "setup.surfaceLabel": "Nawierzchnia: {surface}",
    "setup.surfaceNotChosen": "Nawierzchnia jeszcze nie wybrana (zakładka Gracze)",
    "setup.tabPlayers": "Gracze",
    "setup.tabRules": "Zasady",
    "setup.tabResult": "Wynik",
    "setup.surface": "Nawierzchnia",
    "setup.doubles": "Debel",
    "setup.teamEvent": "Mecz drużynowy (wkrótce)",
    "setup.teamEventTooltip": "Niedostępne w tej wersji",
    "setup.team1": "Gracz / drużyna 1",
    "setup.team2": "Gracz / drużyna 2",
    "setup.rulesLabel": "Zasady meczu",
    "setup.tbPlaceholder": "TB",
    "setup.tbTitle": "Punkty przegranego w tie-breaku (opcjonalnie)",
    "setup.superTbCheckbox": "Ostatni set to super tie-break (wpisz punkty zamiast gemów)",
    "setup.addSet": "+ Dodaj seta",
    "setup.alertNeedOneSet": "Podaj wynik przynajmniej jednego seta",
    "setup.startTracking": "Rozpocznij śledzenie",
    "setup.pickDepthTitle": "Wybierz poziom śledzenia:",

    "depth.basic.title": "Podstawowy",
    "depth.basic.desc": "Prosty licznik wyniku — dwa przyciski na jednym ekranie.",
    "depth.intermediate.title": "Średni",
    "depth.intermediate.desc": "Serwis (as/1. serwis/2. serwis/podwójny błąd) i wynik piłki (winner/wymuszony/niewymuszony błąd).",
    "depth.advanced.title": "Zaawansowany",
    "depth.advanced.desc": "Dodatkowo forehand/backhand, punkty przy siatce.",
    "depth.advancedRallies.title": "Zaawansowany z wymianami",
    "depth.advancedRallies.desc": "Dodatkowo długość wymiany (liczba uderzeń).",

    "preset.bo3tb.label": "Do 2 wygranych setów (z tie-breakiem)",
    "preset.bo3supertb.label": "Do 2 wygranych setów + super tie-break",
    "preset.bo3noad.label": "Do 2 wygranych setów, bez przewag + super tie-break",
    "preset.proset8.label": "Pro-set do 8 gemów",
    "preset.bo5tb.label": "Do 3 wygranych setów (z tie-breakiem)",
    "b.matchTo2Sets": "Mecz do 2 wygranych setów",
    "b.matchTo3Sets": "Mecz do 3 wygranych setów",
    "b.setTo6Games": "Set do 6 gemów",
    "b.setTo8Games": "Set do 8 gemów",
    "b.oneSet": "Jeden set",
    "b.deuce": "Zwykły system przewag (deuce)",
    "b.noAd": "Bez przewag (punkt decydujący przy 40:40)",
    "b.tbAt66every": "Tie-break do 7 przy 6:6 (w każdym secie)",
    "b.tbAt66": "Tie-break do 7 przy 6:6",
    "b.tbAt88": "Tie-break do 7 przy 8:8",
    "b.superTbInstead3rd": "Super tie-break zamiast 3. seta",

    "tracker.whoServes": "Kto zaczyna serwis?",
    "tracker.serves": "serwuje",
    "tracker.stage.serve1": "1. Serwis",
    "tracker.stage.serve2": "2. Serwis",
    "tracker.stage.rally": "Wymiana",
    "tracker.stage.pointEnd": "Wynik piłki",
    "tracker.shareLiveTitle": "Udostępnij na żywo",
    "tracker.shareLiveButton": "Udostępnij",
    "tracker.liveButton": "Na żywo",
    "tracker.ace": "As",
    "tracker.serveFault": "Błąd serwisu",
    "tracker.ballInPlay": "Piłka w grze",
    "tracker.returnWinner": "Winner z returnu",
    "tracker.returnError": "Błąd returnu",
    "tracker.doubleFault": "Podwójny błąd",
    "tracker.rallyCountLabel": "Liczba uderzeń w wymianie",
    "tracker.pointEndedBy": "Punkt zakończony przez:",
    "tracker.winner": "Winner",
    "tracker.forcedError": "Wymuszony błąd",
    "tracker.unforcedError": "Niewymuszony błąd",
    "tracker.forehand": "Forhend",
    "tracker.backhand": "Bekhend",
    "tracker.atNet": "Przy siatce",
    "tracker.baseline": "Z linii końcowej",
    "tracker.tiebreakBadge": "TIE-BREAK",
    "tracker.matchPointBadge": "PIŁKA MECZOWA",
    "tracker.pointFor": "Punkt:\n{name}",
    "tracker.pointClockTitle": "Czas trwania obecnego punktu",

    "summary.title": "Podsumowanie meczu",
    "summary.statsTitle": "Statystyki",
    "summary.avgRallyLabel": "Średnia długość wymiany:",
    "summary.hitsUnit": "uderzeń",
    "summary.continueMatch": "Kontynuuj mecz",
    "summary.shareResult": "Udostępnij wynik",
    "summary.shareProResult": "Udostępnij kartę Pro (statystyki)",
    "summary.matchDuration": "Czas meczu",
    "summary.setDurations": "Czas setów",
    "summary.setN": "Set {n}",
    "summary.longestPoint": "Najdłuższy punkt",
    "summary.avgPointLength": "Średnia długość punktu",

    "stat.aces": "Asy serwisowe",
    "stat.doubleFaults": "Podwójne błędy",
    "stat.winners": "Winnery",
    "stat.forcedErrors": "Wymuszone błędy",
    "stat.unforcedErrors": "Niewymuszone błędy",
    "stat.netPoints": "Punkty przy siatce",

    "lang.pick.title": "Wybierz język",
    "lang.pl": "Polski",
    "lang.en": "English",
  },
  en: {
    "common.back": "Back",
    "common.share": "Share",
    "common.delete": "Delete",
    "common.deleteMatch": "Delete match",
    "common.confirmDeleteMatch": "Delete this match?",
    "common.fullName": "Full name",
    "common.partner": "Partner",
    "common.player1": "Player 1",
    "common.player2": "Player 2",
    "common.matchNotFound": "Match not found",
    "common.next": "Next →",
    "common.undo": "Undo",
    "common.vs": "vs.",
    "common.setLabel": "Set {n}",

    "list.newMatch": "New match",
    "list.saveResult": "Save result",
    "list.emptyTitle": "No saved matches",
    "list.emptyHint": 'Start with "New match" to track live.',
    "list.inProgress": "In progress",

    "setup.titleNew": "New match",
    "setup.titleManual": "Save result",
    "setup.surfaceLabel": "Surface: {surface}",
    "setup.surfaceNotChosen": "Surface not chosen yet (Players tab)",
    "setup.tabPlayers": "Players",
    "setup.tabRules": "Rules",
    "setup.tabResult": "Result",
    "setup.surface": "Surface",
    "setup.doubles": "Doubles",
    "setup.teamEvent": "Team match (coming soon)",
    "setup.teamEventTooltip": "Not available in this version",
    "setup.team1": "Player / team 1",
    "setup.team2": "Player / team 2",
    "setup.rulesLabel": "Match rules",
    "setup.tbPlaceholder": "TB",
    "setup.tbTitle": "Loser's tie-break points (optional)",
    "setup.superTbCheckbox": "Last set is a super tie-break (enter points instead of games)",
    "setup.addSet": "+ Add set",
    "setup.alertNeedOneSet": "Enter the score for at least one set",
    "setup.startTracking": "Start tracking",
    "setup.pickDepthTitle": "Choose tracking depth:",

    "depth.basic.title": "Basic",
    "depth.basic.desc": "Simple score counter — two buttons on one screen.",
    "depth.intermediate.title": "Intermediate",
    "depth.intermediate.desc": "Serve (ace/1st/2nd/double fault) and point outcome (winner/forced/unforced error).",
    "depth.advanced.title": "Advanced",
    "depth.advanced.desc": "Also forehand/backhand, net points.",
    "depth.advancedRallies.title": "Advanced with rallies",
    "depth.advancedRallies.desc": "Also rally length (number of shots).",

    "preset.bo3tb.label": "Best of 3 sets (with tie-break)",
    "preset.bo3supertb.label": "Best of 3 sets + super tie-break",
    "preset.bo3noad.label": "Best of 3 sets, no-ad + super tie-break",
    "preset.proset8.label": "Pro-set to 8 games",
    "preset.bo5tb.label": "Best of 5 sets (with tie-break)",
    "b.matchTo2Sets": "Match to 2 won sets",
    "b.matchTo3Sets": "Match to 3 won sets",
    "b.setTo6Games": "Set to 6 games",
    "b.setTo8Games": "Set to 8 games",
    "b.oneSet": "One set",
    "b.deuce": "Standard advantage scoring (deuce)",
    "b.noAd": "No-ad (deciding point at 40:40)",
    "b.tbAt66every": "Tie-break to 7 at 6:6 (every set)",
    "b.tbAt66": "Tie-break to 7 at 6:6",
    "b.tbAt88": "Tie-break to 7 at 8:8",
    "b.superTbInstead3rd": "Super tie-break instead of 3rd set",

    "tracker.whoServes": "Who serves first?",
    "tracker.serves": "serves",
    "tracker.stage.serve1": "1st serve",
    "tracker.stage.serve2": "2nd serve",
    "tracker.stage.rally": "Rally",
    "tracker.stage.pointEnd": "Point outcome",
    "tracker.shareLiveTitle": "Share live",
    "tracker.shareLiveButton": "Share",
    "tracker.liveButton": "Live",
    "tracker.ace": "Ace",
    "tracker.serveFault": "Fault",
    "tracker.ballInPlay": "Ball in play",
    "tracker.returnWinner": "Return winner",
    "tracker.returnError": "Return error",
    "tracker.doubleFault": "Double fault",
    "tracker.rallyCountLabel": "Number of shots in rally",
    "tracker.pointEndedBy": "Point ended by:",
    "tracker.winner": "Winner",
    "tracker.forcedError": "Forced error",
    "tracker.unforcedError": "Unforced error",
    "tracker.forehand": "Forehand",
    "tracker.backhand": "Backhand",
    "tracker.atNet": "At net",
    "tracker.baseline": "Baseline",
    "tracker.tiebreakBadge": "TIE-BREAK",
    "tracker.matchPointBadge": "MATCH POINT",
    "tracker.pointFor": "Point:\n{name}",
    "tracker.pointClockTitle": "Current point duration",

    "summary.title": "Match summary",
    "summary.statsTitle": "Stats",
    "summary.avgRallyLabel": "Average rally length:",
    "summary.hitsUnit": "shots",
    "summary.continueMatch": "Continue match",
    "summary.shareResult": "Share result",
    "summary.shareProResult": "Share Pro card (stats)",
    "summary.matchDuration": "Match duration",
    "summary.setDurations": "Set times",
    "summary.setN": "Set {n}",
    "summary.longestPoint": "Longest point",
    "summary.avgPointLength": "Average point length",

    "stat.aces": "Aces",
    "stat.doubleFaults": "Double faults",
    "stat.winners": "Winners",
    "stat.forcedErrors": "Forced errors",
    "stat.unforcedErrors": "Unforced errors",
    "stat.netPoints": "Net points",

    "lang.pick.title": "Choose language",
    "lang.pl": "Polski",
    "lang.en": "English",
  },
};

const SURFACE_NAMES = {
  pl: { Ziemna: "Ziemna", Twarda: "Twarda", Trawa: "Trawa" },
  en: { Ziemna: "Clay", Twarda: "Hard", Trawa: "Grass" },
};

export function surfaceLabel(lang, surface) {
  if (!surface) return surface;
  return (SURFACE_NAMES[lang] && SURFACE_NAMES[lang][surface]) || surface;
}

export function translate(lang, key, vars) {
  const table = dict[lang] || dict.pl;
  let s = table[key] ?? dict.pl[key] ?? key;
  if (vars) {
    for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(vars[k]);
  }
  return s;
}

export function getStoredLang() {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return LANGS.includes(v) ? v : null;
  } catch {
    return null;
  }
}

export function setStoredLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {}
}

export const LangContext = createContext(null);
export function useLang() {
  return useContext(LangContext);
}
