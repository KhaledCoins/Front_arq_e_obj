import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface FieldWrapProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  trailing?: ReactNode;
}

export function FieldWrap({ label, hint, error, htmlFor, children, trailing }: FieldWrapProps) {
  return (
    <div className="field">
      {(label || trailing) && (
        <label className="field__label" htmlFor={htmlFor}>
          <span>{label}</span>
          {trailing && <span className="field__hint">{trailing}</span>}
        </label>
      )}
      {children}
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, trailing, id, className, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={inputId} trailing={trailing}>
      <input
        ref={ref}
        id={inputId}
        className={["input", className].filter(Boolean).join(" ")}
        aria-invalid={error ? "true" : undefined}
        {...rest}
      />
    </FieldWrap>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  trailing?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, trailing, id, className, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={inputId} trailing={trailing}>
      <textarea
        ref={ref}
        id={inputId}
        className={["textarea", className].filter(Boolean).join(" ")}
        aria-invalid={error ? "true" : undefined}
        {...rest}
      />
    </FieldWrap>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, id, className, children, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={inputId}>
      <select ref={ref} id={inputId} className={["select", className].filter(Boolean).join(" ")} {...rest}>
        {children}
      </select>
    </FieldWrap>
  );
});
