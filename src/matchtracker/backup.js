// ─────────────────────────────────────────────────────────────────────────────
// Tennis Tracker — eksport/import kopii zapasowej historii meczów do pliku
// (na wypadek zmiany telefonu). Zwykły plik JSON — bez chmury, bez backendu,
// dokładnie w duchu reszty aplikacji (localStorage only).
// ─────────────────────────────────────────────────────────────────────────────
import * as storage from "./storage.js";
import { getFavoritePlayers, setFavoritePlayers } from "./players.js";

export function exportBackup() {
  const data = {
    app: "tennis-tracker",
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    matches: storage.listMatches(),
    favoritePlayers: getFavoritePlayers(),
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tennis-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read-failed"));
    reader.readAsText(file);
  });
}

// Scala z tym, co już jest na urządzeniu — mecze o tym samym id są nadpisane
// wersją z pliku, pozostałe zostają bez zmian. Nigdy nie kasuje lokalnych
// danych, których nie ma w pliku, więc jest bezpieczny zarówno na nowym
// telefonie (pusto → import = pełne odtworzenie), jak i na już używanym.
export async function importBackupFile(file) {
  const text = await readFileAsText(file);
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.matches)) {
    throw new Error("invalid-backup-file");
  }

  const current = storage.listMatches();
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of data.matches) {
    if (m && m.id) byId.set(m.id, m);
  }
  storage.replaceAllMatches([...byId.values()]);

  if (Array.isArray(data.favoritePlayers)) {
    const merged = [...new Set([...getFavoritePlayers(), ...data.favoritePlayers])];
    setFavoritePlayers(merged);
  }

  return { matchCount: byId.size };
}
