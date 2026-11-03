import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setUnauthorizedHandler, tokenStorage } from "@/api/client";
import { usuarioApi } from "@/api/endpoints";
import { decodeJwt, isExpired } from "@/lib/jwt";

interface AuthUser {
  email: string;
  exp?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<void>;
  cadastrar: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readUser(): AuthUser | null {
  const token = tokenStorage.get();
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload?.sub || isExpired(payload)) {
    tokenStorage.clear();
    return null;
  }
  return { email: payload.sub, exp: payload.exp };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readUser());
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // 401 vindo da API => sessão inválida/expirada.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Desloga automaticamente quando o token expira (1h por padrão no backend).
  useEffect(() => {
    if (!user?.exp) return;
    const ms = user.exp * 1000 - Date.now();
    if (ms <= 0) {
      logout();
      return;
    }
    const t = window.setTimeout(logout, ms);
    return () => window.clearTimeout(t);
  }, [user, logout]);

  const login = useCallback(async (email: string, senha: string) => {
    const { token } = await usuarioApi.login({ email, senha });
    tokenStorage.set(token);
    const next = readUser();
    if (!next) throw new Error("Token inválido recebido do servidor");
    setUser(next);
  }, []);

  const cadastrar = useCallback(
    async (email: string, senha: string) => {
      await usuarioApi.cadastrar({ email, senha });
      await login(email, senha);
    },
    [login],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: Boolean(user), login, cadastrar, logout }),
    [user, login, cadastrar, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
