import { useRef, useEffect } from "react";
import type { LBPlayer } from "@/hooks/useSimulation";

const GOLD      = "#fbbf24";
const GOLD_DIM  = "#f59e0b";
const GOLD_GLOW = "rgba(251,191,36,";
const SILVER    = "#94a3b8";
const BRONZE    = "#cd7f32";

interface Props {
  players: LBPlayer[];
  userSaldo: number;
  userRank: number;
  username?: string;
}

function formatRp(v: number) {
  return "Rp" + v.toLocaleString("id-ID");
}

function rankColor(rank: number) {
  if (rank === 1) return GOLD;
  if (rank === 2) return SILVER;
  if (rank === 3) return BRONZE;
  return "#ffffff99";
}

function rankGlow(rank: number) {
  if (rank === 1) return `0 0 18px ${GOLD_GLOW}0.65)`;
  if (rank === 2) return `0 0 14px rgba(148,163,184,0.5)`;
  if (rank === 3) return `0 0 14px rgba(205,127,50,0.5)`;
  return "none";
}

function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

export default function Leaderboard({ players, userSaldo, userRank, username }: Props) {
  const userRowRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to user row on mount
  useEffect(() => {
    if (userRowRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const row = userRowRef.current;
      const offset = row.offsetTop - container.clientHeight / 2 + row.clientHeight / 2;
      container.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
    }
  }, []);

  return (
    <div className="glass-card rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <h3
            className="font-black uppercase tracking-wider text-base"
            style={{ color: "#fff", textShadow: `0 0 12px ${GOLD_GLOW}0.3)` }}
          >
            Papan Peringkat
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="live-dot w-2.5 h-2.5 rounded-full"
            style={{ background: GOLD }}
          />
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: GOLD }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* User rank banner */}
      {username && (
        <div
          className="flex items-center justify-between rounded-xl px-4 py-2.5 mb-3"
          style={{
            background: `${GOLD_GLOW}0.08)`,
            border: `1.5px solid ${GOLD_GLOW}0.55)`,
            boxShadow: `0 0 16px ${GOLD_GLOW}0.18)`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD_DIM }}>
              Peringkat kamu
            </span>
          </div>
          <span
            className="font-black text-xl"
            style={{ color: GOLD, textShadow: `0 0 14px ${GOLD_GLOW}0.65)` }}
          >
            #{userRank}
          </span>
        </div>
      )}

      {/* Scrollable list */}
      <div
        ref={scrollRef}
        className="space-y-2 overflow-y-auto pr-1"
        style={{ maxHeight: "480px" }}
      >
        {players.map((player, idx) => {
          const rank = idx + 1;
          const isTop3 = rank <= 3;
          const isUser = username && player.name === username;
          const rc = rankColor(rank);
          const badge = rankBadge(rank);

          return (
            <div
              key={player.id}
              ref={isUser ? userRowRef : undefined}
              className="flex items-center justify-between rounded-xl px-4 py-2.5 transition-all duration-300"
              style={{
                background: isTop3
                  ? `${GOLD_GLOW}0.07)`
                  : isUser
                  ? `rgba(251,191,36,0.06)`
                  : `rgba(255,255,255,0.02)`,
                border: isUser
                  ? `1.5px solid ${GOLD_GLOW}0.6)`
                  : isTop3
                  ? `1px solid ${GOLD_GLOW}0.22)`
                  : `1px solid rgba(255,255,255,0.05)`,
                boxShadow: isTop3 ? rankGlow(rank) : isUser ? `0 0 14px ${GOLD_GLOW}0.22)` : "none",
              }}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <span
                  className="font-black text-sm w-6 text-center shrink-0"
                  style={{ color: rc, textShadow: isTop3 ? `0 0 8px ${rc}99` : "none" }}
                >
                  {badge ?? rank}
                </span>

                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: isTop3
                      ? `linear-gradient(135deg, ${GOLD_GLOW}0.38), rgba(217,119,6,0.28))`
                      : `rgba(255,255,255,0.06)`,
                    border: isTop3 ? `1px solid ${GOLD_GLOW}0.45)` : `1px solid rgba(255,255,255,0.1)`,
                    color: isTop3 ? GOLD : "#94a3b8",
                  }}
                >
                  {player.name.slice(0, 2).toUpperCase()}
                </div>

                {/* Name */}
                <span
                  className="font-semibold text-sm truncate max-w-[120px]"
                  style={{
                    color: isUser ? GOLD : isTop3 ? "#fff" : "#cbd5e1",
                    textShadow: isTop3 ? `0 0 8px ${GOLD_GLOW}0.2)` : "none",
                  }}
                >
                  {player.name}
                  {player.isDrama && (
                    <span className="ml-1 text-[9px] font-bold" style={{ color: "#4ade80" }}>▲</span>
                  )}
                  {isUser && (
                    <span className="ml-1 text-[10px] font-black" style={{ color: GOLD_DIM }}>(Kamu)</span>
                  )}
                </span>
              </div>

              {/* Saldo */}
              <span
                className="font-black text-sm shrink-0"
                style={{
                  color: isTop3 ? GOLD : "#e2e8f0",
                  textShadow: isTop3 ? `0 0 10px ${GOLD_GLOW}0.5)` : "none",
                }}
              >
                {formatRp(player.saldo)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="mt-4 pt-3 flex items-center justify-center gap-2"
        style={{ borderTop: `1px solid ${GOLD_GLOW}0.1)` }}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7a6030" }}>
          100 Pemain Teratas
        </span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />
      </div>
    </div>
  );
}
