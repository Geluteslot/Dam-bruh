import { useState } from "react";
import SnakeCanvas from "@/components/SnakeCanvas";

const SERVERS = ["$1", "$5", "$20"];

export default function Landing() {
  const [selectedServer, setSelectedServer] = useState("$5");

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#05030f" }}>
      {/* Animated snake background */}
      <SnakeCanvas />

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none grid-bg"
        style={{ zIndex: 1 }}
      />

      {/* Dark blur overlay to keep UI readable */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: "radial-gradient(ellipse at center, rgba(5,3,15,0.55) 0%, rgba(5,3,15,0.75) 100%)",
          backdropFilter: "blur(1.5px)",
        }}
      />

      {/* Main content */}
      <div className="relative" style={{ zIndex: 3 }}>
        {/* ===== NAVBAR ===== */}
        <nav className="flex items-center justify-between px-6 md:px-12 py-5">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                boxShadow: "0 0 20px rgba(168,85,247,0.5)",
                color: "#fff",
              }}
            >
              D
            </div>
            <span className="font-black text-xl tracking-wider text-white hidden sm:block" style={{ letterSpacing: "0.15em" }}>
              DAMBRUH
            </span>
          </div>

          {/* Login button */}
          <button className="login-btn px-6 py-2 rounded-full text-sm font-semibold tracking-wide">
            Login
          </button>
        </nav>

        {/* ===== HERO ===== */}
        <div className="flex flex-col items-center text-center px-6 pt-10 pb-8">
          <h1
            className="font-black uppercase tracking-widest title-glow"
            style={{
              fontSize: "clamp(3.5rem, 12vw, 8rem)",
              letterSpacing: "0.1em",
              lineHeight: 1,
              color: "#fff",
              textShadow: "0 0 40px #a855f7, 0 0 80px #a855f7",
            }}
          >
            DAMBRUH
          </h1>
          <p
            className="shimmer-text font-bold tracking-[0.3em] uppercase mt-2 text-sm md:text-base"
          >
            SKILL-BASED BETTING
          </p>

          {/* Name field */}
          <div className="flex items-center gap-3 mt-8">
            <input
              type="text"
              value="???"
              disabled
              className="px-5 py-2.5 rounded-xl text-center font-bold tracking-widest text-gray-500 cursor-not-allowed"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                width: "130px",
                fontSize: "1rem",
              }}
            />
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Login to set your name</span>
              <button
                className="text-purple-400 hover:text-purple-300 transition-colors p-1 rounded-lg hover:bg-purple-500/10"
                title="Edit name"
                aria-label="Edit name"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Server selection */}
          <div className="flex items-center gap-3 mt-6">
            {SERVERS.map((server) => (
              <button
                key={server}
                onClick={() => setSelectedServer(server)}
                className={`px-7 py-2.5 rounded-full font-bold text-base tracking-wide border transition-all duration-200 ${
                  selectedServer === server
                    ? "server-btn-selected"
                    : "border-white/10 text-white/50 hover:border-purple-500/40 hover:text-white/80"
                }`}
                style={{
                  background: selectedServer === server ? undefined : "rgba(255,255,255,0.04)",
                }}
              >
                {server}
              </button>
            ))}
          </div>

          {/* JOIN GAME button */}
          <button className="join-btn mt-7 px-12 py-4 rounded-2xl text-white font-black text-xl tracking-wider uppercase">
            ▶ JOIN GAME
          </button>

          {/* Stats */}
          <div className="flex items-center gap-8 md:gap-16 mt-10">
            <div className="text-center">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Players Real-Time Active</p>
              <p
                className="font-black text-4xl md:text-5xl"
                style={{
                  color: "#00ff88",
                  textShadow: "0 0 20px rgba(0,255,136,0.5)",
                }}
              >
                43
              </p>
            </div>
            <div
              className="w-px h-14 rounded-full"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(168,85,247,0.4), transparent)" }}
            />
            <div className="text-center">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Global Player Winnings</p>
              <p
                className="font-black text-3xl md:text-4xl"
                style={{
                  color: "#a855f7",
                  textShadow: "0 0 20px rgba(168,85,247,0.5)",
                }}
              >
                $1,345,521
              </p>
            </div>
          </div>
        </div>

        {/* ===== BOTTOM CARDS ===== */}
        <div className="px-4 md:px-8 lg:px-16 pb-16 max-w-2xl mx-auto flex flex-col gap-4">

          {/* Wallet Card */}
          <div
            className="glass-card rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Balance</p>
                  <p className="font-black text-2xl text-white" style={{ textShadow: "0 0 15px rgba(168,85,247,0.4)" }}>
                    $5,050
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 secondary-btn py-2.5 rounded-xl text-sm font-semibold">
                Add Balance
              </button>
              <button className="flex-1 green-btn py-2.5 rounded-xl text-sm font-semibold">
                Withdraw
              </button>
            </div>
          </div>

          {/* Customize Card */}
          <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.25)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H5v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10h1.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
                </svg>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider">Customize</p>
                <p className="text-white font-semibold text-sm">Snake Appearance</p>
              </div>
            </div>
            <button className="green-btn px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap">
              Change Appearance
            </button>
          </div>

          {/* Leaderboard Card */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <h3 className="font-black text-white uppercase tracking-wider text-base">Leaderboard</h3>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="live-dot w-2.5 h-2.5 rounded-full"
                  style={{ background: "#00ff88" }}
                />
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "#00ff88" }}
                >
                  LIVE
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { rank: 1, name: "Demo2", amount: "$32,424", color: "#f59e0b" },
                { rank: 2, name: "Demo3", amount: "$12,100", color: "#94a3b8" },
              ].map((player) => (
                <div
                  key={player.rank}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="font-black text-base w-6 text-center"
                      style={{ color: player.color, textShadow: `0 0 10px ${player.color}` }}
                    >
                      {player.rank}
                    </span>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: `linear-gradient(135deg, rgba(168,85,247,0.3), rgba(0,255,136,0.3))`,
                        border: "1px solid rgba(168,85,247,0.4)",
                      }}
                    >
                      {player.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-white font-semibold text-sm">{player.name}</span>
                  </div>
                  <span
                    className="font-black text-base"
                    style={{ color: "#00ff88", textShadow: "0 0 10px rgba(0,255,136,0.4)" }}
                  >
                    {player.amount}
                  </span>
                </div>
              ))}
            </div>

            <button
              className="w-full mt-4 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-200"
              style={{
                background: "rgba(168,85,247,0.08)",
                border: "1px solid rgba(168,85,247,0.25)",
                color: "#a855f7",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(168,85,247,0.18)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(168,85,247,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(168,85,247,0.08)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
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
