// Tenis Tracker v0.2.0 — lista meczów (ekran startowy).
import { useState } from "react";
import { useThemeCtx } from "../theme.js";
import { Card } from "./ui.jsx";
import * as storage from "./storage.js";
import { computeScore, buildSetRow, teamLabel } from "./scoringEngine.js";

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
    if (navigator.share) {
      await navigator.share({ title: "Wynik meczu", text });
      return;
    }
    await navigator.clipboard?.writeText(text);
    alert("Skopiowano wynik do schowka");
  } catch {}
}

function matchSetsRow(match) {
  if (match.status === "completed" && match.finalSetsOverride) {
    return match.finalSetsOverride.map((s) =>
      s.isSuperTiebreak ? `[${s.a}-${s.b}]` : s.tiebreak ? `${s.a}-${s.b}(${Math.min(s.tiebreak.a, s.tiebreak.b)})` : `${s.a}-${s.b}`
    );
  }
  const score = computeScore(match.rules, match.pointLog, match.initialServer || "team1");
  return buildSetRow(match.rules, score);
}

function MatchCard({ match, onOpen, onDelete }) {
  const { t, styles } = useThemeCtx();
  const name1 = teamLabel("team1", match.team1.names, match.team2.names);
  const name2 = teamLabel("team2", match.team1.names, match.team2.names);
  const sets = matchSetsRow(match);
  return (
    <Card>
      <div style={{ padding: 14, cursor: "pointer" }} onClick={() => onOpen(match)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 800, flex: 1 }}>
            {name1} <span style={{ color: t.textMuted, fontWeight: 600 }}>–</span> {name2}
          </div>
          {match.status === "in_progress" && (
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase",
              background: "rgba(16,185,129,0.15)", color: "#10b981",
              padding: "3px 8px", borderRadius: 6, flexShrink: 0,
            }}>W trakcie</span>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginTop: 6, display: "flex", gap: 10 }}>
          {sets.map((s, i) => <span key={i}>{s}</span>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 12, color: t.textSub }}>📅 {match.date}{match.surface ? ` · ${match.surface}` : ""}</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={(e) => { e.stopPropagation(); shareMatch(`${name1} – ${name2}: ${sets.join(" ")}`); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: t.textSub }}
              title="Udostępnij"
            >🔗</button>
            <button
              onClick={(e) => { e.stopPropagation(); if (confirm("Usunąć ten mecz?")) onDelete(match.id); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: t.textSub }}
              title="Usuń"
            >🗑️</button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function MatchListPage({ onNewMatch, onSaveResult, onOpenMatch }) {
  const { t, styles } = useThemeCtx();
  const [matches, setMatches] = useState(() => storage.listMatches());

  const refresh = () => setMatches(storage.listMatches());

  const handleDelete = (id) => {
    storage.deleteMatch(id);
    refresh();
  };

  return (
    <div style={styles.page}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button style={styles.primaryBtn} onClick={onNewMatch}>🎾 Nowy mecz</button>
        <button style={styles.secondaryBtn} onClick={onSaveResult}>✏️ Zapisz wynik</button>
      </div>

      {matches.length === 0 ? (
        <div style={styles.centered}>
          <span style={{ fontSize: 32 }}>🎾</span>
          <span>Brak zapisanych meczów</span>
          <span style={{ fontSize: 12 }}>Zacznij od "Nowy mecz", żeby śledzić wynik na żywo.</span>
        </div>
      ) : (
        matches.map((m) => (
          <MatchCard key={m.id} match={m} onOpen={onOpenMatch} onDelete={handleDelete} />
        ))
      )}
    </div>
  );
}
