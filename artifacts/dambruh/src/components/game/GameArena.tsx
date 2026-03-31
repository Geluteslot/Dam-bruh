import { useEffect, useRef, useState, useCallback } from "react";
import { getGameSettings } from "@/lib/gameSettings";

// ── Luck / Win-Loss Tracking ──────────────────────────────────────────────────
type LuckStatus = "HOKI" | "NORMAL" | "SIAL";
const WL_KEY = "dambruh_wl_v2";
interface WLRec { w: number; l: number; }
function getWLRec(): WLRec {
  try { return JSON.parse(localStorage.getItem(WL_KEY) ?? '{"w":0,"l":0}') as WLRec; } catch { return { w: 0, l: 0 }; }
}
function recordWL(won: boolean) {
  const prev = getWLRec();
  let w = prev.w + (won ? 1 : 0), l = prev.l + (won ? 0 : 1);
  const total = w + l;
  if (total > 12) { const sc = 12 / total; w = Math.round(w * sc); l = Math.round(l * sc); }
  localStorage.setItem(WL_KEY, JSON.stringify({ w, l }));
}
function getWinrate(): number { const { w, l } = getWLRec(); return (w + l) > 0 ? w / (w + l) : 0.5; }
function determineInitialLuck(playerSaldo: number, betAmount: number): LuckStatus {
  if (playerSaldo < 10_000 || playerSaldo < betAmount * 1.5) return "HOKI";
  const wr = getWinrate();
  if (wr < 0.33) return "HOKI";
  if (wr > 0.62) return Math.random() < 0.55 ? "SIAL" : "NORMAL";
  const r = Math.random();
  return r < 0.38 ? "HOKI" : r < 0.72 ? "NORMAL" : "SIAL";
}

// ── Sound Engine (Web Audio API) ──────────────────────────────────────────────
let _ac: AudioContext | null = null;
function getAC(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_ac) _ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return _ac;
  } catch { return null; }
}
function tone(freq: number, type: OscillatorType, dur: number, vol: number, freqEnd?: number) {
  try {
    const ac = getAC(); if (!ac) return;
    if (ac.state === "suspended") ac.resume().catch(() => {});
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, ac.currentTime + dur);
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.start(); osc.stop(ac.currentTime + dur);
  } catch {}
}
const SFX = {
  bubble:      () => tone(600 + Math.random() * 400, "sine",     0.05,  0.1),
  collision:   () => { tone(160, "sawtooth", 0.14, 0.38, 55); setTimeout(() => tone(80, "square", 0.28, 0.22, 40), 70); },
  win:         () => { tone(523,"sine",0.17,0.32); setTimeout(()=>tone(659,"sine",0.17,0.34),180); setTimeout(()=>tone(784,"sine",0.22,0.38),360); setTimeout(()=>tone(1046,"sine",0.5,0.4),580); },
  lose:        () => { tone(330,"sine",0.28,0.3,180); setTimeout(()=>tone(200,"sine",0.45,0.26,110),260); },
  cashoutTick: () => tone(1200, "sine", 0.035, 0.065, 1300),
  start:       () => { tone(440,"sine",0.12,0.24); setTimeout(()=>tone(660,"sine",0.14,0.3),140); },
  zoneWarn:    () => tone(200, "square", 0.08, 0.12, 220),
};

// ── Types ────────────────────────────────────────────────────────────────────
interface Vec2 { x: number; y: number; }
interface Snake {
  id: string; name: string; pos: Vec2[];
  angle: number; color: string;
  betAmount: number; saldo: number;
  alive: boolean; isPlayer: boolean; boosting: boolean;
  winProgress: number; winTimer: number;
  zoneWarning: number;
  tgtAngle: number; tgtTimer: number; botBoostTimer: number;
}
interface Bubble { id: string; pos: Vec2; vel: Vec2; value: number; r: number; life: number; maxLife: number; }
interface FloatText { id: string; wx: number; wy: number; text: string; life: number; maxLife: number; }
interface Particle { id: string; pos: Vec2; vel: Vec2; life: number; maxLife: number; color: string; r: number; }
interface GState {
  snakes: Snake[]; bubbles: Bubble[]; floats: FloatText[]; particles: Particle[];
  zoneR: number; elapsed: number;
  status: "playing" | "win" | "lose";
  winEarnings: number; loseReason: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ZC: Vec2 = { x: 1000, y: 1000 };
const ZONE_START = 860; const ZONE_END = 160; const ZONE_MS = 120_000;
const SPD = 0.23; const BOOST_SPD = 0.46; const TURN = 0.009;
const WIN_MS = 8000; const ENEMY_R = 130;
const SEG_SPACE = 9; const MAX_SEG = 28; const SR = 13;
const BOT_NAMES = ["Budi","Sari","Andi","Dewi","Rizky","Putri","Hadi","Nina","Fajar"];
const BOT_COLORS = ["#ff4455","#44ff88","#4499ff","#ff44ff","#ffaa44","#44ffff","#aa44ff","#ff8844","#88ff44"];
const BUBBLE_LIFE = 12000; const FLOAT_LIFE = 1400; const GOLD = "#fbbf24";

// ── Math helpers ──────────────────────────────────────────────────────────────
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const ang  = (a: Vec2, b: Vec2) => Math.atan2(b.y - a.y, b.x - a.x);
function normAngle(a: number) { while (a > Math.PI) a -= 2*Math.PI; while (a < -Math.PI) a += 2*Math.PI; return a; }
function turnToward(cur: number, tgt: number, max: number) { const d = normAngle(tgt - cur); return cur + Math.sign(d) * Math.min(Math.abs(d), max); }

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
  return { snakes, bubbles: [], floats: [], particles: [], zoneR: ZONE_START, elapsed: 0, status: "playing", winEarnings: 0, loseReason: "" };
}

// ── Kill + exact bubble drop + explosion ─────────────────────────────────────
function killSnake(s: Snake, state: GState) {
  s.alive = false;
  const totalDrop = Math.max(1000, Math.round(s.saldo * 0.75 / 500) * 500);
  const cnt = Math.min(12, Math.max(3, Math.floor(totalDrop / 1500)));
  const base = Math.floor(totalDrop / cnt);
  let remaining = totalDrop;
  for (let i = 0; i < cnt; i++) {
    const value = i === cnt - 1 ? Math.max(500, remaining) : Math.max(500, base);
    remaining -= (i === cnt - 1 ? 0 : base);
    const a = (i / cnt) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const spd = 0.09 + Math.random() * 0.18;
    state.bubbles.push({
      id: `bk${Date.now()}${i}`,
      pos: { ...s.pos[0] },
      vel: { x: Math.cos(a) * spd, y: Math.sin(a) * spd },
      value, r: 9 + Math.min(8, Math.floor(value / 800)),
      life: BUBBLE_LIFE, maxLife: BUBBLE_LIFE,
    });
  }
  // Explosion particles
  const pc = 16 + Math.floor(Math.random() * 12);
  for (let i = 0; i < pc; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd2 = 0.12 + Math.random() * 0.38;
    state.particles.push({
      id: `px${Date.now()}${i}`,
      pos: { ...s.pos[0] },
      vel: { x: Math.cos(a) * spd2, y: Math.sin(a) * spd2 },
      life: 500 + Math.random() * 600, maxLife: 1100,
      color: s.color, r: 3 + Math.random() * 6,
    });
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
    s.pos.unshift(newHead); if (s.pos.length > MAX_SEG) s.pos.splice(MAX_SEG);
  } else { s.pos[0] = newHead; }
  s.boosting = boost;
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(state: GState, dt: number, mouseW: Vec2, boost: boolean, cashoutHeld: boolean, joystickDir: Vec2, luck: LuckStatus) {
  if (state.status !== "playing") return;
  state.elapsed += dt;
  state.zoneR = ZONE_START + (ZONE_END - ZONE_START) * Math.min(1, state.elapsed / ZONE_MS);

  const player = state.snakes.find((s) => s.isPlayer && s.alive);

  for (const s of state.snakes) {
    if (!s.alive) continue;
    if (s.isPlayer) {
      const jMag = Math.hypot(joystickDir.x, joystickDir.y);
      const tgtA = jMag > 0.1 ? Math.atan2(joystickDir.y, joystickDir.x) : ang(s.pos[0], mouseW);
      moveSnake(s, dt, tgtA, boost);
    } else {
      botAI(s, state, dt); moveSnake(s, dt, s.tgtAngle, s.boosting);
    }
    if (dist(s.pos[0], ZC) > state.zoneR) {
      s.zoneWarning += dt;
      if (s.zoneWarning >= 1800) {
        if (s.isPlayer) state.loseReason = "Kamu terlambat — zona menyempitmu! Harus lebih cepat kembali ke tengah.";
        killSnake(s, state);
      }
    } else { s.zoneWarning = 0; }
  }

  if (player) {
    const luckEnemyR = luck === "HOKI" ? ENEMY_R * 0.72 : luck === "SIAL" ? ENEMY_R * 1.35 : ENEMY_R;
    const luckFillSpeed = luck === "HOKI" ? 1.2 : luck === "SIAL" ? 0.82 : 1.0;
    const enemyNear = state.snakes.some((s) => !s.isPlayer && s.alive && dist(s.pos[0], player.pos[0]) < luckEnemyR);

    if (!cashoutHeld || boost || enemyNear) { player.winProgress = 0; player.winTimer = 0; }
    else { player.winTimer += dt * luckFillSpeed; player.winProgress = Math.min(1, player.winTimer / WIN_MS); }

    if (player.winProgress >= 1) {
      state.status = "win";
      state.winEarnings = Math.round((player.saldo + player.betAmount * 1.8) / 1000) * 1000;
      return;
    }

    if (luck === "SIAL" && player.winProgress > 0.82 && player.winProgress < 0.99) {
      const dramaCh = (dt / 3800) * ((player.winProgress - 0.82) / 0.17);
      if (Math.random() < dramaCh) {
        const enemies = state.snakes.filter((s) => !s.isPlayer && s.alive);
        if (enemies.length > 0) {
          const nearest = enemies.reduce((a, b) => dist(a.pos[0], player.pos[0]) < dist(b.pos[0], player.pos[0]) ? a : b);
          nearest.tgtAngle = ang(nearest.pos[0], player.pos[0]);
          nearest.tgtTimer = 2800; nearest.boosting = true; nearest.botBoostTimer = 2800;
        }
      }
    }
  }

  if (player) {
    const ph = player.pos[0];
    for (const bot of state.snakes) {
      if (!bot.alive || bot.isPlayer) continue;
      if (dist(ph, bot.pos[0]) < SR*1.8) { state.loseReason = "Kamu bertabrakan langsung dengan musuh! Kurang waspada."; killSnake(player, state); break; }
      for (let i = 3; i < bot.pos.length; i++) {
        if (dist(ph, bot.pos[i]) < SR*1.4) { state.loseReason = "Kamu masuk ke badan musuh — salah posisi!"; killSnake(player, state); break; }
      }
      if (!player.alive) break;
    }
  }

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

  // Update particles (explosions)
  for (const p of state.particles) {
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.vel.x *= Math.pow(0.984, dt / 16);
    p.vel.y *= Math.pow(0.984, dt / 16);
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

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
  const camX = player.pos[0].x - W/2/scale, camY = player.pos[0].y - H/2/scale;
  const sx = (wx: number) => (wx - camX)*scale, sy = (wy: number) => (wy - camY)*scale;

  ctx.fillStyle = "#080400"; ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = "rgba(251,191,36,0.04)"; ctx.lineWidth = 1;
  const gs = 60*scale;
  const ox = ((-camX*scale)%gs+gs)%gs, oy = ((-camY*scale)%gs+gs)%gs;
  for (let x = ox-gs; x < W+gs; x += gs) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = oy-gs; y < H+gs; y += gs) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // RED battle zone
  const zsx = sx(ZC.x), zsy = sy(ZC.y), zsr = state.zoneR*scale;

  // Outer darkness
  ctx.save();
  ctx.beginPath(); ctx.rect(0,0,W,H);
  ctx.arc(zsx, zsy, zsr, 0, Math.PI*2, true);
  ctx.fillStyle = "rgba(0,0,0,0.62)"; ctx.fill("evenodd");
  ctx.restore();

  // Pulsing red glow ring
  ctx.save();
  ctx.strokeStyle = `rgba(239,68,68,${0.07 + 0.055 * Math.sin(Date.now() / 380)})`;
  ctx.lineWidth = 16*scale;
  ctx.beginPath(); ctx.arc(zsx, zsy, zsr, 0, Math.PI*2); ctx.stroke();
  // Sharp border
  ctx.shadowBlur = 22*scale; ctx.shadowColor = "rgba(239,68,68,0.6)";
  ctx.strokeStyle = "rgba(239,68,68,0.8)"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(zsx, zsy, zsr, 0, Math.PI*2); ctx.stroke();
  ctx.restore();

  // Bubbles
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

  // Snakes
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
    const fontSize = Math.max(9, 10.5*scale);
    ctx.font = `bold ${fontSize}px Inter,sans-serif`;
    const tw = Math.max(ctx.measureText(saldoStr).width, ctx.measureText(s.name).width);
    const bw = tw + 18*scale, bh = 28*scale, bx2 = hx - bw/2, by2 = boxY - bh/2;
    ctx.save(); ctx.globalAlpha = 0.82;
    ctx.fillStyle = "rgba(13,9,0,0.7)"; roundRect(ctx, bx2, by2, bw, bh, 6*scale); ctx.fill();
    ctx.strokeStyle = `rgba(251,191,36,${s.isPlayer ? 0.5 : 0.2})`; ctx.lineWidth = s.isPlayer ? 1.2 : 0.7;
    roundRect(ctx, bx2, by2, bw, bh, 6*scale); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = `${fontSize*0.82}px Inter,sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(s.name, hx, by2 + bh*0.32);
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

  // Float texts
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

  // Explosion particles
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    const pr = Math.max(0.5, p.r * scale * (0.4 + 0.6 * alpha));
    const px2 = sx(p.pos.x), py2 = sy(p.pos.y);
    ctx.save();
    ctx.globalAlpha = alpha * 0.88;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 8 * scale * alpha;
    ctx.shadowColor = p.color;
    ctx.beginPath(); ctx.arc(px2, py2, pr, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

// ── Joystick ──────────────────────────────────────────────────────────────────
function Joystick({ onDir, side }: { onDir: (dx: number, dy: number) => void; side: "left" | "right" }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<{ cx: number; cy: number; id: number } | null>(null);
  const MAX_R = 44;

  const updateThumb = (tx: number, ty: number) => {
    if (!baseRef.current || !thumbRef.current || !activeRef.current) return;
    const dx = tx - activeRef.current.cx, dy = ty - activeRef.current.cy;
    const mag = Math.hypot(dx, dy), clamp = Math.min(mag, MAX_R);
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
  const pos = side === "left" ? { left: 28, bottom: 28 } : { right: 28, bottom: 28 };
  return (
    <div ref={baseRef} className="absolute"
      style={{ ...pos, width: 108, height: 108, borderRadius: "50%", background: "rgba(0,0,0,0.45)", border: "2px solid rgba(251,191,36,0.25)", touchAction: "none", zIndex: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onEnd} onTouchCancel={onEnd}>
      <div ref={thumbRef} style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(251,191,36,0.3)", border: "2px solid rgba(251,191,36,0.6)", transition: "transform 30ms linear", pointerEvents: "none", boxShadow: "0 0 14px rgba(251,191,36,0.35)" }} />
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  username: string; playerColor: string; betAmount: number; playerSaldo: number;
  isJackpot?: boolean;
  onGameEnd: (result: { won: boolean; earnings: number }) => void;
}

// ── GameArena Component ───────────────────────────────────────────────────────
export default function GameArena({ username, playerColor, betAmount, playerSaldo, isJackpot = false, onGameEnd }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const stateRef     = useRef<GState>(initState(username, betAmount, playerSaldo, playerColor));
  const mouseRef     = useRef<Vec2>({ x: 1000, y: 1000 });
  const boostRef     = useRef(false);
  const cashoutRef   = useRef(false);
  const joystickRef  = useRef<Vec2>({ x: 0, y: 0 });
  const rafRef       = useRef(0);
  const lastTRef     = useRef(0);
  const prevWinPctRef= useRef(0);

  // Settings
  const settings = getGameSettings();

  // Sound tracking refs
  const prevAliveRef      = useRef(10);
  const prevBubbleCountRef= useRef(0);
  const lastBubbleSndRef  = useRef(0);
  const prevStatusRef     = useRef<GState["status"]>("playing");
  const prevWinPct10Ref   = useRef(0);

  // Luck system
  const luckRef         = useRef<LuckStatus>(determineInitialLuck(playerSaldo, betAmount));
  const luckTimerRef    = useRef(0);
  const luckDurationRef = useRef((5 + Math.random() * 10) * 60_000);

  // Bubble auto-spawn
  const bubbleSpawnTimerRef = useRef(2000 + Math.random() * 2000);

  const [hud, setHud]                 = useState({ saldo: betAmount, alive: 10, winPct: 0, status: "playing" as GState["status"] });
  const [boosting, setBoosting]       = useState(false);
  const [cashoutHeld, setCashoutHeld] = useState(false);
  const [winFlash, setWinFlash]       = useState(false);
  const [nearMiss, setNearMiss]       = useState(false);

  const setBoost    = useCallback((v: boolean) => { boostRef.current = v; setBoosting(v); }, []);
  const setCashout  = useCallback((v: boolean) => { cashoutRef.current = v; setCashoutHeld(v); }, []);
  const setJoystick = useCallback((dx: number, dy: number) => { joystickRef.current = { x: dx, y: dy }; }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    // Initialize AudioContext on first user gesture (component mounts after user taps)
    getAC();
    SFX.start();

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

      // Luck timer
      luckTimerRef.current += dt;
      if (luckTimerRef.current >= luckDurationRef.current) {
        luckTimerRef.current = 0;
        const cur = luckRef.current; const wr = getWinrate();
        if (cur === "HOKI") { luckRef.current = "NORMAL"; luckDurationRef.current = (7 + Math.random()*8) * 60_000; }
        else if (cur === "NORMAL") {
          if (wr > 0.60) { luckRef.current = Math.random() < 0.55 ? "SIAL" : "NORMAL"; }
          else if (wr < 0.38) { luckRef.current = "HOKI"; }
          else { luckRef.current = Math.random() < 0.45 ? "HOKI" : Math.random() < 0.5 ? "NORMAL" : "SIAL"; }
          luckDurationRef.current = (5 + Math.random()*10) * 60_000;
        } else { luckRef.current = "NORMAL"; luckDurationRef.current = (6 + Math.random()*9) * 60_000; }
      }

      // Bubble auto-spawn
      if (stateRef.current.status === "playing") {
        bubbleSpawnTimerRef.current -= dt;
        if (bubbleSpawnTimerRef.current <= 0) {
          const luck = luckRef.current;
          const baseInterval = isJackpot ? 900 : luck === "HOKI" ? 2200 : luck === "SIAL" ? 7500 : 4200;
          bubbleSpawnTimerRef.current = baseInterval * (0.75 + Math.random() * 0.5);
          const zR = stateRef.current.zoneR;
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * zR * 0.82;
          let val: number;
          if (isJackpot) { val = [5000,8000,10000,15000,20000][Math.floor(Math.random()*5)]; }
          else if (luck === "HOKI") { val = [500,1000,1000,1500,2000][Math.floor(Math.random()*5)]; }
          else { val = [500,500,1000][Math.floor(Math.random()*3)]; }
          stateRef.current.bubbles.push({
            id: `bs${Date.now()}${Math.random()}`,
            pos: { x: ZC.x + Math.cos(a)*r, y: ZC.y + Math.sin(a)*r },
            vel: { x: 0, y: 0 }, value: val, r: 8 + Math.floor(val/500),
            life: BUBBLE_LIFE, maxLife: BUBBLE_LIFE,
          });
        }
      }

      const prevAlive = prevAliveRef.current;
      const prevBubbleCount = prevBubbleCountRef.current;

      update(stateRef.current, dt, mouseRef.current, boostRef.current, cashoutRef.current, joystickRef.current, luckRef.current);
      render(canvas, stateRef.current);

      // ── Sound triggers ──
      const newAlive = stateRef.current.snakes.filter((s) => s.alive).length;
      if (newAlive < prevAlive) SFX.collision();
      prevAliveRef.current = newAlive;

      const newBubbleCount = stateRef.current.bubbles.length;
      const now2 = performance.now();
      if (newBubbleCount < prevBubbleCount && now2 - lastBubbleSndRef.current > 90) {
        SFX.bubble(); lastBubbleSndRef.current = now2;
      }
      prevBubbleCountRef.current = newBubbleCount;

      const curStatus = stateRef.current.status;
      if (curStatus !== prevStatusRef.current) {
        if (curStatus === "win") SFX.win();
        else if (curStatus === "lose") SFX.lose();
        prevStatusRef.current = curStatus;
      }

      const playerNow = stateRef.current.snakes.find((s) => s.isPlayer);
      const winPct10 = Math.floor((playerNow?.winProgress ?? 0) * 10);
      if (winPct10 > 0 && winPct10 > prevWinPct10Ref.current) SFX.cashoutTick();
      prevWinPct10Ref.current = winPct10;

      // Zone warning sound
      if (playerNow?.alive && (playerNow?.zoneWarning ?? 0) > 0 && Math.random() < 0.008) SFX.zoneWarn();

      // HUD update
      hudT += dt;
      if (hudT > 80) {
        hudT = 0;
        const p = stateRef.current.snakes.find((s) => s.isPlayer);
        const alive = stateRef.current.snakes.filter((s) => s.alive).length;
        const st = stateRef.current.status;
        const newWinPct = Math.round((p?.winProgress ?? 0)*100);
        if (prevWinPctRef.current >= 75 && newWinPct === 0 && st === "playing") {
          setNearMiss(true); setTimeout(() => setNearMiss(false), 2500);
        }
        prevWinPctRef.current = newWinPct;
        setHud({ saldo: p?.saldo ?? 0, alive, winPct: newWinPct, status: st });
        if (st !== "playing") { cancelAnimationFrame(rafRef.current); return; }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); window.removeEventListener("mousemove", onMM); };
  }, [isJackpot]);

  useEffect(() => {
    if (hud.status === "win") { setWinFlash(true); setTimeout(() => setWinFlash(false), 1200); }
    if (hud.status !== "playing") {
      const won = hud.status === "win";
      recordWL(won);
      const earnings = won ? stateRef.current.winEarnings : stateRef.current.snakes.find((s) => s.isPlayer)?.saldo ?? 0;
      setTimeout(() => onGameEnd({ won, earnings }), 2800);
    }
  }, [hud.status, onGameEnd]);

  const GG = "rgba(251,191,36,";
  const cashoutSide = settings.cashout;
  const joystickSide = settings.joystick;

  return (
    <div className="fixed inset-0" style={{ zIndex: 50, background: "#080400" }}>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ touchAction: "none" }} />

      <style>{`
        @keyframes winFlash{0%{opacity:1}100%{opacity:0}}
        @keyframes nearMissIn{0%{opacity:0;transform:translateX(-50%) scale(0.8)}30%{opacity:1;transform:translateX(-50%) scale(1.05)}100%{opacity:0;transform:translateX(-50%) translateY(-24px) scale(0.95)}}
        @keyframes winPulse{0%,100%{transform:scale(1);text-shadow:0 0 30px rgba(251,191,36,0.8)}50%{transform:scale(1.04);text-shadow:0 0 60px rgba(251,191,36,1),0 0 100px rgba(251,191,36,0.6)}}
        @keyframes winGlow{0%,100%{box-shadow:0 0 60px rgba(251,191,36,0.3)}50%{box-shadow:0 0 120px rgba(251,191,36,0.6),0 0 200px rgba(251,191,36,0.2)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes jackpotPulse{0%,100%{opacity:1}50%{opacity:0.6}}
      `}</style>

      {winFlash && <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg,${GG}0.3),${GG}0.12))`, zIndex: 14, animation: "winFlash 1.2s ease-out forwards" }} />}

      {nearMiss && (
        <div className="absolute pointer-events-none font-black text-center"
          style={{ top: "28%", left: "50%", zIndex: 15, animation: "nearMissIn 2.5s ease-out forwards", fontSize: "1.4rem", color: "#fbbf24", textShadow: "0 0 20px rgba(251,191,36,0.9), 0 2px 8px rgba(0,0,0,0.8)", whiteSpace: "nowrap" }}>
          Dikit lagi! 😭
        </div>
      )}

      {/* HUD */}
      {hud.status === "playing" && (
        <>
          {/* Top bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-none" style={{ zIndex: 13 }}>
            <div className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: "rgba(0,0,0,0.65)", border: `1px solid ${GG}0.2)`, color: "#fbbf24", backdropFilter: "blur(6px)" }}>
              👥 {hud.alive}
            </div>
            <div className="px-4 py-1.5 rounded-xl font-black text-sm" style={{ background: "rgba(0,0,0,0.65)", border: `1px solid ${GG}0.3)`, color: "#fbbf24", textShadow: `0 0 12px ${GG}0.6)`, backdropFilter: "blur(6px)" }}>
              Rp{hud.saldo.toLocaleString("id-ID")}
            </div>
            {isJackpot && (
              <div className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: "rgba(120,60,0,0.9)", border: "1px solid rgba(251,191,36,0.6)", color: "#fbbf24", animation: "jackpotPulse 0.8s ease-in-out infinite" }}>
                🔥 JACKPOT
              </div>
            )}
          </div>

          {/* Cashout progress bar */}
          {hud.winPct > 0 && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none" style={{ zIndex: 13, width: 200 }}>
              <div className="rounded-full overflow-hidden" style={{ height: 8, background: "rgba(0,0,0,0.5)", border: `1px solid ${GG}0.2)` }}>
                <div style={{ width: `${hud.winPct}%`, height: "100%", background: hud.winPct > 90 ? "#fff" : "#fbbf24", boxShadow: `0 0 10px ${hud.winPct > 90 ? "#ffffff" : "#fbbf2499"}`, transition: "width 0.1s linear" }} />
              </div>
              <p className="text-center text-xs font-bold mt-1" style={{ color: hud.winPct > 90 ? "#fff" : "#fbbf24" }}>{hud.winPct}%</p>
            </div>
          )}

          {/* Joystick */}
          <Joystick onDir={setJoystick} side={joystickSide} />

          {/* Boost button */}
          <button
            className="absolute"
            style={{ [joystickSide === "left" ? "left" : "right"]: 160, bottom: 40, width: 64, height: 64, borderRadius: "50%", background: boosting ? "rgba(251,191,36,0.35)" : "rgba(0,0,0,0.5)", border: `2px solid ${GG}${boosting ? "0.7" : "0.3"})`, color: "#fbbf24", fontSize: 24, touchAction: "none", zIndex: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: boosting ? `0 0 20px ${GG}0.6)` : "none", transition: "all 0.15s" }}
            onTouchStart={(e) => { e.preventDefault(); setBoost(true); }}
            onTouchEnd={() => setBoost(false)}
            onMouseDown={() => setBoost(true)}
            onMouseUp={() => setBoost(false)}
          >⚡</button>

          {/* Cashout button */}
          <button
            className="absolute"
            style={{
              [cashoutSide === "right" ? "right" : "left"]: 28, bottom: 28,
              width: 108, height: 108, borderRadius: "50%",
              background: cashoutHeld ? `linear-gradient(135deg, rgba(217,119,6,0.8), rgba(251,191,36,0.8))` : "rgba(0,0,0,0.5)",
              border: `2.5px solid ${GG}${cashoutHeld ? "0.9" : "0.35"})`,
              color: cashoutHeld ? "#1a0e00" : "#fbbf24",
              fontWeight: 900, fontSize: 13, letterSpacing: "0.08em",
              touchAction: "none", zIndex: 12,
              boxShadow: cashoutHeld ? `0 0 30px ${GG}0.8), 0 0 60px ${GG}0.3)` : "none",
              transition: "all 0.15s",
            }}
            onTouchStart={(e) => { e.preventDefault(); setCashout(true); }}
            onTouchEnd={() => setCashout(false)}
            onMouseDown={() => setCashout(true)}
            onMouseUp={() => setCashout(false)}
          >CASHOUT</button>
        </>
      )}

      {/* End screen */}
      {hud.status !== "playing" && (
        <EndScreen
          won={hud.status === "win"}
          earnings={hud.status === "win" ? stateRef.current.winEarnings : stateRef.current.snakes.find((s) => s.isPlayer)?.saldo ?? 0}
          loseReason={stateRef.current.loseReason}
        />
      )}
    </div>
  );
}

// ── End Screen ────────────────────────────────────────────────────────────────
function EndScreen({ won, earnings, loseReason }: { won: boolean; earnings: number; loseReason: string }) {
  const GG = "rgba(251,191,36,";
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(14px)", zIndex: 20, animation: "fadeInUp 0.6s ease-out" }}>
      <div className="text-center px-6 max-w-sm w-full">
        <div style={{ fontSize: "4rem", lineHeight: 1, marginBottom: 12 }}>{won ? "🏆" : "💀"}</div>
        <h2
          className="font-black text-4xl mb-2"
          style={{ color: won ? "#fbbf24" : "#f87171", textShadow: won ? `0 0 30px ${GG}0.9)` : "0 0 30px rgba(239,68,68,0.9)", animation: won ? "winPulse 1.5s ease-in-out infinite" : "none" }}
        >
          {won ? "MENANG!" : "KALAH!"}
        </h2>
        <p className="text-sm mb-1" style={{ color: won ? "#a38020" : "#7a3030" }}>
          {won ? "Kamu berhasil cashout!" : "Kamu tereliminasi"}
        </p>
        {!won && loseReason && (
          <p className="text-xs mb-3 px-4 py-2 rounded-xl" style={{ color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {loseReason}
          </p>
        )}
        <div
          className="rounded-2xl px-6 py-4 mb-2 mx-auto"
          style={{ background: won ? `${GG}0.08)` : "rgba(239,68,68,0.05)", border: won ? `1.5px solid ${GG}0.4)` : "1.5px solid rgba(239,68,68,0.25)", animation: won ? "winGlow 2s ease-in-out infinite" : "none", maxWidth: 240 }}
        >
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: won ? "#a38020" : "#7a3030" }}>
            {won ? "Total Kemenangan" : "Bubble Terkumpul"}
          </p>
          <p className="font-black text-3xl" style={{ color: won ? "#fbbf24" : "#f87171", textShadow: won ? `0 0 20px ${GG}0.7)` : "0 0 20px rgba(239,68,68,0.7)" }}>
            {won ? "+" : ""}Rp{earnings.toLocaleString("id-ID")}
          </p>
        </div>
        <p className="text-xs mt-4" style={{ color: "#4a3820" }}>Kembali ke menu utama...</p>
      </div>
    </div>
  );
}
