import { useState } from "react";
import { resetPassword } from "@/lib/auth";
import {
  Overlay, ModalBox, ModalTitle, Field, Input, GoldButton, ErrorMsg, SuccessMsg, TextBtn,
} from "./LoginModal";

interface Props {
  onClose: () => void;
  onLogin: () => void;
}

export default function ForgotPasswordModal({ onClose, onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [bankOwner, setBankOwner] = useState("");
  const [bankNumber, setBankNumber] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ newPassword: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      const res = resetPassword(username.trim(), bankOwner.trim(), bankNumber.trim());
      if (!res.ok) {
        setError(res.error ?? "Terjadi kesalahan.");
      } else {
        setResult({ newPassword: res.newPassword! });
      }
      setLoading(false);
    }, 500);
  };

  return (
    <Overlay onClose={onClose}>
      <ModalBox>
        <ModalTitle>Lupa Kata Sandi</ModalTitle>
        {result ? (
          <div className="flex flex-col gap-4 mt-5">
            <SuccessMsg>
              Kata sandi berhasil direset. Wajib ganti kembali setelah masuk.
            </SuccessMsg>
            <div
              className="rounded-xl px-4 py-3 text-center font-black tracking-widest text-lg"
              style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.35)", color: "#fbbf24" }}
            >
              {result.newPassword}
            </div>
            <p className="text-xs text-center" style={{ color: "#7a6030" }}>
              Catat kata sandi di atas lalu segera ganti setelah masuk.
            </p>
            <GoldButton onClick={onLogin}>Masuk Sekarang</GoldButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-5">
            <Field label="Nama Pengguna">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nama pengguna terdaftar" />
            </Field>
            <Field label="Nama Pemilik Rekening">
              <Input value={bankOwner} onChange={(e) => setBankOwner(e.target.value)} placeholder="Sesuai data pendaftaran" />
            </Field>
            <Field label="Nomor Rekening">
              <Input value={bankNumber} onChange={(e) => setBankNumber(e.target.value)} placeholder="Sesuai data pendaftaran" />
            </Field>
            {error && <ErrorMsg>{error}</ErrorMsg>}
            <GoldButton type="submit" disabled={loading}>
              {loading ? "Memproses..." : "Reset Kata Sandi"}
            </GoldButton>
          </form>
        )}
        <div className="flex justify-center mt-4">
          <TextBtn onClick={onLogin}>Kembali ke Masuk</TextBtn>
        </div>
      </ModalBox>
    </Overlay>
  );
}
