import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  Check,
  FileText,
  Star,
} from 'lucide-react';
import { JobApplication, PipelineStage, ResumeVersion } from '../types';
import {
  formatPayRange,
  formatRelativeDay,
  getFollowUpInfo,
  getIdleInfo,
  STAGE_ORDER,
} from '../utils/storage';
import { STAGE_VISUALS, STATUS_BADGE_GLOW } from '../utils/stageStyles';
import { CompanyMark } from './CompanyMark';

interface KanbanCardProps {
  application: JobApplication;
  resume?: ResumeVersion;
  isDragging?: boolean;
  onSelect: (app: JobApplication) => void;
  onOpenJdPrep: (app: JobApplication) => void;
  onMoveStage: (id: string, nextStage: PipelineStage) => void;
  onToggleStar: (id: string) => void;
  onLogFollowUp: (id: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDragEnd: () => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  application,
  resume,
  isDragging = false,
  onSelect,
  onOpenJdPrep,
  onMoveStage,
  onToggleStar,
  onLogFollowUp,
  onDragStart,
  onDragEnd,
}) => {
  const stageVisual = STAGE_VISUALS[application.stage];
  const currentIndex = STAGE_ORDER.indexOf(application.stage);
  const nextStage =
    currentIndex >= 0 && currentIndex < STAGE_ORDER.length - 1
      ? STAGE_ORDER[currentIndex + 1]
      : null;

  const upcomingRound = application.rounds.find(
    (r) => r.outcome === 'Scheduled' || r.outcome === 'Waiting'
  );
  const completedCount = application.rounds.filter(
    (r) => r.outcome === 'Passed' || r.outcome === 'Completed'
  ).length;
  const latestRoundWithNotes = [...application.rounds]
    .reverse()
    .find((r) => r.notes.trim().length > 0);

  const noteSnippet =
    latestRoundWithNotes?.notes || application.summaryNote || 'No round notes added yet.';

  const payString = formatPayRange(application.payMin, application.payMax);
  const followUp = getFollowUpInfo(application.followUpDate);
  const idle = getIdleInfo(application);
  const showOfferBadge = application.stage === 'Offer';
  const aiSkillCount = application.aiPrep?.keySkills.length ?? 0;
  const hasAiPrep = aiSkillCount > 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, application.id)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(application)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(application);
        }
      }}
      aria-label={`${application.company} — ${application.role} in ${application.stage}`}
      className={`group glass-card rounded-xl border border-white/[0.09] p-4 text-left cursor-pointer transition-[transform,opacity,background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[2px] hover:bg-[#202027]/95 ${stageVisual.hoverBorderClass} ${stageVisual.hoverGlowClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] ${
        isDragging ? 'opacity-45 scale-[0.98]' : ''
      }`}
    >
      {/* Top Row: Company Mark + Company Name + Star */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <CompanyMark
            name={application.company}
            accentHex={application.accentHex}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.01em] text-[#a1a1aa] truncate">
              {application.company}
            </p>
            <h3 className="font-display text-[15px] font-semibold tracking-[-0.015em] leading-snug text-[#fafafa] truncate">
              {application.role}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(application.id);
          }}
          aria-label={application.starred ? 'Remove priority star' : 'Mark as priority'}
          className={`shrink-0 rounded-md p-1 transition-all duration-200 active:scale-130 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] ${
            application.starred
              ? 'text-[#fbbf24] drop-shadow-[0_0_8px_rgba(245,158,11,0.45)]'
              : 'text-[#71717a] opacity-60 sm:opacity-35 sm:group-hover:opacity-100 focus:opacity-100 hover:text-[#fbbf24]'
          }`}
        >
          <Star
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              application.starred ? 'scale-110 rotate-6' : 'scale-100 hover:rotate-12'
            }`}
            fill={application.starred ? 'currentColor' : 'none'}
          />
        </button>
      </div>

      {/* Glowing Status Badges & Idle Alert */}
      {(showOfferBadge ||
        followUp.status === 'today' ||
        followUp.status === 'overdue' ||
        idle.isIdle) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {showOfferBadge && (
            <span className={STATUS_BADGE_GLOW.offer}>Offer</span>
          )}
          {followUp.status === 'overdue' && (
            <span className={STATUS_BADGE_GLOW.overdue}>Overdue</span>
          )}
          {followUp.status === 'today' && (
            <span className={STATUS_BADGE_GLOW.dueToday}>Due Today</span>
          )}
          {idle.isIdle && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#fbbf24] tabular-nums ml-auto">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>Idle {idle.daysIdle}d</span>
            </span>
          )}
        </div>
      )}

      {/* Pay Range & Work Mode */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span
          className={`font-mono text-[13px] font-semibold tabular-nums ${
            application.stage === 'Offer' ? 'text-[#34d399]' : 'text-[#fafafa]'
          }`}
        >
          {payString}
        </span>
        <span className="text-[#3f3f46]" aria-hidden="true">
          ·
        </span>
        <span className="text-[#a1a1aa] truncate">
          {application.workMode} · {application.location}
        </span>
      </div>

      {/* Resume Version & Follow-up Date */}
      <div className="mt-2 flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-[#d4d4d8]">
          <FileText className="h-3.5 w-3.5 shrink-0 text-[#71717a]" aria-hidden="true" />
          <span className="truncate">
            {resume ? resume.label : 'Unassigned resume'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <CalendarCheck
              className={`h-3.5 w-3.5 shrink-0 ${
                followUp.status === 'overdue'
                  ? 'text-[#fda4af]'
                  : followUp.status === 'today'
                    ? 'text-[#fbbf24]'
                    : 'text-[#71717a]'
              }`}
              aria-hidden="true"
            />
            <span
              className={`font-mono text-[11px] tabular-nums truncate ${
                followUp.status === 'overdue'
                  ? 'text-[#fda4af]'
                  : followUp.status === 'today'
                    ? 'text-[#fbbf24]'
                    : 'text-[#a1a1aa]'
              }`}
            >
              {followUp.status === 'none'
                ? 'No follow-up set'
                : `Follow-up ${followUp.shortDate}`}
            </span>
          </div>

          {(followUp.status === 'today' || followUp.status === 'overdue' || idle.isIdle) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLogFollowUp(application.id);
              }}
              title="Log follow-up now and schedule next check-in in 4 days"
              className="inline-flex items-center gap-1 rounded-md border border-[#10b981]/30 bg-[#10b981]/10 px-2 py-0.5 text-[11px] font-medium text-[#34d399] hover:bg-[#10b981]/20 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981]"
            >
              <Check className="h-3 w-3" aria-hidden="true" />
              <span>Touch</span>
            </button>
          )}
        </div>
      </div>

      {/* Round Progress & Notes */}
      <div className="mt-3 border-t border-white/[0.06] pt-2.5">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-mono tabular-nums text-[#a1a1aa]">
            {application.rounds.length > 0
              ? `Round ${Math.min(
                  completedCount + (upcomingRound ? 1 : 0),
                  application.totalRoundsPlanned
                )}/${application.totalRoundsPlanned}`
              : `${application.totalRoundsPlanned} rounds planned`}
          </span>
          {upcomingRound && (
            <span className="inline-flex items-center gap-1 font-medium text-[#fbbf24] truncate">
              <CalendarClock className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {formatRelativeDay(upcomingRound.scheduledAt)} · {upcomingRound.title}
              </span>
            </span>
          )}
        </div>

        <p className="mt-1.5 text-xs leading-relaxed text-[#a1a1aa] line-clamp-2">
          {noteSnippet}
        </p>
      </div>

      {/* Quick Action Footer */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenJdPrep(application);
          }}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] ${
            hasAiPrep
              ? 'text-[#60a5fa] hover:bg-[#2563eb]/15 hover:text-[#93c5fd]'
              : 'text-[#a1a1aa] hover:bg-white/[0.06] hover:text-[#fafafa]'
          }`}
        >
          <span>{hasAiPrep ? `JD Prep · ${aiSkillCount} skills` : 'Paste JD'}</span>
        </button>

        {nextStage ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveStage(application.id, nextStage);
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-[#60a5fa] hover:bg-[#2563eb]/20 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
          >
            <span>To {nextStage}</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        ) : (
          <span className="text-[11px] text-[#71717a] truncate">
            {application.equityNote || 'Offer stage'}
          </span>
        )}
      </div>
    </div>
  );
};
