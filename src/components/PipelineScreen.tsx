import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  CalendarClock,
  Check,
  CheckCircle2,
  Columns3,
  LayoutList,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react';
import {
  JobApplication,
  PipelineStage,
  ResumeVersion,
  SortOption,
  WorkMode,
} from '../types';
import {
  formatPayRange,
  formatRelativeDay,
  formatShortDateTime,
  getFollowUpInfo,
  getIdleInfo,
  IDLE_THRESHOLD_DAYS,
  STAGE_ORDER,
} from '../utils/storage';
import { STAGE_VISUALS, STATUS_BADGE_GLOW } from '../utils/stageStyles';
import { KanbanCard } from './KanbanCard';
import { CompanyMark } from './CompanyMark';

interface PipelineScreenProps {
  applications: JobApplication[];
  resumes: ResumeVersion[];
  onSelectApplication: (app: JobApplication, tab?: 'details' | 'jd') => void;
  onMoveStage: (id: string, nextStage: PipelineStage) => void;
  onToggleStar: (id: string) => void;
  onLogFollowUp: (id: string) => void;
  onAddRoleForStage: (stage: PipelineStage) => void;
  onOpenSchedule: () => void;
}

const STAGE_ICONS: Record<PipelineStage, React.ComponentType<{ className?: string }>> = {
  Saved: Bookmark,
  Applied: Send,
  Interview: CalendarClock,
  Offer: CheckCircle2,
};

export const PipelineScreen: React.FC<PipelineScreenProps> = ({
  applications,
  resumes,
  onSelectApplication,
  onMoveStage,
  onToggleStar,
  onLogFollowUp,
  onAddRoleForStage,
  onOpenSchedule,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'All' | PipelineStage>('All');
  const [workModeFilter, setWorkModeFilter] = useState<'All' | WorkMode>('All');
  const [resumeFilter, setResumeFilter] = useState<string>('All');
  const [minPayFilter, setMinPayFilter] = useState<number>(0);
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [attentionFilter, setAttentionFilter] = useState<'all' | 'attention' | 'idle'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [mobileStageTab, setMobileStageTab] = useState<PipelineStage>('Interview');
  const [dismissedIdleAlert, setDismissedIdleAlert] = useState(false);

  const resumeMap = useMemo(() => {
    const map = new Map<string, ResumeVersion>();
    resumes.forEach((r) => map.set(r.id, r));
    return map;
  }, [resumes]);

  const upcomingInterviews = useMemo(() => {
    const list: {
      application: JobApplication;
      roundId: string;
      roundTitle: string;
      scheduledAt: string;
      interviewer: string;
      outcome: string;
    }[] = [];
    applications.forEach((app) => {
      app.rounds.forEach((round) => {
        if (round.outcome === 'Scheduled' || round.outcome === 'Waiting') {
          list.push({
            application: app,
            roundId: round.id,
            roundTitle: round.title,
            scheduledAt: round.scheduledAt,
            interviewer: round.interviewer,
            outcome: round.outcome,
          });
        }
      });
    });
    list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    return list;
  }, [applications]);

  const idleApplications = useMemo(() => {
    return applications
      .map((app) => ({ app, idle: getIdleInfo(app) }))
      .filter((item) => item.idle.isIdle)
      .sort((a, b) => b.idle.daysIdle - a.idle.daysIdle);
  }, [applications]);

  const dueOrOverdueCount = useMemo(() => {
    return applications.filter((app) => {
      const fu = getFollowUpInfo(app.followUpDate);
      return fu.status === 'today' || fu.status === 'overdue';
    }).length;
  }, [applications]);

  const attentionCount = useMemo(() => {
    return applications.filter((app) => {
      const fu = getFollowUpInfo(app.followUpDate);
      const idle = getIdleInfo(app);
      return fu.status === 'today' || fu.status === 'overdue' || idle.isIdle;
    }).length;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = applications.filter((app) => {
      if (stageFilter !== 'All' && app.stage !== stageFilter) return false;
      if (workModeFilter !== 'All' && app.workMode !== workModeFilter) return false;
      if (resumeFilter !== 'All' && app.resumeVersionId !== resumeFilter) return false;
      if (minPayFilter > 0 && app.payMax < minPayFilter) return false;
      if (onlyStarred && !app.starred) return false;

      if (attentionFilter === 'idle' && !getIdleInfo(app).isIdle) return false;
      if (attentionFilter === 'attention') {
        const fu = getFollowUpInfo(app.followUpDate);
        const idle = getIdleInfo(app);
        if (fu.status !== 'today' && fu.status !== 'overdue' && !idle.isIdle) {
          return false;
        }
      }

      if (q) {
        const resumeLabel = resumeMap.get(app.resumeVersionId)?.label.toLowerCase() ?? '';
        const roundsText = app.rounds
          .map((r) => `${r.title} ${r.interviewer} ${r.notes}`)
          .join(' ')
          .toLowerCase();
        const followUpLabel = getFollowUpInfo(app.followUpDate).label.toLowerCase();
        const haystack = `${app.company} ${app.role} ${app.location} ${app.workMode} ${app.summaryNote} ${resumeLabel} ${followUpLabel} ${roundsText}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === 'payDesc') {
        const midA = (a.payMin + a.payMax) / 2;
        const midB = (b.payMin + b.payMax) / 2;
        return midB - midA;
      }
      if (sortBy === 'companyAsc') {
        return a.company.localeCompare(b.company);
      }
      if (sortBy === 'nextRound') {
        const nextA = a.rounds.find((r) => r.outcome === 'Scheduled')?.scheduledAt ?? '9999';
        const nextB = b.rounds.find((r) => r.outcome === 'Scheduled')?.scheduledAt ?? '9999';
        return nextA.localeCompare(nextB);
      }
      if (sortBy === 'followUp') {
        const fuA = a.followUpDate || '9999-99-99';
        const fuB = b.followUpDate || '9999-99-99';
        return fuA.localeCompare(fuB);
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return sorted;
  }, [
    applications,
    searchQuery,
    stageFilter,
    workModeFilter,
    resumeFilter,
    minPayFilter,
    onlyStarred,
    attentionFilter,
    sortBy,
    resumeMap,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    stageFilter !== 'All' ||
    workModeFilter !== 'All' ||
    resumeFilter !== 'All' ||
    minPayFilter > 0 ||
    onlyStarred ||
    attentionFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setStageFilter('All');
    setWorkModeFilter('All');
    setResumeFilter('All');
    setMinPayFilter(0);
    setOnlyStarred(false);
    setAttentionFilter('all');
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverStage(null);
  };

  const handleDropOnColumn = (e: React.DragEvent<HTMLDivElement>, stage: PipelineStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setDragOverStage(null);
    setDraggingId(null);
    if (id) {
      onMoveStage(id, stage);
    }
  };

  const visibleColumns: PipelineStage[] =
    stageFilter === 'All' ? STAGE_ORDER : [stageFilter];

  return (
    <section aria-label="Job application pipeline" className="space-y-6">
      {/* Page Title & Pipeline Summary */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-[30px] font-bold tracking-[-0.025em] text-[#fafafa] text-balance">
            Application Pipeline
          </h1>
          <p className="mt-1 text-sm text-[#a1a1aa]">
            Track roles from initial save through offer negotiation with follow-up dates, resume versions, and round notes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#a1a1aa] tabular-nums">
          <span>
            <strong className="font-semibold text-[#fafafa]">{filteredApplications.length}</strong>{' '}
            of {applications.length} roles
          </span>
          <span className="text-[#3f3f46]" aria-hidden="true">
            /
          </span>
          <span>
            <strong className="font-semibold text-[#fbbf24]">
              {applications.filter((a) => a.stage === 'Interview').length}
            </strong>{' '}
            interviews
          </span>
          <span className="text-[#3f3f46]" aria-hidden="true">
            /
          </span>
          <span>
            <strong className="font-semibold text-[#34d399]">
              {applications.filter((a) => a.stage === 'Offer').length}
            </strong>{' '}
            offers
          </span>
          {dueOrOverdueCount > 0 && (
            <>
              <span className="text-[#3f3f46]" aria-hidden="true">
                /
              </span>
              <span>
                <strong className="font-semibold text-[#fda4af]">
                  {dueOrOverdueCount}
                </strong>{' '}
                follow-ups due
              </span>
            </>
          )}
        </div>
      </div>

      {/* Upcoming Interviews Summary Strip */}
      <div className="glass-panel rounded-2xl border border-white/[0.08] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="h-4 w-4 text-[#fbbf24]" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold tracking-[-0.01em] text-[#fafafa]">
              Upcoming Interviews
            </h2>
            <span className="font-mono text-xs text-[#a1a1aa] tabular-nums">
              {upcomingInterviews.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenSchedule}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#60a5fa] hover:text-[#93c5fd] transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>
              {upcomingInterviews.length > 4
                ? `View all ${upcomingInterviews.length} in Rounds & Prep`
                : 'Open Rounds & Prep'}
            </span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {upcomingInterviews.length === 0 ? (
          <p className="mt-3 text-xs text-[#71717a]">
            No upcoming interviews scheduled yet. Open any role dossier to schedule a round.
          </p>
        ) : (
          <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {upcomingInterviews.slice(0, 4).map((item) => (
              <button
                key={item.roundId}
                type="button"
                onClick={() => onSelectApplication(item.application)}
                className="glass-card flex items-start gap-3 rounded-xl border border-white/[0.08] p-3.5 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[2px] hover:border-[#f59e0b]/45 hover:shadow-[0_10px_24px_-10px_rgba(245,158,11,0.35)] cursor-pointer"
              >
                <CompanyMark
                  name={item.application.company}
                  accentHex={item.application.accentHex}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#fafafa] truncate">
                      {item.application.company}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-[#fbbf24] tabular-nums whitespace-nowrap shrink-0">
                      {formatRelativeDay(item.scheduledAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#d4d4d8] truncate">
                    {item.roundTitle}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-[#71717a] tabular-nums truncate">
                    {formatShortDateTime(item.scheduledAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Idle Applications Alert Banner */}
      {idleApplications.length > 0 && !dismissedIdleAlert && (
        <div
          role="region"
          aria-label="Idle application alerts"
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/[0.07] backdrop-blur-lg px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <AlertTriangle
              className="h-4 w-4 shrink-0 text-[#fbbf24] mt-0.5 sm:mt-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#fafafa]">
                {idleApplications.length} idle{' '}
                {idleApplications.length === 1 ? 'application' : 'applications'} (
                {IDLE_THRESHOLD_DAYS}+ days with no update)
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#d4d4d8]">
                {idleApplications.slice(0, 4).map(({ app, idle }) => (
                  <span
                    key={app.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#09090b]/80 px-2.5 py-1"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectApplication(app)}
                      className="font-medium text-[#fafafa] hover:text-[#60a5fa] cursor-pointer"
                    >
                      {app.company}
                    </button>
                    <span className="font-mono text-[11px] text-[#fbbf24] tabular-nums">
                      {idle.daysIdle}d
                    </span>
                    <button
                      type="button"
                      onClick={() => onLogFollowUp(app.id)}
                      title={`Mark ${app.company} followed up`}
                      className="text-[11px] font-semibold text-[#34d399] hover:underline cursor-pointer"
                    >
                      Touch
                    </button>
                  </span>
                ))}
                {idleApplications.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setAttentionFilter('idle')}
                    className="text-xs font-medium text-[#fbbf24] hover:underline cursor-pointer"
                  >
                    +{idleApplications.length - 4} more
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() =>
                setAttentionFilter((prev) => (prev === 'idle' ? 'all' : 'idle'))
              }
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                attentionFilter === 'idle'
                  ? 'border-[#fbbf24]/50 bg-[#f59e0b]/20 text-[#fbbf24]'
                  : 'border-white/[0.14] bg-[#09090b]/70 text-[#e4e4e7] hover:bg-[#09090b]'
              }`}
            >
              {attentionFilter === 'idle' ? 'Showing Idle' : 'Filter Idle'}
            </button>
            <button
              type="button"
              onClick={() => setDismissedIdleAlert(true)}
              aria-label="Dismiss idle alert"
              className="rounded-lg p-1.5 text-[#a1a1aa] hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="glass-panel rounded-2xl border border-white/[0.08] p-4 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717a]"
              aria-hidden="true"
            />
            <input
              id="pipeline-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="Search company, role, resume version, or round notes..."
              aria-label="Search applications"
              className="w-full rounded-xl border border-white/[0.1] bg-[#0c0c0f]/90 py-2.5 pl-10 pr-20 text-sm text-[#fafafa] placeholder-[#71717a] transition-all focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/70"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="pointer-events-auto rounded p-0.5 text-[#71717a] hover:text-[#e4e4e7] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center rounded border border-white/[0.12] bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-[#a1a1aa] select-none">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Segmented Stage Filter Tabs */}
          <div
            role="group"
            aria-label="Filter by stage"
            className="flex items-center gap-1 overflow-x-auto rounded-xl bg-[#0c0c0f]/90 p-1 border border-white/[0.07]"
          >
            {(['All', ...STAGE_ORDER] as const).map((stage) => {
              const active = stageFilter === stage;
              const count =
                stage === 'All'
                  ? applications.length
                  : applications.filter((a) => a.stage === stage).length;
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setStageFilter(stage)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#27272a] text-[#fafafa] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'text-[#a1a1aa] hover:text-[#e4e4e7]'
                  }`}
                >
                  {stage}{' '}
                  <span className="ml-1 font-mono text-[11px] text-[#71717a] tabular-nums">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Board / List View Toggle */}
          <div className="flex items-center gap-1 self-start lg:self-auto rounded-xl bg-[#0c0c0f]/90 p-1 border border-white/[0.07] shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-[#2563eb] text-white shadow-[0_2px_10px_rgba(37,99,235,0.45)]'
                  : 'text-[#a1a1aa] hover:text-[#e4e4e7]'
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#2563eb] text-white shadow-[0_2px_10px_rgba(37,99,235,0.45)]'
                  : 'text-[#a1a1aa] hover:text-[#e4e4e7]'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" aria-hidden="true" />
              <span>List</span>
            </button>
          </div>
        </div>

        {/* Secondary Attribute Filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/[0.06]">
          <label className="flex items-center gap-2 text-xs text-[#a1a1aa]">
            <span>Work mode</span>
            <select
              value={workModeFilter}
              onChange={(e) => setWorkModeFilter(e.target.value as 'All' | WorkMode)}
              className="rounded-lg border border-white/[0.1] bg-[#0c0c0f]/90 px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:border-[#3b82f6] focus:outline-none cursor-pointer"
            >
              <option value="All">All modes</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-[#a1a1aa]">
            <span>Resume</span>
            <select
              value={resumeFilter}
              onChange={(e) => setResumeFilter(e.target.value)}
              className="max-w-[200px] rounded-lg border border-white/[0.1] bg-[#0c0c0f]/90 px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:border-[#3b82f6] focus:outline-none cursor-pointer"
            >
              <option value="All">All versions</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-[#a1a1aa]">
            <span>Min pay</span>
            <select
              value={minPayFilter}
              onChange={(e) => setMinPayFilter(Number(e.target.value))}
              className="rounded-lg border border-white/[0.1] bg-[#0c0c0f]/90 px-2.5 py-1.5 text-xs text-[#e4e4e7] font-mono tabular-nums focus:border-[#3b82f6] focus:outline-none cursor-pointer"
            >
              <option value={0}>Any pay</option>
              <option value={180}>$180k+</option>
              <option value={210}>$210k+</option>
              <option value={240}>$240k+</option>
              <option value={270}>$270k+</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-[#a1a1aa]">
            <span>Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-lg border border-white/[0.1] bg-[#0c0c0f]/90 px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:border-[#3b82f6] focus:outline-none cursor-pointer"
            >
              <option value="updated">Recently updated</option>
              <option value="followUp">Follow-up date</option>
              <option value="nextRound">Soonest round</option>
              <option value="payDesc">Highest pay band</option>
              <option value="companyAsc">Company A–Z</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() =>
              setAttentionFilter((prev) =>
                prev === 'attention' ? 'all' : 'attention'
              )
            }
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer tabular-nums ${
              attentionFilter === 'attention'
                ? 'border-[#fb7185]/45 bg-[#f43f5e]/15 text-[#fda4af] shadow-[0_0_12px_-2px_rgba(244,63,94,0.35)]'
                : 'border-white/[0.1] bg-[#0c0c0f]/90 text-[#a1a1aa] hover:text-[#e4e4e7]'
            }`}
          >
            Due / Idle ({attentionCount})
          </button>

          <button
            type="button"
            onClick={() => setOnlyStarred((v) => !v)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              onlyStarred
                ? 'border-[#fbbf24]/45 bg-[#f59e0b]/15 text-[#fbbf24] shadow-[0_0_12px_-2px_rgba(245,158,11,0.35)]'
                : 'border-white/[0.1] bg-[#0c0c0f]/90 text-[#a1a1aa] hover:text-[#e4e4e7]'
            }`}
          >
            Priority only
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-xs font-medium text-[#60a5fa] hover:text-white transition-colors cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Mobile Stage Switcher when viewing Kanban on small screens */}
      {viewMode === 'board' && stageFilter === 'All' && (
        <div className="md:hidden glass-panel grid grid-cols-4 gap-1 rounded-xl border border-white/[0.08] p-1">
          {STAGE_ORDER.map((stage) => {
            const active = mobileStageTab === stage;
            const count = filteredApplications.filter((a) => a.stage === stage).length;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setMobileStageTab(stage)}
                className={`rounded-lg py-2 text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-[#27272a] text-[#fafafa] shadow-sm'
                    : 'text-[#a1a1aa]'
                }`}
              >
                {stage} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Board View */}
      {viewMode === 'board' ? (
        applications.length === 0 ? (
          <div className="glass-panel rounded-2xl border border-white/[0.08] px-6 py-16 text-center">
            <p className="font-display text-base font-semibold text-[#fafafa]">
              Your pipeline is empty
            </p>
            <p className="mt-1.5 text-xs text-[#a1a1aa]">
              Add your first role to track pay bands, follow-ups, resume versions, and interview rounds.
            </p>
            <button
              type="button"
              onClick={() => onAddRoleForStage('Saved')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3b82f6] transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add First Role</span>
            </button>
          </div>
        ) : filteredApplications.length === 0 && hasActiveFilters ? (
          <div className="glass-panel rounded-2xl border border-white/[0.08] px-6 py-14 text-center">
            <p className="text-sm font-medium text-[#e4e4e7]">
              No applications match your active filters.
            </p>
            <p className="mt-1 text-xs text-[#a1a1aa]">
              Try clearing search terms or adjusting stage, pay, or priority filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3.5 rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3b82f6] transition-colors cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div
            className={`grid gap-4 lg:gap-5 ${
              visibleColumns.length === 1
                ? 'grid-cols-1 max-w-xl'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
            }`}
          >
            {visibleColumns.map((stage) => {
              const stageApps = filteredApplications.filter((a) => a.stage === stage);
              const visual = STAGE_VISUALS[stage];
              const Icon = STAGE_ICONS[stage];
              const isDropTarget = dragOverStage === stage;
              const hideOnMobile = stageFilter === 'All' && mobileStageTab !== stage;
              const isActiveColumn = stageApps.length > 0 && stage !== 'Saved';

              const avgMidpoint =
                stageApps.length > 0
                  ? Math.round(
                      stageApps.reduce((sum, a) => sum + (a.payMin + a.payMax) / 2, 0) /
                        stageApps.length
                    )
                  : 0;

              return (
                <div
                  key={stage}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverStage !== stage) setDragOverStage(stage);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      if (dragOverStage === stage) setDragOverStage(null);
                    }
                  }}
                  onDrop={(e) => handleDropOnColumn(e, stage)}
                  style={{
                    backgroundImage: isActiveColumn || isDropTarget ? visual.columnTopGlow : undefined,
                  }}
                  className={`${
                    hideOnMobile ? 'hidden md:flex' : 'flex'
                  } glass-panel flex-col rounded-2xl border transition-[border-color,box-shadow,background-color] duration-200 min-h-[440px] ${
                    isDropTarget
                      ? visual.dropRingClass
                      : isActiveColumn
                        ? visual.columnBorderActiveClass
                        : 'border-white/[0.08]'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-3.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`h-4 w-4 shrink-0 ${visual.textClass}`} aria-hidden="true" />
                      <h2 className="font-display text-sm font-semibold tracking-[-0.01em] text-[#fafafa] whitespace-nowrap">
                        {visual.label}
                      </h2>
                      <span className="font-mono text-xs text-[#71717a] tabular-nums">
                        {stageApps.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {avgMidpoint > 0 && (
                        <span className="font-mono text-[11px] text-[#71717a] tabular-nums">
                          avg ${avgMidpoint}k
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onAddRoleForStage(stage)}
                        aria-label={`Add role to ${stage}`}
                        className="rounded-lg p-1 text-[#a1a1aa] hover:bg-white/[0.08] hover:text-[#fafafa] transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Cards Stack */}
                  <div className="flex flex-1 flex-col gap-3.5 p-3.5">
                    {isDropTarget && (
                      <div className="rounded-xl border-2 border-dashed border-[#3b82f6]/60 bg-[#3b82f6]/10 p-3 text-center text-xs font-semibold text-[#60a5fa] animate-pulse">
                        Drop to move to {visual.label}
                      </div>
                    )}
                    {stageApps.length > 0 ? (
                      stageApps.map((app) => (
                        <KanbanCard
                          key={app.id}
                          application={app}
                          resume={resumeMap.get(app.resumeVersionId)}
                          isDragging={draggingId === app.id}
                          onSelect={(selected) => onSelectApplication(selected, 'details')}
                          onOpenJdPrep={(selected) => onSelectApplication(selected, 'jd')}
                          onMoveStage={onMoveStage}
                          onToggleStar={onToggleStar}
                          onLogFollowUp={onLogFollowUp}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                        />
                      ))
                    ) : (
                      <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.09] px-4 py-10 text-center">
                        <p className="text-xs font-medium text-[#a1a1aa]">
                          No roles in {stage}
                        </p>
                        <p className="mt-1 text-[11px] text-[#71717a]">
                          Drag a card here or add a role directly.
                        </p>
                        <button
                          type="button"
                          onClick={() => onAddRoleForStage(stage)}
                          className="mt-3 rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-[#e4e4e7] hover:bg-white/[0.06] transition-colors cursor-pointer"
                        >
                          Add to {stage}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* High-Density Executive Table View */
        <div className="glass-panel overflow-hidden rounded-2xl border border-white/[0.08]">
          {filteredApplications.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-medium text-[#e4e4e7]">
                No applications match your active filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3b82f6] transition-colors cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[11px] font-semibold text-[#a1a1aa]">
                    <th className="px-4 py-3.5">Company &amp; Role</th>
                    <th className="px-4 py-3.5">Stage</th>
                    <th className="px-4 py-3.5">Follow-up &amp; Alerts</th>
                    <th className="px-4 py-3.5">Pay Range</th>
                    <th className="px-4 py-3.5">Resume Version</th>
                    <th className="px-4 py-3.5">Next / Latest Round</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-sm">
                  {filteredApplications.map((app) => {
                    const visual = STAGE_VISUALS[app.stage];
                    const resume = resumeMap.get(app.resumeVersionId);
                    const nextRound = app.rounds.find(
                      (r) => r.outcome === 'Scheduled' || r.outcome === 'Waiting'
                    );
                    const followUp = getFollowUpInfo(app.followUpDate);
                    const idle = getIdleInfo(app);

                    return (
                      <tr
                        key={app.id}
                        onClick={() => onSelectApplication(app)}
                        className="hover:bg-white/[0.035] transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <CompanyMark
                              name={app.company}
                              accentHex={app.accentHex}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <div className="font-display font-semibold text-[#fafafa] truncate">
                                {app.company}
                              </div>
                              <div className="text-xs text-[#a1a1aa] truncate">
                                {app.role} · {app.workMode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {app.stage === 'Offer' ? (
                            <span className={STATUS_BADGE_GLOW.offer}>Offer</span>
                          ) : (
                            <span className={`text-xs font-semibold ${visual.textClass}`}>
                              {app.stage}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {followUp.status === 'overdue' && (
                              <span className={STATUS_BADGE_GLOW.overdue}>Overdue</span>
                            )}
                            {followUp.status === 'today' && (
                              <span className={STATUS_BADGE_GLOW.dueToday}>Due Today</span>
                            )}
                            {followUp.status === 'upcoming' && (
                              <span className="font-mono text-xs text-[#a1a1aa] tabular-nums">
                                {followUp.shortDate}
                              </span>
                            )}
                            {followUp.status === 'none' && (
                              <span className="text-xs text-[#71717a]">—</span>
                            )}
                            {idle.isIdle && (
                              <span className="text-[11px] font-medium text-[#fbbf24] tabular-nums">
                                · Idle {idle.daysIdle}d
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs text-[#e4e4e7] tabular-nums">
                          {formatPayRange(app.payMin, app.payMax)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#d4d4d8] whitespace-nowrap">
                          {resume ? resume.label : 'Unassigned'}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#a1a1aa] max-w-[240px] truncate">
                          {nextRound
                            ? `${formatRelativeDay(nextRound.scheduledAt)} · ${nextRound.title}`
                            : app.summaryNote || '—'}
                        </td>
                        <td
                          className="px-4 py-3.5 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectApplication(app, 'jd')}
                              className="rounded-md border border-white/[0.1] bg-[#0c0c0f]/90 px-2 py-1 text-[11px] font-medium text-[#d4d4d8] hover:text-white cursor-pointer"
                            >
                              {app.aiPrep ? 'JD Prep' : 'Paste JD'}
                            </button>
                            {(followUp.status === 'today' ||
                              followUp.status === 'overdue' ||
                              idle.isIdle) && (
                              <button
                                type="button"
                                onClick={() => onLogFollowUp(app.id)}
                                title="Log follow-up"
                                className="inline-flex items-center gap-1 rounded-md border border-[#10b981]/30 bg-[#10b981]/10 px-2 py-1 text-[11px] font-medium text-[#34d399] hover:bg-[#10b981]/20 cursor-pointer"
                              >
                                <Check className="h-3 w-3" />
                                <span>Touch</span>
                              </button>
                            )}
                            <select
                              aria-label={`Stage for ${app.company}`}
                              value={app.stage}
                              onChange={(e) =>
                                onMoveStage(app.id, e.target.value as PipelineStage)
                              }
                              className="rounded-lg border border-white/[0.1] bg-[#0c0c0f]/90 px-2.5 py-1 text-xs text-[#e4e4e7] focus:border-[#3b82f6] focus:outline-none cursor-pointer"
                            >
                              {STAGE_ORDER.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
