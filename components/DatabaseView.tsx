
import React, { useState, useEffect, useRef } from 'react';
import { Database, Search, Trash2, CheckCircle, Clock, Shield, Loader2, Eye, AlertTriangle, UserPlus, Users, Key, Trash, Edit, X, Save, MapPin, Store, Download, Upload, FileText, Play, ClipboardList, Navigation, User, Palette, Map as MapIcon, Compass } from 'lucide-react';
import { persistence } from '../services/persistence';
import { Geo360Record, IBAGUE_DATA } from '../types';
import { MapVisualizer } from './MapVisualizer';

interface DatabaseViewProps {
    currentUserId?: string;
    auditorNameFilter?: string;
}

const resizeImage = (base64Str: string, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
    });
};


export const DatabaseView: React.FC<DatabaseViewProps> = ({ currentUserId, auditorNameFilter }) => {
    const [records, setRecords] = useState<Geo360Record[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'records' | 'users'>('records');

    const facadeEditInputRef = useRef<HTMLInputElement>(null);
    const interiorEditInputRef = useRef<HTMLInputElement>(null);


    // Modal States
    const [editingRecord, setEditingRecord] = useState<Geo360Record | null>(null);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [viewingRecord, setViewingRecord] = useState<Geo360Record | null>(null);
    const [recordToDelete, setRecordToDelete] = useState<Geo360Record | null>(null);
    const [userToDelete, setUserToDelete] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // User Creation State
    const [newUser, setNewUser] = useState({
        name: '',
        pin: '',
        role: 'auditor',
        avatarColor: 'bg-blue-600'
    });

    useEffect(() => {
        const unsubscribeRecords = persistence.onRecordsUpdate((list) => {
            let sortedList = list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            if (auditorNameFilter) {
                sortedList = sortedList.filter(r => r.auditorId === auditorNameFilter);
            }
            setRecords(sortedList);
            setLoading(false);
        });
        const unsubscribeUsers = persistence.onUsersUpdate((list) => {
            setUsers(list);
        });
        return () => {
            unsubscribeRecords();
            unsubscribeUsers();
        };
    }, [auditorNameFilter]);

    // Navigation Helper
    const openInMaps = (lat: number, lng: number) => {
        // This URL scheme works for both Google Maps and triggers Waze options on many devices
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank');
    };

    // Record Actions
    const handleSaveEditedRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRecord) return;
        setIsSaving(true);
        try {
            await persistence.saveRecord(editingRecord.id, editingRecord);
            setEditingRecord(null);
        } catch (error) {
            alert("Error al actualizar el registro.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditPhotoUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        type: 'facade' | 'interior'
    ) => {
        const file = e.target.files?.[0];
        if (!file || !editingRecord) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const optimized = await resizeImage(reader.result as string);

            setEditingRecord(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    images: {
                        ...(prev.images || { facade: null, interior: null }),
                        [type]: optimized
                    }
                };
            });

            e.target.value = '';
        };

        reader.readAsDataURL(file);
    };

    const handleEditMarkerDrag = (index: number, lat: number, lng: number) => {
        if (editingRecord && editingRecord.gps_outside) {
            setEditingRecord({
                ...editingRecord,
                gps_outside: {
                    ...editingRecord.gps_outside,
                    lat,
                    lng,
                    isManual: true
                }
            });
        }
    };

    // User Actions
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newUser.pin.length !== 4) return alert("El PIN debe ser de 4 dígitos");
        setIsSaving(true);
        try {
            const userToSave = {
                ...newUser,
                id: `user-${Date.now()}`
            };
            await persistence.saveUser(userToSave);
            setNewUser({ name: '', pin: '', role: 'auditor', avatarColor: 'bg-blue-600' });
        } catch (error) {
            alert("Error al registrar el usuario.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveEditedUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        if (editingUser.pin.length !== 4) return alert("El PIN debe ser de 4 dígitos");
        setIsSaving(true);
        try {
            await persistence.saveUser(editingUser);
            setEditingUser(null);
        } catch (error) {
            alert("Error al actualizar el usuario.");
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        if (userToDelete.id === currentUserId) return alert("No puedes eliminar tu propio usuario activo.");
        setIsSaving(true);
        try {
            await persistence.deleteUser(userToDelete.id);
            setUserToDelete(null);
        } catch (error) {
            alert("Error al eliminar el usuario.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportExcel = () => {
        const headers = ["ID", "FECHA", "CLIENTE", "TIPO", "DIRECCIÓN", "COMUNA", "BARRIO", "TELÉFONO", "HORARIO", "AUDITOR", "ESTADO", "LATITUD", "LONGITUD"];
        const rows = records.map(r => `<tr><td>${r.id}</td><td>${new Date(r.timestamp).toLocaleDateString()}</td><td>${r.client.contactName}</td><td>${r.client.clientType}</td><td>${r.client.address}</td><td>${r.client.comuna}</td><td>${r.client.neighborhood}</td><td>${r.client.phone}</td><td>${r.client.openTime}-${r.client.closeTime}</td><td>${r.auditorId || ''}</td><td>${r.client_validation_status}</td><td>${r.gps_outside?.lat || ''}</td><td>${r.gps_outside?.lng || ''}</td></tr>`).join('');
        const tableHtml = `<table>${rows}</table>`;
        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `auditoria_${Date.now()}.xls`;
        link.click();
    };

    const filteredRecords = records.filter(r =>
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.client.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.client.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const colors = [
        { val: 'bg-blue-600', label: 'Azul' },
        { val: 'bg-slate-900', label: 'Negro' },
        { val: 'bg-emerald-600', label: 'Verde' },
        { val: 'bg-purple-600', label: 'Morado' },
        { val: 'bg-orange-600', label: 'Naranja' },
        { val: 'bg-pink-600', label: 'Rosa' }
    ];

    const comunas = Object.keys(IBAGUE_DATA);

    return (
        <div className="h-[900px] flex flex-col space-y-4 md:space-y-6 overflow-hidden">
            {/* Header Section */}
            <div className="bg-white px-4 py-6 md:px-10 md:py-8 rounded-3xl border border-slate-100 shadow-sm shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-2xl">
                            {auditorNameFilter ? <ClipboardList className="h-7 w-7 text-blue-600" /> : <Shield className="h-7 w-7 text-blue-600" />}
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
                                {auditorNameFilter ? 'Mis Auditorías' : 'Panel de Administración'}
                            </h2>
                            <p className="text-slate-400 text-xs md:text-sm font-medium">Historial detallado de capturas en campo.</p>
                        </div>
                    </div>

                    {!auditorNameFilter && (
                        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full md:w-auto self-end md:self-center">
                            <button onClick={() => setActiveTab('records')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${activeTab === 'records' ? 'bg-white shadow-lg text-blue-700' : 'text-slate-500'}`}>Registros</button>
                            <button onClick={() => setActiveTab('users')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${activeTab === 'users' ? 'bg-white shadow-lg text-blue-700' : 'text-slate-500'}`}>Equipo</button>
                        </div>
                    )}
                </div>
            </div>

            {/* TAB: Records */}
            {activeTab === 'records' && (
                <div className="flex-1 flex flex-col space-y-4 animate-in fade-in duration-300 min-h-0 overflow-hidden px-1">
                    <div className="flex flex-col xl:flex-row items-center gap-4 shrink-0">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                            <input className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-50 outline-none transition-all" placeholder="Buscar ID, Cliente o Barrio..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex gap-2 w-full xl:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                            <button onClick={handleExportExcel} className="flex-1 md:flex-none px-6 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all min-w-max">
                                <FileText className="h-4 w-4" /> Excel
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl flex-1 flex flex-col overflow-hidden min-h-0">
                        <div className=" flex-1 min-h-0
                            overflow-x-auto overflow-y-auto
                            overscroll-contain
                            [webkit-overflow-scrolling:touch]
                            -mx-4 md:mx-0
                            px-4 md:px-0">
                            <table className="min-w-[1200px] w-max text-left border-collapse">
                                <thead className="bg-slate-50/90 sticky top-0 z-20 backdrop-blur-md">
                                    <tr className="text-[10px] md:text-[11px] uppercase text-slate-400 font-black border-b border-slate-100">
                                        <th className="px-6 py-8">ID / FECHA</th>
                                        <th className="px-6 py-8">ESTADO</th>
                                        <th className="px-6 py-8">TIENDA</th>
                                        <th className="px-6 py-8">UBICACIÓN</th>
                                        <th className="px-6 py-8">AUDITOR</th>
                                        <th className="px-6 py-8 text-right">ACCIONES</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredRecords.map(r => (
                                        <tr key={r.id} className="hover:bg-blue-50/40 transition-all group">
                                            <td className="px-6 py-10">
                                                <div className="font-black text-slate-900 text-sm md:text-base mb-1">{r.id}</div>
                                                <div className="text-[10px] text-slate-400 font-bold">{new Date(r.timestamp).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-10">
                                                <div
                                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black border ${r.client_validation_status === 'verified'
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                            : r.client_validation_status === 'reported'
                                                                ? 'bg-red-50 text-red-600 border-red-100'
                                                                : 'bg-slate-100 text-slate-400 border-slate-200'
                                                        }`}
                                                >
                                                    {r.client_validation_status === 'verified' ? (
                                                        <CheckCircle className="h-3 w-3" />
                                                    ) : r.client_validation_status === 'reported' ? (
                                                        <AlertTriangle className="h-3 w-3" />
                                                    ) : (
                                                        <Clock className="h-3 w-3" />
                                                    )}

                                                    {r.client_validation_status === 'verified'
                                                        ? 'Verificado'
                                                        : r.client_validation_status === 'reported'
                                                            ? 'Rechazado'
                                                            : 'Pendiente'}
                                                </div>

                                            </td>
                                            <td className="px-6 py-10">
                                                <div className="font-black text-slate-900 text-sm md:text-base leading-tight mb-1">{r.client.contactName}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{r.client.clientType}</div>
                                            </td>
                                            <td className="px-6 py-10">
                                                <div className="font-black text-slate-900 text-sm md:text-base leading-tight mb-1">{r.client.neighborhood}</div>
                                                <div className="text-[10px] text-slate-400 font-bold truncate max-w-[200px]">{r.client.address}</div>
                                            </td>
                                            <td className="px-6 py-10">
                                                <div className="text-sm font-bold text-slate-600">{r.auditorId || 'Admin'}</div>
                                            </td>
                                            <td className="px-6 py-10 text-right">
                                                <div className="flex justify-end gap-2 md:gap-3">
                                                    {r.gps_outside && (
                                                        <button
                                                            onClick={() => openInMaps(r.gps_outside!.lat, r.gps_outside!.lng)}
                                                            title="Ir a ubicación (Maps/Waze)"
                                                            className="p-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all"
                                                        >
                                                            <Compass className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => setViewingRecord(r)} title="Ver detalles" className="p-4 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all">
                                                        <Eye className="h-5 w-5" />
                                                    </button>
                                                    <button onClick={() => setEditingRecord(r)} title="Editar" className="p-4 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl transition-all">
                                                        <Edit className="h-5 w-5" />
                                                    </button>
                                                    <button onClick={() => setRecordToDelete(r)} title="Eliminar" className="p-4 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all">
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}

            {/* TAB: Users (Equipo) */}
            {activeTab === 'users' && !auditorNameFilter && (
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 flex-1 min-h-0 animate-in fade-in duration-300 overflow-y-auto pb-10 px-1">
                    <div className="lg:col-span-4">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl lg:sticky lg:top-0">
                            <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 rounded-2xl"><UserPlus className="h-6 w-6 text-blue-600" /></div>
                                Nuevo Auditor
                            </h3>
                            <form onSubmit={handleCreateUser} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block leading-none">Nombre del Operador</label>
                                    <input required className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-sm focus:ring-4 focus:ring-blue-50" placeholder="Ej. Carlos Ruiz" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block leading-none">PIN Personal (4 Dígitos)</label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                                        <input required maxLength={4} inputMode="numeric" className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl outline-none font-black tracking-[0.5em] text-lg" placeholder="••••" value={newUser.pin} onChange={e => setNewUser({ ...newUser, pin: e.target.value.replace(/\D/g, '') })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block leading-none">Rol</label>
                                        <select className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-sm" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                            <option value="auditor">Auditor</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block leading-none">Avatar</label>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {colors.map(c => (
                                                <button key={c.val} type="button" onClick={() => setNewUser({ ...newUser, avatarColor: c.val })} className={`w-6 h-6 rounded-lg ${c.val} ${newUser.avatarColor === c.val ? 'ring-2 ring-blue-400 scale-110' : 'opacity-40'}`} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button disabled={isSaving || !newUser.name || newUser.pin.length < 4} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                    Dar de Alta
                                </button>
                            </form>
                        </div>
                    </div>
                    <div className="lg:col-span-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {users.map(u => (
                                <div key={u.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl flex items-center justify-between group relative overflow-hidden transition-all hover:border-blue-200">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-16 h-16 rounded-2xl ${u.avatarColor} text-white flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-white`}>
                                            {u.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-black text-slate-900 text-xl leading-none truncate mb-3">{u.name}</h4>
                                            <div className="flex flex-col gap-1.5">
                                                <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider block w-fit ${u.role === 'admin' ? 'bg-slate-900 text-white' : 'bg-blue-50 text-blue-600'}`}>{u.role === 'admin' ? 'Master Admin' : 'Auditor Campo'}</span>
                                                <span className="text-[11px] text-slate-400 font-mono font-bold tracking-widest">PIN: {u.pin}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                        <button onClick={() => setEditingUser(u)} className="p-3.5 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-2xl transition-all shadow-sm">
                                            <Edit className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => setUserToDelete(u)} className="p-3.5 bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm">
                                            <Trash className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: View Record */}
            {viewingRecord && (
                <div className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-xl flex justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95
                max-h-[calc(100dvh-2rem)]">

                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><Eye className="h-6 w-6" /></div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 leading-tight">Certificado Auditoría</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{viewingRecord.id}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingRecord(null)} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"><X className="h-6 w-6 text-slate-400" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2 flex items-center justify-between">
                                    <span>Ubicación Geo-Referenciada</span>
                                </h4>
                                <div className="h-64 rounded-3xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 relative group">
                                    {viewingRecord.gps_outside && (
                                        <>
                                            <MapVisualizer
                                                locations={[{ lat: viewingRecord.gps_outside.lat, lng: viewingRecord.gps_outside.lng, label: viewingRecord.client.contactName }]}
                                                center={[viewingRecord.gps_outside.lat, viewingRecord.gps_outside.lng]}
                                            />
                                            <button
                                                onClick={() => openInMaps(viewingRecord.gps_outside!.lat, viewingRecord.gps_outside!.lng)}
                                                className="absolute bottom-4 right-4 z-[1000] bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:bg-blue-700 transition-all flex items-center gap-2"
                                            >
                                                <Compass className="h-6 w-6" />
                                                <span className="font-black text-xs uppercase pr-2">Ruta GPS</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                                {/* IMÁGENES */}
                                {(viewingRecord.images?.facade || viewingRecord.images?.interior) && (
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">
                                            Evidencias Fotográficas
                                        </h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Fachada */}
                                            <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
                                                <div className="p-4 flex items-center justify-between">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fachada</p>
                                                </div>
                                                <div className="aspect-[4/3] bg-slate-100">
                                                    {viewingRecord.images?.facade ? (
                                                        <img
                                                            src={viewingRecord.images.facade}
                                                            className="w-full h-full object-cover"
                                                            alt="Foto fachada"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                                                            Sin imagen
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Interior */}
                                            <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
                                                <div className="p-4 flex items-center justify-between">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Interior</p>
                                                </div>
                                                <div className="aspect-[4/3] bg-slate-100">
                                                    {viewingRecord.images?.interior ? (
                                                        <img
                                                            src={viewingRecord.images.interior}
                                                            className="w-full h-full object-cover"
                                                            alt="Foto interior"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                                                            Sin imagen
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Información del Cliente</h4>
                                    <p className="font-black text-slate-900 text-lg leading-tight mb-1">{viewingRecord.client.contactName}</p>
                                    <p className="text-sm font-bold text-slate-500">{viewingRecord.client.clientType}</p>
                                    <p className="text-sm font-medium text-slate-400 mt-2 leading-relaxed">{viewingRecord.client.address}</p>
                                </div>
                                <div className="text-right">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Logística</h4>
                                    <p className="font-bold text-slate-800">{viewingRecord.client.neighborhood}</p>
                                    <p className="text-xs text-slate-400">{viewingRecord.client.comuna}</p>
                                    <p className="text-xs text-slate-400 mt-2">{viewingRecord.client.phone}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {viewingRecord.gps_outside && (
                                <button
                                    onClick={() => openInMaps(viewingRecord.gps_outside!.lat, viewingRecord.gps_outside!.lng)}
                                    className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95"
                                >
                                    <Navigation className="h-5 w-5" /> Iniciar Navegación GPS
                                </button>
                            )}
                            <button onClick={() => setViewingRecord(null)} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95">Cerrar Visor</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Edit Record */}
            {editingRecord && (
                <div className="fixed inset-0 z-[260] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="bg-slate-50 p-8 flex justify-between items-center border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl"><Edit className="h-7 w-7" /></div>
                                <div><h2 className="text-2xl font-black text-slate-900">Editar Información</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EXPEDIENTE: {editingRecord.id}</p></div>
                            </div>
                            <button onClick={() => setEditingRecord(null)} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"><X className="h-6 w-6 text-slate-400" /></button>
                        </div>

                        <form onSubmit={handleSaveEditedRecord} className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2 flex items-center gap-2 leading-none">
                                    <MapPin className="h-3 w-3" /> Corregir Ubicación Satelital
                                </h4>
                                <div className="h-64 rounded-3xl overflow-hidden border border-slate-200 shadow-inner">
                                    {editingRecord.gps_outside && (
                                        <MapVisualizer
                                            locations={[{ lat: editingRecord.gps_outside.lat, lng: editingRecord.gps_outside.lng, label: "Arrastra para corregir" }]}
                                            center={[editingRecord.gps_outside.lat, editingRecord.gps_outside.lng]}
                                            onMarkerDragEnd={handleEditMarkerDrag}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-3 leading-none">Datos Comerciales</h4>
                                    <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block leading-none">Nombre Tienda</label><input className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingRecord.client.contactName} onChange={e => setEditingRecord({ ...editingRecord, client: { ...editingRecord.client, contactName: e.target.value } })} /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block leading-none">Categoría</label><select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={editingRecord.client.clientType} onChange={e => setEditingRecord({ ...editingRecord, client: { ...editingRecord.client, clientType: e.target.value } })}><option>Tienda de Barrio</option><option>Minimercado</option><option>Droguería</option><option>Licorería</option></select></div>
                                        <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block leading-none">Teléfono</label><input className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={editingRecord.client.phone} onChange={e => setEditingRecord({ ...editingRecord, client: { ...editingRecord.client, phone: e.target.value } })} /></div>
                                    </div>
                                    <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block leading-none">Estado Validación</label><select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={editingRecord.client_validation_status} onChange={e => setEditingRecord({ ...editingRecord, client_validation_status: e.target.value as any })}><option value="pending">PENDIENTE</option><option value="verified">VERIFICADO</option><option value="reported">RECHAZADO</option></select></div>
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-3 leading-none">Ubicación y Logística</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block leading-none">Comuna</label><select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={editingRecord.client.comuna} onChange={e => setEditingRecord({ ...editingRecord, client: { ...editingRecord.client, comuna: e.target.value, neighborhood: '' } })}>{comunas.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                        <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block leading-none">Barrio</label><select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={editingRecord.client.neighborhood} onChange={e => setEditingRecord({ ...editingRecord, client: { ...editingRecord.client, neighborhood: e.target.value } })}>{(IBAGUE_DATA[editingRecord.client.comuna] || []).map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                                    </div>
                                    <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block leading-none">Dirección Completa</label><input className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={editingRecord.client.address} onChange={e => setEditingRecord({ ...editingRecord, client: { ...editingRecord.client, address: e.target.value } })} /></div>
                                    <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block leading-none">Observaciones Auditoría</label><textarea className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm min-h-[100px]" value={editingRecord.client.observations} onChange={e => setEditingRecord({ ...editingRecord, client: { ...editingRecord.client, observations: e.target.value } })} /></div>
                                </div>

                                {/* EDITAR IMÁGENES */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2 leading-none">
                                        Evidencias Fotográficas
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Fachada */}
                                        <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
                                            <div className="p-4 flex items-center justify-between">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fachada</p>
                                                <button
                                                    type="button"
                                                    onClick={() => facadeEditInputRef.current?.click()}
                                                    className="px-4 py-2 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                                >
                                                    Reemplazar
                                                </button>
                                            </div>

                                            <div className="aspect-[4/3] bg-slate-100">
                                                {editingRecord.images?.facade ? (
                                                    <img
                                                        src={editingRecord.images.facade}
                                                        className="w-full h-full object-cover"
                                                        alt="Editar fachada"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                                                        Sin imagen
                                                    </div>
                                                )}
                                            </div>

                                            <input
                                                ref={facadeEditInputRef}
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="hidden"
                                                onChange={(e) => handleEditPhotoUpload(e, 'facade')}
                                            />
                                        </div>

                                        {/* Interior */}
                                        <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
                                            <div className="p-4 flex items-center justify-between">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Interior</p>
                                                <button
                                                    type="button"
                                                    onClick={() => interiorEditInputRef.current?.click()}
                                                    className="px-4 py-2 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                                >
                                                    Reemplazar
                                                </button>
                                            </div>

                                            <div className="aspect-[4/3] bg-slate-100">
                                                {editingRecord.images?.interior ? (
                                                    <img
                                                        src={editingRecord.images.interior}
                                                        className="w-full h-full object-cover"
                                                        alt="Editar interior"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                                                        Sin imagen
                                                    </div>
                                                )}
                                            </div>

                                            <input
                                                ref={interiorEditInputRef}
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="hidden"
                                                onChange={(e) => handleEditPhotoUpload(e, 'interior')}
                                            />
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </form>

                        <div className="p-8 md:p-10 bg-slate-50 border-t border-slate-100 flex gap-6 shrink-0">
                            <button onClick={() => setEditingRecord(null)} className="flex-1 py-5 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cancelar</button>
                            <button onClick={handleSaveEditedRecord} disabled={isSaving} className="flex-[2] bg-slate-900 text-white py-5 rounded-3xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-2xl">
                                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Sincronizar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Edit User */}
            {editingUser && (
                <div className="fixed inset-0 z-[270] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="bg-slate-50 p-8 flex justify-between items-center border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl"><Edit className="h-7 w-7" /></div>
                                <div><h2 className="text-2xl font-black text-slate-900 leading-tight">Editar Operador</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SISTEMA OLPAR360</p></div>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"><X className="h-6 w-6 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleSaveEditedUser} className="p-8 space-y-6">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block leading-none">Nombre</label><input required className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-sm" value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} /></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block leading-none">PIN (4 Dígitos)</label><input required maxLength={4} inputMode="numeric" className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none font-black tracking-[0.6em] text-lg" value={editingUser.pin} onChange={e => setEditingUser({ ...editingUser, pin: e.target.value.replace(/\D/g, '') })} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block leading-none">Rol</label><select className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-sm" value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}><option value="auditor">Auditor</option><option value="admin">Admin</option></select></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block leading-none">Color</label><div className="flex flex-wrap gap-1 pt-1">{colors.map(c => (<button key={c.val} type="button" onClick={() => setEditingUser({ ...editingUser, avatarColor: c.val })} className={`w-6 h-6 rounded-lg ${c.val} ${editingUser.avatarColor === c.val ? 'ring-2 ring-blue-400' : 'opacity-40'}`} />))}</div></div>
                            </div>
                        </form>
                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                            <button onClick={() => setEditingUser(null)} className="flex-1 py-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cancelar</button>
                            <button onClick={handleSaveEditedUser} disabled={isSaving} className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl flex items-center justify-center gap-3">
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRMATION: Delete Record/User */}
            {(recordToDelete || userToDelete) && (
                <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100">
                            {recordToDelete ? <AlertTriangle className="h-10 w-10 text-red-500" /> : <User className="h-10 w-10 text-red-500" />}
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">{recordToDelete ? '¿Eliminar Auditoría?' : '¿Baja de Operador?'}</h2>
                        <p className="text-slate-500 text-sm font-medium mb-1">{recordToDelete ? `ID: ${recordToDelete.id}` : `Nombre: ${userToDelete?.name}`}</p>
                        <p className="text-slate-400 text-[10px] leading-relaxed mb-8">Esta acción es irreversible y borrará los datos del servidor Olpar360.</p>
                        <div className="flex flex-col gap-3 w-full">
                            <button onClick={recordToDelete ? async () => {
                                setIsSaving(true);
                                await persistence.deleteRecord(recordToDelete.id);
                                setIsSaving(false);
                                setRecordToDelete(null);
                            } : confirmDeleteUser} disabled={isSaving} className="w-full bg-red-500 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Confirmar Baja
                            </button>
                            <button onClick={() => { setRecordToDelete(null); setUserToDelete(null); }} className="w-full py-3 text-slate-400 font-black uppercase tracking-widest text-[10px]">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
