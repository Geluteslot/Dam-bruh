import { useState, useEffect, useRef } from "react";

// ─── Names ───────────────────────────────────────────────────────────────────
const FIRST_NAMES = [
  "Andi","Budi","Dandi","Rizky","Fitri","Ratna","Sari","Fajar","Ilham","Putra",
  "Dian","Wahyu","Reza","Yoga","Bagus","Siti","Dewi","Maya","Nurul","Agus",
  "Bayu","Citra","Doni","Eko","Feri","Gita","Hadi","Indra","Jihan","Kevin",
  "Lina","Mario","Nanda","Omar","Rama","Sinta","Toni","Vina","Wawan","Yogi",
  "Zahra","Arif","Bella","Chandra","Dika","Erwin","Fandi","Gilang","Hendra",
  "Ivan","Jasmine","Kurnia","Layla","Mirna","Nabil","Okta","Putri","Rian",
  "Salma","Taufik","Ulfa","Wisnu","Yanuar","Zulfa","Agung","Bintang","Cevin",
  "Dimas","Eka","Fahri","Guntur","Hamid","Ikhsan","Jaka","Krisna","Lutfi",
  "Mira","Nisa","Pandu","Rafi","Surya","Tegar","Umar","Vino","Wahid","Rina",
  "Fauzan","Salsabila","Azzam","Hasna","Ridho","Ayu","Daffa","Nayla","Hafidz","Cantika",
];

function makeUniqueName(used: Set<string>): string {
  let attempts = 0;
  while (attempts < 200) {
    const base = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const r = Math.random();
    let suffix = "";
    if (r < 0.45) suffix = String(10 + Math.floor(Math.random() * 89));
    else if (r < 0.65) suffix = "_" + String(1 + Math.floor(Math.random() * 99));
    else suffix = "";
    const name = base + suffix;
    if (!used.has(name)) { used.add(name); return name; }
    attempts++;
  }
  return "Player" + Math.floor(Math.random() * 9999);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const r1k = (v: number) => Math.round(v / 1000) * 1000;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const todayStr = () => new Date().toISOString().slice(0, 10);

// ─── Leaderboard player ───────────────────────────────────────────────────────
export interface LBPlayer {
  id: number;
  name: string;
  saldo: number;
  isDrama: boolean;
}

// ─── Generate 100 players sorted by saldo desc ───────────────────────────────
function generatePlayers(): LBPlayer[] {
  const used = new Set<string>();
  const raw: LBPlayer[] = [];
  for (let i = 0; i < 100; i++) {
    const name = makeUniqueName(used);
    // Higher index = lower rank → smaller saldo
    const topBias = 1 - i / 100;
    const minS = r1k(50_000 + topBias * 1_600_000);
    const maxS = r1k(200_000 + topBias * 1_800_000);
    const saldo = r1k(minS + Math.random() * (maxS - minS));
    raw.push({ id: i, name, saldo, isDrama: false });
  }
  raw.sort((a, b) => b.saldo - a.saldo);
  return raw;
}

// ─── Busy hours — generated once per day ─────────────────────────────────────
interface BusyHours { busy: number[]; vbusy: number[] }

function getBusyHours(): BusyHours {
  const key = "dambruh_busy_" + todayStr();
  const cached = localStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const all = Array.from({ length: 24 }, (_, i) => i).sort(() => Math.random() - 0.5);
  const busyCount = 1 + Math.floor(Math.random() * 2);
  const vbusyCount = 1 + Math.floor(Math.random() * 2);
  const val: BusyHours = {
    busy: all.slice(0, busyCount),
    vbusy: all.slice(busyCount, busyCount + vbusyCount),
  };
  // Clean old keys
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("dambruh_busy_") && k !== key) localStorage.removeItem(k);
  }
  localStorage.setItem(key, JSON.stringify(val));
  return val;
}

// ─── Global Winnings persistence ──────────────────────────────────────────────
const GW_DAY_KEY = "dambruh_gw_day";
const GW_VAL_KEY = "dambruh_gw_val";
const MAX_DAILY_GW = 10_000_000;

function loadGlobalWinnings(): number {
  const savedDay = localStorage.getItem(GW_DAY_KEY);
  const today = todayStr();
  if (savedDay !== today) {
    // New day OR first run → reset to 0
    localStorage.setItem(GW_DAY_KEY, today);
    localStorage.setItem(GW_VAL_KEY, "0");
    return 0;
  }
  return parseInt(localStorage.getItem(GW_VAL_KEY) ?? "0", 10) || 0;
}

function saveGlobalWinnings(v: number) {
  localStorage.setItem(GW_VAL_KEY, String(v));
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function useSimulation(userSaldo: number) {
  // Active players
  const [activePlayers, setActivePlayers] = useState<number>(() => {
    return clamp(80 + Math.floor(Math.random() * 120), 80, 300);
  });
  const activeRef = useRef(activePlayers);

  // Global winnings
  const [globalWinnings, setGlobalWinnings] = useState<number>(loadGlobalWinnings);
  const gwRef = useRef(globalWinnings);

  // Leaderboard
  const [players, setPlayers] = useState<LBPlayer[]>(generatePlayers);
  const playersRef = useRef(players);

  // Drama players (indices into players array that are rising)
  const dramaIdsRef = useRef<Set<number>>(new Set());

  // Busy hours (stable per day)
  const busyHoursRef = useRef<BusyHours>(getBusyHours());

  // Keep refs in sync
  useEffect(() => { activeRef.current = activePlayers; }, [activePlayers]);
  useEffect(() => { gwRef.current = globalWinnings; }, [globalWinnings]);
  useEffect(() => { playersRef.current = players; }, [players]);

  // ── Active players tick ──────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const hour = new Date().getHours();
      const { busy, vbusy } = busyHoursRef.current;
      const isVBusy = vbusy.includes(hour);
      const isBusy = busy.includes(hour);

      let targetMin = 80;
      let targetMax = 200;
      if (isVBusy) { targetMin = 260; targetMax = 300; }
      else if (isBusy) { targetMin = 200; targetMax = 280; }

      setActivePlayers((prev) => {
        const target = targetMin + Math.floor(Math.random() * (targetMax - targetMin));
        const diff = target - prev;
        const step = Math.sign(diff) * Math.min(Math.abs(diff), 3 + Math.floor(Math.random() * 5));
        return clamp(prev + step, 80, 300);
      });
    };
    const id = setInterval(tick, 4000 + Math.random() * 3000);
    return () => clearInterval(id);
  }, []);

  // ── Global winnings tick ─────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      // Daily reset at 00:00
      if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() < 4) {
        setGlobalWinnings(0);
        localStorage.setItem(GW_DAY_KEY, todayStr());
        localStorage.setItem(GW_VAL_KEY, "0");
        return;
      }

      const ap = activeRef.current;
      const current = gwRef.current;

      // Slow down near cap
      if (current >= MAX_DAILY_GW) return;

      let inc: number;
      if (current >= 8_000_000) {
        inc = r1k(3_000 + Math.random() * 7_000);
      } else if (ap <= 120) {
        inc = r1k(3_000 + Math.random() * 12_000);
      } else if (ap <= 200) {
        inc = r1k(10_000 + Math.random() * 30_000);
      } else {
        inc = r1k(30_000 + Math.random() * 70_000);
      }

      setGlobalWinnings((prev) => {
        const next = Math.min(MAX_DAILY_GW, prev + inc);
        saveGlobalWinnings(next);
        return next;
      });
    };

    // Tick every 1-3 seconds (randomized start)
    let timeoutId: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 1000 + Math.random() * 2000;
      timeoutId = setTimeout(() => {
        tick();
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timeoutId);
  }, []);

  // ── Leaderboard update + drama system ───────────────────────────────────
  useEffect(() => {
    // Pick drama players on mount (rank 20-80, i.e. index 19-79)
    const pickDrama = (current: LBPlayer[]) => {
      const count = 2 + Math.floor(Math.random() * 4);
      const eligible = current
        .map((p, idx) => ({ id: p.id, idx }))
        .filter(({ idx }) => idx >= 19 && idx <= 79);
      const chosen = eligible.sort(() => Math.random() - 0.5).slice(0, count);
      dramaIdsRef.current = new Set(chosen.map((c) => c.id));
      setPlayers((prev) => prev.map((p) => ({ ...p, isDrama: dramaIdsRef.current.has(p.id) })));
    };
    pickDrama(playersRef.current);

    // Re-pick drama players every 10-30 min
    const repickMs = (10 + Math.random() * 20) * 60_000;
    const repickId = setTimeout(() => pickDrama(playersRef.current), repickMs);

    // Leaderboard update: every 30s-2min
    let updateTimeout: ReturnType<typeof setTimeout>;
    const scheduleUpdate = () => {
      const delay = 30_000 + Math.random() * 90_000;
      updateTimeout = setTimeout(() => {
        setPlayers((prev) => {
          const next = prev.map((p) => ({ ...p }));

          // Drama players: rise 1-3 ranks, saldo +3000-15000
          const dramaIds = dramaIdsRef.current;
          for (const id of dramaIds) {
            const idx = next.findIndex((p) => p.id === id);
            if (idx === -1) continue;

            const rand = Math.random();
            if (rand < 0.15) {
              // Stop this tick
              continue;
            }
            if (rand < 0.22) {
              // Slip down 1 rank
              if (idx < next.length - 1) {
                const rise = r1k(-(3_000 + Math.random() * 5_000));
                next[idx].saldo = Math.max(50_000, r1k(next[idx].saldo + rise));
                [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
              }
              continue;
            }

            // Rise 1-3 ranks
            const steps = 1 + Math.floor(Math.random() * 3);
            const targetIdx = Math.max(0, idx - steps);
            const balanceGain = r1k(3_000 + Math.random() * 12_000);
            next[idx].saldo = r1k(next[idx].saldo + balanceGain);

            // Shuffle up
            for (let s = 0; s < steps && idx - s > targetIdx; s++) {
              const from = idx - s;
              const to = from - 1;
              if (to < 0) break;
              // Push the displaced player down slightly
              next[to].saldo = Math.max(50_000, r1k(next[to].saldo - r1k(1_000 + Math.random() * 4_000)));
              [next[from], next[to]] = [next[to], next[from]];
            }
          }

          // Normal players: small random fluctuations ±3000-20000
          for (let i = 0; i < next.length; i++) {
            if (dramaIds.has(next[i].id)) continue;
            if (Math.random() < 0.4) continue; // Only 60% of players change
            const delta = r1k((Math.random() < 0.55 ? 1 : -1) * (3_000 + Math.random() * 17_000));
            next[i].saldo = clamp(r1k(next[i].saldo + delta), 50_000, 2_500_000);
          }

          // Re-sort descending by saldo
          next.sort((a, b) => b.saldo - a.saldo);

          return next;
        });

        scheduleUpdate();
      }, delay);
    };
    scheduleUpdate();

    return () => {
      clearTimeout(repickId);
      clearTimeout(updateTimeout);
    };
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────
  const rooms = Math.max(1, Math.floor(activePlayers / 10));

  // User rank: based on their saldo vs leaderboard
  const userRank = players.filter((p) => p.saldo >= userSaldo).length + 1;

  return { activePlayers, rooms, globalWinnings, players, userRank };
}
