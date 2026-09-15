// Tennis Tracker v0.2.0 — ekran śledzenia meczu na żywo.
import { useState, useEffect } from "react";
import { useThemeCtx } from "../theme.js";
import { TopBar, FullScreen, BigButton, Chip, ScoreTile, TennisBall } from "./ui.jsx";
import * as storage from "./storage.js";
import { computeScore, formatSetsString, buildSetRow, teamLabel, otherTeam, TEAM1, TEAM2 } from "./scoringEngine.js";
import { shareMatch, buildLiveShareUrl } from "./shareLink.js";
import { publishLiveScore } from "./liveSync.js";

const INITIAL_STAGE = { name: "serve1", rallyCount: 0, shotType: "forehand", atNet: false, serveUsed: "1st" };

// Migawka wyniku wysyłana do Firebase, gdy mecz jest udostępniony na żywo —
// widz na stronie share-site widzi dokładnie te pola.
function buildLivePayload(match, score) {
  return {
    t1: (match.team1?.names || []).filter(Boolean),
    t2: (match.team2?.names || []).filter(Boolean),
    sets: buildSetRow(match.rules, score),
    gameA: score.game?.a ?? null,
    gameB: score.game?.b ?? null,
    server: score.server,
    matchWinner: score.matchWinner,
    sf: match.surface || null,
    d: match.date || null,
  };
}

export default function MatchTrackerPage({ matchId, onBack, onFinished, onSurfaceChange }) {
  const { t } = useThemeCtx();
  const [match, setMatch] = useState(() => storage.getMatch(matchId));
  const [stage, setStage] = useState(INITIAL_STAGE);

  // Cała apka przebarwia się na nawierzchnię tego meczu, dopóki go oglądamy.
  useEffect(() => {
    onSurfaceChange?.(match?.surface || null);
  }, [match?.surface]);

  if (!match) {
    return (
      <FullScreen>
        <TopBar title="Mecz nie znaleziony" onBack={onBack} />
      </FullScreen>
    );
  }

  const rules = match.rules;
  const score = computeScore(rules, match.pointLog, match.initialServer || TEAM1);
  const name1 = teamLabel(TEAM1, match.team1.names, match.team2.names);
  const name2 = teamLabel(TEAM2, match.team1.names, match.team2.names);

  const persist = (newLog, extraPatch = {}) => {
    const newScore = computeScore(rules, newLog, match.initialServer || TEAM1);
    const patch = {
      pointLog: newLog,
      status: newScore.matchWinner ? "completed" : "in_progress",
      ...extraPatch,
    };
    const updated = storage.updateMatch(match.id, patch);
    setMatch(updated);
    setStage(INITIAL_STAGE);
    if (updated.liveShareEnabled) publishLiveScore(updated.id, buildLivePayload(updated, newScore));
    if (newScore.matchWinner) onFinished(updated);
  };

  const handleSelectServer = (team) => {
    const updated = storage.updateMatch(match.id, { initialServer: team });
    setMatch(updated);
  };

  const handleShareLive = () => {
    let m = match;
    if (!m.liveShareEnabled) {
      m = storage.updateMatch(m.id, { liveShareEnabled: true });
      setMatch(m);
    }
    publishLiveScore(m.id, buildLivePayload(m, computeScore(rules, m.pointLog, m.initialServer || TEAM1)));
    shareMatch(`${name1} – ${name2}: śledź mecz na żywo`, buildLiveShareUrl(m.id));
  };

  const liveShareButton = (
    <button onClick={handleShareLive} title="Udostępnij na żywo" style={{
      background: match.liveShareEnabled ? `${t.danger}22` : t.surfaceElevated,
      border: `1px solid ${match.liveShareEnabled ? t.danger : t.borderStrong}`,
      color: match.liveShareEnabled ? t.danger : t.textSub,
      borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 800,
      cursor: "pointer", fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap",
    }}>🔴 Na żywo</button>
  );

  const commitPoint = (winner, extra = {}) => {
    const point = { winner, server: score.server, ...extra };
    persist([...match.pointLog, point]);
  };

  const handleUndo = () => {
    if (match.pointLog.length === 0) return;
    persist(match.pointLog.slice(0, -1));
  };

  // ── Ekran "Kto serwuje?" (tylko raz, na starcie meczu) ─────────────────────
  if (!match.initialServer) {
    return (
      <FullScreen>
        <TopBar title={`${name1} vs. ${name2}`} onBack={onBack} />
        <div style={{ padding: 16, textAlign: "center", fontSize: 15, fontWeight: 700, color: t.textSub }}>
          Kto zaczyna serwis?
        </div>
        <div style={{ flex: 1, display: "flex", gap: 2, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <button onClick={() => handleSelectServer(TEAM1)} style={{
            flex: 1, background: t.secondary, color: "#fff", border: "none",
            fontSize: 18, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
          }}>{name1}<br /><span style={{ fontSize: 12, fontWeight: 500 }}>serwuje</span></button>
          <button onClick={() => handleSelectServer(TEAM2)} style={{
            flex: 1, background: t.secondarySoft, color: "#111144", border: "none",
            fontSize: 18, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
          }}>{name2}<br /><span style={{ fontSize: 12, fontWeight: 500 }}>serwuje</span></button>
        </div>
      </FullScreen>
    );
  }

  // ── Nagłówek wyniku (wspólny dla wszystkich głębokości) ────────────────────
  const setCols = score.sets.map((s) => formatSetsString([s]).split("-"));
  const Header = (
    <div style={{ background: "transparent", flexShrink: 0, padding: "10px 14px 14px", borderBottom: `1px solid ${t.border}` }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {[
          { team: TEAM1, name: name1 },
          { team: TEAM2, name: name2 },
        ].map(({ team, name }, rowIdx) => (
          <div key={team} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
            background: score.server === team && !score.matchWinner ? `${t.accent}18` : t.surfaceElevated,
            border: `1px solid ${score.server === team && !score.matchWinner ? `${t.accent}55` : t.border}`,
            borderRadius: 12,
          }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              {name} {score.server === team && !score.matchWinner && <TennisBall />}
            </span>
            {setCols.map((cols, i) => (
              <span key={i} style={{ width: 22, textAlign: "center", fontSize: 14, color: t.textMuted }}>{cols[rowIdx]}</span>
            ))}
            <span style={{
              width: 26, textAlign: "center", fontSize: 16, fontWeight: 800,
              color: t.danger,
            }}>{rowIdx === 0 ? score.curSetGamesA : score.curSetGamesB}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        {score.game ? (
          <>
            <ScoreTile key={`a-${score.game.a}`} value={score.game.a} />
            <span style={{ fontSize: 22, fontWeight: 800, color: t.textMuted }}>:</span>
            <ScoreTile key={`b-${score.game.b}`} value={score.game.b} />
          </>
        ) : <span style={{ fontSize: 22, fontWeight: 800, color: t.accent }}>—</span>}
      </div>
      {(score.game?.isTiebreak || score.isMatchPoint) && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          {score.game?.isTiebreak && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", color: t.textMuted }}>TIE-BREAK</span>}
          {score.isMatchPoint && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", color: t.danger, marginLeft: 8 }}>PIŁKA MECZOWA</span>}
        </div>
      )}
    </div>
  );

  const isBasic = match.trackingDepth === "basic";
  const TopRow = (
    <div style={{ display: "flex", alignItems: "center", padding: "6px 14px", justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, textTransform: "uppercase" }}>
        {isBasic ? "" : stage.name === "serve1" ? "1. Serwis" : stage.name === "serve2" ? "2. Serwis" : stage.name === "rally" ? "Wymiana" : "Wynik piłki"}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {liveShareButton}
        <button onClick={handleUndo} disabled={match.pointLog.length === 0} style={{
          background: t.surfaceElevated, border: `1px solid ${match.pointLog.length ? t.accent + "55" : t.borderStrong}`,
          color: match.pointLog.length ? t.accent : t.textMuted, borderRadius: 8, padding: "6px 12px",
          fontWeight: 800, fontSize: 12, cursor: match.pointLog.length ? "pointer" : "default", fontFamily: "inherit",
          display: "flex", alignItems: "center", gap: 5,
        }}>↩ Cofnij</button>
      </div>
    </div>
  );

  // ── BASIC: dwa duże przyciski, bez śledzenia serwisu ───────────────────────
  // Mecze lecą szybko — wszystkie przyciski muszą się mieścić bez przewijania,
  // więc dzielą dostępną wysokość między siebie (flex), zamiast mieć sztywne
  // rozmiary.
  if (match.trackingDepth === "basic") {
    return (
      <FullScreen>
        <TopBar title={`${name1} vs. ${name2}`} onBack={onBack} />
        {Header}
        {TopRow}
        <div style={{ flex: 1, minHeight: 0, padding: 16, display: "flex", flexDirection: "row", gap: 12 }}>
          <BigButton label={`Punkt:\n${name1}`} color={t.secondary} onClick={() => commitPoint(TEAM1)} style={{ flex: 1, minHeight: 0, height: "100%" }} />
          <BigButton label={`Punkt:\n${name2}`} color={t.secondarySoft} onClick={() => commitPoint(TEAM2)} style={{ flex: 1, minHeight: 0, height: "100%" }} />
        </div>
      </FullScreen>
    );
  }

  // ── INTERMEDIATE / ADVANCED / ADVANCED+RALLIES ─────────────────────────────
  const returner = otherTeam(score.server);

  const goToPointEnd = (serveUsed) => setStage((s) => ({ ...s, name: "point-end", serveUsed }));
  const goToRally = (serveUsed) => setStage((s) => ({ ...s, name: "rally", serveUsed, rallyCount: 0 }));

  const handleAce = (serveUsed) => commitPoint(score.server, { serve: serveUsed, serveResult: "ace", endType: "ace" });
  const handleFault1 = () => setStage((s) => ({ ...s, name: "serve2" }));
  const handleDoubleFault = () => commitPoint(returner, { serve: "2nd", serveResult: "doubleFault", endType: "doubleFault" });
  const handleReturnWinner = (serveUsed) => commitPoint(returner, { serve: serveUsed, endType: "winner", endBy: returner });
  const handleReturnError = (serveUsed) => commitPoint(score.server, { serve: serveUsed, endType: "unforcedError", endBy: returner });
  const handleBallInPlay = (serveUsed) => {
    if (match.trackingDepth === "advanced_rallies") goToRally(serveUsed);
    else goToPointEnd(serveUsed);
  };

  const commitRallyEnd = (endBy, endType) => {
    const extra = { serve: stage.serveUsed, endType, endBy };
    if (match.trackingDepth === "advanced" || match.trackingDepth === "advanced_rallies") {
      extra.shotType = stage.shotType;
      extra.atNet = stage.atNet;
    }
    if (match.trackingDepth === "advanced_rallies") {
      extra.rallyLength = stage.rallyCount;
    }
    const winner = endType === "winner" ? endBy : otherTeam(endBy);
    commitPoint(winner, extra);
  };

  // Mecze lecą szybko — każdy ekran punktowania musi się mieścić w całości
  // bez przewijania. Wiersze i przyciski dzielą dostępną wysokość przez flex
  // zamiast mieć sztywne rozmiary, więc dopasowują się do każdego ekranu.
  let body;
  if (stage.name === "serve1") {
    body = (
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <div style={{ flex: 1, display: "flex", gap: 12 }}>
          <BigButton label="As" onClick={() => handleAce("1st")} color={t.success} style={{ flex: 1, minHeight: 0, height: "100%" }} />
          <BigButton label="Błąd serwisu" onClick={handleFault1} color="#7a7fb0" style={{ flex: 1, minHeight: 0, height: "100%" }} />
        </div>
        <BigButton label="Piłka w grze" onClick={() => handleBallInPlay("1st")} color={t.secondary} style={{ flex: 1, minHeight: 0, height: "100%" }} />
      </div>
    );
  } else if (stage.name === "serve2") {
    body = (
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <div style={{ flex: 1, display: "flex", gap: 12 }}>
          <BigButton label="Winner z returnu" onClick={() => handleReturnWinner("2nd")} color={t.secondarySoft} style={{ flex: 1, minHeight: 0, height: "100%" }} />
          <BigButton label="As" onClick={() => handleAce("2nd")} color={t.success} style={{ flex: 1, minHeight: 0, height: "100%" }} />
        </div>
        <div style={{ flex: 1, display: "flex", gap: 12 }}>
          <BigButton label="Błąd returnu" onClick={() => handleReturnError("2nd")} color="#7a7fb0" style={{ flex: 1, minHeight: 0, height: "100%" }} />
          <BigButton label="Podwójny błąd" onClick={handleDoubleFault} color={t.danger} style={{ flex: 1, minHeight: 0, height: "100%" }} />
        </div>
        <BigButton label="Piłka w grze" onClick={() => handleBallInPlay("2nd")} color={t.secondary} style={{ flex: 1, minHeight: 0, height: "100%" }} />
      </div>
    );
  } else if (stage.name === "rally") {
    body = (
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
        <div style={{ fontSize: 13, color: t.textSub }}>Liczba uderzeń w wymianie</div>
        <div style={{ fontSize: 64, fontWeight: 800, color: t.accent }}>{stage.rallyCount}</div>
        <button onClick={() => setStage((s) => ({ ...s, rallyCount: s.rallyCount + 1 }))} style={{
          width: 120, height: 120, borderRadius: "50%", border: "none",
          background: t.secondary, color: "#fff", fontSize: 28, fontWeight: 800, cursor: "pointer", flexShrink: 0,
        }}>+1</button>
        <button onClick={() => setStage((s) => ({ ...s, name: "point-end" }))} style={{
          background: "none", border: `1px solid ${t.borderStrong}`, color: t.text,
          borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
        }}>Dalej →</button>
      </div>
    );
  } else if (stage.name === "point-end") {
    const isAdvanced = match.trackingDepth === "advanced" || match.trackingDepth === "advanced_rallies";
    const ROWS = [
      { key: "winner", label: "Winner", color: t.success },
      { key: "forcedError", label: "Wymuszony błąd", color: "#7a7fb0" },
      { key: "unforcedError", label: "Niewymuszony błąd", color: t.danger },
    ];
    body = (
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10, padding: 16 }}>
        {isAdvanced && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Chip label="Forhend" active={stage.shotType === "forehand"} onClick={() => setStage((s) => ({ ...s, shotType: "forehand" }))} />
              <Chip label="Bekhend" active={stage.shotType === "backhand"} onClick={() => setStage((s) => ({ ...s, shotType: "backhand" }))} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Chip label="Przy siatce" active={stage.atNet} onClick={() => setStage((s) => ({ ...s, atNet: !s.atNet }))} color={t.secondarySoft} />
              <Chip label="Z linii końcowej" active={!stage.atNet} onClick={() => setStage((s) => ({ ...s, atNet: false }))} color={t.secondarySoft} />
            </div>
          </div>
        )}
        <div style={{ fontSize: 11, fontWeight: 800, color: t.textMuted, textTransform: "uppercase", flexShrink: 0 }}>Punkt zakończony przez:</div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {ROWS.map((row) => (
            <div key={row.key} style={{ flex: 1, display: "flex", gap: 8 }}>
              <BigButton label={name1} sub={row.label} color={row.color} onClick={() => commitRallyEnd(TEAM1, row.key)} style={{ flex: 1, minHeight: 0, height: "100%" }} />
              <BigButton label={name2} sub={row.label} color={row.color} onClick={() => commitRallyEnd(TEAM2, row.key)} style={{ flex: 1, minHeight: 0, height: "100%" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <FullScreen>
      <TopBar title={`${name1} vs. ${name2}`} onBack={onBack} />
      {Header}
      {TopRow}
      {body}
    </FullScreen>
  );
}
