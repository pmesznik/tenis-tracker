// Tennis Tracker v0.2.0 — ekran zakładania nowego meczu / zapisu ręcznego wyniku.
import { useState, useMemo } from "react";
import { useThemeCtx, SURFACES, themeForSurface } from "../theme.js";
import { useLang, surfaceLabel } from "../i18n.js";
import { Card, TopBar, FullScreen, ScrollBody, Chip } from "./ui.jsx";
import * as storage from "./storage.js";
import { PRESETS, DEFAULT_PRESET_KEY } from "./scoringEngine.js";
import { buildPlayerIndex, suggestOpponents, getFavoritePlayers, toggleFavoritePlayer } from "./players.js";
import { addMatchToTie } from "./teamTies.js";

const DEPTHS = [
  { key: "basic", titleKey: "depth.basic.title", descKey: "depth.basic.desc" },
  { key: "intermediate", titleKey: "depth.intermediate.title", descKey: "depth.intermediate.desc" },
  { key: "advanced", titleKey: "depth.advanced.title", descKey: "depth.advanced.desc" },
  { key: "advanced_rallies", titleKey: "depth.advancedRallies.title", descKey: "depth.advancedRallies.desc" },
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
  const { lang } = useLang();
  const stheme = themeForSurface(surface);
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "16px 6px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
      border: `2px solid ${active ? stheme.accent : t.borderStrong}`,
      background: active ? `${stheme.accent}22` : t.surfaceElevated,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: stheme.accent, boxShadow: `0 0 10px ${stheme.accent}88` }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: active ? stheme.accent : t.text }}>{surfaceLabel(lang, surface)}</span>
    </button>
  );
}

// Kafelek zasad meczu — pokazywany od razu na stronie (bez okienka), w stylu
// reszty apki. Zaznaczony ma ramkę i haczyk w kolorze akcentu.
function RulesTile({ preset, active, onClick }) {
  const { t } = useThemeCtx();
  const { t: tr } = useLang();
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
      border: `2px solid ${active ? t.accent : t.borderStrong}`,
      background: active ? `${t.accent}18` : t.surfaceElevated,
      borderRadius: 12, padding: 14, marginBottom: 10,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: active ? t.accent : t.text }}>
        {active ? "✓ " : ""}{tr(preset.labelKey)}
      </div>
      <div style={{ fontSize: 12, color: t.textSub, marginTop: 6 }}>{preset.bulletKeys.map((k) => tr(k)).join(" · ")}</div>
    </button>
  );
}

// Pole nazwiska z gwiazdką ulubionego, chipami ulubionych (wypełniają to
// pole jednym dotknięciem) i podpowiedziami przeciwników wyliczonymi z
// historii meczów tego akurat gracza (drugie pole).
function NameField({ label, value, onChange, favorites, onToggleFavorite, suggestions, placeholder, listId }) {
  const { t, styles } = useThemeCtx();
  const { t: tr } = useLang();
  const isFav = favorites.includes(value.trim());
  return (
    <>
      <span style={styles.label}>{label}</span>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          style={{ ...styles.input, flex: 1, minWidth: 0 }} value={value} list={listId}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        />
        <button
          onClick={() => onToggleFavorite(value)} disabled={!value.trim()}
          title={tr("setup.favoriteToggle")}
          style={{
            width: 44, flexShrink: 0, borderRadius: 10, border: `1px solid ${t.borderStrong}`,
            background: t.surfaceElevated, color: isFav ? t.accent : t.textMuted,
            fontSize: 18, cursor: value.trim() ? "pointer" : "default", opacity: value.trim() ? 1 : 0.5,
          }}
        >{isFav ? "★" : "☆"}</button>
      </div>
      <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {favorites.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {favorites.map((name) => (
              <Chip key={name} label={`★ ${name}`} active={value.trim() === name} onClick={() => onChange(name)} />
            ))}
          </div>
        )}
        {suggestions.length > 0 && (
          <div>
            <span style={{ fontSize: 11, color: t.textMuted, display: "block", marginBottom: 6 }}>{tr("setup.playedBefore")}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {suggestions.map((name) => (
                <Chip key={name} label={name} active={value.trim() === name} onClick={() => onChange(name)} color={t.secondarySoft} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DepthPickerModal({ onPick, onClose }) {
  const { t } = useThemeCtx();
  const { t: tr } = useLang();
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400, background: t.overlay,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: t.bg, border: `1px solid ${t.border}`, borderRadius: 16,
        maxWidth: 420, width: "100%", maxHeight: "80vh", overflowY: "auto", padding: 20,
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>{tr("setup.pickDepthTitle")}</div>
        {DEPTHS.map((d) => (
          <Card key={d.key} style={{ cursor: "pointer" }}>
            <div style={{ padding: 14 }} onClick={() => onPick(d.key)}>
              <div style={{ fontSize: 18, fontWeight: 800, color: t.secondarySoft }}>{tr(d.titleKey)}</div>
              <div style={{ fontSize: 13, color: t.textSub, marginTop: 4 }}>{tr(d.descKey)}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function MatchSetupPage({ mode, onCancel, onCreated, onSurfaceChange, tieContext }) {
  const { t, styles } = useThemeCtx();
  const { lang, t: tr } = useLang();
  const isManual = mode === "manual";
  const [tab, setTab] = useState("players");

  const [isDoubles, setIsDoubles] = useState(false);
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

  // Indeks graczy (wszystkie znane nazwiska + z kim kto grał) liczony raz z
  // historii meczów — ten sam pure-derive wzorzec co computeScore(), żadnego
  // osobnego stanu do synchronizowania.
  const playerIndex = useMemo(() => buildPlayerIndex(storage.listMatches()), []);
  const [favorites, setFavorites] = useState(() => getFavoritePlayers());
  const handleToggleFavorite = (name) => setFavorites(toggleFavoritePlayer(name));

  const team1Names = () => [t1a.trim() || tr("common.player1"), ...(isDoubles ? [t1b.trim() || `${tr("common.player1")}b`] : [])];
  const team2Names = () => [t2a.trim() || tr("common.player2"), ...(isDoubles ? [t2b.trim() || `${tr("common.player2")}b`] : [])];

  const baseData = () => ({
    team1: { names: team1Names() },
    team2: { names: team2Names() },
    isDoubles,
    date: new Date().toISOString().slice(0, 10),
    surface: surface || "Twarda",
    teamTieId: tieContext?.tieId || null,
  });

  const linkToTie = (match) => {
    if (tieContext) addMatchToTie(tieContext.tieId, match.id);
    return match;
  };

  const handleTrackConfirm = (depthKey) => {
    const match = linkToTie(storage.createMatch({
      ...baseData(),
      rules: { ...preset },
      trackingDepth: depthKey,
      initialServer: null,
      status: "in_progress",
      pointLog: [],
    }));
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
    if (finalSets.length === 0) { alert(tr("setup.alertNeedOneSet")); return; }
    const match = linkToTie(storage.createMatch({
      ...baseData(),
      rules: null,
      trackingDepth: "basic",
      status: "completed",
      pointLog: [],
      finalSetsOverride: finalSets,
    }));
    onCreated(match);
  };

  return (
    <FullScreen>
      <TopBar title={isManual ? tr("setup.titleManual") : tr("setup.titleNew")} onBack={onCancel} />
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
        {surface ? tr("setup.surfaceLabel", { surface: surfaceLabel(lang, surface) }) : tr("setup.surfaceNotChosen")}
      </div>
      {tieContext && (
        <div style={{
          padding: "8px 16px", fontSize: 12, fontWeight: 700, color: t.accent,
          background: `${t.accent}14`, borderBottom: `1px solid ${t.border}`, flexShrink: 0,
        }}>
          🏆 {tr("tie.matchBanner", { team1: tieContext.team1Name, team2: tieContext.team2Name })}
        </div>
      )}
      <div style={{ display: "flex", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <TabBtn active={tab === "players"} onClick={() => setTab("players")}>{tr("setup.tabPlayers")}</TabBtn>
        {!isManual && <TabBtn active={tab === "rules"} onClick={() => setTab("rules")}>{tr("setup.tabRules")}</TabBtn>}
        {isManual && <TabBtn active={tab === "wynik"} onClick={() => setTab("wynik")}>{tr("setup.tabResult")}</TabBtn>}
      </div>
      <ScrollBody style={{ padding: 16 }}>
        {tab === "players" && (
          <>
            <span style={styles.label}>{tr("setup.surface")}</span>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {SURFACES.map((s) => (
                <SurfaceTile key={s} surface={s} active={surface === s} onClick={() => handleSurfaceChange(surface === s ? null : s)} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: t.text }}>
                <input type="checkbox" checked={isDoubles} onChange={(e) => setIsDoubles(e.target.checked)} /> {tr("setup.doubles")}
              </label>
            </div>
            <datalist id="known-players">
              {playerIndex.allNames.map((n) => <option key={n} value={n} />)}
            </datalist>

            <NameField
              label={tieContext ? tr("tie.playerFor", { team: tieContext.team1Name }) : tr("setup.team1")} value={t1a} onChange={setT1a}
              favorites={favorites} onToggleFavorite={handleToggleFavorite}
              suggestions={suggestOpponents(playerIndex, t2a)}
              placeholder={tr("common.fullName")} listId="known-players"
            />
            {isDoubles && <input style={{ ...styles.input, marginBottom: 16 }} value={t1b} onChange={(e) => setT1b(e.target.value)} placeholder={tr("common.partner")} list="known-players" />}

            <NameField
              label={tieContext ? tr("tie.playerFor", { team: tieContext.team2Name }) : tr("setup.team2")} value={t2a} onChange={setT2a}
              favorites={favorites} onToggleFavorite={handleToggleFavorite}
              suggestions={suggestOpponents(playerIndex, t1a)}
              placeholder={tr("common.fullName")} listId="known-players"
            />
            {isDoubles && <input style={styles.input} value={t2b} onChange={(e) => setT2b(e.target.value)} placeholder={tr("common.partner")} list="known-players" />}
          </>
        )}

        {tab === "rules" && !isManual && (
          <>
            <span style={styles.label}>{tr("setup.rulesLabel")}</span>
            {Object.values(PRESETS).map((p) => (
              <RulesTile key={p.key} preset={p} active={p.key === presetKey} onClick={() => setPresetKey(p.key)} />
            ))}
          </>
        )}

        {tab === "wynik" && isManual && (
          <>
            {manualSets.map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: t.textMuted, width: 40 }}>{tr("common.setLabel", { n: i + 1 })}</span>
                <input style={{ ...styles.input, width: 56, textAlign: "center" }} type="number" value={row.a} onChange={(e) => updateManualSet(i, { a: e.target.value })} placeholder="0" />
                <span>–</span>
                <input style={{ ...styles.input, width: 56, textAlign: "center" }} type="number" value={row.b} onChange={(e) => updateManualSet(i, { b: e.target.value })} placeholder="0" />
                {!row.superTb && (
                  <input style={{ ...styles.input, width: 56, textAlign: "center" }} type="number" value={row.tb} onChange={(e) => updateManualSet(i, { tb: e.target.value })} placeholder={tr("setup.tbPlaceholder")} title={tr("setup.tbTitle")} />
                )}
                <button onClick={() => removeManualSet(i)} style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
            ))}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.textSub, marginBottom: 12 }}>
              <input type="checkbox" checked={manualSets[manualSets.length - 1]?.superTb || false} onChange={(e) => updateManualSet(manualSets.length - 1, { superTb: e.target.checked })} />
              {tr("setup.superTbCheckbox")}
            </label>
            {manualSets.length < 5 && <button style={styles.secondaryBtn} onClick={addManualSet}>{tr("setup.addSet")}</button>}
          </>
        )}
      </ScrollBody>
      <div style={{ padding: "16px 16px calc(16px + env(safe-area-inset-bottom, 0px))", flexShrink: 0, borderTop: `1px solid ${t.border}` }}>
        <button style={styles.primaryBtn} onClick={() => (isManual ? handleSaveManual() : setShowDepthModal(true))}>
          {isManual ? tr("setup.titleManual") : tr("setup.startTracking")}
        </button>
      </div>
      {showDepthModal && <DepthPickerModal onPick={handleTrackConfirm} onClose={() => setShowDepthModal(false)} />}
    </FullScreen>
  );
}
