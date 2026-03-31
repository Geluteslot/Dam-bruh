import { useState } from "react";
import { changePassword } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { getGameSettings, saveGameSettings, GameSettings } from "@/lib/gameSettings";
import {
  Overlay, ModalBox, ModalTitle, Field, Input, GoldButton, ErrorMsg, SuccessMsg, CloseBtn,
} from "./LoginModal";

const GOLD = "#fbbf24";
const GOLD_GLOW = "rgba(251,191,36,";

interface Props {
  onClose: () => void;
  onHistory: () => void;
}

export default function ProfileModal({ onClose, onHistory }: Props) {
  const { user, refresh, logout } = useAuth();
  const [newPw, setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [settings, setSettings] = useState<GameSettings>(() => getGameSettings());

  if (!user) return null;

  const handleChangePw = (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!newPw) return setError("Kata sandi baru wajib diisi.");
    if (newPw !== confirmPw) return setError("Konfirmasi kata sandi tidak cocok.");
    changePassword(user.username, newPw);
    refresh(); setNewPw(""); setConfirmPw("");
    setSuccess("Kata sandi berhasil diubah.");
  };

  const updateSetting = <K extends keyof GameSettings>(key: K, val: GameSettings[K]) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    saveGameSettings(updated);
  };

  return (
    <Overlay onClose={onClose}>
      <ModalBox>
        <div className="relative">
          <CloseBtn onClick={onClose} />
          <ModalTitle>Profil</ModalTitle>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mt-5 mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl"
            style={{ background: `linear-gradient(135deg, #d97706, #fbbf24)`, color: "#1a0e00", boxShadow: `0 0 28px ${GOLD_GLOW}0.5)` }}
          >
            {user.username.slice(0, 1).toUpperCase()}
          </div>
          <p className="mt-2 font-bold text-white text-base">{user.username}</p>
          <p className="text-xs mt-0.5" style={{ color: "#7a6030" }}>
            Saldo: <span style={{ color: GOLD, fontWeight: 700 }}>Rp{user.balance.toLocaleString("id-ID")}</span>
          </p>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-3 mb-5">
          <InfoRow label="Nama Pengguna" value={user.username} />
          <InfoRow label="Kata Sandi" value="••••••••" />
          <InfoRow label="Bank" value={user.bank} locked />
          <InfoRow label="Nama Pemilik Rekening" value={user.bankOwner} locked />
          <InfoRow label="Nomor Rekening" value={user.bankNumber} locked />
        </div>

        {/* Game Settings */}
        <div className="rounded-xl p-4 mb-4" style={{ background: `${GOLD_GLOW}0.04)`, border: `1px solid ${GOLD_GLOW}0.15)` }}>
          <p className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: "#7a6030" }}>
            ⚙️ Pengaturan Kontrol
          </p>
          <div className="flex flex-col gap-3">
            <SettingToggle
              label="Posisi Analog"
              leftLabel="Kiri"
              rightLabel="Kanan"
              value={settings.joystick}
              onChange={(v) => updateSetting("joystick", v)}
            />
            <SettingToggle
              label="Tombol Cashout"
              leftLabel="Kiri"
              rightLabel="Kanan"
              value={settings.cashout}
              onChange={(v) => updateSetting("cashout", v)}
            />
          </div>
          <p className="text-xs mt-3" style={{ color: "#4a3820" }}>
            Pengaturan berlaku di game berikutnya
          </p>
        </div>

        {/* Change password */}
        <div className="rounded-xl p-4 mb-4" style={{ background: `${GOLD_GLOW}0.04)`, border: `1px solid ${GOLD_GLOW}0.15)` }}>
          <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#7a6030" }}>
            Ubah Kata Sandi
          </p>
          <form onSubmit={handleChangePw} className="flex flex-col gap-3">
            <Field label="Kata Sandi Baru">
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Kata sandi baru" />
            </Field>
            <Field label="Konfirmasi Kata Sandi Baru">
              <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Ulangi kata sandi baru" />
            </Field>
            {error && <ErrorMsg>{error}</ErrorMsg>}
            {success && <SuccessMsg>{success}</SuccessMsg>}
            <GoldButton type="submit">Simpan Kata Sandi</GoldButton>
          </form>
        </div>

        {/* Riwayat */}
        <button
          onClick={onHistory}
          className="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 mb-3"
          style={{ background: `${GOLD_GLOW}0.07)`, border: `1px solid ${GOLD_GLOW}0.25)`, color: "#f59e0b" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${GOLD_GLOW}0.16)`; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = `${GOLD_GLOW}0.07)`; }}
        >
          📋 Riwayat Transaksi
        </button>

        {/* Logout */}
        <div className="rounded-xl p-3 mt-1" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.18)" }}>
          <p className="text-xs uppercase tracking-widest font-semibold mb-2.5 text-center" style={{ color: "rgba(239,68,68,0.5)" }}>
            Keluar dari Akun
          </p>
          <button
            onClick={() => { logout(); onClose(); }}
            className="w-full py-3 rounded-xl font-black text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-200"
            style={{ background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.4)", color: "#f87171", boxShadow: "0 0 12px rgba(239,68,68,0.1)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.22)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(239,68,68,0.25)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px rgba(239,68,68,0.1)"; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </ModalBox>
    </Overlay>
  );
}

function InfoRow({ label, value, locked }: { label: string; value: string; locked?: boolean }) {
  const GG = "rgba(251,191,36,";
  return (
    <div className="flex justify-between items-center rounded-xl px-4 py-2.5"
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GG}0.08)` }}
    >
      <span className="text-xs" style={{ color: "#7a6030" }}>{label}</span>
      <div className="flex items-center gap-2">
        {locked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7a6030" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        )}
        <span className="text-sm font-semibold" style={{ color: locked ? "#7a6030" : "#e5d9b8" }}>{value}</span>
      </div>
    </div>
  );
}

function SettingToggle({
  label, leftLabel, rightLabel, value, onChange,
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: "left" | "right";
  onChange: (v: "left" | "right") => void;
}) {
  const GG = "rgba(251,191,36,";
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "#c8b888" }}>{label}</span>
      <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${GG}0.2)`, background: "rgba(0,0,0,0.3)" }}>
        {(["left", "right"] as const).map((side) => (
          <button
            key={side}
            onClick={() => onChange(side)}
            className="px-3 py-1.5 text-xs font-bold transition-all duration-200"
            style={{
              background: value === side ? `linear-gradient(135deg, #d97706, #fbbf24)` : "transparent",
              color: value === side ? "#1a0e00" : "#a08040",
              minWidth: 52,
            }}
          >
            {side === "left" ? leftLabel : rightLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
