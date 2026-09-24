import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <div>
        <p className="font-display text-[40px] text-accent">404</p>
        <p className="text-faint text-[13px] mb-5">Halaman tidak ditemukan.</p>
        <Link
          href="/member"
          className="bg-accent text-[#202940] font-semibold text-[13px] px-5 py-3 rounded-xl"
        >
          Ke Dashboard
        </Link>
      </div>
    </div>
  );
}
