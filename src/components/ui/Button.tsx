import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconOnly?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, iconOnly, block, className, children, disabled, type = "button", ...rest },
  ref,
) {
  const classes = [
    "btn",
    `btn--${variant}`,
    size !== "md" && `btn--${size}`,
    iconOnly && "btn--icon",
    block && "btn--block",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <span className="btn__spinner" aria-hidden /> : icon}
      {!iconOnly && children}
      {iconOnly && <span className="sr-only">{children}</span>}
    </button>
  );
});
