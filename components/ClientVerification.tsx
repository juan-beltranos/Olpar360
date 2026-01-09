
import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, Navigation, Loader2 } from 'lucide-react';
import { MapVisualizer } from './MapVisualizer';
import { persistence } from '../services/persistence';
import { Geo360Record } from '../types';

export const ClientVerification: React.FC = () => {
  const [record, setRecord] = useState<Geo360Record | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchRecord = async () => {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', ''));
        const id = params.get('id');
        
        if (id) {
            const data = await persistence.getRecordById(id);
            setRecord(data);
        }
        setLoading(false);
    };
    fetchRecord();
  }, []);

  const handleVerify = async () => {
    if (!record) return;
    setLoading(true);
    await persistence.saveRecord(record.id, {
        ...record,
        client_validation_status: 'verified'
    });
    setSubmitted(true);
    setLoading(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600 h-10 w-10" /></div>;

  if (!record) return (
    <div className="h-screen flex flex-col items-center justify-center p-10 text-center bg-slate-50">
        <div className="p-6 bg-white rounded-3xl shadow-xl space-y-4">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <h2 className="text-xl font-bold">Enlace Expirado o Inválido</h2>
            <p className="text-gray-500 text-sm">No pudimos encontrar la auditoría solicitada. Por favor contacte a Olpar360.</p>
        </div>
    </div>
  );

  if (submitted) return (
    <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-emerald-50">
        <div className="bg-white p-10 rounded-3xl shadow-2xl space-y-4 animate-in zoom-in-90 duration-500">
            <CheckCircle className="h-20 w-20 text-emerald-500 mx-auto" />
            <h2 className="text-3xl font-black text-slate-900">¡Verificación Exitosa!</h2>
            <p className="text-gray-500 max-w-xs mx-auto">Has certificado correctamente la ubicación de tu negocio. Gracias por confiar en Olpar360.</p>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="bg-blue-600 text-white p-8 pt-12 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <Navigation className="h-10 w-10 mb-6 text-white" />
          <h1 className="text-3xl font-black tracking-tight">Certificación de Ubicación</h1>
          <p className="opacity-90 font-medium text-blue-100 mt-2">ID Auditoría: {record.id}</p>
      </div>
      
      <div className="p-6 md:p-10 space-y-6 -mt-8">
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-blue-50/50 space-y-6">
              <div className="flex justify-between items-start border-b border-gray-100 pb-6">
                  <div>
                      <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 block">Razón Social / Contacto</label>
                      <p className="text-2xl font-black text-gray-900 leading-tight">{record.client.contactName}</p>
                      <p className="text-gray-400 font-medium mt-1">{record.client.address}</p>
                  </div>
              </div>

              <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Ubicación Geo-Referenciada</label>
                  <div className="h-64 rounded-2xl overflow-hidden border border-gray-100 shadow-inner">
                      {record.gps_outside && (
                          <MapVisualizer 
                            locations={[{lat: record.gps_outside.lat, lng: record.gps_outside.lng, label: "Tu negocio"}]} 
                            center={[record.gps_outside.lat, record.gps_outside.lng]}
                          />
                      )}
                  </div>
                  <p className="text-[10px] text-gray-400 italic text-center">Por favor, confirma que el pin azul coincide con tu punto de venta.</p>
              </div>

              <button 
                onClick={handleVerify}
                className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] mt-4"
              >
                  CONFIRMAR MIS DATOS
              </button>
          </div>
      </div>
    </div>
  );
};
