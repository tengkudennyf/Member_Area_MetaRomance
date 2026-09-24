"use client";

import type React from "react";

// §6 BoardUI patterns + tokens. Member LOW density, admin MED/HIGH via class.
export function PageHeader({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="font-semibold text-[24px] tracking-tight text-foreground">{title}</h1>
        {desc && <p className="text-faint text-[14px] leading-relaxed mt-1 max-w-xl">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface border border-border rounded-xl p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  href,
  variant = "primary",
  type,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "ghost" | "danger";
  type?: "submit" | "button";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 text-[13px] font-medium rounded-md px-4 py-2 h-10 transition active:scale-[0.98] disabled:opacity-50";
  const styles = {
    primary: "bg-accent text-on-accent hover:bg-accent-hover font-medium shadow-sm",
    ghost: "border border-border hover:bg-surface2 text-foreground bg-surface shadow-sm",
    danger: "border border-danger/20 text-danger hover:bg-danger/10 bg-danger/5",
  } as const;
  const cls = `${base} ${styles[variant]} ${className}`;
  if (href)
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  return (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export const inputCls =
  "w-full bg-background border border-border text-[13px] px-3 py-2 h-10 rounded-md outline-none focus:border-accent focus:ring-1 focus:ring-accent transition placeholder:text-faint/60";

export const labelCls = "block text-foreground font-medium text-[13px] mb-1.5";

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block mb-4">
      <span className={labelCls}>{label}</span>
      {children}
      {error && <span className="block text-danger text-[12px] mt-1.5">{error}</span>}
    </label>
  );
}

export function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md border ${tone}`}
    >
      {children}
    </span>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 bg-surface border border-border rounded-lg p-1 shadow-sm">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`text-[12px] px-3 py-1.5 rounded-md transition ${
            value === o.value
              ? "bg-accent text-on-accent font-medium shadow-sm"
              : "text-faint hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="text-center py-12 flex flex-col items-center justify-center">
      <p className="font-semibold text-[15px] mb-1 text-foreground">{title}</p>
      {desc && <p className="text-faint text-[13px] mb-5 max-w-sm">{desc}</p>}
      {action}
    </Card>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-xl p-6 w-full max-w-md animate-in shadow-xl">
        <h3 className="font-semibold text-[18px] tracking-tight mb-4 text-foreground">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Confirm({
  open,
  title,
  desc,
  confirmLabel = "Ya, lanjutkan",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  desc?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      {desc && <p className="text-faint text-[13px] mb-5">{desc}</p>}
      <div className="flex gap-2 justify-end">
        <Btn variant="ghost" onClick={onCancel}>
          Batal
        </Btn>
        <Btn onClick={onConfirm}>{confirmLabel}</Btn>
      </div>
    </Modal>
  );
}
