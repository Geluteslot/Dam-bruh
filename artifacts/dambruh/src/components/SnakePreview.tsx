import { useEffect, useRef } from "react";
import { SNAKE_COLORS } from "@/lib/snakeColors";

interface Props {
  colorId: string;
  width?: number;
  height?: number;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function lighten(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt)},${Math.min(255, b + amt)})`;
}

function darken(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.max(0, r - amt)},${Math.max(0, g - amt)},${Math.max(0, b - amt)})`;
}

// Draw a realistic-looking snake head
function drawHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  radius: number,
  color: string,
  glow: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const r = radius;

  // Outer glow halo
  ctx.save();
  ctx.shadowBlur = 26;
  ctx.shadowColor = glow;

  // Head shape — elongated ellipse
  const headGrad = ctx.createLinearGradient(-r * 0.3, -r, r * 1.2, r);
  headGrad.addColorStop(0, lighten(color, 55));
  headGrad.addColorStop(0.4, color);
  headGrad.addColorStop(1, darken(color, 40));
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.25, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Scale texture on head
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.25, r, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = `rgba(0,0,0,0.12)`;
  ctx.lineWidth = 0.7;
  for (let row = -2; row <= 2; row++) {
    for (let col = -2; col <= 3; col++) {
      const sx = col * r * 0.55 + (row % 2 === 0 ? r * 0.27 : 0);
      const sy = row * r * 0.42;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.22, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Face highlight
  const faceLight = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 0, 0, 0, r * 1.1);
  faceLight.addColorStop(0, "rgba(255,255,255,0.22)");
  faceLight.addColorStop(0.5, "rgba(255,255,255,0.04)");
  faceLight.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = faceLight;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.25, r, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nostrils
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(r * 0.9, -r * 0.28, r * 0.1, r * 0.07, 0.3, 0, Math.PI * 2);
  ctx.ellipse(r * 0.9, r * 0.28, r * 0.1, r * 0.07, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // === Eyes ===
  const eyeX = r * 0.38;
  const eyeY = r * 0.48;
  const eyeR = r * 0.3;
  const irisR = r * 0.22;
  const pupilR = r * 0.13;

  for (const side of [-1, 1]) {
    const ey = side * eyeY;

    // Eye socket shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.arc(eyeX, ey, eyeR * 1.15, 0, Math.PI * 2);
    ctx.fill();

    // White sclera
    const scleraGrad = ctx.createRadialGradient(eyeX - eyeR * 0.2, ey - eyeR * 0.2, 0, eyeX, ey, eyeR);
    scleraGrad.addColorStop(0, "#ffffff");
    scleraGrad.addColorStop(1, "#e0e0e0");
    ctx.fillStyle = scleraGrad;
    ctx.shadowBlur = 5;
    ctx.shadowColor = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(eyeX, ey, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Colored iris
    const irisGrad = ctx.createRadialGradient(eyeX + irisR * 0.2, ey, 0, eyeX, ey, irisR);
    irisGrad.addColorStop(0, "#4a9");
    irisGrad.addColorStop(0.5, "#276");
    irisGrad.addColorStop(1, "#143");
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(eyeX + r * 0.06, ey, irisR, 0, Math.PI * 2);
    ctx.fill();

    // Pupil (vertical slit)
    ctx.fillStyle = "#0a0a0a";
    ctx.save();
    ctx.translate(eyeX + r * 0.06, ey);
    ctx.scale(0.45, 1);
    ctx.beginPath();
    ctx.arc(0, 0, pupilR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Eye shine 1
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(eyeX + r * 0.06 + pupilR * 0.5, ey - pupilR * 0.5, pupilR * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine 2 (small)
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(eyeX + r * 0.06 - pupilR * 0.3, ey + pupilR * 0.5, pupilR * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Eyelid line
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(eyeX, ey, eyeR, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  }

  // Tongue
  ctx.save();
  ctx.strokeStyle = "#ff2255";
  ctx.lineWidth = r * 0.09;
  ctx.lineCap = "round";
  ctx.shadowBlur = 6;
  ctx.shadowColor = "#ff2255";

  // Base
  ctx.beginPath();
  ctx.moveTo(r * 1.15, 0);
  ctx.lineTo(r * 1.55, 0);
  ctx.stroke();

  // Fork tips
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.moveTo(r * 1.55, 0);
  ctx.lineTo(r * 1.85, -r * 0.22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 1.55, 0);
  ctx.lineTo(r * 1.85, r * 0.22);
  ctx.stroke();

  ctx.restore();

  ctx.restore(); // main rotate/translate
}

// Draw one body segment (circle with scale texture)
function drawSegment(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  glow: string,
  t: number, // 0 = head end, 1 = tail
  phase: number,
) {
  const alpha = Math.max(0, 1 - t * 0.85);

  ctx.save();

  // Scale shimmer — subtle brightness oscillation per segment
  const shimmer = 1 + 0.07 * Math.sin(t * 18 + phase);

  const { r: cr, g: cg, b: cb } = hexToRgb(color);

  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 1.1);
  grad.addColorStop(0, `rgba(${Math.min(255, cr * shimmer + 60)},${Math.min(255, cg * shimmer + 60)},${Math.min(255, cb * shimmer + 60)},${alpha})`);
  grad.addColorStop(0.5, `rgba(${Math.round(cr * shimmer)},${Math.round(cg * shimmer)},${Math.round(cb * shimmer)},${alpha})`);
  grad.addColorStop(1, `rgba(${Math.round(cr * 0.45)},${Math.round(cg * 0.45)},${Math.round(cb * 0.45)},${alpha * 0.9})`);

  ctx.shadowBlur = 10 * (1 - t * 0.7);
  ctx.shadowColor = glow;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Scale arc
  if (r > 3) {
    ctx.strokeStyle = `rgba(0,0,0,${0.18 * alpha})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.75, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  }

  ctx.restore();
}

export default function SnakePreview({ colorId, width = 340, height = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const colorRef = useRef(colorId);

  useEffect(() => {
    colorRef.current = colorId;
  }, [colorId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const TOTAL_SEGS = 44;
    const HEAD_R = 13;
    const cx = width / 2;
    const cy = height / 2;
    const snakeSpan = width * 0.72;

    let phase = 0;

    function buildSegments(t: number) {
      // Traveling wave — phase shifts create slithering illusion
      const segs: { x: number; y: number; r: number }[] = [];
      for (let i = 0; i < TOTAL_SEGS; i++) {
        const frac = i / (TOTAL_SEGS - 1);
        const x = cx + (0.5 - frac) * snakeSpan;
        // Wave amplitude decreases toward tail
        const amp = height * 0.21 * (1 - frac * 0.3);
        const y = cy + Math.sin(frac * Math.PI * 2.2 - t) * amp;
        const r = HEAD_R * (1 - frac * 0.68);
        segs.push({ x, y, r });
      }
      return segs;
    }

    function render() {
      ctx.clearRect(0, 0, width, height);

      const colorData = SNAKE_COLORS.find((c) => c.id === colorRef.current) ?? SNAKE_COLORS[0];
      const { color, glow } = colorData;

      const segs = buildSegments(phase);

      // Draw segments from tail → neck (head drawn last on top)
      for (let i = TOTAL_SEGS - 1; i >= 1; i--) {
        const t = i / (TOTAL_SEGS - 1);
        drawSegment(ctx, segs[i].x, segs[i].y, segs[i].r, color, glow, t, phase);
      }

      // Draw head
      const head = segs[0];
      const neck = segs[1];
      const headAngle = Math.atan2(head.y - neck.y, head.x - neck.x);
      drawHead(ctx, head.x, head.y, headAngle, HEAD_R, color, glow);

      phase += 0.04;
      animRef.current = requestAnimationFrame(render);
    }

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: "block" }}
    />
  );
}
