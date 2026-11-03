// Tipos espelhados 1:1 das classes Java do backend
// (br.insper.edu.kanban.view.*, DTO.*, usuario.*, model.*).

export type UUID = string;

// ---- Enums (model) ----
export type Prioridade = "BAIXA" | "MEDIA" | "ALTA";
export type TipoCard = "TAREFA" | "BUG" | "MELHORIA";
export type Papel = "ADMIN" | "MEMBRO";

export const PRIORIDADES: Prioridade[] = ["BAIXA", "MEDIA", "ALTA"];
export const TIPOS_CARD: TipoCard[] = ["TAREFA", "BUG", "MELHORIA"];
export const STORY_POINTS_PERMITIDOS = [1, 2, 3, 4, 5, 8] as const;

// ---- Views (respostas) ----
export interface UsuarioView {
  id: UUID;
  email: string;
}

export interface LoginResponse {
  token: string;
  tipo: string; // "Bearer"
}

export interface QuadroView {
  id: UUID;
  nome: string;
  descricao: string | null;
  quantidadeCards: number;
}

export interface ColunaView {
  id: UUID;
  nome: string;
  posicao: number;
  limiteWip: number | null;
  quadroId: UUID;
  quantidadeCards: number;
}

export interface EtiquetaView {
  id: UUID;
  nome: string;
  cor: string; // #RRGGBB
  quadroId: UUID;
}

export interface CardView {
  id: UUID;
  titulo: string;
  descricao: string | null;
  tipo: TipoCard;
  prioridade: Prioridade;
  esforco: number;
  colunaId: UUID;
  responsavel: UsuarioView | null;
  // Tarefa
  estimativaHoras: number | null;
  // Bug
  critico: boolean | null;
  passosReproducao: string | null;
  // Melhoria
  storyPoints: number | null;
  /** Ordem dentro da coluna (0 = topo). Ausente em versões do backend sem ordenação. */
  posicao?: number;
  etiquetas: EtiquetaView[];
  dataCriacao: string;
  dataAtualizacao: string;
}

export interface ItemChecklistView {
  id: UUID;
  descricao: string;
  concluido: boolean;
  checklistId: UUID;
}

export interface ChecklistView {
  id: UUID;
  titulo: string;
  cardId: UUID;
  percentualConcluido: number;
  itens: ItemChecklistView[];
}

export interface ComentarioView {
  id: UUID;
  texto: string;
  cardId: UUID;
  autor: UsuarioView;
  dataCriacao: string;
  dataAtualizacao: string;
}

export interface MembroQuadroView {
  id: UUID;
  usuario: UsuarioView;
  quadroId: UUID;
  papel: Papel;
  dataEntrada: string;
}

export interface PrioridadeView {
  valor: Prioridade;
}

// ---- Requests (DTOs) ----
export interface CadastroUsuarioRequest {
  email: string;
  senha: string;
}
export type LoginRequest = CadastroUsuarioRequest;

export interface AlterarSenhaRequest {
  senhaAtual: string;
  novaSenha: string;
}

export interface QuadroRequest {
  nome: string;
  descricao?: string | null;
}

export interface ColunaRequest {
  nome: string;
  limiteWip?: number | null;
}

export interface PosicaoColunaRequest {
  posicao: number;
}

export interface CardRequest {
  titulo: string;
  descricao?: string | null;
  tipo: TipoCard;
  prioridade: Prioridade;
  // Enviar SOMENTE os campos do tipo escolhido — o backend rejeita campos de outro tipo.
  estimativaHoras?: number | null;
  critico?: boolean | null;
  passosReproducao?: string | null;
  storyPoints?: number | null;
}

export interface MoverCardRequest {
  colunaId: UUID;
  /** Índice de destino na coluna; omitido = fim da coluna. */
  posicao?: number;
}
export interface ResponsavelCardRequest {
  usuarioId: UUID | null;
}
export interface PrioridadeCardRequest {
  prioridade: Prioridade;
}

export interface ChecklistRequest {
  titulo: string;
}
export interface ItemChecklistRequest {
  descricao: string;
  concluido: boolean;
}
export interface ComentarioRequest {
  texto: string;
}
export interface EtiquetaRequest {
  nome: string;
  cor: string;
}
export interface MembroQuadroRequest {
  email: string;
  papel: Papel;
}
export interface PapelMembroRequest {
  papel: Papel;
}

// ---- Erros (common.ErrorResponseDTO) ----
export interface ErrorResponseDTO {
  status: number;
  errors: string[];
  message: string;
}
