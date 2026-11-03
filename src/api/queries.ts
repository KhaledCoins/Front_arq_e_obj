import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  cardApi,
  checklistApi,
  colunaApi,
  comentarioApi,
  etiquetaApi,
  membroApi,
  quadroApi,
} from "./endpoints";
import type { CardView, ColunaView, UUID } from "./types";

// Chaves de cache centralizadas: toda invalidação usa estas funções.
export const qk = {
  quadros: ["quadros"] as const,
  quadro: (id: UUID) => ["quadros", id] as const,
  colunas: (quadroId: UUID) => ["quadros", quadroId, "colunas"] as const,
  membros: (quadroId: UUID) => ["quadros", quadroId, "membros"] as const,
  etiquetas: (quadroId: UUID) => ["quadros", quadroId, "etiquetas"] as const,
  cardsDaColuna: (colunaId: UUID) => ["colunas", colunaId, "cards"] as const,
  card: (id: UUID) => ["cards", id] as const,
  checklists: (cardId: UUID) => ["cards", cardId, "checklists"] as const,
  comentarios: (cardId: UUID) => ["cards", cardId, "comentarios"] as const,
};

export const useQuadros = () => useQuery({ queryKey: qk.quadros, queryFn: quadroApi.listar });

export const useQuadro = (id: UUID) =>
  useQuery({ queryKey: qk.quadro(id), queryFn: () => quadroApi.obter(id) });

export const useColunas = (quadroId: UUID) =>
  useQuery({
    queryKey: qk.colunas(quadroId),
    queryFn: () => colunaApi.listar(quadroId),
    select: (cols) => [...cols].sort((a, b) => a.posicao - b.posicao),
  });

export const useMembros = (quadroId: UUID) =>
  useQuery({ queryKey: qk.membros(quadroId), queryFn: () => membroApi.listar(quadroId) });

export const useEtiquetas = (quadroId: UUID) =>
  useQuery({ queryKey: qk.etiquetas(quadroId), queryFn: () => etiquetaApi.listar(quadroId) });

export const useCard = (id: UUID | undefined, initial?: CardView) =>
  useQuery({
    queryKey: qk.card(id ?? ""),
    queryFn: () => cardApi.obter(id!),
    enabled: Boolean(id),
    placeholderData: initial,
  });

export const useChecklists = (cardId: UUID) =>
  useQuery({ queryKey: qk.checklists(cardId), queryFn: () => checklistApi.listar(cardId) });

export const useComentarios = (cardId: UUID) =>
  useQuery({ queryKey: qk.comentarios(cardId), queryFn: () => comentarioApi.listar(cardId) });

// Cards de todas as colunas de um quadro, uma query por coluna (cache por coluna
// permite atualizações otimistas finas ao mover um card).
export function useCardsPorColuna(colunas: ColunaView[] | undefined) {
  const results = useQueries({
    queries: (colunas ?? []).map((c) => ({
      queryKey: qk.cardsDaColuna(c.id),
      queryFn: () => cardApi.listar(c.id),
    })),
  }) as UseQueryResult<CardView[]>[];

  const porColuna = new Map<UUID, CardView[]>();
  (colunas ?? []).forEach((c, i) => porColuna.set(c.id, results[i]?.data ?? []));

  return {
    porColuna,
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
  };
}
