import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="center-fill" role="status" aria-live="polite">
      <span className="spinner" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <div className="empty__title">{title}</div>
      {description && <div className="empty__desc">{description}</div>}
      {action}
    </div>
  );
}

export function CopyId({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponível */
    }
  }
  return (
    <span className="copy-id" title={value}>
      {label && <span>{label}</span>}
      <code>{value}</code>
      <button type="button" onClick={copy} aria-label="Copiar ID">
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </span>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={["progress", className].filter(Boolean).join(" ")} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={["progress__bar", pct === 100 && "progress__bar--done"].filter(Boolean).join(" ")} style={{ width: `${pct}%` }} />
    </div>
  );
}
