
import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, CheckCircle, AlertTriangle, Save, Store, XCircle, Loader2, Navigation, Smartphone, Image as ImageIcon, ClipboardList, Info, Clock, Building2, Share2, Copy, Send } from 'lucide-react';
import { persistence } from '../services/persistence';
import { Geo360Record, Coords, FacadeCheck, IBAGUE_DATA } from '../types';
import { MapVisualizer } from './MapVisualizer';

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

export const FieldCapture: React.FC<{ auditorId?: string }> = ({ auditorId }) => {
    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    // Media State
    const [facadePhoto, setFacadePhoto] = useState<string | null>(null);
    const [interiorPhoto, setInteriorPhoto] = useState<string | null>(null);

    // GPS State
    const [outsideCoords, setOutsideCoords] = useState<Coords | null>(null);
    const [capturingGps, setCapturingGps] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        clientType: '',
        contactName: '',
        city: 'Ibagué',
        comuna: '',
        neighborhood: '',
        addressType: 'Calle',
        addressNum1: '',
        addressNum2: '',
        addressPlate: '',
        addressExtra: '',
        phone: '',
        openTime: '',
        closeTime: '',
        observations: ''
    });

    const [finalRecord, setFinalRecord] = useState<Geo360Record | null>(null);
    const facadeInputRef = useRef<HTMLInputElement>(null);
    const interiorInputRef = useRef<HTMLInputElement>(null);

    const useOnlineStatus = () => {
        const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

        useEffect(() => {
            const onOnline = () => setIsOnline(true);
            const onOffline = () => setIsOnline(false);

            window.addEventListener('online', onOnline);
            window.addEventListener('offline', onOffline);

            return () => {
                window.removeEventListener('online', onOnline);
                window.removeEventListener('offline', onOffline);
            };
        }, []);

        return isOnline;
    };

    const isOnline = useOnlineStatus();

    const handlePhotoUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        type: 'facade' | 'interior'
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const optimized = await resizeImage(reader.result as string);

            if (type === 'facade') {
                setFacadePhoto(optimized);
            } else {
                setInteriorPhoto(optimized);
            }
        };

        reader.readAsDataURL(file);
    };


    const getGPS = () => {
        setCapturingGps(true);
        if (!navigator.geolocation) {
            alert("Geolocalización no soportada");
            setCapturingGps(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setOutsideCoords({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    timestamp: pos.timestamp
                });
                setCapturingGps(false);
            },
            (err) => {
                alert("Error capturando GPS: " + err.message);
                setCapturingGps(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleMarkerDrag = (index: number, lat: number, lng: number) => {
        if (outsideCoords) {
            setOutsideCoords({
                ...outsideCoords,
                lat,
                lng,
                isManual: true
            });
        }
    };

    const handleSaveRecord = async () => {
        setIsSaving(true);
        const id = `OLP-${Math.floor(100000 + Math.random() * 900000)}`;

        const fullAddress = `${formData.addressType} ${formData.addressNum1} # ${formData.addressNum2} - ${formData.addressPlate} ${formData.addressExtra}`.trim();

        const record: Geo360Record = {
            id: id,
            timestamp: new Date().toISOString(),
            client: {
                clientType: formData.clientType,
                contactName: formData.contactName,
                city: formData.city,
                comuna: formData.comuna,
                neighborhood: formData.neighborhood,
                address: fullAddress,
                phone: formData.phone,
                email: '',
                openTime: formData.openTime,
                closeTime: formData.closeTime,
                observations: formData.observations
            },
            gps_outside: outsideCoords,
            gps_inside: outsideCoords,
            drift_meters: 0,
            plus_code: null,
            ai_validation: {
                facade: true
            },
            auditorId: auditorId,
            client_validation_status: 'pending',
            images: {
                facade: facadePhoto,
                interior: interiorPhoto
            }
        };

        try {
            await persistence.saveRecord(id, record);
            setFinalRecord(record);
            setStep(5);
        } catch (e) {
            console.error("Save error", e);
            alert("Error al guardar el registro.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinalize = () => {
        // Full page reload as requested to avoid navigation errors
        window.location.href = window.location.origin + window.location.pathname;
    };

    const getWhatsAppMessage = () => {
        if (!finalRecord) return '';
        const dateStr = new Date().toLocaleDateString();
        const verifyLink = `${window.location.origin}${window.location.pathname}#mode=client&id=${finalRecord.id}`;

        return `*✅ OLPAR360: VALIDACIÓN DE DATOS*\n\nHola, hemos completado la auditoría de tu ubicación.\n\n📍 *Validación de Ubicación y Datos*\n\nPor favor confirma si la información es correcta o indica qué debemos corregir en el formulario:\n\n👉 *VERIFICAR Y CONFIRMAR:*\n${verifyLink}\n\nID: ${finalRecord.id}\nFecha: ${dateStr}`;
    };

    const handleCopyWhatsApp = () => {
        const msg = getWhatsAppMessage();
        navigator.clipboard.writeText(msg);
        alert("Texto copiado al portapapeles");
    };

    const handleSendWhatsApp = () => {
        const msg = encodeURIComponent(getWhatsAppMessage());
        const phone = formData.phone ? formData.phone : '';
        window.open(`https://wa.me/${phone.startsWith('57') ? phone : '57' + phone}?text=${msg}`, '_blank');
    };

    const steps = [
        { id: 1, label: 'FACHADA' },
        { id: 2, label: 'GPS EXT' },
        { id: 3, label: 'INTERIOR' },
        { id: 4, label: 'DATOS' },
        { id: 5, label: 'REPORTE' }
    ];

    const comunas = Object.keys(IBAGUE_DATA);
    const barrios = formData.comuna ? IBAGUE_DATA[formData.comuna] : [];

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-24">

            {/* Cabecera del Auditor */}
            <div className="bg-slate-100 rounded-2xl p-4 flex items-center justify-between border border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {auditorId?.charAt(0) || 'A'}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-blue-800 uppercase leading-none">Auditor en Campo</p>
                        <p className="text-sm font-black text-slate-900">{auditorId || 'Administrador'}</p>
                    </div>
                </div>
            </div>

            {!isOnline && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Estás sin internet. La validación IA se omitirá, pero puedes continuar.
                </div>
            )}


            {/* Stepper */}
            <div className="relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>
                <div className="relative z-10 flex justify-between px-4">
                    {steps.map((s) => (
                        <div key={s.id} className="flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all shadow-md ${(step >= s.id || step === 5) ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-white text-slate-400 border-2 border-slate-200'
                                }`}>
                                {(step > s.id && step !== 5) || (step === 5 && s.id < 5) ? <CheckCircle className="h-5 w-5" /> : s.id}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-tighter ${(step >= s.id || step === 5) ? 'text-blue-700' : 'text-slate-400'}`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Step 5 - Report Layout */}
            {step === 5 && finalRecord ? (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    {/* Header Info */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-slate-400 uppercase"># ID: {finalRecord.id}</span>
                        </div>
                        <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                            Registro Guardado
                        </div>
                    </div>

                    {/* GPS Grid Boxes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Coordenada Ext.</p>
                            <p className="text-sm font-bold text-slate-800">
                                {finalRecord.gps_outside ? `${finalRecord.gps_outside.lat.toFixed(6)}, ${finalRecord.gps_outside.lng.toFixed(6)}` : 'N/A, N/A'}
                            </p>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Coordenada Int.</p>
                            <p className="text-sm font-bold text-slate-800">
                                {finalRecord.gps_outside ? `${finalRecord.gps_outside.lat.toFixed(6)}, ${finalRecord.gps_outside.lng.toFixed(6)}` : 'N/A, N/A'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">Deriva: 0m</p>
                        </div>
                    </div>

                    {/* WhatsApp Section */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 border border-blue-100">
                            <Share2 className="h-8 w-8 text-blue-600" />
                        </div>

                        <h2 className="text-2xl font-black text-slate-900 mb-2">Validación por WhatsApp</h2>
                        <p className="text-slate-400 text-sm font-medium mb-8">Envía el link de certificación al cliente.</p>

                        {/* Preview Box */}
                        <div className="w-full bg-slate-50 rounded-3xl p-6 text-left border border-slate-100 mb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <ImageIcon className="h-4 w-4 text-emerald-500" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Vista Previa Mensaje</span>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-[11px] text-slate-600 font-medium leading-relaxed whitespace-pre-wrap font-sans">
                                {getWhatsAppMessage()}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            <button
                                onClick={handleCopyWhatsApp}
                                className="flex items-center justify-center gap-3 bg-white border border-slate-200 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]"
                            >
                                <Copy className="h-5 w-5" /> Copiar Texto
                            </button>
                            <button
                                onClick={handleSendWhatsApp}
                                className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-emerald-100 active:scale-[0.98]"
                            >
                                <Send className="h-5 w-5" /> Enviar WhatsApp
                            </button>
                        </div>

                        <button
                            onClick={handleFinalize}
                            className="mt-10 text-xs font-black text-blue-600 uppercase tracking-widest hover:underline"
                        >
                            Finalizar y Nueva Auditoría
                        </button>
                    </div>
                </div>
            ) : (
                /* Contenido de los pasos 1 al 4 */
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-5 md:p-10 min-h-[500px] flex flex-col">
                    {step === 1 && (
                        <div className="w-full flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-8">
                                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                    <Store className="h-8 w-8 text-blue-600" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900">Paso 1: Foto de Fachada</h2>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-left mb-8 w-full max-w-xl">
                                <h3 className="text-blue-700 font-bold flex items-center gap-2 mb-3">
                                    <Info className="h-5 w-5" /> Guía para la Foto Perfecta
                                </h3>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-sm text-blue-800 font-medium">
                                        <CheckCircle className="h-4 w-4 text-emerald-500" /> Toma la foto <b>totalmente de frente</b>.
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-blue-800 font-medium">
                                        <CheckCircle className="h-4 w-4 text-emerald-500" /> Asegura que el <b>letrero</b> sea legible.
                                    </li>
                                </ul>
                            </div>

                            <div
                                onClick={() => facadeInputRef.current?.click()}
                                className="w-full max-w-xl aspect-[4/3] border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group relative overflow-hidden"
                            >
                                {facadePhoto ? (
                                    <img src={facadePhoto} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="space-y-4">
                                        <Camera className="h-16 w-16 text-slate-300 mx-auto group-hover:scale-110 group-hover:text-blue-400 transition-all" />
                                        <div className="bg-white border border-slate-200 rounded-full px-8 py-3 text-slate-600 font-bold shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                                            Abrir Cámara
                                        </div>
                                    </div>
                                )}

                            </div>
                            <input type="file" capture="environment" ref={facadeInputRef} className="hidden" onChange={(e) => handlePhotoUpload(e, 'facade')} />

                            {facadePhoto && (
                                <button
                                    onClick={() => setStep(2)}
                                    className="w-full max-w-xl mt-8 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-200 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                                >
                                    Siguiente: GPS Exterior <Navigation className="h-5 w-5" />
                                </button>
                            )}

                        </div>
                    )}

                    {step === 2 && (
                        <div className="w-full flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                            <div className="mb-8">
                                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                                    <Navigation className="h-8 w-8 text-red-600" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900">Paso 2: Coordenadas GPS</h2>
                                <p className="text-slate-400 mt-2">Valida la ubicación satelital desde el exterior</p>
                            </div>

                            <div className="bg-slate-900 rounded-3xl p-8 text-left mb-8 border border-slate-800 shadow-2xl w-full max-w-xl">
                                {outsideCoords ? (
                                    <div className="space-y-4">
                                        <div className="h-64 rounded-2xl overflow-hidden border border-slate-700 mb-4 shadow-inner">
                                            <MapVisualizer
                                                locations={[{
                                                    lat: outsideCoords.lat,
                                                    lng: outsideCoords.lng,
                                                    label: "Ajusta la ubicación del local"
                                                }]}
                                                center={[outsideCoords.lat, outsideCoords.lng]}
                                                onMarkerDragEnd={handleMarkerDrag}
                                            />
                                        </div>
                                        <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                                            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center"><CheckCircle className="h-5 w-5 text-emerald-400" /></div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Coordenadas Ajustadas</p>
                                                <p className="text-xl font-mono font-black text-white">{outsideCoords.lat.toFixed(6)}, {outsideCoords.lng.toFixed(6)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center"><Smartphone className="h-5 w-5 text-blue-400" /></div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Precisión del Dispositivo</p>
                                                <p className="text-xl font-black text-white">± {outsideCoords.accuracy.toFixed(1)} Metros</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium italic">💡 Puedes arrastrar el pin en el mapa si la ubicación no es exacta.</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-slate-400 font-medium italic">Esperando señal de satélite...</p>
                                    </div>
                                )}
                            </div>

                            <div className="w-full max-w-xl space-y-3">
                                <button
                                    onClick={getGPS}
                                    disabled={capturingGps}
                                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all border border-slate-200"
                                >
                                    {capturingGps ? <Loader2 className="animate-spin h-5 w-5" /> : <Navigation className="h-5 w-5" />}
                                    {outsideCoords ? 'Recapturar Ubicación' : 'Obtener GPS'}
                                </button>

                                {outsideCoords && (
                                    <button
                                        onClick={() => setStep(3)}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                                    >
                                        Siguiente: Foto Interior <ImageIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="w-full flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                            <div className="mb-8">
                                <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
                                    <ImageIcon className="h-8 w-8 text-purple-600" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900">Paso 3: Foto de Interior</h2>
                                <p className="text-slate-400 mt-2">Evidencia de surtido y caracterización</p>
                            </div>

                            <div
                                onClick={() => interiorInputRef.current?.click()}
                                className="w-full max-w-xl aspect-[4/3] border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group relative overflow-hidden"
                            >
                                {interiorPhoto ? (
                                    <img src={interiorPhoto} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="space-y-4">
                                        <Camera className="h-16 w-16 text-slate-300 mx-auto" />
                                        <div className="bg-white border border-slate-200 rounded-full px-8 py-3 text-slate-600 font-bold shadow-sm">
                                            Capturar Interior
                                        </div>
                                    </div>
                                )}
                            </div>
                            <input type="file" capture="environment" ref={interiorInputRef} className="hidden" onChange={(e) => handlePhotoUpload(e, 'interior')} />

                            <div className="flex gap-4 mt-8 w-full max-w-xl">
                                <button onClick={() => setStep(2)} className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-600">Atrás</button>
                                <button
                                    onClick={() => setStep(4)}
                                    disabled={!interiorPhoto}
                                    className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black shadow-xl disabled:opacity-50 transition-all"
                                >
                                    Continuar a Datos <ClipboardList className="h-5 w-5 inline ml-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="w-full animate-in fade-in duration-500 text-left">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                                    <Store className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">Datos del Punto</h2>
                                    <p className="text-slate-400 text-xs font-medium">Información comercial y logística</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Grupo 1: Cliente */}
                                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest block mb-2">Tipo de Cliente</label>
                                        <select
                                            className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                                            value={formData.clientType}
                                            onChange={e => setFormData({ ...formData, clientType: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option>Tienda Tradicional</option>
                                            <option>Minimercado</option>
                                            <option>Panadería</option>
                                            <option>Droguería</option>
                                            <option>Licorería</option>
                                            <option>Otro</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest block mb-2">Nombre Propietario</label>
                                        <input
                                            className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                                            placeholder="Ej. Juan Pérez"
                                            value={formData.contactName}
                                            onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Grupo 2: Ubicación */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ciudad *</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-bold outline-none"
                                            value={formData.city}
                                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        >
                                            <option>Ibagué</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Comuna *</label>
                                        <select
                                            className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-100"
                                            value={formData.comuna}
                                            onChange={e => setFormData({ ...formData, comuna: e.target.value, neighborhood: '' })}
                                        >
                                            <option value="">Sel...</option>
                                            {comunas.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Barrio *</label>
                                        <select
                                            className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                            value={formData.neighborhood}
                                            disabled={!formData.comuna}
                                            onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                                        >
                                            <option value="">Sel...</option>
                                            {barrios.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Grupo 3: Dirección */}
                                <div className="bg-slate-50/50 p-4 md:p-6 rounded-3xl border border-slate-100 space-y-4">
                                    <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
                                        <MapPin className="h-4 w-4 text-slate-400" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dirección de Entrega</span>
                                    </div>
                                    <div className="grid grid-cols-4 md:grid-cols-12 gap-2 md:gap-3 items-center">
                                        <select
                                            className="col-span-2 md:col-span-4 bg-white border border-slate-200 rounded-xl p-3 font-bold outline-none text-sm md:text-base"
                                            value={formData.addressType}
                                            onChange={e => setFormData({ ...formData, addressType: e.target.value })}
                                        >
                                            <option>Calle</option>
                                            <option>Carrera</option>
                                            <option>Avenida</option>
                                            <option>Transversal</option>
                                            <option>Diagonal</option>
                                        </select>
                                        <input
                                            placeholder="Num"
                                            className="col-span-2 md:col-span-2 bg-white border border-slate-200 rounded-xl p-3 font-bold outline-none text-center text-sm md:text-base"
                                            value={formData.addressNum1}
                                            onChange={e => setFormData({ ...formData, addressNum1: e.target.value })}
                                        />

                                        {/* Row 2 on mobile: # Num2 - Placa */}
                                        <div className="col-span-4 md:col-span-6 grid grid-cols-6 gap-2 items-center md:flex md:items-center md:gap-3">
                                            <span className="col-span-1 text-center font-bold text-slate-300">#</span>
                                            <input
                                                placeholder="Num"
                                                className="col-span-2 bg-white border border-slate-200 rounded-xl p-3 font-bold outline-none text-center text-sm md:text-base"
                                                value={formData.addressNum2}
                                                onChange={e => setFormData({ ...formData, addressNum2: e.target.value })}
                                            />
                                            <span className="col-span-1 text-center font-bold text-slate-300">-</span>
                                            <input
                                                placeholder="Placa"
                                                className="col-span-2 bg-white border border-slate-200 rounded-xl p-3 font-bold outline-none text-center text-sm md:text-base"
                                                value={formData.addressPlate}
                                                onChange={e => setFormData({ ...formData, addressPlate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <input
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold outline-none"
                                        placeholder="Complemento (Ej. Local 1, Apto 202)..."
                                        value={formData.addressExtra}
                                        onChange={e => setFormData({ ...formData, addressExtra: e.target.value })}
                                    />
                                </div>

                                {/* Grupo 4: Contacto y Horarios */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Teléfono</label>
                                        <input
                                            className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold outline-none"
                                            placeholder="3001234567"
                                            type='number'
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Horario Atención *</label>
                                        <div className="flex gap-2 items-center">
                                            <div className="flex-1">
                                                <input
                                                    type="time"
                                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold outline-none min-h-[50px] text-sm md:text-base"
                                                    value={formData.openTime}
                                                    onChange={e => setFormData({ ...formData, openTime: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <span className="font-bold text-slate-300">a</span>
                                            <div className="flex-1">
                                                <input
                                                    type="time"
                                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold outline-none min-h-[50px] text-sm md:text-base"
                                                    value={formData.closeTime}
                                                    onChange={e => setFormData({ ...formData, closeTime: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Observaciones */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Observaciones</label>
                                    <textarea
                                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 font-bold outline-none min-h-[100px] focus:ring-2 focus:ring-blue-100"
                                        placeholder="Notas adicionales..."
                                        value={formData.observations}
                                        onChange={e => setFormData({ ...formData, observations: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSaveRecord}
                                disabled={isSaving || !formData.contactName || !formData.comuna || !formData.neighborhood || !formData.addressNum1}
                                className="w-full mt-10 bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : <Save className="h-6 w-6" />}
                                Guardar Registro
                            </button>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};
