// Tennis Tracker v0.2.0 — ekran śledzenia meczu na żywo.
import { useState, useEffect } from "react";
import { useThemeCtx } from "../theme.js";
import { useLang } from "../i18n.js";
import { TopBar, FullScreen, BigButton, Chip, ScoreTile, TennisBall, ClockChip, ShareIcon } from "./ui.jsx";
import * as storage from "./storage.js";
import { computeScore, formatSetsString, buildSetRow, teamLabel, otherTeam, currentServerPlayerName, TEAM1, TEAM2 } from "./scoringEngine.js";
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
  const { t: tr } = useLang();
  const [match, setMatch] = useState(() => storage.getMatch(matchId));
  const [stage, setStage] = useState(INITIAL_STAGE);
  const [now, setNow] = useState(() => Date.now());

  // Cała apka przebarwia się na nawierzchnię tego meczu, dopóki go oglądamy.
  useEffect(() => {
    onSurfaceChange?.(match?.surface || null);
  }, [match?.surface]);

  // Tyka co sekundę, żeby zegar meczu/seta/punktu liczył się na żywo — sam
  // czas jest zawsze wyliczany na bieżąco (Date.now() - znacznik), `now` tylko
  // wymusza ponowne renderowanie.
  useEffect(() => {
    if (match?.status !== "in_progress") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [match?.status]);

  if (!match) {
    return (
      <FullScreen>
        <TopBar title={tr("common.matchNotFound")} onBack={onBack} />
      </FullScreen>
    );
  }

  const rules = match.rules;
  const score = computeScore(rules, match.pointLog, match.initialServer || TEAM1, match.startedAt);
  const name1 = teamLabel(TEAM1, match.team1.names, match.team2.names, tr("common.player1"), tr("common.player2"));
  const name2 = teamLabel(TEAM2, match.team1.names, match.team2.names, tr("common.player1"), tr("common.player2"));

  const persist = (newLog, extraPatch = {}) => {
    const newScore = computeScore(rules, newLog, match.initialServer || TEAM1, match.startedAt);
    const patch = {
      pointLog: newLog,
      status: newScore.matchWinner ? "completed" : "in_progress",
      // Cofnij może "odkończyć" mecz — wtedy endedAt wraca na null.
      endedAt: newScore.matchWinner ? (match.endedAt || Date.now()) : null,
      ...extraPatch,
    };
    const updated = storage.updateMatch(match.id, patch);
    setMatch(updated);
    setStage(INITIAL_STAGE);
    if (updated.liveShareEnabled) publishLiveScore(updated.id, buildLivePayload(updated, newScore));
    if (newScore.matchWinner) onFinished(updated);
  };

  const otherPlayerInTeam = (team, name) => {
    const names = (team === TEAM1 ? match.team1.names : match.team2.names) || [];
    return names.find((n) => n !== name) || names[0];
  };

  // Single: zapisuje initialServer, jak dotychczas. Debel: dodatkowo od razu
  // ustala kolejność serwisu TYLKO drużyny, która zaczyna mecz — kolejność
  // serwisu drugiej drużyny w prawdziwym tenisie ogłasza się dopiero na
  // początku jej pierwszego gemu serwisowego (patrz handlePickOtherTeamServer
  // niżej), nie wcześniej.
  const handleSelectServer = (team, playerName) => {
    const patch = { initialServer: team, startedAt: Date.now() };
    if (match.isDoubles) {
      patch.serverOrder = { [team]: [playerName, otherPlayerInTeam(team, playerName)] };
    }
    const updated = storage.updateMatch(match.id, patch);
    setMatch(updated);
  };

  // Ustala kolejność serwisu drużyny, która właśnie zaczyna swój pierwszy w
  // meczu gem serwisowy (wywoływane z bramki tuż przed Header/body niżej).
  const handlePickOtherTeamServer = (team, playerName) => {
    const serverOrder = { ...(match.serverOrder || {}), [team]: [playerName, otherPlayerInTeam(team, playerName)] };
    const updated = storage.updateMatch(match.id, { serverOrder });
    setMatch(updated);
  };

  const handleShareLive = () => {
    let m = match;
    if (!m.liveShareEnabled) {
      m = storage.updateMatch(m.id, { liveShareEnabled: true });
      setMatch(m);
    }
    publishLiveScore(m.id, buildLivePayload(m, computeScore(rules, m.pointLog, m.initialServer || TEAM1, m.startedAt)));
    shareMatch(`${name1} – ${name2}`, buildLiveShareUrl(m.id));
  };

  const liveShareButton = (
    <button onClick={handleShareLive} title={tr("tracker.shareLiveTitle")} style={{
      background: match.liveShareEnabled ? `${t.danger}22` : t.surfaceElevated,
      border: `1px solid ${match.liveShareEnabled ? t.danger : t.borderStrong}`,
      color: match.liveShareEnabled ? t.danger : t.textSub,
      borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 800,
      cursor: "pointer", fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap",
      display: "flex", alignItems: "center", gap: 5,
    }}>
      {match.liveShareEnabled ? <>🔴 {tr("tracker.liveButton")}</> : <><ShareIcon /> {tr("tracker.shareLiveButton")}</>}
    </button>
  );

  const commitPoint = (winner, extra = {}) => {
    const point = { winner, server: score.server, t: Date.now(), ...extra };
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
          {tr("tracker.whoServes")}
        </div>
        {match.isDoubles ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            <div style={{ flex: 1, display: "flex", gap: 2 }}>
              {(match.team1.names || []).map((nm) => (
                <button key={nm} onClick={() => handleSelectServer(TEAM1, nm)} style={{
                  flex: 1, background: t.secondary, color: "#fff", border: "none",
                  fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                }}>{nm}<br /><span style={{ fontSize: 11, fontWeight: 500 }}>{tr("tracker.serves")}</span></button>
              ))}
            </div>
            <div style={{ flex: 1, display: "flex", gap: 2 }}>
              {(match.team2.names || []).map((nm) => (
                <button key={nm} onClick={() => handleSelectServer(TEAM2, nm)} style={{
                  flex: 1, background: t.secondarySoft, color: "#111144", border: "none",
                  fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                }}>{nm}<br /><span style={{ fontSize: 11, fontWeight: 500 }}>{tr("tracker.serves")}</span></button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", gap: 2, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            <button onClick={() => handleSelectServer(TEAM1)} style={{
              flex: 1, background: t.secondary, color: "#fff", border: "none",
              fontSize: 18, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            }}>{name1}<br /><span style={{ fontSize: 12, fontWeight: 500 }}>{tr("tracker.serves")}</span></button>
            <button onClick={() => handleSelectServer(TEAM2)} style={{
              flex: 1, background: t.secondarySoft, color: "#111144", border: "none",
              fontSize: 18, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            }}>{name2}<br /><span style={{ fontSize: 12, fontWeight: 500 }}>{tr("tracker.serves")}</span></button>
          </div>
        )}
      </FullScreen>
    );
  }

  // ── Debel: kolejność serwisu drugiej drużyny ustalamy dopiero, gdy przychodzi
  // jej pierwszy gem serwisowy w meczu — nie wcześniej (tak jak w prawdziwym
  // tenisie: para przyjmująca ogłasza kolejność serwisu dopiero na początku
  // własnego pierwszego gemu serwisowego, może się jeszcze rozmyślić do tego
  // momentu). Blokuje wprowadzanie punktów tego gemu, dopóki nie odpowie.
  // Warunek "gem jeszcze bez punktów" chroni przed retrospektywnym pytaniem
  // w środku już trwającego gema — np. dla meczu deblowego założonego przed
  // wprowadzeniem tej funkcji, gdzie serverOrder nigdy nie zostało ustawione.
  const currentGameHasNoPoints = score.game && score.game.a === "0" && score.game.b === "0";
  if (match.isDoubles && score.server && !score.matchWinner && !match.serverOrder?.[score.server] && currentGameHasNoPoints) {
    const team = score.server;
    const names = (team === TEAM1 ? match.team1.names : match.team2.names) || [];
    const teamName = teamLabel(team, match.team1.names, match.team2.names, tr("common.player1"), tr("common.player2"));
    return (
      <FullScreen>
        <TopBar title={`${name1} vs. ${name2}`} onBack={onBack} />
        <div style={{ padding: 16, textAlign: "center", fontSize: 15, fontWeight: 700, color: t.textSub }}>
          {tr("tracker.whoServesOtherTeam", { team: teamName })}
        </div>
        <div style={{ flex: 1, display: "flex", gap: 2, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {names.map((nm, i) => (
            <button key={nm} onClick={() => handlePickOtherTeamServer(team, nm)} style={{
              flex: 1, background: i === 0 ? t.secondary : t.secondarySoft, color: i === 0 ? "#fff" : "#111144", border: "none",
              fontSize: 18, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            }}>{nm}<br /><span style={{ fontSize: 12, fontWeight: 500 }}>{tr("tracker.serves")}</span></button>
          ))}
        </div>
      </FullScreen>
    );
  }

  // ── Nagłówek wyniku (wspólny dla wszystkich głębokości) ────────────────────
  const setCols = score.sets.map((s) => formatSetsString([s]).split("-"));
  // W deblu, jeśli ustalono kolejność serwisu (serverOrder), piłeczka trafia
  // przy konkretnym zawodniku zamiast całej drużyny — patrz
  // currentServerPlayerName (w tie-breaku świadomie brak, rotacja punkt po
  // punkcie między 4 osobami nie jest tu liczona, patrz scoringEngine.js).
  const servingPlayer = currentServerPlayerName(match, score);
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
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {match.isDoubles ? (
                <>
                  {(team === TEAM1 ? match.team1.names : match.team2.names).map((nm, i) => (
                    <span key={nm} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {i > 0 && <span style={{ color: t.textMuted, fontWeight: 400 }}> / </span>}
                      {nm}
                      {score.server === team && !score.matchWinner && servingPlayer === nm && <TennisBall size={12} />}
                    </span>
                  ))}
                  {score.server === team && !score.matchWinner && !servingPlayer && <TennisBall size={12} />}
                </>
              ) : (
                <>{name} {score.server === team && !score.matchWinner && <TennisBall />}</>
              )}
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
            <ScoreTile key={`a-${score.game.a}`} value={score.game.a} serving={score.game.server === TEAM1} servingSide="left" />
            <span style={{ fontSize: 22, fontWeight: 800, color: t.textMuted }}>:</span>
            <ScoreTile key={`b-${score.game.b}`} value={score.game.b} serving={score.game.server === TEAM2} servingSide="right" />
          </>
        ) : <span style={{ fontSize: 22, fontWeight: 800, color: t.accent }}>—</span>}
      </div>
      {(score.game?.isTiebreak || score.isMatchPoint) && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          {score.game?.isTiebreak && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", color: t.textMuted }}>{tr("tracker.tiebreakBadge")}</span>}
          {score.isMatchPoint && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", color: t.danger, marginLeft: 8 }}>{tr("tracker.matchPointBadge")}</span>}
        </div>
      )}
    </div>
  );

  // Zegary: mecz liczy się od startedAt, bieżący punkt od ostatniego zapisanego
  // punktu (albo od startu seta/meczu, jeśli jeszcze żaden punkt w secie nie
  // padł — stąd świadoma nieścisłość na pierwszym punkcie nowego seta, patrz
  // time.js). `now` tyka co sekundę tylko podczas trwania meczu.
  const lastPointAt = match.pointLog.length ? match.pointLog[match.pointLog.length - 1].t : null;
  const pointStartRef = lastPointAt ?? score.currentSetStartedAt ?? match.startedAt;
  const matchClock = match.startedAt != null && (
    <ClockChip ms={now - match.startedAt} tone="accent" pulse />
  );
  // Progi jak w prawdziwym zegarze serwisowym ATP/WTA (25s na serwis) —
  // ostrzega kolorem, że wymiana/przerwa się przeciąga.
  const pointElapsedMs = pointStartRef != null ? now - pointStartRef : null;
  const pointClockTone = pointElapsedMs == null ? "muted" : pointElapsedMs >= 25000 ? "danger" : pointElapsedMs >= 15000 ? "warning" : "muted";

  const isBasic = match.trackingDepth === "basic";
  const stageLabel = stage.name === "serve1" ? tr("tracker.stage.serve1")
    : stage.name === "serve2" ? tr("tracker.stage.serve2")
    : stage.name === "rally" ? tr("tracker.stage.rally")
    : tr("tracker.stage.pointEnd");
  const TopRow = (
    <div style={{ display: "flex", alignItems: "center", padding: "6px 14px", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {liveShareButton}
        {!isBasic && (
          <span style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, textTransform: "uppercase" }}>
            {stageLabel}
          </span>
        )}
        {pointElapsedMs != null && (
          <span title={tr("tracker.pointClockTitle")}>
            <ClockChip ms={pointElapsedMs} tone={pointClockTone} pulse={pointClockTone === "danger"} small />
          </span>
        )}
      </div>
      <button onClick={handleUndo} disabled={match.pointLog.length === 0} style={{
        background: t.surfaceElevated, border: `1px solid ${match.pointLog.length ? t.accent + "55" : t.borderStrong}`,
        color: match.pointLog.length ? t.accent : t.textMuted, borderRadius: 8, padding: "6px 12px",
        fontWeight: 800, fontSize: 12, cursor: match.pointLog.length ? "pointer" : "default", fontFamily: "inherit",
        display: "flex", alignItems: "center", gap: 5,
      }}>↩ {tr("common.undo")}</button>
    </div>
  );

  // ── BASIC: dwa duże przyciski, bez śledzenia serwisu ───────────────────────
  // Mecze lecą szybko — wszystkie przyciski muszą się mieścić bez przewijania,
  // więc dzielą dostępną wysokość między siebie (flex), zamiast mieć sztywne
  // rozmiary.
  if (match.trackingDepth === "basic") {
    return (
      <FullScreen>
        <TopBar title={`${name1} vs. ${name2}`} onBack={onBack} right={matchClock} />
        {Header}
        {TopRow}
        <div style={{ flex: 1, minHeight: 0, padding: 16, display: "flex", flexDirection: "row", gap: 12 }}>
          <BigButton label={tr("tracker.pointFor", { name: name1 })} color={t.secondary} onClick={() => commitPoint(TEAM1)} style={{ flex: 1, minHeight: 0, height: "100%" }} />
          <BigButton label={tr("tracker.pointFor", { name: name2 })} color={t.secondarySoft} onClick={() => commitPoint(TEAM2)} style={{ flex: 1, minHeight: 0, height: "100%" }} />
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
          <BigButton label={tr("tracker.ace")} onClick={() => handleAce("1st")} color={t.success} style={{ flex: 1, minHeight: 0, height: "100%" }} />
          <BigButton label={tr("tracker.serveFault")} onClick={handleFault1} color="#7a7fb0" style={{ flex: 1, minHeight: 0, height: "100%" }} />
        </div>
        <BigButton label={tr("tracker.ballInPlay")} onClick={() => handleBallInPlay("1st")} color={t.secondary} style={{ flex: 1, minHeight: 0, height: "100%" }} />
      </div>
    );
  } else if (stage.name === "serve2") {
    body = (
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <div style={{ flex: 1, display: "flex", gap: 12 }}>
          <BigButton label={tr("tracker.returnWinner")} onClick={() => handleReturnWinner("2nd")} color={t.secondarySoft} style={{ flex: 1, minHeight: 0, height: "100%" }} />
          <BigButton label={tr("tracker.ace")} onClick={() => handleAce("2nd")} color={t.success} style={{ flex: 1, minHeight: 0, height: "100%" }} />
        </div>
        <div style={{ flex: 1, display: "flex", gap: 12 }}>
          <BigButton label={tr("tracker.returnError")} onClick={() => handleReturnError("2nd")} color="#7a7fb0" style={{ flex: 1, minHeight: 0, height: "100%" }} />
          <BigButton label={tr("tracker.doubleFault")} onClick={handleDoubleFault} color={t.danger} style={{ flex: 1, minHeight: 0, height: "100%" }} />
        </div>
        <BigButton label={tr("tracker.ballInPlay")} onClick={() => handleBallInPlay("2nd")} color={t.secondary} style={{ flex: 1, minHeight: 0, height: "100%" }} />
      </div>
    );
  } else if (stage.name === "rally") {
    body = (
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
        <div style={{ fontSize: 13, color: t.textSub }}>{tr("tracker.rallyCountLabel")}</div>
        <div style={{ fontSize: 64, fontWeight: 800, color: t.accent }}>{stage.rallyCount}</div>
        <button onClick={() => setStage((s) => ({ ...s, rallyCount: s.rallyCount + 1 }))} style={{
          width: 120, height: 120, borderRadius: "50%", border: "none",
          background: t.secondary, color: "#fff", fontSize: 28, fontWeight: 800, cursor: "pointer", flexShrink: 0,
        }}>+1</button>
        <button onClick={() => setStage((s) => ({ ...s, name: "point-end" }))} style={{
          background: "none", border: `1px solid ${t.borderStrong}`, color: t.text,
          borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
        }}>{tr("common.next")}</button>
      </div>
    );
  } else if (stage.name === "point-end") {
    const isAdvanced = match.trackingDepth === "advanced" || match.trackingDepth === "advanced_rallies";
    const ROWS = [
      { key: "winner", label: tr("tracker.winner"), color: t.success },
      { key: "forcedError", label: tr("tracker.forcedError"), color: "#7a7fb0" },
      { key: "unforcedError", label: tr("tracker.unforcedError"), color: t.danger },
    ];
    body = (
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10, padding: 16 }}>
        {isAdvanced && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Chip label={tr("tracker.forehand")} active={stage.shotType === "forehand"} onClick={() => setStage((s) => ({ ...s, shotType: "forehand" }))} />
              <Chip label={tr("tracker.backhand")} active={stage.shotType === "backhand"} onClick={() => setStage((s) => ({ ...s, shotType: "backhand" }))} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Chip label={tr("tracker.atNet")} active={stage.atNet} onClick={() => setStage((s) => ({ ...s, atNet: !s.atNet }))} color={t.secondarySoft} />
              <Chip label={tr("tracker.baseline")} active={!stage.atNet} onClick={() => setStage((s) => ({ ...s, atNet: false }))} color={t.secondarySoft} />
            </div>
          </div>
        )}
        <div style={{ fontSize: 11, fontWeight: 800, color: t.textMuted, textTransform: "uppercase", flexShrink: 0 }}>{tr("tracker.pointEndedBy")}</div>
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
      <TopBar title={`${name1} vs. ${name2}`} onBack={onBack} right={matchClock} />
      {Header}
      {TopRow}
      {body}
    </FullScreen>
  );
}
