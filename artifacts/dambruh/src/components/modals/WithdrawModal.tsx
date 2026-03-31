import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { addTransaction } from "@/lib/transactions";
import { updateBalance } from "@/lib/auth";
import { Overlay, ModalBox, ModalTitle, Field, Input, GoldButton, ErrorMsg, CloseBtn } from "./LoginModal";

const GOLD = "#fbbf24";
const GOLD_GLOW = "rgba(251,191,36,";

interface Props { onClose: () => void; }

export default function WithdrawModal({ onClose }: Props) {
  const { user, refresh } = useAuth();
  const [amount, setAmount]     = useState("");
  const [error, setError]       = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!user) return null;

  const numericAmount = parseInt(amount.replace(/\D/g, ""), 10) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!numericAmount || numericAmount < 10_000)
      return setError("Minimal penarikan Rp10.000");
    if (numericAmount > user.balance)
      return setError("Saldo tidak mencukupi.");
    addTransaction({ username: user.username, type: "Tarik Dana", amount: -numericAmount, status: "Pending" });
    updateBalance(user.username, -numericAmount);
    refresh();
    setSubmitted(true);
  };

  return (
    <Overlay onClose={onClose}>
      <ModalBox>
        <div className="relative">
          <CloseBtn onClick={onClose} />
          <ModalTitle>Tarik Dana</ModalTitle>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-5 mt-6 text-center">
            <div style={{ fontSize: "3.5rem" }}>⏳</div>
            <div>
              <p className="font-black text-lg text-white mb-1">Permintaan Diterima!</p>
              <p className="text-sm" style={{ color: "#94a3b8" }}>
                Penarikan sedang diproses, harap tunggu{" "}
                <span style={{ color: GOLD, fontWeight: 700 }}>3–5 menit</span>.
              </p>
            </div>
            <div className="rounded-xl px-5 py-3 w-full text-center"
              style={{ background: `${GOLD_GLOW}0.07)`, border: `1px solid ${GOLD_GLOW}0.2)` }}>
              <p style={{ color: "#7a6030", fontSize: 11 }}>Jumlah Penarikan</p>
              <p className="font-black text-2xl" style={{ color: GOLD }}>
                Rp{numericAmount.toLocaleString("id-ID")}
              </p>
            </div>
            <button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-sm"
              style={{ background: `${GOLD_GLOW}0.1)`, border: `1px solid ${GOLD_GLOW}0.3)`, color: GOLD }}>
              Tutup
            </button>
          </div>
        ) : (
          <>
            {/* Account info (readonly) */}
            <div className="mt-5 mb-4 rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD_GLOW}0.12)` }}>
              <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#7a6030" }}>
                🔒 Info Rekening Tujuan
              </p>
              <div className="flex flex-col gap-2.5">
                <InfoRow label="Bank" value={user.bank} />
                <InfoRow label="Pemilik Rekening" value={user.bankOwner} />
                <InfoRow label="Nomor Rekening" value={user.bankNumber} />
              </div>
              <p className="text-xs mt-3" style={{ color: "#4a3820" }}>
                Tidak dapat diubah setelah pendaftaran
              </p>
            </div>

            {/* Saldo tersedia */}
            <div className="flex items-center justify-between mb-4 rounded-xl px-4 py-2.5"
              style={{ background: `${GOLD_GLOW}0.06)`, border: `1px solid ${GOLD_GLOW}0.2)` }}>
              <span style={{ color: "#7a6030", fontSize: 12 }}>Saldo Tersedia</span>
              <span className="font-black" style={{ color: GOLD }}>Rp{user.balance.toLocaleString("id-ID")}</span>
            </div>

            {/* Amount form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Field label="Jumlah Penarikan (Rp)">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="Contoh: 50000"
                />
              </Field>
              {numericAmount >= 10_000 && (
                <p className="text-xs -mt-1" style={{ color: "#7a6030" }}>
                  Menarik: <span style={{ color: GOLD, fontWeight: 700 }}>Rp{numericAmount.toLocaleString("id-ID")}</span>
                </p>
              )}
              {error && <ErrorMsg>{error}</ErrorMsg>}
              <GoldButton type="submit">Kirim Permintaan</GoldButton>
            </form>
          </>
        )}
      </ModalBox>
    </Overlay>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span style={{ color: "#7a6030", fontSize: 12 }}>{label}</span>
      <span className="font-semibold text-sm" style={{ color: "#e5d9b8" }}>{value}</span>
    </div>
  );
}
