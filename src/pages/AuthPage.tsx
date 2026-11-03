import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Logo, ThemeToggle } from "@/components/layout/AppShell";

export function AuthPage({ mode }: { mode: "login" | "cadastro" }) {
  const { login, cadastrar } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCadastro = mode === "cadastro";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (isCadastro && senha !== confirmar) {
      setError("As senhas não coincidem.");
      return;
    }
    if (new TextEncoder().encode(senha).length > 72) {
      setError("A senha deve ter no máximo 72 bytes.");
      return;
    }
    setBusy(true);
    try {
      if (isCadastro) {
        await cadastrar(email.trim(), senha);
        toast.success("Conta criada", "Bem-vindo ao Kanban!");
      } else {
        await login(email.trim(), senha);
      }
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível entrar";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <aside className="auth__side">
        <div className="auth__brand">
          <Logo size={30} />
          Kanban
        </div>
        <div className="auth__hero">
          <h1>Organize o trabalho do time em quadros claros.</h1>
          <p>
            Tarefas, bugs e melhorias com prioridade, responsável, etiquetas, checklists e comentários.
            Tudo em colunas com limite de WIP.
          </p>
          <MiniBoard />
        </div>
        <div className="auth__footer">Projeto final · Arquitetura de Objetos e Times Ágeis · Insper</div>
      </aside>

      <main className="auth__main" style={{ position: "relative" }}>
        <div className="auth__theme">
          <ThemeToggle />
        </div>
        <div className="auth__card">
          <h2>{isCadastro ? "Criar conta" : "Entrar"}</h2>
          <p className="lead">
            {isCadastro ? "Leva menos de um minuto." : "Use seu e-mail e senha para acessar seus quadros."}
          </p>

          <form className="auth__form" onSubmit={onSubmit} noValidate>
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-autofocus
            />
            <Input
              label="Senha"
              type="password"
              autoComplete={isCadastro ? "new-password" : "current-password"}
              placeholder="••••••••"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            {isCadastro && (
              <Input
                label="Confirmar senha"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                required
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                error={confirmar && confirmar !== senha ? "As senhas não coincidem" : undefined}
              />
            )}
            {error && (
              <div className="callout callout--danger" role="alert">
                <span>{error}</span>
              </div>
            )}
            <Button type="submit" variant="primary" size="lg" block loading={busy} icon={<ArrowRight size={18} />}>
              {isCadastro ? "Criar conta" : "Entrar"}
            </Button>
          </form>

          <p className="auth__switch">
            {isCadastro ? (
              <>
                Já tem conta?{" "}
                <button type="button" onClick={() => navigate("/entrar")}>
                  Entrar
                </button>
              </>
            ) : (
              <>
                Novo por aqui?{" "}
                <button type="button" onClick={() => navigate("/cadastro")}>
                  Criar conta
                </button>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}

function MiniBoard() {
  const cols: { title: string; cards: { tags: string[]; short?: boolean }[] }[] = [
    { title: "A fazer", cards: [{ tags: ["#f59e0b", "#2f5bff"] }, { tags: ["#22c55e"], short: true }, { tags: ["#a855f7", "#ec4899"] }] },
    { title: "Em andamento", cards: [{ tags: ["#dc3b43"] }, { tags: ["#0ea5e9", "#22c55e"], short: true }] },
    { title: "Concluído", cards: [{ tags: ["#22c55e"], short: true }, { tags: ["#2f5bff"] }, { tags: ["#f59e0b"] }, { tags: ["#a855f7"], short: true }] },
  ];
  return (
    <div className="mini-board" aria-hidden>
      {cols.map((c) => (
        <div className="mini-col" key={c.title}>
          <div className="mini-col__title">{c.title}</div>
          {c.cards.map((card, i) => (
            <div className="mini-card" key={i}>
              <div className="mini-card__tags">
                {card.tags.map((t) => (
                  <span key={t} className="mini-card__tag" style={{ background: t }} />
                ))}
              </div>
              <div className="mini-card__line" />
              {!card.short && <div className="mini-card__line mini-card__line--short" />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
