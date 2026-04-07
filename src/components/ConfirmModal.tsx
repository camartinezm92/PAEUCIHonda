import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-red-600 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {title}
          </h3>
          <button onClick={onCancel} className="text-red-200 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-slate-700">{message}</p>
          <div className="pt-4 flex justify-end gap-3">
            <button 
              onClick={onCancel}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Sí, eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
