import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { etiquetaApi } from "@/api/endpoints";
import { qk } from "@/api/queries";
import type { EtiquetaRequest, EtiquetaView } from "@/api/types";
import { ETIQUETA_PALETA } from "@/lib/meta";
import { readableOn } from "@/lib/format";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/Misc";
import { useBoard } from "./BoardContext";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function LabelsModal({ onClose }: { onClose: () => void }) {
  const { quadro, etiquetas } = useBoard();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<EtiquetaView | null>(null);
  const [creating, setCreating] = useState(false);
  const [removendo, setRemovendo] = useState<EtiquetaView | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk.etiquetas(quadro.id) });
    queryClient.invalidateQueries({ queryKey: ["colunas"] });
    queryClient.invalidateQueries({ queryKey: ["cards"] });
  };

  const remover = useMutation({
    mutationFn: (id: string) => etiquetaApi.excluir(id),
    onSuccess: () => {
      invalidate();
      toast.success("Etiqueta excluída");
    },
    onError: (e) => toast.error(e),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Etiquetas"
      subtitle="Etiquetas são do quadro e podem ser aplicadas a qualquer card."
      footer={
        !creating && !editing ? (
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
            Nova etiqueta
          </Button>
        ) : undefined
      }
    >
      {creating && (
        <LabelForm
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            invalidate();
          }}
        />
      )}

      {etiquetas.length === 0 && !creating ? (
        <EmptyState icon={<Tag size={22} />} title="Nenhuma etiqueta" description="Crie etiquetas para categorizar os cards por área, cliente, sprint…" />
      ) : (
        <div className="list">
          {etiquetas.map((e) =>
            editing?.id === e.id ? (
              <div className="list__item" key={e.id} style={{ display: "block" }}>
                <LabelForm
                  etiqueta={e}
                  onCancel={() => setEditing(null)}
                  onSaved={() => {
                    setEditing(null);
                    invalidate();
                  }}
                />
              </div>
            ) : (
              <div className="list__item" key={e.id}>
                <span className="tag" style={{ background: e.cor, color: readableOn(e.cor), height: 24, fontSize: 12, maxWidth: 220 }}>
                  {e.nome}
                </span>
                <span className="list__sub mono" style={{ marginLeft: "auto" }}>
                  {e.cor.toUpperCase()}
                </span>
                <div className="list__actions">
                  <Button variant="ghost" size="sm" iconOnly icon={<Pencil size={15} />} onClick={() => setEditing(e)}>
                    Editar etiqueta
                  </Button>
                  <Button variant="ghost" size="sm" iconOnly icon={<Trash2 size={15} />} onClick={() => setRemovendo(e)}>
                    Excluir etiqueta
                  </Button>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(removendo)}
        onClose={() => setRemovendo(null)}
        title={`Excluir etiqueta "${removendo?.nome}"?`}
        description="Ela será removida de todos os cards que a usam."
        confirmLabel="Excluir"
        onConfirm={() => (removendo ? remover.mutateAsync(removendo.id) : undefined)}
      />
    </Modal>
  );
}

function LabelForm({ etiqueta, onCancel, onSaved }: { etiqueta?: EtiquetaView; onCancel: () => void; onSaved: () => void }) {
  const { quadro } = useBoard();
  const toast = useToast();
  const [nome, setNome] = useState(etiqueta?.nome ?? "");
  const [cor, setCor] = useState(etiqueta?.cor ?? ETIQUETA_PALETA[0]);

  const salvar = useMutation({
    mutationFn: (dados: EtiquetaRequest) =>
      etiqueta ? etiquetaApi.atualizar(etiqueta.id, dados) : etiquetaApi.criar(quadro.id, dados),
    onSuccess: () => {
      toast.success(etiqueta ? "Etiqueta atualizada" : "Etiqueta criada");
      onSaved();
    },
    onError: (e) => toast.error(e),
  });

  const corValida = HEX_RE.test(cor);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !corValida) return;
    salvar.mutate({ nome: nome.trim(), cor: cor.toUpperCase() });
  }

  return (
    <form className="stack" onSubmit={onSubmit} style={{ gap: 14 }}>
      <div className="row" style={{ gap: 10 }}>
        <div className="grow">
          <Input
            placeholder="Nome da etiqueta"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={255}
            required
            data-autofocus
            aria-label="Nome da etiqueta"
          />
        </div>
        {nome.trim() && corValida && (
          <span className="tag" style={{ background: cor, color: readableOn(cor), height: 24, fontSize: 12 }}>
            {nome.trim()}
          </span>
        )}
      </div>
      <div className="swatches" role="radiogroup" aria-label="Cor">
        {ETIQUETA_PALETA.map((c) => (
          <button
            key={c}
            type="button"
            className="swatch"
            style={{ background: c }}
            aria-pressed={cor.toUpperCase() === c.toUpperCase()}
            aria-label={c}
            onClick={() => setCor(c)}
          >
            {cor.toUpperCase() === c.toUpperCase() && (
              <Check size={14} style={{ color: readableOn(c), position: "absolute", inset: 0, margin: "auto" }} />
            )}
          </button>
        ))}
      </div>
      <div className="color-input-row">
        <span className="color-preview" style={{ background: corValida ? cor : "transparent" }} />
        <div className="grow">
          <Input
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="mono"
            maxLength={7}
            spellCheck={false}
            aria-label="Cor em hexadecimal"
            error={cor && !corValida ? "Use o formato #RRGGBB" : undefined}
          />
        </div>
      </div>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" size="sm" type="submit" icon={<Check size={14} />} loading={salvar.isPending} disabled={!nome.trim() || !corValida}>
          {etiqueta ? "Salvar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}
