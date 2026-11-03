import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, MessageSquare, Pencil, Send, Trash2, X } from "lucide-react";
import { comentarioApi } from "@/api/endpoints";
import { qk, useComentarios } from "@/api/queries";
import type { ComentarioView } from "@/api/types";
import { displayName, formatDateTime, formatRelative } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useBoard } from "@/components/board/BoardContext";

export function CommentsSection({ cardId }: { cardId: string }) {
  const { data: comentarios, isLoading } = useComentarios(cardId);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [texto, setTexto] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.comentarios(cardId) });

  const criar = useMutation({
    mutationFn: (t: string) => comentarioApi.criar(cardId, { texto: t }),
    onSuccess: () => {
      invalidate();
      setTexto("");
    },
    onError: (e) => toast.error(e),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    criar.mutate(texto.trim());
  }

  return (
    <section className="section">
      <div className="section__head">
        <h3 className="section__title">
          <MessageSquare size={16} /> Comentários
          {comentarios && comentarios.length > 0 && <span className="badge badge--count">{comentarios.length}</span>}
        </h3>
      </div>

      <form className="comment-composer" onSubmit={onSubmit}>
        <Avatar email={user?.email} />
        <div className="grow stack" style={{ gap: 8 }}>
          <textarea
            className="textarea"
            placeholder="Escreva um comentário… (Ctrl+Enter para enviar)"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={2000}
            rows={2}
            aria-label="Novo comentário"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (texto.trim()) criar.mutate(texto.trim());
              }
            }}
          />
          <div className="row row--between">
            <span className="field__hint">{texto.length}/2000</span>
            <Button variant="primary" size="sm" type="submit" icon={<Send size={14} />} loading={criar.isPending} disabled={!texto.trim()}>
              Comentar
            </Button>
          </div>
        </div>
      </form>

      {isLoading && <div className="skeleton" style={{ height: 48 }} />}
      {comentarios && comentarios.length === 0 && <p className="section__empty">Ainda não há comentários.</p>}
      <div className="stack" style={{ gap: 18 }}>
        {comentarios?.map((c) => <CommentRow key={c.id} comentario={c} cardId={cardId} />)}
      </div>
    </section>
  );
}

function CommentRow({ comentario, cardId }: { comentario: ComentarioView; cardId: string }) {
  const { user } = useAuth();
  const { isAdmin } = useBoard();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [texto, setTexto] = useState(comentario.texto);

  const isAuthor = user?.email === comentario.autor.email;
  const editado = comentario.dataAtualizacao !== comentario.dataCriacao;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.comentarios(cardId) });

  const editar = useMutation({
    mutationFn: (t: string) => comentarioApi.atualizar(comentario.id, { texto: t }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
    onError: (e) => toast.error(e),
  });

  const excluir = useMutation({
    mutationFn: () => comentarioApi.excluir(comentario.id),
    onSuccess: invalidate,
    onError: (e) => toast.error(e),
  });

  return (
    <div className="comment">
      <Avatar email={comentario.autor.email} />
      <div className="comment__body">
        <div className="comment__head">
          <span className="comment__author">{displayName(comentario.autor.email)}</span>
          <span className="comment__time" title={formatDateTime(comentario.dataCriacao)}>
            {formatRelative(comentario.dataCriacao)}
            {editado && " · editado"}
          </span>
          {(isAuthor || isAdmin) && !editing && (
            <span className="comment__actions">
              {isAuthor && (
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon={<Pencil size={13} />}
                  onClick={() => {
                    setTexto(comentario.texto);
                    setEditing(true);
                  }}
                >
                  Editar comentário
                </Button>
              )}
              <Button variant="ghost" size="sm" iconOnly icon={<Trash2 size={13} />} onClick={() => excluir.mutate()} loading={excluir.isPending}>
                Excluir comentário
              </Button>
            </span>
          )}
        </div>
        {editing ? (
          <form
            className="stack"
            style={{ gap: 8, marginTop: 6 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (texto.trim()) editar.mutate(texto.trim());
            }}
          >
            <textarea
              className="textarea"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={2000}
              rows={3}
              autoFocus
              aria-label="Editar comentário"
              onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
            />
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" type="submit" icon={<Check size={14} />} loading={editar.isPending} disabled={!texto.trim()}>
                Salvar
              </Button>
            </div>
          </form>
        ) : (
          <p className="comment__text">{comentario.texto}</p>
        )}
      </div>
    </div>
  );
}
