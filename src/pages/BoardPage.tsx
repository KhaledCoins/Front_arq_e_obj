import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  KeyboardCode,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ArrowLeft, Layers, MoreHorizontal, Pencil, ShieldCheck, Tag, Trash2, Users } from "lucide-react";
import { ApiError } from "@/api/client";
import { cardApi, colunaApi, quadroApi } from "@/api/endpoints";
import { qk, useCardsPorColuna, useColunas, useEtiquetas, useMembros, useQuadro } from "@/api/queries";
import type { CardView, ColunaView, UUID } from "@/api/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { pluralize } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { AvatarStack } from "@/components/ui/Avatar";
import { Menu, MenuItem, MenuSep } from "@/components/ui/Menu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, Spinner } from "@/components/ui/Misc";
import { BoardContext, type BoardContextValue } from "@/components/board/BoardContext";
import { Column, NewColumnTile } from "@/components/board/Column";
import { CardSurface } from "@/components/board/CardItem";
import { CardFormModal } from "@/components/board/CardFormModal";
import { MembersModal } from "@/components/board/MembersModal";
import { LabelsModal } from "@/components/board/LabelsModal";
import { CardModal } from "@/components/card/CardModal";
import { BoardFormModal } from "./BoardsPage";

/**
 * Navegação por teclado: para um card, ← / → levam o card para a coluna vizinha
 * (zona de drop); para colunas, usa o comportamento padrão de lista ordenável.
 */
const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  const { context } = args;
  const { active, droppableContainers, droppableRects, collisionRect } = context;
  if (active?.data.current?.type !== "card" || !collisionRect) {
    return sortableKeyboardCoordinates(event, args);
  }
  const activeCard = active.data.current?.card as CardView | undefined;
  const centerY = collisionRect.top + collisionRect.height / 2;

  // ↑ / ↓: troca de posição com o card vizinho da mesma coluna.
  if (event.code === KeyboardCode.Up || event.code === KeyboardCode.Down) {
    const vizinhos = droppableContainers
      .getEnabled()
      .filter((c) => c.id !== active.id && c.data.current?.type === "card" && (c.data.current?.card as CardView | undefined)?.colunaId === activeCard?.colunaId)
      .map((c) => droppableRects.get(c.id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .sort((a, b) => a.top - b.top);
    const alvo =
      event.code === KeyboardCode.Down
        ? vizinhos.find((r) => r.top + r.height / 2 > centerY + 1)
        : [...vizinhos].reverse().find((r) => r.top + r.height / 2 < centerY - 1);
    return alvo ? { x: alvo.left, y: alvo.top } : undefined;
  }

  if (event.code !== KeyboardCode.Left && event.code !== KeyboardCode.Right) return undefined;

  const zones = droppableContainers
    .getEnabled()
    .filter((c) => c.data.current?.type === "column-drop")
    .map((c) => ({ c, rect: droppableRects.get(c.id) }))
    .filter((z): z is { c: (typeof z)["c"]; rect: NonNullable<(typeof z)["rect"]> } => Boolean(z.rect))
    .sort((a, b) => a.rect.left - b.rect.left);
  if (!zones.length) return undefined;

  const centerX = collisionRect.left + collisionRect.width / 2;
  let current = zones.findIndex((z) => centerX >= z.rect.left && centerX <= z.rect.right);
  if (current < 0) current = zones.findIndex((z) => z.rect.left > centerX) - 1;
  const next = event.code === KeyboardCode.Right ? current + 1 : current - 1;
  const target = zones[next];
  if (!target) return undefined;
  return { x: target.rect.left + 8, y: target.rect.top + 8 };
};

export function BoardPage() {
  const { quadroId = "", cardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const quadroQ = useQuadro(quadroId);
  const colunasQ = useColunas(quadroId);
  const membrosQ = useMembros(quadroId);
  const etiquetasQ = useEtiquetas(quadroId);
  const { porColuna, isLoading: cardsLoading } = useCardsPorColuna(colunasQ.data);

  const [newCardColuna, setNewCardColuna] = useState<UUID | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [editingBoard, setEditingBoard] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(false);

  // Drag state
  const [activeCard, setActiveCard] = useState<CardView | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColunaView | null>(null);
  const [overColumnId, setOverColumnId] = useState<UUID | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );

  const openCard = useCallback((id: UUID) => navigate(`/quadros/${quadroId}/cards/${id}`), [navigate, quadroId]);
  const closeCard = useCallback(() => navigate(`/quadros/${quadroId}`), [navigate, quadroId]);

  const me = useMemo(() => membrosQ.data?.find((m) => m.usuario.email === user?.email), [membrosQ.data, user?.email]);
  const isAdmin = me?.papel === "ADMIN";

  // ---- Mutations ----
  const renumerar = (cards: CardView[]) => cards.map((c, i) => ({ ...c, posicao: i }));
  const ordenar = (cards: CardView[] | undefined) => [...(cards ?? [])].sort((a, b) => a.posicao - b.posicao);

  const moverCard = useMutation({
    mutationFn: ({ card, to, posicao }: { card: CardView; to: UUID; posicao?: number }) =>
      cardApi.mover(card.id, posicao === undefined ? { colunaId: to } : { colunaId: to, posicao }),
    onMutate: async ({ card, to, posicao }) => {
      const from = card.colunaId;
      await Promise.all([
        queryClient.cancelQueries({ queryKey: qk.cardsDaColuna(from) }),
        queryClient.cancelQueries({ queryKey: qk.cardsDaColuna(to) }),
      ]);
      const prevFrom = queryClient.getQueryData<CardView[]>(qk.cardsDaColuna(from));
      const prevTo = queryClient.getQueryData<CardView[]>(qk.cardsDaColuna(to));
      if (from === to) {
        const lista = ordenar(prevFrom);
        const idx = lista.findIndex((c) => c.id === card.id);
        if (idx >= 0 && posicao !== undefined) {
          queryClient.setQueryData(qk.cardsDaColuna(from), renumerar(arrayMove(lista, idx, posicao)));
        }
      } else {
        const novaOrigem = ordenar(prevFrom).filter((c) => c.id !== card.id);
        const novoDestino = ordenar(prevTo);
        novoDestino.splice(posicao ?? novoDestino.length, 0, { ...card, colunaId: to });
        queryClient.setQueryData(qk.cardsDaColuna(from), renumerar(novaOrigem));
        queryClient.setQueryData(qk.cardsDaColuna(to), renumerar(novoDestino));
      }
      return { from, to, prevFrom, prevTo };
    },
    onError: (e, _vars, ctx) => {
      if (ctx) {
        queryClient.setQueryData(qk.cardsDaColuna(ctx.from), ctx.prevFrom);
        queryClient.setQueryData(qk.cardsDaColuna(ctx.to), ctx.prevTo);
      }
      toast.error(e, "Não foi possível mover o card");
    },
    onSettled: (_d, _e, { card, to }) => {
      queryClient.invalidateQueries({ queryKey: qk.cardsDaColuna(card.colunaId) });
      queryClient.invalidateQueries({ queryKey: qk.cardsDaColuna(to) });
      queryClient.invalidateQueries({ queryKey: qk.card(card.id) });
      queryClient.invalidateQueries({ queryKey: qk.colunas(quadroId) });
    },
  });

  const posicionarColuna = useMutation({
    mutationFn: ({ coluna, to }: { coluna: ColunaView; to: number }) => colunaApi.posicionar(coluna.id, { posicao: to }),
    onMutate: async ({ coluna, to }) => {
      await queryClient.cancelQueries({ queryKey: qk.colunas(quadroId) });
      const prev = queryClient.getQueryData<ColunaView[]>(qk.colunas(quadroId));
      if (prev) {
        const sorted = [...prev].sort((a, b) => a.posicao - b.posicao);
        const from = sorted.findIndex((c) => c.id === coluna.id);
        const next = arrayMove(sorted, from, to).map((c, i) => ({ ...c, posicao: i }));
        queryClient.setQueryData(qk.colunas(quadroId), next);
      }
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(qk.colunas(quadroId), ctx.prev);
      toast.error(e, "Não foi possível reordenar a coluna");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.colunas(quadroId) }),
  });

  const excluirQuadro = useMutation({
    mutationFn: () => quadroApi.excluir(quadroId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.quadros });
      toast.success("Quadro excluído");
      navigate("/", { replace: true });
    },
    onError: (e) => toast.error(e),
  });

  // ---- DnD handlers ----
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const type = args.active.data.current?.type;
    if (type === "card") {
      const containers = args.droppableContainers.filter((c) => {
        const t = c.data.current?.type;
        return c.id !== args.active.id && (t === "card" || t === "column-drop");
      });
      // Prefere o card sob o ponteiro (define a posição); senão, a zona da coluna (fim da lista).
      const escolher = (hits: ReturnType<typeof pointerWithin>) => {
        const card = hits.find((h) => containers.find((c) => c.id === h.id)?.data.current?.type === "card");
        return card ? [card] : hits.length ? [hits[0]] : [];
      };
      const within = escolher(pointerWithin({ ...args, droppableContainers: containers }));
      if (within.length) return within;
      const inter = escolher(rectIntersection({ ...args, droppableContainers: containers }));
      if (inter.length) return inter;
      return closestCorners({ ...args, droppableContainers: containers });
    }
    const containers = args.droppableContainers.filter((c) => c.data.current?.type === "column");
    return closestCenter({ ...args, droppableContainers: containers });
  }, []);

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current as { type: string; card?: CardView; coluna?: ColunaView } | undefined;
    if (data?.type === "card" && data.card) setActiveCard(data.card);
    if (data?.type === "column" && data.coluna) setActiveColumn(data.coluna);
  }

  /** Traduz o alvo do drop (card ou zona da coluna) em coluna + posição. */
  function resolveTarget(over: DragEndEvent["over"]): { colunaId: UUID; posicao?: number } | null {
    const data = over?.data.current as { type?: string; card?: CardView; colunaId?: UUID } | undefined;
    if (!data) return null;
    if (data.type === "card" && data.card) {
      const lista = porColuna.get(data.card.colunaId) ?? [];
      const idx = lista.findIndex((c) => c.id === data.card!.id);
      return { colunaId: data.card.colunaId, posicao: idx < 0 ? undefined : idx };
    }
    if (data.type === "column-drop" && data.colunaId) return { colunaId: data.colunaId };
    return null;
  }

  function onDragOver(e: DragOverEvent) {
    if (!activeCard) return;
    setOverColumnId(resolveTarget(e.over)?.colunaId ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const data = active.data.current as { type: string; card?: CardView; coluna?: ColunaView } | undefined;
    setActiveCard(null);
    setActiveColumn(null);
    setOverColumnId(null);
    if (!over || !data) return;

    if (data.type === "card" && data.card) {
      const alvo = resolveTarget(over);
      if (!alvo) return;
      const { colunaId: to, posicao } = alvo;
      if (to === data.card.colunaId) {
        // Reordenação dentro da própria coluna.
        const lista = porColuna.get(to) ?? [];
        const atual = lista.findIndex((c) => c.id === data.card!.id);
        if (posicao === undefined || posicao === atual) return;
        moverCard.mutate({ card: data.card, to, posicao });
        return;
      }
      const destino = colunasQ.data?.find((c) => c.id === to);
      const qtd = porColuna.get(to)?.length ?? 0;
      if (destino?.limiteWip != null && qtd >= destino.limiteWip) {
        toast.error(new ApiError(409, `A coluna ${destino.nome} atingiu o limite WIP de ${destino.limiteWip} cards`));
        return;
      }
      moverCard.mutate({ card: data.card, to, posicao });
      return;
    }

    if (data.type === "column" && data.coluna && colunasQ.data) {
      const ids = colunasQ.data.map((c) => `col:${c.id}`);
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from < 0 || to < 0 || from === to) return;
      posicionarColuna.mutate({ coluna: data.coluna, to });
    }
  }

  function onDragCancel() {
    setActiveCard(null);
    setActiveColumn(null);
    setOverColumnId(null);
  }

  // ---- Estados de carregamento / erro ----
  if (quadroQ.isLoading || colunasQ.isLoading || membrosQ.isLoading || etiquetasQ.isLoading) {
    return (
      <AppShell>
        <Spinner />
      </AppShell>
    );
  }

  const err = quadroQ.error ?? colunasQ.error ?? membrosQ.error ?? etiquetasQ.error;
  if (err || !quadroQ.data || !colunasQ.data || !membrosQ.data || !etiquetasQ.data) {
    const apiErr = err instanceof ApiError ? err : null;
    return (
      <AppShell>
        <main className="page">
          <EmptyState
            icon={<Layers size={24} />}
            title={apiErr?.status === 403 ? "Você não participa deste quadro" : apiErr?.status === 404 ? "Quadro não encontrado" : "Não foi possível abrir o quadro"}
            description={apiErr?.message}
            action={
              <Link to="/" className="btn btn--secondary">
                <ArrowLeft size={16} /> Voltar aos quadros
              </Link>
            }
          />
        </main>
      </AppShell>
    );
  }

  const quadro = quadroQ.data;
  const colunas = colunasQ.data;
  const totalCards = colunas.reduce((acc, c) => acc + (porColuna.get(c.id)?.length ?? 0), 0);

  const ctx: BoardContextValue = {
    quadro,
    colunas,
    membros: membrosQ.data,
    etiquetas: etiquetasQ.data,
    me,
    isAdmin,
    openCard,
    openNewCard: setNewCardColuna,
  };

  const overColuna = overColumnId ? colunas.find((c) => c.id === overColumnId) : undefined;
  const overBlocked =
    overColuna && activeCard && overColuna.id !== activeCard.colunaId && overColuna.limiteWip != null && (porColuna.get(overColuna.id)?.length ?? 0) >= overColuna.limiteWip;

  const selectedCardInitial = cardId ? [...porColuna.values()].flat().find((c) => c.id === cardId) : undefined;

  return (
    <BoardContext.Provider value={ctx}>
      <AppShell crumbs={<span className="current truncate">{quadro.nome}</span>}>
        <div className="board">
          <header className="board__header">
            <Link to="/" className="btn btn--ghost btn--icon" aria-label="Voltar aos quadros" title="Meus quadros">
              <ArrowLeft size={18} />
            </Link>
            <div className="board__title-wrap">
              <h1 className="board__title">{quadro.nome}</h1>
              {quadro.descricao && <p className="board__desc">{quadro.descricao}</p>}
            </div>
            <div className="board__stats">
              <span className="badge badge--outline">
                <Layers size={12} /> {pluralize(totalCards, "card", "cards")}
              </span>
              {isAdmin && (
                <span className="badge badge--outline" title="Você administra este quadro">
                  <ShieldCheck size={12} /> Admin
                </span>
              )}
            </div>

            <div className="board__toolbar">
              <button type="button" className="btn btn--ghost" onClick={() => setShowMembers(true)} title="Membros" aria-label="Membros">
                <AvatarStack emails={membrosQ.data.map((m) => m.usuario.email)} />
                <Users size={16} />
              </button>
              <Button variant="secondary" icon={<Tag size={16} />} onClick={() => setShowLabels(true)}>
                Etiquetas
              </Button>
              <Menu
                trigger={({ toggle }) => (
                  <Button variant="secondary" iconOnly icon={<MoreHorizontal size={18} />} onClick={toggle} aria-haspopup="menu">
                    Opções do quadro
                  </Button>
                )}
              >
                {(close) => (
                  <>
                    <MenuItem
                      icon={<Users size={16} />}
                      onClick={() => {
                        close();
                        setShowMembers(true);
                      }}
                    >
                      Membros
                    </MenuItem>
                    <MenuItem
                      icon={<Tag size={16} />}
                      onClick={() => {
                        close();
                        setShowLabels(true);
                      }}
                    >
                      Etiquetas
                    </MenuItem>
                    {isAdmin && (
                      <>
                        <MenuSep />
                        <MenuItem
                          icon={<Pencil size={16} />}
                          onClick={() => {
                            close();
                            setEditingBoard(true);
                          }}
                        >
                          Editar quadro
                        </MenuItem>
                        <MenuItem
                          danger
                          icon={<Trash2 size={16} />}
                          onClick={() => {
                            close();
                            setDeletingBoard(true);
                          }}
                        >
                          Excluir quadro
                        </MenuItem>
                      </>
                    )}
                  </>
                )}
              </Menu>
            </div>
          </header>

          <div className="board__canvas">
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetection}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDragCancel={onDragCancel}
            >
              <SortableContext items={colunas.map((c) => `col:${c.id}`)} strategy={horizontalListSortingStrategy}>
                <div className="columns">
                  {colunas.map((coluna, i) => (
                    <Column
                      key={coluna.id}
                      coluna={coluna}
                      cards={porColuna.get(coluna.id) ?? []}
                      index={i}
                      total={colunas.length}
                      dropState={
                        activeCard && overColumnId === coluna.id && coluna.id !== activeCard.colunaId
                          ? overBlocked
                            ? "blocked"
                            : "over"
                          : null
                      }
                      onMove={(c, to) => posicionarColuna.mutate({ coluna: c, to })}
                    />
                  ))}
                  {isAdmin && <NewColumnTile />}
                  {colunas.length === 0 && !isAdmin && (
                    <EmptyState icon={<Layers size={22} />} title="Este quadro ainda não tem colunas" description="Peça a um administrador para criar as colunas." />
                  )}
                </div>
              </SortableContext>

              <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
                {activeCard ? <CardSurface card={activeCard} overlay style={{ width: "calc(var(--column-w) - 16px)" }} /> : null}
                {activeColumn ? (
                  <div className="column" style={{ opacity: 0.9, boxShadow: "var(--shadow-drag)" }}>
                    <header className="column__header">
                      <h3 className="column__name">{activeColumn.nome}</h3>
                      <span className="badge badge--count column__count">{porColuna.get(activeColumn.id)?.length ?? 0}</span>
                    </header>
                    <div className="column__body" style={{ minHeight: 80 }} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
            {cardsLoading && <span className="sr-only">Carregando cards…</span>}
          </div>
        </div>

        {newCardColuna && <CardFormModal colunaId={newCardColuna} onClose={() => setNewCardColuna(null)} />}
        {cardId && <CardModal key={cardId} cardId={cardId} initial={selectedCardInitial} onClose={closeCard} />}
        {showMembers && <MembersModal onClose={() => setShowMembers(false)} />}
        {showLabels && <LabelsModal onClose={() => setShowLabels(false)} />}
        {editingBoard && <BoardFormModal quadro={quadro} onClose={() => setEditingBoard(false)} />}
        <ConfirmDialog
          open={deletingBoard}
          onClose={() => setDeletingBoard(false)}
          title={`Excluir "${quadro.nome}"?`}
          description="Todas as colunas, cards, checklists e comentários serão removidos. Essa ação não pode ser desfeita."
          confirmLabel="Excluir quadro"
          onConfirm={() => excluirQuadro.mutateAsync()}
        />
      </AppShell>
    </BoardContext.Provider>
  );
}
