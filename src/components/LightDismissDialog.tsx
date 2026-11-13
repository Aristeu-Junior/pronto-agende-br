import React, { useEffect, useId, useRef } from 'react';
import { X } from '@phosphor-icons/react';

interface LightDismissDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Implementa o padrão nativo <dialog closedby="any"> com showModal()
 * e fallback de clique no backdrop para navegadores sem suporte a closedBy (ex: Safari).
 */
export const LightDismissDialog: React.FC<LightDismissDialogProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };

    const handleBackdropClick = (event: MouseEvent) => {
      if (!('closedBy' in HTMLDialogElement.prototype)) {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      }
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('click', handleBackdropClick);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby={titleId}
      className="operational-dialog"
    >
      <div className="border-b border-stone-800 bg-tint-100/60 px-5 py-4 flex items-start justify-between gap-4">
        <div>
          <h2 id={titleId} className="text-lg font-semibold tracking-tight text-stone-100">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-sm text-stone-300">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Fechar janela"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-800 bg-stone-950 text-stone-300 hover:bg-tint-100 hover:text-stone-100"
        >
          <X size={18} weight="bold" />
        </button>
      </div>
      <div className="p-5 max-h-[80dvh] overflow-y-auto">{children}</div>
    </dialog>
  );
};
