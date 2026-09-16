// Tennis Tracker — okienko eksportu/importu kopii zapasowej historii meczów.
import { useRef, useState } from "react";
import { useThemeCtx } from "../theme.js";
import { useLang } from "../i18n.js";
import { exportBackup, importBackupFile } from "./backup.js";

export default function BackupModal({ onClose, onImported }) {
  const { t } = useThemeCtx();
  const { t: tr } = useLang();
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // pozwala wybrać ten sam plik jeszcze raz później
    if (!file) return;
    setBusy(true);
    try {
      const { matchCount } = await importBackupFile(file);
      alert(tr("backup.importSuccess", { n: matchCount }));
      onImported?.();
      onClose();
    } catch {
      alert(tr("backup.importError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400, background: t.overlay,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: t.bg, border: `1px solid ${t.border}`, borderRadius: 16,
        maxWidth: 380, width: "100%", padding: 20,
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{tr("backup.title")}</div>
        <div style={{ fontSize: 13, color: t.textSub, marginBottom: 16 }}>{tr("backup.hint")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={exportBackup} style={{
            background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`, color: "#111144",
            border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, padding: "13px 16px",
            cursor: "pointer", fontFamily: "inherit",
          }}>💾 {tr("backup.export")}</button>
          <button onClick={handleImportClick} disabled={busy} style={{
            background: t.surfaceElevated, color: t.text, border: `1px solid ${t.borderStrong}`,
            borderRadius: 12, fontSize: 14, fontWeight: 700, padding: "12px 16px",
            cursor: busy ? "default" : "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1,
          }}>📂 {busy ? tr("backup.importing") : tr("backup.import")}</button>
        </div>
        <input
          ref={fileInputRef} type="file" accept="application/json,.json"
          style={{ display: "none" }} onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
