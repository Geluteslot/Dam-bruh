import { useEffect, useState } from "react";

const GOLD = "#fbbf24";
const GOLD_GLOW = "rgba(251,191,36,";

const BOT_NAMES = ["Budi", "Sari", "Andi", "Dewi", "Rizky", "Putri", "Hadi", "Nina", "Fajar"];

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

  useEffect(() => {
    if (count <= 0) { onStart(); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onStart]);

  const rows = [
    { no: 1, name: username, bet: selectedBet, saldo: fmtSaldo(playerSaldo), isPlayer: true },
    ...BOT_NAMES.map((name, i) => ({
      no: i + 2,
      name,
      bet: selectedBet,
      saldo: fmtSaldo(betAmount * (4 + Math.floor(Math.random() * 16))),
      isPlayer: false,
    })),
  ];

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-4"
      style={{ background: "#08040080", backdropFilter: "blur(10px)", zIndex: 200 }}
    >
      <style>{`
        @keyframes cntPulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.08);} }
      `}</style>

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

      <div className="w-full max-w-sm">
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(0,0,0,0.6)", border: `1px solid ${GOLD_GLOW}0.18)` }}>
          <div
            className="grid gap-2 px-4 py-2 text-xs uppercase tracking-wider font-bold"
            style={{ gridTemplateColumns: "2rem 1fr 3.5rem 4.5rem", background: `${GOLD_GLOW}0.08)`, color: "#a08040", borderBottom: `1px solid ${GOLD_GLOW}0.1)` }}
          >
            <span>No</span><span>Nama</span><span>Bet</span><span className="text-right">Saldo</span>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {rows.map((r) => (
              <div
                key={r.no}
                className="grid gap-2 px-4 py-2.5 text-sm"
                style={{
                  gridTemplateColumns: "2rem 1fr 3.5rem 4.5rem",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: r.isPlayer ? `${GOLD_GLOW}0.07)` : "transparent",
                  color: r.isPlayer ? GOLD : "#c8b888",
                  fontWeight: r.isPlayer ? 700 : 400,
                }}
              >
                <span>{r.no}</span>
                <span>{r.name}{r.isPlayer ? " ★" : ""}</span>
                <span>{r.bet}</span>
                <span className="text-right">{r.saldo}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-xs mt-3" style={{ color: "#4a3820" }}>
          10 pemain bergabung • Bet: {selectedBet}
        </p>
      </div>
    </div>
  );
}
