// Tennis Tracker — szczegóły rywalizacji drużynowej: łączny wynik (liczba
// wygranych meczów po każdej stronie) i lista meczów wchodzących w jej skład.
import { useThemeCtx } from "../theme.js";
import { useLang } from "../i18n.js";
import { Card, TopBar, FullScreen, ScrollBody } from "./ui.jsx";
import * as storage from "./storage.js";
import { computeScore, buildSetRow, teamLabel } from "./scoringEngine.js";
import * as ties from "./teamTies.js";

function tieMatchSetsRow(match) {
  if (match.status === "completed" && match.finalSetsOverride) {
    return match.finalSetsOverride.map((s) =>
      s.isSuperTiebreak ? `[${s.a}-${s.b}]` : s.tiebreak ? `${s.a}-${s.b}(${Math.min(s.tiebreak.a, s.tiebreak.b)})` : `${s.a}-${s.b}`
    );
  }
  const score = computeScore(match.rules, match.pointLog, match.initialServer || "team1");
  return buildSetRow(match.rules, score);
}

function TieMatchRow({ match, onOpen }) {
  const { t } = useThemeCtx();
  const { t: tr } = useLang();
  const name1 = teamLabel("team1", match.team1.names, match.team2.names, tr("common.player1"), tr("common.player2"));
  const name2 = teamLabel("team2", match.team1.names, match.team2.names, tr("common.player1"), tr("common.player2"));
  const sets = tieMatchSetsRow(match);
  return (
    <Card style={{ cursor: "pointer" }}>
      <div style={{ padding: 14 }} onClick={() => onOpen(match)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>
            {name1} <span style={{ color: t.textMuted }}>–</span> {name2}
          </div>
          {match.status === "in_progress" && (
            <span style={{
              fontSize: 10, fontWeight: 800, textTransform: "uppercase",
              background: "rgba(16,185,129,0.15)", color: "#10b981",
              padding: "3px 8px", borderRadius: 6, flexShrink: 0,
            }}>{tr("list.inProgress")}</span>
          )}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginTop: 6, display: "flex", gap: 8 }}>
          {sets.map((s, i) => <span key={i}>{s}</span>)}
        </div>
      </div>
    </Card>
  );
}

export default function TeamTieDetailPage({ tieId, onBack, onDeleted, onAddMatch, onOpenMatch }) {
  const { t, styles } = useThemeCtx();
  const { t: tr } = useLang();
  const tie = ties.getTeamTie(tieId);

  if (!tie) {
    return (
      <FullScreen>
        <TopBar title={tr("tie.detailTitle")} onBack={onBack} />
        <div style={styles.centered}>{tr("tie.notFound")}</div>
      </FullScreen>
    );
  }

  const matches = storage.listMatches();
  const tieMatches = tie.matchIds.map((id) => matches.find((m) => m.id === id)).filter(Boolean);
  const score = ties.computeTieScore(tie, matches);

  const handleDelete = () => {
    if (!confirm(tr("tie.confirmDelete"))) return;
    ties.deleteTeamTie(tie.id);
    onDeleted();
  };

  return (
    <FullScreen>
      <TopBar
        title={tr("tie.detailTitle")} onBack={onBack}
        right={
          <button onClick={handleDelete} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: t.textSub }} title={tr("common.delete")}>🗑️</button>
        }
      />
      <ScrollBody style={{ padding: 16 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.textSub }}>{tie.team1Name} <span style={{ color: t.textMuted }}>vs</span> {tie.team2Name}</div>
          <div style={{ fontSize: 46, fontWeight: 800, color: t.accent, marginTop: 6, letterSpacing: "0.02em" }}>{score.wonA} : {score.wonB}</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
            {tr("tie.matchesPlayed", { played: score.playedCount, total: score.totalCount })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button style={styles.primaryBtn} onClick={() => onAddMatch("track")}>🎾 {tr("tie.addMatchTrack")}</button>
          <button style={styles.secondaryBtn} onClick={() => onAddMatch("manual")}>✏️ {tr("tie.addMatchManual")}</button>
        </div>

        {tieMatches.length === 0 ? (
          <div style={styles.centered}>
            <span style={{ fontSize: 12 }}>{tr("tie.noMatchesYet")}</span>
          </div>
        ) : (
          tieMatches.map((m) => <TieMatchRow key={m.id} match={m} onOpen={onOpenMatch} />)
        )}
      </ScrollBody>
    </FullScreen>
  );
}
