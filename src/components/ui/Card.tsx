import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

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
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
      className={`
        rounded-card-lg border border-app-border bg-app-card p-5 shadow-card
        transition-[border-color,box-shadow,transform] duration-200 motion-reduce:transition-none
        ${hover ? 'hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-card-hover motion-reduce:hover:translate-y-0' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}
