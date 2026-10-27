import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import {
  motion,
  AnimatePresence,
  modalBackdropVariant,
  modalPanelVariant
} from './motion';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={modalBackdropVariant}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            variants={modalPanelVariant}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="surface-elevated rounded-3xl max-w-md w-full p-7 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border ${
                    isDestructive
                      ? 'bg-[#F43F5E]/15 border-[#F43F5E]/40 text-[#F43F5E]'
                      : 'bg-[#FF5A36]/15 border-[#FF5A36]/35 text-[#FF5A36]'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-display text-base font-bold text-[#F4F1EA]">{title}</h3>
              </div>
              <button
                onClick={onCancel}
                className="text-[#A1A1AA] hover:text-[#F4F1EA] transition-colors p-1 rounded-lg hover:bg-[#18181E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#A1A1AA] mb-6 leading-relaxed pl-1">{message}</p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#272730]">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F1EA] hover:bg-[#18181E] rounded-xl transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`px-5 py-2 text-xs font-bold rounded-full transition-all shadow-md ${
                  isDestructive
                    ? 'bg-[#F43F5E] hover:bg-[#e11d48] text-white'
                    : 'bg-[#FF5A36] hover:bg-[#ff6b4a] text-[#09090B]'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
