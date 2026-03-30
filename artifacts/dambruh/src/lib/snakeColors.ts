export interface SnakeColor {
  id: string;
  name: string;
  color: string;
  glow: string;
}

export const SNAKE_COLORS: SnakeColor[] = [
  { id: "neon-green",   name: "Neon Green",    color: "#00ff88", glow: "#00ff88" },
  { id: "purple",       name: "Purple",         color: "#a855f7", glow: "#a855f7" },
  { id: "electric-blue",name: "Electric Blue",  color: "#3b82f6", glow: "#3b82f6" },
  { id: "cyan",         name: "Cyan",           color: "#22d3ee", glow: "#22d3ee" },
  { id: "pink",         name: "Hot Pink",       color: "#ec4899", glow: "#ec4899" },
  { id: "orange",       name: "Orange",         color: "#f97316", glow: "#f97316" },
  { id: "yellow",       name: "Yellow",         color: "#eab308", glow: "#eab308" },
  { id: "red",          name: "Red",            color: "#ef4444", glow: "#ef4444" },
  { id: "lime",         name: "Lime",           color: "#84cc16", glow: "#84cc16" },
  { id: "teal",         name: "Teal",           color: "#14b8a6", glow: "#14b8a6" },
  { id: "indigo",       name: "Indigo",         color: "#6366f1", glow: "#6366f1" },
  { id: "rose",         name: "Rose",           color: "#fb7185", glow: "#fb7185" },
  { id: "amber",        name: "Amber",          color: "#f59e0b", glow: "#f59e0b" },
  { id: "sky",          name: "Sky",            color: "#38bdf8", glow: "#38bdf8" },
  { id: "violet",       name: "Violet",         color: "#7c3aed", glow: "#7c3aed" },
  { id: "emerald",      name: "Emerald",        color: "#10b981", glow: "#10b981" },
  { id: "fuchsia",      name: "Fuchsia",        color: "#d946ef", glow: "#d946ef" },
  { id: "gold",         name: "Gold",           color: "#fbbf24", glow: "#fbbf24" },
  { id: "mint",         name: "Mint",           color: "#6ee7b7", glow: "#6ee7b7" },
  { id: "coral",        name: "Coral",          color: "#ff6b6b", glow: "#ff6b6b" },
];

export const DEFAULT_COLOR_ID = "neon-green";
