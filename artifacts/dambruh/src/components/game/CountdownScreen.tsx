import { useEffect, useState, useRef } from "react";

const GOLD = "#fbbf24";
const GOLD_GLOW = "rgba(251,191,36,";

const BOT_NAMES = ["Budi","Sari","Andi","Dewi","Rizky","Putri","Hadi","Nina","Fajar"];

interface Props {
  username: string;
  selectedBet: string;
  betAmount: number;
  playerSaldo: number;
  onStart: () => void;
}

function fmtSaldo(n: number) {
  if (n >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1000) return `Rp${(n / 1000).toFixed(0)}rb`;
  return `Rp${n}`;
}

export default function CountdownScreen({ username, selectedBet, betAmount, playerSaldo, onStart }: Props) {
  const [count, setCount] = useState(5);
  const [visibleCount, setVisibleCount] = useState(1);

  // Generate bot saldos ONCE (no flicker / re-render changes)
  const botSaldos = useRef<string[]>(
    BOT_NAMES.map(() => fmtSaldo(betAmount * (4 + Math.floor(Math.random() * 16))))
  );

  // Countdown
  useEffect(() => {
    if (count <= 0) { onStart(); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onStart]);

  // Players trickle in one by one every 450 ms (all 10 visible before ~5s)
  useEffect(() => {
    if (visibleCount >= 10) return;
    const t = setTimeout(() => setVisibleCount((v) => Math.min(10, v + 1)), 450);
    return () => clearTimeout(t);
  }, [visibleCount]);

  const allRows = [
    { no: 1, name: username, bet: selectedBet, saldo: fmtSaldo(playerSaldo), isPlayer: true },
    ...BOT_NAMES.map((name, i) => ({
      no: i + 2, name, bet: selectedBet, saldo: botSaldos.current[i], isPlayer: false,
    })),
  ];
  const rows = allRows.slice(0, visibleCount);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-4"
      style={{ background: "#08040090", backdropFilter: "blur(10px)", zIndex: 200 }}
    >
      <style>{`
        @keyframes cntPulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.08);} }
        @keyframes rowIn { from { opacity:0; transform:translateX(-14px); } to { opacity:1; transform:translateX(0); } }
        @keyframes loadingDot { 0%,80%,100%{opacity:0.3} 40%{opacity:1} }
      `}</style>

      {/* Countdown number */}
      <div
        className="font-black text-center"
        style={{
          fontSize: "clamp(5rem,22vw,11rem)",
          color: count <= 2 ? "#ef4444" : GOLD,
          textShadow: count <= 2
            ? "0 0 40px rgba(239,68,68,0.8)"
            : `0 0 40px ${GOLD_GLOW}0.8)`,
          lineHeight: 1,
          animation: "cntPulse 0.85s ease-in-out infinite",
        }}
      >
        {count > 0 ? count : "GO!"}
      </div>

      <p className="text-sm uppercase tracking-widest mt-3 mb-6" style={{ color: "#7a6030" }}>
        Game dimulai dalam...
      </p>

      {/* Player list */}
      <div className="w-full max-w-sm">
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(0,0,0,0.65)", border: `1px solid ${GOLD_GLOW}0.18)` }}>
          {/* Header */}
          <div
            className="grid gap-2 px-4 py-2 text-xs uppercase tracking-wider font-bold"
            style={{ gridTemplateColumns: "2rem 1fr 3.5rem 4.5rem", background: `${GOLD_GLOW}0.08)`, color: "#a08040", borderBottom: `1px solid ${GOLD_GLOW}0.1)` }}
          >
            <span>No</span><span>Nama</span><span>Bet</span><span className="text-right">Saldo</span>
          </div>

          <div className="min-h-[180px]">
            {rows.map((r, idx) => (
              <div
                key={r.no}
                className="grid gap-2 px-4 py-2.5 text-sm"
                style={{
                  gridTemplateColumns: "2rem 1fr 3.5rem 4.5rem",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: r.isPlayer ? `${GOLD_GLOW}0.07)` : "transparent",
                  color: r.isPlayer ? GOLD : "#c8b888",
                  fontWeight: r.isPlayer ? 700 : 400,
                  animation: `rowIn 0.3s ease-out ${idx * 0.02}s both`,
                }}
              >
                <span>{r.no}</span>
                <span>{r.name}{r.isPlayer ? " ★" : ""}</span>
                <span>{r.bet}</span>
                <span className="text-right">{r.saldo}</span>
              </div>
            ))}

            {/* Loading indicator while players haven't all joined */}
            {visibleCount < 10 && (
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="text-xs" style={{ color: "#4a3820" }}>Menunggu pemain</span>
                {[0,1,2].map((i) => (
                  <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, display: "inline-block", animation: `loadingDot 1.2s ease-in-out ${i*0.2}s infinite` }} />
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs mt-3" style={{ color: "#4a3820" }}>
          {visibleCount < 10 ? `${visibleCount}/10 pemain bergabung` : "10 pemain siap •"} Bet: {selectedBet}
        </p>
      </div>
    </div>
  );
}
