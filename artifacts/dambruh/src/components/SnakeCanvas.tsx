import { useEffect, useRef } from "react";
import { SNAKE_COLORS, type SnakeColor } from "@/lib/snakeColors";

interface Seg { x: number; y: number; }

interface Snake {
  segments: Seg[];
  angle: number;
  speed: number;
  turnSpeed: number;
  targetAngle: number;
  colorData: SnakeColor;
  width: number;
  length: number;
  turnTimer: number;
  turnInterval: number;
  isPlayer: boolean;
}

interface Food { x: number; y: number; color: string; size: number; offset: number; speed: number; }

interface Props { playerColorId: string; }

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function drawBody(ctx: CanvasRenderingContext2D, snake: Snake) {
  if (snake.segments.length < 3) return;
  const { color, glow } = snake.colorData;
  const { r: cr, g: cg, b: cb } = hexToRgb(color);
  const n = snake.segments.length;
  const maxW = snake.width;

  ctx.save();

  // Draw segment-by-segment from tail to neck for taper + glow
  for (let i = n - 1; i >= 1; i--) {
    const t = i / (n - 1); // 0 = head, 1 = tail
    const alpha = Math.max(0, 1 - t * 0.88);
    const segW = Math.max(1.5, maxW * (1 - t * 0.75));
    const shimmer = 1 + 0.06 * Math.sin(i * 0.55);

    const seg = snake.segments[i];
    const prev = snake.segments[i - 1];

    // Glow pass
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha * 0.18})`;
    ctx.lineWidth = segW * 3.2;
    ctx.shadowBlur = 18;
    ctx.shadowColor = glow;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(seg.x, seg.y);
    ctx.stroke();

    // Core
    const rr = Math.min(255, cr * shimmer + 20);
    const gg = Math.min(255, cg * shimmer + 20);
    const bb = Math.min(255, cb * shimmer + 20);
    ctx.strokeStyle = `rgba(${Math.round(rr)},${Math.round(gg)},${Math.round(bb)},${alpha})`;
    ctx.lineWidth = segW;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(seg.x, seg.y);
    ctx.stroke();

    // Scale arc every 3rd segment
    if (i % 3 === 0 && segW > 4) {
      ctx.strokeStyle = `rgba(0,0,0,${0.22 * alpha})`;
      ctx.lineWidth = 0.7;
      ctx.shadowBlur = 0;
      const midX = (prev.x + seg.x) / 2;
      const midY = (prev.y + seg.y) / 2;
      ctx.beginPath();
      ctx.arc(midX, midY, segW * 0.55, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawHead(ctx: CanvasRenderingContext2D, snake: Snake) {
  const head = snake.segments[0];
  const neck = snake.segments[Math.min(3, snake.segments.length - 1)];
  const angle = Math.atan2(head.y - neck.y, head.x - neck.x);
  const { color, glow } = snake.colorData;
  const { r: cr, g: cg, b: cb } = hexToRgb(color);
  const r = snake.width * 0.95;

  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(angle);

  // Glow halo
  ctx.shadowBlur = 28;
  ctx.shadowColor = glow;

  // Head shape
  const headGrad = ctx.createLinearGradient(-r * 0.2, -r, r * 1.3, r);
  headGrad.addColorStop(0, `rgb(${Math.min(255, cr + 60)},${Math.min(255, cg + 60)},${Math.min(255, cb + 60)})`);
  headGrad.addColorStop(0.45, color);
  headGrad.addColorStop(1, `rgb(${Math.max(0, cr - 40)},${Math.max(0, cg - 40)},${Math.max(0, cb - 40)})`);
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.3, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Scale texture on head
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.3, r, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(0,0,0,0.13)";
  ctx.lineWidth = 0.7;
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 2; col++) {
      const sx = col * r * 0.6 + (row % 2 === 0 ? r * 0.3 : 0);
      const sy = row * r * 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.24, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Highlight
  const hl = ctx.createRadialGradient(-r * 0.18, -r * 0.28, 0, 0, 0, r * 1.1);
  hl.addColorStop(0, "rgba(255,255,255,0.2)");
  hl.addColorStop(0.5, "rgba(255,255,255,0.04)");
  hl.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.3, r, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nostrils
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(r * 0.92, -r * 0.3, r * 0.1, r * 0.07, 0.3, 0, Math.PI * 2);
  ctx.ellipse(r * 0.92, r * 0.3, r * 0.1, r * 0.07, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  const eyeX = r * 0.4;
  const eyeY = r * 0.5;
  const eyeR = r * 0.3;
  const irisR = r * 0.21;
  const pupilR = r * 0.12;

  for (const side of [-1, 1]) {
    const ey = side * eyeY;

    // Socket
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.arc(eyeX, ey, eyeR * 1.18, 0, Math.PI * 2);
    ctx.fill();

    // Sclera
    const sg = ctx.createRadialGradient(eyeX - eyeR * 0.22, ey - eyeR * 0.22, 0, eyeX, ey, eyeR);
    sg.addColorStop(0, "#fff");
    sg.addColorStop(1, "#ddd");
    ctx.fillStyle = sg;
    ctx.shadowBlur = 4;
    ctx.shadowColor = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.arc(eyeX, ey, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Iris
    const ig = ctx.createRadialGradient(eyeX + irisR * 0.15, ey - irisR * 0.1, 0, eyeX, ey, irisR);
    ig.addColorStop(0, "#5cb");
    ig.addColorStop(0.5, "#27856a");
    ig.addColorStop(1, "#134033");
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.arc(eyeX + r * 0.06, ey, irisR, 0, Math.PI * 2);
    ctx.fill();

    // Pupil (vertical slit)
    ctx.fillStyle = "#080808";
    ctx.save();
    ctx.translate(eyeX + r * 0.06, ey);
    ctx.scale(0.42, 1);
    ctx.beginPath();
    ctx.arc(0, 0, pupilR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.beginPath();
    ctx.arc(eyeX + r * 0.06 + pupilR * 0.5, ey - pupilR * 0.5, pupilR * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.arc(eyeX + r * 0.06 - pupilR * 0.25, ey + pupilR * 0.45, pupilR * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tongue
  ctx.save();
  ctx.strokeStyle = "#ff1a44";
  ctx.shadowBlur = 7;
  ctx.shadowColor = "#ff1a44";
  ctx.lineWidth = r * 0.09;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(r * 1.2, 0);
  ctx.lineTo(r * 1.62, 0);
  ctx.stroke();
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.moveTo(r * 1.62, 0);
  ctx.lineTo(r * 1.95, -r * 0.24);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 1.62, 0);
  ctx.lineTo(r * 1.95, r * 0.24);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

export default function SnakeCanvas({ playerColorId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const playerColorRef = useRef(playerColorId);

  useEffect(() => { playerColorRef.current = playerColorId; }, [playerColorId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const BG_COLORS = SNAKE_COLORS.filter((c) => c.id !== "neon-green");

    function makeSnake(idx: number, isPlayer: boolean): Snake {
      const colorData = isPlayer
        ? (SNAKE_COLORS.find((c) => c.id === playerColorRef.current) ?? SNAKE_COLORS[0])
        : BG_COLORS[idx % BG_COLORS.length];
      const len = 80 + Math.floor(Math.random() * 70);
      const sx = Math.random() * W;
      const sy = Math.random() * H;
      const a = Math.random() * Math.PI * 2;
      const speedVariant = Math.random();
      const speed = speedVariant < 0.3
        ? 0.55 + Math.random() * 0.45   // slow
        : speedVariant < 0.7
        ? 1.0 + Math.random() * 0.7     // normal
        : 1.8 + Math.random() * 0.8;    // fast
      return {
        segments: Array.from({ length: len }, () => ({ x: sx, y: sy })),
        angle: a, speed,
        turnSpeed: 0.012 + Math.random() * 0.018,
        targetAngle: a, colorData,
        width: isPlayer ? 11 : 6 + Math.random() * 7,
        length: len, turnTimer: 0,
        turnInterval: 70 + Math.floor(Math.random() * 130),
        isPlayer,
      };
    }

    const snakes: Snake[] = [
      makeSnake(0, true),
      ...Array.from({ length: 14 }, (_, i) => makeSnake(i, false)),
    ];

    const foodColors = ["#fbbf24","#f59e0b","#fde68a","#a855f7","#3b82f6","#22d3ee","#f0abfc","#fb7185","#00ff88","#ffd700"];
    const foods: Food[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      color: foodColors[Math.floor(Math.random() * foodColors.length)],
      size: 2.5 + Math.random() * 3.5,
      offset: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.035,
    }));

    let frame = 0;

    function angleDiff(a: number, b: number) {
      let d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    }

    function update(s: Snake) {
      if (s.isPlayer) {
        const c = SNAKE_COLORS.find((x) => x.id === playerColorRef.current);
        if (c) s.colorData = c;
      }
      s.turnTimer++;
      if (s.turnTimer >= s.turnInterval) {
        s.turnTimer = 0;
        s.turnInterval = 90 + Math.floor(Math.random() * 120);
        s.targetAngle = Math.random() * Math.PI * 2;
      }
      const d = angleDiff(s.angle, s.targetAngle);
      s.angle += Math.sign(d) * Math.min(Math.abs(d), s.turnSpeed);
      const hd = s.segments[0];
      let nx = hd.x + Math.cos(s.angle) * s.speed;
      let ny = hd.y + Math.sin(s.angle) * s.speed;
      if (nx < -130) { nx = W + 110; s.targetAngle = Math.random() * 0.5 - 0.25; }
      if (nx > W + 130) { nx = -110; s.targetAngle = Math.PI + Math.random() * 0.5 - 0.25; }
      if (ny < -130) { ny = H + 110; s.targetAngle = Math.PI / 2 + Math.random() * 0.5 - 0.25; }
      if (ny > H + 130) { ny = -110; s.targetAngle = -Math.PI / 2 + Math.random() * 0.5 - 0.25; }
      s.segments.unshift({ x: nx, y: ny });
      if (s.segments.length > s.length) s.segments.pop();
    }

    function drawFd(f: Food) {
      const yo = Math.sin(f.offset + frame * f.speed) * 4;
      const p = 0.7 + 0.3 * Math.sin(f.offset + frame * f.speed * 1.6);
      ctx.save();
      ctx.shadowBlur = 14 * p;
      ctx.shadowColor = f.color;
      ctx.fillStyle = f.color;
      ctx.globalAlpha = 0.88 * p;
      ctx.beginPath();
      ctx.arc(f.x, f.y + yo, f.size * p, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.55; ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(f.x - f.size * 0.22, f.y + yo - f.size * 0.22, f.size * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function render() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(5,3,15,0.93)";
      ctx.fillRect(0, 0, W, H);
      for (const f of foods) drawFd(f);
      for (const s of snakes) { update(s); drawBody(ctx, s); drawHead(ctx, s); }
      frame++;
      animRef.current = requestAnimationFrame(render);
    }

    render();

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }} />;
}
