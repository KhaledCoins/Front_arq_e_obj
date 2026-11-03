// Metadados de apresentação para os enums do domínio.
import type { Papel, Prioridade, TipoCard } from "@/api/types";

export const TIPO_META: Record<
  TipoCard,
  { label: string; plural: string; color: string; soft: string; descricao: string }
> = {
  TAREFA: {
    label: "Tarefa",
    plural: "Tarefas",
    color: "var(--tipo-tarefa)",
    soft: "var(--tipo-tarefa-soft)",
    descricao: "Trabalho planejado com estimativa em horas.",
  },
  BUG: {
    label: "Bug",
    plural: "Bugs",
    color: "var(--tipo-bug)",
    soft: "var(--tipo-bug-soft)",
    descricao: "Defeito a corrigir. Bugs críticos têm prioridade ALTA obrigatória.",
  },
  MELHORIA: {
    label: "Melhoria",
    plural: "Melhorias",
    color: "var(--tipo-melhoria)",
    soft: "var(--tipo-melhoria-soft)",
    descricao: "Evolução do produto, estimada em story points.",
  },
};

export const PRIORIDADE_META: Record<Prioridade, { label: string; color: string; soft: string; rank: number }> = {
  BAIXA: { label: "Baixa", color: "var(--prio-baixa)", soft: "var(--prio-baixa-soft)", rank: 0 },
  MEDIA: { label: "Média", color: "var(--prio-media)", soft: "var(--prio-media-soft)", rank: 1 },
  ALTA: { label: "Alta", color: "var(--prio-alta)", soft: "var(--prio-alta-soft)", rank: 2 },
};

export const PAPEL_META: Record<Papel, { label: string; descricao: string }> = {
  ADMIN: { label: "Admin", descricao: "Gerencia colunas, membros e o quadro." },
  MEMBRO: { label: "Membro", descricao: "Cria e move cards, comenta e usa checklists." },
};

// Paleta sugerida para etiquetas (sempre #RRGGBB, como exige o backend).
export const ETIQUETA_PALETA = [
  "#2F5BFF",
  "#0EA5E9",
  "#14B8A6",
  "#22C55E",
  "#84CC16",
  "#EAB308",
  "#F59E0B",
  "#F97316",
  "#EF4444",
  "#EC4899",
  "#A855F7",
  "#6366F1",
  "#64748B",
  "#78716C",
];

export function esforcoLabel(esforco: number) {
  return `${esforco} ${esforco === 1 ? "ponto" : "pontos"} de esforço`;
}
