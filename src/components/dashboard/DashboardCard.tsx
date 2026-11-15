import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useThemeStore } from '../../stores/themeStore';

export function DashboardCard({ children, className = '', label }: { children: ReactNode; className?: string; label?: string }) {
  const systemReduceMotion = useReducedMotion();
  const settingReduceMotion = useThemeStore((state) => state.reduceMotion);
  const reduceMotion = systemReduceMotion || settingReduceMotion;

  return (
    <motion.section
      aria-label={label}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
      className={`min-w-0 rounded-card-lg border border-app-border bg-app-card p-4 shadow-card transition-colors duration-200 motion-reduce:transition-none sm:p-5 ${className}`}
    >
      {children}
    </motion.section>
  );
}
