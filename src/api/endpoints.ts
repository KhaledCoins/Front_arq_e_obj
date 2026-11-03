// Uma função por rota do backend. Os caminhos seguem exatamente os controllers Java.
import { http } from "./client";
import type {
  CadastroUsuarioRequest,
  CardRequest,
  CardView,
  ChecklistRequest,
  ChecklistView,
  ColunaRequest,
  ColunaView,
  ComentarioRequest,
  ComentarioView,
  EtiquetaRequest,
  EtiquetaView,
  ItemChecklistRequest,
  ItemChecklistView,
  LoginRequest,
  LoginResponse,
  MembroQuadroRequest,
  MembroQuadroView,
  MoverCardRequest,
  PapelMembroRequest,
  PosicaoColunaRequest,
  PrioridadeCardRequest,
  PrioridadeView,
  QuadroRequest,
  QuadroView,
  ResponsavelCardRequest,
  UsuarioView,
  UUID,
} from "./types";

// ---- UsuarioController ----
export const usuarioApi = {
  cadastrar: (dados: CadastroUsuarioRequest) =>
    http.post<UsuarioView>("/usuarios", dados, false),
  login: (dados: LoginRequest) => http.post<LoginResponse>("/login", dados, false),
};

// ---- QuadroController ----
export const quadroApi = {
  listar: () => http.get<QuadroView[]>("/quadros"),
  obter: (id: UUID) => http.get<QuadroView>(`/quadros/${id}`),
  criar: (dados: QuadroRequest) => http.post<QuadroView>("/quadros", dados),
  atualizar: (id: UUID, dados: QuadroRequest) => http.put<QuadroView>(`/quadros/${id}`, dados),
  excluir: (id: UUID) => http.delete(`/quadros/${id}`),
};

// ---- ColunaController ----
export const colunaApi = {
  listar: (quadroId: UUID) => http.get<ColunaView[]>(`/quadros/${quadroId}/colunas`),
  obter: (id: UUID) => http.get<ColunaView>(`/colunas/${id}`),
  criar: (quadroId: UUID, dados: ColunaRequest) =>
    http.post<ColunaView>(`/quadros/${quadroId}/colunas`, dados),
  atualizar: (id: UUID, dados: ColunaRequest) => http.put<ColunaView>(`/colunas/${id}`, dados),
  excluir: (id: UUID) => http.delete(`/colunas/${id}`),
  posicionar: (id: UUID, dados: PosicaoColunaRequest) =>
    http.patch<ColunaView>(`/colunas/${id}/posicao`, dados),
};

// ---- CardController ----
export const cardApi = {
  listar: (colunaId: UUID) => http.get<CardView[]>(`/colunas/${colunaId}/cards`),
  obter: (id: UUID) => http.get<CardView>(`/cards/${id}`),
  criar: (colunaId: UUID, dados: CardRequest) =>
    http.post<CardView>(`/colunas/${colunaId}/cards`, dados),
  atualizar: (id: UUID, dados: CardRequest) => http.put<CardView>(`/cards/${id}`, dados),
  excluir: (id: UUID) => http.delete(`/cards/${id}`),
  mover: (id: UUID, dados: MoverCardRequest) => http.patch<CardView>(`/cards/${id}/mover`, dados),
  responsavel: (id: UUID, dados: ResponsavelCardRequest) =>
    http.patch<CardView>(`/cards/${id}/responsavel`, dados),
  prioridade: (id: UUID, dados: PrioridadeCardRequest) =>
    http.patch<CardView>(`/cards/${id}/prioridade`, dados),
  adicionarEtiqueta: (id: UUID, etiquetaId: UUID) =>
    http.put<CardView>(`/cards/${id}/etiquetas/${etiquetaId}`),
  removerEtiqueta: (id: UUID, etiquetaId: UUID) =>
    http.delete<CardView>(`/cards/${id}/etiquetas/${etiquetaId}`),
};

// ---- ChecklistController ----
export const checklistApi = {
  listar: (cardId: UUID) => http.get<ChecklistView[]>(`/cards/${cardId}/checklists`),
  obter: (id: UUID) => http.get<ChecklistView>(`/checklists/${id}`),
  criar: (cardId: UUID, dados: ChecklistRequest) =>
    http.post<ChecklistView>(`/cards/${cardId}/checklists`, dados),
  atualizar: (id: UUID, dados: ChecklistRequest) =>
    http.put<ChecklistView>(`/checklists/${id}`, dados),
  excluir: (id: UUID) => http.delete(`/checklists/${id}`),
};

// ---- ItemChecklistController ----
export const itemChecklistApi = {
  listar: (checklistId: UUID) =>
    http.get<ItemChecklistView[]>(`/checklists/${checklistId}/itens`),
  obter: (id: UUID) => http.get<ItemChecklistView>(`/itens/${id}`),
  criar: (checklistId: UUID, dados: ItemChecklistRequest) =>
    http.post<ItemChecklistView>(`/checklists/${checklistId}/itens`, dados),
  atualizar: (id: UUID, dados: ItemChecklistRequest) =>
    http.put<ItemChecklistView>(`/itens/${id}`, dados),
  excluir: (id: UUID) => http.delete(`/itens/${id}`),
};

// ---- ComentarioController ----
export const comentarioApi = {
  listar: (cardId: UUID) => http.get<ComentarioView[]>(`/cards/${cardId}/comentarios`),
  obter: (id: UUID) => http.get<ComentarioView>(`/comentarios/${id}`),
  criar: (cardId: UUID, dados: ComentarioRequest) =>
    http.post<ComentarioView>(`/cards/${cardId}/comentarios`, dados),
  atualizar: (id: UUID, dados: ComentarioRequest) =>
    http.put<ComentarioView>(`/comentarios/${id}`, dados),
  excluir: (id: UUID) => http.delete(`/comentarios/${id}`),
};

// ---- EtiquetaController ----
export const etiquetaApi = {
  listar: (quadroId: UUID) => http.get<EtiquetaView[]>(`/quadros/${quadroId}/etiquetas`),
  obter: (id: UUID) => http.get<EtiquetaView>(`/etiquetas/${id}`),
  criar: (quadroId: UUID, dados: EtiquetaRequest) =>
    http.post<EtiquetaView>(`/quadros/${quadroId}/etiquetas`, dados),
  atualizar: (id: UUID, dados: EtiquetaRequest) =>
    http.put<EtiquetaView>(`/etiquetas/${id}`, dados),
  excluir: (id: UUID) => http.delete(`/etiquetas/${id}`),
};

// ---- MembroQuadroController ----
export const membroApi = {
  listar: (quadroId: UUID) => http.get<MembroQuadroView[]>(`/quadros/${quadroId}/membros`),
  obter: (id: UUID) => http.get<MembroQuadroView>(`/membros/${id}`),
  criar: (quadroId: UUID, dados: MembroQuadroRequest) =>
    http.post<MembroQuadroView>(`/quadros/${quadroId}/membros`, dados),
  atualizar: (id: UUID, dados: PapelMembroRequest) =>
    http.put<MembroQuadroView>(`/membros/${id}`, dados),
  excluir: (id: UUID) => http.delete(`/membros/${id}`),
};

// ---- PrioridadeController ----
export const prioridadeApi = {
  listar: () => http.get<PrioridadeView[]>("/prioridades"),
};
