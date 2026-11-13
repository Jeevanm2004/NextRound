import { JobApplication, NextRoundStore, PipelineStage } from '../types';
import { SEED_APPLICATIONS, SEED_RESUMES } from '../data/seedData';

const STORAGE_KEY = 'nextround.pipeline.v1';

export const STAGE_ORDER: PipelineStage[] = ['Saved', 'Applied', 'Interview', 'Offer'];
export const IDLE_THRESHOLD_DAYS = 5;

export function loadStore(): NextRoundStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: NextRoundStore = {
        applications: SEED_APPLICATIONS,
        resumes: SEED_RESUMES,
      };
      saveStore(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<NextRoundStore>;
    if (!Array.isArray(parsed.applications) || !Array.isArray(parsed.resumes)) {
      return { applications: SEED_APPLICATIONS, resumes: SEED_RESUMES };
    }

    // Preserve all existing user edits while gently backfilling missing followUpDate
    // on untouched seed entries that were saved prior to followUpDate support.
    const seedById = new Map(SEED_APPLICATIONS.map((a) => [a.id, a]));
    const hydratedApps = parsed.applications.map((app) => {
      if (app.followUpDate === undefined) {
        const seedMatch = seedById.get(app.id);
        if (seedMatch?.followUpDate) {
          return { ...app, followUpDate: seedMatch.followUpDate };
        }
      }
      return app;
    });

    return {
      applications: hydratedApps,
      resumes: parsed.resumes.length > 0 ? parsed.resumes : SEED_RESUMES,
    };
  } catch {
    return {
      applications: SEED_APPLICATIONS,
      resumes: SEED_RESUMES,
    };
  }
}

export function saveStore(store: NextRoundStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function resetToSeedStore(): NextRoundStore {
  const initial: NextRoundStore = {
    applications: SEED_APPLICATIONS,
    resumes: SEED_RESUMES,
  };
  saveStore(initial);
  return initial;
}

export function getLocalTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToLocalIso(days: number): string {
  const target = new Date();
  target.setDate(target.getDate() + days);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type FollowUpStatusType = 'overdue' | 'today' | 'upcoming' | 'none';

export interface FollowUpInfo {
  status: FollowUpStatusType;
  label: string;
  shortDate: string;
  daysDiff: number;
}

export function getFollowUpInfo(followUpDate?: string): FollowUpInfo {
  if (!followUpDate) {
    return { status: 'none', label: 'No follow-up', shortDate: '', daysDiff: 9999 };
  }
  const parts = followUpDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return { status: 'none', label: 'No follow-up', shortDate: '', daysDiff: 9999 };
  }
  const [year, month, day] = parts;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(year, month - 1, day).getTime();
  const daysDiff = Math.round((startOfTarget - startOfToday) / 86400000);
  const shortDate = new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  if (daysDiff < 0) {
    return {
      status: 'overdue',
      label: 'Overdue',
      shortDate,
      daysDiff,
    };
  }
  if (daysDiff === 0) {
    return {
      status: 'today',
      label: 'Due Today',
      shortDate,
      daysDiff,
    };
  }
  return {
    status: 'upcoming',
    label: shortDate,
    shortDate,
    daysDiff,
  };
}

export interface IdleInfo {
  isIdle: boolean;
  daysIdle: number;
}

export function getIdleInfo(application: JobApplication): IdleInfo {
  if (application.stage === 'Offer') {
    return { isIdle: false, daysIdle: 0 };
  }
  const updated = new Date(application.updatedAt);
  if (Number.isNaN(updated.getTime())) {
    return { isIdle: false, daysIdle: 0 };
  }
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfUpdated = new Date(
    updated.getFullYear(),
    updated.getMonth(),
    updated.getDate()
  ).getTime();
  const daysIdle = Math.max(0, Math.round((startOfToday - startOfUpdated) / 86400000));
  return {
    isIdle: daysIdle >= IDLE_THRESHOLD_DAYS,
    daysIdle,
  };
}

export function formatPayRange(payMin: number, payMax: number): string {
  if (!payMin && !payMax) return 'Comp TBD';
  if (payMin && payMax && payMin !== payMax) {
    return `$${payMin}k – $${payMax}k`;
  }
  return `$${payMax || payMin}k`;
}

export function formatShortDateTime(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return (
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }) +
    ' · ' +
    date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  );
}

export function formatRelativeDay(iso: string): string {
  if (!iso) return '';
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return '';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();
  const diffDays = Math.round((startOfTarget - startOfToday) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays}d`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)}d ago`;
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
