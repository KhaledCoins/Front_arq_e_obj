import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, KeyRound, LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Menu, MenuItem, MenuLabel, MenuSep } from "@/components/ui/Menu";
import { ChangePasswordModal } from "./ChangePasswordModal";

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="logo" style={{ width: size, height: size }} aria-hidden>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 32 32" fill="none">
        <rect x="5" y="6" width="6" height="20" rx="2" fill="#fff" />
        <rect x="13" y="6" width="6" height="14" rx="2" fill="#fff" opacity="0.75" />
        <rect x="21" y="6" width="6" height="9" rx="2" fill="#fff" opacity="0.5" />
      </svg>
    </span>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      iconOnly
      onClick={toggle}
      icon={theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      title={theme === "dark" ? "Tema claro" : "Tema escuro"}
    >
      Alternar tema
    </Button>
  );
}

export function AppShell({ crumbs, children }: { crumbs?: ReactNode; children: ReactNode }) {
  const { user, logout } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="topbar__brand">
          <Logo />
          <span>Kanban</span>
        </Link>
        {crumbs && (
          <nav className="topbar__crumbs" aria-label="Navegação">
            <ChevronRight size={14} className="sep" />
            {crumbs}
          </nav>
        )}
        <div className="topbar__spacer" />
        <div className="topbar__actions">
          <ThemeToggle />
          {user && (
            <Menu
              trigger={({ toggle }) => (
                <button type="button" className="user-chip" onClick={toggle} aria-haspopup="menu">
                  <Avatar email={user.email} size="sm" />
                  <span className="user-chip__email truncate">{user.email}</span>
                </button>
              )}
            >
              {(close) => (
                <>
                  <MenuLabel>Conectado como</MenuLabel>
                  <div style={{ padding: "0 10px 6px", fontSize: "var(--fs-sm)" }} className="truncate">
                    {user.email}
                  </div>
                  <MenuSep />
                  <MenuItem
                    icon={<KeyRound size={16} />}
                    onClick={() => {
                      close();
                      setChangingPassword(true);
                    }}
                  >
                    Alterar senha
                  </MenuItem>
                  <MenuItem
                    icon={<LogOut size={16} />}
                    onClick={() => {
                      close();
                      logout();
                    }}
                  >
                    Sair
                  </MenuItem>
                </>
              )}
            </Menu>
          )}
        </div>
      </header>
      {children}
      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </div>
  );
}
