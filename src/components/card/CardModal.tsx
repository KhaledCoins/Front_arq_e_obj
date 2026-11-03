import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlignLeft, Clock, Columns3, Gauge, ShieldAlert, Tag, Trash2, UserRound, X, Zap } from "lucide-react";
import { cardApi } from "@/api/endpoints";
import { qk, useCard } from "@/api/queries";
import type { CardRequest, CardView, Prioridade } from "@/api/types";
import { PRIORIDADES, STORY_POINTS_PERMITIDOS } from "@/api/types";
import { PRIORIDADE_META, TIPO_META, esforcoLabel } from "@/lib/meta";
import { cardToRequest } from "@/lib/card";
import { displayName, formatDateTime, readableOn } from "@/lib/format";
import { useToast } from "@/hooks/useToast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Spinner } from "@/components/ui/Misc";
import { PrioridadeBars, TipoBadge } from "@/components/ui/Badges";
import { useBoard } from "@/components/board/BoardContext";
import { ChecklistSection } from "./ChecklistSection";
import { CommentsSection } from "./CommentsSection";

interface CardModalProps {
  cardId: string;
  initial?: CardView;
  onClose: () => void;
}

export function CardModal({ cardId, initial, onClose }: CardModalProps) {
  const { data: card, isLoading, isError, error } = useCard(cardId, initial);

  return (
    <Modal open onClose={onClose} size="xl" bare className="card-modal-shell">
      <Button className="card-modal__close" variant="ghost" iconOnly icon={<X size={18} />} onClick={onClose} aria-label="Fechar">
        Fechar
      </Button>
      {isLoading && !card && <Spinner />}
      {isError && (
        <div className="modal__body">
          <div className="callout callout--danger">{(error as Error).message}</div>
        </div>
      )}
      {card && <CardDetails card={card} onClose={onClose} />}
    </Modal>
  );
}

function CardDetails({ card, onClose }: { card: CardView; onClose: () => void }) {
  const { quadro, colunas, membros, etiquetas } = useBoard();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);
  const tipo = TIPO_META[card.tipo];
  const coluna = colunas.find((c) => c.id === card.colunaId);

  // Invalida tudo que exibe este card.
  const refresh = (colunaIds: string[] = [card.colunaId]) => {
    queryClient.invalidateQueries({ queryKey: qk.card(card.id) });
    colunaIds.forEach((id) => queryClient.invalidateQueries({ queryKey: qk.cardsDaColuna(id) }));
    queryClient.invalidateQueries({ queryKey: qk.quadro(quadro.id) });
  };

  const atualizar = useMutation({
    mutationFn: (patch: Partial<CardRequest>) => cardApi.atualizar(card.id, cardToRequest(card, patch)),
    onSuccess: (novo) => {
      queryClient.setQueryData(qk.card(card.id), novo);
      refresh();
    },
    onError: (e) => toast.error(e),
  });

  const prioridade = useMutation({
    mutationFn: (p: Prioridade) => cardApi.prioridade(card.id, { prioridade: p }),
    onSuccess: (novo) => {
      queryClient.setQueryData(qk.card(card.id), novo);
      refresh();
    },
    onError: (e) => toast.error(e),
  });

  const responsavel = useMutation({
    mutationFn: (usuarioId: string | null) => cardApi.responsavel(card.id, { usuarioId }),
    onSuccess: (novo) => {
      queryClient.setQueryData(qk.card(card.id), novo);
      refresh();
    },
    onError: (e) => toast.error(e),
  });

  const mover = useMutation({
    mutationFn: (colunaId: string) => cardApi.mover(card.id, { colunaId }),
    onSuccess: (novo, colunaId) => {
      queryClient.setQueryData(qk.card(card.id), novo);
      refresh([card.colunaId, colunaId]);
      toast.success("Card movido", colunas.find((c) => c.id === colunaId)?.nome);
    },
    onError: (e) => toast.error(e),
  });

  const etiqueta = useMutation({
    mutationFn: ({ id, ativa }: { id: string; ativa: boolean }) =>
      ativa ? cardApi.removerEtiqueta(card.id, id) : cardApi.adicionarEtiqueta(card.id, id),
    onSuccess: (novo) => {
      queryClient.setQueryData(qk.card(card.id), novo);
      refresh();
    },
    onError: (e) => toast.error(e),
  });

  const excluir = useMutation({
    mutationFn: () => cardApi.excluir(card.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: qk.card(card.id) });
      queryClient.invalidateQueries({ queryKey: qk.cardsDaColuna(card.colunaId) });
      queryClient.invalidateQueries({ queryKey: qk.quadro(quadro.id) });
      toast.success("Card excluído");
      onClose();
    },
    onError: (e) => toast.error(e),
  });

  const criticoTravaPrioridade = card.tipo === "BUG" && Boolean(card.critico);
  const tipoStyle = { "--card-tipo": tipo.color } as CSSProperties;

  return (
    <div className="card-modal" style={tipoStyle}>
      <div className="card-modal__main">
        <div>
          <div className="card-modal__topline">
            <TipoBadge tipo={card.tipo} />
            {coluna && (
              <span className="badge badge--outline">
                <Columns3 size={12} /> {coluna.nome}
              </span>
            )}
            {card.tipo === "BUG" && card.critico && (
              <span className="badge badge--soft" style={{ "--badge-soft": "var(--danger-soft)", "--badge-color": "var(--danger)" } as CSSProperties}>
                <ShieldAlert size={12} /> Crítico
              </span>
            )}
          </div>
          <TitleEditor
            key={card.titulo}
            value={card.titulo}
            onSave={(titulo) => titulo !== card.titulo && atualizar.mutate({ titulo })}
          />
        </div>

        <section className="section">
          <div className="section__head">
            <h3 className="section__title">
              <AlignLeft size={16} /> Descrição
            </h3>
          </div>
          <DescriptionEditor
            key={card.descricao ?? ""}
            value={card.descricao ?? ""}
            onSave={(descricao) => (descricao || null) !== (card.descricao || null) && atualizar.mutate({ descricao: descricao || null })}
          />
        </section>

        {card.tipo === "BUG" && (
          <section className="section">
            <div className="section__head">
              <h3 className="section__title">
                <ShieldAlert size={16} /> Passos para reproduzir
              </h3>
            </div>
            <DescriptionEditor
              key={card.passosReproducao ?? ""}
              value={card.passosReproducao ?? ""}
              placeholder="Descreva como reproduzir o bug…"
              onSave={(passos) =>
                (passos || null) !== (card.passosReproducao || null) && atualizar.mutate({ passosReproducao: passos || null })
              }
            />
          </section>
        )}

        <ChecklistSection cardId={card.id} />
        <CommentsSection cardId={card.id} />
      </div>

      <aside className="card-modal__aside">
        <div className="aside-field">
          <span className="aside-field__label">Prioridade</span>
          <div className="segmented segmented--block">
            {PRIORIDADES.map((p) => (
              <button
                key={p}
                type="button"
                className="segmented__item"
                aria-pressed={card.prioridade === p}
                disabled={prioridade.isPending || (criticoTravaPrioridade && p !== "ALTA")}
                onClick={() => p !== card.prioridade && prioridade.mutate(p)}
                title={criticoTravaPrioridade && p !== "ALTA" ? "Bug crítico deve ter prioridade ALTA" : undefined}
              >
                <PrioridadeBars prioridade={p} />
                {PRIORIDADE_META[p].label}
              </button>
            ))}
          </div>
        </div>

        <div className="aside-field">
          <span className="aside-field__label">Responsável</span>
          <div className="row">
            <UserRound size={16} className="muted" />
            <select
              className="select grow"
              value={card.responsavel?.id ?? ""}
              disabled={responsavel.isPending}
              onChange={(e) => responsavel.mutate(e.target.value || null)}
              aria-label="Responsável"
            >
              <option value="">Sem responsável</option>
              {membros.map((m) => (
                <option key={m.usuario.id} value={m.usuario.id}>
                  {displayName(m.usuario.email)} · {m.usuario.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="aside-field">
          <span className="aside-field__label">Coluna</span>
          <div className="row">
            <Columns3 size={16} className="muted" />
            <select
              className="select grow"
              value={card.colunaId}
              disabled={mover.isPending}
              onChange={(e) => e.target.value !== card.colunaId && mover.mutate(e.target.value)}
              aria-label="Coluna"
            >
              {colunas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.limiteWip != null ? ` (${c.quantidadeCards}/${c.limiteWip})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="aside-field">
          <span className="aside-field__label">
            <Tag size={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} />
            Etiquetas
          </span>
          {etiquetas.length === 0 ? (
            <span className="field__hint">Nenhuma etiqueta no quadro ainda.</span>
          ) : (
            <div className="label-picker">
              {etiquetas.map((e) => {
                const ativa = card.etiquetas.some((ce) => ce.id === e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    className="label-chip"
                    aria-pressed={ativa}
                    disabled={etiqueta.isPending}
                    style={{ "--chip-color": e.cor, "--chip-fg": readableOn(e.cor) } as CSSProperties}
                    onClick={() => etiqueta.mutate({ id: e.id, ativa })}
                  >
                    <span className="label-chip__dot" style={{ background: ativa ? "currentColor" : e.cor }} />
                    {e.nome}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="divider" />

        {card.tipo === "TAREFA" && (
          <div className="aside-field">
            <span className="aside-field__label">Estimativa (horas)</span>
            <NumberEditor
              key={String(card.estimativaHoras)}
              value={card.estimativaHoras}
              min={1}
              placeholder="Sem estimativa"
              icon={<Clock size={16} className="muted" />}
              onSave={(v) => v !== card.estimativaHoras && atualizar.mutate({ estimativaHoras: v })}
            />
            <span className="field__hint">Esforço = horas ÷ 4, arredondado para cima.</span>
          </div>
        )}

        {card.tipo === "MELHORIA" && (
          <div className="aside-field">
            <span className="aside-field__label">Story points</span>
            <div className="segmented segmented--block">
              {STORY_POINTS_PERMITIDOS.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  className="segmented__item"
                  aria-pressed={card.storyPoints === sp}
                  disabled={atualizar.isPending}
                  onClick={() => sp !== card.storyPoints && atualizar.mutate({ storyPoints: sp })}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>
        )}

        {card.tipo === "BUG" && (
          <div className="aside-field">
            <span className="aside-field__label">Severidade</span>
            <div className="row row--between" style={{ padding: "8px 10px", background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
              <span className="row" style={{ gap: 8 }}>
                <ShieldAlert size={16} style={{ color: card.critico ? "var(--danger)" : "var(--fg-muted)" }} />
                <span style={{ fontSize: "var(--fs-sm)", fontWeight: 500 }}>Bug crítico</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(card.critico)}
                className="switch"
                disabled={atualizar.isPending}
                onClick={() => atualizar.mutate({ critico: !card.critico })}
                aria-label="Marcar como crítico"
              />
            </div>
            <span className="field__hint">Crítico: esforço 5 e prioridade ALTA travada.</span>
          </div>
        )}

        <div className="aside-field">
          <span className="aside-field__label">Esforço</span>
          <span className="row" style={{ fontWeight: 600 }} title={esforcoLabel(card.esforco)}>
            <Zap size={16} className="muted" /> {card.esforco}
            <span className="muted" style={{ fontWeight: 400, fontSize: "var(--fs-xs)" }}>
              {card.tipo === "MELHORIA" && <><Gauge size={11} style={{ display: "inline" }} /> igual aos story points</>}
              {card.tipo === "BUG" && (card.critico ? "crítico" : "padrão")}
              {card.tipo === "TAREFA" && "calculado pela estimativa"}
            </span>
          </span>
        </div>

        <div className="divider" />

        <div className="aside-meta">
          <div>
            <span>Criado</span>
            <span>{formatDateTime(card.dataCriacao)}</span>
          </div>
          <div>
            <span>Atualizado</span>
            <span>{formatDateTime(card.dataAtualizacao)}</span>
          </div>
        </div>

        <div style={{ marginTop: "auto" }}>
          <Button variant="danger-ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleting(true)} block>
            Excluir card
          </Button>
        </div>
      </aside>

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title={`Excluir "${card.titulo}"?`}
        description="Checklists e comentários do card também serão removidos."
        confirmLabel="Excluir card"
        onConfirm={() => excluir.mutateAsync()}
      />
    </div>
  );
}

function TitleEditor({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [text, setText] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  function commit() {
    const t = text.trim();
    if (!t) {
      setText(value);
      return;
    }
    onSave(t);
  }

  return (
    <textarea
      ref={ref}
      className="card-modal__title"
      value={text}
      rows={1}
      maxLength={255}
      aria-label="Título do card"
      onChange={(e) => setText(e.target.value.replace(/\n/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
        if (e.key === "Escape") {
          setText(value);
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
    />
  );
}

function DescriptionEditor({ value, onSave, placeholder = "Adicione uma descrição…" }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  if (!editing) {
    return (
      <div
        className={["description-view", !value && "description-view--empty"].filter(Boolean).join(" ")}
        role="button"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
      >
        {value || placeholder}
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <textarea
        className="textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={5}
        autoFocus
        aria-label="Descrição"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setText(value);
            setEditing(false);
          }
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            onSave(text.trim());
            setEditing(false);
          }
        }}
      />
      <div className="row row--between">
        <span className="field__hint">{text.length}/2000 · Ctrl+Enter salva</span>
        <span className="row">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setText(value);
              setEditing(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onSave(text.trim());
              setEditing(false);
            }}
          >
            Salvar
          </Button>
        </span>
      </div>
    </div>
  );
}

function NumberEditor({
  value,
  min,
  placeholder,
  icon,
  onSave,
}: {
  value: number | null;
  min: number;
  placeholder: string;
  icon: React.ReactNode;
  onSave: (v: number | null) => void;
}) {
  const [text, setText] = useState(value != null ? String(value) : "");
  const num = text.trim() === "" ? null : Number(text);
  const invalid = num != null && (!Number.isInteger(num) || num < min);

  function commit() {
    if (invalid) {
      setText(value != null ? String(value) : "");
      return;
    }
    onSave(num);
  }

  return (
    <div className="row">
      {icon}
      <input
        className="input grow"
        type="number"
        min={min}
        step={1}
        inputMode="numeric"
        placeholder={placeholder}
        value={text}
        aria-invalid={invalid || undefined}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        aria-label={placeholder}
      />
    </div>
  );
}
