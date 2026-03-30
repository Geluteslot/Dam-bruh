export type TransactionType = "Deposit" | "Tarik Dana" | "Masuk Game" | "Menang" | "Kalah";
export type TransactionStatus = "Berhasil" | "Pending" | "Gagal";

export interface Transaction {
  id: string;
  username: string;
  type: TransactionType;
  amount: number;
  date: string;
  status: TransactionStatus;
}

const TX_KEY = "dambruh_transactions";

export function getTransactions(username?: string): Transaction[] {
  try {
    const all: Transaction[] = JSON.parse(localStorage.getItem(TX_KEY) || "[]");
    if (!username) return all;
    return all.filter((t) => t.username === username);
  } catch {
    return [];
  }
}

export function addTransaction(tx: Omit<Transaction, "id" | "date">) {
  const all = getTransactions();
  const newTx: Transaction = {
    ...tx,
    id: Math.random().toString(36).slice(2),
    date: new Date().toISOString(),
  };
  localStorage.setItem(TX_KEY, JSON.stringify([newTx, ...all]));
  return newTx;
}

export function generateDemoTransactions(username: string) {
  const existing = getTransactions(username);
  if (existing.length > 0) return;
  const demos: Omit<Transaction, "id">[] = [
    { username, type: "Deposit", amount: 100000, date: new Date(Date.now() - 86400000 * 3).toISOString(), status: "Berhasil" },
    { username, type: "Masuk Game", amount: -10000, date: new Date(Date.now() - 86400000 * 2).toISOString(), status: "Berhasil" },
    { username, type: "Menang", amount: 18000, date: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(), status: "Berhasil" },
    { username, type: "Masuk Game", amount: -10000, date: new Date(Date.now() - 86400000).toISOString(), status: "Berhasil" },
    { username, type: "Kalah", amount: -10000, date: new Date(Date.now() - 86400000 + 3600000).toISOString(), status: "Berhasil" },
    { username, type: "Tarik Dana", amount: -50000, date: new Date(Date.now() - 3600000).toISOString(), status: "Pending" },
  ];
  const all = getTransactions();
  const newTxs = demos.map((d) => ({ ...d, id: Math.random().toString(36).slice(2) }));
  localStorage.setItem(TX_KEY, JSON.stringify([...newTxs, ...all]));
}

export function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs >= 1000 ? `Rp${(abs / 1000).toFixed(0)}rb` : `Rp${abs}`;
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
