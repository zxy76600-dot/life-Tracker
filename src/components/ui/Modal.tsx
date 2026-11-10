import { type ReactNode, useEffect, useId } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Modal — Overlay dialog with true black dark theme support.
 */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const titleId = useId();
  const shouldReduceMotion = useReducedMotion();
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
            className="fixed inset-0 z-40 bg-neutral-950/45 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal content */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98, y: 12 }}
            transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
          >
            <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-card-lg border border-app-border bg-app-card shadow-card-hover">
              {/* Header */}
              <div className="sticky top-0 flex items-center justify-between border-b border-app-border bg-app-card px-5 py-4 sm:px-6">
                <h2 id={titleId} className="text-lg font-bold tracking-tight text-app-ink">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-2 text-app-subtle transition-colors motion-reduce:transition-none hover:bg-app-muted hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-5 sm:px-6">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
