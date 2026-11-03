import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { cardApi } from "@/api/endpoints";
import { qk } from "@/api/queries";
import type { CardRequest, Prioridade, TipoCard } from "@/api/types";
import { PRIORIDADES, STORY_POINTS_PERMITIDOS, TIPOS_CARD } from "@/api/types";
import { PRIORIDADE_META, TIPO_META } from "@/lib/meta";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { FieldWrap, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { PrioridadeBars, TipoIcon } from "@/components/ui/Badges";
import { useBoard } from "./BoardContext";

export function CardFormModal({ colunaId, onClose }: { colunaId: string; onClose: () => void }) {
  const { colunas, quadro, openCard } = useBoard();
  const coluna = colunas.find((c) => c.id === colunaId);
  const queryClient = useQueryClient();
  const toast = useToast();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<TipoCard>("TAREFA");
  const [prioridade, setPrioridade] = useState<Prioridade>("MEDIA");
  const [estimativa, setEstimativa] = useState("");
  const [critico, setCritico] = useState(false);
  const [passos, setPassos] = useState("");
  const [storyPoints, setStoryPoints] = useState<number>(3);

  const criar = useMutation({
    mutationFn: (dados: CardRequest) => cardApi.criar(colunaId, dados),
    onSuccess: (card) => {
      queryClient.invalidateQueries({ queryKey: qk.cardsDaColuna(colunaId) });
      queryClient.invalidateQueries({ queryKey: qk.quadro(quadro.id) });
      toast.success("Card criado", card.titulo);
      onClose();
      openCard(card.id);
    },
    onError: (e) => toast.error(e),
  });

  const estimativaNum = estimativa.trim() === "" ? null : Number(estimativa);
  const estimativaInvalida = estimativaNum != null && (!Number.isInteger(estimativaNum) || estimativaNum < 1);
  const prioridadeEfetiva: Prioridade = tipo === "BUG" && critico ? "ALTA" : prioridade;

  function montar(): CardRequest {
    const base: CardRequest = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      tipo,
      prioridade: prioridadeEfetiva,
    };
    if (tipo === "TAREFA") base.estimativaHoras = estimativaNum;
    if (tipo === "BUG") {
      base.critico = critico;
      base.passosReproducao = passos.trim() || null;
    }
    if (tipo === "MELHORIA") base.storyPoints = storyPoints;
    return base;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || estimativaInvalida) return;
    criar.mutate(montar());
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Novo card"
      subtitle={coluna ? `Na coluna “${coluna.nome}”` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="card-form" loading={criar.isPending} disabled={!titulo.trim() || estimativaInvalida}>
            Criar card
          </Button>
        </>
      }
    >
      <form id="card-form" className="stack" style={{ gap: 18 }} onSubmit={onSubmit}>
        <FieldWrap label="Tipo" hint={TIPO_META[tipo].descricao}>
          <div className="segmented segmented--block" role="radiogroup" aria-label="Tipo do card">
            {TIPOS_CARD.map((t) => (
              <button
                key={t}
                type="button"
                className="segmented__item"
                aria-pressed={tipo === t}
                onClick={() => setTipo(t)}
                style={tipo === t ? { color: TIPO_META[t].color } : undefined}
              >
                <TipoIcon tipo={t} size={14} />
                {TIPO_META[t].label}
              </button>
            ))}
          </div>
        </FieldWrap>

        <Input
          label="Título"
          placeholder="O que precisa ser feito?"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={255}
          required
          data-autofocus
          trailing={`${titulo.length}/255`}
        />

        <Textarea
          label="Descrição"
          placeholder="Contexto, critérios de aceite, links…"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          maxLength={2000}
          rows={4}
          trailing={`${descricao.length}/2000`}
        />

        <FieldWrap
          label="Prioridade"
          hint={tipo === "BUG" && critico ? "Bugs críticos têm prioridade ALTA obrigatoriamente." : undefined}
        >
          <div className="segmented segmented--block" role="radiogroup" aria-label="Prioridade">
            {PRIORIDADES.map((p) => (
              <button
                key={p}
                type="button"
                className="segmented__item"
                aria-pressed={prioridadeEfetiva === p}
                disabled={tipo === "BUG" && critico && p !== "ALTA"}
                onClick={() => setPrioridade(p)}
              >
                <PrioridadeBars prioridade={p} />
                {PRIORIDADE_META[p].label}
              </button>
            ))}
          </div>
        </FieldWrap>

        {tipo === "TAREFA" && (
          <Input
            label="Estimativa (horas)"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="Opcional"
            value={estimativa}
            onChange={(e) => setEstimativa(e.target.value)}
            hint="Esforço = horas ÷ 4, arredondado para cima (mínimo 1)."
            error={estimativaInvalida ? "Informe um inteiro de pelo menos 1 hora" : undefined}
          />
        )}

        {tipo === "BUG" && (
          <>
            <div className="row row--between" style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
              <div className="row" style={{ gap: 10 }}>
                <ShieldAlert size={18} style={{ color: critico ? "var(--danger)" : "var(--fg-muted)" }} />
                <div>
                  <div style={{ fontWeight: 500 }}>Bug crítico</div>
                  <div className="field__hint">Esforço 5 e prioridade ALTA travada.</div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={critico}
                className="switch"
                onClick={() => setCritico((v) => !v)}
                aria-label="Marcar como crítico"
              />
            </div>
            <Textarea
              label="Passos para reproduzir"
              placeholder={"1. Abrir a tela X\n2. Clicar em Y\n3. Observar o erro Z"}
              value={passos}
              onChange={(e) => setPassos(e.target.value)}
              maxLength={2000}
              rows={4}
              trailing={`${passos.length}/2000`}
            />
          </>
        )}

        {tipo === "MELHORIA" && (
          <FieldWrap label="Story points" hint="Escala permitida: 1, 2, 3, 4, 5 ou 8. O esforço do card é igual aos pontos.">
            <div className="segmented segmented--block" role="radiogroup" aria-label="Story points">
              {STORY_POINTS_PERMITIDOS.map((sp) => (
                <button key={sp} type="button" className="segmented__item" aria-pressed={storyPoints === sp} onClick={() => setStoryPoints(sp)}>
                  {sp}
                </button>
              ))}
            </div>
          </FieldWrap>
        )}
      </form>
    </Modal>
  );
}
