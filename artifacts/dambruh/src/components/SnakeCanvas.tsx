import { useEffect, useRef } from "react";

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
  color: string;
  glowColor: string;
  width: number;
  length: number;
  turnTimer: number;
  turnInterval: number;
}

interface Food {
  x: number;
  y: number;
  color: string;
  size: number;
  floatOffset: number;
  floatSpeed: number;
}

export default function SnakeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const COLORS = [
      { color: "#00ff88", glow: "#00ff88" },
      { color: "#a855f7", glow: "#a855f7" },
      { color: "#3b82f6", glow: "#3b82f6" },
      { color: "#22d3ee", glow: "#22d3ee" },
      { color: "#f0abfc", glow: "#e879f9" },
    ];

    function createSnake(index: number): Snake {
      const colorSet = COLORS[index % COLORS.length];
      const segmentCount = 80 + Math.floor(Math.random() * 60);
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      const startAngle = Math.random() * Math.PI * 2;

      const segments: SnakeSegment[] = [];
      for (let i = 0; i < segmentCount; i++) {
        segments.push({ x: startX, y: startY });
      }

      return {
        segments,
        angle: startAngle,
        speed: 1.2 + Math.random() * 0.8,
        turnSpeed: 0.012 + Math.random() * 0.018,
        targetAngle: startAngle,
        color: colorSet.color,
        glowColor: colorSet.glow,
        width: 6 + Math.random() * 6,
        length: segmentCount,
        turnTimer: 0,
        turnInterval: 80 + Math.floor(Math.random() * 120),
      };
    }

    function createFood(): Food {
      const foodColors = ["#00ff88", "#a855f7", "#3b82f6", "#f59e0b", "#22d3ee", "#f0abfc"];
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        color: foodColors[Math.floor(Math.random() * foodColors.length)],
        size: 2 + Math.random() * 3,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.02 + Math.random() * 0.03,
      };
    }

    const snakeCount = 7;
    const snakes: Snake[] = Array.from({ length: snakeCount }, (_, i) => createSnake(i));
    const foods: Food[] = Array.from({ length: 60 }, () => createFood());
    let frame = 0;

    function angleDiff(a: number, b: number): number {
      let diff = b - a;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      return diff;
    }

    function updateSnake(snake: Snake) {
      snake.turnTimer++;
      if (snake.turnTimer >= snake.turnInterval) {
        snake.turnTimer = 0;
        snake.turnInterval = 80 + Math.floor(Math.random() * 120);
        const newAngle = Math.random() * Math.PI * 2;
        snake.targetAngle = newAngle;
      }

      const diff = angleDiff(snake.angle, snake.targetAngle);
      snake.angle += Math.sign(diff) * Math.min(Math.abs(diff), snake.turnSpeed);

      const head = snake.segments[0];
      const newHead = {
        x: head.x + Math.cos(snake.angle) * snake.speed,
        y: head.y + Math.sin(snake.angle) * snake.speed,
      };

      if (newHead.x < -100) { newHead.x = width + 80; snake.targetAngle = Math.random() * (Math.PI / 2) - Math.PI / 4; }
      if (newHead.x > width + 100) { newHead.x = -80; snake.targetAngle = Math.PI + (Math.random() * (Math.PI / 2) - Math.PI / 4); }
      if (newHead.y < -100) { newHead.y = height + 80; snake.targetAngle = Math.PI / 2 + (Math.random() * (Math.PI / 2) - Math.PI / 4); }
      if (newHead.y > height + 100) { newHead.y = -80; snake.targetAngle = -Math.PI / 2 + (Math.random() * (Math.PI / 2) - Math.PI / 4); }

      snake.segments.unshift(newHead);
      if (snake.segments.length > snake.length) {
        snake.segments.pop();
      }
    }

    function drawSnake(snake: Snake) {
      if (snake.segments.length < 2) return;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let pass = 0; pass < 3; pass++) {
        const isGlow = pass < 2;
        const glowBlur = pass === 0 ? 30 : pass === 1 ? 12 : 0;
        const alpha = pass === 0 ? 0.15 : pass === 1 ? 0.35 : 1;
        const lineWidth = pass === 0 ? snake.width * 3 : pass === 1 ? snake.width * 1.6 : snake.width;

        ctx.beginPath();
        ctx.moveTo(snake.segments[0].x, snake.segments[0].y);

        for (let i = 1; i < snake.segments.length - 1; i++) {
          const mx = (snake.segments[i].x + snake.segments[i + 1].x) / 2;
          const my = (snake.segments[i].y + snake.segments[i + 1].y) / 2;
          ctx.quadraticCurveTo(snake.segments[i].x, snake.segments[i].y, mx, my);
        }

        const last = snake.segments[snake.segments.length - 1];
        ctx.lineTo(last.x, last.y);

        const gradient = ctx.createLinearGradient(
          snake.segments[0].x, snake.segments[0].y,
          last.x, last.y
        );
        gradient.addColorStop(0, snake.color + Math.round(alpha * 255).toString(16).padStart(2, "0"));
        gradient.addColorStop(0.5, snake.color + Math.round(alpha * 0.6 * 255).toString(16).padStart(2, "0"));
        gradient.addColorStop(1, snake.color + "00");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = lineWidth;
        if (isGlow) {
          ctx.shadowBlur = glowBlur;
          ctx.shadowColor = snake.glowColor;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
      }

      const head = snake.segments[0];
      ctx.shadowBlur = 20;
      ctx.shadowColor = snake.glowColor;
      ctx.fillStyle = snake.color;
      ctx.beginPath();
      ctx.arc(head.x, head.y, snake.width * 0.7, 0, Math.PI * 2);
      ctx.fill();

      const eyeAngle1 = snake.angle + 0.5;
      const eyeAngle2 = snake.angle - 0.5;
      const eyeDist = snake.width * 0.4;
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(head.x + Math.cos(eyeAngle1) * eyeDist, head.y + Math.sin(eyeAngle1) * eyeDist, snake.width * 0.18, 0, Math.PI * 2);
      ctx.arc(head.x + Math.cos(eyeAngle2) * eyeDist, head.y + Math.sin(eyeAngle2) * eyeDist, snake.width * 0.18, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawFood(food: Food, time: number) {
      const yOffset = Math.sin(food.floatOffset + time * food.floatSpeed) * 4;
      const pulse = 0.7 + 0.3 * Math.sin(food.floatOffset + time * food.floatSpeed * 1.5);

      ctx.save();
      ctx.shadowBlur = 15 * pulse;
      ctx.shadowColor = food.color;
      ctx.fillStyle = food.color;
      ctx.globalAlpha = 0.85 * pulse;
      ctx.beginPath();
      ctx.arc(food.x, food.y + yOffset, food.size * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 5;
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(food.x - food.size * 0.25, food.y + yOffset - food.size * 0.25, food.size * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function render() {
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = "rgba(5, 3, 15, 0.92)";
      ctx.fillRect(0, 0, width, height);

      for (const food of foods) {
        drawFood(food, frame);
      }

      for (const snake of snakes) {
        updateSnake(snake);
        drawSnake(snake);
      }

      frame++;
      animRef.current = requestAnimationFrame(render);
    }

    render();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", handleResize);
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
