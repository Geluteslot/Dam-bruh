import { useState, useMemo } from "react";
import { getTransactions, formatAmount, formatDate, TransactionType } from "@/lib/transactions";
import { useAuth } from "@/contexts/AuthContext";
import { Overlay, ModalBox, ModalTitle, CloseBtn } from "./LoginModal";

const GOLD = "#fbbf24";
const GOLD_GLOW = "rgba(251,191,36,";

type Filter = "Semua" | "Deposit" | "Game" | "Tarik Dana";

const FILTERS: Filter[] = ["Semua", "Deposit", "Game", "Tarik Dana"];

const filterMap: Record<Filter, TransactionType[]> = {
  Semua: ["Deposit", "Tarik Dana", "Masuk Game", "Menang", "Kalah"],
  Deposit: ["Deposit"],
  Game: ["Masuk Game", "Menang", "Kalah"],
  "Tarik Dana": ["Tarik Dana"],
};

function txColor(type: TransactionType, amount: number): string {
  if (amount > 0) return "#4ade80";
  if (type === "Masuk Game" || type === "Kalah" || type === "Tarik Dana") return "#f87171";
  return GOLD;
}

function statusColor(status: string): string {
  if (status === "Berhasil") return "#4ade80";
  if (status === "Gagal") return "#f87171";
  return GOLD;
}

interface Props {
  onClose: () => void;
}

export default function TransactionModal({ onClose }: Props) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("Semua");

  const txs = useMemo(() => {
    if (!user) return [];
    return getTransactions(user.username).filter((t) =>
      filterMap[filter].includes(t.type)
    );
  }, [user, filter]);

  return (
    <Overlay onClose={onClose}>
      <ModalBox>
        <div className="relative">
          <CloseBtn onClick={onClose} />
          <ModalTitle>Riwayat Transaksi</ModalTitle>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200"
              style={{
                background: filter === f ? `linear-gradient(135deg, #d97706, #fbbf24)` : `${GOLD_GLOW}0.07)`,
                color: filter === f ? "#1a0e00" : "#f59e0b",
                border: filter === f ? "none" : `1px solid ${GOLD_GLOW}0.2)`,
                boxShadow: filter === f ? `0 0 14px ${GOLD_GLOW}0.4)` : "none",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="mt-4 flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
          {txs.length === 0 ? (
            <p className="text-center text-sm py-8" style={{ color: "#7a6030" }}>
              Belum ada transaksi.
            </p>
          ) : (
            txs.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD_GLOW}0.08)` }}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-sm text-white">{tx.type}</span>
                  <span className="text-xs" style={{ color: "#7a6030" }}>{formatDate(tx.date)}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span
                    className="font-black text-base"
                    style={{ color: txColor(tx.type, tx.amount), textShadow: `0 0 10px ${txColor(tx.type, tx.amount)}88` }}
                  >
                    {formatAmount(tx.amount)}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                    style={{
                      background: `${statusColor(tx.status)}18`,
                      border: `1px solid ${statusColor(tx.status)}44`,
                      color: statusColor(tx.status),
                    }}
                  >
                    {tx.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </ModalBox>
    </Overlay>
  );
}
