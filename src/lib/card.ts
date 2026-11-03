import type { CardRequest, CardView } from "@/api/types";

/**
 * Converte um CardView em CardRequest para PUT /cards/{id}.
 * Envia apenas os campos do tipo do card — o backend rejeita campos de outros tipos.
 */
export function cardToRequest(card: CardView, patch: Partial<CardRequest> = {}): CardRequest {
  const base: CardRequest = {
    titulo: card.titulo,
    descricao: card.descricao,
    tipo: card.tipo,
    prioridade: card.prioridade,
  };
  if (card.tipo === "TAREFA") base.estimativaHoras = card.estimativaHoras;
  if (card.tipo === "BUG") {
    base.critico = card.critico ?? false;
    base.passosReproducao = card.passosReproducao;
  }
  if (card.tipo === "MELHORIA") base.storyPoints = card.storyPoints;

  const merged = { ...base, ...patch };
  // Regra de domínio (Bug): crítico força prioridade ALTA.
  if (merged.tipo === "BUG" && merged.critico) merged.prioridade = "ALTA";
  return merged;
}

export function tipoDetalhe(card: CardView): string | null {
  if (card.tipo === "TAREFA") return card.estimativaHoras != null ? `${card.estimativaHoras} h` : null;
  if (card.tipo === "MELHORIA") return card.storyPoints != null ? `${card.storyPoints} pts` : null;
  return null;
}
