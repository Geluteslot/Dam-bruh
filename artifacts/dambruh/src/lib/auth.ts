export interface User {
  username: string;
  password: string;
  bank: string;
  bankOwner: string;
  bankNumber: string;
  balance: number;
  createdAt: string;
}

const USERS_KEY = "dambruh_users";
const SESSION_KEY = "dambruh_session";

export function getUsers(): User[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getCurrentUser(): User | null {
  try {
    const username = localStorage.getItem(SESSION_KEY);
    if (!username) return null;
    const users = getUsers();
    return users.find((u) => u.username === username) ?? null;
  } catch {
    return null;
  }
}

export function login(username: string, password: string): { ok: boolean; error?: string } {
  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return { ok: false, error: "Nama pengguna tidak ditemukan." };
  if (user.password !== password) return { ok: false, error: "Kata sandi salah." };
  localStorage.setItem(SESSION_KEY, username);
  return { ok: true };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function register(data: {
  username: string;
  password: string;
  confirmPassword: string;
  bank: string;
  bankOwner: string;
  bankNumber: string;
}): { ok: boolean; error?: string } {
  if (!data.username || !data.password || !data.confirmPassword || !data.bank || !data.bankOwner || !data.bankNumber) {
    return { ok: false, error: "Semua kolom wajib diisi." };
  }
  if (data.password !== data.confirmPassword) {
    return { ok: false, error: "Kata sandi tidak cocok dengan konfirmasi." };
  }
  const users = getUsers();
  if (users.find((u) => u.username === data.username)) {
    return { ok: false, error: "Nama pengguna sudah digunakan." };
  }
  const newUser: User = {
    username: data.username,
    password: data.password,
    bank: data.bank,
    bankOwner: data.bankOwner,
    bankNumber: data.bankNumber,
    balance: 50000,
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, newUser]);
  localStorage.setItem(SESSION_KEY, data.username);
  return { ok: true };
}

export function changePassword(username: string, newPassword: string) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.username === username);
  if (idx === -1) return;
  users[idx].password = newPassword;
  saveUsers(users);
}

export function resetPassword(username: string, bankOwner: string, bankNumber: string): { ok: boolean; newPassword?: string; error?: string } {
  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return { ok: false, error: "Nama pengguna tidak ditemukan." };
  if (user.bankOwner !== bankOwner || user.bankNumber !== bankNumber) {
    return { ok: false, error: "Data tidak cocok dengan yang tersimpan." };
  }
  const newPassword = Math.random().toString(36).slice(-8);
  changePassword(username, newPassword);
  return { ok: true, newPassword };
}

export function updateBalance(username: string, delta: number) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.username === username);
  if (idx === -1) return;
  users[idx].balance = Math.max(0, users[idx].balance + delta);
  saveUsers(users);
}
