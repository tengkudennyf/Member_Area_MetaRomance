"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

// Toast minimal (Phase 6 UX).
type Toast = { id: number; kind: "ok" | "err"; msg: string };
const Ctx = createContext<{ toast: (kind: Toast["kind"], msg: string) => void }>({
  toast: () => undefined,
});

export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const toast = useCallback((kind: Toast["kind"], msg: string) => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, kind, msg }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[60] space-y-2 max-w-xs">
        {items.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-2 bg-surface2 border border-border rounded-xl px-4 py-3 text-[13px] shadow-lg"
          >
            {t.kind === "ok" ? (
              <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
            ) : (
              <XCircle size={16} className="text-danger shrink-0 mt-0.5" />
            )}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
