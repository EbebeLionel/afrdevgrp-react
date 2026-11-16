import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';

/*
 * Feedback that replaces browser alert() and confirm() boxes.
 *  - useFeedback().show(message, type): a short message that disappears by itself.
 *  - useConfirm()(options): resolves to true/false once the person chooses.
 * Keeping these in one place means every page reports results the same way.
 */

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface FeedbackContextType {
  show: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export function useFeedback(): FeedbackContextType {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used within a FeedbackProvider');
  return context;
}

/** Returns an async confirm function: `if (await confirm({...})) { ... }` */
export function useConfirm() {
  return useFeedback().confirm;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, message, type }]);
      window.setTimeout(() => dismiss(id), type === 'error' ? 8000 : 4500);
    },
    [dismiss]
  );

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setDialog({ ...options, resolve });
      }),
    []
  );

  // Stable across renders, so the dialog's focus handling runs once per dialog.
  const answer = useCallback(
    (ok: boolean) => {
      setDialog((current) => {
        current?.resolve(ok);
        return null;
      });
    },
    []
  );

  return (
    <FeedbackContext.Provider value={{ show, confirm }}>
      {children}

      <div className="feedback-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`feedback-toast feedback-toast--${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            <span>{t.message}</span>
            <button type="button" className="feedback-toast__close" aria-label="Dismiss message" onClick={() => dismiss(t.id)}>
              ×
            </button>
          </div>
        ))}
      </div>

      {dialog && <ConfirmDialog options={dialog} onAnswer={answer} />}
    </FeedbackContext.Provider>
  );
}

function ConfirmDialog({
  options,
  onAnswer,
}: {
  options: ConfirmOptions;
  onAnswer: (ok: boolean) => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus the safe choice, so pressing Enter by accident does not confirm a delete.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const cancelButton = document.querySelector<HTMLButtonElement>('.confirm-dialog__cancel');
    cancelButton?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onAnswer(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [onAnswer]);

  return (
    <div className="modal-overlay" onClick={() => onAnswer(false)}>
      <div
        className="modal-content confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title">{options.title}</h2>
        <p id="confirm-message" className="confirm-dialog__message">
          {options.message}
        </p>
        <div className="confirm-dialog__actions">
          <button type="button" className="confirm-dialog__cancel" onClick={() => onAnswer(false)}>
            {options.cancelLabel || 'Cancel'}
          </button>
          <button
            type="button"
            ref={confirmRef}
            className={`confirm-dialog__confirm ${options.danger ? 'is-danger' : ''}`}
            onClick={() => onAnswer(true)}
          >
            {options.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
