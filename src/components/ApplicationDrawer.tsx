import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  InterviewRound,
  JobApplication,
  JobDescriptionAnalysis,
  PipelineStage,
  ResumeVersion,
  RoundOutcome,
  WorkMode,
} from '../types';
import {
  addDaysToLocalIso,
  formatPayRange,
  getFollowUpInfo,
  getIdleInfo,
  getLocalTodayIso,
  STAGE_ORDER,
} from '../utils/storage';
import { OUTCOME_TEXT_CLASS, STAGE_VISUALS, STATUS_BADGE_GLOW } from '../utils/stageStyles';
import { CompanyMark } from './CompanyMark';

interface ApplicationDrawerProps {
  application: JobApplication | null;
  initialTab?: 'details' | 'jd';
  resumes: ResumeVersion[];
  onClose: () => void;
  onUpdateApplication: (updated: JobApplication) => void;
  onDeleteApplication: (id: string) => void;
  onLogFollowUp: (id: string) => void;
  onAddRound: (appId: string, round: Omit<InterviewRound, 'id'>) => string;
  onUpdateRound: (appId: string, round: InterviewRound) => void;
  onDeleteRound: (appId: string, roundId: string) => void;
}

const WORK_MODES: WorkMode[] = ['Remote', 'Hybrid', 'On-site'];
const OUTCOMES: RoundOutcome[] = ['Scheduled', 'Waiting', 'Passed', 'Completed'];
const MIN_JD_CHARS = 25;
const MAX_JD_CHARS = 20000;

export const ApplicationDrawer: React.FC<ApplicationDrawerProps> = ({
  application,
  initialTab = 'details',
  resumes,
  onClose,
  onUpdateApplication,
  onDeleteApplication,
  onLogFollowUp,
  onAddRound,
  onUpdateRound,
  onDeleteRound,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'jd'>(initialTab);
  const [confirmDeleteApp, setConfirmDeleteApp] = useState(false);
  const [confirmDeleteRoundId, setConfirmDeleteRoundId] = useState<string | null>(null);
  const [showAddRound, setShowAddRound] = useState(false);
  const [newRoundTitle, setNewRoundTitle] = useState('');
  const [newRoundDate, setNewRoundDate] = useState(() => `${addDaysToLocalIso(3)}T11:00`);
  const [newRoundInterviewer, setNewRoundInterviewer] = useState('');
  const [newRoundNotes, setNewRoundNotes] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jdError, setJdError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [savedQuestionsFeedback, setSavedQuestionsFeedback] = useState(false);
  const analyzeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, application?.id]);

  useEffect(() => {
    analyzeAbortRef.current?.abort();
    analyzeAbortRef.current = null;
    setConfirmDeleteApp(false);
    setConfirmDeleteRoundId(null);
    setShowAddRound(false);
    setNewRoundDate(`${addDaysToLocalIso(3)}T11:00`);
    setJdError(null);
    setIsAnalyzing(false);
    setCopiedField(null);
    setSavedQuestionsFeedback(false);
    return () => {
      analyzeAbortRef.current?.abort();
    };
  }, [application?.id]);

  useEffect(() => {
    if (!application) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [application, onClose]);

  if (!application) return null;

  const updateField = <K extends keyof JobApplication>(
    key: K,
    value: JobApplication[K]
  ) => {
    onUpdateApplication({
      ...application,
      [key]: value,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddRoundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoundTitle.trim()) return;
    onAddRound(application.id, {
      title: newRoundTitle.trim(),
      scheduledAt: newRoundDate || `${addDaysToLocalIso(3)}T11:00`,
      interviewer: newRoundInterviewer.trim() || 'Interview Panel',
      outcome: 'Scheduled',
      notes: newRoundNotes.trim(),
      prepChecklist: '',
    });
    setNewRoundTitle('');
    setNewRoundInterviewer('');
    setNewRoundNotes('');
    setShowAddRound(false);
  };

  const jdText = application.jobDescription ?? '';
  const trimmedJd = jdText.trim();
  const followUp = getFollowUpInfo(application.followUpDate);
  const idle = getIdleInfo(application);
  const needsFollowUpTouch =
    followUp.status === 'today' || followUp.status === 'overdue' || idle.isIdle;

  const handleAnalyzeJd = async () => {
    setJdError(null);

    if (!trimmedJd) {
      setJdError('Paste a job description first before running AI extraction.');
      return;
    }

    if (trimmedJd.length < MIN_JD_CHARS) {
      setJdError(
        `Please paste at least ${MIN_JD_CHARS} characters of the job description (${trimmedJd.length} entered).`
      );
      return;
    }

    if (trimmedJd.length > MAX_JD_CHARS) {
      setJdError(
        `Job description exceeds ${MAX_JD_CHARS.toLocaleString()} characters. Trim extraneous footer text and retry.`
      );
      return;
    }

    analyzeAbortRef.current?.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          jobDescription: trimmedJd,
          company: application.company,
          role: application.role,
          recruiterName: application.recruiterName,
          stage: application.stage,
        }),
      });

      let data: Partial<JobDescriptionAnalysis> & { error?: string } = {};
      try {
        data = (await response.json()) as Partial<JobDescriptionAnalysis> & {
          error?: string;
        };
      } catch {
        throw new Error('Unexpected response format from server.');
      }

      if (!response.ok) {
        throw new Error(
          data.error || `Analysis failed with status ${response.status}.`
        );
      }

      if (
        !Array.isArray(data.keySkills) ||
        !Array.isArray(data.interviewQuestions) ||
        typeof data.followUpNote !== 'string'
      ) {
        throw new Error('Received incomplete analysis payload from server.');
      }

      const aiPrep: JobDescriptionAnalysis = {
        keySkills: data.keySkills,
        interviewQuestions: data.interviewQuestions,
        followUpNote: data.followUpNote,
        analyzedAt: data.analyzedAt || new Date().toISOString(),
        model: data.model || 'gemini-3.5-flash-lite',
      };

      updateField('aiPrep', aiPrep);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : 'Network error while analyzing job description.';
      setJdError(message);
    } finally {
      if (analyzeAbortRef.current === controller) {
        setIsAnalyzing(false);
        analyzeAbortRef.current = null;
      }
    }
  };

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(key);
      setTimeout(() => {
        setCopiedField((curr) => (curr === key ? null : curr));
      }, 1800);
    } catch {
      setJdError('Clipboard access was denied by the browser. Select and copy the text manually.');
    }
  };

  const handleSaveQuestionsToRound = () => {
    if (!application.aiPrep) return;
    const formatted = application.aiPrep.interviewQuestions
      .map((q, idx) => `${idx + 1}. ${q}`)
      .join('\n');

    const targetRound =
      application.rounds.find(
        (r) => r.outcome === 'Scheduled' || r.outcome === 'Waiting'
      ) ?? application.rounds[application.rounds.length - 1];

    if (targetRound) {
      const existingChecklist = targetRound.prepChecklist?.trim();
      const updatedChecklist = existingChecklist
        ? `${existingChecklist}\n\nTailored JD Questions:\n${formatted}`
        : `Tailored JD Questions:\n${formatted}`;
      onUpdateRound(application.id, {
        ...targetRound,
        prepChecklist: updatedChecklist,
      });
    } else {
      onAddRound(application.id, {
        title: 'Initial Screening Prep',
        scheduledAt: `${addDaysToLocalIso(3)}T11:00`,
        interviewer: application.recruiterName || 'Hiring Team',
        outcome: 'Scheduled',
        notes: `Key skills: ${application.aiPrep.keySkills.join(', ')}`,
        prepChecklist: `Tailored JD Questions:\n${formatted}`,
      });
    }

    setSavedQuestionsFeedback(true);
    setTimeout(() => setSavedQuestionsFeedback(false), 2200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${application.company} dossier`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col border-l border-white/[0.1] bg-[#111115]/95 backdrop-blur-xl shadow-2xl rounded-t-2xl sm:rounded-t-none sm:rounded-l-2xl overflow-hidden"
      >
        {/* Top Drawer Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3.5 min-w-0">
            <CompanyMark
              name={application.company}
              accentHex={application.accentHex}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-[#a1a1aa]">
                  {application.company}
                </span>
                <span className="text-[#3f3f46]" aria-hidden="true">
                  ·
                </span>
                {application.stage === 'Offer' ? (
                  <span className={STATUS_BADGE_GLOW.offer}>Offer</span>
                ) : (
                  <span
                    className={`text-xs font-semibold ${STAGE_VISUALS[application.stage].textClass}`}
                  >
                    {application.stage}
                  </span>
                )}
                {getFollowUpInfo(application.followUpDate).status === 'overdue' && (
                  <span className={STATUS_BADGE_GLOW.overdue}>Overdue</span>
                )}
                {getFollowUpInfo(application.followUpDate).status === 'today' && (
                  <span className={STATUS_BADGE_GLOW.dueToday}>Due Today</span>
                )}
                {getIdleInfo(application).isIdle && (
                  <span className="text-[11px] font-medium text-[#fbbf24] tabular-nums">
                    Idle {getIdleInfo(application).daysIdle}d
                  </span>
                )}
              </div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-[#fafafa] truncate">
                {application.role}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-[#d4d4d8] tabular-nums">
                {formatPayRange(application.payMin, application.payMax)}
                {application.equityNote ? ` · ${application.equityNote}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => updateField('starred', !application.starred)}
              aria-label={application.starred ? 'Unstar role' : 'Star role'}
              className={`rounded-lg p-2 transition-colors cursor-pointer ${
                application.starred
                  ? 'text-[#fbbf24] bg-[#f59e0b]/15'
                  : 'text-[#a1a1aa] hover:bg-white/[0.06] hover:text-[#fafafa]'
              }`}
            >
              <Star
                className="h-4 w-4"
                fill={application.starred ? 'currentColor' : 'none'}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dossier"
              className="rounded-lg p-2 text-[#a1a1aa] hover:bg-white/[0.06] hover:text-[#fafafa] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Drawer Navigation Tabs */}
        <div className="border-b border-white/[0.08] px-5 py-2.5 sm:px-6 bg-[#0c0c0f]/60">
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.08] bg-[#0c0c0f] p-1">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-[#27272a] text-[#fafafa]'
                  : 'text-[#a1a1aa] hover:text-[#e4e4e7]'
              }`}
            >
              Details &amp; Rounds
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('jd')}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'jd'
                  ? 'bg-[#2563eb] text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)]'
                  : 'text-[#a1a1aa] hover:text-[#e4e4e7]'
              }`}
            >
              JD &amp; AI Prep{application.aiPrep ? ' · Ready' : ''}
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-6">
          {activeTab === 'jd' ? (
            <div className="space-y-5">
              {/* Paste Job Description Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="jd-paste-textarea"
                    className="text-xs font-semibold text-[#fafafa]"
                  >
                    Paste Job Description
                  </label>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      trimmedJd.length > MAX_JD_CHARS
                        ? 'text-[#fda4af]'
                        : 'text-[#71717a]'
                    }`}
                  >
                    {trimmedJd.length.toLocaleString()} / {MAX_JD_CHARS.toLocaleString()} chars
                  </span>
                </div>

                <textarea
                  id="jd-paste-textarea"
                  rows={7}
                  value={jdText}
                  onChange={(e) => {
                    if (jdError) setJdError(null);
                    updateField('jobDescription', e.target.value);
                  }}
                  placeholder={`Paste the full ${application.company} — ${application.role} job description here to extract required skills, 3 tailored interview questions, and a recruiter follow-up note...`}
                  className="w-full rounded-xl border border-white/[0.1] bg-[#0c0c0f] p-3.5 text-sm leading-relaxed text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <p className="text-[11px] text-[#71717a]">
                    Stored locally with this application card.
                  </p>
                  <div className="flex items-center gap-2">
                    {jdText.length > 0 && !isAnalyzing && (
                      <button
                        type="button"
                        onClick={() => {
                          setJdError(null);
                          updateField('jobDescription', '');
                        }}
                        className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-medium text-[#a1a1aa] hover:text-[#fafafa] cursor-pointer"
                      >
                        Clear JD
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAnalyzeJd}
                      disabled={isAnalyzing}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-[#3b82f6] disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          <span>Analyzing JD...</span>
                        </>
                      ) : (
                        <>
                          {application.aiPrep && (
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          <span>
                            {application.aiPrep ? 'Re-analyze JD' : 'Extract Skills & Prep'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Validation & API Error Display */}
              {jdError && (
                <div
                  role="alert"
                  className="flex items-start justify-between gap-3 rounded-xl border border-[#fb7185]/40 bg-[#f43f5e]/10 p-3.5 text-xs text-[#fda4af]"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="leading-relaxed">{jdError}</span>
                  </div>
                  {trimmedJd.length >= MIN_JD_CHARS && !isAnalyzing && (
                    <button
                      type="button"
                      onClick={handleAnalyzeJd}
                      className="rounded-md border border-[#fb7185]/40 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#f43f5e]/20 shrink-0 cursor-pointer"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {/* Generated Output */}
              {application.aiPrep ? (
                <div className="space-y-5 border-t border-white/[0.08] pt-5">
                  {/* 1. Key Required Skills */}
                  <div className="rounded-xl border border-white/[0.08] bg-[#18181d] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-sm font-semibold text-[#fafafa]">
                        Key Required Skills
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy('skills', application.aiPrep!.keySkills.join(', '))
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#60a5fa] hover:text-white cursor-pointer"
                      >
                        {copiedField === 'skills' ? (
                          <>
                            <Check className="h-3 w-3 text-[#34d399]" />
                            <span className="text-[#34d399]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy skills</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {application.aiPrep.keySkills.map((skill, idx) => (
                        <span
                          key={`${skill}-${idx}`}
                          className="rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-2.5 py-1 text-xs font-medium text-[#e4e4e7]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 2. 3 Tailored Interview Questions */}
                  <div className="rounded-xl border border-white/[0.08] bg-[#18181d] p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-display text-sm font-semibold text-[#fafafa]">
                        3 Tailored Interview Questions
                      </h3>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleSaveQuestionsToRound}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#34d399] hover:underline cursor-pointer"
                        >
                          {savedQuestionsFeedback ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Added to Round Prep</span>
                            </>
                          ) : (
                            <span>Add to Round Prep</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              'questions',
                              application.aiPrep!.interviewQuestions
                                .map((q, i) => `${i + 1}. ${q}`)
                                .join('\n\n')
                            )
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#60a5fa] hover:text-white cursor-pointer"
                        >
                          {copiedField === 'questions' ? (
                            <>
                              <Check className="h-3 w-3 text-[#34d399]" />
                              <span className="text-[#34d399]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy all</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <ol className="space-y-2.5">
                      {application.aiPrep.interviewQuestions.map((question, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 rounded-lg border border-white/[0.07] bg-[#0c0c0f] p-3"
                        >
                          <span className="font-mono text-xs font-semibold text-[#fbbf24] tabular-nums shrink-0 mt-0.5">
                            0{idx + 1}
                          </span>
                          <p className="text-xs sm:text-[13px] leading-relaxed text-[#e4e4e7]">
                            {question}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* 3. Concise Recruiter Follow-up Note */}
                  <div className="rounded-xl border border-white/[0.08] bg-[#18181d] p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-sm font-semibold text-[#fafafa]">
                        Recruiter Follow-up Draft
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy('followup', application.aiPrep!.followUpNote)
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#60a5fa] hover:text-white cursor-pointer"
                      >
                        {copiedField === 'followup' ? (
                          <>
                            <Check className="h-3 w-3 text-[#34d399]" />
                            <span className="text-[#34d399]">Copied note</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy note</span>
                          </>
                        )}
                      </button>
                    </div>

                    <textarea
                      rows={5}
                      aria-label="Drafted recruiter follow-up note"
                      value={application.aiPrep.followUpNote}
                      onChange={(e) =>
                        updateField('aiPrep', {
                          ...application.aiPrep!,
                          followUpNote: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-white/[0.08] bg-[#0c0c0f] p-3 text-xs sm:text-[13px] leading-relaxed text-[#e4e4e7] focus:border-[#3b82f6] focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                !isAnalyzing && (
                  <div className="rounded-xl border border-dashed border-white/[0.1] px-5 py-8 text-center">
                    <p className="text-xs font-medium text-[#d4d4d8]">
                      Paste the job description above and click &ldquo;Extract Skills &amp; Prep&rdquo;.
                    </p>
                    <p className="mt-1 text-[11px] text-[#71717a]">
                      Extracts required skills, generates 3 tailored interview questions, and drafts a recruiter follow-up note.
                    </p>
                  </div>
                )
              )}
            </div>
          ) : (
            <>
              {/* Stage Switcher */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-[#a1a1aa]">
                  Pipeline Stage
                </span>
                <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-white/[0.08] bg-[#0c0c0f] p-1">
                  {STAGE_ORDER.map((stage) => {
                    const active = application.stage === stage;
                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => updateField('stage', stage as PipelineStage)}
                        className={`rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#2563eb] text-white'
                            : 'text-[#a1a1aa] hover:text-[#e4e4e7]'
                        }`}
                      >
                        {stage}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Core Application Details */}
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="space-y-1 text-xs text-[#a1a1aa]">
                  <span>Company</span>
                  <input
                    type="text"
                    value={application.company}
                    onChange={(e) => updateField('company', e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
                  />
                </label>
                <label className="space-y-1 text-xs text-[#a1a1aa]">
                  <span>Role Title</span>
                  <input
                    type="text"
                    value={application.role}
                    onChange={(e) => updateField('role', e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
                  />
                </label>

                <div className="space-y-1">
                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="space-y-1 text-xs text-[#a1a1aa]">
                      <span>Pay Min ($k)</span>
                      <input
                        type="number"
                        min={0}
                        value={application.payMin}
                        onChange={(e) =>
                          updateField('payMin', Math.max(0, Number(e.target.value)))
                        }
                        className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm font-mono tabular-nums text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-[#a1a1aa]">
                      <span>Pay Max ($k)</span>
                      <input
                        type="number"
                        min={0}
                        value={application.payMax}
                        onChange={(e) =>
                          updateField('payMax', Math.max(0, Number(e.target.value)))
                        }
                        className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm font-mono tabular-nums text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
                      />
                    </label>
                  </div>
                  {application.payMax > 0 && application.payMax < application.payMin && (
                    <p className="text-[11px] text-[#fbbf24]">
                      Pay max is below pay min (${application.payMin}k).
                    </p>
                  )}
                </div>

                <label className="space-y-1 text-xs text-[#a1a1aa]">
                  <span>Equity / Sign-on Note</span>
                  <input
                    type="text"
                    value={application.equityNote ?? ''}
                    onChange={(e) => updateField('equityNote', e.target.value)}
                    placeholder="e.g. $150k/yr RSU · $25k sign-on"
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
                  />
                </label>

                <label className="space-y-1 text-xs text-[#a1a1aa]">
                  <span>Work Mode</span>
                  <select
                    value={application.workMode}
                    onChange={(e) =>
                      updateField('workMode', e.target.value as WorkMode)
                    }
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] focus:border-[#3b82f6] focus:outline-none cursor-pointer"
                  >
                    {WORK_MODES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs text-[#a1a1aa]">
                  <span>Location</span>
                  <input
                    type="text"
                    value={application.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
                  />
                </label>

                <label className="space-y-1 text-xs text-[#a1a1aa]">
                  <span>Resume Version Submitted</span>
                  <select
                    value={application.resumeVersionId}
                    onChange={(e) => updateField('resumeVersionId', e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] focus:border-[#3b82f6] focus:outline-none cursor-pointer"
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <label className="space-y-1 text-xs text-[#a1a1aa]">
                    <span>Recruiter / Contact</span>
                    <input
                      type="text"
                      value={application.recruiterName ?? ''}
                      onChange={(e) => updateField('recruiterName', e.target.value)}
                      placeholder="Name or referral"
                      className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-[#a1a1aa]">
                    <span>Planned Rounds</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={application.totalRoundsPlanned}
                      onChange={(e) =>
                        updateField(
                          'totalRoundsPlanned',
                          Math.min(10, Math.max(1, Number(e.target.value) || 1))
                        )
                      }
                      className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm font-mono tabular-nums text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
                    />
                  </label>
                </div>

                <div className="sm:col-span-2 rounded-xl border border-white/[0.08] bg-[#18181d] p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#e4e4e7]">
                      Next Follow-up Date
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {needsFollowUpTouch && (
                        <button
                          type="button"
                          onClick={() => onLogFollowUp(application.id)}
                          className="inline-flex items-center gap-1 rounded border border-[#10b981]/35 bg-[#10b981]/15 px-2 py-0.5 text-[11px] font-semibold text-[#34d399] hover:bg-[#10b981]/25 cursor-pointer"
                        >
                          <Check className="h-3 w-3" aria-hidden="true" />
                          <span>Mark Followed Up (+4d)</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => updateField('followUpDate', getLocalTodayIso())}
                        className="rounded border border-white/[0.1] bg-[#0c0c0f] px-2 py-0.5 text-[11px] text-[#d4d4d8] hover:text-white cursor-pointer"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('followUpDate', addDaysToLocalIso(3))}
                        className="rounded border border-white/[0.1] bg-[#0c0c0f] px-2 py-0.5 text-[11px] text-[#d4d4d8] hover:text-white cursor-pointer"
                      >
                        +3 days
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('followUpDate', addDaysToLocalIso(7))}
                        className="rounded border border-white/[0.1] bg-[#0c0c0f] px-2 py-0.5 text-[11px] text-[#d4d4d8] hover:text-white cursor-pointer"
                      >
                        +1 week
                      </button>
                      {application.followUpDate && (
                        <button
                          type="button"
                          onClick={() => updateField('followUpDate', '')}
                          className="rounded px-2 py-0.5 text-[11px] text-[#a1a1aa] hover:text-[#fda4af] cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="date"
                    aria-label="Follow-up date"
                    value={application.followUpDate ?? ''}
                    onChange={(e) => updateField('followUpDate', e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm font-mono text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
                  />
                </div>
              </div>

              {/* Job URL & Summary Note */}
              <div className="space-y-3.5">
                <label className="block space-y-1 text-xs text-[#a1a1aa]">
                  <span>Job Posting URL</span>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={application.jobUrl ?? ''}
                      onChange={(e) => updateField('jobUrl', e.target.value)}
                      placeholder="https://company.com/careers/..."
                      className="flex-1 rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
                    />
                    {application.jobUrl && (
                      <a
                        href={application.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-white/[0.12] px-3 py-2 text-xs font-medium text-[#e4e4e7] hover:bg-white/[0.06] shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Open</span>
                      </a>
                    )}
                  </div>
                </label>

                <label className="block space-y-1 text-xs text-[#a1a1aa]">
                  <span>Application Summary Note</span>
                  <textarea
                    rows={2}
                    value={application.summaryNote}
                    onChange={(e) => updateField('summaryNote', e.target.value)}
                    placeholder="Key context, referrals, compensation expectations, or next steps..."
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] p-3 text-sm leading-relaxed text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
                  />
                </label>
              </div>

              {/* Interview Rounds Section */}
              <div className="border-t border-white/[0.08] pt-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-base font-semibold text-[#fafafa]">
                      Interview Rounds &amp; Notes
                    </h3>
                    <p className="text-xs text-[#a1a1aa]">
                      {application.rounds.length} of {application.totalRoundsPlanned}{' '}
                      rounds logged
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddRound((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#18181d] px-3 py-1.5 text-xs font-semibold text-[#fafafa] hover:bg-[#27272a] transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Add Round</span>
                  </button>
                </div>

                {showAddRound && (
                  <form
                    onSubmit={handleAddRoundSubmit}
                    className="rounded-xl border border-[#3b82f6]/40 bg-[#18181d] p-3.5 space-y-3"
                  >
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      <input
                        type="text"
                        required
                        value={newRoundTitle}
                        onChange={(e) => setNewRoundTitle(e.target.value)}
                        placeholder="Round title (e.g. System Design)"
                        className="rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-xs text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
                      />
                      <input
                        type="datetime-local"
                        value={newRoundDate}
                        onChange={(e) => setNewRoundDate(e.target.value)}
                        className="rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-xs font-mono text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newRoundInterviewer}
                        onChange={(e) => setNewRoundInterviewer(e.target.value)}
                        placeholder="Interviewer(s)"
                        className="rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-xs text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={newRoundNotes}
                      onChange={(e) => setNewRoundNotes(e.target.value)}
                      placeholder="Round notes or focus topics..."
                      className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] p-2.5 text-xs text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddRound(false)}
                        className="px-3 py-1.5 text-xs text-[#a1a1aa] hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-[#2563eb] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#3b82f6] cursor-pointer"
                      >
                        Save Round
                      </button>
                    </div>
                  </form>
                )}

                {application.rounds.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/[0.08] px-4 py-6 text-center text-xs text-[#a1a1aa]">
                    No rounds logged yet. Click &ldquo;Add Round&rdquo; to track interviews and debrief notes.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {application.rounds.map((round, idx) => (
                      <div
                        key={round.id}
                        className="rounded-xl border border-white/[0.08] bg-[#18181d] p-3.5 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="font-mono text-xs text-[#71717a] tabular-nums">
                              0{idx + 1}
                            </span>
                            <input
                              type="text"
                              value={round.title}
                              onChange={(e) =>
                                onUpdateRound(application.id, {
                                  ...round,
                                  title: e.target.value,
                                })
                              }
                              aria-label="Round title"
                              className="min-w-0 flex-1 bg-transparent font-display text-sm font-semibold text-[#fafafa] focus:outline-none border-b border-transparent focus:border-[#3b82f6]"
                            />
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              aria-label="Round outcome"
                              value={round.outcome}
                              onChange={(e) =>
                                onUpdateRound(application.id, {
                                  ...round,
                                  outcome: e.target.value as RoundOutcome,
                                })
                              }
                              className={`rounded-md border border-white/[0.1] bg-[#0c0c0f] px-2 py-1 text-xs font-semibold focus:border-[#3b82f6] focus:outline-none cursor-pointer ${
                                OUTCOME_TEXT_CLASS[round.outcome]
                              }`}
                            >
                              {OUTCOMES.map((o) => (
                                <option key={o} value={o} className="text-[#fafafa]">
                                  {o}
                                </option>
                              ))}
                            </select>
                            {confirmDeleteRoundId === round.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteRound(application.id, round.id);
                                    setConfirmDeleteRoundId(null);
                                  }}
                                  className="rounded bg-[#9f1239] px-2 py-0.5 text-[11px] font-semibold text-[#ffe4e6] hover:bg-[#be123c] cursor-pointer"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteRoundId(null)}
                                  className="text-[11px] text-[#a1a1aa] hover:text-white cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteRoundId(round.id)}
                                aria-label={`Delete ${round.title}`}
                                className="rounded p-1 text-[#71717a] hover:text-[#fda4af] cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="text"
                            value={round.interviewer}
                            onChange={(e) =>
                              onUpdateRound(application.id, {
                                ...round,
                                interviewer: e.target.value,
                              })
                            }
                            placeholder="Interviewer"
                            className="rounded-md border border-white/[0.08] bg-[#0c0c0f] px-2.5 py-1.5 text-xs text-[#e4e4e7] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
                          />
                          <input
                            type="datetime-local"
                            value={round.scheduledAt}
                            onChange={(e) =>
                              onUpdateRound(application.id, {
                                ...round,
                                scheduledAt: e.target.value,
                              })
                            }
                            className="rounded-md border border-white/[0.08] bg-[#0c0c0f] px-2.5 py-1.5 text-xs font-mono text-[#e4e4e7] focus:border-[#3b82f6] focus:outline-none"
                          />
                        </div>

                        <textarea
                          rows={2}
                          value={round.notes}
                          onChange={(e) =>
                            onUpdateRound(application.id, {
                              ...round,
                              notes: e.target.value,
                            })
                          }
                          placeholder="Round notes, questions asked, and debrief..."
                          className="w-full rounded-md border border-white/[0.08] bg-[#0c0c0f] p-2.5 text-xs leading-relaxed text-[#e4e4e7] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Delete Controls */}
        <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#09090b]/80 px-5 py-3.5 sm:px-6">
          {confirmDeleteApp ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#fda4af]">
                Remove {application.company} permanently?
              </span>
              <button
                type="button"
                onClick={() => {
                  onDeleteApplication(application.id);
                  onClose();
                }}
                className="rounded-md bg-[#9f1239] px-3 py-1.5 text-xs font-semibold text-[#ffe4e6] hover:bg-[#be123c] cursor-pointer"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteApp(false)}
                className="text-xs text-[#a1a1aa] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeleteApp(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#a1a1aa] hover:text-[#fda4af] transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Delete Application</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3b82f6] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
