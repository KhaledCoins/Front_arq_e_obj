import { useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<unknown> | void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  danger = true,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={handle} loading={busy} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && (
        <div className={`callout ${danger ? "callout--danger" : ""}`}>
          <AlertTriangle size={16} />
          <div>{description}</div>
        </div>
      )}
    </Modal>
  );
}
