import { useState, useEffect, useRef } from "react";
import SnakeCanvas from "@/components/SnakeCanvas";
import SnakePreview from "@/components/SnakePreview";
import { SNAKE_COLORS, DEFAULT_COLOR_ID } from "@/lib/snakeColors";
import { useAuth } from "@/contexts/AuthContext";
import { addTransaction } from "@/lib/transactions";
import { updateBalance } from "@/lib/auth";
import LoginModal from "@/components/modals/LoginModal";
import RegisterModal from "@/components/modals/RegisterModal";
import ForgotPasswordModal from "@/components/modals/ForgotPasswordModal";
import ProfileModal from "@/components/modals/ProfileModal";
import TransactionModal from "@/components/modals/TransactionModal";
import CountdownScreen from "@/components/game/CountdownScreen";
import GameArena from "@/components/game/GameArena";

const BETS = [
  { value: "3rb",  label: "Pemula",       popular: false, premium: false },
  { value: "5rb",  label: null,           popular: false, premium: false },
  { value: "10rb", label: "🔥 Populer",  popular: true,  premium: false },
  { value: "20rb", label: "💰 Hadiah Besar", popular: false, premium: true },
];

const GOLD      = "#fbbf24";
const GOLD_DIM  = "#f59e0b";
const GOLD_DEEP = "#d97706";
const GOLD_GLOW = "rgba(251,191,36,";

type ModalType = "login" | "register" | "forgot" | "profile" | "history" | null;
type GamePhase = "idle" | "countdown" | "playing";

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
  const { user, refresh } = useAuth();
  const [selectedServer, setSelectedServer]   = useState("10rb");
  const [appliedColorId, setAppliedColorId]   = useState(DEFAULT_COLOR_ID);
  const [pendingColorId, setPendingColorId]   = useState(DEFAULT_COLOR_ID);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [modal, setModal]                     = useState<ModalType>(null);
  const [toast, setToast]                     = useState<{ msg: string; type: "win" | "lose" } | null>(null);
  const [gamePhase, setGamePhase]             = useState<GamePhase>("idle");

  // ── Active players (125–999, realistic drift) ──────────────────────────────
  const [activePlayers, setActivePlayers] = useState(() => 125 + Math.floor(Math.random() * 875));
  const activePlayersRef = useRef(activePlayers);
  useEffect(() => {
    activePlayersRef.current = activePlayers;
  }, [activePlayers]);
  useEffect(() => {
    const tick = () => {
      setActivePlayers((prev) => {
        const drift = Math.random() < 0.12
          ? (Math.random() < 0.5 ? -1 : 1) * (10 + Math.floor(Math.random() * 18))
          : (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 4));
        return Math.min(999, Math.max(125, prev + drift));
      });
    };
    const id = setInterval(tick, 2800 + Math.random() * 2400);
    return () => clearInterval(id);
  }, []);

  // ── Total winnings — kelipatan 1.000, natural sesuai volume pemain ──
  // Asumsi: tiap pemain aktif memainkan ~1 game per 30 detik, bet rata-rata 10rb.
  // Dalam 5 detik, ~(players/6) game selesai → winner dapat ~15rb rata-rata.
  // Base per tick ≈ players × 2.500  (satuan rupiah).
  const calcBase = () => {
    const now = new Date();
    const secsToday = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    // Estimasi akumulasi harian dengan 400 pemain rata-rata
    return Math.max(1000, Math.floor(secsToday / 5) * 50) * 1000;
  };
  const [totalWinnings, setTotalWinnings] = useState(calcBase);
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() < 6) {
        setTotalWinnings(1000);
        return;
      }
      // Base natural: jumlah pemain × 2.500 rupiah per tick
      // (mis. 300 pemain → base 750.000, 999 pemain → base ~2.500.000)
      const base = activePlayersRef.current * 2500;
      const roll = Math.random();
      let mult: number;
      if (roll < 0.50) {
        // Kecil: 10% – 50% dari base
        mult = 0.10 + Math.random() * 0.40;
      } else if (roll < 0.82) {
        // Sedang: 60% – 150% dari base
        mult = 0.60 + Math.random() * 0.90;
      } else if (roll < 0.96) {
        // Besar: 200% – 500% dari base
        mult = 2.0 + Math.random() * 3.0;
      } else {
        // Jackpot: 1000% – 3000% dari base
        mult = 10 + Math.random() * 20;
      }
      // Bulatkan ke kelipatan 1.000 terdekat, minimal 1.000
      const inc = Math.max(1000, Math.round((base * mult) / 1000)) * 1000;
      setTotalWinnings((p) => p + inc);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const fmtWinnings = (v: number) =>
    `Rp.${v.toLocaleString("id-ID")}`;

  const pickerRef = useRef<HTMLDivElement>(null);

  const openPicker   = () => { setPendingColorId(appliedColorId); setShowColorPicker(true); };
  const confirmColor = () => { setAppliedColorId(pendingColorId); setShowColorPicker(false); };
  const cancelColor  = () => { setPendingColorId(appliedColorId); setShowColorPicker(false); };

  useOutsideClick(pickerRef, () => { setPendingColorId(appliedColorId); setShowColorPicker(false); });

  const appliedColor = SNAKE_COLORS.find((c) => c.id === appliedColorId) ?? SNAKE_COLORS[0];
  const pendingColor = SNAKE_COLORS.find((c) => c.id === pendingColorId) ?? SNAKE_COLORS[0];
  const hasChanged   = pendingColorId !== appliedColorId;
  const previewColor = showColorPicker ? pendingColor : appliedColor;

  const betAmountMap: Record<string, number> = { "3rb": 3000, "5rb": 5000, "10rb": 10000, "20rb": 20000 };
  const canAffordBet = (betValue: string) => !user || user.balance >= (betAmountMap[betValue] ?? 0);
  const selectedBetAmount = betAmountMap[selectedServer] ?? 10000;
  const isInsufficientFunds = !!user && user.balance < selectedBetAmount;

  const handleJoinGame = () => {
    if (!user) { setModal("login"); return; }
    const bet = betAmountMap[selectedServer] ?? 10000;
    if (user.balance < bet) {
      setToast({ msg: "Saldo tidak mencukupi!", type: "lose" });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    addTransaction({ username: user.username, type: "Masuk Game", amount: -bet, status: "Berhasil" });
    updateBalance(user.username, -bet);
    refresh();
    setGamePhase("countdown");
  };

  const handleGameEnd = ({ won, earnings }: { won: boolean; earnings: number }) => {
    if (!user) return;
    if (won) {
      addTransaction({ username: user.username, type: "Menang", amount: earnings, status: "Berhasil" });
      updateBalance(user.username, earnings);
      refresh();
      setToast({ msg: `Kamu menang! +Rp${earnings.toLocaleString("id-ID")}`, type: "win" });
    } else {
      refresh();
      setToast({ msg: "Kamu kalah! Bubble terkumpul: Rp" + earnings.toLocaleString("id-ID"), type: "lose" });
    }
    setGamePhase("idle");
    setTimeout(() => setToast(null), 4000);
  };

  if (gamePhase === "countdown" && user) {
    return (
      <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#0d0900" }}>
        <SnakeCanvas playerColorId={appliedColorId} />
        <CountdownScreen
          username={user.username}
          selectedBet={selectedServer}
          betAmount={betAmountMap[selectedServer] ?? 10000}
          playerSaldo={user.balance}
          onStart={() => setGamePhase("playing")}
        />
      </div>
    );
  }

  if (gamePhase === "playing" && user) {
    return (
      <GameArena
        username={user.username}
        playerColor={appliedColor.color}
        betAmount={betAmountMap[selectedServer] ?? 10000}
        playerSaldo={user.balance}
        onGameEnd={handleGameEnd}
      />
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#0d0900" }}>
      {/* Modal animations */}
      <style>{`
        @keyframes modalIn { from { opacity: 0; transform: scale(0.93) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <SnakeCanvas playerColorId={appliedColorId} />

      <div className="fixed inset-0 pointer-events-none grid-bg" style={{ zIndex: 1 }} />
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

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl font-bold text-sm z-50 pointer-events-none"
          style={{
            animation: "toastIn 0.3s ease-out",
            background: toast.type === "win" ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
            border: toast.type === "win" ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(239,68,68,0.4)",
            color: toast.type === "win" ? "#4ade80" : "#f87171",
            boxShadow: toast.type === "win" ? "0 0 30px rgba(34,197,94,0.3)" : "0 0 30px rgba(239,68,68,0.3)",
          }}
        >
          {toast.msg}
        </div>
      )}

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

          {/* Auth button */}
          {user ? (
            <button
              onClick={() => setModal("profile")}
              className="w-11 h-11 rounded-full flex items-center justify-center font-black text-lg transition-all duration-200"
              style={{
                background: `linear-gradient(135deg, ${GOLD_DEEP}, ${GOLD})`,
                color: "#1a0e00",
                boxShadow: `0 0 22px ${GOLD_GLOW}0.55), 0 0 8px rgba(0,0,0,0.4)`,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 36px ${GOLD_GLOW}0.8), 0 0 8px rgba(0,0,0,0.4)`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 22px ${GOLD_GLOW}0.55), 0 0 8px rgba(0,0,0,0.4)`; }}
              title={user.username}
            >
              {user.username.slice(0, 1).toUpperCase()}
            </button>
          ) : (
            <button
              onClick={() => setModal("login")}
              className="login-btn px-6 py-2 rounded-full text-sm font-semibold tracking-wide"
            >
              Masuk
            </button>
          )}
        </nav>

        {/* ===== HERO ===== */}
        <div className="flex flex-col items-center text-center px-6 pt-8 pb-8">

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

          <p className="shimmer-text font-bold tracking-[0.3em] uppercase mt-2 text-sm md:text-base">
            SKILL-BASED BETTING
          </p>

          {/* Name field */}
          <div className="flex items-center gap-3 mt-8">
            <input
              type="text"
              value={user ? user.username : "???"}
              disabled
              className="px-5 py-2.5 rounded-xl text-center font-bold tracking-widest cursor-not-allowed"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${GOLD_GLOW}0.15)`,
                color: user ? GOLD : "#6b5a2a",
                width: "130px",
                fontSize: "1rem",
                textShadow: user ? `0 0 10px ${GOLD_GLOW}0.45)` : "none",
              }}
            />
            {!user ? (
              <button
                onClick={() => setModal("login")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200"
                style={{
                  background: `linear-gradient(135deg, ${GOLD_DEEP}33, ${GOLD}22)`,
                  border: `1.5px solid ${GOLD_GLOW}0.55)`,
                  color: GOLD,
                  boxShadow: `0 0 18px ${GOLD_GLOW}0.35), inset 0 0 12px ${GOLD_GLOW}0.08)`,
                  textShadow: `0 0 10px ${GOLD_GLOW}0.6)`,
                  letterSpacing: "0.05em",
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget as HTMLElement;
                  b.style.boxShadow = `0 0 28px ${GOLD_GLOW}0.6), inset 0 0 18px ${GOLD_GLOW}0.14)`;
                  b.style.background = `linear-gradient(135deg, ${GOLD_DEEP}55, ${GOLD}33)`;
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget as HTMLElement;
                  b.style.boxShadow = `0 0 18px ${GOLD_GLOW}0.35), inset 0 0 12px ${GOLD_GLOW}0.08)`;
                  b.style.background = `linear-gradient(135deg, ${GOLD_DEEP}33, ${GOLD}22)`;
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Masuk untuk bermain
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: "#4ade80", boxShadow: "0 0 8px #4ade80" }}
                />
                <span className="text-sm font-semibold" style={{ color: "#4ade80" }}>Online</span>
              </div>
            )}
          </div>

          {/* Bet selection */}
          <div className="flex items-center gap-3 mt-6 flex-wrap justify-center">
            {BETS.map((bet) => {
              const isSelected = selectedServer === bet.value;
              const isPopular  = bet.popular;
              const isPremium  = bet.premium;
              const isLocked   = !canAffordBet(bet.value);
              return (
                <div key={bet.value} className="flex flex-col items-center gap-1">
                  {isLocked ? (
                    <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bet-label-locked">
                      Saldo Kurang
                    </span>
                  ) : bet.label ? (
                    <span className={`text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full ${isPopular ? "bet-label-popular" : "bet-label-premium"}`}>
                      {bet.label}
                    </span>
                  ) : (
                    <span className="text-[10px] opacity-0 select-none">_</span>
                  )}
                  <button
                    onClick={() => setSelectedServer(bet.value)}
                    className={`bet-btn ${
                      isLocked
                        ? isSelected ? "bet-btn-locked-selected" : "bet-btn-locked"
                        : isSelected
                          ? isPopular ? "bet-btn-popular-selected" : isPremium ? "bet-btn-premium-selected" : "bet-btn-selected"
                          : isPopular ? "bet-btn-popular-idle" : isPremium ? "bet-btn-premium-idle" : "bet-btn-idle"
                    }`}
                  >
                    {bet.value}
                  </button>
                </div>
              );
            })}
          </div>

          {/* JOIN GAME */}
          <button
            onClick={handleJoinGame}
            disabled={isInsufficientFunds}
            className={`join-btn mt-7 px-14 py-5 rounded-2xl text-2xl tracking-widest uppercase font-black ${isInsufficientFunds ? "join-btn-disabled" : "join-btn-pulse"}`}
          >
            {isInsufficientFunds ? "⚠ SALDO TIDAK CUKUP" : "▶ MASUK GAME"}
          </button>

          {/* Stats */}
          <div className="flex items-center gap-8 md:gap-16 mt-10">
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#7a6030" }}>
                Pemain Aktif Saat Ini
              </p>
              <p className="font-black text-4xl md:text-5xl" style={{ color: GOLD, textShadow: `0 0 22px ${GOLD_GLOW}0.55), 0 0 50px ${GOLD_GLOW}0.25)` }}>
                {activePlayers}
              </p>
            </div>
            <div className="w-px h-14 rounded-full" style={{ background: `linear-gradient(to bottom, transparent, ${GOLD_GLOW}0.35), transparent)` }} />
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#7a6030" }}>
                Total Kemenangan Global
              </p>
              <p className="font-black text-3xl md:text-4xl" style={{ color: GOLD, textShadow: `0 0 22px ${GOLD_GLOW}0.55), 0 0 50px ${GOLD_GLOW}0.25)` }}>
                {fmtWinnings(totalWinnings)}
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
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${GOLD_GLOW}0.12)`, border: `1px solid ${GOLD_GLOW}0.32)` }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: "#7a6030" }}>Saldo</p>
                  <p className="font-black text-2xl text-white" style={{ textShadow: `0 0 16px ${GOLD_GLOW}0.4)` }}>
                    {user ? `Rp${user.balance.toLocaleString("id-ID")}` : "—"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!user) { setModal("login"); return; }
                  addTransaction({ username: user.username, type: "Deposit", amount: 50000, status: "Berhasil" });
                }}
                className="flex-1 secondary-btn py-2.5 rounded-xl text-sm font-semibold"
              >
                Tambah Saldo
              </button>
              <button
                onClick={() => {
                  if (!user) { setModal("login"); return; }
                  addTransaction({ username: user.username, type: "Tarik Dana", amount: -50000, status: "Pending" });
                }}
                className="flex-1 green-btn py-2.5 rounded-xl text-sm font-semibold"
              >
                Tarik Dana
              </button>
            </div>
          </div>

          {/* ---- Customize ---- */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${GOLD_GLOW}0.1)`, border: `1px solid ${GOLD_GLOW}0.28)` }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H5v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10h1.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: "#7a6030" }}>Kustomisasi</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm">Tampilan Ular</p>
                    <div
                      className="w-3 h-3 rounded-full ring-1"
                      style={{ background: appliedColor.color, boxShadow: `0 0 6px ${appliedColor.glow}` }}
                    />
                  </div>
                </div>
              </div>
              <button className="green-btn px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap" onClick={openPicker}>
                Ganti Tampilan
              </button>
            </div>

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

            <div className="flex items-center justify-center gap-2 mt-2.5">
              <div className="w-2.5 h-2.5 rounded-full transition-all duration-200" style={{ background: previewColor.color, boxShadow: `0 0 8px ${previewColor.glow}` }} />
              <span className="text-xs font-medium" style={{ color: "#7a6030" }}>
                {previewColor.name}
                {showColorPicker && hasChanged && <span className="ml-1.5" style={{ color: GOLD_DIM }}>(belum dikonfirmasi)</span>}
              </span>
            </div>

            {showColorPicker && (
              <div
                ref={pickerRef}
                className="mt-4 rounded-xl p-4"
                style={{ background: "rgba(8,5,0,0.70)", border: `1px solid ${GOLD_GLOW}0.14)`, boxShadow: `0 0 0 1px ${GOLD_GLOW}0.06)` }}
              >
                <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: "#7a6030" }}>Pilih Warna</p>
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
                            boxShadow: isSel ? `0 0 0 3px rgba(255,255,255,0.9), 0 0 16px ${c.glow}` : `0 0 8px ${c.glow}55`,
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
                        <span className="text-[9px] font-medium leading-tight text-center" style={{ color: isSel ? c.color : "#7a6030", maxWidth: "48px" }}>
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 mt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); cancelColor(); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD_GLOW}0.14)`, color: "#7a6030" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); confirmColor(); }}
                    disabled={!hasChanged}
                    className="px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
                    style={{
                      flex: 2,
                      background: hasChanged ? `linear-gradient(135deg, ${GOLD_DEEP}, ${GOLD_DIM} 50%, ${GOLD})` : "rgba(255,255,255,0.05)",
                      border: hasChanged ? `1px solid ${GOLD_GLOW}0.6)` : `1px solid ${GOLD_GLOW}0.1)`,
                      color: hasChanged ? "#1a0e00" : "#4b4030",
                      fontWeight: 900,
                      boxShadow: hasChanged ? `0 0 20px ${GOLD_GLOW}0.45)` : "none",
                      cursor: hasChanged ? "pointer" : "not-allowed",
                    }}
                  >
                    ✓ Konfirmasi Warna
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
                <h3 className="font-black uppercase tracking-wider text-base" style={{ color: "#fff", textShadow: `0 0 12px ${GOLD_GLOW}0.3)` }}>
                  Papan Peringkat
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="live-dot w-2.5 h-2.5 rounded-full" style={{ background: GOLD }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>LIVE</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { rank: 1, name: "Demo2", amount: "Rp32.424", rankColor: GOLD },
                { rank: 2, name: "Demo3", amount: "Rp12.100", rankColor: "#94a3b8" },
              ].map((player) => (
                <div
                  key={player.rank}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: `${GOLD_GLOW}0.04)`, border: `1px solid ${GOLD_GLOW}0.1)` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-black text-base w-6 text-center" style={{ color: player.rankColor, textShadow: `0 0 10px ${player.rankColor}99` }}>
                      {player.rank}
                    </span>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: `linear-gradient(135deg, ${GOLD_GLOW}0.28), rgba(217,119,6,0.22))`, border: `1px solid ${GOLD_GLOW}0.38)`, color: GOLD }}
                    >
                      {player.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-white font-semibold text-sm">{player.name}</span>
                  </div>
                  <span className="font-black text-base" style={{ color: GOLD, textShadow: `0 0 10px ${GOLD_GLOW}0.45)` }}>
                    {player.amount}
                  </span>
                </div>
              ))}
            </div>
            <button
              className="w-full mt-4 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-200"
              style={{ background: `${GOLD_GLOW}0.07)`, border: `1px solid ${GOLD_GLOW}0.25)`, color: GOLD_DIM }}
              onMouseEnter={(e) => { const b = e.currentTarget as HTMLElement; b.style.background = `${GOLD_GLOW}0.16)`; b.style.color = GOLD; }}
              onMouseLeave={(e) => { const b = e.currentTarget as HTMLElement; b.style.background = `${GOLD_GLOW}0.07)`; b.style.color = GOLD_DIM; }}
            >
              Lihat Papan Lengkap
            </button>
          </div>

        </div>
      </div>

      {/* ===== MODALS ===== */}
      {modal === "login" && (
        <LoginModal
          onClose={() => setModal(null)}
          onRegister={() => setModal("register")}
          onForgot={() => setModal("forgot")}
        />
      )}
      {modal === "register" && (
        <RegisterModal
          onClose={() => setModal(null)}
          onLogin={() => setModal("login")}
        />
      )}
      {modal === "forgot" && (
        <ForgotPasswordModal
          onClose={() => setModal(null)}
          onLogin={() => setModal("login")}
        />
      )}
      {modal === "profile" && (
        <ProfileModal
          onClose={() => setModal(null)}
          onHistory={() => setModal("history")}
        />
      )}
      {modal === "history" && (
        <TransactionModal onClose={() => setModal(null)} />
      )}
    </div>
  );
}
