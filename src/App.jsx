// Tennis Tracker v0.2.0 — główny komponent aplikacji.
import { useState, useMemo } from "react";
import { ThemeContext, themeForSurface, makeStyles } from "./theme.js";
import { APP_NAME, APP_VERSION } from "./version.js";
import MatchListPage from "./matchtracker/MatchListPage.jsx";
import MatchSetupPage from "./matchtracker/MatchSetupPage.jsx";
import MatchTrackerPage from "./matchtracker/MatchTrackerPage.jsx";
import MatchSummaryPage from "./matchtracker/MatchSummaryPage.jsx";

export default function App() {
  // Kolor całej aplikacji zależy od nawierzchni aktualnie zakładanego/oglądanego
  // meczu (null = poza kontekstem meczu → neutralny granat). Patrz theme.js.
  const [activeSurface, setActiveSurface] = useState(null);
  const t = themeForSurface(activeSurface);
  const styles = useMemo(() => makeStyles(t), [t]);
  const ctx = useMemo(() => ({ t, styles }), [t, styles]);

  const [view, setView] = useState({ name: "list" });
  const [listVersion, setListVersion] = useState(0);
  const goToList = () => {
    setView({ name: "list" });
    setListVersion((v) => v + 1);
    setActiveSurface(null);
  };

  return (
    <ThemeContext.Provider value={ctx}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body { height: 100%; }
        body { background: ${t.bg}; background-image: ${t.bgGradient}; background-attachment: fixed; background-size: cover; transition: background-color 0.4s ease; }
        @keyframes tileFlip {
          from { transform: rotateX(85deg); opacity: 0.3; }
          to   { transform: rotateX(0deg);  opacity: 1; }
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
            onCancel={goToList}
            onSurfaceChange={setActiveSurface}
            onCreated={(m) => setView(m.status === "in_progress" ? { name: "tracker", matchId: m.id } : { name: "summary", matchId: m.id })}
          />
        )}

        {view.name === "tracker" && (
          <MatchTrackerPage
            matchId={view.matchId}
            onBack={goToList}
            onSurfaceChange={setActiveSurface}
            onFinished={(m) => setView({ name: "summary", matchId: m.id })}
          />
        )}

        {view.name === "summary" && (
          <MatchSummaryPage
            matchId={view.matchId}
            onBack={goToList}
            onDeleted={goToList}
            onSurfaceChange={setActiveSurface}
            onContinue={(id) => setView({ name: "tracker", matchId: id })}
          />
        )}
      </div>
    </ThemeContext.Provider>
  );
}
