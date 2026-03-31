export const SETTINGS_KEY = "dambruh_settings_v1";
export interface GameSettings {
  joystick: "left" | "right";
  cashout: "left" | "right";
}
export function getGameSettings(): GameSettings {
  try {
    return { joystick: "left", cashout: "right", ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch { return { joystick: "left", cashout: "right" }; }
}
export function saveGameSettings(s: Partial<GameSettings>) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...getGameSettings(), ...s }));
}
