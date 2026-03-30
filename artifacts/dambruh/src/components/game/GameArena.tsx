import { useEffect, useRef, useState, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
interface Vec2 { x: number; y: number; }
interface Snake {
  id: string; name: string;
  pos: Vec2[]; // pos[0] = head
  angle: number; color: string;
  betAmount: number; saldo: number;
  alive: boolean; isPlayer: boolean; boosting: boolean;
  winProgress: number; winTimer: number;
  zoneWarning: number;
  tgtAngle: number; tgtTimer: number; botBoostTimer: number;
}
interface Bubble {
  id: string; pos: Vec2; vel: Vec2;
  value: number; r: number; life: number; maxLife: number;
}
interface GState {
  snakes: Snake[]; bubbles: Bubble[];
  zoneR: number; elapsed: number;
  status: "playing" | "win" | "lose";
  winEarnings: number;
}

// ── Constants ────────────────────────────────────────────────────────────────
const WORLD = 2000;
const ZC: Vec2 = { x: 1000, y: 1000 };
const ZONE_START = 860; const ZONE_END = 160; const ZONE_MS = 120_000;
const SPD = 0.17; const BOOST_SPD = 0.34;
const TURN = 0.007;
const WIN_MS = 8000; const ENEMY_R = 130;
const SEG_SPACE = 9; const MAX_SEG = 28;
const SR = 13; // snake radius (world units)
const BOT_NAMES = ["Budi","Sari","Andi","Dewi","Rizky","Putri","Hadi","Nina","Fajar"];
const BOT_COLORS = ["#ff4455","#44ff88","#4499ff","#ff44ff","#ffaa44","#44ffff","#aa44ff","#ff8844","#88ff44"];
const BUBBLE_LIFE = 12000;

// ── Math helpers ─────────────────────────────────────────────────────────────
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const ang = (a: Vec2, b: Vec2) => Math.atan2(b.y - a.y, b.x - a.x);
function normAngle(a: number) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
function turnToward(cur: number, tgt: number, max: number) {
  const d = normAngle(tgt - cur);
  return cur + Math.sign(d) * Math.min(Math.abs(d), max);
}

// ── Game init ─────────────────────────────────────────────────────────────────
function mkSnake(id: string, name: string, x: number, y: number, a: number, color: string, bet: number, saldo: number, isPlayer: boolean): Snake {
  const pos: Vec2[] = [];
  for (let i = 0; i < 16; i++) pos.push({ x: x - Math.cos(a) * i * SEG_SPACE, y: y - Math.sin(a) * i * SEG_SPACE });
  return { id, name, pos, angle: a, color, betAmount: bet, saldo, alive: true, isPlayer, boosting: false, winProgress: 0, winTimer: 0, zoneWarning: 0, tgtAngle: a, tgtTimer: 0, botBoostTimer: 0 };
}
function initState(username: string, betAmount: number, playerSaldo: number, playerColor: string): GState {
  const snakes: Snake[] = [];
  const pa = Math.random() * Math.PI * 2;
  snakes.push(mkSnake("player", username, ZC.x + Math.cos(pa) * 120, ZC.y + Math.sin(pa) * 120, pa + Math.PI, playerColor, betAmount, playerSaldo, true));
  for (let i = 0; i < BOT_NAMES.length; i++) {
    const a = (i / BOT_NAMES.length) * Math.PI * 2;
    const r = 250 + Math.random() * 400;
    snakes.push(mkSnake(`b${i}`, BOT_NAMES[i], ZC.x + Math.cos(a) * r, ZC.y + Math.sin(a) * r, a + Math.PI + (Math.random() - 0.5), BOT_COLORS[i], betAmount, betAmount * (4 + Math.floor(Math.random() * 16)), false));
  }
  return { snakes, bubbles: [], zoneR: ZONE_START, elapsed: 0, status: "playing", winEarnings: 0 };
}

// ── Kill + drop bubbles ───────────────────────────────────────────────────────
function killSnake(s: Snake, state: GState) {
  s.alive = false;
  const drop = s.betAmount * 0.8;
  const cnt = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < cnt; i++) {
    const a = (i / cnt) * Math.PI * 2 + (Math.random() - 0.5);
    const spd = 0.07 + Math.random() * 0.14;
    state.bubbles.push({ id: `bbl${Date.now()}${i}`, pos: { ...s.pos[0] }, vel: { x: Math.cos(a) * spd, y: Math.sin(a) * spd }, value: Math.round(drop / cnt), r: 9 + Math.floor(drop / cnt / 150), life: BUBBLE_LIFE, maxLife: BUBBLE_LIFE });
  }
}

// ── Bot AI ────────────────────────────────────────────────────────────────────
function botAI(bot: Snake, state: GState, dt: number) {
  bot.tgtTimer -= dt;
  bot.botBoostTimer -= dt;
  if (bot.botBoostTimer <= 0) { bot.boosting = Math.random() < 0.15; bot.botBoostTimer = 1200 + Math.random() * 2000; }
  if (bot.tgtTimer <= 0) {
    bot.tgtTimer = 900 + Math.random() * 1800;
    const sr = state.zoneR * 0.78;
    bot.tgtAngle = ang(bot.pos[0], { x: ZC.x + (Math.random() - 0.5) * sr * 2, y: ZC.y + (Math.random() - 0.5) * sr * 2 });
  }
  if (dist(bot.pos[0], ZC) > state.zoneR * 0.82) { bot.tgtAngle = ang(bot.pos[0], ZC); bot.tgtTimer = 600; }
  for (const b of state.bubbles) { if (dist(bot.pos[0], b.pos) < 180) { bot.tgtAngle = ang(bot.pos[0], b.pos); bot.tgtTimer = 500; break; } }
}

// ── Move snake ────────────────────────────────────────────────────────────────
function moveSnake(s: Snake, dt: number, tgtA: number, boost: boolean) {
  s.angle = turnToward(s.angle, tgtA, TURN * dt * 4);
  const spd = boost ? BOOST_SPD : SPD;
  const newHead: Vec2 = { x: s.pos[0].x + Math.cos(s.angle) * spd * dt, y: s.pos[0].y + Math.sin(s.angle) * spd * dt };
  if (s.pos.length < 2 || dist(newHead, s.pos[1]) >= SEG_SPACE) {
    s.pos.unshift(newHead);
    if (s.pos.length > MAX_SEG) s.pos.splice(MAX_SEG);
  } else { s.pos[0] = newHead; }
  s.boosting = boost;
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(state: GState, dt: number, mouseW: Vec2, boost: boolean) {
  if (state.status !== "playing") return;
  state.elapsed += dt;
  state.zoneR = ZONE_START + (ZONE_END - ZONE_START) * Math.min(1, state.elapsed / ZONE_MS);

  const player = state.snakes.find((s) => s.isPlayer && s.alive);

  for (const s of state.snakes) {
    if (!s.alive) continue;
    if (s.isPlayer) {
      moveSnake(s, dt, ang(s.pos[0], mouseW), boost);
    } else {
      botAI(s, state, dt);
      moveSnake(s, dt, s.tgtAngle, s.boosting);
    }
    // Zone damage
    if (dist(s.pos[0], ZC) > state.zoneR) {
      s.zoneWarning += dt;
      if (s.zoneWarning >= 1800) killSnake(s, state);
    } else { s.zoneWarning = 0; }
  }

  // Win circle
  if (player) {
    const enemyNear = state.snakes.some((s) => !s.isPlayer && s.alive && dist(s.pos[0], player.pos[0]) < ENEMY_R);
    if (player.boosting || enemyNear) { player.winProgress = 0; player.winTimer = 0; }
    else { player.winTimer += dt; player.winProgress = Math.min(1, player.winTimer / WIN_MS); }
    if (player.winProgress >= 1) { state.status = "win"; state.winEarnings = player.saldo + Math.round(player.betAmount * 1.8); return; }
  }

  // Collision: player head vs bot bodies/heads
  if (player) {
    const ph = player.pos[0];
    for (const bot of state.snakes) {
      if (!bot.alive || bot.isPlayer) continue;
      if (dist(ph, bot.pos[0]) < SR * 1.8) { killSnake(player, state); break; }
      for (let i = 3; i < bot.pos.length; i++) {
        if (dist(ph, bot.pos[i]) < SR * 1.4) { killSnake(player, state); break; }
      }
      if (!player.alive) break;
    }
  }

  // Collision: bot head vs player body
  if (player?.alive) {
    for (const bot of state.snakes) {
      if (!bot.alive || bot.isPlayer) continue;
      for (let i = 3; i < player.pos.length; i++) {
        if (dist(bot.pos[0], player.pos[i]) < SR * 1.4) { killSnake(bot, state); if (player.alive) player.saldo += Math.round(bot.betAmount * 0.15); break; }
      }
    }
  }

  // Update bubbles
  for (const b of state.bubbles) {
    b.pos.x += b.vel.x * dt; b.pos.y += b.vel.y * dt;
    b.vel.x *= Math.pow(0.992, dt / 16); b.vel.y *= Math.pow(0.992, dt / 16);
    b.life -= dt;
  }
  state.bubbles = state.bubbles.filter((b) => b.life > 0);

  // Player collects bubbles
  if (player?.alive) {
    for (let i = state.bubbles.length - 1; i >= 0; i--) {
      if (dist(player.pos[0], state.bubbles[i].pos) < SR + state.bubbles[i].r) {
        player.saldo += state.bubbles[i].value;
        state.bubbles.splice(i, 1);
      }
    }
  }

  // Last alive wins
  const aliveAll = state.snakes.filter((s) => s.alive);
  if (aliveAll.length === 1 && aliveAll[0].isPlayer) { state.status = "win"; state.winEarnings = (player?.saldo ?? 0) + Math.round((player?.betAmount ?? 0) * 2); }
  else if (!player?.alive) state.status = "lose";
}

// ── Render ────────────────────────────────────────────────────────────────────
function render(canvas: HTMLCanvasElement, state: GState) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const scale = Math.min(W, H) / 820;

  const player = state.snakes.find((s) => s.isPlayer) ?? state.snakes[0];
  const camX = player.pos[0].x - W / 2 / scale;
  const camY = player.pos[0].y - H / 2 / scale;
  const sx = (wx: number) => (wx - camX) * scale;
  const sy = (wy: number) => (wy - camY) * scale;

  // Background
  ctx.fillStyle = "#080400";
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = "rgba(251,191,36,0.045)";
  ctx.lineWidth = 1;
  const gs = 60 * scale;
  const ox = ((-camX * scale) % gs + gs) % gs;
  const oy = ((-camY * scale) % gs + gs) % gs;
  for (let x = ox - gs; x < W + gs; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = oy - gs; y < H + gs; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Zone
  const zsx = sx(ZC.x), zsy = sy(ZC.y), zsr = state.zoneR * scale;
  // Safe zone glow border
  ctx.save();
  ctx.shadowBlur = 18 * scale; ctx.shadowColor = "rgba(251,191,36,0.6)";
  ctx.strokeStyle = "rgba(251,191,36,0.7)"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(zsx, zsy, zsr, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  // Dark overlay outside zone
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(zsx, zsy, zsr, 0, Math.PI * 2, true);
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fill("evenodd");
  ctx.restore();

  // Bubbles
  for (const b of state.bubbles) {
    const bsx = sx(b.pos.x), bsy = sy(b.pos.y), br = b.r * scale;
    const alpha = Math.min(1, b.life / (b.maxLife * 0.3));
    ctx.save();
    ctx.shadowBlur = 14 * scale; ctx.shadowColor = `rgba(251,191,36,${alpha * 0.8})`;
    ctx.beginPath(); ctx.arc(bsx, bsy, br, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(251,191,36,${alpha * 0.85})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`; ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    // Value text
    if (br > 7) {
      ctx.font = `bold ${Math.max(7, br * 0.9)}px Inter,sans-serif`;
      ctx.fillStyle = `rgba(13,9,0,${alpha})`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(b.value >= 1000 ? `${(b.value / 1000).toFixed(0)}k` : `${b.value}`, bsx, bsy);
    }
  }

  // Snakes
  for (const s of state.snakes) {
    if (!s.alive) continue;
    if (s.pos.length < 2) continue;
    const r = SR * scale;

    // Body
    ctx.save();
    ctx.shadowBlur = s.boosting ? 22 * scale : 12 * scale;
    ctx.shadowColor = s.color + (s.boosting ? "dd" : "88");
    ctx.strokeStyle = s.color;
    ctx.lineWidth = r * 1.9;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(sx(s.pos[0].x), sy(s.pos[0].y));
    for (let i = 1; i < s.pos.length; i++) ctx.lineTo(sx(s.pos[i].x), sy(s.pos[i].y));
    ctx.stroke();
    ctx.restore();

    // Head
    const hx = sx(s.pos[0].x), hy = sy(s.pos[0].y);
    ctx.save();
    ctx.shadowBlur = 16 * scale; ctx.shadowColor = s.color;
    ctx.fillStyle = s.color;
    ctx.beginPath(); ctx.arc(hx, hy, r * 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Eyes
    const ea = s.angle + 0.5, ea2 = s.angle - 0.5, er = r * 0.35;
    [[ea, ea2]].flat().forEach((eyeA) => {
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(hx + Math.cos(eyeA) * r * 0.62, hy + Math.sin(eyeA) * r * 0.62, er, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(hx + Math.cos(eyeA) * r * 0.62 + Math.cos(s.angle) * er * 0.4, hy + Math.sin(eyeA) * r * 0.62 + Math.sin(s.angle) * er * 0.4, er * 0.55, 0, Math.PI * 2); ctx.fill();
    });

    // Name + saldo above head
    const labelY = hy - r * 3.5;
    ctx.font = `bold ${Math.max(9, 11 * scale)}px Inter,sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = s.isPlayer ? "#fbbf24" : "rgba(255,255,255,0.7)";
    const saldoStr = s.saldo >= 1000 ? `Rp${(s.saldo / 1000).toFixed(0)}rb` : `Rp${s.saldo}`;
    ctx.fillText(`${s.name} · ${saldoStr}`, hx, labelY);

    // Win progress circle (player only)
    if (s.isPlayer && s.winProgress > 0) {
      const cr = r * 2.2, cy2 = hy - r * 5.5;
      ctx.save();
      // Background
      ctx.beginPath(); ctx.arc(hx, cy2, cr, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fill();
      ctx.strokeStyle = "rgba(251,191,36,0.25)"; ctx.lineWidth = 2; ctx.stroke();
      // Progress arc
      ctx.shadowBlur = 12 * scale; ctx.shadowColor = "#fbbf24";
      ctx.strokeStyle = s.winProgress > 0.9 ? "#fff" : "#fbbf24";
      ctx.lineWidth = cr * 0.45;
      ctx.beginPath();
      ctx.arc(hx, cy2, cr * 0.68, -Math.PI / 2, -Math.PI / 2 + s.winProgress * Math.PI * 2);
      ctx.stroke();
      // Percent text
      ctx.font = `bold ${Math.max(7, cr * 0.65)}px Inter,sans-serif`;
      ctx.fillStyle = s.winProgress > 0.9 ? "#fff" : "#fbbf24";
      ctx.shadowBlur = 0;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`${Math.round(s.winProgress * 100)}%`, hx, cy2);
      ctx.restore();
    }

    // Zone warning flash
    if (s.isPlayer && s.zoneWarning > 0) {
      const flashAlpha = (Math.sin(Date.now() / 120) * 0.5 + 0.5) * 0.4;
      ctx.fillStyle = `rgba(239,68,68,${flashAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  username: string;
  playerColor: string;
  betAmount: number;
  playerSaldo: number;
  onGameEnd: (result: { won: boolean; earnings: number }) => void;
}

export default function GameArena({ username, playerColor, betAmount, playerSaldo, onGameEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GState>(initState(username, betAmount, playerSaldo, playerColor));
  const mouseRef = useRef<Vec2>({ x: 1000, y: 1000 });
  const boostRef = useRef(false);
  const rafRef = useRef(0);
  const lastTRef = useRef(0);

  const [hud, setHud] = useState({ saldo: playerSaldo, alive: 10, winPct: 0, status: "playing" as GState["status"] });
  const [boosting, setBoosting] = useState(false);

  const setBoost = useCallback((v: boolean) => { boostRef.current = v; setBoosting(v); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (cx: number, cy: number) => {
      const s = stateRef.current;
      const scale = Math.min(canvas.width, canvas.height) / 820;
      const player = s.snakes.find((sn) => sn.isPlayer);
      if (!player) return;
      mouseRef.current = {
        x: player.pos[0].x + (cx - canvas.width / 2) / scale,
        y: player.pos[0].y + (cy - canvas.height / 2) / scale,
      };
    };
    const onMM = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTM = (e: TouchEvent) => { if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY); };

    window.addEventListener("mousemove", onMM);
    canvas.addEventListener("touchmove", onTM, { passive: true });

    let hudT = 0;
    const loop = (ts: number) => {
      const dt = Math.min(ts - (lastTRef.current || ts), 50);
      lastTRef.current = ts;
      update(stateRef.current, dt, mouseRef.current, boostRef.current);
      render(canvas, stateRef.current);
      hudT += dt;
      if (hudT > 80) {
        hudT = 0;
        const p = stateRef.current.snakes.find((s) => s.isPlayer);
        const alive = stateRef.current.snakes.filter((s) => s.alive).length;
        const st = stateRef.current.status;
        setHud({ saldo: p?.saldo ?? 0, alive, winPct: Math.round((p?.winProgress ?? 0) * 100), status: st });
        if (st !== "playing") { cancelAnimationFrame(rafRef.current); return; }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMM);
      canvas.removeEventListener("touchmove", onTM);
    };
  }, []);

  const GOLD = "#fbbf24"; const GOLD_GLOW = "rgba(251,191,36,";

  return (
    <div className="fixed inset-0" style={{ zIndex: 50, background: "#080400" }}>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ touchAction: "none" }} />

      {/* HUD top-left */}
      <div className="absolute top-4 left-4 flex flex-col gap-2" style={{ zIndex: 10 }}>
        <div className="rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2" style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${GOLD_GLOW}0.25)`, color: GOLD }}>
          <span style={{ color: "#7a6030", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Saldo</span>
          <span style={{ textShadow: `0 0 10px ${GOLD_GLOW}0.6)` }}>
            {hud.saldo >= 1000 ? `Rp${(hud.saldo / 1000).toFixed(1)}rb` : `Rp${hud.saldo}`}
          </span>
        </div>
        <div className="rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-2" style={{ background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.1)", color: "#ccc" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
          {hud.alive} pemain tersisa
        </div>
      </div>

      {/* Win circle HUD */}
      {hud.winPct > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2" style={{ zIndex: 10 }}>
          <div className="flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-sm" style={{ background: "rgba(0,0,0,0.75)", border: `1px solid ${GOLD_GLOW}${hud.winPct > 80 ? "0.7" : "0.25"})`, color: GOLD, boxShadow: hud.winPct > 80 ? `0 0 20px ${GOLD_GLOW}0.5)` : "none" }}>
            <span style={{ color: "#7a6030", fontSize: 10, textTransform: "uppercase" }}>Lingkaran Menang</span>
            <span style={{ fontSize: 16 }}>{hud.winPct}%</span>
          </div>
        </div>
      )}

      {/* Boost button */}
      <button
        className="absolute bottom-8 right-6 w-20 h-20 rounded-full flex items-center justify-center font-black text-sm uppercase tracking-wider select-none transition-all"
        style={{
          background: boosting ? `linear-gradient(135deg,#d97706,#fbbf24)` : "rgba(0,0,0,0.7)",
          border: `2px solid ${GOLD_GLOW}${boosting ? "0.9" : "0.35"})`,
          color: boosting ? "#1a0e00" : GOLD,
          boxShadow: boosting ? `0 0 30px ${GOLD_GLOW}0.7)` : `0 0 12px ${GOLD_GLOW}0.2)`,
          zIndex: 10, touchAction: "none",
        }}
        onMouseDown={() => setBoost(true)}
        onMouseUp={() => setBoost(false)}
        onMouseLeave={() => setBoost(false)}
        onTouchStart={(e) => { e.preventDefault(); setBoost(true); }}
        onTouchEnd={() => setBoost(false)}
      >
        ⚡<br />Boost
      </button>

      {/* Boost warning */}
      {boosting && (
        <div className="absolute bottom-32 right-6 text-xs font-bold text-center" style={{ color: "#f59e0b", zIndex: 10 }}>
          Lingkaran<br />reset!
        </div>
      )}

      {/* Win screen */}
      {hud.status === "win" && (
        <EndScreen
          won
          earnings={stateRef.current.winEarnings}
          onClose={() => onGameEnd({ won: true, earnings: stateRef.current.winEarnings })}
        />
      )}

      {/* Lose screen */}
      {hud.status === "lose" && (
        <EndScreen
          won={false}
          earnings={stateRef.current.snakes.find((s) => s.isPlayer)?.saldo ?? 0}
          onClose={() => onGameEnd({ won: false, earnings: stateRef.current.snakes.find((s) => s.isPlayer)?.saldo ?? 0 })}
        />
      )}
    </div>
  );
}

function EndScreen({ won, earnings, onClose }: { won: boolean; earnings: number; onClose: () => void }) {
  const GOLD = "#fbbf24"; const GOLD_GLOW = "rgba(251,191,36,";
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.82)", zIndex: 20, backdropFilter: "blur(8px)" }}>
      <div
        className="flex flex-col items-center gap-5 rounded-2xl p-8 text-center"
        style={{ background: "rgba(13,9,0,0.95)", border: `1px solid ${won ? GOLD_GLOW + "0.4)" : "rgba(239,68,68,0.4)"}`, boxShadow: won ? `0 0 50px ${GOLD_GLOW}0.25)` : "0 0 50px rgba(239,68,68,0.2)" }}
      >
        <div style={{ fontSize: "3.5rem" }}>{won ? "🏆" : "💀"}</div>
        <h2 className="font-black text-3xl uppercase tracking-widest" style={{ color: won ? GOLD : "#f87171", textShadow: won ? `0 0 20px ${GOLD_GLOW}0.7)` : "0 0 20px rgba(239,68,68,0.7)" }}>
          {won ? "MENANG!" : "KALAH!"}
        </h2>
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-wider" style={{ color: "#7a6030" }}>
            {won ? "Total Kemenangan" : "Bubble Terkumpul"}
          </p>
          <p className="font-black text-2xl" style={{ color: won ? GOLD : "#f87171" }}>
            Rp{earnings.toLocaleString("id-ID")}
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-2 px-10 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all"
          style={{ background: won ? `linear-gradient(135deg,#d97706,#fbbf24)` : "rgba(239,68,68,0.2)", color: won ? "#1a0e00" : "#f87171", border: won ? "none" : "1px solid rgba(239,68,68,0.4)", boxShadow: won ? `0 0 24px ${GOLD_GLOW}0.5)` : "none" }}
        >
          Kembali ke Lobby
        </button>
      </div>
    </div>
  );
}
