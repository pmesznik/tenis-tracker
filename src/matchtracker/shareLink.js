// ─────────────────────────────────────────────────────────────────────────────
// Tennis Tracker — udostępnianie wyniku meczu linkiem.
//
// Link nie wymaga żadnego backendu: dane meczu (nazwiska, wynik, nawierzchnia,
// data) są zakodowane w base64url bezpośrednio w parametrze `d` adresu URL.
// Strona pod SHARE_BASE_URL (statyczna, hostowana osobno) odczytuje ten
// parametr po stronie klienta i renderuje wynik — nic nie jest nigdzie
// zapisywane poza samym urządzeniem nadawcy.
// ─────────────────────────────────────────────────────────────────────────────
import { computeScore } from "./scoringEngine.js";
import { computeStats } from "./stats.js";
import { longestPoint, averagePointDurationMs } from "./time.js";

export const SHARE_BASE_URL = "https://pmesznik.github.io/tennis-tracker";

function toBase64Url(str) {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deriveWinner(match) {
  if (match.status !== "completed") return null;
  if (match.finalSetsOverride) {
    let a = 0, b = 0;
    for (const s of match.finalSetsOverride) {
      if (s.a > s.b) a++; else if (s.b > s.a) b++;
    }
    return a === b ? null : a > b ? "team1" : "team2";
  }
  const score = computeScore(match.rules, match.pointLog, match.initialServer || "team1");
  return score.matchWinner;
}

// setsRow: tablica już sformatowanych stringów setów (np. ["6-4","7-6(5)"]),
// ta sama, którą karta/podsumowanie i tak już liczy do wyświetlenia — po co
// liczyć drugi raz.
export function buildShareUrl(match, setsRow) {
  const payload = {
    v: 1,
    t1: (match.team1?.names || []).filter(Boolean),
    t2: (match.team2?.names || []).filter(Boolean),
    s: setsRow,
    sf: match.surface || null,
    d: match.date || null,
    w: deriveWinner(match),
  };
  return `${SHARE_BASE_URL}/?d=${toBase64Url(JSON.stringify(payload))}`;
}

// "Karta Pro" — jak buildShareUrl, ale dorzuca pełne statystyki i czasy
// (dokładnie te, które MatchSummaryPage i tak już liczy do wyświetlenia w
// apce), żeby trener dostał kompletny raport z meczu, nie tylko wynik.
// Dostępna tylko dla meczów śledzonych na poziomie Średni+ (są dane punktowe).
export function buildProShareUrl(match, setsRow) {
  const hasTiming = !match.finalSetsOverride && match.startedAt != null;
  const score = match.finalSetsOverride ? null : computeScore(match.rules, match.pointLog, match.initialServer || "team1", match.startedAt);
  const { stats, avgRally } = computeStats(match.pointLog);
  const longest = hasTiming ? longestPoint(match.pointLog, match.startedAt) : null;

  const payload = {
    v: 1,
    t1: (match.team1?.names || []).filter(Boolean),
    t2: (match.team2?.names || []).filter(Boolean),
    s: setsRow,
    sf: match.surface || null,
    d: match.date || null,
    w: deriveWinner(match),
    md: hasTiming ? (match.endedAt ?? Date.now()) - match.startedAt : null,
    sd: score ? score.sets.map((s) => s.durationMs) : null,
    apm: hasTiming ? averagePointDurationMs(match.pointLog, match.startedAt) : null,
    lpm: longest ? longest.durationMs : null,
    st1: stats.team1,
    st2: stats.team2,
    ar: avgRally,
  };
  return `${SHARE_BASE_URL}/?pro=${toBase64Url(JSON.stringify(payload))}`;
}

// Link do trybu "na żywo" — strona pod tym adresem subskrybuje Firebase
// Realtime Database (liveMatches/{matchId}) i sama się odświeża przy każdym
// nowym punkcie, dopóki nadawca ma włączone udostępnianie na żywo.
export function buildLiveShareUrl(matchId) {
  return `${SHARE_BASE_URL}/?live=${matchId}`;
}

export function isNativePlatform() {
  return !!(typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.());
}

export async function shareMatch(text, url) {
  try {
    if (isNativePlatform()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: "Wynik meczu", text, url });
      return;
    }
    if (navigator.share) {
      await navigator.share({ title: "Wynik meczu", text, url });
      return;
    }
    await navigator.clipboard?.writeText(url ? `${text}\n${url}` : text);
    alert("Skopiowano wynik do schowka");
  } catch {}
}
