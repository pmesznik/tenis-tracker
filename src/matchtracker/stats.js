// ─────────────────────────────────────────────────────────────────────────────
// Tennis Tracker — statystyki punktowe meczu, liczone z pointLog.
//
// Wydzielone z MatchSummaryPage.jsx, żeby ta sama logika mogła zasilić też
// link "karta Pro" (shareLink.js) bez powielania kodu.
// ─────────────────────────────────────────────────────────────────────────────

export function emptyStats() {
  return { aces: 0, doubleFaults: 0, winners: 0, forcedErrors: 0, unforcedErrors: 0, netPoints: 0 };
}

export function computeStats(pointLog) {
  const stats = { team1: emptyStats(), team2: emptyStats() };
  let rallyTotal = 0, rallyCount = 0;
  for (const p of pointLog) {
    if (p.endType === "ace") stats[p.winner].aces++;
    if (p.endType === "doubleFault") stats[p.server].doubleFaults++;
    if (p.endType === "winner" && p.endBy) stats[p.endBy].winners++;
    if (p.endType === "forcedError" && p.endBy) stats[p.endBy].forcedErrors++;
    if (p.endType === "unforcedError" && p.endBy) stats[p.endBy].unforcedErrors++;
    if (p.atNet && p.endBy) stats[p.endBy].netPoints++;
    if (typeof p.rallyLength === "number") { rallyTotal += p.rallyLength; rallyCount++; }
  }
  return { stats, avgRally: rallyCount ? (rallyTotal / rallyCount).toFixed(1) : null };
}
