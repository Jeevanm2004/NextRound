/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import {
  AppScreen,
  InterviewRound,
  JobApplication,
  NextRoundStore,
  PipelineStage,
  ResumeVersion,
} from './types';
import {
  addDaysToLocalIso,
  getFollowUpInfo,
  loadStore,
  resetToSeedStore,
  saveStore,
} from './utils/storage';
import { TopBar } from './components/TopBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PipelineScreen } from './components/PipelineScreen';
import { ScheduleScreen } from './components/ScheduleScreen';
import { ResumesScreen } from './components/ResumesScreen';
import { AnalyticsScreen } from './components/AnalyticsScreen';
import { ApplicationDrawer } from './components/ApplicationDrawer';
import { AddApplicationModal } from './components/AddApplicationModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

export default function App() {
  const [store, setStore] = useState<NextRoundStore>(() => loadStore());
  const [activeScreen, setActiveScreen] = useState<AppScreen>('pipeline');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState<'details' | 'jd'>('details');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialStage, setAddModalInitialStage] =
    useState<PipelineStage>('Saved');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev.slice(-3), newToast]);

    const duration = toast.duration ?? 4500;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    saveStore(store);
  }, [store]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      // ⌘K or / to search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveScreen('pipeline');
        setTimeout(() => {
          const searchInput = document.getElementById('pipeline-search-input');
          searchInput?.focus();
        }, 50);
        return;
      }

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        setActiveScreen('pipeline');
        setTimeout(() => {
          const searchInput = document.getElementById('pipeline-search-input');
          searchInput?.focus();
        }, 50);
        return;
      }

      if (isInput) return;

      // ? for shortcuts help
      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // N for new role
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setAddModalInitialStage('Saved');
        setIsAddModalOpen(true);
        return;
      }

      // 1-4 for screen navigation
      if (e.key === '1') {
        setActiveScreen('pipeline');
      } else if (e.key === '2') {
        setActiveScreen('schedule');
      } else if (e.key === '3') {
        setActiveScreen('resumes');
      } else if (e.key === '4') {
        setActiveScreen('analytics');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedApplication = useMemo(
    () => store.applications.find((a) => a.id === selectedAppId) ?? null,
    [store.applications, selectedAppId]
  );

  const handleMoveStage = (id: string, nextStage: PipelineStage) => {
    const target = store.applications.find((a) => a.id === id);
    const prevStage = target?.stage;

    setStore((prev) => ({
      ...prev,
      applications: prev.applications.map((app) =>
        app.id === id
          ? {
              ...app,
              stage: nextStage,
              appliedAt:
                nextStage !== 'Saved' && !app.appliedAt
                  ? new Date().toISOString().slice(0, 10)
                  : app.appliedAt,
              updatedAt: new Date().toISOString(),
            }
          : app
      ),
    }));

    if (target && prevStage && prevStage !== nextStage) {
      addToast({
        title: `Moved ${target.company} to ${nextStage}`,
        description: target.role,
        type: 'success',
        action: {
          label: `Undo (Back to ${prevStage})`,
          onClick: () => {
            setStore((prev) => ({
              ...prev,
              applications: prev.applications.map((app) =>
                app.id === id ? { ...app, stage: prevStage } : app
              ),
            }));
          },
        },
      });
    }
  };

  const handleToggleStar = (id: string) => {
    let nextStarred = false;
    let companyName = '';
    setStore((prev) => ({
      ...prev,
      applications: prev.applications.map((app) => {
        if (app.id === id) {
          nextStarred = !app.starred;
          companyName = app.company;
          return { ...app, starred: nextStarred, updatedAt: new Date().toISOString() };
        }
        return app;
      }),
    }));
    addToast({
      title: nextStarred ? `Starred ${companyName}` : `Unstarred ${companyName}`,
      description: nextStarred ? 'Marked as priority role' : 'Removed from priority',
      type: 'info',
      duration: 2500,
    });
  };

  const handleLogFollowUp = (id: string) => {
    const target = store.applications.find((a) => a.id === id);
    const prevDate = target?.followUpDate;
    const nextDate = addDaysToLocalIso(4);
    const nowIso = new Date().toISOString();

    setStore((prev) => ({
      ...prev,
      applications: prev.applications.map((app) => {
        if (app.id !== id) return app;
        const fu = getFollowUpInfo(app.followUpDate);
        const shouldBumpDate =
          fu.status === 'today' || fu.status === 'overdue' || fu.status === 'none';
        return {
          ...app,
          updatedAt: nowIso,
          followUpDate: shouldBumpDate ? nextDate : app.followUpDate,
        };
      }),
    }));

    if (target) {
      addToast({
        title: `Logged touch for ${target.company}`,
        description: 'Next follow-up scheduled for 4 days out',
        type: 'info',
        action: prevDate
          ? {
              label: 'Undo',
              onClick: () => {
                setStore((prev) => ({
                  ...prev,
                  applications: prev.applications.map((app) =>
                    app.id === id ? { ...app, followUpDate: prevDate } : app
                  ),
                }));
              },
            }
          : undefined,
      });
    }
  };

  const handleUpdateApplication = (updated: JobApplication) => {
    setStore((prev) => ({
      ...prev,
      applications: prev.applications.map((app) =>
        app.id === updated.id ? updated : app
      ),
    }));
  };

  const handleDeleteApplication = (id: string) => {
    const target = store.applications.find((a) => a.id === id);
    setStore((prev) => ({
      ...prev,
      applications: prev.applications.filter((app) => app.id !== id),
    }));
    if (selectedAppId === id) setSelectedAppId(null);

    if (target) {
      addToast({
        title: `Deleted ${target.company}`,
        description: target.role,
        type: 'warning',
        action: {
          label: 'Undo delete',
          onClick: () => {
            setStore((prev) => ({
              ...prev,
              applications: [target, ...prev.applications],
            }));
          },
        },
      });
    }
  };

  const handleCreateApplication = (
    draft: Omit<JobApplication, 'id' | 'updatedAt'>
  ) => {
    const created: JobApplication = {
      ...draft,
      id: `app-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    setStore((prev) => ({
      ...prev,
      applications: [created, ...prev.applications],
    }));
    addToast({
      title: `Added ${created.role}`,
      description: `${created.company} (${created.stage})`,
      type: 'success',
    });
  };

  const handleAddRound = (
    appId: string,
    roundDraft: Omit<InterviewRound, 'id'>
  ): string => {
    const newId = `r-${Date.now()}`;
    setStore((prev) => ({
      ...prev,
      applications: prev.applications.map((app) =>
        app.id === appId
          ? {
              ...app,
              rounds: [...app.rounds, { ...roundDraft, id: newId }],
              updatedAt: new Date().toISOString(),
            }
          : app
      ),
    }));
    return newId;
  };

  const handleUpdateRound = (appId: string, updatedRound: InterviewRound) => {
    setStore((prev) => ({
      ...prev,
      applications: prev.applications.map((app) =>
        app.id === appId
          ? {
              ...app,
              rounds: app.rounds.map((r) =>
                r.id === updatedRound.id ? updatedRound : r
              ),
              updatedAt: new Date().toISOString(),
            }
          : app
      ),
    }));
  };

  const handleDeleteRound = (appId: string, roundId: string) => {
    setStore((prev) => ({
      ...prev,
      applications: prev.applications.map((app) =>
        app.id === appId
          ? {
              ...app,
              rounds: app.rounds.filter((r) => r.id !== roundId),
              updatedAt: new Date().toISOString(),
            }
          : app
      ),
    }));
  };

  const handleAddResume = (
    draft: Omit<ResumeVersion, 'id' | 'updatedAt'>
  ) => {
    const created: ResumeVersion = {
      ...draft,
      id: `res-${Date.now()}`,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    setStore((prev) => ({
      ...prev,
      resumes: [created, ...prev.resumes],
    }));
  };

  const handleUpdateResume = (updated: ResumeVersion) => {
    setStore((prev) => ({
      ...prev,
      resumes: prev.resumes.map((r) =>
        r.id === updated.id
          ? { ...updated, updatedAt: new Date().toISOString().slice(0, 10) }
          : r
      ),
    }));
  };

  const handleDeleteResume = (id: string) => {
    setStore((prev) => {
      const remaining = prev.resumes.filter((r) => r.id !== id);
      const fallbackId = remaining[0]?.id ?? '';
      return {
        resumes: remaining,
        applications: prev.applications.map((app) =>
          app.resumeVersionId === id
            ? { ...app, resumeVersionId: fallbackId }
            : app
        ),
      };
    });
  };

  const handleSetDefaultResume = (id: string) => {
    setStore((prev) => ({
      ...prev,
      resumes: prev.resumes.map((r) => ({ ...r, isDefault: r.id === id })),
    }));
  };

  const openAddRoleForStage = (stage: PipelineStage) => {
    setAddModalInitialStage(stage);
    setIsAddModalOpen(true);
  };

  const handleSelectScreen = (screen: AppScreen) => {
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] pb-18 md:pb-10">
      <TopBar
        activeScreen={activeScreen}
        onSelectScreen={handleSelectScreen}
        onAddRole={() => openAddRoleForStage('Saved')}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
      />

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
        {activeScreen === 'pipeline' && (
          <PipelineScreen
            applications={store.applications}
            resumes={store.resumes}
            onSelectApplication={(app, tab = 'details') => {
              setDrawerInitialTab(tab);
              setSelectedAppId(app.id);
            }}
            onMoveStage={handleMoveStage}
            onToggleStar={handleToggleStar}
            onLogFollowUp={handleLogFollowUp}
            onAddRoleForStage={openAddRoleForStage}
            onOpenSchedule={() => handleSelectScreen('schedule')}
          />
        )}

        {activeScreen === 'schedule' && (
          <ScheduleScreen
            applications={store.applications}
            resumes={store.resumes}
            onUpdateRound={handleUpdateRound}
            onAddRound={handleAddRound}
            onDeleteRound={handleDeleteRound}
            onOpenApplication={(app) => {
              setDrawerInitialTab('details');
              setSelectedAppId(app.id);
            }}
          />
        )}

        {activeScreen === 'resumes' && (
          <ResumesScreen
            resumes={store.resumes}
            applications={store.applications}
            onAddResume={handleAddResume}
            onUpdateResume={handleUpdateResume}
            onDeleteResume={handleDeleteResume}
            onSetDefaultResume={handleSetDefaultResume}
            onOpenApplication={(app) => {
              setDrawerInitialTab('details');
              setSelectedAppId(app.id);
            }}
          />
        )}

        {activeScreen === 'analytics' && (
          <AnalyticsScreen
            applications={store.applications}
            resumes={store.resumes}
            onOpenApplication={(app) => {
              setDrawerInitialTab('details');
              setSelectedAppId(app.id);
            }}
            onImportStore={(imported) => setStore(imported)}
            onResetSampleData={() => setStore(resetToSeedStore())}
          />
        )}
      </main>

      <MobileBottomNav
        activeScreen={activeScreen}
        onSelectScreen={handleSelectScreen}
      />

      <ApplicationDrawer
        application={selectedApplication}
        initialTab={drawerInitialTab}
        resumes={store.resumes}
        onClose={() => setSelectedAppId(null)}
        onUpdateApplication={handleUpdateApplication}
        onDeleteApplication={handleDeleteApplication}
        onLogFollowUp={handleLogFollowUp}
        onAddRound={handleAddRound}
        onUpdateRound={handleUpdateRound}
        onDeleteRound={handleDeleteRound}
      />

      <AddApplicationModal
        isOpen={isAddModalOpen}
        initialStage={addModalInitialStage}
        resumes={store.resumes}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={handleCreateApplication}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
