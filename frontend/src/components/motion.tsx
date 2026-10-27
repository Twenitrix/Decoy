import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  Variants,
  useReducedMotion,
  animate
} from 'framer-motion';

export { motion, AnimatePresence, useReducedMotion };

export const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.065,
      delayChildren: 0.03,
    },
  },
};

export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.44,
      ease: EASE_OUT_EXPO,
    },
  },
};

export const scaleInItem: Variants = {
  hidden: { opacity: 0, scale: 0.975, y: 10 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: EASE_OUT_EXPO,
    },
  },
};

export const tableRowVariant: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: EASE_OUT_EXPO,
    },
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: { duration: 0.18 },
  },
};

export const modalBackdropVariant: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.16 } },
};

export const modalPanelVariant: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 14 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 380,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.16 },
  },
};

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

/**
 * Animates numerical changes ONLY when the underlying `value` prop actually changes.
 * Respects `prefers-reduced-motion`.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 0,
  suffix = '',
  prefix = '',
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const prevValueRef = useRef<number>(value);
  const [displayValue, setDisplayValue] = useState<number>(value);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const safeNext = Number.isFinite(value) ? value : 0;
    const prev = Number.isFinite(prevValueRef.current) ? prevValueRef.current : 0;

    if (prefersReducedMotion || prev === safeNext) {
      setDisplayValue(safeNext);
      prevValueRef.current = safeNext;
      return;
    }

    setIsUpdating(true);
    const controls = animate(prev, safeNext, {
      duration: 0.55,
      ease: EASE_OUT_EXPO,
      onUpdate: (latest) => {
        setDisplayValue(latest);
      },
      onComplete: () => {
        setDisplayValue(safeNext);
        setIsUpdating(false);
      },
    });

    prevValueRef.current = safeNext;
    return () => controls.stop();
  }, [value, prefersReducedMotion]);

  const formatted =
    decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toLocaleString();

  return (
    <motion.span
      animate={isUpdating ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{ duration: 0.35 }}
      className={`inline-block tabular-nums ${className}`}
    >
      {prefix}
      {formatted}
      {suffix}
    </motion.span>
  );
};

export const MotionPage: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
};
