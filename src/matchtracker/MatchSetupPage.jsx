// Tenis Tracker v0.2.0 — ekran zakładania nowego meczu / zapisu ręcznego wyniku.
import { useState } from "react";
import { useThemeCtx, SURFACES, themeForSurface } from "../theme.js";
import { Card, TopBar, FullScreen, ScrollBody } from "./ui.jsx";
import * as storage from "./storage.js";
import { PRESETS, DEFAULT_PRESET_KEY } from "./scoringEngine.js";

const DEPTHS = [
  { key: "basic", title: "Podstawowy", desc: "Prosty licznik wyniku — dwa przyciski na jednym ekranie." },
  { key: "intermediate", title: "Średni", desc: "Serwis (as/1. serwis/2. serwis/podwójny błąd) i wynik piłki (winner/wymuszony/niewymuszony błąd)." },
  { key: "advanced", title: "Zaawansowany", desc: "Dodatkowo forehand/backhand, punkty przy siatce." },
  { key: "advanced_rallies", title: "Zaawansowany z wymianami", desc: "Dodatkowo długość wymiany (liczba uderzeń)." },
];

function TabBtn({ active, onClick, children }) {
  const { t } = useThemeCtx();
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "10px 6px", background: "none", border: "none",
      borderBottom: `2px solid ${active ? t.accent : "transparent"}`,
      color: active ? t.text : t.textMuted, fontWeight: active ? 800 : 600,
      fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em",
      cursor: "pointer", fontFamily: "inherit",
    }}>{children}</button>
  );
}

// Kafelek wyboru nawierzchni — kolorowany wg własnego motywu (nie bieżącego
// t), żeby od razu podpowiadał, na jaki kolor przebarwi się cała apka.
function SurfaceTile({ surface, active, onClick }) {
  const { t } = useThemeCtx();
  const stheme = themeForSurface(surface);
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "16px 6px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
      border: `2px solid ${active ? stheme.accent : t.borderStrong}`,
      background: active ? `${stheme.accent}22` : t.surfaceElevated,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: stheme.accent, boxShadow: `0 0 10px ${stheme.accent}88` }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: active ? stheme.accent : t.text }}>{surface}</span>
    </button>
  );
}

// Kafelek zasad meczu — pokazywany od razu na stronie (bez okienka), w stylu
// reszty apki. Zaznaczony ma ramkę i haczyk w kolorze akcentu.
function RulesTile({ preset, active, onClick }) {
  const { t } = useThemeCtx();
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
      border: `2px solid ${active ? t.accent : t.borderStrong}`,
      background: active ? `${t.accent}18` : t.surfaceElevated,
      borderRadius: 12, padding: 14, marginBottom: 10,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: active ? t.accent : t.text }}>
        {active ? "✓ " : ""}{preset.label}
      </div>
      <div style={{ fontSize: 12, color: t.textSub, marginTop: 6 }}>{preset.bullets.join(" · ")}</div>
    </button>
  );
}

function DepthPickerModal({ onPick, onClose }) {
  const { t } = useThemeCtx();
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400, background: t.overlay,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: t.bg, border: `1px solid ${t.border}`, borderRadius: 16,
        maxWidth: 420, width: "100%", maxHeight: "80vh", overflowY: "auto", padding: 20,
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Wybierz poziom śledzenia:</div>
        {DEPTHS.map((d) => (
          <Card key={d.key} style={{ cursor: "pointer" }}>
            <div style={{ padding: 14 }} onClick={() => onPick(d.key)}>
              <div style={{ fontSize: 18, fontWeight: 800, color: t.secondarySoft }}>{d.title}</div>
              <div style={{ fontSize: 13, color: t.textSub, marginTop: 4 }}>{d.desc}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function MatchSetupPage({ mode, onCancel, onCreated, onSurfaceChange }) {
  const { t, styles } = useThemeCtx();
  const isManual = mode === "manual";
  const [tab, setTab] = useState("players");

  const [isDoubles, setIsDoubles] = useState(false);
  const [isTeamEvent, setIsTeamEvent] = useState(false);
  const [t1a, setT1a] = useState("");
  const [t1b, setT1b] = useState("");
  const [t2a, setT2a] = useState("");
  const [t2b, setT2b] = useState("");

  const [presetKey, setPresetKey] = useState(DEFAULT_PRESET_KEY);
  const preset = PRESETS[presetKey];

  // null = jeszcze nie wybrano → apka zostaje neutralna, dopóki gracz nie
  // wskaże nawierzchni w zakładce "Gracze". Data meczu = dzisiejsza data z
  // systemu (bez ręcznego wyboru).
  const [surface, setSurface] = useState(null);

  const handleSurfaceChange = (val) => {
    setSurface(val);
    onSurfaceChange?.(val || null);
  };

  const [manualSets, setManualSets] = useState([{ a: "", b: "", tb: "", superTb: false }]);
  const [showDepthModal, setShowDepthModal] = useState(false);

  const team1Names = () => [t1a.trim() || "Gracz 1", ...(isDoubles ? [t1b.trim() || "Gracz 1b"] : [])];
  const team2Names = () => [t2a.trim() || "Gracz 2", ...(isDoubles ? [t2b.trim() || "Gracz 2b"] : [])];

  const baseData = () => ({
    team1: { names: team1Names() },
    team2: { names: team2Names() },
    isDoubles,
    date: new Date().toISOString().slice(0, 10),
    surface: surface || "Twarda",
  });

  const handleTrackConfirm = (depthKey) => {
    const match = storage.createMatch({
      ...baseData(),
      rules: { ...preset },
      trackingDepth: depthKey,
      initialServer: null,
      status: "in_progress",
      pointLog: [],
    });
    setShowDepthModal(false);
    onCreated(match);
  };

  const addManualSet = () => setManualSets((s) => (s.length >= 5 ? s : [...s, { a: "", b: "", tb: "", superTb: false }]));
  const removeManualSet = (i) => setManualSets((s) => s.filter((_, idx) => idx !== i));
  const updateManualSet = (i, patch) => setManualSets((s) => s.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const handleSaveManual = () => {
    const finalSets = manualSets
      .filter((r) => r.a !== "" && r.b !== "")
      .map((r) => {
        const a = parseInt(r.a, 10), b = parseInt(r.b, 10);
        if (r.superTb) return { a, b, isSuperTiebreak: true };
        if (r.tb !== "") return { a, b, tiebreak: { a: a > b ? 7 : parseInt(r.tb, 10), b: a > b ? parseInt(r.tb, 10) : 7 } };
        return { a, b };
      });
    if (finalSets.length === 0) { alert("Podaj wynik przynajmniej jednego seta"); return; }
    const match = storage.createMatch({
      ...baseData(),
      rules: null,
      trackingDepth: "basic",
      status: "completed",
      pointLog: [],
      finalSetsOverride: finalSets,
    });
    onCreated(match);
  };

  return (
    <FullScreen>
      <TopBar title={isManual ? "Zapisz wynik" : "Nowy mecz"} onBack={onCancel} />
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
        fontSize: 12, fontWeight: 700, color: surface ? t.accent : t.textMuted,
        flexShrink: 0, borderBottom: `1px solid ${t.border}`,
      }}>
        <span style={{
          width: 10, height: 10, borderRadius: "50%",
          background: surface ? themeForSurface(surface).accent : t.textMuted,
          flexShrink: 0,
        }} />
        {surface ? `Nawierzchnia: ${surface}` : "Nawierzchnia jeszcze nie wybrana (zakładka Gracze)"}
      </div>
      <div style={{ display: "flex", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <TabBtn active={tab === "players"} onClick={() => setTab("players")}>Gracze</TabBtn>
        {!isManual && <TabBtn active={tab === "rules"} onClick={() => setTab("rules")}>Zasady</TabBtn>}
        {isManual && <TabBtn active={tab === "wynik"} onClick={() => setTab("wynik")}>Wynik</TabBtn>}
      </div>
      <ScrollBody style={{ padding: 16 }}>
        {tab === "players" && (
          <>
            <span style={styles.label}>Nawierzchnia</span>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {SURFACES.map((s) => (
                <SurfaceTile key={s} surface={s} active={surface === s} onClick={() => handleSurfaceChange(surface === s ? null : s)} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: t.text }}>
                <input type="checkbox" checked={isDoubles} onChange={(e) => setIsDoubles(e.target.checked)} /> Debel
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: t.textMuted }} title="Niedostępne w tej wersji">
                <input type="checkbox" checked={isTeamEvent} disabled onChange={() => {}} /> Mecz drużynowy (wkrótce)
              </label>
            </div>
            <span style={styles.label}>Gracz / drużyna 1</span>
            <input style={{ ...styles.input, marginBottom: isDoubles ? 8 : 16 }} value={t1a} onChange={(e) => setT1a(e.target.value)} placeholder="Imię i nazwisko" />
            {isDoubles && <input style={{ ...styles.input, marginBottom: 16 }} value={t1b} onChange={(e) => setT1b(e.target.value)} placeholder="Partner/ka" />}
            <span style={styles.label}>Gracz / drużyna 2</span>
            <input style={{ ...styles.input, marginBottom: isDoubles ? 8 : 16 }} value={t2a} onChange={(e) => setT2a(e.target.value)} placeholder="Imię i nazwisko" />
            {isDoubles && <input style={styles.input} value={t2b} onChange={(e) => setT2b(e.target.value)} placeholder="Partner/ka" />}
          </>
        )}

        {tab === "rules" && !isManual && (
          <>
            <span style={styles.label}>Zasady meczu</span>
            {Object.values(PRESETS).map((p) => (
              <RulesTile key={p.key} preset={p} active={p.key === presetKey} onClick={() => setPresetKey(p.key)} />
            ))}
          </>
        )}

        {tab === "wynik" && isManual && (
          <>
            {manualSets.map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: t.textMuted, width: 40 }}>Set {i + 1}</span>
                <input style={{ ...styles.input, width: 56, textAlign: "center" }} type="number" value={row.a} onChange={(e) => updateManualSet(i, { a: e.target.value })} placeholder="0" />
                <span>–</span>
                <input style={{ ...styles.input, width: 56, textAlign: "center" }} type="number" value={row.b} onChange={(e) => updateManualSet(i, { b: e.target.value })} placeholder="0" />
                {!row.superTb && (
                  <input style={{ ...styles.input, width: 56, textAlign: "center" }} type="number" value={row.tb} onChange={(e) => updateManualSet(i, { tb: e.target.value })} placeholder="TB" title="Punkty przegranego w tie-breaku (opcjonalnie)" />
                )}
                <button onClick={() => removeManualSet(i)} style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
            ))}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.textSub, marginBottom: 12 }}>
              <input type="checkbox" checked={manualSets[manualSets.length - 1]?.superTb || false} onChange={(e) => updateManualSet(manualSets.length - 1, { superTb: e.target.checked })} />
              Ostatni set to super tie-break (wpisz punkty zamiast gemów)
            </label>
            {manualSets.length < 5 && <button style={styles.secondaryBtn} onClick={addManualSet}>+ Dodaj seta</button>}
          </>
        )}
      </ScrollBody>
      <div style={{ padding: "16px 16px calc(16px + env(safe-area-inset-bottom, 0px))", flexShrink: 0, borderTop: `1px solid ${t.border}` }}>
        <button style={styles.primaryBtn} onClick={() => (isManual ? handleSaveManual() : setShowDepthModal(true))}>
          {isManual ? "Zapisz wynik" : "Rozpocznij śledzenie"}
        </button>
      </div>
      {showDepthModal && <DepthPickerModal onPick={handleTrackConfirm} onClose={() => setShowDepthModal(false)} />}
    </FullScreen>
  );
}
