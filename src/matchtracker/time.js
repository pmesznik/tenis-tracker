// ─────────────────────────────────────────────────────────────────────────────
// Tennis Tracker — pomocnicze funkcje do czasu meczu/setów/punktów.
//
// Świadomie prosty model: żadnej pauzy, żadnego wykrywania przerw. Czas seta
// liczony jest od końca poprzedniego seta (patrz scoringEngine.computeScore),
// więc przerwa między setami wlicza się w czas seta po niej i w czas jego
// pierwszego punktu — to zaakceptowana nieścisłość, nie błąd.
// ─────────────────────────────────────────────────────────────────────────────

export function formatDuration(ms) {
  if (ms == null || ms < 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Dopisuje durationMs do każdego punktu: różnica względem poprzedniego punktu,
// a dla pierwszego punktu meczu — względem startedAt. Punkty bez znacznika
// czasu (mecze sprzed tej funkcji) dostają durationMs: null.
export function pointDurations(pointLog, startedAt) {
  let prevT = startedAt;
  return pointLog.map((pt) => {
    const durationMs = pt.t != null && prevT != null ? pt.t - prevT : null;
    if (pt.t != null) prevT = pt.t;
    return { ...pt, durationMs };
  });
}

export function longestPoint(pointLog, startedAt) {
  const withDur = pointDurations(pointLog, startedAt).filter((p) => p.durationMs != null);
  if (withDur.length === 0) return null;
  return withDur.reduce((max, p) => (p.durationMs > max.durationMs ? p : max));
}

export function averagePointDurationMs(pointLog, startedAt) {
  const durations = pointDurations(pointLog, startedAt).map((p) => p.durationMs).filter((d) => d != null);
  if (durations.length === 0) return null;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}
