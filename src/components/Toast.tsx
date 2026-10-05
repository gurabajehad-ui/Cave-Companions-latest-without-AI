import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-11/12 max-w-md pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast, idx) => (
          <motion.div
            key={`toast-${toast.id || 't'}-${idx}`}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-900/95 text-emerald-50 border-emerald-700/60 shadow-emerald-950/20'
                : toast.type === 'error'
                ? 'bg-rose-900/95 text-rose-50 border-rose-700/60 shadow-rose-950/20'
                : toast.type === 'warning'
                ? 'bg-amber-950/95 text-amber-50 border-amber-600/70 shadow-amber-950/30'
                : 'bg-slate-900/95 text-slate-50 border-slate-700/60 shadow-slate-950/20'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-amber-400" />}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && <p className="font-semibold text-sm leading-tight">{toast.title}</p>}
              <p className="text-sm font-normal opacity-95 mt-0.5 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
