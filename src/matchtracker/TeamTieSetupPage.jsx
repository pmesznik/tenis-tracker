// Tennis Tracker — utworzenie nowej rywalizacji drużynowej (nazwy drużyn).
import { useState } from "react";
import { useThemeCtx } from "../theme.js";
import { useLang } from "../i18n.js";
import { TopBar, FullScreen, ScrollBody } from "./ui.jsx";
import { createTeamTie } from "./teamTies.js";

export default function TeamTieSetupPage({ onBack, onCreated }) {
  const { t, styles } = useThemeCtx();
  const { t: tr } = useLang();
  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");

  const handleCreate = () => {
    const tie = createTeamTie(
      name1.trim() || tr("tie.defaultTeam1"),
      name2.trim() || tr("tie.defaultTeam2")
    );
    onCreated(tie);
  };

  return (
    <FullScreen>
      <TopBar title={tr("tie.setupTitle")} onBack={onBack} />
      <ScrollBody style={{ padding: 16 }}>
        <span style={styles.label}>{tr("tie.team1NameLabel")}</span>
        <input
          style={{ ...styles.input, marginBottom: 16 }} value={name1}
          onChange={(e) => setName1(e.target.value)} placeholder={tr("tie.teamNamePlaceholder")}
        />
        <span style={styles.label}>{tr("tie.team2NameLabel")}</span>
        <input
          style={styles.input} value={name2}
          onChange={(e) => setName2(e.target.value)} placeholder={tr("tie.teamNamePlaceholder")}
        />
        <div style={{ fontSize: 12, color: t.textSub, marginTop: 16, lineHeight: 1.5 }}>{tr("tie.setupHint")}</div>
      </ScrollBody>
      <div style={{ padding: "16px 16px calc(16px + env(safe-area-inset-bottom, 0px))", flexShrink: 0, borderTop: `1px solid ${t.border}` }}>
        <button style={styles.primaryBtn} onClick={handleCreate}>{tr("tie.createButton")}</button>
      </div>
    </FullScreen>
  );
}
