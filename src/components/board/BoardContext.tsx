import { createContext, useContext } from "react";
import type { ColunaView, EtiquetaView, MembroQuadroView, QuadroView, UUID } from "@/api/types";

export interface BoardContextValue {
  quadro: QuadroView;
  colunas: ColunaView[];
  membros: MembroQuadroView[];
  etiquetas: EtiquetaView[];
  /** Membro correspondente ao usuário logado. */
  me: MembroQuadroView | undefined;
  isAdmin: boolean;
  openCard: (cardId: UUID) => void;
  openNewCard: (colunaId: UUID) => void;
}

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard deve ser usado dentro de BoardContext");
  return ctx;
}
