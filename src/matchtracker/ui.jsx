// ─────────────────────────────────────────────────────────────────────────────
// Tennis Tracker v0.2.0
// ui.jsx — małe, współdzielone komponenty wizualne używane na kilku ekranach
// trackera (duże przyciski akcji, karta, pasek górny).
// ─────────────────────────────────────────────────────────────────────────────
import { useThemeCtx } from "../theme.js";
import { useLang } from "../i18n.js";

// Ikonka piłki tenisowej narysowana w SVG — stałe, spójne renderowanie na
// każdym urządzeniu (emoji 🎾 wygląda różnie zależnie od systemu/producenta,
// bywa mylona z rakietką).
export function TennisBall({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10.5" fill="#d6f24c" stroke="#8caa1f" strokeWidth="1" />
      <path d="M2.2 8.2 Q12 3, 21.8 8.2" stroke="#fff" strokeWidth="1.6" fill="none" />
      <path d="M2.2 15.8 Q12 21, 21.8 15.8" stroke="#fff" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

export function TopBar({ title, onBack, right }) {
  const { t } = useThemeCtx();
  const { t: tr } = useLang();
  return (
    <div style={{
      flexShrink: 0, background: t.navBg, backdropFilter: "blur(12px)",
      borderBottom: `1px solid ${t.border}`, padding: "12px 14px",
      paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          fontSize: 13, fontWeight: 800, color: t.accent,
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "inherit", flexShrink: 0, padding: 0,
        }}>← {tr("common.back")}</button>
      )}
      <span style={{
        fontSize: 15, fontWeight: 700, color: t.text, flex: 1,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{title}</span>
      {right}
    </div>
  );
}

export function FullScreen({ children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300, background: "transparent",
      maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column",
    }}>
      {children}
    </div>
  );
}

export function ScrollBody({ children, style }) {
  return (
    <div style={{
      flex: 1, minHeight: 0, overflowY: "auto",
      paddingBottom: "env(safe-area-inset-bottom, 0px)", ...style,
    }}>
      {children}
    </div>
  );
}

// Duży, dotykowy przycisk akcji (jak w ekranach punktowania) — kolor
// konfigurowalny, domyślnie niebieski jak w referencyjnej aplikacji.
export function BigButton({ label, sub, onClick, color, tall = false, disabled = false, style }) {
  const { t } = useThemeCtx();
  const bg = color || t.secondary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", minHeight: tall ? 160 : 84,
        background: disabled ? "#5b6472" : bg,
        color: "#fff", border: "none", borderRadius: 10,
        fontSize: 17, fontWeight: 700, fontFamily: "inherit",
        cursor: disabled ? "default" : "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 4, opacity: disabled ? 0.6 : 1, padding: "10px 12px", textAlign: "center",
        ...style,
      }}
    >
      <span style={{ whiteSpace: "pre-line" }}>{label}</span>
      {sub && <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>{sub}</span>}
    </button>
  );
}

export function ButtonGrid({ children, columns = 2 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 12, padding: 16 }}>
      {children}
    </div>
  );
}

export function Card({ children, style }) {
  const { t } = useThemeCtx();
  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.border}`,
      boxShadow: t.cardShadow, borderRadius: 14, overflow: "hidden",
      marginBottom: 12, ...style,
    }}>
      {children}
    </div>
  );
}

// Kafelek jak w mechanicznej tablicy wyników (split-flap) — użyj z key={value}
// w miejscu wywołania, żeby animacja "przewracania" odtwarzała się przy
// każdej zmianie liczby/etykiety.
export function ScoreTile({ value, size = "lg" }) {
  const { t } = useThemeCtx();
  const big = size === "lg";
  return (
    <div style={{
      position: "relative", minWidth: big ? 56 : 36, height: big ? 68 : 42,
      background: "linear-gradient(180deg, #2a3154 0%, #171b30 100%)",
      borderRadius: 9, boxShadow: "0 5px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", padding: "0 6px", animation: "tileFlip 0.32s ease",
      transformOrigin: "center top",
    }}>
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "rgba(0,0,0,0.45)", zIndex: 2 }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.06), transparent 55%)" }} />
      <span style={{
        position: "relative", zIndex: 1, color: t.accent, fontWeight: 800,
        fontSize: big ? 30 : 17, lineHeight: 1, fontFamily: "inherit",
        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
      }}>{value}</span>
    </div>
  );
}

export function Chip({ label, active, onClick, color }) {
  const { t } = useThemeCtx();
  const c = color || t.accent;
  return (
    <button onClick={onClick} style={{
      fontSize: 12, fontWeight: active ? 800 : 600, padding: "8px 12px", borderRadius: 16,
      border: `1px solid ${active ? c : t.borderStrong}`,
      background: active ? `${c}22` : t.inputBg,
      color: active ? c : t.text, cursor: "pointer", fontFamily: "inherit",
    }}>
      {active ? "✓ " : ""}{label}
    </button>
  );
}
