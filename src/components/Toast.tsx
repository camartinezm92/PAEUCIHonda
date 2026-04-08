import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border w-fit min-w-[280px] ${
        type === 'success' 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
          : 'bg-red-50 border-red-200 text-red-800'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle className="w-5 h-5 text-emerald-600" />
      ) : (
        <XCircle className="w-5 h-5 text-red-600" />
      )}
      <p className="font-medium text-sm">{message}</p>
      <button 
        onClick={onClose}
        className="ml-2 p-1 hover:bg-black/5 rounded-full transition-colors"
      >
        <X className="w-4 h-4 opacity-50" />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: { id: string; message: string; type: ToastType }[];
  removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed bottom-0 right-0 p-6 space-y-4 pointer-events-none z-[100]">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
