import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type?: 'dictionary' | 'users';
}

export default function AuthModal({ isOpen, onClose, onSuccess, type = 'dictionary' }: AuthModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let isValid = false;
    if (type === 'users') {
      isValid = username === 'adminadminpae' && password === 'adminadminpae';
    } else {
      isValid = username === 'adminpae' && password === 'adminpae';
    }

    if (isValid) {
      setError('');
      setUsername('');
      setPassword('');
      onSuccess();
    } else {
      setError('Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Autenticación Requerida
          </h3>
          <button onClick={onClose} className="text-slate-300 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
            <input 
              type="text" 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Ingresar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
