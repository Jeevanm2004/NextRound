import React from 'react';
import { AlertCircle, CheckCircle2, Info, Undo2, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.type === 'error'
            ? AlertCircle
            : toast.type === 'warning'
              ? AlertCircle
              : toast.type === 'info'
                ? Info
                : CheckCircle2;

        const iconColor =
          toast.type === 'error'
            ? 'text-[#f43f5e]'
            : toast.type === 'warning'
              ? 'text-[#f59e0b]'
              : toast.type === 'info'
                ? 'text-[#3b82f6]'
                : 'text-[#10b981]';

        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-white/[0.1] bg-[#18181d]/95 dark:bg-[#18181d]/95 light:bg-white/95 p-3.5 shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
            style={{
              boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.25), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
            }}
          >
            <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#fafafa] dark:text-[#fafafa] light:text-[#0f172a]">
                {toast.title}
              </p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-[#a1a1aa] dark:text-[#a1a1aa] light:text-[#475569] leading-relaxed">
                  {toast.description}
                </p>
              )}
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    onDismiss(toast.id);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#2563eb]/15 px-2.5 py-1 text-xs font-semibold text-[#60a5fa] hover:bg-[#2563eb]/25 transition-colors cursor-pointer"
                >
                  <Undo2 className="h-3 w-3" />
                  <span>{toast.action.label}</span>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="rounded-lg p-1 text-[#a1a1aa] hover:text-[#fafafa] hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

