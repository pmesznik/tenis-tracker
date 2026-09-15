// Tenis Tracker v0.2.0 — podsumowanie meczu (wynik + statystyki).
import { useEffect } from "react";
import { useThemeCtx } from "../theme.js";
import { TopBar, FullScreen, ScrollBody, Card } from "./ui.jsx";
import * as storage from "./storage.js";
import { computeScore, formatSetsString, buildSetRow, teamLabel, TEAM1, TEAM2 } from "./scoringEngine.js";

function isNativePlatform() {
  return !!(typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.());
}

async function shareMatch(text) {
  try {
    if (isNativePlatform()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: "Wynik meczu", text });
      return;
    }
    if (navigator.share) { await navigator.share({ title: "Wynik meczu", text }); return; }
    await navigator.clipboard?.writeText(text);
    alert("Skopiowano wynik do schowka");
  } catch {}
}

function emptyStats() {
  return { aces: 0, doubleFaults: 0, winners: 0, forcedErrors: 0, unforcedErrors: 0, netPoints: 0 };
}

function computeStats(pointLog) {
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

const STAT_ROWS = [
  ["aces", "Asy serwisowe"],
  ["doubleFaults", "Podwójne błędy"],
  ["winners", "Winnery"],
  ["forcedErrors", "Wymuszone błędy"],
  ["unforcedErrors", "Niewymuszone błędy"],
  ["netPoints", "Punkty przy siatce"],
];

export default function MatchSummaryPage({ matchId, onBack, onContinue, onDeleted, onSurfaceChange }) {
  const { t, styles } = useThemeCtx();
  const match = storage.getMatch(matchId);

  useEffect(() => {
    onSurfaceChange?.(match?.surface || null);
  }, [match?.surface]);

  if (!match) return <FullScreen><TopBar title="Mecz nie znaleziony" onBack={onBack} /></FullScreen>;

  const name1 = teamLabel(TEAM1, match.team1.names, match.team2.names);
  const name2 = teamLabel(TEAM2, match.team1.names, match.team2.names);

  let setsRow;
  if (match.status === "completed" && match.finalSetsOverride) {
    setsRow = match.finalSetsOverride.map((s) => formatSetsString([s]));
  } else {
    const score = computeScore(match.rules, match.pointLog, match.initialServer || TEAM1);
    setsRow = match.status === "completed" ? score.sets.map((s) => formatSetsString([s])) : buildSetRow(match.rules, score);
  }

  const hasPointDetail = match.trackingDepth !== "basic" && match.pointLog.length > 0;
  const { stats, avgRally } = hasPointDetail ? computeStats(match.pointLog) : { stats: null, avgRally: null };

  const handleDelete = () => {
    if (!confirm("Usunąć ten mecz?")) return;
    storage.deleteMatch(match.id);
    onDeleted();
  };

  return (
    <FullScreen>
      <TopBar title="Podsumowanie meczu" onBack={onBack} />
      <ScrollBody style={{ padding: 16 }}>
        <Card>
          <div style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{name1}</div>
            <div style={{ fontSize: 13, color: t.textMuted, margin: "4px 0" }}>vs.</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{name2}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: t.accent, marginTop: 10 }}>{setsRow.join("  ")}</div>
            <div style={{ fontSize: 12, color: t.textSub, marginTop: 8 }}>
              📅 {match.date}{match.surface ? ` · ${match.surface}` : ""}
            </div>
            {match.note && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>{match.note}</div>}
          </div>
        </Card>

        {hasPointDetail && stats && (
          <Card>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}`, fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: t.textSub }}>
              Statystyki
            </div>
            <div style={{ display: "flex", padding: "8px 14px", fontSize: 12, fontWeight: 800, color: t.textMuted }}>
              <span style={{ flex: 1 }}>{name1}</span>
              <span style={{ width: 120, textAlign: "center" }}> </span>
              <span style={{ flex: 1, textAlign: "right" }}>{name2}</span>
            </div>
            {STAT_ROWS.map(([key, label]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", padding: "6px 14px", borderTop: `1px solid ${t.border}` }}>
                <span style={{ flex: 1, fontWeight: 700 }}>{stats.team1[key]}</span>
                <span style={{ width: 120, textAlign: "center", fontSize: 11, color: t.textMuted, textTransform: "uppercase" }}>{label}</span>
                <span style={{ flex: 1, textAlign: "right", fontWeight: 700 }}>{stats.team2[key]}</span>
              </div>
            ))}
            {avgRally != null && (
              <div style={{ display: "flex", justifyContent: "center", padding: "8px 14px", borderTop: `1px solid ${t.border}`, fontSize: 12, color: t.textSub }}>
                Średnia długość wymiany: <strong style={{ marginLeft: 4 }}>{avgRally} uderzeń</strong>
              </div>
            )}
          </Card>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          {match.status === "in_progress" && (
            <button style={styles.primaryBtn} onClick={() => onContinue(match.id)}>▶️ Kontynuuj mecz</button>
          )}
          <button style={styles.secondaryBtn} onClick={() => shareMatch(`${name1} – ${name2}: ${setsRow.join(" ")}`)}>🔗 Udostępnij wynik</button>
          <button style={{ ...styles.secondaryBtn, color: t.danger }} onClick={handleDelete}>🗑️ Usuń mecz</button>
        </div>
      </ScrollBody>
    </FullScreen>
  );
}
