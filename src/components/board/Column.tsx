import { useState, type CSSProperties } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { colunaApi } from "@/api/endpoints";
import { qk } from "@/api/queries";
import type { CardView, ColunaView } from "@/api/types";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { Menu, MenuItem, MenuSep } from "@/components/ui/Menu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CardItem } from "./CardItem";
import { ColumnFormModal } from "./ColumnFormModal";
import { useBoard } from "./BoardContext";

interface ColumnProps {
  coluna: ColunaView;
  cards: CardView[];
  index: number;
  total: number;
  /** Estado de hover durante drag de card. */
  dropState?: "over" | "blocked" | null;
  onMove: (coluna: ColunaView, toIndex: number) => void;
}

export function Column({ coluna, cards, index, total, dropState, onMove }: ColumnProps) {
  const { isAdmin, openCard, openNewCard, quadro } = useBoard();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sortable = useSortable({
    id: `col:${coluna.id}`,
    data: { type: "column", coluna },
    disabled: !isAdmin,
  });

  const drop = useDroppable({
    id: `drop:${coluna.id}`,
    data: { type: "column-drop", colunaId: coluna.id },
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
  };

  const excluir = useMutation({
    mutationFn: () => colunaApi.excluir(coluna.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.quadro(quadro.id) });
      toast.success("Coluna excluída");
    },
    onError: (e) => toast.error(e),
  });

  const count = cards.length;
  const full = coluna.limiteWip != null && count >= coluna.limiteWip;

  const classes = [
    "column",
    dropState === "over" && "column--over",
    dropState === "blocked" && "column--over-blocked",
    sortable.isDragging && "column--dragging",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section ref={sortable.setNodeRef} style={style} className={classes} aria-label={`Coluna ${coluna.nome}`}>
      <header className="column__header">
        {isAdmin && (
          <button
            type="button"
            className="column__grip"
            aria-label="Arrastar coluna"
            title="Arrastar para reordenar"
            {...sortable.attributes}
            {...sortable.listeners}
          >
            <GripVertical size={16} />
          </button>
        )}
        <h3 className="column__name" title={coluna.nome}>
          {coluna.nome}
        </h3>
        <span
          className={["badge", "badge--count", full && "badge--full"].filter(Boolean).join(" ")}
          title={coluna.limiteWip != null ? `Limite WIP: ${coluna.limiteWip}` : "Sem limite WIP"}
        >
          {count}
          {coluna.limiteWip != null && <span style={{ opacity: 0.6 }}>/ {coluna.limiteWip}</span>}
        </span>
        <Menu
          trigger={({ toggle }) => (
            <Button variant="ghost" size="sm" iconOnly icon={<MoreHorizontal size={16} />} onClick={toggle} aria-haspopup="menu">
              Opções da coluna
            </Button>
          )}
        >
          {(close) => (
            <>
              <MenuItem
                icon={<Plus size={16} />}
                onClick={() => {
                  close();
                  openNewCard(coluna.id);
                }}
                disabled={full}
              >
                Adicionar card
              </MenuItem>
              {isAdmin && (
                <>
                  <MenuSep />
                  <MenuItem
                    icon={<Pencil size={16} />}
                    onClick={() => {
                      close();
                      setEditing(true);
                    }}
                  >
                    Renomear / limite WIP
                  </MenuItem>
                  <MenuItem
                    icon={<ArrowLeft size={16} />}
                    disabled={index === 0}
                    onClick={() => {
                      close();
                      onMove(coluna, index - 1);
                    }}
                  >
                    Mover para a esquerda
                  </MenuItem>
                  <MenuItem
                    icon={<ArrowRight size={16} />}
                    disabled={index >= total - 1}
                    onClick={() => {
                      close();
                      onMove(coluna, index + 1);
                    }}
                  >
                    Mover para a direita
                  </MenuItem>
                  <MenuSep />
                  <MenuItem
                    danger
                    icon={<Trash2 size={16} />}
                    disabled={count > 0}
                    onClick={() => {
                      close();
                      setDeleting(true);
                    }}
                  >
                    {count > 0 ? "Excluir (esvazie antes)" : "Excluir coluna"}
                  </MenuItem>
                </>
              )}
            </>
          )}
        </Menu>
      </header>

      <div ref={drop.setNodeRef} className="column__body">
        <SortableContext items={cards.map((c) => `card:${c.id}`)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardItem key={card.id} card={card} onOpen={(c) => openCard(c.id)} />
          ))}
        </SortableContext>
        {cards.length === 0 && <div className="column__empty">Solte um card aqui</div>}
      </div>

      <footer className="column__footer">
        <Button
          variant="ghost"
          className="column__add"
          icon={<Plus size={16} />}
          onClick={() => openNewCard(coluna.id)}
          disabled={full}
          title={full ? "Coluna no limite WIP" : undefined}
        >
          {full ? "Limite WIP atingido" : "Adicionar card"}
        </Button>
      </footer>

      {editing && <ColumnFormModal coluna={coluna} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title={`Excluir coluna "${coluna.nome}"?`}
        description="A coluna está vazia e será removida do quadro."
        confirmLabel="Excluir coluna"
        onConfirm={() => excluir.mutateAsync()}
      />
    </section>
  );
}

export function NewColumnTile() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="column column--new">
        <Button variant="ghost" icon={<Plus size={18} />} onClick={() => setOpen(true)}>
          Nova coluna
        </Button>
      </div>
      {open && <ColumnFormModal onClose={() => setOpen(false)} />}
    </>
  );
}
