// Tennis Tracker — lista rywalizacji drużynowych.
import { useState } from "react";
import { useThemeCtx } from "../theme.js";
import { useLang } from "../i18n.js";
import { Card, TopBar, FullScreen, ScrollBody } from "./ui.jsx";
import * as storage from "./storage.js";
import * as ties from "./teamTies.js";

function TieCard({ tie, onOpen, onDelete }) {
  const { t } = useThemeCtx();
  const { t: tr } = useLang();
  const score = ties.computeTieScore(tie, storage.listMatches());
  return (
    <Card style={{ cursor: "pointer" }}>
      <div style={{ padding: 14 }} onClick={() => onOpen(tie)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>
            {tie.team1Name} <span style={{ color: t.textMuted, fontWeight: 600 }}>–</span> {tie.team2Name}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); if (confirm(tr("tie.confirmDelete"))) onDelete(tie.id); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: t.textSub, flexShrink: 0 }}
            title={tr("common.delete")}
          >🗑️</button>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: t.accent, marginTop: 8 }}>{score.wonA} : {score.wonB}</div>
        <div style={{ fontSize: 12, color: t.textSub, marginTop: 4 }}>
          {tr("tie.matchesPlayed", { played: score.playedCount, total: score.totalCount })}
        </div>
      </div>
    </Card>
  );
}

export default function TeamTieListPage({ onBack, onNewTie, onOpenTie }) {
  const { styles } = useThemeCtx();
  const { t: tr } = useLang();
  const [list, setList] = useState(() => ties.listTeamTies());
  const refresh = () => setList(ties.listTeamTies());
  const handleDelete = (id) => { ties.deleteTeamTie(id); refresh(); };

  return (
    <FullScreen>
      <TopBar title={tr("tie.listTitle")} onBack={onBack} />
      <ScrollBody style={{ padding: 16 }}>
        <button style={{ ...styles.primaryBtn, marginBottom: 16 }} onClick={onNewTie}>🏆 {tr("tie.newTie")}</button>
        {list.length === 0 ? (
          <div style={styles.centered}>
            <span style={{ fontSize: 32 }}>🏆</span>
            <span>{tr("tie.emptyTitle")}</span>
            <span style={{ fontSize: 12 }}>{tr("tie.emptyHint")}</span>
          </div>
        ) : (
          list.map((tie) => <TieCard key={tie.id} tie={tie} onOpen={onOpenTie} onDelete={handleDelete} />)
        )}
      </ScrollBody>
    </FullScreen>
  );
}
