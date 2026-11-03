import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  size?: "md" | "lg" | "xl";
  children: ReactNode;
  footer?: ReactNode;
  footerBetween?: boolean;
  /** Renderiza `children` sem header/body padrão (layout customizado). */
  bare?: boolean;
  className?: string;
}

export function Modal({ open, onClose, title, subtitle, size = "md", children, footer, footerBetween, bare, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // foco inicial
    const t = window.setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>("[data-autofocus], input, textarea, select, button");
      el?.focus();
    }, 20);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={["modal", size !== "md" && `modal--${size}`, className].filter(Boolean).join(" ")}
      >
        {bare ? (
          children
        ) : (
          <>
            <div className="modal__header">
              <div>
                {title && <h2 className="modal__title">{title}</h2>}
                {subtitle && <p className="modal__subtitle">{subtitle}</p>}
              </div>
              <Button variant="ghost" iconOnly icon={<X size={18} />} onClick={onClose} aria-label="Fechar">
                Fechar
              </Button>
            </div>
            <div className="modal__body">{children}</div>
            {footer && <div className={["modal__footer", footerBetween && "modal__footer--between"].filter(Boolean).join(" ")}>{footer}</div>}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
