import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, Gauge, ShieldAlert, Zap } from "lucide-react";
import type { CardView } from "@/api/types";
import { PRIORIDADE_META, TIPO_META, esforcoLabel } from "@/lib/meta";
import { Avatar } from "@/components/ui/Avatar";
import { EtiquetaTag, PrioridadeBars, TipoIcon } from "@/components/ui/Badges";

interface CardSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  card: CardView;
  overlay?: boolean;
  dragging?: boolean;
}

/** Apresentação pura do card (usada no quadro e no DragOverlay). */
export const CardSurface = forwardRef<HTMLDivElement, CardSurfaceProps>(function CardSurface(
  { card, overlay, dragging, className, style, ...rest },
  ref,
) {
  const tipo = TIPO_META[card.tipo];
  const prio = PRIORIDADE_META[card.prioridade];
  const classes = ["card", overlay && "card--overlay", dragging && "card--dragging", className].filter(Boolean).join(" ");
  const cssVars = { "--card-tipo": tipo.color, ...style } as CSSProperties;

  return (
    <div ref={ref} className={classes} style={cssVars} {...rest}>
      <div className="card__top">
        <span className="card__tipo">
          <TipoIcon tipo={card.tipo} size={13} />
          {tipo.label}
        </span>
        <span className="card__prio" title={`Prioridade ${prio.label.toLowerCase()}`}>
          <PrioridadeBars prioridade={card.prioridade} />
        </span>
      </div>

      <div className="card__title">{card.titulo}</div>

      {card.etiquetas.length > 0 && (
        <div className="card__tags">
          {card.etiquetas.map((e) => (
            <EtiquetaTag key={e.id} etiqueta={e} />
          ))}
        </div>
      )}

      <div className="card__bottom">
        <span className="card__meta" title={esforcoLabel(card.esforco)}>
          <Zap size={11} />
          {card.esforco}
        </span>
        {card.tipo === "TAREFA" && card.estimativaHoras != null && (
          <span className="card__meta" title="Estimativa em horas">
            <Clock size={11} />
            {card.estimativaHoras}h
          </span>
        )}
        {card.tipo === "MELHORIA" && card.storyPoints != null && (
          <span className="card__meta" title="Story points">
            <Gauge size={11} />
            {card.storyPoints} pts
          </span>
        )}
        {card.tipo === "BUG" && card.critico && (
          <span className="card__meta card__meta--critico" title="Bug crítico">
            <ShieldAlert size={11} />
            Crítico
          </span>
        )}
        <Avatar email={card.responsavel?.email} size="sm" />
      </div>
    </div>
  );
});

interface CardItemProps {
  card: CardView;
  onOpen: (card: CardView) => void;
}

export function CardItem({ card, onOpen }: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card:${card.id}`,
    data: { type: "card", card },
  });

  return (
    <CardSurface
      ref={setNodeRef}
      card={card}
      dragging={isDragging}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`${TIPO_META[card.tipo].label}: ${card.titulo}`}
      onClick={() => onOpen(card)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter" && !e.defaultPrevented) onOpen(card);
      }}
    />
  );
}
