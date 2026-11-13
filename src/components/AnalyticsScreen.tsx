import React, { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Download, RotateCcw, Upload } from 'lucide-react';
import { JobApplication, NextRoundStore, ResumeVersion } from '../types';
import { formatPayRange, STAGE_ORDER } from '../utils/storage';
import { STAGE_VISUALS, STATUS_BADGE_GLOW } from '../utils/stageStyles';
import { CompanyMark } from './CompanyMark';

interface AnalyticsScreenProps {
  applications: JobApplication[];
  resumes: ResumeVersion[];
  onOpenApplication: (app: JobApplication) => void;
  onImportStore: (store: NextRoundStore) => void;
  onResetSampleData: () => void;
}

type CompSortField = 'midpoint' | 'payMax' | 'company' | 'stage';
type CompStageFilter = 'all' | 'active' | 'Applied' | 'Saved';

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  applications,
  resumes,
  onOpenApplication,
  onImportStore,
  onResetSampleData,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    tone: 'info' | 'error';
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [tableFilter, setTableFilter] = useState<CompStageFilter>('all');
  const [sortField, setSortField] = useState<CompSortField>('midpoint');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const metrics = useMemo(() => {
    const total = applications.length;
    const submitted = applications.filter((a) => a.stage !== 'Saved').length;
    const interviewingOrOffer = applications.filter(
      (a) => a.stage === 'Interview' || a.stage === 'Offer'
    );
    const offers = applications.filter((a) => a.stage === 'Offer');
    const conversionRate =
      submitted > 0 ? Math.round((interviewingOrOffer.length / submitted) * 100) : 0;

    const topPayMax =
      applications.length > 0
        ? Math.max(...applications.map((a) => a.payMax))
        : 0;

    const activePool =
      interviewingOrOffer.length > 0 ? interviewingOrOffer : applications;
    const avgMidpoint =
      activePool.length > 0
        ? Math.round(
            activePool.reduce((acc, a) => acc + (a.payMin + a.payMax) / 2, 0) /
              activePool.length
          )
        : 0;

    return {
      total,
      submitted,
      interviewCount: applications.filter((a) => a.stage === 'Interview').length,
      offerCount: offers.length,
      conversionRate,
      topPayMax,
      avgMidpoint,
    };
  }, [applications]);

  const handleSort = (field: CompSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir(field === 'company' ? 'asc' : 'desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    const filtered = applications.filter((app) => {
      if (tableFilter === 'active') {
        return app.stage === 'Interview' || app.stage === 'Offer';
      }
      if (tableFilter === 'Applied') return app.stage === 'Applied';
      if (tableFilter === 'Saved') return app.stage === 'Saved';
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'midpoint') {
        cmp = (a.payMin + a.payMax) / 2 - (b.payMin + b.payMax) / 2;
      } else if (sortField === 'payMax') {
        cmp = a.payMax - b.payMax;
      } else if (sortField === 'company') {
        cmp = a.company.localeCompare(b.company);
      } else if (sortField === 'stage') {
        cmp = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [applications, tableFilter, sortField, sortDir]);

  const resumeMap = useMemo(() => {
    const m = new Map<string, ResumeVersion>();
    resumes.forEach((r) => m.set(r.id, r));
    return m;
  }, [resumes]);

  const handleExport = () => {
    const payload: NextRoundStore = { applications, resumes };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nextround-pipeline-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage({
      text: `Exported ${applications.length} applications and ${resumes.length} resume versions.`,
      tone: 'info',
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<NextRoundStore>;
        if (!Array.isArray(parsed.applications) || !Array.isArray(parsed.resumes)) {
          setStatusMessage({
            text: 'Invalid backup format: expected applications and resumes arrays.',
            tone: 'error',
          });
          return;
        }
        const validApps = parsed.applications.every(
          (item) =>
            item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.company === 'string' &&
            typeof item.role === 'string'
        );
        if (!validApps) {
          setStatusMessage({
            text: 'Invalid backup file: one or more application entries are malformed.',
            tone: 'error',
          });
          return;
        }
        onImportStore({
          applications: parsed.applications,
          resumes: parsed.resumes,
        });
        setStatusMessage({
          text: `Imported ${parsed.applications.length} applications.`,
          tone: 'info',
        });
      } catch {
        setStatusMessage({
          text: 'Could not parse JSON file. Verify the file is valid NextRound JSON.',
          tone: 'error',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const renderSortIcon = (field: CompSortField) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[#60a5fa]" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#60a5fa]" aria-hidden="true" />
    );
  };

  return (
    <section aria-label="Compensation and pipeline analytics" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-[30px] font-bold tracking-[-0.025em] text-[#fafafa] text-balance">
            Compensation &amp; Pipeline
          </h1>
          <p className="mt-1 text-sm text-[#a1a1aa]">
            Base pay band distribution, stage conversion funnel, and local browser backup controls.
          </p>
        </div>

        {/* Data Portability Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#18181d] px-3 py-2 text-xs font-medium text-[#e4e4e7] hover:bg-[#27272a] transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#18181d] px-3 py-2 text-xs font-medium text-[#e4e4e7] hover:bg-[#27272a] transition-colors cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Import JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />

          {confirmReset ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-[#fda4af]/30 bg-[#9f1239]/30 px-2.5 py-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  onResetSampleData();
                  setConfirmReset(false);
                  setStatusMessage({
                    text: 'Restored sample pipeline data.',
                    tone: 'info',
                  });
                }}
                className="font-semibold text-[#fda4af] hover:underline cursor-pointer"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="text-[#a1a1aa] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#18181d] px-3 py-2 text-xs font-medium text-[#a1a1aa] hover:text-[#e4e4e7] transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset Sample</span>
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          role={statusMessage.tone === 'error' ? 'alert' : 'status'}
          className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-xs ${
            statusMessage.tone === 'error'
              ? 'border-[#fb7185]/40 bg-[#f43f5e]/15 text-[#fda4af]'
              : 'border-[#3b82f6]/40 bg-[#2563eb]/15 text-[#93c5fd]'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[#a1a1aa] hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4-Column Executive KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="glass-panel rounded-2xl border border-white/[0.08] p-4 sm:p-5">
          <div className="text-xs text-[#a1a1aa]">Total Tracked Roles</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-[#fafafa] tabular-nums">
            {metrics.total}
          </div>
          <div className="mt-1 text-[11px] text-[#71717a] tabular-nums">
            {metrics.submitted} submitted · {metrics.total - metrics.submitted} saved
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-white/[0.08] p-4 sm:p-5">
          <div className="text-xs text-[#a1a1aa]">Interview Conversion</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-[#fbbf24] tabular-nums">
            {metrics.conversionRate}%
          </div>
          <div className="mt-1 text-[11px] text-[#71717a] tabular-nums">
            {metrics.interviewCount} interviewing · {metrics.offerCount} offers
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-white/[0.08] p-4 sm:p-5">
          <div className="text-xs text-[#a1a1aa]">Active Midpoint Base</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-[#e4e4e7] tabular-nums">
            ${metrics.avgMidpoint}k
          </div>
          <div className="mt-1 text-[11px] text-[#71717a]">
            Across interviewing &amp; offer roles
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-emerald-400/20 p-4 sm:p-5 shadow-[0_0_24px_-12px_rgba(16,185,129,0.4)]">
          <div className="text-xs text-[#a1a1aa]">Top Base Band Ceiling</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-[#34d399] tabular-nums">
            ${metrics.topPayMax}k
          </div>
          <div className="mt-1 text-[11px] text-[#71717a]">
            Excluding equity &amp; sign-on
          </div>
        </div>
      </div>

      {/* Stage Distribution Funnel */}
      <div className="glass-panel rounded-2xl border border-white/[0.08] p-5">
        <h2 className="font-display text-base font-semibold text-[#fafafa]">
          Pipeline Stage Distribution
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {STAGE_ORDER.map((stage) => {
            const count = applications.filter((a) => a.stage === stage).length;
            const pct =
              applications.length > 0
                ? Math.round((count / applications.length) * 100)
                : 0;
            const visual = STAGE_VISUALS[stage];

            return (
              <div key={stage} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${visual.textClass}`}>
                    {stage}
                  </span>
                  <span className="font-mono text-[#e4e4e7] tabular-nums">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#0c0c0f]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: visual.dotColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compensation Comparison Table */}
      <div className="glass-panel overflow-hidden rounded-2xl border border-white/[0.08]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] px-5 py-3.5">
          <h2 className="font-display text-base font-semibold text-[#fafafa]">
            Base Pay &amp; Equity Comparison
          </h2>

          <div
            role="group"
            aria-label="Filter compensation table by stage"
            className="flex items-center gap-1 rounded-lg bg-[#0c0c0f] p-1 border border-white/[0.06] self-start sm:self-auto"
          >
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Interview & Offer' },
                { id: 'Applied', label: 'Applied' },
                { id: 'Saved', label: 'Saved' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTableFilter(opt.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  tableFilter === opt.id
                    ? 'bg-[#27272a] text-[#fafafa]'
                    : 'text-[#a1a1aa] hover:text-[#e4e4e7]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {filteredAndSorted.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-[#e4e4e7]">
              {applications.length === 0
                ? 'No applications tracked yet.'
                : 'No roles match the selected stage filter.'}
            </p>
            {tableFilter !== 'all' && applications.length > 0 && (
              <button
                type="button"
                onClick={() => setTableFilter('all')}
                className="mt-3 rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-[#e4e4e7] hover:bg-white/[0.05] cursor-pointer"
              >
                Show all roles
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] font-semibold text-[#a1a1aa]">
                  <th className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('company')}
                      className="inline-flex items-center gap-1 hover:text-[#fafafa] cursor-pointer"
                    >
                      <span>Company &amp; Role</span>
                      {renderSortIcon('company')}
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('stage')}
                      className="inline-flex items-center gap-1 hover:text-[#fafafa] cursor-pointer"
                    >
                      <span>Stage</span>
                      {renderSortIcon('stage')}
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('payMax')}
                      className="inline-flex items-center gap-1 hover:text-[#fafafa] cursor-pointer"
                    >
                      <span>Base Range</span>
                      {renderSortIcon('payMax')}
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('midpoint')}
                      className="inline-flex items-center gap-1 hover:text-[#fafafa] cursor-pointer"
                    >
                      <span>Midpoint</span>
                      {renderSortIcon('midpoint')}
                    </button>
                  </th>
                  <th className="px-4 py-3">Equity / Bonus</th>
                  <th className="px-4 py-3">Resume Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-sm">
                {filteredAndSorted.map((app) => {
                  const visual = STAGE_VISUALS[app.stage];
                  const midpoint = Math.round((app.payMin + app.payMax) / 2);
                  const resume = resumeMap.get(app.resumeVersionId);
                  return (
                    <tr
                      key={app.id}
                      onClick={() => onOpenApplication(app)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <CompanyMark
                            name={app.company}
                            accentHex={app.accentHex}
                            size="sm"
                          />
                          <div>
                            <div className="font-display font-semibold text-[#fafafa]">
                              {app.company}
                            </div>
                            <div className="text-xs text-[#a1a1aa]">{app.role}</div>
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
                      <td className="px-4 py-3 font-mono text-xs text-[#e4e4e7] tabular-nums whitespace-nowrap">
                        {formatPayRange(app.payMin, app.payMax)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#34d399] tabular-nums whitespace-nowrap">
                        ${midpoint}k
                      </td>
                      <td className="px-4 py-3 text-xs text-[#d4d4d8]">
                        {app.equityNote || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#a1a1aa] whitespace-nowrap">
                        {resume ? resume.label : 'Unassigned'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
