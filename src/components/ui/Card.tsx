import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

/**
 * Card — A reusable container with adaptive true black / white theme styling.
 * 
 * Props:
 * - children: Content inside the card
 * - className: Additional CSS classes
 * - hover: Whether to show hover effect (default: false)
 */
interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-sm
        dark:border-neutral-800/90 dark:bg-neutral-900/90 dark:shadow-none
        backdrop-blur-sm transition-all duration-200
        ${hover ? 'hover:border-neutral-300 hover:shadow-md dark:hover:border-neutral-700 dark:hover:bg-neutral-900' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}
