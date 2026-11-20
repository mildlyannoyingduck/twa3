import { AnimatePresence, motion } from 'motion/react';
import { ReactNode } from 'react';
import { haptics } from '../utils/haptics';

export const FLUID_SPRING = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 32,
  mass: 0.62,
};

export const LIQUID_LENS_SPRING = {
  type: 'spring' as const,
  stiffness: 450,
  damping: 27,
  mass: 0.68,
};

export const SHEET_SPRING = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 33,
  mass: 0.72,
};

interface LiquidSwitchProps {
  checked: boolean;
  onToggle: () => void;
  ariaLabel?: string;
  activeColorClass?: string;
}

/**
 * Elastic Mercury Toggle Switch: thumb stretches organically mid-travel and settles with a spring.
 */
export function LiquidSwitch({
  checked,
  onToggle,
  ariaLabel,
  activeColorClass = 'bg-blue-600 shadow-[0_0_16px_rgba(37,99,235,0.45)] dark:bg-sky-400 dark:shadow-[0_0_18px_rgba(56,189,248,0.5)]',
}: LiquidSwitchProps) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      whileTap={{ scale: 0.92 }}
      onClick={() => {
        haptics.tick();
        onToggle();
      }}
      className={`relative flex h-7 w-[52px] shrink-0 items-center rounded-full border p-1 transition-colors duration-250 ${
        checked
          ? `border-white/75 ${activeColorClass}`
          : 'border-white/55 bg-blue-400/18 dark:border-sky-300/25 dark:bg-sky-400/15'
      }`}
    >
      <motion.span
        layout
        transition={{
          type: 'spring',
          stiffness: 620,
          damping: 28,
          mass: 0.55,
        }}
        animate={{
          x: checked ? 22 : 0,
          scaleX: checked ? [1, 1.28, 1] : [1, 1.28, 1],
        }}
        className="relative h-5 w-5 rounded-full bg-white shadow-[0_2px_8px_rgba(7,20,43,0.28),inset_0_-1px_1px_rgba(59,130,246,0.22)]"
      >
        <span className="absolute left-1 top-1 h-1.5 w-2 rounded-full bg-sky-100/90" />
      </motion.span>
    </motion.button>
  );
}

interface CrystalSheetProps {
  open: boolean;
  onClose: () => void;
  zIndexClass?: string;
  maxWidthClass?: string;
  children: ReactNode;
}

/**
 * Arctic Prism Frosted Crystal Modal / Bottom Sheet:
 * - Full AnimatePresence enter & exit spring motion
 * - Thumb drag-down-to-dismiss gesture on mobile
 * - Single-pass crystal blur for 60fps Android WebView performance
 */
export function CrystalSheet({
  open,
  onClose,
  zIndexClass = 'z-50',
  maxWidthClass = 'max-w-lg',
  children,
}: CrystalSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="crystal-sheet-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={`fixed inset-0 ${zIndexClass} flex items-end justify-center bg-[#061A4A]/26 sm:items-center sm:p-4 dark:bg-[#01061A]/54`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              haptics.tick();
              onClose();
            }
          }}
        >
          <motion.div
            key="crystal-sheet-panel"
            initial={{ opacity: 0, y: 42, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 48, scale: 0.96 }}
            transition={SHEET_SPRING}
            drag="y"
            dragConstraints={{ top: 0, bottom: 260 }}
            dragElastic={{ top: 0.04, bottom: 0.32 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 88 || info.velocity.y > 420) {
                haptics.tick();
                onClose();
              }
            }}
            className={`ios-glass-modal max-h-[92vh] w-full ${maxWidthClass} overflow-y-auto rounded-t-[38px] p-5 text-[#07142B] dark:text-white sm:rounded-[38px] sm:p-6`}
          >
            <div className="mx-auto mb-3.5 h-1.5 w-11 cursor-grab rounded-full bg-white/75 shadow-[0_1px_4px_rgba(37,99,235,0.2)] active:cursor-grabbing dark:bg-sky-200/45 sm:hidden" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
