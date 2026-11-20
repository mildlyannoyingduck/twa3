import { CalendarRange, CheckCircle2, FileBarChart2, Hourglass, Layers } from 'lucide-react';
import { motion } from 'motion/react';
import { TabId } from '../types';
import { haptics } from '../utils/haptics';
import { LIQUID_LENS_SPRING } from './FluidControls';

interface BottomNavProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
}

const NAV_ITEMS: { id: TabId; label: string; icon: typeof CalendarRange }[] = [
  { id: 'timetable', label: 'Timetable', icon: CalendarRange },
  { id: 'planner', label: 'Planner', icon: Layers },
  { id: 'day', label: 'Day', icon: CheckCircle2 },
  { id: 'papers', label: 'Papers', icon: FileBarChart2 },
  { id: 'countdown', label: 'Exam', icon: Hourglass },
];

export function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  return (
    <div className="pointer-events-none fixed bottom-3 left-0 right-0 z-40 px-3 sm:px-4">
      <nav
        aria-label="Primary navigation"
        className="ios-glass-strong pointer-events-auto relative mx-auto grid h-[64px] max-w-lg grid-cols-5 items-center gap-0.5 rounded-full p-1.5"
      >
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <motion.button
              key={id}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                haptics.tick();
                onSelectTab(id);
              }}
              className={`relative flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-1 transition-colors duration-200 ${
                isActive
                  ? 'text-[#052052] dark:text-white'
                  : 'text-[#0B2B66]/65 hover:text-[#052052] dark:text-sky-200/70 dark:hover:text-white'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="activeDockLens"
                  transition={LIQUID_LENS_SPRING}
                  className="absolute inset-0 overflow-hidden rounded-full border border-white/90 bg-gradient-to-b from-white/75 via-sky-100/35 to-blue-200/20 shadow-[0_8px_22px_rgba(37,99,235,0.22),inset_0_1.5px_0_rgba(255,255,255,1),inset_0_-1px_2px_rgba(56,189,248,0.25)] dark:border-sky-200/45 dark:from-sky-300/26 dark:via-blue-500/14 dark:to-cyan-400/12 dark:shadow-[0_8px_24px_rgba(56,189,248,0.34),inset_0_1.5px_0_rgba(255,255,255,0.52)]"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-3 left-1/4 right-1/4 h-4 rounded-full bg-white/80 blur-sm dark:bg-cyan-200/40"
                  />
                </motion.span>
              )}

              <motion.span
                animate={{
                  y: isActive ? -2 : 0,
                  scale: isActive ? 1.15 : 0.96,
                }}
                transition={LIQUID_LENS_SPRING}
                className="relative z-10 flex items-center justify-center"
              >
                <Icon
                  className={`h-[17px] w-[17px] transition-colors duration-200 ${
                    isActive
                      ? 'stroke-[2.3] text-blue-700 dark:text-cyan-200'
                      : 'stroke-[1.7]'
                  }`}
                />
              </motion.span>

              <span
                className={`relative z-10 max-w-full truncate text-[9.5px] tracking-tight whitespace-nowrap transition-all duration-200 ${
                  isActive ? 'font-semibold opacity-100' : 'font-medium opacity-80'
                }`}
              >
                {label}
              </span>

              {isActive && (
                <motion.span
                  layoutId="activeDockGlowBeam"
                  transition={LIQUID_LENS_SPRING}
                  className="relative z-10 mt-0.5 h-[2.5px] w-4 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.85)] dark:bg-cyan-300 dark:shadow-[0_0_10px_rgba(103,232,249,0.95)]"
                />
              )}
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
