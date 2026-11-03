import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { ApiError } from "@/api/client";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ToastProvider } from "@/hooks/useToast";
import { AuthPage } from "@/pages/AuthPage";
import { BoardsPage } from "@/pages/BoardsPage";
import { BoardPage } from "@/pages/BoardPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: (count, error) => {
        // Não insiste em erros de negócio (4xx); tenta de novo só em falha de rede/5xx.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return count < 2;
      },
    },
    mutations: { retry: 0 },
  },
});

function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

function PublicOnly() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route element={<PublicOnly />}>
                <Route path="/entrar" element={<AuthPage mode="login" />} />
                <Route path="/cadastro" element={<AuthPage mode="cadastro" />} />
              </Route>
              <Route element={<RequireAuth />}>
                <Route path="/" element={<BoardsPage />} />
                <Route path="/quadros/:quadroId" element={<BoardPage />} />
                <Route path="/quadros/:quadroId/cards/:cardId" element={<BoardPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
