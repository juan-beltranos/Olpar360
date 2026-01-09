import React, { useState } from 'react';
import { Navigation, Clock, Map as MapIcon, TrendingUp, Info, Loader2, AlertTriangle, MapPin } from 'lucide-react';
import { analyzeLogistics, analyzeAccessComplexity, geocodeAddress } from '../services/geminiService';
import { MapVisualizer } from './MapVisualizer';

export const RouteAnalyzer: React.FC = () => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  
  const [logistics, setLogistics] = useState<any>(null);
  const [complexity, setComplexity] = useState<string | null>(null);
  const [routePoints, setRoutePoints] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;

    setLoading(true);
    setLogistics(null);
    setComplexity(null);
    setRoutePoints([]);

    try {
        // Parallel Execution: Logistics Data + Geocoding for Map
        const [logData, originGeo, destGeo] = await Promise.all([
            analyzeLogistics(origin, destination),
            geocodeAddress(origin),
            geocodeAddress(destination)
        ]);

        setLogistics(logData);

        // Map Visualization Data
        const points = [];
        if (originGeo && originGeo.length > 0) {
            points.push({ lat: originGeo[0].latitude, lng: originGeo[0].longitude, label: `Origen: ${origin}` });
        }
        if (destGeo && destGeo.length > 0) {
            points.push({ lat: destGeo[0].latitude, lng: destGeo[0].longitude, label: `Destino: ${destination}` });
        }
        setRoutePoints(points);

        if (logData) {
            // Step 2: Analyze complexity with Pro (Deep Dive)
            const compAnalysis = await analyzeAccessComplexity(origin, destination, logData);
            setComplexity(compAnalysis);
        }
    } catch (error) {
        console.warn("Error analyzing route", error);
    } finally {
        setLoading(false);
    }
  };

  const getComplexityColor = (level: string) => {
    const l = String(level || '').toLowerCase();
    if (l.includes('alta') || l.includes('high')) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (l.includes('media') || l.includes('medium')) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  };

  return (
    <div className="h-full flex flex-col space-y-4">
        <div className="flex flex-col space-y-2 shrink-0">
            <h2 className="text-2xl font-bold text-white">Inteligencia de Rutas y Logística</h2>
            <p className="text-slate-400">Combina datos de Google Maps con el razonamiento operativo de Olpar360.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
            {/* Left Column: Inputs & Metrics */}
            <div className="lg:col-span-5 space-y-4 overflow-y-auto pr-1">
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
                    <form onSubmit={handleAnalyze} className="space-y-4">
                        <div className="relative">
                            <div className="absolute left-3 top-3.5">
                                <div className="w-3 h-3 rounded-full border-2 border-cyan-500"></div>
                            </div>
                            <input 
                                type="text" 
                                value={origin}
                                onChange={(e) => setOrigin(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-3 py-3 text-white focus:ring-cyan-500 focus:border-cyan-500"
                                placeholder="Punto de partida..."
                            />
                        </div>
                         <div className="relative">
                            <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-700 -my-2 mx-1.5 z-0"></div>
                            <div className="absolute left-3 top-3.5 z-10">
                                <MapPin className="h-4 w-4 text-red-500" />
                            </div>
                            <input 
                                type="text" 
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-3 py-3 text-white focus:ring-cyan-500 focus:border-cyan-500 relative z-10"
                                placeholder="Punto de llegada..."
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center shadow-lg shadow-cyan-900/20"
                        >
                             {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Analizar Operación'}
                        </button>
                    </form>
                </div>

                {logistics && (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4">
                         <div className="bg-slate-800/50 p-3 border-b border-slate-800 font-semibold text-white flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-cyan-400" />
                            KPIs de Ruta
                         </div>
                         <div className="p-4 grid grid-cols-1 gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/50">
                                    <div className="text-slate-500 text-xs mb-1 flex items-center gap-1 font-bold uppercase"><MapIcon className="h-3 w-3" /> Distancia</div>
                                    <div className="text-2xl font-bold text-white tracking-tight">{String(logistics.distance_km || '--')}</div>
                                </div>
                                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/50">
                                    <div className="text-slate-500 text-xs mb-1 flex items-center gap-1 font-bold uppercase"><Clock className="h-3 w-3" /> Tiempo Est.</div>
                                    <div className="text-2xl font-bold text-white tracking-tight">{String(logistics.eta_minutes || '--')}</div>
                                </div>
                            </div>
                            <div className={`p-4 rounded-lg border flex items-center justify-between ${getComplexityColor(logistics.routing_complexity)}`}>
                                <div>
                                    <div className="text-xs opacity-70 mb-0.5 uppercase tracking-wider font-bold">Nivel de Complejidad</div>
                                    <div className="text-lg font-bold capitalize">{String(logistics.routing_complexity || 'Desconocida')}</div>
                                </div>
                                <AlertTriangle className="h-6 w-6 opacity-50" />
                            </div>
                         </div>
                    </div>
                )}
            </div>

            {/* Right Column: Map & Deep Analysis */}
            <div className="lg:col-span-7 flex flex-col h-full space-y-4 min-h-[500px]">
                {/* MAP CONTAINER */}
                <div className="h-64 lg:h-1/2 w-full bg-slate-900 rounded-xl border border-slate-800 relative overflow-hidden">
                    <MapVisualizer locations={routePoints} />
                    <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur text-xs text-slate-400 px-2 py-1 rounded z-[1000] border border-slate-700">
                        Visualización Satelital
                    </div>
                </div>

                {/* TEXT ANALYSIS */}
                <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
                     <div className="bg-slate-800/30 p-4 border-b border-slate-800">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                            <Info className="h-4 w-4 text-blue-400" />
                            Dictamen Operativo Gemini
                        </h3>
                     </div>
                     <div className="p-5 overflow-y-auto text-sm text-slate-300 space-y-4">
                        {loading ? (
                            <div className="flex items-center gap-3 text-slate-500 animate-pulse">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Analizando tráfico, terreno y restricciones...</span>
                            </div>
                        ) : !logistics ? (
                            <p className="text-slate-500 italic">Define origen y destino para recibir un plan logístico detallado.</p>
                        ) : (
                            <>
                                <div className="prose prose-invert max-w-none">
                                    <p className="whitespace-pre-wrap">{String(logistics.observations || '')}</p>
                                </div>
                                {complexity && (
                                    <div className="mt-4 p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs leading-relaxed font-mono text-cyan-100/80">
                                        <div className="font-bold text-cyan-500 mb-2 flex items-center gap-2">
                                            <TrendingUp className="h-3 w-3" /> ANÁLISIS PROFUNDO:
                                        </div>
                                        {String(complexity)}
                                    </div>
                                )}
                            </>
                        )}
                     </div>
                </div>
            </div>
        </div>
    </div>
  );
};