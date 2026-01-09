import React, { useState } from 'react';
import { BrainCircuit, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { deepValidateCoordinates } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

export const DeepValidator: React.FC = () => {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [context, setContext] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lng) return;

    setLoading(true);
    setReport(null);
    // Use the Gemini 3 Pro Thinking model
    const result = await deepValidateCoordinates(lat, lng, context, arrivalTime);
    setReport(result);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
                <BrainCircuit className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white">Validación Profunda de Coordenadas</h2>
                <p className="text-slate-400 text-sm">Usa Gemini 3 Pro Thinking Mode para analizar lógica, terreno y anomalías.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                    <form onSubmit={handleValidate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Latitud</label>
                                <input
                                    type="text"
                                    value={lat}
                                    onChange={(e) => setLat(e.target.value)}
                                    placeholder="ej. 40.4168"
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Longitud</label>
                                <input
                                    type="text"
                                    value={lng}
                                    onChange={(e) => setLng(e.target.value)}
                                    placeholder="ej. -3.7038"
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Contexto Esperado (Dirección/Ciudad)</label>
                            <input
                                type="text"
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                placeholder="ej. Centro de Madrid"
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Hora Estimada de Llegada (Opcional)</label>
                            <input
                                type="text"
                                value={arrivalTime}
                                onChange={(e) => setArrivalTime(e.target.value)}
                                placeholder="ej. 14:00 para validar si está abierto"
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center space-x-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Pensando a fondo...</span>
                                </>
                            ) : (
                                <>
                                    <BrainCircuit className="h-4 w-4" />
                                    <span>Analizar Coordenadas</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
                
                <div className="bg-indigo-900/20 border border-indigo-500/20 p-4 rounded-xl text-sm text-indigo-200">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        ¿Por qué usar Validación Profunda?
                    </h4>
                    <p className="opacity-80">
                        Las herramientas de mapas simples pueden colocar un pin, pero no "entienden" si la ubicación es válida logísticamente. 
                        Este modo piensa sobre la ubicación: ¿Está en medio del océano? ¿Es la precisión muy baja para entregas? ¿Coincide con la ciudad esperada? ¿Estará abierto a la hora de llegada?
                    </p>
                </div>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 flex flex-col h-[500px]">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                    <h3 className="font-semibold text-white">Reporte de Análisis</h3>
                </div>
                <div className="p-6 overflow-y-auto flex-1 prose prose-invert prose-sm max-w-none">
                    {loading ? (
                         <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 animate-pulse">
                            <BrainCircuit className="h-12 w-12 opacity-50" />
                            <div className="text-center">
                                <p>Asignando presupuesto de razonamiento...</p>
                                <p className="text-xs">Gemini 3.0 Pro está analizando patrones.</p>
                            </div>
                        </div>
                    ) : report ? (
                        <ReactMarkdown>{report}</ReactMarkdown>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600">
                            <p>Ingresa coordenadas para generar un reporte técnico de validación.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};