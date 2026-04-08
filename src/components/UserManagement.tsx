import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, auth } from '../firebase';
import { UserProfile } from '../types';
import { Users, UserPlus, Shield, Trash2, Mail, User as UserIcon, Search, AlertCircle } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

interface UserManagementProps {
  onBack: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function UserManagement({ onBack, showToast }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: 'viewer' as UserProfile['role']
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const loadedUsers: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        loadedUsers.push(docSnap.data() as UserProfile);
      });
      setUsers(loadedUsers);
      setLoading(false);
    }, (error) => {
      console.error("Error loading users:", error);
      showToast("Error al cargar usuarios", "error");
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [showToast]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.displayName) return;

    try {
      // Note: In a real app, we'd use a Cloud Function to create the auth user too.
      // Here we just create the profile. The user will still need to sign in with Google.
      // If their email matches this profile, they get the role.
      
      const userRef = doc(db, 'users', newUser.email.toLowerCase());
      await setDoc(userRef, {
        uid: '', // Will be filled when they first sign in if we implement that logic, or we use email as key
        email: newUser.email.toLowerCase(),
        displayName: newUser.displayName,
        role: newUser.role,
        createdAt: new Date().toISOString()
      });

      showToast("Usuario autorizado correctamente", "success");
      setIsAdding(false);
      setNewUser({ email: '', displayName: '', role: 'viewer' });
    } catch (error) {
      console.error("Error adding user:", error);
      showToast("Error al autorizar usuario", "error");
      handleFirestoreError(error, OperationType.WRITE, `users/${newUser.email}`);
    }
  };

  const handleUpdateRole = async (email: string, newRole: UserProfile['role']) => {
    try {
      const userRef = doc(db, 'users', email.toLowerCase());
      await setDoc(userRef, { role: newRole }, { merge: true });
      showToast("Rol actualizado", "success");
    } catch (error) {
      console.error("Error updating role:", error);
      showToast("Error al actualizar rol", "error");
      handleFirestoreError(error, OperationType.UPDATE, `users/${email}`);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!window.confirm(`¿Está seguro de eliminar el acceso para ${email}?`)) return;
    
    try {
      await deleteDoc(doc(db, 'users', email.toLowerCase()));
      showToast("Usuario eliminado", "success");
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast("Error al eliminar usuario", "error");
      handleFirestoreError(error, OperationType.DELETE, `users/${email}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="text-blue-600" /> Gestión de Usuarios y Permisos
        </h1>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" /> Autorizar Usuario
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-amber-800">
        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-bold">Nota sobre el acceso:</p>
          <p>Los usuarios autorizados aquí podrán acceder a las funciones administrativas según su rol cuando inicien sesión con su cuenta de Google correspondiente.</p>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Autorizar Nuevo Usuario</h2>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  required
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej: Juan Pérez"
                  value={newUser.displayName}
                  onChange={e => setNewUser({...newUser, displayName: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico (Google)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  required
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="usuario@ucihonda.com.co"
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rol / Permisos</label>
              <div className="flex gap-2">
                <select 
                  className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                >
                  <option value="viewer">Observador / Pendiente</option>
                  <option value="nurse">Enfermero (Lectura/Escritura)</option>
                  <option value="admin">Administrador (Gestión total)</option>
                </select>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Guardar
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar usuarios..."
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-bold">Usuario</th>
                <th className="px-6 py-3 font-bold">Correo</th>
                <th className="px-6 py-3 font-bold">Rol</th>
                <th className="px-6 py-3 font-bold">Fecha Registro</th>
                <th className="px-6 py-3 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">Cargando usuarios...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">No se encontraron usuarios</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.email} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800">{user.displayName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{user.email}</td>
                    <td className="px-6 py-4">
                      <select 
                        className={`text-xs font-bold px-2 py-1 rounded-full border outline-none ${
                          user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          user.role === 'nurse' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200 ring-2 ring-amber-400 ring-offset-1'
                        }`}
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.email, e.target.value as any)}
                      >
                        <option value="viewer">PENDIENTE / OBSERB.</option>
                        <option value="nurse">ENFERMERO</option>
                        <option value="admin">ADMIN</option>
                      </select>
                      {user.role === 'viewer' && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 animate-pulse">
                          NUEVO
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteUser(user.email)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        title="Eliminar acceso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
