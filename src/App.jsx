// Tennis Tracker v0.2.0 — główny komponent aplikacji.
import { useState, useMemo } from "react";
import { ThemeContext, themeForSurface, makeStyles } from "./theme.js";
import { LangContext, getStoredLang, setStoredLang, translate } from "./i18n.js";
import { APP_NAME, APP_VERSION } from "./version.js";
import MatchListPage from "./matchtracker/MatchListPage.jsx";
import MatchSetupPage from "./matchtracker/MatchSetupPage.jsx";
import MatchTrackerPage from "./matchtracker/MatchTrackerPage.jsx";
import MatchSummaryPage from "./matchtracker/MatchSummaryPage.jsx";
import BackupModal from "./matchtracker/BackupModal.jsx";
import TeamTieListPage from "./matchtracker/TeamTieListPage.jsx";
import TeamTieSetupPage from "./matchtracker/TeamTieSetupPage.jsx";
import TeamTieDetailPage from "./matchtracker/TeamTieDetailPage.jsx";
import { getTeamTie } from "./matchtracker/teamTies.js";

// Ekran przy pierwszym uruchomieniu — wybór języka jest jawny (nie zgadujemy
// z ustawień systemu), żeby uniknąć niespodzianek. Zapamiętany w localStorage,
// da się później zmienić małą flagą w górnym pasku.
function LanguagePickerScreen({ t, styles, onPick }) {
  return (
    <div style={{ ...styles.app, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 24 }}>
      <span style={{ fontSize: 40 }}>🎾</span>
      <span style={{ fontSize: 18, fontWeight: 800, color: t.text }}>Wybierz język / Choose language</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 280 }}>
        <button style={styles.primaryBtn} onClick={() => onPick("pl")}>🇵🇱 Polski</button>
        <button style={styles.secondaryBtn} onClick={() => onPick("en")}>🇬🇧 English</button>
      </div>
    </div>
  );
}

export default function App() {
  // Kolor całej aplikacji zależy od nawierzchni aktualnie zakładanego/oglądanego
  // meczu (null = poza kontekstem meczu → neutralny granat). Patrz theme.js.
  const [activeSurface, setActiveSurface] = useState(null);
  const t = themeForSurface(activeSurface);
  const styles = useMemo(() => makeStyles(t), [t]);
  const ctx = useMemo(() => ({ t, styles }), [t, styles]);

  const [lang, setLang] = useState(() => getStoredLang());
  const langCtx = useMemo(() => ({
    lang: lang || "pl",
    setLang: (l) => { setStoredLang(l); setLang(l); },
    t: (key, vars) => translate(lang || "pl", key, vars),
  }), [lang]);

  const [view, setView] = useState({ name: "list" });
  const [listVersion, setListVersion] = useState(0);
  const [showBackup, setShowBackup] = useState(false);
  const goToList = () => {
    setView({ name: "list" });
    setListVersion((v) => v + 1);
    setActiveSurface(null);
  };

  if (!lang) {
    return (
      <ThemeContext.Provider value={ctx}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
          html, body { height: 100%; }
          body { background: ${t.bg}; background-image: ${t.bgGradient}; background-attachment: fixed; background-size: cover; }
        `}</style>
        <LanguagePickerScreen t={t} styles={styles} onPick={langCtx.setLang} />
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={ctx}>
      <LangContext.Provider value={langCtx}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body { height: 100%; }
        body { background: ${t.bg}; background-image: ${t.bgGradient}; background-attachment: fixed; background-size: cover; transition: background-color 0.4s ease; }
        @keyframes tileFlip {
          from { transform: rotateX(85deg); opacity: 0.3; }
          to   { transform: rotateX(0deg);  opacity: 1; }
        }
        @keyframes clockPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        input::placeholder { color: ${t.textMuted}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollbar}; border-radius: 4px; }
      `}</style>

      <div style={styles.app}>
        {view.name === "list" && (
          <>
            <nav style={styles.nav}>
              <span style={styles.navTitle}>🎾 {APP_NAME}</span>
              <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
                <button onClick={() => setShowBackup(true)} title={langCtx.t("backup.iconTitle")} style={{
                  background: "none", border: "none", cursor: "pointer", fontSize: 17,
                  color: t.textMuted, padding: 4, lineHeight: 1,
                }}>💾</button>
                <button onClick={() => setView({ name: "tieList" })} title={langCtx.t("tie.iconTitle")} style={{
                  background: "none", border: "none", cursor: "pointer", fontSize: 17,
                  color: t.textMuted, padding: 4, lineHeight: 1,
                }}>🏆</button>
                <button onClick={() => langCtx.setLang("pl")} title="Polski" style={{
                  background: "none", border: "none", cursor: "pointer", fontSize: 18,
                  opacity: langCtx.lang === "pl" ? 1 : 0.35, padding: 4, lineHeight: 1,
                }}>🇵🇱</button>
                <button onClick={() => langCtx.setLang("en")} title="English" style={{
                  background: "none", border: "none", cursor: "pointer", fontSize: 18,
                  opacity: langCtx.lang === "en" ? 1 : 0.35, padding: 4, lineHeight: 1,
                }}>🇬🇧</button>
              </div>
            </nav>
            <MatchListPage
              key={listVersion}
              onNewMatch={() => setView({ name: "setup", mode: "track" })}
              onSaveResult={() => setView({ name: "setup", mode: "manual" })}
              onOpenMatch={(m) => {
                setActiveSurface(m.surface || null);
                setView(m.status === "in_progress" ? { name: "tracker", matchId: m.id } : { name: "summary", matchId: m.id });
              }}
            />
            <div style={{ textAlign: "center", fontSize: 11, color: t.textMuted, padding: "0 0 20px" }}>
              {APP_NAME} v{APP_VERSION}
            </div>
          </>
        )}

        {view.name === "setup" && (
          <MatchSetupPage
            mode={view.mode}
            onCancel={view.tieId ? () => setView({ name: "tieDetail", tieId: view.tieId }) : goToList}
            onSurfaceChange={setActiveSurface}
            tieContext={(() => {
              if (!view.tieId) return null;
              const tie = getTeamTie(view.tieId);
              return tie ? { tieId: tie.id, team1Name: tie.team1Name, team2Name: tie.team2Name } : null;
            })()}
            onCreated={(m) => setView(m.status === "in_progress" ? { name: "tracker", matchId: m.id, tieId: view.tieId } : { name: "summary", matchId: m.id, tieId: view.tieId })}
          />
        )}

        {view.name === "tracker" && (
          <MatchTrackerPage
            matchId={view.matchId}
            onBack={view.tieId ? () => setView({ name: "tieDetail", tieId: view.tieId }) : goToList}
            onSurfaceChange={setActiveSurface}
            onFinished={(m) => setView({ name: "summary", matchId: m.id, tieId: view.tieId })}
          />
        )}

        {view.name === "summary" && (
          <MatchSummaryPage
            matchId={view.matchId}
            onBack={view.tieId ? () => setView({ name: "tieDetail", tieId: view.tieId }) : goToList}
            onDeleted={view.tieId ? () => setView({ name: "tieDetail", tieId: view.tieId }) : goToList}
            onSurfaceChange={setActiveSurface}
            onContinue={(id) => setView({ name: "tracker", matchId: id, tieId: view.tieId })}
          />
        )}

        {view.name === "tieList" && (
          <TeamTieListPage
            onBack={goToList}
            onNewTie={() => setView({ name: "tieSetup" })}
            onOpenTie={(tie) => setView({ name: "tieDetail", tieId: tie.id })}
          />
        )}

        {view.name === "tieSetup" && (
          <TeamTieSetupPage
            onBack={() => setView({ name: "tieList" })}
            onCreated={(tie) => setView({ name: "tieDetail", tieId: tie.id })}
          />
        )}

        {view.name === "tieDetail" && (
          <TeamTieDetailPage
            tieId={view.tieId}
            onBack={() => setView({ name: "tieList" })}
            onDeleted={() => setView({ name: "tieList" })}
            onAddMatch={(mode) => setView({ name: "setup", mode, tieId: view.tieId })}
            onOpenMatch={(m) => {
              setActiveSurface(m.surface || null);
              setView(m.status === "in_progress" ? { name: "tracker", matchId: m.id, tieId: view.tieId } : { name: "summary", matchId: m.id, tieId: view.tieId });
            }}
          />
        )}
      </div>
      {showBackup && (
        <BackupModal
          onClose={() => setShowBackup(false)}
          onImported={() => setListVersion((v) => v + 1)}
        />
      )}
      </LangContext.Provider>
    </ThemeContext.Provider>
  );
}
