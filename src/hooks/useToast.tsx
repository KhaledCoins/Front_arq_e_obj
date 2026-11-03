import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { ApiError } from "@/api/client";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (err: unknown, fallback?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function errorMessage(err: unknown, fallback = "Algo deu errado") {
  if (err instanceof ApiError) {
    const details = err.errors.length ? err.errors.join(" · ") : undefined;
    return { title: err.message || fallback, description: details };
  }
  if (err instanceof Error) return { title: err.message || fallback };
  return { title: fallback };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.kind === "error" ? 6500 : 3800);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ kind: "success", title, description }),
      info: (title, description) => toast({ kind: "info", title, description }),
      error: (err, fallback) => toast({ kind: "error", ...errorMessage(err, fallback) }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`} role="status">
            <span className="toast__icon" aria-hidden>
              {t.kind === "success" && <CheckCircle2 size={18} />}
              {t.kind === "error" && <AlertCircle size={18} />}
              {t.kind === "info" && <Info size={18} />}
            </span>
            <div className="toast__body">
              <div className="toast__title">{t.title}</div>
              {t.description && <div className="toast__desc">{t.description}</div>}
            </div>
            <button className="toast__close" onClick={() => dismiss(t.id)} aria-label="Fechar aviso">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  return ctx;
}
