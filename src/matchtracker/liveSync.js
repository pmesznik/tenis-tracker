// ─────────────────────────────────────────────────────────────────────────────
// Tennis Tracker — synchronizacja wyniku na żywo (Firebase Realtime Database).
//
// Osobny, dedykowany projekt Firebase (tenis-tracker-live) — tylko do
// przekazywania aktualnego wyniku meczu w czasie rzeczywistym pod ścieżką
// liveMatches/{matchId}. Klucz apiKey poniżej jest publiczny z założenia
// (bezpieczeństwo zapewniają reguły dostępu w Realtime Database, nie
// ukrywanie configu) — matchId to losowy UUID, więc ścieżka jest praktycznie
// niezgadywalna nawet przy w pełni otwartym odczycie/zapisie.
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, set, remove } from "firebase/database";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDgjd3EhID7KR-krrNNXx3Uv5yny9LkCsE",
  authDomain: "tenis-tracker-live.firebaseapp.com",
  databaseURL: "https://tenis-tracker-live-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tenis-tracker-live",
  storageBucket: "tenis-tracker-live.firebasestorage.app",
  messagingSenderId: "724796439670",
  appId: "1:724796439670:web:da904995717555fa0ff357",
};

function db() {
  const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
  return getDatabase(app);
}

export function publishLiveScore(matchId, data) {
  try {
    set(ref(db(), `liveMatches/${matchId}`), { ...data, updatedAt: Date.now() }).catch(() => {});
  } catch {}
}

export function clearLiveScore(matchId) {
  try {
    remove(ref(db(), `liveMatches/${matchId}`)).catch(() => {});
  } catch {}
}
