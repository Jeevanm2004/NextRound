import React from 'react';
import { Columns3, CalendarClock, FileText, BarChart3 } from 'lucide-react';
import { AppScreen } from '../types';

interface MobileBottomNavProps {
  activeScreen: AppScreen;
  onSelectScreen: (screen: AppScreen) => void;
}

const ITEMS: {
  id: AppScreen;
  label: string;
  ariaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'pipeline', label: 'Pipeline', ariaLabel: 'Pipeline', icon: Columns3 },
  { id: 'schedule', label: 'Rounds', ariaLabel: 'Rounds & Prep', icon: CalendarClock },
  { id: 'resumes', label: 'Resumes', ariaLabel: 'Resumes', icon: FileText },
  { id: 'analytics', label: 'Comp', ariaLabel: 'Compensation', icon: BarChart3 },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeScreen,
  onSelectScreen,
}) => {
  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed inset-x-0 bottom-0 z-30 h-14 border-t border-white/[0.1] bg-[#09090b]/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid h-full grid-cols-4">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectScreen(item.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3b82f6] ${
                isActive ? 'text-[#fafafa]' : 'text-[#a1a1aa]'
              }`}
            >
              {isActive && (
                <span
                  className="absolute top-0 inset-x-5 h-[2px] bg-[#3b82f6] rounded-b-full shadow-[0_0_10px_rgba(59,130,246,0.9)]"
                  aria-hidden="true"
                />
              )}
              <Icon
                className={`h-4 w-4 transition-colors ${isActive ? 'text-[#60a5fa]' : 'text-[#a1a1aa]'}`}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
