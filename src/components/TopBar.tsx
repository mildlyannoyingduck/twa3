import { Moon, Shield, ShieldCheck, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { SUBJECT_META } from '../data/previewData';
import { SubjectId } from '../types';
import { haptics } from '../utils/haptics';

interface TopBarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  blockerActive: boolean;
  onOpenBlockerPreview: () => void;
  liveBannerText?: string | null;
  liveBannerSubject?: SubjectId | null;
  onOpenLiveBanner?: () => void;
}

export function TopBar({
  isDark,
  onToggleTheme,
  blockerActive,
  onOpenBlockerPreview,
  liveBannerText,
  liveBannerSubject,
  onOpenLiveBanner,
}: TopBarProps) {
  const subjMeta = liveBannerSubject ? SUBJECT_META[liveBannerSubject] : null;

  return (
    <header className="ios-glass-topbar sticky top-0 z-30 h-14 transition-colors duration-300">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-brand bg-gradient-to-r from-[#071F4D] via-blue-700 to-cyan-500 bg-clip-text text-[19px] font-bold tracking-tight text-transparent dark:from-white dark:via-sky-200 dark:to-cyan-300 whitespace-nowrap shrink-0">
            This Week
          </span>

          {liveBannerText && onOpenLiveBanner && (
            <button
              type="button"
              onClick={() => {
                haptics.tap();
                onOpenLiveBanner();
              }}
              className="hidden min-w-0 items-center gap-1.5 text-left text-xs font-medium text-[#0B234A]/80 transition-opacity hover:opacity-100 dark:text-sky-100/85 sm:inline-flex"
            >
              <span className="text-[#0B234A]/35 dark:text-sky-300/40">/</span>
              <span className={`truncate max-w-[220px] ${subjMeta ? subjMeta.text : ''}`}>
                {liveBannerText}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => {
              haptics.tap();
              onOpenBlockerPreview();
            }}
            className={`ios-glass inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
              blockerActive
                ? '!border-emerald-400/70 !bg-emerald-500/20 text-emerald-900 shadow-[0_0_20px_rgba(16,185,129,0.28)] dark:text-emerald-200'
                : 'text-[#07142B] dark:text-sky-50'
            }`}
          >
            {blockerActive ? (
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
            ) : (
              <Shield className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{blockerActive ? 'Lock On' : 'Phone Lock'}</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              haptics.tick();
              onToggleTheme();
            }}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to night mode'}
            className="ios-glass relative inline-flex h-[38px] w-[38px] items-center justify-center overflow-hidden rounded-full text-[#07142B] dark:text-sky-50"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isDark ? 'sun' : 'moon'}
                initial={{ opacity: 0, rotate: -70, scale: 0.65 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 70, scale: 0.65 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-center"
              >
                {isDark ? <Sun className="h-4 w-4 text-sky-200" /> : <Moon className="h-4 w-4" />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </header>
  );
}
