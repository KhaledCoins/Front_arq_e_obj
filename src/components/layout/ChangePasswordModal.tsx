import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { usuarioApi } from "@/api/endpoints";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");

  const alterar = useMutation({
    mutationFn: () => usuarioApi.alterarSenha({ senhaAtual, novaSenha }),
    onSuccess: () => {
      toast.success("Senha alterada");
      onClose();
    },
    onError: (e) => toast.error(e),
  });

  const confere = novaSenha === confirmar;
  const tamanhoOk = new TextEncoder().encode(novaSenha).length <= 72;
  const valido = senhaAtual.length > 0 && novaSenha.length > 0 && confere && tamanhoOk;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (valido) alterar.mutate();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Alterar senha"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="password-form" loading={alterar.isPending} disabled={!valido}>
            Salvar nova senha
          </Button>
        </>
      }
    >
      <form id="password-form" className="stack" onSubmit={onSubmit}>
        <Input
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          required
          data-autofocus
        />
        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          required
          error={!tamanhoOk ? "A senha deve ter no máximo 72 bytes" : undefined}
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          required
          error={confirmar && !confere ? "As senhas não coincidem" : undefined}
        />
      </form>
    </Modal>
  );
}
