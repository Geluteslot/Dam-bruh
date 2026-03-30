import { useEffect, useRef } from "react";
import { SNAKE_COLORS, type SnakeColor } from "@/lib/snakeColors";

interface SnakeSegment {
  x: number;
  y: number;
}

interface Snake {
  segments: SnakeSegment[];
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

interface Food {
  x: number;
  y: number;
  color: string;
  size: number;
  floatOffset: number;
  floatSpeed: number;
}

interface Props {
  playerColorId: string;
}

function drawSnakeHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  width: number,
  color: string,
  glowColor: string
) {
  const r = width * 0.85;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Glow halo
  ctx.shadowBlur = 22;
  ctx.shadowColor = glowColor;

  // Head body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.1, r, 0, 0, Math.PI * 2);
  ctx.fill();

  // Slightly lighter face
  const faceGrad = ctx.createRadialGradient(-r * 0.15, -r * 0.2, 0, 0, 0, r);
  faceGrad.addColorStop(0, "rgba(255,255,255,0.18)");
  faceGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.1, r, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // ---- Eyes ----
  const eyeForward = r * 0.35;    // how far forward on the head
  const eyeSide = r * 0.42;       // lateral offset
  const eyeballR = r * 0.28;
  const pupilR = r * 0.15;
  const pupilOffsetX = r * 0.07;  // pupils look slightly forward

  for (const side of [-1, 1]) {
    const ex = eyeForward;
    const ey = side * eyeSide;

    // White sclera
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 4;
    ctx.shadowColor = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(ex, ey, eyeballR, 0, Math.PI * 2);
    ctx.fill();

    // Black pupil (offset forward so eyes "look" in direction of movement)
    ctx.fillStyle = "#111";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(ex + pupilOffsetX, ey, pupilR, 0, Math.PI * 2);
    ctx.fill();

    // Pupil shine
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(ex + pupilOffsetX + pupilR * 0.3, ey - pupilR * 0.35, pupilR * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tiny smile
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(r * 0.5, 0, r * 0.28, -Math.PI * 0.45, Math.PI * 0.45);
  ctx.stroke();

  ctx.restore();
}

function drawSnake(
  ctx: CanvasRenderingContext2D,
  snake: Snake
) {
  if (snake.segments.length < 3) return;
  const { color, glow: glowColor } = snake.colorData;
  const w = snake.width;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const total = snake.segments.length;

  // Draw body from tail to neck (so head overlaps)
  for (let pass = 0; pass < 3; pass++) {
    const isGlow = pass < 2;
    const glowBlur = pass === 0 ? 28 : pass === 1 ? 10 : 0;
    const alpha = pass === 0 ? 0.12 : pass === 1 ? 0.3 : 1;
    const lineWidthMult = pass === 0 ? 3 : pass === 1 ? 1.7 : 1;

    ctx.beginPath();
    ctx.moveTo(snake.segments[0].x, snake.segments[0].y);

    for (let i = 1; i < total - 1; i++) {
      const mx = (snake.segments[i].x + snake.segments[i + 1].x) / 2;
      const my = (snake.segments[i].y + snake.segments[i + 1].y) / 2;
      ctx.quadraticCurveTo(snake.segments[i].x, snake.segments[i].y, mx, my);
    }
    ctx.lineTo(snake.segments[total - 1].x, snake.segments[total - 1].y);

    // Gradient along body — full at head, fades at tail
    const head = snake.segments[0];
    const tail = snake.segments[total - 1];
    const grad = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
    grad.addColorStop(0, color + Math.round(alpha * 255).toString(16).padStart(2, "0"));
    grad.addColorStop(0.55, color + Math.round(alpha * 0.55 * 255).toString(16).padStart(2, "0"));
    grad.addColorStop(1, color + "00");
    ctx.strokeStyle = grad;

    // Width tapers from head to tail
    // We do a single gradient stroke; taper is approximated via the gradient alpha
    ctx.lineWidth = w * lineWidthMult;

    if (isGlow) {
      ctx.shadowBlur = glowBlur;
      ctx.shadowColor = glowColor;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.stroke();
  }

  // Draw cute head on top
  const head = snake.segments[0];
  drawSnakeHead(ctx, head.x, head.y, snake.angle, w, color, glowColor);

  ctx.restore();
}

export default function SnakeCanvas({ playerColorId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const playerColorRef = useRef<string>(playerColorId);

  // Keep ref in sync without restarting animation
  useEffect(() => {
    playerColorRef.current = playerColorId;
  }, [playerColorId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const BG_COLORS = SNAKE_COLORS.filter((c) => c.id !== "neon-green");

    function createSnake(index: number, isPlayer: boolean): Snake {
      const colorData = isPlayer
        ? SNAKE_COLORS.find((c) => c.id === playerColorRef.current) ?? SNAKE_COLORS[0]
        : BG_COLORS[index % BG_COLORS.length];

      const segCount = 90 + Math.floor(Math.random() * 50);
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      const startAngle = Math.random() * Math.PI * 2;
      const segments: SnakeSegment[] = Array.from({ length: segCount }, () => ({
        x: startX,
        y: startY,
      }));
      return {
        segments,
        angle: startAngle,
        speed: 1.1 + Math.random() * 0.9,
        turnSpeed: 0.012 + Math.random() * 0.016,
        targetAngle: startAngle,
        colorData,
        width: isPlayer ? 11 : 7 + Math.random() * 6,
        length: segCount,
        turnTimer: 0,
        turnInterval: 90 + Math.floor(Math.random() * 110),
        isPlayer,
      };
    }

    const snakeCount = 6;
    const snakes: Snake[] = [
      createSnake(0, true),
      ...Array.from({ length: snakeCount }, (_, i) => createSnake(i, false)),
    ];

    const foods: Food[] = Array.from({ length: 55 }, () => {
      const foodColors = ["#00ff88", "#a855f7", "#3b82f6", "#f59e0b", "#22d3ee", "#f0abfc", "#fb7185"];
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        color: foodColors[Math.floor(Math.random() * foodColors.length)],
        size: 2.5 + Math.random() * 3,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.025 + Math.random() * 0.025,
      };
    });

    let frame = 0;

    function angleDiff(a: number, b: number): number {
      let d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    }

    function updateSnake(snake: Snake) {
      // Keep player snake color in sync
      if (snake.isPlayer) {
        const c = SNAKE_COLORS.find((x) => x.id === playerColorRef.current);
        if (c) snake.colorData = c;
      }

      snake.turnTimer++;
      if (snake.turnTimer >= snake.turnInterval) {
        snake.turnTimer = 0;
        snake.turnInterval = 90 + Math.floor(Math.random() * 110);
        snake.targetAngle = Math.random() * Math.PI * 2;
      }
      const diff = angleDiff(snake.angle, snake.targetAngle);
      snake.angle += Math.sign(diff) * Math.min(Math.abs(diff), snake.turnSpeed);

      const head = snake.segments[0];
      const nx = head.x + Math.cos(snake.angle) * snake.speed;
      const ny = head.y + Math.sin(snake.angle) * snake.speed;

      // Wrap around edges
      const newHead = { x: nx, y: ny };
      if (newHead.x < -120) { newHead.x = width + 100; snake.targetAngle = Math.random() * (Math.PI / 2) - Math.PI / 4; }
      if (newHead.x > width + 120) { newHead.x = -100; snake.targetAngle = Math.PI + (Math.random() * 0.5 - 0.25); }
      if (newHead.y < -120) { newHead.y = height + 100; snake.targetAngle = Math.PI / 2 + (Math.random() * 0.5 - 0.25); }
      if (newHead.y > height + 120) { newHead.y = -100; snake.targetAngle = -Math.PI / 2 + (Math.random() * 0.5 - 0.25); }

      snake.segments.unshift(newHead);
      if (snake.segments.length > snake.length) snake.segments.pop();
    }

    function drawFood(food: Food) {
      const yOff = Math.sin(food.floatOffset + frame * food.floatSpeed) * 4;
      const pulse = 0.7 + 0.3 * Math.sin(food.floatOffset + frame * food.floatSpeed * 1.6);
      ctx.save();
      ctx.shadowBlur = 14 * pulse;
      ctx.shadowColor = food.color;
      ctx.fillStyle = food.color;
      ctx.globalAlpha = 0.88 * pulse;
      ctx.beginPath();
      ctx.arc(food.x, food.y + yOff, food.size * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = 0.6;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(food.x - food.size * 0.22, food.y + yOff - food.size * 0.22, food.size * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function render() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(5, 3, 15, 0.93)";
      ctx.fillRect(0, 0, width, height);

      for (const food of foods) drawFood(food);
      for (const snake of snakes) {
        updateSnake(snake);
        drawSnake(ctx, snake);
      }

      frame++;
      animRef.current = requestAnimationFrame(render);
    }

    render();

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
