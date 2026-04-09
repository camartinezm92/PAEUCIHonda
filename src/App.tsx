import React, { useState, useEffect } from 'react';
import { PAERecord } from './types';
import Dashboard from './components/Dashboard';
import CreatePAE from './components/CreatePAE';
import ClosePAE from './components/ClosePAE';
import PatientDetail from './components/PatientDetail';
import ViewPAE from './components/ViewPAE';
import AuthModal from './components/AuthModal';
import ConfirmModal from './components/ConfirmModal';
import DictionaryManager from './components/DictionaryManager';
import DictionaryViewer from './components/DictionaryViewer';
import UserManagement from './components/UserManagement';
import { useDictionary } from './contexts/DictionaryContext';
import { Activity, LogOut, Database, BookOpen, Users, Shield } from 'lucide-react';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDoc } from './firebase';
import { minifyRecord, expandRecord } from './utils/paeMinifier';
import { ToastContainer, ToastType } from './components/Toast';
import { UserProfile } from './types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

type ViewState = 'DASHBOARD' | 'CREATE' | 'CLOSE' | 'PATIENT_DETAIL' | 'VIEW_PAE' | 'DICTIONARY' | 'LIBRARY' | 'USERS';

function App() {
  const { taxonomy, loading: loadingDict } = useDictionary();
  const [records, setRecords] = useState<PAERecord[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  
  useEffect(() => {
    const viewTitles: Record<ViewState, string> = {
      'DASHBOARD': 'Inicio',
      'CREATE': 'Nuevo PAE',
      'CLOSE': 'Cerrar PAE',
      'PATIENT_DETAIL': 'Detalle de Paciente',
      'VIEW_PAE': 'Ver PAE',
      'DICTIONARY': 'Gestionar Diccionario',
      'LIBRARY': 'Biblioteca',
      'USERS': 'Gestión de Usuarios'
    };
    document.title = `PAE - ${viewTitles[currentView] || 'Sistema'}`;
  }, [currentView]);

  // Toast State
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);

  const showToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  // Auth Modal State (for admin actions)
  const [authConfig, setAuthConfig] = useState<{ 
    isOpen: boolean; 
    onSuccess: () => void; 
    type: 'dictionary' | 'users' 
  } | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isUserAdminAuthenticated, setIsUserAdminAuthenticated] = useState(false);
  
  // Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  // Firebase Auth State
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        console.log("User logged in:", currentUser.email);
        // Load user profile from Firestore
        const userEmail = currentUser.email?.toLowerCase() || '';
        try {
          const userDoc = await getDoc(doc(db, 'users', userEmail));
          if (userDoc.exists()) {
            const profile = userDoc.data() as UserProfile;
            console.log("User profile loaded:", profile.role);
            setUserProfile(profile);
          } else {
            // Default profile for first-time users or unlisted users
            // If it's the owner email, make them admin automatically
            const isMasterAdmin = ['camartinezm92@gmail.com', 'ingbiomedico@ucihonda.com.co'].includes(currentUser.email?.toLowerCase() || '');
            const profile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Usuario',
              role: isMasterAdmin ? 'admin' : 'viewer', // Default role is viewer (observer)
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(doc(db, 'users', userEmail), profile);
              setUserProfile(profile);
            } catch (setErr) {
              handleFirestoreError(setErr, OperationType.WRITE, `users/${userEmail}`);
            }
          }
        } catch (e) {
          console.error("Error loading user profile", e);
          // If it's already a JSON error from handleFirestoreError, don't wrap it again
          if (!(e instanceof Error && e.message.startsWith('{'))) {
            try {
              handleFirestoreError(e, OperationType.GET, `users/${userEmail}`);
            } catch (handledErr) {
              // We just want to log it
            }
          }
        }
      } else {
        setUserProfile(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || loadingDict) {
      setRecords([]);
      return;
    }

    // Admins see all records, others see only theirs (or based on role)
    let q;
    if (userProfile?.role === 'admin') {
      q = query(collection(db, 'pae_records'));
    } else {
      q = query(collection(db, 'pae_records'), where('userId', '==', user.uid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedRecords: PAERecord[] = [];
      snapshot.forEach((docSnap) => {
        try {
          loadedRecords.push(expandRecord(docSnap.data(), taxonomy));
        } catch (e) {
          console.error("Error parsing record", e);
        }
      });
      setRecords(loadedRecords);
    }, (error) => {
      console.error("Firestore error:", error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'pae_records');
      } catch (e) {
        // Logged already
      }
    });

    return () => unsubscribe();
  }, [user, taxonomy, loadingDict]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const requireAuth = (onSuccess: () => void, type: 'dictionary' | 'users' = 'dictionary') => {
    if (type === 'dictionary' && isAdminAuthenticated) {
      onSuccess();
    } else if (type === 'users' && isUserAdminAuthenticated) {
      onSuccess();
    } else {
      setAuthConfig({ 
        isOpen: true, 
        type,
        onSuccess: () => {
          if (type === 'users') {
            setIsUserAdminAuthenticated(true);
          } else {
            setIsAdminAuthenticated(true);
          }
          onSuccess();
        } 
      });
    }
  };

  const handleSavePAE = async (record: PAERecord) => {
    if (!user) return;
    try {
      const minified = minifyRecord(record, user.uid);
      await setDoc(doc(db, 'pae_records', record.id), minified);
      showToast("PAE iniciado exitosamente", "success");
      setCurrentView('DASHBOARD');
    } catch (error) {
      console.error("Error saving PAE", error);
      showToast("Error al guardar el PAE", "error");
      try {
        handleFirestoreError(error, OperationType.WRITE, `pae_records/${record.id}`);
      } catch (e) {}
    }
  };

  const handleClosePAE = async (updatedRecord: PAERecord) => {
    if (!user) return;
    try {
      const minified = minifyRecord(updatedRecord, user.uid);
      await setDoc(doc(db, 'pae_records', updatedRecord.id), minified);
      showToast("PAE evaluado y cerrado correctamente", "success");
      setCurrentView('PATIENT_DETAIL');
      setSelectedRecordId(null);
    } catch (error) {
      console.error("Error closing PAE", error);
      showToast("Error al cerrar el PAE", "error");
      try {
        handleFirestoreError(error, OperationType.WRITE, `pae_records/${updatedRecord.id}`);
      } catch (e) {}
    }
  };

  const navigateToPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCurrentView('PATIENT_DETAIL');
  };

  const navigateToClose = (id: string) => {
    setSelectedRecordId(id);
    setCurrentView('CLOSE');
  };

  const handleEditClosedPAE = (id: string) => {
    requireAuth(() => {
      setSelectedRecordId(id);
      setCurrentView('CLOSE');
    });
  };

  const navigateToView = (id: string) => {
    setSelectedRecordId(id);
    setCurrentView('VIEW_PAE');
  };

  const handleDeletePAE = (id: string) => {
    requireAuth(() => {
      setConfirmConfig({
        isOpen: true,
        title: 'Eliminar PAE',
        message: '¿Está seguro de que desea eliminar este PAE? Esta acción no se puede deshacer.',
        onConfirm: async () => {
          try {
            await deleteDoc(doc(db, 'pae_records', id));
            showToast("PAE eliminado correctamente", "success");
          } catch (error) {
            console.error("Error deleting PAE", error);
            showToast("Error al eliminar el PAE", "error");
            try {
              handleFirestoreError(error, OperationType.DELETE, `pae_records/${id}`);
            } catch (e) {}
          }
        }
      });
    });
  };

  const handleDeletePatient = (patientId: string) => {
    requireAuth(() => {
      setConfirmConfig({
        isOpen: true,
        title: 'Eliminar Paciente',
        message: '¿Está seguro de que desea eliminar este paciente y TODOS sus registros PAE? Esta acción no se puede deshacer.',
        onConfirm: async () => {
          try {
            const patientRecords = records.filter(r => r.patient.id === patientId);
            for (const record of patientRecords) {
              await deleteDoc(doc(db, 'pae_records', record.id));
            }
            showToast("Paciente y registros eliminados", "success");
            setCurrentView('DASHBOARD');
            setSelectedPatientId(null);
          } catch (error) {
            console.error("Error deleting patient records", error);
            showToast("Error al eliminar el paciente", "error");
            try {
              handleFirestoreError(error, OperationType.DELETE, `pae_records (multiple)`);
            } catch (e) {}
          }
        }
      });
    });
  };

  const getSelectedPatient = () => {
    if (!selectedPatientId) return null;
    const patientRecords = records.filter(r => r.patient.id === selectedPatientId);
    if (patientRecords.length === 0) return null;
    return patientRecords[0].patient;
  };

  const getSelectedRecord = () => {
    if (!selectedRecordId) return null;
    return records.find(r => r.id === selectedRecordId) || null;
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-blue-600 flex flex-col items-center">
          <Activity className="w-12 h-12 animate-pulse mb-4" />
          <p className="font-medium">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Sistema PAE Clínico</h1>
          <p className="text-slate-600 mb-8">
            Para proteger la privacidad de los datos médicos (PII), es necesario iniciar sesión de forma segura.
          </p>
          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>
        </div>
      </div>
    );
  }

  const masterAdmins = ['camartinezm92@gmail.com', 'ingbiomedico@ucihonda.com.co'];
  const showUsersButton = userProfile?.role === 'admin' || masterAdmins.includes(user?.email?.toLowerCase() || '');
  console.log("Show users button:", showUsersButton, "Role:", userProfile?.role, "Email:", user?.email);

  if (user && userProfile?.role === 'viewer') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Acceso Pendiente</h1>
          <p className="text-slate-600 mb-6">
            Hola <strong>{user.displayName}</strong>. Tu solicitud de acceso ha sido registrada correctamente.
          </p>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-sm text-amber-800 mb-8">
            Un administrador debe autorizar tu cuenta y asignarte un rol (Enfermero o Administrador) antes de que puedas usar el sistema.
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors"
          >
            <LogOut className="w-5 h-5" /> Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="bg-blue-700 text-white shadow-md sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => setCurrentView('DASHBOARD')}
            >
              <Activity className="w-6 h-6 text-blue-200" />
              <span className="font-bold text-xl tracking-tight">Enfermería PAE</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 mr-4 border-r border-blue-600 pr-4">
                <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-blue-400" />
                <span className="text-sm font-medium text-blue-100">{user.displayName}</span>
              </div>
              <button 
                onClick={() => setCurrentView('DASHBOARD')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'DASHBOARD' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}
              >
                Historial
              </button>
              <button 
                onClick={() => setCurrentView('CREATE')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'CREATE' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}
              >
                + Iniciar PAE
              </button>
              <button 
                onClick={() => setCurrentView('LIBRARY')}
                className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'LIBRARY' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}
              >
                <BookOpen className="w-4 h-4" /> Biblioteca
              </button>
              <button 
                onClick={() => {
                  requireAuth(() => setCurrentView('DICTIONARY'));
                }}
                className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'DICTIONARY' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}
              >
                <Database className="w-4 h-4" /> Agregar Info
              </button>
              {showUsersButton && (
                <button 
                  onClick={() => {
                    requireAuth(() => setCurrentView('USERS'), 'users');
                  }}
                  className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'USERS' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}
                >
                  <Users className="w-4 h-4" /> Usuarios
                </button>
              )}
              <button 
                onClick={handleLogout}
                className="ml-2 p-2 rounded-md text-blue-200 hover:text-white hover:bg-blue-800 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:m-0 print:max-w-none">
        {currentView === 'DICTIONARY' && (
          <DictionaryManager onBack={() => setCurrentView('DASHBOARD')} />
        )}
        {currentView === 'USERS' && (
          <UserManagement onBack={() => setCurrentView('DASHBOARD')} showToast={showToast} />
        )}
        {currentView === 'LIBRARY' && (
          <DictionaryViewer onBack={() => setCurrentView('DASHBOARD')} requireAuth={(cb) => requireAuth(cb, 'dictionary')} />
        )}
        {currentView === 'DASHBOARD' && (
          <Dashboard records={records} onSelectPatient={navigateToPatient} />
        )}
        {currentView === 'CREATE' && (
          <CreatePAE records={records} onSave={handleSavePAE} onCancel={() => setCurrentView('DASHBOARD')} />
        )}
        {currentView === 'PATIENT_DETAIL' && selectedPatientId && getSelectedPatient() && (
          <PatientDetail 
            patient={getSelectedPatient()!} 
            records={records.filter(r => r.patient.id === selectedPatientId)}
            onBack={() => setCurrentView('DASHBOARD')}
            onViewPAE={navigateToView}
            onClosePAE={navigateToClose}
            onEditClosedPAE={handleEditClosedPAE}
            onDeletePAE={handleDeletePAE}
            onDeletePatient={handleDeletePatient}
          />
        )}
        {currentView === 'VIEW_PAE' && selectedRecordId && getSelectedRecord() && (
          <ViewPAE 
            record={getSelectedRecord()!} 
            onBack={() => setCurrentView('PATIENT_DETAIL')} 
          />
        )}
        {currentView === 'CLOSE' && selectedRecordId && getSelectedRecord() && (
          <ClosePAE 
            record={getSelectedRecord()!} 
            onSave={handleClosePAE} 
            onCancel={() => setCurrentView('PATIENT_DETAIL')} 
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={!!authConfig?.isOpen} 
        type={authConfig?.type}
        onClose={() => setAuthConfig(null)} 
        onSuccess={() => {
          if (authConfig?.onSuccess) authConfig.onSuccess();
          setAuthConfig(null);
        }} 
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmConfig?.isOpen}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        onConfirm={() => {
          if (confirmConfig?.onConfirm) confirmConfig.onConfirm();
        }}
        onCancel={() => setConfirmConfig(null)}
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;
