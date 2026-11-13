import React, { useState } from 'react';
import { Check, FileText, Plus, Trash2 } from 'lucide-react';
import { JobApplication, ResumeVersion } from '../types';
import { STAGE_VISUALS } from '../utils/stageStyles';
import { CompanyMark } from './CompanyMark';

interface ResumesScreenProps {
  resumes: ResumeVersion[];
  applications: JobApplication[];
  onAddResume: (resume: Omit<ResumeVersion, 'id' | 'updatedAt'>) => void;
  onUpdateResume: (resume: ResumeVersion) => void;
  onDeleteResume: (id: string) => void;
  onSetDefaultResume: (id: string) => void;
  onOpenApplication: (app: JobApplication) => void;
}

export const ResumesScreen: React.FC<ResumesScreenProps> = ({
  resumes,
  applications,
  onAddResume,
  onUpdateResume,
  onDeleteResume,
  onSetDefaultResume,
  onOpenApplication,
}) => {
  const [showNewForm, setShowNewForm] = useState(false);
  const [label, setLabel] = useState('');
  const [targetFocus, setTargetFocus] = useState('');
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onAddResume({
      label: label.trim(),
      targetFocus: targetFocus.trim() || 'General engineering leadership',
      fileName: fileName.trim() || `${label.trim().replace(/\s+/g, '_')}.pdf`,
      notes: notes.trim(),
      isDefault: resumes.length === 0,
    });
    setLabel('');
    setTargetFocus('');
    setFileName('');
    setNotes('');
    setShowNewForm(false);
  };

  return (
    <section aria-label="Resume versions" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-[30px] font-bold tracking-[-0.025em] text-[#fafafa] text-balance">
            Resume Versions
          </h1>
          <p className="mt-1 text-sm text-[#a1a1aa]">
            Track which tailored resume version was submitted to each company and compare interview conversion.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewForm((v) => !v)}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-lg border border-white/[0.14] bg-[#18181d]/90 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-[#fafafa] hover:bg-[#27272a] transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>New Version</span>
        </button>
      </div>

      {showNewForm && (
        <form
          onSubmit={handleCreate}
          className="glass-panel rounded-2xl border border-[#3b82f6]/40 p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-[#fafafa]">
              Register Resume Version
            </h2>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="text-xs text-[#a1a1aa] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-3">
            <label className="space-y-1 text-xs text-[#a1a1aa]">
              <span>Version Label</span>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. v4.3 · Core Infrastructure"
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-[#a1a1aa]">
              <span>Target Focus</span>
              <input
                type="text"
                value={targetFocus}
                onChange={(e) => setTargetFocus(e.target.value)}
                placeholder="e.g. Distributed storage & latency"
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-[#a1a1aa]">
              <span>File Reference</span>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Resume_v4.3.pdf"
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] px-3 py-2 text-sm font-mono text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
              />
            </label>
          </div>
          <label className="block space-y-1 text-xs text-[#a1a1aa]">
            <span>Key Tailoring &amp; Changelog Notes</span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Summarize emphasized projects, metrics, or framing changes in this version..."
              className="w-full rounded-lg border border-white/[0.1] bg-[#0c0c0f] p-3 text-sm text-[#fafafa] placeholder-[#71717a] focus:border-[#3b82f6] focus:outline-none"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3b82f6] transition-colors cursor-pointer"
            >
              Save Version
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch">
        {resumes.map((resume) => {
          const linkedApps = applications.filter(
            (a) => a.resumeVersionId === resume.id
          );
          const submittedApps = linkedApps.filter((a) => a.stage !== 'Saved');
          const advancedApps = linkedApps.filter(
            (a) => a.stage === 'Interview' || a.stage === 'Offer'
          );
          const interviewRate =
            submittedApps.length > 0
              ? Math.round((advancedApps.length / submittedApps.length) * 100)
              : 0;
          const isEditing = editingId === resume.id;

          return (
            <div
              key={resume.id}
              className="glass-panel flex flex-col justify-between rounded-2xl border border-white/[0.08] p-5 transition-[transform,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[2px] hover:border-white/[0.15]"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#18181d] text-[#60a5fa]">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-display text-base font-semibold text-[#fafafa] truncate">
                        {resume.label}
                      </h2>
                      <p className="font-mono text-[11px] text-[#71717a] truncate">
                        {resume.fileName}
                      </p>
                    </div>
                  </div>

                  {resume.isDefault ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#34d399] shrink-0">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      Default
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSetDefaultResume(resume.id)}
                      className="text-[11px] font-medium text-[#a1a1aa] hover:text-[#e4e4e7] shrink-0 cursor-pointer"
                    >
                      Set default
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-4 space-y-2.5">
                    <input
                      type="text"
                      value={resume.label}
                      onChange={(e) =>
                        onUpdateResume({ ...resume, label: e.target.value })
                      }
                      aria-label="Resume label"
                      placeholder="Version label"
                      className="w-full rounded-md border border-white/[0.1] bg-[#0c0c0f] px-2.5 py-1.5 text-xs text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={resume.fileName}
                      onChange={(e) =>
                        onUpdateResume({ ...resume, fileName: e.target.value })
                      }
                      aria-label="Resume file reference"
                      placeholder="Resume_v4.2.pdf"
                      className="w-full rounded-md border border-white/[0.1] bg-[#0c0c0f] px-2.5 py-1.5 text-xs font-mono text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={resume.targetFocus}
                      onChange={(e) =>
                        onUpdateResume({ ...resume, targetFocus: e.target.value })
                      }
                      aria-label="Target focus"
                      placeholder="Target role focus"
                      className="w-full rounded-md border border-white/[0.1] bg-[#0c0c0f] px-2.5 py-1.5 text-xs text-[#fafafa] focus:border-[#3b82f6] focus:outline-none"
                    />
                    <textarea
                      rows={3}
                      value={resume.notes}
                      onChange={(e) =>
                        onUpdateResume({ ...resume, notes: e.target.value })
                      }
                      aria-label="Resume notes"
                      placeholder="Tailoring & changelog notes..."
                      className="w-full rounded-md border border-white/[0.1] bg-[#0c0c0f] p-2.5 text-xs text-[#e4e4e7] focus:border-[#3b82f6] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-md bg-[#2563eb] px-3 py-1 text-xs font-semibold text-white hover:bg-[#3b82f6] cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="mt-3 text-xs font-medium text-[#d4d4d8]">
                      {resume.targetFocus}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#a1a1aa]">
                      {resume.notes || 'No tailoring notes recorded.'}
                    </p>
                  </>
                )}

                {/* Conversion Metrics Row */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/[0.06] py-3 text-center">
                  <div>
                    <div className="font-mono text-base font-semibold text-[#fafafa] tabular-nums">
                      {linkedApps.length}
                    </div>
                    <div className="text-[11px] text-[#71717a]">Linked</div>
                  </div>
                  <div>
                    <div className="font-mono text-base font-semibold text-[#fbbf24] tabular-nums">
                      {advancedApps.length}
                    </div>
                    <div className="text-[11px] text-[#71717a]">Interviews+</div>
                  </div>
                  <div>
                    <div className="font-mono text-base font-semibold text-[#34d399] tabular-nums">
                      {interviewRate}%
                    </div>
                    <div className="text-[11px] text-[#71717a]">Conversion</div>
                  </div>
                </div>

                {/* Linked Applications */}
                <div className="mt-3 space-y-1.5">
                  <div className="text-[11px] font-medium text-[#a1a1aa]">
                    Submitted Roles
                  </div>
                  {linkedApps.length > 0 ? (
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                      {linkedApps.map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => onOpenApplication(app)}
                          className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-white/[0.04] transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <CompanyMark
                              name={app.company}
                              accentHex={app.accentHex}
                              size="sm"
                            />
                            <span className="text-[#e4e4e7] truncate">
                              {app.company} · {app.role}
                            </span>
                          </span>
                          <span
                            className={`text-[11px] font-semibold shrink-0 ${STAGE_VISUALS[app.stage].textClass}`}
                          >
                            {app.stage}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#71717a]">
                      Not linked to any applications yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteId(null);
                    setEditingId(isEditing ? null : resume.id);
                  }}
                  className="font-medium text-[#60a5fa] hover:text-white cursor-pointer"
                >
                  {isEditing ? 'Close editor' : 'Edit details'}
                </button>

                {resumes.length > 1 &&
                  (confirmDeleteId === resume.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteResume(resume.id);
                          setConfirmDeleteId(null);
                        }}
                        className="font-semibold text-[#fda4af] hover:underline cursor-pointer"
                      >
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[#a1a1aa] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(resume.id)}
                      aria-label={`Delete ${resume.label}`}
                      className="text-[#71717a] hover:text-[#fda4af] transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
