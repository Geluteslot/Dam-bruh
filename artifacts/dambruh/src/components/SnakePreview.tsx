import { useEffect, useRef } from "react";
import { SNAKE_COLORS } from "@/lib/snakeColors";

interface Props {
  colorId: string;
  width?: number;
  height?: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function SnakePreview({ colorId, width = 320, height = 140 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const colorData = SNAKE_COLORS.find((c) => c.id === colorId) ?? SNAKE_COLORS[0];
    const { color, glow } = colorData;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Build a static S-curve path for the snake body
    const cx = width / 2;
    const cy = height / 2;
    const snakeW = 11;
    const segCount = 52;

    // Generate segments along a smooth S-curve
    const segments: { x: number; y: number }[] = [];
    for (let i = 0; i < segCount; i++) {
      const t = i / (segCount - 1);
      // S-curve: x goes left-to-right, y does a gentle S
      const x = cx + (t - 0.5) * (width * 0.78);
      const y = cy + Math.sin(t * Math.PI * 1.6 - Math.PI * 0.5) * (height * 0.25);
      segments.push({ x, y });
    }

    // Draw body passes (glow + core)
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let pass = 0; pass < 3; pass++) {
      const isGlow = pass < 2;
      const glowBlur = pass === 0 ? 28 : pass === 1 ? 10 : 0;
      const alpha = pass === 0 ? 0.12 : pass === 1 ? 0.3 : 1;
      const lwMult = pass === 0 ? 3.2 : pass === 1 ? 1.8 : 1;

      ctx.beginPath();
      ctx.moveTo(segments[0].x, segments[0].y);
      for (let i = 1; i < segCount - 1; i++) {
        const mx = (segments[i].x + segments[i + 1].x) / 2;
        const my = (segments[i].y + segments[i + 1].y) / 2;
        ctx.quadraticCurveTo(segments[i].x, segments[i].y, mx, my);
      }
      ctx.lineTo(segments[segCount - 1].x, segments[segCount - 1].y);

      const grad = ctx.createLinearGradient(
        segments[0].x, segments[0].y,
        segments[segCount - 1].x, segments[segCount - 1].y
      );
      grad.addColorStop(0, hexToRgba(color, alpha));
      grad.addColorStop(0.5, hexToRgba(color, alpha * 0.6));
      grad.addColorStop(1, hexToRgba(color, 0));

      ctx.strokeStyle = grad;
      ctx.lineWidth = snakeW * lwMult;
      ctx.shadowBlur = isGlow ? glowBlur : 0;
      ctx.shadowColor = glow;
      ctx.stroke();
    }

    // Draw head (looking to the right — angle = 0)
    const head = segments[0];
    const angle = Math.atan2(
      segments[0].y - segments[1].y,
      segments[0].x - segments[1].x
    );
    const r = snakeW * 0.85;

    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(angle);

    // Head body
    ctx.shadowBlur = 22;
    ctx.shadowColor = glow;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.1, r, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face highlight
    const faceGrad = ctx.createRadialGradient(-r * 0.15, -r * 0.2, 0, 0, 0, r);
    faceGrad.addColorStop(0, "rgba(255,255,255,0.18)");
    faceGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.1, r, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Eyes
    const eyeForward = r * 0.35;
    const eyeSide = r * 0.42;
    const eyeballR = r * 0.28;
    const pupilR = r * 0.15;

    for (const side of [-1, 1]) {
      const ex = eyeForward;
      const ey = side * eyeSide;

      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 4;
      ctx.shadowColor = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(ex, ey, eyeballR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#111";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(ex + r * 0.07, ey, pupilR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(ex + r * 0.07 + pupilR * 0.3, ey - pupilR * 0.35, pupilR * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Smile
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = r * 0.12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(r * 0.5, 0, r * 0.28, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    ctx.restore(); // rotate
    ctx.restore(); // main save

  }, [colorId, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: "block" }}
    />
  );
}
