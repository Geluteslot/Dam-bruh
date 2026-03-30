import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const GOLD = "#fbbf24";
const GOLD_DIM = "#f59e0b";
const GOLD_DEEP = "#d97706";
const GOLD_GLOW = "rgba(251,191,36,";

interface Props {
  onClose: () => void;
  onRegister: () => void;
  onForgot: () => void;
}

export default function LoginModal({ onClose, onRegister, onForgot }: Props) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      const result = login(username.trim(), password);
      if (!result.ok) setError(result.error ?? "Terjadi kesalahan.");
      else onClose();
      setLoading(false);
    }, 400);
  };

  return (
    <Overlay onClose={onClose}>
      <ModalBox>
        <ModalTitle>Masuk</ModalTitle>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-5">
          <Field label="Nama Pengguna">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Masukkan nama pengguna" />
          </Field>
          <Field label="Kata Sandi">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan kata sandi" />
          </Field>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <GoldButton type="submit" disabled={loading}>
            {loading ? "Memproses..." : "Masuk"}
          </GoldButton>
        </form>
        <div className="flex justify-between mt-4">
          <TextBtn onClick={onForgot}>Lupa Kata Sandi</TextBtn>
          <TextBtn onClick={onRegister}>Daftar Akun</TextBtn>
        </div>
      </ModalBox>
    </Overlay>
  );
}

// ---- shared primitives ----

export function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ zIndex: 1000, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function ModalBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full max-w-md rounded-2xl p-6"
      style={{
        background: "rgba(13,9,0,0.96)",
        border: `1px solid ${GOLD_GLOW}0.3)`,
        boxShadow: `0 0 60px ${GOLD_GLOW}0.15), 0 0 0 1px ${GOLD_GLOW}0.1)`,
        animation: "modalIn 0.22s ease-out",
      }}
    >
      {children}
    </div>
  );
}

export function ModalTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-black uppercase tracking-widest text-xl text-center"
      style={{ color: GOLD, textShadow: `0 0 16px ${GOLD_GLOW}0.55)` }}
    >
      {children}
    </h2>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs uppercase tracking-wider font-semibold" style={{ color: "#a08040" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function Input({
  type = "text",
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  type?: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className="rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all"
      style={{
        background: readOnly ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${GOLD_GLOW}${readOnly ? "0.1" : "0.2"})`,
        color: readOnly ? "#7a6030" : "#fff",
        cursor: readOnly ? "not-allowed" : "text",
      }}
      onFocus={(e) => {
        if (!readOnly) (e.target as HTMLInputElement).style.borderColor = `${GOLD_GLOW}0.55)`;
      }}
      onBlur={(e) => {
        if (!readOnly) (e.target as HTMLInputElement).style.borderColor = `${GOLD_GLOW}0.2)`;
      }}
    />
  );
}

export function GoldButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all duration-200"
      style={{
        background: disabled
          ? "rgba(255,255,255,0.05)"
          : `linear-gradient(135deg, ${GOLD_DEEP}, ${GOLD_DIM} 50%, ${GOLD})`,
        color: disabled ? "#4b4030" : "#1a0e00",
        boxShadow: disabled ? "none" : `0 0 24px ${GOLD_GLOW}0.4)`,
        border: disabled ? `1px solid ${GOLD_GLOW}0.1)` : "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLElement).style.boxShadow = `0 0 36px ${GOLD_GLOW}0.65)`;
      }}
      onMouseLeave={(e) => {
        if (!disabled) (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${GOLD_GLOW}0.4)`;
      }}
    >
      {children}
    </button>
  );
}

export function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm font-medium"
      style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
    >
      {children}
    </div>
  );
}

export function SuccessMsg({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm font-medium"
      style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}
    >
      {children}
    </div>
  );
}

export function TextBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-semibold transition-colors"
      style={{ color: GOLD_DIM }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = GOLD; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = GOLD_DIM; }}
    >
      {children}
    </button>
  );
}

export function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-all"
      style={{ color: "#7a6030" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${GOLD_GLOW}0.12)`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all appearance-none"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${GOLD_GLOW}0.2)`,
        color: value ? "#fff" : "#7a6030",
      }}
      onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = `${GOLD_GLOW}0.55)`; }}
      onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = `${GOLD_GLOW}0.2)`; }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: "#1a0e00" }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
