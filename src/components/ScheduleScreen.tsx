import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  InterviewRound,
  JobApplication,
  ResumeVersion,
  RoundOutcome,
} from '../types';
import {
  addDaysToLocalIso,
  formatPayRange,
  formatRelativeDay,
  formatShortDateTime,
} from '../utils/storage';
import { OUTCOME_TEXT_CLASS } from '../utils/stageStyles';
import { CompanyMark } from './CompanyMark';

interface ScheduleScreenProps {
  applications: JobApplication[];
  resumes: ResumeVersion[];
  onUpdateRound: (appId: string, round: InterviewRound) => void;
  onAddRound: (appId: string, round: Omit<InterviewRound, 'id'>) => string;
  onDeleteRound: (appId: string, roundId: string) => void;
  onOpenApplication: (app: JobApplication) => void;
}

interface FlattenedRound {
  application: JobApplication;
  round: InterviewRound;
}

const OUTCOMES: RoundOutcome[] = ['Scheduled', 'Waiting', 'Passed', 'Completed'];

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
  applications,
  resumes,
  onUpdateRound,
  onAddRound,
  onDeleteRound,
  onOpenApplication,
}) => {
  const [filterMode, setFilterMode] = useState<'upcoming' | 'all' | 'passed'>('upcoming');
  const [queueQuery, setQueueQuery] = useState('');
  const [selectedPair, setSelectedPair] = useState<{
    appId: string;
    roundId: string;
  } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAppId, setNewAppId] = useState(applications[0]?.id ?? '');
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => `${addDaysToLocalIso(3)}T11:00`);
  const [newInterviewer, setNewInterviewer] = useState('');
  const [newOutcome, setNewOutcome] = useState<RoundOutcome>('Scheduled');
  const [showPrompts, setShowPrompts] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (applications.length === 0) {
      setNewAppId('');
    } else if (!applications.some((a) => a.id === newAppId)) {
      setNewAppId(applications[0].id);
    }
  }, [applications, newAppId]);

  const resumeMap = useMemo(() => {
    const m = new Map<string, ResumeVersion>();
    resumes.forEach((r) => m.set(r.id, r));
    return m;
  }, [resumes]);

  const allRounds = useMemo<FlattenedRound[]>(() => {
    const items: FlattenedRound[] = [];
    applications.forEach((app) => {
      app.rounds.forEach((round) => {
        items.push({ application: app, round });
      });
    });
    items.sort((a, b) => a.round.scheduledAt.localeCompare(b.round.scheduledAt));
    return items;
  }, [applications]);

  const tabCounts = useMemo(() => {
    const upcoming = allRounds.filter(
      (i) => i.round.outcome === 'Scheduled' || i.round.outcome === 'Waiting'
    ).length;
    const passed = allRounds.filter(
      (i) => i.round.outcome === 'Passed' || i.round.outcome === 'Completed'
    ).length;
    return { upcoming, all: allRounds.length, passed };
  }, [allRounds]);

  const filteredRounds = useMemo(() => {
    const q = queueQuery.trim().toLowerCase();
    return allRounds.filter((item) => {
      if (
        filterMode === 'upcoming' &&
        item.round.outcome !== 'Scheduled' &&
        item.round.outcome !== 'Waiting'
      ) {
        return false;
      }
      if (
        filterMode === 'passed' &&
        item.round.outcome !== 'Passed' &&
        item.round.outcome !== 'Completed'
      ) {
        return false;
      }
      if (q) {
        const hay = `${item.application.company} ${item.application.role} ${item.round.title} ${item.round.interviewer}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allRounds, filterMode, queueQuery]);

  const activeItem = useMemo(() => {
    if (selectedPair) {
      const found = filteredRounds.find(
        (item) =>
          item.application.id === selectedPair.appId &&
          item.round.id === selectedPair.roundId
      );
      if (found) return found;
    }
    return filteredRounds[0] ?? null;
  }, [selectedPair, filteredRounds]);

  const handleSelectRound = (appId: string, roundId: string) => {
    setConfirmDeleteId(null);
    setSelectedPair({ appId, roundId });
    if (window.innerWidth < 1024) {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleCreateRound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppId || !newTitle.trim()) return;
    const createdId = onAddRound(newAppId, {
      title: newTitle.trim(),
      scheduledAt: newDate || `${addDaysToLocalIso(3)}T11:00`,
      interviewer: newInterviewer.trim() || 'Hiring Panel',
      outcome: newOutcome,
      notes: '',
      prepChecklist: '',
    });
    if (newOutcome === 'Passed' || newOutcome === 'Completed') {
      setFilterMode('passed');
    } else {
      setFilterMode('upcoming');
    }
    setSelectedPair({ appId: newAppId, roundId: createdId });
    setNewTitle('');
    setNewInterviewer('');
    setShowAddForm(false);
  };

  return (
    <section aria-label="Interview rounds and preparation" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-[30px] font-bold tracking-[-0.025em] text-[#fafafa] text-balance">
            Rounds &amp; Interview Prep
          </h1>
          <p className="mt-1 text-sm text-[#a1a1aa]">
            Manage upcoming interview rounds, capture live interviewer notes, and track prep checklists.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!newAppId && applications[0]) setNewAppId(applications[0].id);
            setShowAddForm((v) => !v);
          }}
          disabled={applications.length === 0}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-lg border border-white/[0.14] bg-[#18181d]/90 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-[#fafafa] hover:bg-[#27272a] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Schedule Round</span>
        </button>
      </div>

      {showAddForm && applications.length > 0 && (
        <form
          onSubmit={handleCreateRound}
          className="glass-panel rounded-2xl border border-[#3b82f6]/40 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-[#fafafa]">
              New Interview Round
            </h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-[#a1a1aa] hover:text-[#fafafa] cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="space-y-1 text-xs text-[#a1a1aa]">
              <span>Company &amp; Role</span>
              <select
                value={newAppId}
                onChange={(e) => setNewAppId(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-xs text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.company} — {app.role}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-[#a1a1aa]">
              <span>Round Name</span>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. System Design"
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-xs text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-[#a1a1aa]">
              <span>Date &amp; Time</span>
              <input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-xs text-[#fafafa] font-mono focus:border-[#3b82f6] focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-[#a1a1aa]">
              <span>Interviewer</span>
              <input
                type="text"
                value={newInterviewer}
                onChange={(e) => setNewInterviewer(e.target.value)}
                placeholder="Name or panel"
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-xs text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
              />
            </label>
            <div className="flex items-end gap-2">
              <label className="flex-1 space-y-1 text-xs text-[#a1a1aa]">
                <span>Status</span>
                <select
                  value={newOutcome}
                  onChange={(e) => setNewOutcome(e.target.value as RoundOutcome)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-xs text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
                >
                  {OUTCOMES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3b82f6] transition-colors cursor-pointer shrink-0"
              >
                Add
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 12-Column Split Layout */}
      <div className="grid gap-5 lg:grid-cols-12 items-start">
        {/* Left Queue: 5 columns */}
        <div className="lg:col-span-5 glass-panel rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="border-b border-white/[0.06] px-4 py-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 rounded-lg bg-[#0c0c0f] p-1 border border-white/[0.06]">
                {(
                  [
                    { id: 'upcoming', label: 'Upcoming', count: tabCounts.upcoming },
                    { id: 'all', label: 'All', count: tabCounts.all },
                    { id: 'passed', label: 'Completed', count: tabCounts.passed },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterMode(tab.id)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      filterMode === tab.id
                        ? 'bg-[#27272a] text-[#fafafa]'
                        : 'text-[#a1a1aa] hover:text-[#e4e4e7]'
                    }`}
                  >
                    {tab.label}{' '}
                    <span className="ml-0.5 font-mono text-[11px] text-[#71717a] tabular-nums">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
              <span className="font-mono text-xs text-[#71717a] tabular-nums whitespace-nowrap">
                {filteredRounds.length} shown
              </span>
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71717a]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={queueQuery}
                onChange={(e) => setQueueQuery(e.target.value)}
                placeholder="Filter rounds by company, title, or interviewer..."
                aria-label="Filter interview rounds"
                className="w-full rounded-lg border border-white/[0.08] bg-[#0c0c0f] py-1.5 pl-8 pr-7 text-xs text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
              />
              {queueQuery && (
                <button
                  type="button"
                  onClick={() => setQueueQuery('')}
                  aria-label="Clear round filter"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-white/[0.06] max-h-[340px] lg:max-h-[620px] overflow-y-auto">
            {filteredRounds.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-[#a1a1aa]">
                  {queueQuery.trim()
                    ? 'No rounds match that search.'
                    : 'No rounds in this filter.'}
                </p>
                {queueQuery.trim() ? (
                  <button
                    type="button"
                    onClick={() => setQueueQuery('')}
                    className="mt-3 rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-[#e4e4e7] hover:bg-white/[0.05] cursor-pointer"
                  >
                    Clear search
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="mt-3 rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-[#e4e4e7] hover:bg-white/[0.05] cursor-pointer"
                  >
                    Schedule a round
                  </button>
                )}
              </div>
            ) : (
              filteredRounds.map(({ application, round }) => {
                const isSelected =
                  activeItem?.round.id === round.id &&
                  activeItem?.application.id === application.id;
                const outcomeColor = OUTCOME_TEXT_CLASS[round.outcome];

                return (
                  <button
                    key={round.id}
                    type="button"
                    onClick={() => handleSelectRound(application.id, round.id)}
                    className={`w-full px-4 py-3.5 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#2563eb]/[0.14] ring-1 ring-inset ring-[#3b82f6]/35'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CompanyMark
                          name={application.company}
                          accentHex={application.accentHex}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-[#a1a1aa] truncate">
                              {application.company}
                            </span>
                            <span className="text-[#3f3f46]" aria-hidden="true">
                              ·
                            </span>
                            <span className={`text-[11px] font-semibold ${outcomeColor}`}>
                              {round.outcome}
                            </span>
                          </div>
                          <p className="font-display text-sm font-semibold text-[#fafafa] truncate">
                            {round.title}
                          </p>
                        </div>
                      </div>

                      <span className="font-mono text-[11px] text-[#d4d4d8] tabular-nums whitespace-nowrap shrink-0">
                        {formatRelativeDay(round.scheduledAt)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[#71717a]">
                      <span className="truncate">{round.interviewer}</span>
                      <span className="font-mono text-[11px] tabular-nums shrink-0">
                        {formatShortDateTime(round.scheduledAt)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Dossier Editor: 7 columns */}
        <div
          ref={editorRef}
          className="lg:col-span-7 glass-panel rounded-2xl border border-white/[0.08] p-5 sm:p-6"
        >
          {activeItem ? (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <CompanyMark
                    name={activeItem.application.company}
                    accentHex={activeItem.application.accentHex}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#a1a1aa]">
                      <span className="font-medium text-[#e4e4e7]">
                        {activeItem.application.company}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{activeItem.application.role}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-[#d4d4d8]">
                        {formatPayRange(
                          activeItem.application.payMin,
                          activeItem.application.payMax
                        )}
                      </span>
                    </div>
                    <h2 className="mt-0.5 font-display text-xl font-bold text-[#fafafa] truncate">
                      {activeItem.round.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-[#a1a1aa]">
                      Resume used:{' '}
                      <span className="text-[#d4d4d8]">
                        {resumeMap.get(activeItem.application.resumeVersionId)?.label ??
                          'Unassigned'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenApplication(activeItem.application)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-[#e4e4e7] hover:bg-white/[0.05] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>Role Dossier</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>

                  {confirmDeleteId === activeItem.round.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteRound(activeItem.application.id, activeItem.round.id);
                          setConfirmDeleteId(null);
                          setSelectedPair(null);
                        }}
                        className="rounded-lg bg-[#9f1239] px-2.5 py-1.5 text-xs font-semibold text-[#ffe4e6] hover:bg-[#be123c] cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-[#a1a1aa] hover:text-white px-1.5 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(activeItem.round.id)}
                      aria-label="Delete this round"
                      className="rounded-lg border border-white/[0.08] p-1.5 text-[#a1a1aa] hover:text-[#fda4af] hover:border-[#fda4af]/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Editable Metadata Grid */}
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs text-[#a1a1aa]">
                  <span>Round Title</span>
                  <input
                    type="text"
                    value={activeItem.round.title}
                    onChange={(e) =>
                      onUpdateRound(activeItem.application.id, {
                        ...activeItem.round,
                        title: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                  />
                </label>

                <label className="space-y-1.5 text-xs text-[#a1a1aa]">
                  <span>Interviewer / Panel</span>
                  <input
                    type="text"
                    value={activeItem.round.interviewer}
                    onChange={(e) =>
                      onUpdateRound(activeItem.application.id, {
                        ...activeItem.round,
                        interviewer: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                  />
                </label>

                <label className="space-y-1.5 text-xs text-[#a1a1aa]">
                  <span>Scheduled Date &amp; Time</span>
                  <input
                    type="datetime-local"
                    value={activeItem.round.scheduledAt}
                    onChange={(e) =>
                      onUpdateRound(activeItem.application.id, {
                        ...activeItem.round,
                        scheduledAt: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm font-mono text-[#fafafa] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                  />
                </label>

                <div className="space-y-1.5 text-xs text-[#a1a1aa]">
                  <span>Outcome Status</span>
                  <div className="grid grid-cols-4 gap-1 rounded-lg border border-white/[0.08] bg-[#0c0c0f] p-1">
                    {OUTCOMES.map((outcome) => {
                      const active = activeItem.round.outcome === outcome;
                      return (
                        <button
                          key={outcome}
                          type="button"
                          onClick={() =>
                            onUpdateRound(activeItem.application.id, {
                              ...activeItem.round,
                              outcome,
                            })
                          }
                          className={`rounded-md py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#27272a] text-[#fafafa]'
                              : 'text-[#a1a1aa] hover:text-[#e4e4e7]'
                          }`}
                        >
                          {outcome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Live Round Notes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor="round-notes-editor"
                    className="font-medium text-[#e4e4e7]"
                  >
                    Round Notes &amp; Debrief
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#34d399]">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    Saved locally
                  </span>
                </div>
                <textarea
                  id="round-notes-editor"
                  rows={5}
                  value={activeItem.round.notes}
                  onChange={(e) =>
                    onUpdateRound(activeItem.application.id, {
                      ...activeItem.round,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Capture questions asked, technical tradeoffs discussed, and follow-up signals..."
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] p-3 text-sm leading-relaxed text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
              </div>

              {/* Collapsible Prep & Counter-Questions Block */}
              <div className="rounded-xl border border-white/[0.08] bg-[#18181d]">
                <button
                  type="button"
                  onClick={() => setShowPrompts((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-[#e4e4e7] cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-[#fbbf24]" aria-hidden="true" />
                    <span>Prep Checklist &amp; Talking Points</span>
                  </span>
                  {showPrompts ? (
                    <ChevronUp className="h-4 w-4 text-[#a1a1aa]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#a1a1aa]" />
                  )}
                </button>

                {showPrompts && (
                  <div className="border-t border-white/[0.06] px-4 py-3 space-y-3">
                    <textarea
                      rows={3}
                      value={activeItem.round.prepChecklist ?? ''}
                      onChange={(e) =>
                        onUpdateRound(activeItem.application.id, {
                          ...activeItem.round,
                          prepChecklist: e.target.value,
                        })
                      }
                      placeholder="List STAR stories to highlight, system metrics to recall, and 2–3 targeted questions for the interviewer..."
                      className="w-full rounded-lg border border-white/[0.08] bg-[#0c0c0f] p-2.5 text-xs leading-relaxed text-[#e4e4e7] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
                    />
                    {activeItem.application.aiPrep &&
                      activeItem.application.aiPrep.interviewQuestions.length > 0 && (
                        <div className="rounded-lg border border-[#3b82f6]/25 bg-[#2563eb]/[0.06] p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-[#93c5fd]">
                              From JD AI Prep ({activeItem.application.aiPrep.keySkills.slice(0, 4).join(', ')})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const questions = activeItem.application.aiPrep!.interviewQuestions
                                  .map((q, idx) => `${idx + 1}. ${q}`)
                                  .join('\n');
                                const existing = activeItem.round.prepChecklist?.trim();
                                onUpdateRound(activeItem.application.id, {
                                  ...activeItem.round,
                                  prepChecklist: existing
                                    ? `${existing}\n\nTailored JD Questions:\n${questions}`
                                    : `Tailored JD Questions:\n${questions}`,
                                });
                              }}
                              className="text-[11px] font-semibold text-[#60a5fa] hover:text-white cursor-pointer"
                            >
                              Insert questions
                            </button>
                          </div>
                        </div>
                      )}
                    <div className="text-[11px] text-[#a1a1aa] leading-relaxed">
                      Suggested prompt: Ask about the team&apos;s biggest bottleneck in Q1 and how engineering success is measured after the first 90 days.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-[#e4e4e7]">
                {allRounds.length === 0
                  ? 'No interview rounds logged yet.'
                  : 'No rounds match the selected filter.'}
              </p>
              <p className="mt-1 text-xs text-[#a1a1aa]">
                {allRounds.length === 0
                  ? 'Schedule a round above or open an application card from the Pipeline board.'
                  : 'Switch tabs or clear the search filter on the left to inspect another round.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
