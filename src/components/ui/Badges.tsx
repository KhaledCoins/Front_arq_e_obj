import type { CSSProperties } from "react";
import { Bug, Sparkles, SquareCheckBig } from "lucide-react";
import type { EtiquetaView, Prioridade, TipoCard } from "@/api/types";
import { PRIORIDADE_META, TIPO_META } from "@/lib/meta";
import { readableOn } from "@/lib/format";

export function TipoIcon({ tipo, size = 14 }: { tipo: TipoCard; size?: number }) {
  if (tipo === "BUG") return <Bug size={size} />;
  if (tipo === "MELHORIA") return <Sparkles size={size} />;
  return <SquareCheckBig size={size} />;
}

export function TipoBadge({ tipo }: { tipo: TipoCard }) {
  const meta = TIPO_META[tipo];
  const style = { "--badge-soft": meta.soft, "--badge-color": meta.color } as CSSProperties;
  return (
    <span className="badge badge--soft" style={style}>
      <TipoIcon tipo={tipo} size={12} />
      {meta.label}
    </span>
  );
}

export function PrioridadeBars({ prioridade }: { prioridade: Prioridade }) {
  const meta = PRIORIDADE_META[prioridade];
  const style = { "--prio-color": meta.color } as CSSProperties;
  return (
    <span className="prio-bars" data-rank={meta.rank} style={style} aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

export function PrioridadeBadge({ prioridade }: { prioridade: Prioridade }) {
  const meta = PRIORIDADE_META[prioridade];
  const style = { "--badge-soft": meta.soft, "--badge-color": meta.color } as CSSProperties;
  return (
    <span className="badge badge--soft" style={style}>
      <PrioridadeBars prioridade={prioridade} />
      {meta.label}
    </span>
  );
}

export function EtiquetaTag({ etiqueta }: { etiqueta: EtiquetaView }) {
  return (
    <span className="tag" style={{ background: etiqueta.cor, color: readableOn(etiqueta.cor) }} title={etiqueta.nome}>
      {etiqueta.nome}
    </span>
  );
}
