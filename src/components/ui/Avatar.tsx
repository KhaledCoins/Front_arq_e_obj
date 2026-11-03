import { UserRound } from "lucide-react";
import type { CSSProperties } from "react";
import { hueFromString, initialsFromEmail } from "@/lib/format";

interface AvatarProps {
  email?: string | null;
  size?: "sm" | "md" | "lg";
  title?: string;
  className?: string;
}

export function Avatar({ email, size = "md", title, className }: AvatarProps) {
  const classes = ["avatar", size !== "md" && `avatar--${size}`, !email && "avatar--empty", className]
    .filter(Boolean)
    .join(" ");
  if (!email) {
    return (
      <span className={classes} title={title ?? "Sem responsável"} aria-label="Sem responsável">
        <UserRound size={12} />
      </span>
    );
  }
  const style = { "--hue": hueFromString(email) } as CSSProperties;
  return (
    <span className={classes} style={style} title={title ?? email} aria-label={email}>
      {initialsFromEmail(email)}
    </span>
  );
}

export function AvatarStack({ emails, max = 4 }: { emails: string[]; max?: number }) {
  const shown = emails.slice(0, max);
  const rest = emails.length - shown.length;
  return (
    <span className="avatar-stack">
      {shown.map((e) => (
        <Avatar key={e} email={e} />
      ))}
      {rest > 0 && <span className="avatar-stack__more">+{rest}</span>}
    </span>
  );
}
