import { useState } from "react";
import { register } from "@/lib/auth";
import { generateDemoTransactions } from "@/lib/transactions";
import { useAuth } from "@/contexts/AuthContext";
import {
  Overlay, ModalBox, ModalTitle, Field, Input, GoldButton, ErrorMsg, SuccessMsg, TextBtn, SelectInput,
} from "./LoginModal";

const BANKS = [
  { value: "BCA", label: "BCA" },
  { value: "BRI", label: "BRI" },
  { value: "DANA", label: "DANA" },
  { value: "BSI", label: "BSI" },
  { value: "BNI", label: "BNI" },
  { value: "GOPAY", label: "GoPay" },
];

interface Props {
  onClose: () => void;
  onLogin: () => void;
}

export default function RegisterModal({ onClose, onLogin }: Props) {
  const { refresh } = useAuth();
  const [form, setForm] = useState({ username: "", password: "", confirm: "", bank: "", bankOwner: "", bankNumber: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setTimeout(() => {
      const result = register({
        username: form.username.trim(),
        password: form.password,
        confirmPassword: form.confirm,
        bank: form.bank,
        bankOwner: form.bankOwner.trim(),
        bankNumber: form.bankNumber.trim(),
      });
      if (!result.ok) {
        setError(result.error ?? "Terjadi kesalahan.");
      } else {
        generateDemoTransactions(form.username.trim());
        refresh();
        setSuccess("Akun berhasil dibuat! Anda sudah masuk otomatis.");
        setTimeout(onClose, 1200);
      }
      setLoading(false);
    }, 500);
  };

  return (
    <Overlay onClose={onClose}>
      <ModalBox>
        <ModalTitle>Daftar Akun</ModalTitle>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-5">
          <Field label="Nama Pengguna">
            <Input value={form.username} onChange={set("username")} placeholder="Buat nama pengguna" />
          </Field>
          <Field label="Kata Sandi">
            <Input type="password" value={form.password} onChange={set("password")} placeholder="Buat kata sandi" />
          </Field>
          <Field label="Konfirmasi Kata Sandi">
            <Input type="password" value={form.confirm} onChange={set("confirm")} placeholder="Ulangi kata sandi" />
          </Field>
          <Field label="Pilih Bank">
            <SelectInput
              value={form.bank}
              onChange={(v) => setForm((f) => ({ ...f, bank: v }))}
              options={BANKS}
              placeholder="— Pilih Bank —"
            />
          </Field>
          <Field label="Nama Pemilik Rekening">
            <Input value={form.bankOwner} onChange={set("bankOwner")} placeholder="Sesuai nama rekening" />
          </Field>
          <Field label="Nomor Rekening">
            <Input value={form.bankNumber} onChange={set("bankNumber")} placeholder="Nomor rekening" />
          </Field>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          {success && <SuccessMsg>{success}</SuccessMsg>}
          <GoldButton type="submit" disabled={loading}>
            {loading ? "Memproses..." : "Daftar Sekarang"}
          </GoldButton>
        </form>
        <div className="flex justify-center mt-4">
          <TextBtn onClick={onLogin}>Sudah punya akun? Masuk</TextBtn>
        </div>
      </ModalBox>
    </Overlay>
  );
}
