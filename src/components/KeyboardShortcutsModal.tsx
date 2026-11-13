import React, { useEffect } from 'react';
import { Command, Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  {
    category: 'Navigation',
    items: [
      { key: '1', label: 'Go to Pipeline screen' },
      { key: '2', label: 'Go to Rounds & Prep' },
      { key: '3', label: 'Go to Resumes' },
      { key: '4', label: 'Go to Compensation' },
    ],
  },
  {
    category: 'Actions',
    items: [
      { key: '⌘ K or /', label: 'Quick search applications' },
      { key: 'N', label: 'Create new role application' },
      { key: 'T', label: 'Toggle dark / light mode' },
      { key: 'Esc', label: 'Close modal, drawer, or search' },
      { key: '?', label: 'Open / close shortcuts help' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#111115]/95 dark:bg-[#111115]/95 light:bg-white/95 backdrop-blur-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Keyboard className="h-4 w-4 text-[#60a5fa]" aria-hidden="true" />
            <h2
              id="shortcuts-title"
              className="font-display text-base font-bold text-[#fafafa] dark:text-[#fafafa] light:text-[#0f172a]"
            >
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts modal"
            className="rounded-lg p-1.5 text-[#a1a1aa] hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {SHORTCUTS.map((section) => (
            <div key={section.category} className="space-y-2">
              <h3 className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">
                {section.category}
              </h3>
              <div className="rounded-xl border border-white/[0.08] bg-[#0c0c0f]/60 dark:bg-[#0c0c0f]/60 light:bg-slate-50/80 divide-y divide-white/[0.06]">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                  >
                    <span className="text-[#e4e4e7] dark:text-[#e4e4e7] light:text-[#334155]">
                      {item.label}
                    </span>
                    <kbd className="inline-flex items-center gap-1 rounded-md border border-white/[0.12] bg-[#18181d] dark:bg-[#18181d] light:bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-[#fafafa] dark:text-[#fafafa] light:text-[#0f172a] shadow-sm">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.08] bg-[#0c0c0f]/40 dark:bg-[#0c0c0f]/40 light:bg-slate-100/60 px-5 py-3 text-center">
          <p className="text-[11px] text-[#71717a]">
            Tip: Press <kbd className="font-mono font-semibold text-[#a1a1aa]">?</kbd> anywhere to open this menu.
          </p>
        </div>
      </div>
    </div>
  );
};

