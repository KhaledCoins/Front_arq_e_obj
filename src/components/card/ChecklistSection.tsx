import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { checklistApi, itemChecklistApi } from "@/api/endpoints";
import { qk, useChecklists } from "@/api/queries";
import type { ChecklistView, ItemChecklistView } from "@/api/types";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Misc";

export function ChecklistSection({ cardId }: { cardId: string }) {
  const { data: checklists, isLoading } = useChecklists(cardId);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [titulo, setTitulo] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.checklists(cardId) });

  const criar = useMutation({
    mutationFn: (t: string) => checklistApi.criar(cardId, { titulo: t }),
    onSuccess: () => {
      invalidate();
      setTitulo("");
      setAdding(false);
    },
    onError: (e) => toast.error(e),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    criar.mutate(titulo.trim());
  }

  return (
    <section className="section">
      <div className="section__head">
        <h3 className="section__title">
          <ListChecks size={16} /> Checklists
        </h3>
        <div className="section__actions">
          {!adding && (
            <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={() => setAdding(true)}>
              Nova checklist
            </Button>
          )}
        </div>
      </div>

      {adding && (
        <form className="inline-form" onSubmit={onSubmit}>
          <input
            className="input"
            placeholder="Título da checklist"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={255}
            autoFocus
            aria-label="Título da checklist"
            onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
          />
          <Button variant="primary" size="sm" type="submit" loading={criar.isPending} disabled={!titulo.trim()}>
            Adicionar
          </Button>
          <Button variant="ghost" size="sm" iconOnly icon={<X size={14} />} onClick={() => setAdding(false)}>
            Cancelar
          </Button>
        </form>
      )}

      {isLoading && <div className="skeleton" style={{ height: 64 }} />}
      {checklists && checklists.length === 0 && !adding && (
        <p className="section__empty">Nenhuma checklist. Quebre o card em passos verificáveis.</p>
      )}
      {checklists?.map((cl) => <ChecklistBlock key={cl.id} checklist={cl} cardId={cardId} />)}
    </section>
  );
}

function ChecklistBlock({ checklist, cardId }: { checklist: ChecklistView; cardId: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [renaming, setRenaming] = useState(false);
  const [titulo, setTitulo] = useState(checklist.titulo);
  const [novoItem, setNovoItem] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.checklists(cardId) });

  const renomear = useMutation({
    mutationFn: (t: string) => checklistApi.atualizar(checklist.id, { titulo: t }),
    onSuccess: () => {
      invalidate();
      setRenaming(false);
    },
    onError: (e) => toast.error(e),
  });

  const excluir = useMutation({
    mutationFn: () => checklistApi.excluir(checklist.id),
    onSuccess: invalidate,
    onError: (e) => toast.error(e),
  });

  const criarItem = useMutation({
    mutationFn: (descricao: string) => itemChecklistApi.criar(checklist.id, { descricao, concluido: false }),
    onSuccess: () => {
      invalidate();
      setNovoItem("");
    },
    onError: (e) => toast.error(e),
  });

  // Atualização otimista do toggle para a interação parecer instantânea.
  const alternar = useMutation({
    mutationFn: (item: ItemChecklistView) =>
      itemChecklistApi.atualizar(item.id, { descricao: item.descricao, concluido: !item.concluido }),
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: qk.checklists(cardId) });
      const prev = queryClient.getQueryData<ChecklistView[]>(qk.checklists(cardId));
      queryClient.setQueryData<ChecklistView[]>(qk.checklists(cardId), (old) =>
        old?.map((cl) => {
          if (cl.id !== checklist.id) return cl;
          const itens = cl.itens.map((i) => (i.id === item.id ? { ...i, concluido: !i.concluido } : i));
          const done = itens.filter((i) => i.concluido).length;
          return { ...cl, itens, percentualConcluido: itens.length ? (done * 100) / itens.length : 0 };
        }),
      );
      return { prev };
    },
    onError: (e, _item, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(qk.checklists(cardId), ctx.prev);
      toast.error(e);
    },
    onSettled: invalidate,
  });

  const total = checklist.itens.length;
  const done = checklist.itens.filter((i) => i.concluido).length;

  return (
    <div className="checklist">
      <div className="checklist__head">
        {renaming ? (
          <form
            className="inline-form grow"
            onSubmit={(e) => {
              e.preventDefault();
              if (titulo.trim()) renomear.mutate(titulo.trim());
            }}
          >
            <input
              className="input"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={255}
              autoFocus
              aria-label="Título da checklist"
              onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
            />
            <Button variant="primary" size="sm" type="submit" iconOnly icon={<Check size={14} />} loading={renomear.isPending}>
              Salvar
            </Button>
            <Button variant="ghost" size="sm" iconOnly icon={<X size={14} />} onClick={() => setRenaming(false)}>
              Cancelar
            </Button>
          </form>
        ) : (
          <>
            <span className="checklist__title truncate">{checklist.titulo}</span>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon={<Pencil size={14} />}
              onClick={() => {
                setTitulo(checklist.titulo);
                setRenaming(true);
              }}
            >
              Renomear checklist
            </Button>
            <Button variant="ghost" size="sm" iconOnly icon={<Trash2 size={14} />} onClick={() => excluir.mutate()} loading={excluir.isPending}>
              Excluir checklist
            </Button>
          </>
        )}
      </div>

      <div className="checklist__progress">
        <span style={{ minWidth: 34 }}>{Math.round(checklist.percentualConcluido)}%</span>
        <Progress value={checklist.percentualConcluido} />
        <span>
          {done}/{total}
        </span>
      </div>

      <div className="checklist__items">
        {checklist.itens.map((item) => (
          <ChecklistItemRow key={item.id} item={item} cardId={cardId} onToggle={() => alternar.mutate(item)} />
        ))}
      </div>

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (novoItem.trim()) criarItem.mutate(novoItem.trim());
        }}
      >
        <input
          className="input"
          placeholder="Adicionar item…"
          value={novoItem}
          onChange={(e) => setNovoItem(e.target.value)}
          maxLength={1000}
          aria-label="Novo item"
        />
        <Button variant="secondary" size="sm" type="submit" icon={<Plus size={14} />} loading={criarItem.isPending} disabled={!novoItem.trim()}>
          Item
        </Button>
      </form>
    </div>
  );
}

function ChecklistItemRow({ item, cardId, onToggle }: { item: ItemChecklistView; cardId: string; onToggle: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [texto, setTexto] = useState(item.descricao);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.checklists(cardId) });

  const editar = useMutation({
    mutationFn: (descricao: string) => itemChecklistApi.atualizar(item.id, { descricao, concluido: item.concluido }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
    onError: (e) => toast.error(e),
  });

  const excluir = useMutation({
    mutationFn: () => itemChecklistApi.excluir(item.id),
    onSuccess: invalidate,
    onError: (e) => toast.error(e),
  });

  if (editing) {
    return (
      <form
        className="inline-form"
        style={{ padding: "4px 0" }}
        onSubmit={(e) => {
          e.preventDefault();
          if (texto.trim()) editar.mutate(texto.trim());
        }}
      >
        <input
          className="input"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={1000}
          autoFocus
          aria-label="Descrição do item"
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        />
        <Button variant="primary" size="sm" type="submit" iconOnly icon={<Check size={14} />} loading={editar.isPending}>
          Salvar
        </Button>
        <Button variant="ghost" size="sm" iconOnly icon={<X size={14} />} onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </form>
    );
  }

  return (
    <div className={["check-item", item.concluido && "check-item--done"].filter(Boolean).join(" ")}>
      <input type="checkbox" className="checkbox" checked={item.concluido} onChange={onToggle} aria-label={item.descricao} />
      <span className="check-item__text">{item.descricao}</span>
      <span className="check-item__actions">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon={<Pencil size={13} />}
          onClick={() => {
            setTexto(item.descricao);
            setEditing(true);
          }}
        >
          Editar item
        </Button>
        <Button variant="ghost" size="sm" iconOnly icon={<Trash2 size={13} />} onClick={() => excluir.mutate()} loading={excluir.isPending}>
          Excluir item
        </Button>
      </span>
    </div>
  );
}
