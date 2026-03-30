import { useState, useEffect, useRef } from "react";
import SnakeCanvas from "@/components/SnakeCanvas";
import SnakePreview from "@/components/SnakePreview";
import { SNAKE_COLORS, DEFAULT_COLOR_ID } from "@/lib/snakeColors";

const BETS = [
  { value: "3rb",  label: "Beginner",      popular: false, premium: false },
  { value: "5rb",  label: null,            popular: false, premium: false },
  { value: "10rb", label: "🔥 Popular",    popular: true,  premium: false },
  { value: "20rb", label: "💰 High Reward",popular: false, premium: true  },
];

// ---- Gold palette constants ----
const GOLD      = "#fbbf24";
const GOLD_DIM  = "#f59e0b";
const GOLD_DEEP = "#d97706";
const GOLD_GLOW = "rgba(251,191,36,";

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

export default function Landing() {
  const [selectedServer, setSelectedServer]   = useState("10rb");
  const [appliedColorId, setAppliedColorId]   = useState(DEFAULT_COLOR_ID);
  const [pendingColorId, setPendingColorId]   = useState(DEFAULT_COLOR_ID);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const openPicker   = () => { setPendingColorId(appliedColorId); setShowColorPicker(true); };
  const confirmColor = () => { setAppliedColorId(pendingColorId); setShowColorPicker(false); };
  const cancelColor  = () => { setPendingColorId(appliedColorId); setShowColorPicker(false); };

  useOutsideClick(pickerRef, () => { setPendingColorId(appliedColorId); setShowColorPicker(false); });

  const appliedColor = SNAKE_COLORS.find((c) => c.id === appliedColorId) ?? SNAKE_COLORS[0];
  const pendingColor = SNAKE_COLORS.find((c) => c.id === pendingColorId) ?? SNAKE_COLORS[0];
  const hasChanged   = pendingColorId !== appliedColorId;
  const previewColor = showColorPicker ? pendingColor : appliedColor;

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#0d0900" }}>
      <SnakeCanvas playerColorId={appliedColorId} />

      {/* Subtle gold grid */}
      <div className="fixed inset-0 pointer-events-none grid-bg" style={{ zIndex: 1 }} />

      {/* Warm luminous overlay — gold radial from center, dark at edges */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: [
            "radial-gradient(ellipse 80% 55% at 50% 30%, rgba(251,191,36,0.07) 0%, transparent 70%)",
            "radial-gradient(ellipse at center, rgba(13,9,0,0.50) 0%, rgba(13,9,0,0.78) 100%)",
          ].join(", "),
          backdropFilter: "blur(1px)",
        }}
      />

      {/* Main content */}
      <div className="relative" style={{ zIndex: 3 }}>

        {/* ===== NAVBAR ===== */}
        <nav className="flex items-center justify-between px-6 md:px-12 py-5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
              style={{
                background: `linear-gradient(135deg, ${GOLD_DEEP}, ${GOLD})`,
                boxShadow: `0 0 18px ${GOLD_GLOW}0.45), 0 2px 8px rgba(0,0,0,0.5)`,
                color: "#1a0e00",
              }}
            >
              D
            </div>
            <span
              className="font-black text-xl hidden sm:block"
              style={{ letterSpacing: "0.15em", color: GOLD, textShadow: `0 0 12px ${GOLD_GLOW}0.4)` }}
            >
              DAMBRUH
            </span>
          </div>
          <button className="login-btn px-6 py-2 rounded-full text-sm font-semibold tracking-wide">
            Login
          </button>
        </nav>

        {/* ===== HERO ===== */}
        <div className="flex flex-col items-center text-center px-6 pt-8 pb-8">

          {/* Main title — gold glow */}
          <h1
            className="font-black uppercase title-glow"
            style={{
              fontSize: "clamp(3.5rem,12vw,8rem)",
              letterSpacing: "0.08em",
              lineHeight: 1,
              color: "#fff",
            }}
          >
            DAMBRUH
          </h1>

          {/* Gold shimmer subtitle */}
          <p className="shimmer-text font-bold tracking-[0.3em] uppercase mt-2 text-sm md:text-base">
            SKILL-BASED BETTING
          </p>

          {/* Name field */}
          <div className="flex items-center gap-3 mt-8">
            <input
              type="text" value="???" disabled
              className="px-5 py-2.5 rounded-xl text-center font-bold tracking-widest cursor-not-allowed"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${GOLD_GLOW}0.15)`,
                color: "#6b5a2a",
                width: "130px",
                fontSize: "1rem",
              }}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: "#a08040" }}>Login to set your name</span>
              <button
                className="p-1 rounded-lg transition-colors"
                style={{ color: GOLD_DIM }}
                title="Edit name"
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${GOLD_GLOW}0.1)`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Bet selection */}
          <div className="flex items-center gap-3 mt-6 flex-wrap justify-center">
            {BETS.map((bet) => {
              const isSelected = selectedServer === bet.value;
              const isPopular  = bet.popular;
              const isPremium  = bet.premium;
              return (
                <div key={bet.value} className="flex flex-col items-center gap-1">
                  {/* Label badge above button */}
                  {bet.label ? (
                    <span
                      className={`text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full ${
                        isPopular ? "bet-label-popular" : "bet-label-premium"
                      }`}
                    >
                      {bet.label}
                    </span>
                  ) : (
                    <span className="text-[10px] opacity-0 select-none">_</span>
                  )}
                  <button
                    onClick={() => setSelectedServer(bet.value)}
                    className={`bet-btn ${
                      isSelected
                        ? isPopular
                          ? "bet-btn-popular-selected"
                          : isPremium
                          ? "bet-btn-premium-selected"
                          : "bet-btn-selected"
                        : isPopular
                        ? "bet-btn-popular-idle"
                        : isPremium
                        ? "bet-btn-premium-idle"
                        : "bet-btn-idle"
                    }`}
                  >
                    {bet.value}
                  </button>
                </div>
              );
            })}
          </div>

          {/* JOIN GAME */}
          <button className="join-btn join-btn-pulse mt-7 px-14 py-5 rounded-2xl text-2xl tracking-widest uppercase font-black">
            ▶ JOIN GAME
          </button>

          {/* Stats */}
          <div className="flex items-center gap-8 md:gap-16 mt-10">
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#7a6030" }}>
                Players Real-Time Active
              </p>
              <p
                className="font-black text-4xl md:text-5xl"
                style={{ color: GOLD, textShadow: `0 0 22px ${GOLD_GLOW}0.55), 0 0 50px ${GOLD_GLOW}0.25)` }}
              >
                43
              </p>
            </div>
            <div
              className="w-px h-14 rounded-full"
              style={{ background: `linear-gradient(to bottom, transparent, ${GOLD_GLOW}0.35), transparent)` }}
            />
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#7a6030" }}>
                Global Player Winnings
              </p>
              <p
                className="font-black text-3xl md:text-4xl"
                style={{ color: GOLD, textShadow: `0 0 22px ${GOLD_GLOW}0.55), 0 0 50px ${GOLD_GLOW}0.25)` }}
              >
                $1,345,521
              </p>
            </div>
          </div>
        </div>

        {/* ===== BOTTOM CARDS ===== */}
        <div className="px-4 md:px-8 lg:px-16 pb-16 max-w-2xl mx-auto flex flex-col gap-4">

          {/* ---- Wallet ---- */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: `${GOLD_GLOW}0.12)`,
                    border: `1px solid ${GOLD_GLOW}0.32)`,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: "#7a6030" }}>Balance</p>
                  <p
                    className="font-black text-2xl text-white"
                    style={{ textShadow: `0 0 16px ${GOLD_GLOW}0.4)` }}
                  >
                    $5,050
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 secondary-btn py-2.5 rounded-xl text-sm font-semibold">Add Balance</button>
              <button className="flex-1 green-btn py-2.5 rounded-xl text-sm font-semibold">Withdraw</button>
            </div>
          </div>

          {/* ---- Customize ---- */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: `${GOLD_GLOW}0.1)`,
                    border: `1px solid ${GOLD_GLOW}0.28)`,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H5v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10h1.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: "#7a6030" }}>Customize</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm">Snake Appearance</p>
                    <div
                      className="w-3 h-3 rounded-full ring-1"
                      style={{
                        background: appliedColor.color,
                        boxShadow: `0 0 6px ${appliedColor.glow}`,
                        ringColor: "rgba(255,255,255,0.2)",
                      }}
                    />
                  </div>
                </div>
              </div>
              <button className="green-btn px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap" onClick={openPicker}>
                Change Appearance
              </button>
            </div>

            {/* Animated Snake Preview */}
            <div
              className="rounded-xl overflow-hidden flex items-center justify-center"
              style={{
                background: "rgba(8,5,0,0.82)",
                border: `1px solid ${previewColor.color}33`,
                boxShadow: `0 0 24px ${previewColor.glow}1a, 0 0 0 1px ${GOLD_GLOW}0.06), inset 0 0 28px rgba(0,0,0,0.5)`,
                minHeight: "160px",
              }}
            >
              <SnakePreview colorId={showColorPicker ? pendingColorId : appliedColorId} width={340} height={160} />
            </div>

            {/* Color label */}
            <div className="flex items-center justify-center gap-2 mt-2.5">
              <div
                className="w-2.5 h-2.5 rounded-full transition-all duration-200"
                style={{ background: previewColor.color, boxShadow: `0 0 8px ${previewColor.glow}` }}
              />
              <span className="text-xs font-medium" style={{ color: "#7a6030" }}>
                {previewColor.name}
                {showColorPicker && hasChanged && (
                  <span className="ml-1.5" style={{ color: GOLD_DIM }}>(not confirmed)</span>
                )}
              </span>
            </div>

            {/* Color Picker Panel */}
            {showColorPicker && (
              <div
                ref={pickerRef}
                className="mt-4 rounded-xl p-4"
                style={{
                  background: "rgba(8,5,0,0.70)",
                  border: `1px solid ${GOLD_GLOW}0.14)`,
                  boxShadow: `0 0 0 1px ${GOLD_GLOW}0.06)`,
                }}
              >
                <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: "#7a6030" }}>
                  Pick a Color
                </p>

                <div className="grid grid-cols-5 gap-3 mb-4">
                  {SNAKE_COLORS.map((c) => {
                    const isSel = pendingColorId === c.id;
                    return (
                      <button
                        key={c.id}
                        title={c.name}
                        onClick={(e) => { e.stopPropagation(); setPendingColorId(c.id); }}
                        className="relative flex flex-col items-center gap-1.5 focus:outline-none"
                      >
                        <div
                          className="w-9 h-9 rounded-full transition-all duration-200 relative"
                          style={{
                            background: c.color,
                            boxShadow: isSel
                              ? `0 0 0 3px rgba(255,255,255,0.9), 0 0 16px ${c.glow}`
                              : `0 0 8px ${c.glow}55`,
                            transform: isSel ? "scale(1.2)" : "scale(1)",
                          }}
                        >
                          {isSel && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.65)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <span
                          className="text-[9px] font-medium leading-tight text-center"
                          style={{ color: isSel ? c.color : "#7a6030", maxWidth: "48px" }}
                        >
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Confirm / Cancel */}
                <div className="flex gap-3 mt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); cancelColor(); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${GOLD_GLOW}0.14)`,
                      color: "#7a6030",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); confirmColor(); }}
                    disabled={!hasChanged}
                    className="px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
                    style={{
                      flex: 2,
                      background: hasChanged
                        ? `linear-gradient(135deg, ${GOLD_DEEP}, ${GOLD_DIM} 50%, ${GOLD})`
                        : "rgba(255,255,255,0.05)",
                      border: hasChanged ? `1px solid ${GOLD_GLOW}0.6)` : `1px solid ${GOLD_GLOW}0.1)`,
                      color: hasChanged ? "#1a0e00" : "#4b4030",
                      fontWeight: 900,
                      boxShadow: hasChanged ? `0 0 20px ${GOLD_GLOW}0.45)` : "none",
                      cursor: hasChanged ? "pointer" : "not-allowed",
                      textShadow: hasChanged ? "0 1px 2px rgba(0,0,0,0.25)" : "none",
                    }}
                  >
                    ✓ Confirm Color
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ---- Leaderboard ---- */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <h3
                  className="font-black uppercase tracking-wider text-base"
                  style={{ color: "#fff", textShadow: `0 0 12px ${GOLD_GLOW}0.3)` }}
                >
                  Leaderboard
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="live-dot w-2.5 h-2.5 rounded-full" style={{ background: GOLD }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>LIVE</span>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { rank: 1, name: "Demo2", amount: "$32,424", rankColor: GOLD },
                { rank: 2, name: "Demo3", amount: "$12,100", rankColor: "#94a3b8" },
              ].map((player) => (
                <div
                  key={player.rank}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{
                    background: `${GOLD_GLOW}0.04)`,
                    border: `1px solid ${GOLD_GLOW}0.1)`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="font-black text-base w-6 text-center"
                      style={{ color: player.rankColor, textShadow: `0 0 10px ${player.rankColor}99` }}
                    >
                      {player.rank}
                    </span>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${GOLD_GLOW}0.28), rgba(217,119,6,0.22))`,
                        border: `1px solid ${GOLD_GLOW}0.38)`,
                        color: GOLD,
                      }}
                    >
                      {player.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-white font-semibold text-sm">{player.name}</span>
                  </div>
                  <span
                    className="font-black text-base"
                    style={{ color: GOLD, textShadow: `0 0 10px ${GOLD_GLOW}0.45)` }}
                  >
                    {player.amount}
                  </span>
                </div>
              ))}
            </div>

            <button
              className="w-full mt-4 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-200"
              style={{
                background: `${GOLD_GLOW}0.07)`,
                border: `1px solid ${GOLD_GLOW}0.25)`,
                color: GOLD_DIM,
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLElement;
                b.style.background = `${GOLD_GLOW}0.16)`;
                b.style.boxShadow = `0 0 20px ${GOLD_GLOW}0.25)`;
                b.style.color = GOLD;
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLElement;
                b.style.background = `${GOLD_GLOW}0.07)`;
                b.style.boxShadow = "none";
                b.style.color = GOLD_DIM;
              }}
            >
              View Full Leaderboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
