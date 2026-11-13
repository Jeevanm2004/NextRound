import { PipelineStage, RoundOutcome } from '../types';

export interface StageVisual {
  label: string;
  textClass: string;
  dotColor: string;
  hoverBorderClass: string;
  hoverGlowClass: string;
  dropRingClass: string;
  columnBorderActiveClass: string;
  columnTopGlow: string;
}

export const STAGE_VISUALS: Record<PipelineStage, StageVisual> = {
  Saved: {
    label: 'Saved',
    textClass: 'text-[#a1a1aa]',
    dotColor: '#a1a1aa',
    hoverBorderClass: 'hover:border-zinc-400/40',
    hoverGlowClass: 'hover:shadow-[0_12px_28px_-10px_rgba(161,161,170,0.22)]',
    dropRingClass: 'border-zinc-400/50 bg-zinc-900/85 shadow-[0_0_28px_-8px_rgba(161,161,170,0.3)]',
    columnBorderActiveClass: 'border-white/[0.08]',
    columnTopGlow: 'radial-gradient(ellipse 80% 45% at 50% 0%, rgba(161, 161, 170, 0.08), transparent 70%)',
  },
  Applied: {
    label: 'Applied',
    textClass: 'text-[#22d3ee]',
    dotColor: '#06b6d4',
    hoverBorderClass: 'hover:border-cyan-400/45',
    hoverGlowClass: 'hover:shadow-[0_12px_28px_-10px_rgba(6,182,212,0.3)]',
    dropRingClass: 'border-cyan-400/60 bg-cyan-950/25 shadow-[0_0_32px_-8px_rgba(6,182,212,0.42)]',
    columnBorderActiveClass: 'border-cyan-400/20 shadow-[0_0_28px_-14px_rgba(6,182,212,0.35)]',
    columnTopGlow: 'radial-gradient(ellipse 80% 45% at 50% 0%, rgba(6, 182, 212, 0.14), transparent 72%)',
  },
  Interview: {
    label: 'Interview',
    textClass: 'text-[#fbbf24]',
    dotColor: '#f59e0b',
    hoverBorderClass: 'hover:border-amber-400/50',
    hoverGlowClass: 'hover:shadow-[0_12px_30px_-10px_rgba(245,158,11,0.32)]',
    dropRingClass: 'border-amber-400/65 bg-amber-950/25 shadow-[0_0_34px_-8px_rgba(245,158,11,0.45)]',
    columnBorderActiveClass: 'border-amber-400/25 shadow-[0_0_32px_-14px_rgba(245,158,11,0.4)]',
    columnTopGlow: 'radial-gradient(ellipse 80% 45% at 50% 0%, rgba(245, 158, 11, 0.16), transparent 72%)',
  },
  Offer: {
    label: 'Offer',
    textClass: 'text-[#34d399]',
    dotColor: '#10b981',
    hoverBorderClass: 'hover:border-emerald-400/50',
    hoverGlowClass: 'hover:shadow-[0_12px_30px_-10px_rgba(16,185,129,0.34)]',
    dropRingClass: 'border-emerald-400/65 bg-emerald-950/25 shadow-[0_0_34px_-8px_rgba(16,185,129,0.45)]',
    columnBorderActiveClass: 'border-emerald-400/25 shadow-[0_0_32px_-14px_rgba(16,185,129,0.42)]',
    columnTopGlow: 'radial-gradient(ellipse 80% 45% at 50% 0%, rgba(16, 185, 129, 0.17), transparent 72%)',
  },
};

export const STATUS_BADGE_GLOW = {
  dueToday:
    'inline-flex items-center gap-1 rounded-full border border-[#f59e0b]/45 bg-[#f59e0b]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#fbbf24] shadow-[0_0_14px_-2px_rgba(245,158,11,0.48)]',
  overdue:
    'inline-flex items-center gap-1 rounded-full border border-[#fb7185]/45 bg-[#f43f5e]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#fda4af] shadow-[0_0_14px_-2px_rgba(244,63,94,0.48)]',
  offer:
    'inline-flex items-center gap-1 rounded-full border border-[#10b981]/45 bg-[#10b981]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#34d399] shadow-[0_0_14px_-2px_rgba(16,185,129,0.5)]',
};

export const OUTCOME_TEXT_CLASS: Record<RoundOutcome, string> = {
  Scheduled: 'text-[#fbbf24]',
  Waiting: 'text-[#22d3ee]',
  Passed: 'text-[#34d399]',
  Completed: 'text-[#e4e4e7]',
};
