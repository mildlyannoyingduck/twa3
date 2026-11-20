import { Bell, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { CountdownView } from './components/CountdownView';
import { DayView } from './components/DayView';
import { FLUID_SPRING } from './components/FluidControls';
import { LockOverlayPreview } from './components/LockOverlayPreview';
import { PapersView } from './components/PapersView';
import { PlannerView } from './components/PlannerView';
import { ReviseLoopSheet } from './components/ReviseLoopSheet';
import { TimetableView } from './components/TimetableView';
import { TopBar } from './components/TopBar';
import { useScheduleEngine } from './hooks/useScheduleEngine';
import { syncNativeBlockerAndAlarms } from './native/thisWeekBridge';
import {
  DayCompletionLog,
  PaperEntry,
  RevisionStage,
  SlotSuggestion,
  StudyTask,
  SubjectId,
  TabId,
  TimetableSlot,
} from './types';
import { getCurrentWeekDays, getDayOfWeek, getTodayISO } from './utils/dateUtils';
import { haptics } from './utils/haptics';
import {
  loadDailyLogs,
  loadManualLockUntil,
  loadPapers,
  loadSlots,
  loadTasks,
  loadThemeDark,
  saveDailyLogs,
  saveManualLockUntil,
  savePapers,
  saveSlots,
  saveTasks,
  saveThemeDark,
} from './utils/storage';
import { formatDuration, getDurationMinutes, toMinutes } from './utils/timeUtils';

const TAB_ORDER: TabId[] = ['timetable', 'planner', 'day', 'papers', 'countdown'];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('day');
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right');
  const [dragOffsetX, setDragOffsetX] = useState<number>(0);
  const [isDark, setIsDark] = useState<boolean>(() => loadThemeDark());
  const [blockerModalOpen, setBlockerModalOpen] = useState<boolean>(false);

  const [slots, setSlots] = useState<TimetableSlot[]>(() => loadSlots());
  const [papers, setPapers] = useState<PaperEntry[]>(() => loadPapers());
  const [tasks, setTasks] = useState<StudyTask[]>(() => loadTasks());
  const [dailyLogs, setDailyLogs] = useState<Record<string, DayCompletionLog>>(() =>
    loadDailyLogs(),
  );
  const [manualLockUntil, setManualLockUntil] = useState<number>(() =>
    loadManualLockUntil(),
  );

  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [reviseLoopClassSlot, setReviseLoopClassSlot] = useState<TimetableSlot | null>(null);

  const handleSelectTab = (nextTab: TabId) => {
    if (nextTab === activeTab) return;
    const prevIdx = TAB_ORDER.indexOf(activeTab);
    const nextIdx = TAB_ORDER.indexOf(nextTab);
    setSlideDir(nextIdx >= prevIdx ? 'right' : 'left');
    setActiveTab(nextTab);
  };

  // Live Finger-Tracking Swipe Carousel across Planner / Day / Papers / Exam
  const swipeStartRef = useRef<{ x: number; y: number; lockedAxis: 'x' | 'y' | null } | null>(null);

  const handleTouchStart = (e: TouchEvent<HTMLElement>) => {
    if (activeTab === 'timetable' || e.touches.length !== 1) return;
    swipeStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      lockedAxis: null,
    };
  };

  const handleTouchMove = (e: TouchEvent<HTMLElement>) => {
    if (activeTab === 'timetable' || !swipeStartRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - swipeStartRef.current.x;
    const dy = e.touches[0].clientY - swipeStartRef.current.y;

    if (!swipeStartRef.current.lockedAxis) {
      if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        swipeStartRef.current.lockedAxis = 'x';
      } else if (Math.abs(dy) > 14) {
        swipeStartRef.current.lockedAxis = 'y';
      }
    }

    if (swipeStartRef.current.lockedAxis === 'x') {
      const currIdx = TAB_ORDER.indexOf(activeTab);
      const atLeftEdge = currIdx === 0 && dx > 0;
      const atRightEdge = currIdx === TAB_ORDER.length - 1 && dx < 0;
      const damped = atLeftEdge || atRightEdge ? dx * 0.24 : dx * 0.65;
      setDragOffsetX(Math.max(-130, Math.min(130, damped)));
    }
  };

  const handleTouchEnd = (e: TouchEvent<HTMLElement>) => {
    if (activeTab === 'timetable' || !swipeStartRef.current || e.changedTouches.length !== 1) {
      swipeStartRef.current = null;
      setDragOffsetX(0);
      return;
    }

    const dx = e.changedTouches[0].clientX - swipeStartRef.current.x;
    const wasHorizontal = swipeStartRef.current.lockedAxis === 'x';
    swipeStartRef.current = null;
    setDragOffsetX(0);

    if (wasHorizontal && Math.abs(dx) > 56) {
      const currIdx = TAB_ORDER.indexOf(activeTab);
      if (dx < 0 && currIdx < TAB_ORDER.length - 1) {
        haptics.tick();
        handleSelectTab(TAB_ORDER[currIdx + 1]);
      } else if (dx > 0 && currIdx > 0) {
        haptics.tick();
        handleSelectTab(TAB_ORDER[currIdx - 1]);
      }
    }
  };

  const clearExpiredManualLock = useCallback(() => {
    setManualLockUntil(0);
    saveManualLockUntil(0);
  }, []);

  const { now, activeLock, reminderToast, dismissReminderToast } = useScheduleEngine(
    slots,
    manualLockUntil,
    clearExpiredManualLock,
  );

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveThemeDark(isDark);
  }, [isDark]);

  useEffect(() => {
    saveSlots(slots);
    syncNativeBlockerAndAlarms(slots, manualLockUntil);
  }, [slots, manualLockUntil]);

  useEffect(() => {
    savePapers(papers);
  }, [papers]);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveDailyLogs(dailyLogs);
  }, [dailyLogs]);

  const liveBanner = useMemo((): { text: string; subject: SubjectId } | null => {
    const todayDow = getDayOfWeek(now);
    const currMin = now.getHours() * 60 + now.getMinutes();
    const todaySlots = slots
      .filter((s) => s.day === todayDow)
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    const running = todaySlots.find((s) => {
      const start = toMinutes(s.startTime);
      const end = s.endTime === '00:00' && start > 0 ? 1440 : toMinutes(s.endTime);
      return currMin >= start && currMin < end;
    });

    if (running) {
      const start = toMinutes(running.startTime);
      const end = running.endTime === '00:00' && start > 0 ? 1440 : toMinutes(running.endTime);
      return {
        text: `${running.title} · ${formatDuration(end - currMin)} left`,
        subject: running.subject,
      };
    }

    const upcoming = todaySlots.find((s) => toMinutes(s.startTime) > currMin);
    if (upcoming) {
      const diff = toMinutes(upcoming.startTime) - currMin;
      return {
        text: `Next: ${upcoming.title} in ${formatDuration(diff)}`,
        subject: upcoming.subject,
      };
    }
    return null;
  }, [slots, now]);

  const recalcDayLog = (
    prev: Record<string, DayCompletionLog>,
    dateISO: string,
    nextCompletedIds: string[],
    nextIncompleteIds: string[],
    nextLoggedMap: Record<string, number>,
  ): Record<string, DayCompletionLog> => {
    const [y, m, d] = dateISO.split('-').map(Number);
    const dow = getDayOfWeek(new Date(y, m - 1, d));
    const daySlots = slots.filter((s) => s.day === dow);

    const plannedMinutes = daySlots.reduce(
      (acc, s) => acc + getDurationMinutes(s.startTime, s.endTime),
      0,
    );
    const completedMinutes = daySlots.reduce((acc, s) => {
      if (nextCompletedIds.includes(s.id)) {
        return acc + getDurationMinutes(s.startTime, s.endTime);
      }
      if (nextIncompleteIds.includes(s.id) && nextLoggedMap[s.id]) {
        return acc + nextLoggedMap[s.id];
      }
      return acc;
    }, 0);

    return {
      ...prev,
      [dateISO]: {
        dateISO,
        completedSlotIds: nextCompletedIds,
        incompleteSlotIds: nextIncompleteIds,
        loggedMinutesBySlot: nextLoggedMap,
        plannedMinutes,
        completedMinutes,
        tasksTotal: daySlots.length,
        tasksDone: daySlots.filter((s) => nextCompletedIds.includes(s.id)).length,
      },
    };
  };

  const handleToggleSlotComplete = (dateISO: string, slotId: string) => {
    setDailyLogs((prev) => {
      const cur = prev[dateISO];
      const existingCompleted = cur?.completedSlotIds ?? [];
      const existingIncomplete = cur?.incompleteSlotIds ?? [];
      const existingLoggedMap = { ...(cur?.loggedMinutesBySlot ?? {}) };

      const isRemoving = existingCompleted.includes(slotId);
      const nextCompleted = isRemoving
        ? existingCompleted.filter((id) => id !== slotId)
        : [...existingCompleted, slotId];
      const nextIncomplete = existingIncomplete.filter((id) => id !== slotId);
      if (!isRemoving) {
        delete existingLoggedMap[slotId];
      }

      return recalcDayLog(prev, dateISO, nextCompleted, nextIncomplete, existingLoggedMap);
    });
  };

  const handleMarkSlotIncomplete = (
    dateISO: string,
    slotId: string,
    partialMinutes: number,
  ) => {
    setDailyLogs((prev) => {
      const cur = prev[dateISO];
      const nextCompleted = (cur?.completedSlotIds ?? []).filter((id) => id !== slotId);
      const existingIncomplete = cur?.incompleteSlotIds ?? [];
      const nextIncomplete = existingIncomplete.includes(slotId)
        ? existingIncomplete
        : [...existingIncomplete, slotId];
      const nextLoggedMap = {
        ...(cur?.loggedMinutesBySlot ?? {}),
        [slotId]: Math.max(0, partialMinutes),
      };

      return recalcDayLog(prev, dateISO, nextCompleted, nextIncomplete, nextLoggedMap);
    });
  };

  const resolveDateISOForSlotDay = (day: TimetableSlot['day']): string => {
    const week = getCurrentWeekDays(new Date());
    return week.find((w) => w.day === day)?.dateISO ?? getTodayISO();
  };

  const handleAddSlot = (newSlot: TimetableSlot, triggerReviseLoop?: boolean) => {
    setSlots((prev) => [...prev, newSlot]);
    if (triggerReviseLoop && newSlot.category === 'class') {
      setReviseLoopClassSlot(newSlot);
    }
  };

  const handleUpdateSlot = (updatedSlot: TimetableSlot) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === updatedSlot.id ? updatedSlot : slot)),
    );
  };

  const handleDeleteSlot = (slotId: string) => {
    setSlots((prev) => prev.filter((slot) => slot.id !== slotId));
  };

  const handleApproveReviseLoop = (
    classSlot: TimetableSlot,
    stages: Record<RevisionStage, SlotSuggestion>,
  ) => {
    const existingLoop = tasks.find(
      (t) => t.kind === 'revision-loop' && t.sourceClassSlotId === classSlot.id,
    );
    const loopTaskId = existingLoop?.id ?? `task-loop-${Date.now()}`;

    const stageLabels: Record<RevisionStage, string> = {
      r1: 'Quick Revise (R1)',
      r2: 'Deep Revise (R2 · +3d)',
      r3: 'Pre-Class Warm-Up (R3)',
    };

    const newReviseSlots: TimetableSlot[] = (['r1', 'r2', 'r3'] as RevisionStage[]).map(
      (stage, idx) => {
        const sug = stages[stage];
        return {
          id: `slot-rev-${classSlot.id}-${stage}-${Date.now() + idx}`,
          day: sug.day,
          startTime: sug.startTime,
          endTime: sug.endTime,
          category: 'self-study',
          subject: classSlot.subject,
          title: `${classSlot.title}`,
          subtitle: stageLabels[stage],
          autoBlock: sug.autoBlock,
          mode: 'online',
          travelBeforeMins: 0,
          travelAfterMins: 0,
          linkedTaskId: loopTaskId,
          revisionStage: stage,
          sourceClassSlotId: classSlot.id,
        };
      },
    );

    setSlots((prev) => [
      ...prev.filter((s) => !(s.sourceClassSlotId === classSlot.id && s.revisionStage)),
      ...newReviseSlots,
    ]);

    if (!existingLoop) {
      const loopTask: StudyTask = {
        id: loopTaskId,
        title: `${classSlot.title} · 3-Step Revise`,
        subject: classSlot.subject,
        kind: 'revision-loop',
        sourceClassSlotId: classSlot.id,
        defaultSessionMins: 30,
        checklist: [
          { id: `chk-r1-${Date.now()}`, text: 'R1 · Quick recall after class (30m)', done: false },
          { id: `chk-r2-${Date.now() + 1}`, text: 'R2 · Deep revision 3 days later (1h)', done: false },
          { id: `chk-r3-${Date.now() + 2}`, text: 'R3 · Pre-class warm-up day before (30m)', done: false },
        ],
        notes: `Linked to ${classSlot.day} ${classSlot.title}`,
        status: 'active',
        order: tasks.length,
        createdAtISO: getTodayISO(),
        autoBlockDefault: classSlot.autoBlock,
      };
      setTasks((prev) => [...prev, loopTask]);
    }

    setReviseLoopClassSlot(null);
  };

  const handleAddTask = (task: StudyTask) => {
    setTasks((prev) => [...prev, task]);
  };

  const handleUpdateTask = (updated: StudyTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSlots((prev) => prev.filter((s) => s.linkedTaskId !== taskId));
  };

  const handleReorderTasks = (orderedIds: string[]) => {
    setTasks((prev) =>
      prev.map((t) => {
        const nextOrder = orderedIds.indexOf(t.id);
        return nextOrder >= 0 ? { ...t, order: nextOrder } : t;
      }),
    );
  };

  const handleApproveSuggestedSlot = (task: StudyTask, sug: SlotSuggestion) => {
    const newSlot: TimetableSlot = {
      id: `slot-task-${Date.now()}`,
      day: sug.day,
      startTime: sug.startTime,
      endTime: sug.endTime,
      category: 'self-study',
      subject: task.subject,
      title: task.title,
      subtitle: sug.reason,
      autoBlock: sug.autoBlock,
      mode: 'online',
      travelBeforeMins: 0,
      travelAfterMins: 0,
      linkedTaskId: task.id,
      revisionStage: sug.revisionStage,
    };
    setSlots((prev) => [...prev, newSlot]);
  };

  const handleAddPaper = (entry: PaperEntry) => {
    setPapers((prev) => [...prev, entry]);
  };

  const handleUpdatePaper = (updated: PaperEntry) => {
    setPapers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeletePaper = (paperId: string) => {
    setPapers((prev) => prev.filter((p) => p.id !== paperId));
  };

  const handleStartManualLock = (durationMinutes: number) => {
    const untilMs = Date.now() + durationMinutes * 60 * 1000;
    setManualLockUntil(untilMs);
    saveManualLockUntil(untilMs);
    syncNativeBlockerAndAlarms(slots, untilMs);
  };

  const openPlannerTask = (taskId: string) => {
    setFocusedTaskId(taskId);
    handleSelectTab('planner');
  };

  const tabEnterInitial = {
    opacity: 0.45,
    x: slideDir === 'right' ? 28 : -28,
    scale: 0.985,
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#CFE3FF] text-[#07142B] transition-colors duration-300 dark:bg-[#02071A] dark:text-white">
      {/* Subtle Architectural Spatial Grid behind glass cards so refraction & depth pop */}
      <div
        aria-hidden="true"
        className="arctic-grid-bg pointer-events-none fixed inset-0 opacity-75"
      />

      {/* Arctic Prism Refractive Aurora Backdrop */}
      <div
        aria-hidden="true"
        className="animate-orb-a pointer-events-none fixed -left-24 -top-24 h-[540px] w-[540px] rounded-full opacity-95"
        style={{
          background:
            'radial-gradient(circle, rgba(37,99,235,0.58) 0%, rgba(56,189,248,0.3) 44%, rgba(59,130,246,0) 72%)',
        }}
      />
      <div
        aria-hidden="true"
        className="animate-orb-b pointer-events-none fixed right-[-90px] top-[12%] h-[490px] w-[490px] rounded-full opacity-90"
        style={{
          background:
            'radial-gradient(circle, rgba(34,211,238,0.46) 0%, rgba(16,185,129,0.22) 48%, rgba(16,185,129,0) 72%)',
        }}
      />
      <div
        aria-hidden="true"
        className="animate-orb-a pointer-events-none fixed bottom-[-90px] left-[14%] h-[440px] w-[440px] rounded-full opacity-85"
        style={{
          background:
            'radial-gradient(circle, rgba(29,78,216,0.44) 0%, rgba(249,115,22,0.16) 46%, rgba(249,115,22,0) 74%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-65 dark:opacity-55"
        style={{
          background:
            'linear-gradient(125deg, rgba(255,255,255,0.24) 0%, rgba(56,189,248,0.14) 38%, rgba(255,255,255,0) 68%, rgba(59,130,246,0.14) 100%)',
        }}
      />

      <div className="relative z-10">
        <TopBar
          isDark={isDark}
          onToggleTheme={() => setIsDark((prev) => !prev)}
          blockerActive={activeLock.active}
          onOpenBlockerPreview={() => setBlockerModalOpen(true)}
          liveBannerText={liveBanner?.text ?? null}
          liveBannerSubject={liveBanner?.subject ?? null}
          onOpenLiveBanner={() => handleSelectTab('day')}
        />

        {/* Floating 10-Min Pre-Slot Alert Toast */}
        <AnimatePresence>
          {reminderToast && (
            <motion.div
              initial={{ opacity: 0, y: -14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.96 }}
              transition={FLUID_SPRING}
              className="mx-auto mt-2 max-w-md px-4"
            >
              <div className="ios-glass-strong flex items-center justify-between gap-3 rounded-full px-4 py-2.5 text-xs">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Bell className="h-4 w-4 shrink-0 text-blue-600 dark:text-sky-300" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#07142B] dark:text-white">
                      {reminderToast.title}
                    </p>
                    <p className="truncate text-[11px] text-[#0B234A]/70 dark:text-sky-200/75">
                      {reminderToast.subtitle} · {reminderToast.startTime}
                    </p>
                  </div>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.85 }}
                  onClick={dismissReminderToast}
                  aria-label="Dismiss reminder"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#07142B] dark:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.main
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          animate={{
            x: dragOffsetX,
            scale: dragOffsetX === 0 ? 1 : 1 - Math.min(0.03, Math.abs(dragOffsetX) / 3600),
          }}
          transition={dragOffsetX !== 0 ? { duration: 0 } : FLUID_SPRING}
        >
          {activeTab === 'timetable' && (
            <motion.div
              key="view-timetable"
              initial={tabEnterInitial}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={FLUID_SPRING}
            >
              <TimetableView
                slots={slots}
                onAddSlot={handleAddSlot}
                onUpdateSlot={handleUpdateSlot}
                onDeleteSlot={handleDeleteSlot}
                onOpenReviseLoop={(clsSlot) => setReviseLoopClassSlot(clsSlot)}
                onOpenPlannerForTask={openPlannerTask}
              />
            </motion.div>
          )}

          {activeTab === 'planner' && (
            <motion.div
              key="view-planner"
              initial={tabEnterInitial}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={FLUID_SPRING}
            >
              <PlannerView
                tasks={tasks}
                slots={slots}
                dailyLogs={dailyLogs}
                focusedTaskId={focusedTaskId}
                onClearFocusedTask={() => setFocusedTaskId(null)}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onReorderTasks={handleReorderTasks}
                onApproveSuggestedSlot={handleApproveSuggestedSlot}
                onToggleLinkedSlotComplete={(slot) =>
                  handleToggleSlotComplete(resolveDateISOForSlotDay(slot.day), slot.id)
                }
                onMarkLinkedSlotIncomplete={(slot, partialMins) =>
                  handleMarkSlotIncomplete(resolveDateISOForSlotDay(slot.day), slot.id, partialMins)
                }
                onDeleteLinkedSlot={handleDeleteSlot}
              />
            </motion.div>
          )}

          {activeTab === 'day' && (
            <motion.div
              key="view-day"
              initial={tabEnterInitial}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={FLUID_SPRING}
            >
              <DayView
                slots={slots}
                tasks={tasks}
                dailyLogs={dailyLogs}
                activeLock={activeLock}
                onToggleSlotComplete={handleToggleSlotComplete}
                onMarkSlotIncomplete={handleMarkSlotIncomplete}
                onOpenBlockerPreview={() => setBlockerModalOpen(true)}
                onGoToTimetable={() => handleSelectTab('timetable')}
                onOpenPlannerForTask={openPlannerTask}
              />
            </motion.div>
          )}

          {activeTab === 'papers' && (
            <motion.div
              key="view-papers"
              initial={tabEnterInitial}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={FLUID_SPRING}
            >
              <PapersView
                papers={papers}
                onAddPaper={handleAddPaper}
                onUpdatePaper={handleUpdatePaper}
                onDeletePaper={handleDeletePaper}
                isDark={isDark}
              />
            </motion.div>
          )}

          {activeTab === 'countdown' && (
            <motion.div
              key="view-countdown"
              initial={tabEnterInitial}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={FLUID_SPRING}
            >
              <CountdownView
                activeLock={activeLock}
                onOpenBlockerPreview={() => setBlockerModalOpen(true)}
              />
            </motion.div>
          )}
        </motion.main>

        <BottomNav activeTab={activeTab} onSelectTab={handleSelectTab} />

        <LockOverlayPreview
          open={blockerModalOpen}
          activeLock={activeLock}
          onStartManualLock={handleStartManualLock}
          onClose={() => setBlockerModalOpen(false)}
        />

        <ReviseLoopSheet
          open={reviseLoopClassSlot !== null}
          classSlot={reviseLoopClassSlot}
          allSlots={slots}
          onApproveLoop={handleApproveReviseLoop}
          onClose={() => setReviseLoopClassSlot(null)}
        />
      </div>
    </div>
  );
}
