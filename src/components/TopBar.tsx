import React from 'react';
import { HelpCircle, Plus } from 'lucide-react';
import { AppScreen } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface TopBarProps {
  activeScreen: AppScreen;
  onSelectScreen: (screen: AppScreen) => void;
  onAddRole: () => void;
  onOpenShortcuts?: () => void;
}

const NAV_ITEMS: { id: AppScreen; label: string }[] = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'schedule', label: 'Rounds & Prep' },
  { id: 'resumes', label: 'Resumes' },
  { id: 'analytics', label: 'Compensation' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeScreen,
  onSelectScreen,
  onAddRole,
  onOpenShortcuts,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#09090b]/82 backdrop-blur-xl">
      <div className="mx-auto flex h-14 sm:h-16 max-w-[1440px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-10">
        {/* Zone 1: Single-element Brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectScreen('pipeline')}
          className="font-display text-lg font-bold tracking-[-0.03em] text-[#fafafa] whitespace-nowrap shrink-0 hover:text-[#60a5fa] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] rounded-sm"
        >
          NextRound
        </button>

        {/* Zone 2: Clean single-line text nav links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-8"
        >
          {NAV_ITEMS.map((item, index) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelectScreen(item.id)}
                className={`relative py-5 text-sm font-medium tracking-[-0.005em] whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] rounded-sm ${
                  isActive
                    ? 'text-[#fafafa]'
                    : 'text-[#a1a1aa] hover:text-[#e4e4e7]'
                }`}
              >
                <span>{item.label}</span>
                <span className="hidden xl:inline-block ml-1.5 font-mono text-[10px] opacity-40">
                  {index + 1}
                </span>
                {isActive && (
                  <span
                    className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#3b82f6] shadow-[0_0_12px_rgba(59,130,246,0.9)]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Theme Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {onOpenShortcuts && (
            <button
              type="button"
              onClick={onOpenShortcuts}
              aria-label="Keyboard shortcuts (?)"
              title="Keyboard shortcuts (?)"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#a1a1aa] hover:bg-white/[0.08] hover:text-[#fafafa] active:scale-90 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
            >
              <HelpCircle className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
            </button>
          )}
          <ThemeToggle />
          <button
            type="button"
            onClick={onAddRole}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_16px_-4px_rgba(37,99,235,0.65)] hover:bg-[#3b82f6] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_6px_22px_-3px_rgba(59,130,246,0.75)] active:scale-95 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add Role</span>
            <kbd className="hidden sm:inline-block rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-mono leading-none">
              N
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
};
