"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const notConfigured = error.message.includes("SUPABASE_NOT_CONFIGURED");
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <p className="font-display text-[26px] mb-2">
          {notConfigured ? "Supabase belum diset" : "Terjadi kendala"}
        </p>
        <p className="text-faint text-[13px] mb-5 leading-relaxed">
          {notConfigured
            ? "Database belum tersambung. Ikuti panduan 10 menit di halaman Setup — setelah itu aplikasi jalan penuh."
            : "Coba muat ulang. Bila berlanjut, hubungi admin."}
        </p>
        <div className="flex gap-2 justify-center">
          {notConfigured ? (
            <Link
              href="/setup"
              className="bg-accent text-[#202940] font-semibold text-[13px] px-5 py-3 rounded-xl"
            >
              Buka panduan Setup →
            </Link>
          ) : (
            <button
              onClick={reset}
              className="bg-accent text-[#202940] font-semibold text-[13px] px-5 py-3 rounded-xl"
            >
              Muat ulang
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
