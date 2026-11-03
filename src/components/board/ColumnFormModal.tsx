import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { colunaApi } from "@/api/endpoints";
import { qk } from "@/api/queries";
import type { ColunaRequest, ColunaView } from "@/api/types";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useBoard } from "./BoardContext";

export function ColumnFormModal({ coluna, onClose }: { coluna?: ColunaView; onClose: () => void }) {
  const { quadro } = useBoard();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [nome, setNome] = useState(coluna?.nome ?? "");
  const [limite, setLimite] = useState(coluna?.limiteWip != null ? String(coluna.limiteWip) : "");

  const salvar = useMutation({
    mutationFn: (dados: ColunaRequest) =>
      coluna ? colunaApi.atualizar(coluna.id, dados) : colunaApi.criar(quadro.id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.colunas(quadro.id) });
      toast.success(coluna ? "Coluna atualizada" : "Coluna criada");
      onClose();
    },
    onError: (e) => toast.error(e),
  });

  const limiteNum = limite.trim() === "" ? null : Number(limite);
  const limiteInvalido = limiteNum != null && (!Number.isInteger(limiteNum) || limiteNum < 1);
  const limiteMenorQueCards = coluna && limiteNum != null && limiteNum < coluna.quantidadeCards;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || limiteInvalido || limiteMenorQueCards) return;
    salvar.mutate({ nome: nome.trim(), limiteWip: limiteNum });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={coluna ? "Editar coluna" : "Nova coluna"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="column-form"
            loading={salvar.isPending}
            disabled={!nome.trim() || limiteInvalido || Boolean(limiteMenorQueCards)}
          >
            {coluna ? "Salvar" : "Criar coluna"}
          </Button>
        </>
      }
    >
      <form id="column-form" className="stack" onSubmit={onSubmit}>
        <Input
          label="Nome"
          placeholder="Ex.: Em revisão"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={255}
          required
          data-autofocus
        />
        <Input
          label="Limite WIP"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          placeholder="Sem limite"
          value={limite}
          onChange={(e) => setLimite(e.target.value)}
          hint="Quantidade máxima de cards na coluna. Deixe em branco para não limitar."
          error={
            limiteInvalido
              ? "O limite deve ser um inteiro maior que zero"
              : limiteMenorQueCards
                ? `A coluna já tem ${coluna!.quantidadeCards} cards; o limite não pode ser menor`
                : undefined
          }
        />
        <div className="callout">
          <Info size={16} />
          <span>Quando a coluna atinge o limite, nenhum card pode entrar nela até que outro saia.</span>
        </div>
      </form>
    </Modal>
  );
}
