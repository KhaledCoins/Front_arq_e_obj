import { useEffect, useRef, useState, type ReactNode } from "react";

interface MenuProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function Menu({ trigger, children, align = "right", className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={["menu-anchor", className].filter(Boolean).join(" ")}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div className={`menu menu--${align}`} role="menu" style={{ top: "100%" }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function MenuItem({ icon, danger, disabled, onClick, children }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={["menu__item", danger && "menu__item--danger"].filter(Boolean).join(" ")}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export const MenuSep = () => <div className="menu__sep" role="separator" />;
export const MenuLabel = ({ children }: { children: ReactNode }) => <div className="menu__label">{children}</div>;
