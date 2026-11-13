import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  JobApplication,
  PipelineStage,
  ResumeVersion,
  WorkMode,
} from '../types';
import { addDaysToLocalIso, STAGE_ORDER } from '../utils/storage';

interface AddApplicationModalProps {
  isOpen: boolean;
  initialStage: PipelineStage;
  resumes: ResumeVersion[];
  onClose: () => void;
  onCreate: (app: Omit<JobApplication, 'id' | 'updatedAt'>) => void;
}

const ACCENT_OPTIONS = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#06b6d4',
  '#f43f5e',
  '#a1a1aa',
];

export const AddApplicationModal: React.FC<AddApplicationModalProps> = ({
  isOpen,
  initialStage,
  resumes,
  onClose,
  onCreate,
}) => {
  const defaultResume = resumes.find((r) => r.isDefault) ?? resumes[0];
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [stage, setStage] = useState<PipelineStage>(initialStage);
  const [payMin, setPayMin] = useState('200');
  const [payMax, setPayMax] = useState('240');
  const [equityNote, setEquityNote] = useState('');
  const [workMode, setWorkMode] = useState<WorkMode>('Hybrid');
  const [location, setLocation] = useState('San Francisco, CA');
  const [resumeVersionId, setResumeVersionId] = useState(defaultResume?.id ?? '');
  const [totalRoundsPlanned, setTotalRoundsPlanned] = useState('4');
  const [summaryNote, setSummaryNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState(() => addDaysToLocalIso(4));
  const [firstRoundTitle, setFirstRoundTitle] = useState('');
  const [firstRoundDate, setFirstRoundDate] = useState(() => `${addDaysToLocalIso(3)}T11:00`);
  const [accentHex, setAccentHex] = useState(ACCENT_OPTIONS[0]);

  useEffect(() => {
    if (!isOpen) return;
    setStage(initialStage);
    if (defaultResume?.id) setResumeVersionId(defaultResume.id);
    setFollowUpDate(addDaysToLocalIso(4));
    setFirstRoundDate(`${addDaysToLocalIso(3)}T11:00`);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [initialStage, isOpen, defaultResume?.id, onClose]);

  if (!isOpen) return null;

  const parsedMin = Number(payMin) || 0;
  const parsedMax = Number(payMax) || 0;
  const payRangeInverted = payMin !== '' && payMax !== '' && parsedMax < parsedMin;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;
    const minNum = Math.max(0, parsedMin);
    const maxNum = Math.max(minNum, parsedMax || minNum);
    const rounds =
      firstRoundTitle.trim().length > 0
        ? [
            {
              id: `r-${Date.now()}`,
              title: firstRoundTitle.trim(),
              scheduledAt: firstRoundDate,
              interviewer: 'Hiring Team',
              outcome: 'Scheduled' as const,
              notes: summaryNote.trim(),
            },
          ]
        : [];

    onCreate({
      company: company.trim(),
      accentHex,
      role: role.trim(),
      stage,
      payMin: minNum,
      payMax: maxNum,
      equityNote: equityNote.trim() || undefined,
      workMode,
      location: location.trim() || workMode,
      resumeVersionId: resumeVersionId || defaultResume?.id || '',
      totalRoundsPlanned: Math.min(10, Math.max(1, Number(totalRoundsPlanned) || 4)),
      rounds,
      summaryNote: summaryNote.trim(),
      appliedAt:
        stage !== 'Saved' ? new Date().toISOString().slice(0, 10) : undefined,
      followUpDate: followUpDate || undefined,
    });

    setCompany('');
    setRole('');
    setPayMin('200');
    setPayMax('240');
    setEquityNote('');
    setWorkMode('Hybrid');
    setLocation('San Francisco, CA');
    setTotalRoundsPlanned('4');
    setSummaryNote('');
    setFollowUpDate(addDaysToLocalIso(4));
    setFirstRoundTitle('');
    setFirstRoundDate(`${addDaysToLocalIso(3)}T11:00`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Add job application"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-white/[0.1] bg-[#111115]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <h2 className="font-display text-lg font-bold text-[#fafafa]">
            Add Application Role
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-[#a1a1aa] hover:bg-white/[0.06] hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-[#a1a1aa]">
              <span>Company *</span>
              <input
                type="text"
                required
                autoFocus
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Stripe"
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-[#a1a1aa]">
              <span>Role Title *</span>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Staff Platform Engineer"
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
              />
            </label>
          </div>

          {/* Stage Selector */}
          <div className="space-y-1 text-xs text-[#a1a1aa]">
            <span>Initial Stage</span>
            <div className="grid grid-cols-4 gap-1 rounded-lg border border-white/[0.08] bg-[#0c0c0f] p-1">
              {STAGE_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStage(s)}
                  className={`rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    stage === s
                      ? 'bg-[#2563eb] text-white'
                      : 'text-[#a1a1aa] hover:text-[#e4e4e7]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="grid gap-3.5 sm:grid-cols-3">
              <label className="space-y-1 text-xs text-[#a1a1aa]">
                <span>Pay Min ($k)</span>
                <input
                  type="number"
                  min={0}
                  value={payMin}
                  onChange={(e) => setPayMin(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm font-mono tabular-nums text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
                />
              </label>
              <label className="space-y-1 text-xs text-[#a1a1aa]">
                <span>Pay Max ($k)</span>
                <input
                  type="number"
                  min={0}
                  value={payMax}
                  onChange={(e) => setPayMax(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm font-mono tabular-nums text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
                />
              </label>
              <label className="space-y-1 text-xs text-[#a1a1aa]">
                <span>Equity / Bonus</span>
                <input
                  type="text"
                  value={equityNote}
                  onChange={(e) => setEquityNote(e.target.value)}
                  placeholder="RSU / Options"
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
                />
              </label>
            </div>
            {payRangeInverted && (
              <p className="text-[11px] text-[#fbbf24]">
                Pay max is lower than pay min — it will be normalized to at least ${parsedMin}k on save.
              </p>
            )}
          </div>

          <div className="grid gap-3.5 sm:grid-cols-3">
            <label className="space-y-1 text-xs text-[#a1a1aa]">
              <span>Work Mode</span>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] focus:border-[#3b82f6] focus:outline-none cursor-pointer"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-[#a1a1aa]">
              <span>Location</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-[#a1a1aa]">
              <span>Planned Rounds</span>
              <input
                type="number"
                min={1}
                max={10}
                value={totalRoundsPlanned}
                onChange={(e) => setTotalRoundsPlanned(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm font-mono tabular-nums text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
              />
            </label>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-3 items-end">
            <label className="space-y-1 text-xs text-[#a1a1aa]">
              <span>Resume Version</span>
              <select
                value={resumeVersionId}
                onChange={(e) => setResumeVersionId(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] focus:border-[#3b82f6] focus:outline-none cursor-pointer"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs text-[#a1a1aa]">
              <span>Follow-up Date</span>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm font-mono text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
              />
            </label>

            <div className="space-y-1 text-xs text-[#a1a1aa]">
              <span>Company Accent</span>
              <div className="flex items-center gap-2 py-1.5">
                {ACCENT_OPTIONS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setAccentHex(hex)}
                    aria-label={`Select accent color ${hex}`}
                    className={`h-6 w-6 rounded-full border-2 transition-transform cursor-pointer ${
                      accentHex === hex
                        ? 'border-white scale-110'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          {stage === 'Interview' && (
            <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-white/[0.08] bg-[#18181d] p-3">
              <label className="space-y-1 text-xs text-[#a1a1aa]">
                <span>Upcoming Round Name</span>
                <input
                  type="text"
                  value={firstRoundTitle}
                  onChange={(e) => setFirstRoundTitle(e.target.value)}
                  placeholder="e.g. Technical Screen"
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-1.5 text-xs text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
                />
              </label>
              <label className="space-y-1 text-xs text-[#a1a1aa]">
                <span>Date &amp; Time</span>
                <input
                  type="datetime-local"
                  value={firstRoundDate}
                  onChange={(e) => setFirstRoundDate(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-1.5 text-xs font-mono text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
                />
              </label>
            </div>
          )}

          <label className="block space-y-1 text-xs text-[#a1a1aa]">
            <span>Round &amp; Application Notes</span>
            <textarea
              rows={2}
              value={summaryNote}
              onChange={(e) => setSummaryNote(e.target.value)}
              placeholder="Referral source, target comp notes, or interview prep reminders..."
              className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] p-3 text-sm text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
            />
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/[0.12] px-4 py-2 text-xs font-semibold text-[#e4e4e7] hover:bg-white/[0.05] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2563eb] px-5 py-2 text-xs font-semibold text-white hover:bg-[#3b82f6] transition-colors cursor-pointer"
            >
              Add to {stage}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
