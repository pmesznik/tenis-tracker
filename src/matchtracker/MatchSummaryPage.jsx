// Tennis Tracker v0.2.0 — podsumowanie meczu (wynik + statystyki).
import { useEffect } from "react";
import { useThemeCtx } from "../theme.js";
import { useLang, surfaceLabel } from "../i18n.js";
import { TopBar, FullScreen, ScrollBody, Card, ShareIcon } from "./ui.jsx";
import * as storage from "./storage.js";
import { computeScore, formatSetsString, buildSetRow, teamLabel, TEAM1, TEAM2 } from "./scoringEngine.js";
import { shareMatch, buildShareUrl } from "./shareLink.js";
import { clearLiveScore } from "./liveSync.js";
import { formatDuration, longestPoint, averagePointDurationMs } from "./time.js";

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
  ["aces", "stat.aces"],
  ["doubleFaults", "stat.doubleFaults"],
  ["winners", "stat.winners"],
  ["forcedErrors", "stat.forcedErrors"],
  ["unforcedErrors", "stat.unforcedErrors"],
  ["netPoints", "stat.netPoints"],
];

export default function MatchSummaryPage({ matchId, onBack, onContinue, onDeleted, onSurfaceChange }) {
  const { t, styles } = useThemeCtx();
  const { lang, t: tr } = useLang();
  const match = storage.getMatch(matchId);

  useEffect(() => {
    onSurfaceChange?.(match?.surface || null);
  }, [match?.surface]);

  if (!match) return <FullScreen><TopBar title={tr("common.matchNotFound")} onBack={onBack} /></FullScreen>;

  const name1 = teamLabel(TEAM1, match.team1.names, match.team2.names, tr("common.player1"), tr("common.player2"));
  const name2 = teamLabel(TEAM2, match.team1.names, match.team2.names, tr("common.player1"), tr("common.player2"));

  let setsRow;
  let score = null;
  if (match.status === "completed" && match.finalSetsOverride) {
    setsRow = match.finalSetsOverride.map((s) => formatSetsString([s]));
  } else {
    score = computeScore(match.rules, match.pointLog, match.initialServer || TEAM1, match.startedAt);
    setsRow = match.status === "completed" ? score.sets.map((s) => formatSetsString([s])) : buildSetRow(match.rules, score);
  }

  const hasPointDetail = match.trackingDepth !== "basic" && match.pointLog.length > 0;
  const { stats, avgRally } = hasPointDetail ? computeStats(match.pointLog) : { stats: null, avgRally: null };

  // Brak czasu dla ręcznie wpisanych wyników (finalSetsOverride) — nie ma tam
  // żadnych znaczników czasu do policzenia.
  const hasTiming = !match.finalSetsOverride && match.startedAt != null;
  const totalDurationMs = hasTiming ? (match.endedAt ?? Date.now()) - match.startedAt : null;
  const longest = hasTiming ? longestPoint(match.pointLog, match.startedAt) : null;
  const avgPointMs = hasTiming ? averagePointDurationMs(match.pointLog, match.startedAt) : null;

  const handleDelete = () => {
    if (!confirm(tr("common.confirmDeleteMatch"))) return;
    storage.deleteMatch(match.id);
    clearLiveScore(match.id);
    onDeleted();
  };

  return (
    <FullScreen>
      <TopBar title={tr("summary.title")} onBack={onBack} />
      <ScrollBody style={{ padding: 16 }}>
        <Card>
          <div style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{name1}</div>
            <div style={{ fontSize: 13, color: t.textMuted, margin: "4px 0" }}>{tr("common.vs")}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{name2}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: t.accent, marginTop: 10 }}>{setsRow.join("  ")}</div>
            <div style={{ fontSize: 12, color: t.textSub, marginTop: 8 }}>
              📅 {match.date}{match.surface ? ` · ${surfaceLabel(lang, match.surface)}` : ""}
            </div>
            {match.note && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>{match.note}</div>}
          </div>
        </Card>

        {hasTiming && (
          <Card>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}`, fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: t.textSub }}>
              {tr("summary.matchDuration")}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", fontSize: 15 }}>
              <span>⏱ {tr("summary.matchDuration")}</span>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{formatDuration(totalDurationMs)}</strong>
            </div>
            {score && score.sets.length > 0 && (
              <div style={{ padding: "2px 14px 12px", borderTop: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: t.textMuted, textTransform: "uppercase", margin: "8px 0 6px" }}>
                  {tr("summary.setDurations")}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {score.sets.map((s, i) => (
                    <span key={i} style={{ fontSize: 13, color: t.textSub, fontVariantNumeric: "tabular-nums" }}>
                      {tr("summary.setN", { n: i + 1 })}: <strong style={{ color: t.text }}>{formatDuration(s.durationMs)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {avgPointMs != null && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderTop: `1px solid ${t.border}`, fontSize: 13, color: t.textSub }}>
                <span>{tr("summary.avgPointLength")}</span>
                <strong style={{ color: t.text, fontVariantNumeric: "tabular-nums" }}>{formatDuration(avgPointMs)}</strong>
              </div>
            )}
            {longest && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderTop: `1px solid ${t.border}`, fontSize: 13, color: t.textSub }}>
                <span>{tr("summary.longestPoint")}</span>
                <strong style={{ color: t.text, fontVariantNumeric: "tabular-nums" }}>{formatDuration(longest.durationMs)}</strong>
              </div>
            )}
          </Card>
        )}

        {hasPointDetail && stats && (
          <Card>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}`, fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: t.textSub }}>
              {tr("summary.statsTitle")}
            </div>
            <div style={{ display: "flex", padding: "8px 14px", fontSize: 12, fontWeight: 800, color: t.textMuted }}>
              <span style={{ flex: 1 }}>{name1}</span>
              <span style={{ width: 120, textAlign: "center" }}> </span>
              <span style={{ flex: 1, textAlign: "right" }}>{name2}</span>
            </div>
            {STAT_ROWS.map(([key, labelKey]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", padding: "6px 14px", borderTop: `1px solid ${t.border}` }}>
                <span style={{ flex: 1, fontWeight: 700 }}>{stats.team1[key]}</span>
                <span style={{ width: 120, textAlign: "center", fontSize: 11, color: t.textMuted, textTransform: "uppercase" }}>{tr(labelKey)}</span>
                <span style={{ flex: 1, textAlign: "right", fontWeight: 700 }}>{stats.team2[key]}</span>
              </div>
            ))}
            {avgRally != null && (
              <div style={{ display: "flex", justifyContent: "center", padding: "8px 14px", borderTop: `1px solid ${t.border}`, fontSize: 12, color: t.textSub }}>
                {tr("summary.avgRallyLabel")} <strong style={{ marginLeft: 4 }}>{avgRally} {tr("summary.hitsUnit")}</strong>
              </div>
            )}
          </Card>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          {match.status === "in_progress" && (
            <button style={styles.primaryBtn} onClick={() => onContinue(match.id)}>▶️ {tr("summary.continueMatch")}</button>
          )}
          <button
            style={{ ...styles.primaryBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onClick={() => shareMatch(`${name1} – ${name2}: ${setsRow.join(" ")}`, buildShareUrl(match, setsRow))}
          ><ShareIcon size={15} /> {tr("summary.shareResult")}</button>
          <button style={{ ...styles.secondaryBtn, color: t.danger }} onClick={handleDelete}>🗑️ {tr("common.deleteMatch")}</button>
        </div>
      </ScrollBody>
    </FullScreen>
  );
}
