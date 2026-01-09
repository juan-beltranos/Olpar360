
import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Menu, X, ClipboardCheck, Database, Fingerprint, LogOut, ChevronRight, AlertCircle, Loader2, CloudOff, Cloud, Settings, ClipboardList } from 'lucide-react';
import { Geocoder } from './components/Geocoder';
import { FieldCapture } from './components/FieldCapture';
import { ClientVerification } from './components/ClientVerification';
import { DatabaseView } from './components/DatabaseView';
import { persistence } from './services/persistence';

enum View {
  FIELD_CAPTURE = 'FIELD_CAPTURE',
  MY_RECORDS = 'MY_RECORDS',
  GEOCODER = 'GEOCODER',
  DATABASE = 'DATABASE',
}

export interface UserProfile {
    id: string;
    name: string;
    pin: string;
    avatarColor: string;
    role: string;
    email?: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<View>(View.FIELD_CAPTURE);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClientMode, setIsClientMode] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [authorizedUsers, setAuthorizedUsers] = useState<UserProfile[]>([]);
  const [currentAuditor, setCurrentAuditor] = useState<UserProfile | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(true);
  
  const [selectedUserToLogin, setSelectedUserToLogin] = useState<UserProfile | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [cloudStatus, setCloudStatus] = useState(persistence.getCloudStatus());

  useEffect(() => {
    const unsubscribeUsers = persistence.onUsersUpdate((users) => {
        setAuthorizedUsers(users);
        setCloudStatus(persistence.getCloudStatus());
        setLoading(false);

        const savedAuditor = localStorage.getItem('olpar360_current_auditor');
        if (savedAuditor) {
            const parsed = JSON.parse(savedAuditor);
            const stillExists = users.find(u => u.id === parsed.id);
            if (stillExists) {
                setCurrentAuditor(stillExists);
                setShowLoginModal(false);
            } else {
                handleLogout();
            }
        }
    });

    const checkHash = () => {
        const hash = window.location.hash;
        if (hash.includes('mode=client')) {
            setIsClientMode(true);
            setShowLoginModal(false);
        } else {
            setIsClientMode(false);
        }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);

    return () => {
        unsubscribeUsers();
        window.removeEventListener('hashchange', checkHash);
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToLogin) return;

    if (pinInput === selectedUserToLogin.pin) {
        setCurrentAuditor(selectedUserToLogin);
        localStorage.setItem('olpar360_current_auditor', JSON.stringify(selectedUserToLogin));
        setShowLoginModal(false);
        setPinInput('');
        setSelectedUserToLogin(null);
        setLoginError(false);
    } else {
        setLoginError(true);
        setPinInput('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('olpar360_current_auditor');
    setCurrentAuditor(null);
    setShowLoginModal(true);
    setCurrentView(View.FIELD_CAPTURE);
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { id: View.FIELD_CAPTURE, label: 'Captura y Auditoría', icon: ClipboardCheck },
    { id: View.MY_RECORDS, label: 'Mis Auditorías', icon: ClipboardList },
    { id: View.GEOCODER, label: 'Validar Coordenada', icon: MapPin },
    ...(currentAuditor?.role === 'admin' ? [{ id: View.DATABASE, label: 'Control Total (Admin)', icon: Database }] : []),
  ];

  if (isClientMode) return <ClientVerification />;

  if (loading) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-900">
            <div className="text-center">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-blue-200 font-medium tracking-widest uppercase text-xs">Cargando Olpar360 System...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex h-screen flex-col md:flex-row overflow-hidden bg-gray-50 text-gray-900 font-sans">
      
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 text-center bg-blue-600 relative">
                    <div className="absolute top-0 right-0 p-4 opacity-20"><Fingerprint className="h-20 w-20 text-white" /></div>
                    <div className="inline-flex p-3 bg-white/10 rounded-2xl mb-4 relative"><Navigation className="h-10 w-10 text-white" /></div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Olpar360</h1>
                    <p className="text-blue-100 mt-1 font-medium">Validación de Identidad</p>
                </div>
                <div className="p-8">
                    {!selectedUserToLogin ? (
                        <>
                            <p className="text-gray-400 mb-6 text-xs text-center uppercase font-bold tracking-widest">Selecciona Operador</p>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                {authorizedUsers.map((auditor) => (
                                    <button
                                        key={auditor.id}
                                        onClick={() => { setSelectedUserToLogin(auditor); setLoginError(false); }}
                                        className="w-full flex items-center p-4 rounded-2xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                    >
                                        <div className={`w-11 h-11 rounded-full ${auditor.avatarColor} text-white flex items-center justify-center font-bold mr-4 shadow-md`}>{auditor.name.charAt(0)}</div>
                                        <div className="text-left flex-1">
                                            <span className="block font-bold text-gray-800 group-hover:text-blue-700">{auditor.name}</span>
                                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">{auditor.role}</span>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-200 group-hover:text-blue-500" />
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <form onSubmit={handleLogin} className="text-center">
                            <button type="button" onClick={() => { setSelectedUserToLogin(null); setPinInput(''); setLoginError(false); }} className="text-[10px] text-gray-400 hover:text-blue-600 mb-8 flex items-center justify-center gap-1 uppercase font-bold tracking-widest">
                                <ChevronRight className="h-3 w-3 rotate-180" /> Cambiar Operador
                            </button>
                            <div className={`w-20 h-20 rounded-full ${selectedUserToLogin.avatarColor} text-white flex items-center justify-center font-bold text-3xl mx-auto mb-4 shadow-xl ring-4 ring-offset-4 ring-blue-50`}>{selectedUserToLogin.name.charAt(0)}</div>
                            <h3 className="text-2xl font-black text-gray-900 mb-1">{selectedUserToLogin.name.split(' ')[0]}</h3>
                            <div className="relative max-w-[200px] mx-auto mb-8">
                                <input type="password" inputMode="numeric" maxLength={4} value={pinInput} onChange={(e) => { setPinInput(e.target.value); setLoginError(false); }} className={`w-full text-center text-3xl tracking-[0.5em] font-black py-4 border-b-4 bg-transparent focus:outline-none transition-colors ${loginError ? 'border-red-500 text-red-600 animate-shake' : 'border-gray-200 focus:border-blue-600 text-gray-800'}`} placeholder="••••" autoFocus />
                            </div>
                            <button type="submit" disabled={pinInput.length < 4} className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-2xl transition-all active:scale-[0.98]">Validar Acceso</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* MOBILE TOP BAR */}
      <header className="md:hidden bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-[60] shadow-sm">
          <div className="flex items-center space-x-2">
            <Navigation className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-black tracking-tighter text-gray-900">Olpar<span className="text-blue-600">360</span></h1>
          </div>
          {!isMobileMenuOpen && (
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-50 rounded-xl text-slate-600">
              <Menu className="h-6 w-6" />
            </button>
          )}
      </header>

      {/* OVERLAY FOR MOBILE MENU */}
      {isMobileMenuOpen && (
        <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] md:hidden animate-in fade-in duration-300" />
      )}

      {/* SIDEBAR (Desktop and Mobile Drawer) */}
      <aside className={`fixed md:relative inset-y-0 left-0 w-80 md:w-72 bg-white border-r border-gray-100 flex flex-col z-[80] transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        {/* Mobile Sidebar Header */}
        <div className="flex md:hidden items-center justify-between px-6 py-4 border-b border-slate-50 shrink-0">
          <div className="flex items-center space-x-2">
            <Navigation className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-black tracking-tighter text-gray-900">Olpar<span className="text-blue-600">360</span></h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Desktop Sidebar Header */}
        <div className="p-8 hidden md:flex items-center space-x-3 shrink-0">
          <div className="h-10 w-10 flex-shrink-0 bg-blue-600 rounded-xl p-2 flex items-center justify-center shadow-lg shadow-blue-200"><Navigation className="h-6 w-6 text-white" /></div>
          <h1 className="text-2xl font-black tracking-tighter text-gray-900">Olpar<span className="text-blue-600">360</span></h1>
        </div>
        
        {/* User Card */}
        <div className="px-6 py-6 md:py-0 md:pb-8 shrink-0">
            <div className="bg-slate-900 rounded-3xl p-5 text-white flex items-center gap-4 shadow-xl">
                <div className={`w-12 h-12 rounded-full ${currentAuditor?.avatarColor || 'bg-gray-500'} flex items-center justify-center font-bold text-lg border-2 border-slate-700 shrink-0`}>{currentAuditor ? currentAuditor.name.charAt(0) : 'U'}</div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{currentAuditor?.role || 'Invitado'}</p>
                    <p className="font-bold text-sm truncate">{currentAuditor ? currentAuditor.name : 'No identificado'}</p>
                </div>
                <button onClick={handleLogout} className="text-slate-500 hover:text-white transition-colors shrink-0"><LogOut className="h-4 w-4" /></button>
            </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 px-4 mt-2 md:mt-0 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setCurrentView(item.id); setIsMobileMenuOpen(false); }}
              className={`flex w-full items-center space-x-4 rounded-2xl px-5 py-4 text-sm font-bold transition-all ${
                currentView === item.id ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <item.icon className={`h-5 w-5 ${currentView === item.id ? 'text-blue-600' : 'text-gray-400'}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Status Bar */}
        <div className="p-6 border-t border-gray-50 shrink-0">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                    {cloudStatus.state === 'connected' ? (
                        <><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" /> Nube Activa</>
                    ) : (
                        <><div className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> Offline</>
                    )}
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto p-4 md:p-10 scrollbar-hide">
          <div className="mx-auto max-w-7xl h-full">
            {currentView === View.FIELD_CAPTURE && <FieldCapture auditorId={currentAuditor?.name} />}
            {currentView === View.MY_RECORDS && <DatabaseView currentUserId={currentAuditor?.id} auditorNameFilter={currentAuditor?.name} />}
            {currentView === View.GEOCODER && <Geocoder />}
            {currentView === View.DATABASE && currentAuditor?.role === 'admin' && (
                <DatabaseView currentUserId={currentAuditor?.id} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
