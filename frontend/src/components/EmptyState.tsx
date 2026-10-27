import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { motion, scaleInItem } from './motion';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
}) => {
  return (
    <motion.div
      variants={scaleInItem}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center p-14 text-center rounded-[28px] surface-elevated"
    >
      <div className="p-4 rounded-2xl bg-[#18181E] border border-[#272730] text-[#FF5A36] mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="font-display text-base font-bold text-[#F4F1EA] mb-1.5">{title}</h3>
      {description && (
        <p className="text-xs text-[#A1A1AA] max-w-md mb-5 leading-relaxed">{description}</p>
      )}
      {action && <div>{action}</div>}
    </motion.div>
  );
};
