import { useEffect, useRef, useState, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
interface Vec2 { x: number; y: number; }
interface Snake {
  id: string; name: string;
  pos: Vec2[];
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
interface FloatText {
  id: string; wx: number; wy: number;
  text: string; life: number; maxLife: number;
}
interface GState {
  snakes: Snake[]; bubbles: Bubble[]; floats: FloatText[];
  zoneR: number; elapsed: number;
  status: "playing" | "win" | "lose";
  winEarnings: number;
  loseReason: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const WORLD = 2000;
const ZC: Vec2 = { x: 1000, y: 1000 };
const ZONE_START = 860; const ZONE_END = 160; const ZONE_MS = 120_000;
const SPD = 0.17; const BOOST_SPD = 0.34;
const TURN = 0.007;
const WIN_MS = 8000; const ENEMY_R = 130;
const SEG_SPACE = 9; const MAX_SEG = 28;
const SR = 13;
const BOT_NAMES = ["Budi","Sari","Andi","Dewi","Rizky","Putri","Hadi","Nina","Fajar"];
const BOT_COLORS = ["#ff4455","#44ff88","#4499ff","#ff44ff","#ffaa44","#44ffff","#aa44ff","#ff8844","#88ff44"];
const BUBBLE_LIFE = 12000;
const FLOAT_LIFE = 1400;
const GOLD = "#fbbf24";

// ── Math helpers ──────────────────────────────────────────────────────────────
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const ang  = (a: Vec2, b: Vec2) => Math.atan2(b.y - a.y, b.x - a.x);
function normAngle(a: number) { while (a > Math.PI) a -= 2*Math.PI; while (a < -Math.PI) a += 2*Math.PI; return a; }
function turnToward(cur: number, tgt: number, max: number) {
  const d = normAngle(tgt - cur);
  return cur + Math.sign(d) * Math.min(Math.abs(d), max);
}

// ── Init ──────────────────────────────────────────────────────────────────────
function mkSnake(id: string, name: string, x: number, y: number, a: number, color: string, bet: number, saldo: number, isPlayer: boolean): Snake {
  const pos: Vec2[] = [];
  for (let i = 0; i < 16; i++) pos.push({ x: x - Math.cos(a)*i*SEG_SPACE, y: y - Math.sin(a)*i*SEG_SPACE });
  return { id, name, pos, angle: a, color, betAmount: bet, saldo, alive: true, isPlayer, boosting: false, winProgress: 0, winTimer: 0, zoneWarning: 0, tgtAngle: a, tgtTimer: 0, botBoostTimer: 0 };
}
function initState(username: string, bet: number, _saldo: number, color: string): GState {
  const snakes: Snake[] = [];
  const pa = Math.random() * Math.PI * 2;
  snakes.push(mkSnake("player", username, ZC.x + Math.cos(pa)*120, ZC.y + Math.sin(pa)*120, pa + Math.PI, color, bet, bet, true));
  for (let i = 0; i < BOT_NAMES.length; i++) {
    const a = (i / BOT_NAMES.length) * Math.PI * 2;
    const r = 250 + Math.random() * 400;
    snakes.push(mkSnake(`b${i}`, BOT_NAMES[i], ZC.x + Math.cos(a)*r, ZC.y + Math.sin(a)*r, a + Math.PI + (Math.random()-0.5)*0.8, BOT_COLORS[i], bet, bet*(4 + Math.floor(Math.random()*16)), false));
  }
  return { snakes, bubbles: [], floats: [], zoneR: ZONE_START, elapsed: 0, status: "playing", winEarnings: 0, loseReason: "" };
}

// ── Kill + bubble drop ────────────────────────────────────────────────────────
function killSnake(s: Snake, state: GState) {
  s.alive = false;
  const totalDrop = Math.max(1000, Math.round(s.betAmount * 0.8 / 1000) * 1000);
  const cnt = Math.max(3, Math.min(10, Math.floor(totalDrop / 1000)));
  const rawPerBubble = totalDrop / cnt;
  const perBubble = Math.max(500, Math.round(rawPerBubble / 500) * 500);
  for (let i = 0; i < cnt; i++) {
    const a = (i/cnt)*Math.PI*2 + (Math.random()-0.5);
    const spd = 0.07 + Math.random()*0.14;
    state.bubbles.push({ id: `b${Date.now()}${i}`, pos: { ...s.pos[0] }, vel: { x: Math.cos(a)*spd, y: Math.sin(a)*spd }, value: perBubble, r: 9 + Math.floor(perBubble/800), life: BUBBLE_LIFE, maxLife: BUBBLE_LIFE });
  }
}

// ── Bot AI ────────────────────────────────────────────────────────────────────
function botAI(bot: Snake, state: GState, dt: number) {
  bot.tgtTimer -= dt; bot.botBoostTimer -= dt;
  if (bot.botBoostTimer <= 0) { bot.boosting = Math.random() < 0.15; bot.botBoostTimer = 1200 + Math.random()*2000; }
  if (bot.tgtTimer <= 0) {
    bot.tgtTimer = 900 + Math.random()*1800;
    const sr = state.zoneR * 0.78;
    bot.tgtAngle = ang(bot.pos[0], { x: ZC.x + (Math.random()-0.5)*sr*2, y: ZC.y + (Math.random()-0.5)*sr*2 });
  }
  if (dist(bot.pos[0], ZC) > state.zoneR*0.82) { bot.tgtAngle = ang(bot.pos[0], ZC); bot.tgtTimer = 600; }
  for (const b of state.bubbles) { if (dist(bot.pos[0], b.pos) < 180) { bot.tgtAngle = ang(bot.pos[0], b.pos); bot.tgtTimer = 500; break; } }
}

// ── Move ──────────────────────────────────────────────────────────────────────
function moveSnake(s: Snake, dt: number, tgtA: number, boost: boolean) {
  s.angle = turnToward(s.angle, tgtA, TURN*dt*4);
  const newHead: Vec2 = { x: s.pos[0].x + Math.cos(s.angle)*(boost ? BOOST_SPD : SPD)*dt, y: s.pos[0].y + Math.sin(s.angle)*(boost ? BOOST_SPD : SPD)*dt };
  if (s.pos.length < 2 || dist(newHead, s.pos[1]) >= SEG_SPACE) {
    s.pos.unshift(newHead);
    if (s.pos.length > MAX_SEG) s.pos.splice(MAX_SEG);
  } else { s.pos[0] = newHead; }
  s.boosting = boost;
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(state: GState, dt: number, mouseW: Vec2, boost: boolean, cashoutHeld: boolean, joystickDir: Vec2) {
  if (state.status !== "playing") return;
  state.elapsed += dt;
  state.zoneR = ZONE_START + (ZONE_END - ZONE_START) * Math.min(1, state.elapsed / ZONE_MS);

  const player = state.snakes.find((s) => s.isPlayer && s.alive);

  for (const s of state.snakes) {
    if (!s.alive) continue;
    if (s.isPlayer) {
      let tgtA: number;
      const jMag = Math.hypot(joystickDir.x, joystickDir.y);
      if (jMag > 0.1) tgtA = Math.atan2(joystickDir.y, joystickDir.x);
      else tgtA = ang(s.pos[0], mouseW);
      moveSnake(s, dt, tgtA, boost);
    } else {
      botAI(s, state, dt);
      moveSnake(s, dt, s.tgtAngle, s.boosting);
    }
    if (dist(s.pos[0], ZC) > state.zoneR) {
      s.zoneWarning += dt;
      if (s.zoneWarning >= 1800) {
        if (s.isPlayer) state.loseReason = "Kamu terlambat — zona menyempitmu! Harus lebih cepat kembali ke tengah.";
        killSnake(s, state);
      }
    } else { s.zoneWarning = 0; }
  }

  // Win circle
  if (player) {
    const enemyNear = state.snakes.some((s) => !s.isPlayer && s.alive && dist(s.pos[0], player.pos[0]) < ENEMY_R);
    if (!cashoutHeld || boost || enemyNear) { player.winProgress = 0; player.winTimer = 0; }
    else { player.winTimer += dt; player.winProgress = Math.min(1, player.winTimer / WIN_MS); }
    if (player.winProgress >= 1) {
      state.status = "win";
      state.winEarnings = Math.round((player.saldo + player.betAmount * 1.8) / 1000) * 1000;
      return;
    }
  }

  // Collision: player vs bots
  if (player) {
    const ph = player.pos[0];
    for (const bot of state.snakes) {
      if (!bot.alive || bot.isPlayer) continue;
      if (dist(ph, bot.pos[0]) < SR*1.8) {
        state.loseReason = "Kamu bertabrakan langsung dengan musuh! Kurang waspada.";
        killSnake(player, state); break;
      }
      for (let i = 3; i < bot.pos.length; i++) {
        if (dist(ph, bot.pos[i]) < SR*1.4) {
          state.loseReason = "Kamu masuk ke badan musuh — salah posisi!";
          killSnake(player, state); break;
        }
      }
      if (!player.alive) break;
    }
  }

  // Collision: bots vs player body
  if (player?.alive) {
    for (const bot of state.snakes) {
      if (!bot.alive || bot.isPlayer) continue;
      for (let i = 3; i < player.pos.length; i++) {
        if (dist(bot.pos[0], player.pos[i]) < SR*1.4) {
          killSnake(bot, state);
          if (player.alive) {
            const gain = Math.max(1000, Math.round(bot.betAmount * 0.15 / 1000) * 1000);
            player.saldo += gain;
            state.floats.push({ id: `f${Date.now()}`, wx: player.pos[0].x, wy: player.pos[0].y - 30, text: `+Rp${gain.toLocaleString("id-ID")}`, life: FLOAT_LIFE, maxLife: FLOAT_LIFE });
          }
          break;
        }
      }
    }
  }

  // Bubbles
  for (const b of state.bubbles) {
    b.pos.x += b.vel.x*dt; b.pos.y += b.vel.y*dt;
    b.vel.x *= Math.pow(0.992, dt/16); b.vel.y *= Math.pow(0.992, dt/16);
    b.life -= dt;
  }
  state.bubbles = state.bubbles.filter((b) => b.life > 0);

  if (player?.alive) {
    for (let i = state.bubbles.length - 1; i >= 0; i--) {
      if (dist(player.pos[0], state.bubbles[i].pos) < SR + state.bubbles[i].r) {
        const val = state.bubbles[i].value;
        player.saldo += val;
        state.floats.push({ id: `f${Date.now()}${i}`, wx: player.pos[0].x, wy: player.pos[0].y - 20, text: `+Rp${val.toLocaleString("id-ID")}`, life: FLOAT_LIFE, maxLife: FLOAT_LIFE });
        state.bubbles.splice(i, 1);
      }
    }
  }

  for (const f of state.floats) f.life -= dt;
  state.floats = state.floats.filter((f) => f.life > 0);

  const aliveAll = state.snakes.filter((s) => s.alive);
  if (aliveAll.length === 1 && aliveAll[0].isPlayer) { state.status = "win"; state.winEarnings = Math.round(((player?.saldo ?? 0) + (player?.betAmount ?? 0) * 2) / 1000) * 1000; }
  else if (!player?.alive) state.status = "lose";
}

// ── Render ────────────────────────────────────────────────────────────────────
function render(canvas: HTMLCanvasElement, state: GState) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const scale = Math.min(W, H) / 820;
  const player = state.snakes.find((s) => s.isPlayer) ?? state.snakes[0];
  const camX = player.pos[0].x - W/2/scale;
  const camY = player.pos[0].y - H/2/scale;
  const sx = (wx: number) => (wx - camX)*scale;
  const sy = (wy: number) => (wy - camY)*scale;

  ctx.fillStyle = "#080400"; ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(251,191,36,0.04)"; ctx.lineWidth = 1;
  const gs = 60*scale;
  const ox = ((-camX*scale)%gs+gs)%gs, oy = ((-camY*scale)%gs+gs)%gs;
  for (let x = ox-gs; x < W+gs; x += gs) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = oy-gs; y < H+gs; y += gs) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  const zsx = sx(ZC.x), zsy = sy(ZC.y), zsr = state.zoneR*scale;
  ctx.save(); ctx.shadowBlur = 20*scale; ctx.shadowColor = "rgba(251,191,36,0.55)";
  ctx.strokeStyle = "rgba(251,191,36,0.65)"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(zsx, zsy, zsr, 0, Math.PI*2); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,H);
  ctx.arc(zsx, zsy, zsr, 0, Math.PI*2, true);
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fill("evenodd"); ctx.restore();

  for (const b of state.bubbles) {
    const bx = sx(b.pos.x), by = sy(b.pos.y), br = b.r*scale;
    const alpha = Math.min(1, b.life/(b.maxLife*0.3));
    ctx.save(); ctx.shadowBlur = 16*scale; ctx.shadowColor = `rgba(251,191,36,${alpha*0.9})`;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2);
    ctx.fillStyle = `rgba(251,191,36,${alpha*0.82})`; ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${alpha*0.45})`; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
    if (br > 7) {
      ctx.font = `bold ${Math.max(7, br*0.95)}px Inter,sans-serif`;
      ctx.fillStyle = `rgba(13,9,0,${alpha})`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(b.value >= 1000 ? `${(b.value/1000).toFixed(0)}k` : `${b.value}`, bx, by);
    }
  }

  for (const s of state.snakes) {
    if (!s.alive || s.pos.length < 2) continue;
    const r = SR*scale;
    ctx.save(); ctx.shadowBlur = s.boosting ? 22*scale : 12*scale; ctx.shadowColor = s.color + (s.boosting ? "dd" : "88");
    ctx.strokeStyle = s.color; ctx.lineWidth = r*1.9; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(sx(s.pos[0].x), sy(s.pos[0].y));
    for (let i = 1; i < s.pos.length; i++) ctx.lineTo(sx(s.pos[i].x), sy(s.pos[i].y));
    ctx.stroke(); ctx.restore();

    const hx = sx(s.pos[0].x), hy = sy(s.pos[0].y);
    ctx.save(); ctx.shadowBlur = 16*scale; ctx.shadowColor = s.color;
    ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(hx, hy, r*1.1, 0, Math.PI*2); ctx.fill(); ctx.restore();

    for (const eyeA of [s.angle+0.5, s.angle-0.5]) {
      const ex = hx + Math.cos(eyeA)*r*0.62, ey = hy + Math.sin(eyeA)*r*0.62;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, ey, r*0.34, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(ex+Math.cos(s.angle)*r*0.14, ey+Math.sin(s.angle)*r*0.14, r*0.2, 0, Math.PI*2); ctx.fill();
    }

    const boxY = hy - r*3.2;
    const saldoStr = s.saldo >= 1000000 ? `Rp${(s.saldo/1000000).toFixed(1)}jt` : s.saldo >= 1000 ? `Rp${(s.saldo/1000).toFixed(0)}rb` : `Rp${s.saldo}`;
    const nameStr = s.name;
    const fontSize = Math.max(9, 10.5*scale);
    ctx.font = `bold ${fontSize}px Inter,sans-serif`;
    const tw = Math.max(ctx.measureText(saldoStr).width, ctx.measureText(nameStr).width);
    const bw = tw + 18*scale, bh = 28*scale, bx2 = hx - bw/2, by2 = boxY - bh/2;
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = "rgba(13,9,0,0.7)"; roundRect(ctx, bx2, by2, bw, bh, 6*scale); ctx.fill();
    ctx.strokeStyle = `rgba(251,191,36,${s.isPlayer ? 0.5 : 0.2})`; ctx.lineWidth = s.isPlayer ? 1.2 : 0.7;
    roundRect(ctx, bx2, by2, bw, bh, 6*scale); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = `${fontSize*0.82}px Inter,sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(nameStr, hx, by2 + bh*0.32);
    ctx.font = `bold ${fontSize}px Inter,sans-serif`;
    ctx.fillStyle = s.isPlayer ? GOLD : "rgba(255,255,255,0.7)";
    if (s.isPlayer) { ctx.shadowBlur = 8*scale; ctx.shadowColor = GOLD; }
    ctx.fillText(saldoStr, hx, by2 + bh*0.72);
    ctx.restore();

    if (s.isPlayer && s.winProgress > 0) {
      const cr = r*2.4, cy2 = boxY - bh/2 - cr - 8*scale;
      ctx.save();
      ctx.beginPath(); ctx.arc(hx, cy2, cr, 0, Math.PI*2);
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fill();
      ctx.strokeStyle = "rgba(251,191,36,0.22)"; ctx.lineWidth = 1.5; ctx.stroke();
      const gPct = s.winProgress;
      ctx.shadowBlur = gPct > 0.7 ? 20*scale : 10*scale;
      ctx.shadowColor = gPct > 0.9 ? "#fff" : GOLD;
      ctx.strokeStyle = gPct > 0.9 ? "#fff" : GOLD;
      ctx.lineWidth = cr*0.42;
      ctx.beginPath(); ctx.arc(hx, cy2, cr*0.66, -Math.PI/2, -Math.PI/2 + gPct*Math.PI*2); ctx.stroke();
      ctx.font = `bold ${Math.max(7, cr*0.6)}px Inter,sans-serif`;
      ctx.fillStyle = gPct > 0.9 ? "#fff" : GOLD; ctx.shadowBlur = 0;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`${Math.round(gPct*100)}%`, hx, cy2);
      ctx.restore();
    }

    if (s.isPlayer && s.zoneWarning > 0) {
      const fl = (Math.sin(Date.now()/120)*0.5+0.5)*0.38;
      ctx.fillStyle = `rgba(239,68,68,${fl})`; ctx.fillRect(0,0,W,H);
    }
  }

  for (const f of state.floats) {
    const progress = 1 - f.life/f.maxLife;
    const fy = sy(f.wy) - progress*40*scale;
    const alpha = f.life < FLOAT_LIFE*0.4 ? f.life/(FLOAT_LIFE*0.4) : 1;
    ctx.save();
    ctx.font = `bold ${Math.max(10, 13*scale)}px Inter,sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(251,191,36,${alpha})`;
    ctx.shadowBlur = 10*scale; ctx.shadowColor = `rgba(251,191,36,${alpha*0.7})`;
    ctx.fillText(f.text, sx(f.wx), fy);
    ctx.restore();
  }
}

// ── roundRect helper ──────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

// ── Joystick component ────────────────────────────────────────────────────────
function Joystick({ onDir }: { onDir: (dx: number, dy: number) => void }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<{ cx: number; cy: number; id: number } | null>(null);
  const MAX_R = 44;

  const updateThumb = (tx: number, ty: number) => {
    if (!baseRef.current || !thumbRef.current || !activeRef.current) return;
    const dx = tx - activeRef.current.cx, dy = ty - activeRef.current.cy;
    const mag = Math.hypot(dx, dy);
    const clamp = Math.min(mag, MAX_R);
    const nx = mag > 0 ? dx/mag : 0, ny = mag > 0 ? dy/mag : 0;
    thumbRef.current.style.transform = `translate(${nx*clamp}px,${ny*clamp}px)`;
    onDir(nx * Math.min(1, mag/MAX_R), ny * Math.min(1, mag/MAX_R));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (activeRef.current) return;
    const t = e.changedTouches[0];
    const rect = baseRef.current!.getBoundingClientRect();
    activeRef.current = { cx: rect.left + rect.width/2, cy: rect.top + rect.height/2, id: t.identifier };
    updateThumb(t.clientX, t.clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!activeRef.current) return;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === activeRef.current.id) { updateThumb(e.touches[i].clientX, e.touches[i].clientY); break; }
    }
  };
  const onEnd = () => {
    if (!activeRef.current || !thumbRef.current) return;
    activeRef.current = null;
    thumbRef.current.style.transform = "translate(0px,0px)";
    onDir(0, 0);
  };

  return (
    <div
      ref={baseRef}
      className="absolute"
      style={{ left: 28, bottom: 28, width: 108, height: 108, borderRadius: "50%", background: "rgba(0,0,0,0.45)", border: "2px solid rgba(251,191,36,0.25)", touchAction: "none", zIndex: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onEnd} onTouchCancel={onEnd}
    >
      <div
        ref={thumbRef}
        style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(251,191,36,0.3)", border: "2px solid rgba(251,191,36,0.6)", transition: "transform 30ms linear", pointerEvents: "none", boxShadow: "0 0 14px rgba(251,191,36,0.35)" }}
      />
    </div>
  );
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
  const cashoutRef = useRef(false);
  const joystickRef = useRef<Vec2>({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const lastTRef = useRef(0);
  const prevWinPctRef = useRef(0);

  const [hud, setHud] = useState({ saldo: betAmount, alive: 10, winPct: 0, status: "playing" as GState["status"] });
  const [boosting, setBoosting] = useState(false);
  const [cashoutHeld, setCashoutHeld] = useState(false);
  const [winFlash, setWinFlash] = useState(false);
  const [nearMiss, setNearMiss] = useState(false);

  const setBoost = useCallback((v: boolean) => { boostRef.current = v; setBoosting(v); }, []);
  const setCashout = useCallback((v: boolean) => { cashoutRef.current = v; setCashoutHeld(v); }, []);
  const setJoystick = useCallback((dx: number, dy: number) => { joystickRef.current = { x: dx, y: dy }; }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const onMM = (e: MouseEvent) => {
      const s = stateRef.current;
      const scale = Math.min(canvas.width, canvas.height) / 820;
      const p = s.snakes.find((sn) => sn.isPlayer);
      if (!p) return;
      mouseRef.current = { x: p.pos[0].x + (e.clientX - canvas.width/2)/scale, y: p.pos[0].y + (e.clientY - canvas.height/2)/scale };
    };
    window.addEventListener("mousemove", onMM);

    let hudT = 0;
    const loop = (ts: number) => {
      const dt = Math.min(ts - (lastTRef.current || ts), 50);
      lastTRef.current = ts;
      update(stateRef.current, dt, mouseRef.current, boostRef.current, cashoutRef.current, joystickRef.current);
      render(canvas, stateRef.current);
      hudT += dt;
      if (hudT > 80) {
        hudT = 0;
        const p = stateRef.current.snakes.find((s) => s.isPlayer);
        const alive = stateRef.current.snakes.filter((s) => s.alive).length;
        const st = stateRef.current.status;
        const newWinPct = Math.round((p?.winProgress ?? 0)*100);

        // Near-miss detection: winPct was high (>75%) and now reset to 0
        if (prevWinPctRef.current >= 75 && newWinPct === 0 && st === "playing") {
          setNearMiss(true);
          setTimeout(() => setNearMiss(false), 2500);
        }
        prevWinPctRef.current = newWinPct;

        setHud({ saldo: p?.saldo ?? 0, alive, winPct: newWinPct, status: st });
        if (st !== "playing") { cancelAnimationFrame(rafRef.current); return; }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMM);
    };
  }, []);

  useEffect(() => {
    if (hud.status === "win") { setWinFlash(true); setTimeout(() => setWinFlash(false), 1200); }
  }, [hud.status]);

  const GG = "rgba(251,191,36,";

  return (
    <div className="fixed inset-0" style={{ zIndex: 50, background: "#080400" }}>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ touchAction: "none" }} />

      <style>{`
        @keyframes winFlash{0%{opacity:1}100%{opacity:0}}
        @keyframes nearMissIn{0%{opacity:0;transform:translateX(-50%) scale(0.8)}30%{opacity:1;transform:translateX(-50%) scale(1.05)}100%{opacity:0;transform:translateX(-50%) translateY(-20px) scale(0.95)}}
        @keyframes winPulse{0%,100%{transform:scale(1);text-shadow:0 0 30px rgba(251,191,36,0.8)}50%{transform:scale(1.04);text-shadow:0 0 60px rgba(251,191,36,1),0 0 100px rgba(251,191,36,0.6)}}
        @keyframes winGlow{0%,100%{box-shadow:0 0 60px rgba(251,191,36,0.3)}50%{box-shadow:0 0 120px rgba(251,191,36,0.6),0 0 200px rgba(251,191,36,0.2)}}
        @keyframes playAgainPulse{0%,100%{box-shadow:0 0 20px rgba(251,191,36,0.4)}50%{box-shadow:0 0 40px rgba(251,191,36,0.8),0 0 60px rgba(251,191,36,0.3)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Gold flash overlay on win */}
      {winFlash && <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg,${GG}0.3),${GG}0.12))`, zIndex: 14, animation: "winFlash 1.2s ease-out forwards" }} />}

      {/* Near miss overlay */}
      {nearMiss && (
        <div
          className="absolute pointer-events-none font-black text-center"
          style={{
            top: "28%", left: "50%",
            zIndex: 15,
            animation: "nearMissIn 2.5s ease-out forwards",
            fontSize: "1.4rem",
            color: "#fbbf24",
            textShadow: "0 0 20px rgba(251,191,36,0.9), 0 2px 8px rgba(0,0,0,0.8)",
            whiteSpace: "nowrap",
          }}
        >
          Dikit lagi! 😫
        </div>
      )}

      {/* HUD top-left */}
      <div className="absolute top-4 left-4 flex flex-col gap-2" style={{ zIndex: 10 }}>
        <div className="rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-3" style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${GG}0.25)`, color: GOLD }}>
          <div className="flex flex-col gap-0.5">
            <span style={{ color: "#7a6030", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em" }}>Saldo Game</span>
            <span style={{ textShadow: `0 0 10px ${GG}0.6)`, fontSize: 15 }}>
              {hud.saldo >= 1000000 ? `Rp${(hud.saldo/1000000).toFixed(1)}jt` : hud.saldo >= 1000 ? `Rp${(hud.saldo/1000).toFixed(0)}rb` : `Rp${hud.saldo}`}
            </span>
          </div>
        </div>
        <div className="rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-2" style={{ background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.08)", color: "#ccc" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
          {hud.alive} pemain tersisa
        </div>
      </div>

      {/* Cashout progress hint */}
      {hud.winPct > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2" style={{ zIndex: 10 }}>
          <div className="rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-2" style={{ background: "rgba(0,0,0,0.75)", border: `1px solid ${GG}${hud.winPct > 80 ? "0.7" : "0.25"})`, color: GOLD, boxShadow: hud.winPct > 80 ? `0 0 18px ${GG}0.45)` : "none" }}>
            <span style={{ color: "#7a6030", fontSize: 9, textTransform: "uppercase" }}>Cashout</span>
            <span style={{ fontSize: 15 }}>{hud.winPct}%</span>
            {hud.winPct > 80 && <span style={{ fontSize: 10, color: "#fff", animation: "winPulse 0.6s ease-in-out infinite" }}>Hampir! ✨</span>}
          </div>
        </div>
      )}

      {/* Joystick */}
      <Joystick onDir={setJoystick} />

      {/* Right side action buttons */}
      <div className="absolute flex flex-col gap-3" style={{ right: 20, bottom: 28, zIndex: 12, alignItems: "center" }}>
        <button
          className="w-24 h-24 rounded-full flex flex-col items-center justify-center font-black text-xs uppercase tracking-wide select-none"
          style={{
            background: cashoutHeld ? `radial-gradient(circle,${GG}0.35) 0%,rgba(0,0,0,0.75) 80%)` : "rgba(0,0,0,0.7)",
            border: `2px solid ${GG}${cashoutHeld ? "0.85" : "0.3"})`,
            color: cashoutHeld ? GOLD : "rgba(251,191,36,0.55)",
            boxShadow: cashoutHeld ? `0 0 28px ${GG}0.6),inset 0 0 16px ${GG}0.12)` : `0 0 10px ${GG}0.12)`,
            touchAction: "none",
            transition: "all 0.12s ease",
          }}
          onMouseDown={() => setCashout(true)}
          onMouseUp={() => setCashout(false)}
          onMouseLeave={() => setCashout(false)}
          onTouchStart={(e) => { e.preventDefault(); setCashout(true); }}
          onTouchEnd={() => setCashout(false)}
          onTouchCancel={() => setCashout(false)}
        >
          <span style={{ fontSize: 22 }}>💰</span>
          <span style={{ fontSize: 9, lineHeight: 1.3, textAlign: "center" }}>Tahan<br />Cashout</span>
        </button>

        <button
          className="w-16 h-16 rounded-full flex flex-col items-center justify-center font-black text-xs uppercase select-none"
          style={{
            background: boosting ? `linear-gradient(135deg,#d97706,#fbbf24)` : "rgba(0,0,0,0.65)",
            border: `2px solid ${GG}${boosting ? "0.9" : "0.28"})`,
            color: boosting ? "#1a0e00" : GOLD,
            boxShadow: boosting ? `0 0 26px ${GG}0.65)` : `0 0 8px ${GG}0.15)`,
            touchAction: "none",
            transition: "all 0.1s ease",
          }}
          onMouseDown={() => setBoost(true)}
          onMouseUp={() => setBoost(false)}
          onMouseLeave={() => setBoost(false)}
          onTouchStart={(e) => { e.preventDefault(); setBoost(true); }}
          onTouchEnd={() => setBoost(false)}
          onTouchCancel={() => setBoost(false)}
        >
          <span style={{ fontSize: 18 }}>⚡</span>
          <span style={{ fontSize: 9 }}>Boost</span>
        </button>
      </div>

      {cashoutHeld && !boosting && (
        <div className="absolute font-bold text-xs text-center" style={{ right: 24, bottom: 170, zIndex: 12, color: GOLD, textShadow: `0 0 10px ${GG}0.8)` }}>
          Jangan gerak!
        </div>
      )}
      {boosting && cashoutHeld && (
        <div className="absolute font-bold text-xs text-center" style={{ right: 18, bottom: 170, zIndex: 12, color: "#f87171" }}>
          Cashout<br />reset!
        </div>
      )}

      {hud.status === "win" && (
        <EndScreen
          won
          earnings={stateRef.current.winEarnings}
          loseReason=""
          onClose={() => onGameEnd({ won: true, earnings: stateRef.current.winEarnings })}
        />
      )}
      {hud.status === "lose" && (
        <EndScreen
          won={false}
          earnings={stateRef.current.snakes.find((s) => s.isPlayer)?.saldo ?? 0}
          loseReason={stateRef.current.loseReason}
          onClose={() => onGameEnd({ won: false, earnings: stateRef.current.snakes.find((s) => s.isPlayer)?.saldo ?? 0 })}
        />
      )}
    </div>
  );
}

function EndScreen({ won, earnings, loseReason, onClose }: { won: boolean; earnings: number; loseReason: string; onClose: () => void }) {
  const GG = "rgba(251,191,36,";
  const [showPlayAgain, setShowPlayAgain] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowPlayAgain(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.88)", zIndex: 20, backdropFilter: "blur(12px)" }}
    >
      <div
        className="flex flex-col items-center gap-5 rounded-2xl p-8 text-center"
        style={{
          background: "rgba(13,9,0,0.97)",
          border: `1.5px solid ${won ? GG+"0.45)" : "rgba(239,68,68,0.4)"}`,
          animation: won ? "winGlow 2s ease-in-out infinite" : "fadeInUp 0.4s ease-out",
          minWidth: 290,
          maxWidth: 340,
        }}
      >
        {won ? (
          <>
            {/* WIN MOMENT */}
            <div style={{ fontSize: "4rem", filter: "drop-shadow(0 0 20px rgba(251,191,36,0.8))" }}>🏆</div>
            <div>
              <h2
                className="font-black text-4xl uppercase tracking-widest"
                style={{ color: GOLD, animation: "winPulse 1.2s ease-in-out infinite" }}
              >
                KAMU MENANG!
              </h2>
              <p style={{ color: "#f59e0b", fontSize: 11, marginTop: 4, letterSpacing: "0.15em" }}>LUAR BIASA!</p>
            </div>
            <div
              className="rounded-2xl px-8 py-4 w-full"
              style={{ background: `${GG}0.1)`, border: `1px solid ${GG}0.3)` }}
            >
              <p style={{ color: "#7a6030", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Total Kemenangan</p>
              <p className="font-black text-3xl" style={{ color: GOLD, textShadow: `0 0 20px ${GG}0.8)` }}>
                +Rp{earnings.toLocaleString("id-ID")}
              </p>
            </div>
          </>
        ) : (
          <>
            {/* LOSE WITH REASON */}
            <div style={{ fontSize: "3.5rem" }}>💀</div>
            <h2 className="font-black text-3xl uppercase tracking-widest" style={{ color: "#f87171", textShadow: "0 0 24px rgba(239,68,68,0.7)" }}>
              KALAH!
            </h2>
            {loseReason && (
              <div
                className="rounded-xl px-4 py-3 w-full"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
              >
                <p style={{ color: "#7a6030", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Penyebab Kekalahan</p>
                <p style={{ color: "#fca5a5", fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{loseReason}</p>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <p style={{ color: "#7a6030", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Bubble Terkumpul</p>
              <p className="font-black text-2xl" style={{ color: "#f87171" }}>Rp{earnings.toLocaleString("id-ID")}</p>
            </div>
          </>
        )}

        {/* Session Loop: Main Lagi! */}
        {showPlayAgain && (
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-base"
            style={{
              background: won
                ? `linear-gradient(135deg,#d97706,#fbbf24)`
                : `linear-gradient(135deg,rgba(239,68,68,0.3),rgba(239,68,68,0.15))`,
              color: won ? "#1a0e00" : "#fca5a5",
              border: won ? "none" : "1.5px solid rgba(239,68,68,0.5)",
              animation: "playAgainPulse 1.4s ease-in-out infinite",
              fontSize: "1rem",
            }}
          >
            {won ? "▶ Main Lagi!" : "🔄 Coba Lagi!"}
          </button>
        )}

        <button
          onClick={onClose}
          className="text-xs font-semibold"
          style={{ color: "#7a6030", textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          Kembali ke Lobby
        </button>
      </div>
    </div>
  );
}
