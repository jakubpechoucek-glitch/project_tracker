import { useEffect, useRef } from 'react';
import clsx from 'clsx';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', confirmClass = 'btn-danger', onConfirm, onCancel, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" ref={ref} tabIndex={-1}>
        <div className="p-6">
          <h3 id="dialog-title" className="text-base font-semibold text-gray-900">{title}</h3>
          {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
          {children && <div className="mt-4">{children}</div>}
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={clsx('btn', confirmClass)} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
