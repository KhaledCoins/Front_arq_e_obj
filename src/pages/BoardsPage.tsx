import { useState, type CSSProperties, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KanbanSquare, Layers, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { quadroApi } from "@/api/endpoints";
import { qk, useQuadros } from "@/api/queries";
import type { QuadroRequest, QuadroView } from "@/api/types";
import { useToast } from "@/hooks/useToast";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Menu, MenuItem, MenuSep } from "@/components/ui/Menu";
import { EmptyState } from "@/components/ui/Misc";
import { hueFromString, pluralize } from "@/lib/format";

export function BoardsPage() {
  const { data: quadros, isLoading, isError, error } = useQuadros();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<QuadroView | null>(null);
  const [deleting, setDeleting] = useState<QuadroView | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const excluir = useMutation({
    mutationFn: (id: string) => quadroApi.excluir(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.quadros });
      toast.success("Quadro excluído");
    },
    onError: (e) => toast.error(e),
  });

  return (
    <AppShell>
      <main className="page">
        <div className="page__header">
          <div>
            <h1 className="page__title">Meus quadros</h1>
            <p className="page__subtitle">
              {quadros ? pluralize(quadros.length, "quadro", "quadros") : "Quadros dos quais você participa."}
            </p>
          </div>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
            Novo quadro
          </Button>
        </div>

        {isLoading && <BoardsSkeleton />}

        {isError && (
          <div className="callout callout--danger">
            <span>{(error as Error).message}</span>
          </div>
        )}

        {quadros && quadros.length === 0 && (
          <EmptyState
            icon={<KanbanSquare size={26} />}
            title="Nenhum quadro ainda"
            description="Crie seu primeiro quadro. Ele já nasce com as colunas A fazer, Em andamento e Concluído."
            action={
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
                Criar quadro
              </Button>
            }
          />
        )}

        {quadros && quadros.length > 0 && (
          <div className="boards-grid">
            {quadros.map((q) => (
              <BoardTile key={q.id} quadro={q} onEdit={() => setEditing(q)} onDelete={() => setDeleting(q)} />
            ))}
            <button type="button" className="board-tile board-tile--new" onClick={() => setCreating(true)}>
              <Plus size={20} />
              <span>Novo quadro</span>
            </button>
          </div>
        )}
      </main>

      {creating && <BoardFormModal onClose={() => setCreating(false)} />}
      {editing && <BoardFormModal key={editing.id} quadro={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Excluir "${deleting?.nome}"?`}
        description="Todas as colunas, cards, checklists e comentários deste quadro serão removidos. Essa ação não pode ser desfeita."
        confirmLabel="Excluir quadro"
        onConfirm={() => (deleting ? excluir.mutateAsync(deleting.id) : undefined)}
      />
    </AppShell>
  );
}

function BoardTile({ quadro, onEdit, onDelete }: { quadro: QuadroView; onEdit: () => void; onDelete: () => void }) {
  const style = { "--hue": hueFromString(quadro.id) } as CSSProperties;
  return (
    <article className="board-tile" style={style}>
      <span className="board-tile__accent" aria-hidden />
      <Link to={`/quadros/${quadro.id}`} className="board-tile__link" aria-label={`Abrir quadro ${quadro.nome}`} />
      <div className="board-tile__top">
        <h2 className="board-tile__name">{quadro.nome}</h2>
        <Menu
          className="board-tile__menu"
          trigger={({ toggle }) => (
            <Button variant="ghost" size="sm" iconOnly icon={<MoreHorizontal size={16} />} onClick={toggle} aria-haspopup="menu">
              Opções do quadro
            </Button>
          )}
        >
          {(close) => (
            <>
              <MenuItem
                icon={<Pencil size={16} />}
                onClick={() => {
                  close();
                  onEdit();
                }}
              >
                Editar quadro
              </MenuItem>
              <MenuSep />
              <MenuItem
                danger
                icon={<Trash2 size={16} />}
                onClick={() => {
                  close();
                  onDelete();
                }}
              >
                Excluir quadro
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
      <p className="board-tile__desc">{quadro.descricao || <span style={{ color: "var(--fg-faint)" }}>Sem descrição</span>}</p>
      <div className="board-tile__meta">
        <span className="row">
          <Layers size={14} />
          {pluralize(quadro.quantidadeCards, "card", "cards")}
        </span>
      </div>
    </article>
  );
}

function BoardsSkeleton() {
  return (
    <div className="boards-grid" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="board-tile" style={{ gap: 12 }}>
          <div className="skeleton" style={{ height: 20, width: "60%" }} />
          <div className="skeleton" style={{ height: 14, width: "90%" }} />
          <div className="skeleton" style={{ height: 14, width: "40%", marginTop: "auto" }} />
        </div>
      ))}
    </div>
  );
}

export function BoardFormModal({ onClose, quadro }: { onClose: () => void; quadro?: QuadroView }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [nome, setNome] = useState(quadro?.nome ?? "");
  const [descricao, setDescricao] = useState(quadro?.descricao ?? "");

  const salvar = useMutation({
    mutationFn: (dados: QuadroRequest) => (quadro ? quadroApi.atualizar(quadro.id, dados) : quadroApi.criar(dados)),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: qk.quadros });
      if (quadro) queryClient.invalidateQueries({ queryKey: qk.quadro(quadro.id) });
      toast.success(quadro ? "Quadro atualizado" : "Quadro criado", quadro ? undefined : `"${res.nome}" já tem 3 colunas prontas.`);
      onClose();
    },
    onError: (e) => toast.error(e),
  });

  const handleClose = onClose;
  const open = true;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    salvar.mutate({ nome: nome.trim(), descricao: descricao.trim() || null });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={quadro ? "Editar quadro" : "Novo quadro"}
      subtitle={quadro ? undefined : "Ele será criado com as colunas A fazer, Em andamento e Concluído."}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="board-form" loading={salvar.isPending} disabled={!nome.trim()}>
            {quadro ? "Salvar" : "Criar quadro"}
          </Button>
        </>
      }
    >
      <form id="board-form" className="stack" onSubmit={onSubmit}>
        <Input
          label="Nome"
          placeholder="Ex.: Sprint 12, Site institucional…"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={255}
          required
          data-autofocus
          trailing={`${nome.length}/255`}
        />
        <Textarea
          label="Descrição"
          placeholder="Opcional. Para que serve este quadro?"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          maxLength={255}
          rows={3}
          trailing={`${descricao.length}/255`}
        />
      </form>
    </Modal>
  );
}
