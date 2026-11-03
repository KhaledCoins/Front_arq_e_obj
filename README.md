# Kanban — Frontend

Interface web da API Kanban (Spring Boot). O backend fica no repositório do grupo: <https://github.com/gaborocha147-create/arqobj-final-project-kanban>. Feita com **Vite + React + TypeScript**, TanStack Query para cache/sincronização com a API, dnd-kit para arrastar cards e colunas e CSS próprio com design tokens (tema claro e escuro).

## Rodando em desenvolvimento

1. Suba o backend (repositório do grupo, porta 8080):

   ```bash
   ./mvnw spring-boot:run
   ```

2. Instale e rode o frontend:

   ```bash
   npm install
   npm run dev
   ```

3. Abra <http://localhost:5173>.

O Vite encaminha tudo que começa com `/api` para `http://localhost:8080`, sem o prefixo. Assim o navegador enxerga uma única origem e o backend não precisa de CORS. Para apontar para outro backend em dev, defina `VITE_API_URL`.

## Scripts

| Comando             | O que faz                                   |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | servidor de desenvolvimento com HMR         |
| `npm run build`     | typecheck + build de produção em `dist/`    |
| `npm run preview`   | serve o build (também com proxy `/api`)     |
| `npm run typecheck` | só o `tsc`                                  |

## Estrutura

```
src/
  api/        tipos espelhados das classes Java, cliente HTTP, um endpoint por rota, hooks de query
  components/ ui (botões, campos, modal, menu…), board (colunas, cards, modais), card (checklists, comentários)
  hooks/      autenticação (JWT), tema, toasts
  lib/        metadados dos enums, formatação, conversão CardView -> CardRequest
  pages/      Auth, lista de quadros, quadro
  styles/     tokens, base, componentes, layout, board
```

## Mapa das rotas do backend usadas

| Recurso        | Rotas                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| Usuário        | `POST /usuarios`, `POST /login`                                                                         |
| Quadro         | `GET/POST /quadros`, `GET/PUT/DELETE /quadros/{id}`                                                     |
| Coluna         | `GET/POST /quadros/{id}/colunas`, `PUT/DELETE /colunas/{id}`, `PATCH /colunas/{id}/posicao`             |
| Card           | `GET/POST /colunas/{id}/cards`, `GET/PUT/DELETE /cards/{id}`, `PATCH …/mover`, `…/responsavel`, `…/prioridade`, `PUT/DELETE /cards/{id}/etiquetas/{etiquetaId}` |
| Checklist      | `GET/POST /cards/{id}/checklists`, `PUT/DELETE /checklists/{id}`                                        |
| Item checklist | `GET/POST /checklists/{id}/itens`, `PUT/DELETE /itens/{id}`                                             |
| Comentário     | `GET/POST /cards/{id}/comentarios`, `PUT/DELETE /comentarios/{id}`                                      |
| Etiqueta       | `GET/POST /quadros/{id}/etiquetas`, `PUT/DELETE /etiquetas/{id}`                                        |
| Membro         | `GET/POST /quadros/{id}/membros`, `PUT/DELETE /membros/{id}`                                            |

Regras de domínio refletidas na UI: tipos de card (Tarefa com estimativa em horas, Bug com crítico + passos de reprodução, Melhoria com story points 1/2/3/4/5/8), bug crítico trava prioridade ALTA, limite WIP por coluna (bloqueio visual + mensagem), só admin gerencia colunas/membros/quadro, só o autor edita o próprio comentário (admin pode excluir), o quadro precisa manter ao menos um admin.

### Convidar membros

A API não tem busca de usuários: `POST /quadros/{id}/membros` recebe o **UUID** do usuário. Cada pessoa vê o próprio ID em **Membros → Seu ID** e pode copiá-lo para quem vai convidar.

## Deploy na Vercel

O projeto já traz um `vercel.json`:

- `rewrites` de `/api/*` para o backend (hoje `https://arqobj-final-project-kanban.onrender.com`, o backend do grupo no Render). Como o rewrite é feito no servidor da Vercel, o backend **não precisa de CORS**.
- fallback de SPA (`/* -> /index.html`) para as rotas do React Router.

Passos:

1. Publique o backend em algum host público (Render, Railway, Fly.io, Azure…). Ele usa H2 em arquivo, então configure um volume persistente ou troque o datasource.
2. Ajuste a URL em `vercel.json`.
3. Na Vercel, crie o projeto apontando para este repositório (framework Vite é detectado automaticamente).
4. (Opcional) Adicione um domínio em *Settings → Domains*.

Alternativa sem rewrite: defina `VITE_API_BASE=https://seu-backend` no build e libere CORS no `SecurityConfig` do backend para a origem da Vercel.
