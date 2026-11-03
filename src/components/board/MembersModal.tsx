import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { membroApi } from "@/api/endpoints";
import { qk } from "@/api/queries";
import type { MembroQuadroView, Papel } from "@/api/types";
import { PAPEL_META } from "@/lib/meta";
import { displayName, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/useToast";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useBoard } from "./BoardContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MembersModal({ onClose }: { onClose: () => void }) {
  const { quadro, membros, me, isAdmin } = useBoard();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<Papel>("MEMBRO");
  const [removendo, setRemovendo] = useState<MembroQuadroView | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk.membros(quadro.id) });
    queryClient.invalidateQueries({ queryKey: ["colunas"] }); // responsáveis podem ter sido limpos
  };

  const adicionar = useMutation({
    mutationFn: () => membroApi.criar(quadro.id, { email: email.trim().toLowerCase(), papel }),
    onSuccess: (m) => {
      invalidate();
      toast.success("Membro adicionado", m.usuario.email);
      setEmail("");
      setPapel("MEMBRO");
    },
    onError: (e) => toast.error(e),
  });

  const alterarPapel = useMutation({
    mutationFn: ({ id, papel }: { id: string; papel: Papel }) => membroApi.atualizar(id, { papel }),
    onSuccess: () => {
      invalidate();
      toast.success("Papel atualizado");
    },
    onError: (e) => toast.error(e),
  });

  const remover = useMutation({
    mutationFn: (id: string) => membroApi.excluir(id),
    onSuccess: () => {
      invalidate();
      toast.success("Membro removido");
    },
    onError: (e) => toast.error(e),
  });

  const emailValido = EMAIL_RE.test(email.trim());
  const jaParticipa = membros.some((m) => m.usuario.email === email.trim().toLowerCase());
  const admins = membros.filter((m) => m.papel === "ADMIN").length;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!emailValido || jaParticipa) return;
    adicionar.mutate();
  }

  return (
    <Modal open onClose={onClose} size="lg" title="Membros" subtitle={`${membros.length} ${membros.length === 1 ? "pessoa" : "pessoas"} neste quadro`}>
      <div className="list">
        {membros.map((m) => {
          const isMe = m.id === me?.id;
          const ultimoAdmin = m.papel === "ADMIN" && admins === 1;
          return (
            <div className="list__item" key={m.id}>
              <Avatar email={m.usuario.email} size="lg" />
              <div className="list__main">
                <span className="list__title">
                  {displayName(m.usuario.email)}
                  {isMe && <span className="muted"> · você</span>}
                </span>
                <span className="list__sub truncate">
                  {m.usuario.email} · entrou em {formatDate(m.dataEntrada)}
                </span>
              </div>
              <div className="list__actions">
                {isAdmin ? (
                  <select
                    className="select"
                    style={{ minHeight: 32, padding: "4px 30px 4px 10px", width: 120, fontSize: "var(--fs-sm)" }}
                    value={m.papel}
                    disabled={alterarPapel.isPending || (ultimoAdmin && m.papel === "ADMIN")}
                    title={ultimoAdmin ? "O quadro precisa de pelo menos um administrador" : "Alterar papel"}
                    onChange={(e) => alterarPapel.mutate({ id: m.id, papel: e.target.value as Papel })}
                    aria-label={`Papel de ${m.usuario.email}`}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBRO">Membro</option>
                  </select>
                ) : (
                  <span className="badge badge--outline">
                    {m.papel === "ADMIN" && <ShieldCheck size={12} />}
                    {PAPEL_META[m.papel].label}
                  </span>
                )}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={<Trash2 size={15} />}
                    disabled={ultimoAdmin}
                    title={ultimoAdmin ? "O quadro precisa de pelo menos um administrador" : isMe ? "Sair do quadro" : "Remover"}
                    onClick={() => setRemovendo(m)}
                  >
                    Remover membro
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isAdmin ? (
        <form className="stack" onSubmit={onSubmit}>
          <div className="section__title" style={{ marginTop: 4 }}>
            <UserPlus size={16} /> Adicionar membro
          </div>
          <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
            <div className="grow">
              <Input
                type="email"
                placeholder="e-mail da pessoa (precisa ter conta)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                error={email && !emailValido ? "E-mail inválido" : jaParticipa ? "Essa pessoa já participa do quadro" : undefined}
                aria-label="E-mail do usuário"
                data-autofocus
              />
            </div>
            <div style={{ width: 130 }}>
              <Select value={papel} onChange={(e) => setPapel(e.target.value as Papel)} aria-label="Papel">
                <option value="MEMBRO">Membro</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </div>
            <Button variant="primary" type="submit" loading={adicionar.isPending} disabled={!emailValido || jaParticipa}>
              Adicionar
            </Button>
          </div>
          <span className="field__hint">{PAPEL_META[papel].descricao}</span>
        </form>
      ) : (
        <div className="callout">
          <Info size={16} />
          <span>Só administradores convidam ou removem membros.</span>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(removendo)}
        onClose={() => setRemovendo(null)}
        title={removendo?.id === me?.id ? "Sair deste quadro?" : `Remover ${removendo?.usuario.email}?`}
        description="Cards sob responsabilidade dessa pessoa ficarão sem responsável."
        confirmLabel={removendo?.id === me?.id ? "Sair do quadro" : "Remover"}
        onConfirm={async () => {
          if (!removendo) return;
          await remover.mutateAsync(removendo.id);
          if (removendo.id === me?.id) {
            queryClient.invalidateQueries({ queryKey: qk.quadros });
            onClose();
          }
        }}
      />
    </Modal>
  );
}
