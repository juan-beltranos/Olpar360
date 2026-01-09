import React, { useState } from 'react';
import { Search, MapPin, AlertCircle, CheckCircle, Loader2, Volume2, Crosshair } from 'lucide-react';
import { geocodeAddress, GeoResult, generateSpeech } from '../services/geminiService';
import { MapVisualizer } from './MapVisualizer';

export const Geocoder: React.FC = () => {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setResults([]);
    const data = await geocodeAddress(input);
    setResults(data);
    setLoading(false);
  };

  const handleSpeak = async (text: string) => {
    if (audioPlaying) return;
    setAudioPlaying(true);
    const audioBuffer = await generateSpeech(text);
    if (audioBuffer) {
        const ctx = new AudioContext();
        const source = ctx.createBufferSource();
        source.buffer = await ctx.decodeAudioData(audioBuffer);
        source.connect(ctx.destination);
        source.start(0);
        source.onended = () => setAudioPlaying(false);
    } else {
        setAudioPlaying(false);
    }
  };

  const handleMarkerDrag = (index: number, lat: number, lng: number) => {
    const newResults = [...results];
    if (newResults[index]) {
        newResults[index] = {
            ...newResults[index],
            latitude: lat,
            longitude: lng,
            notes: (newResults[index].notes ? newResults[index].notes + " " : "") + "(Ubicación ajustada manualmente)",
            confidence: "Alta (Manual)"
        };
        setResults(newResults);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold text-white">Buscador de Coordenadas</h2>
        <p className="text-slate-400">Convierte direcciones imprecisas en geolocalizaciones exactas usando datos de Google Maps.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
        {/* Left Panel: Search & Results */}
        <div className="lg:col-span-1 flex flex-col space-y-4 h-full overflow-y-auto pr-2">
          <form onSubmit={handleSearch} className="relative space-y-2">
            <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ingresa Dirección o Plus Code (ej. 8GQ4+GH)..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-4 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-2 rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ubicar'}
                </button>
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-slate-500 pl-1">
                <Crosshair className="h-3 w-3 text-cyan-500" />
                <span>Tip: Usa <b>Plus Codes</b> para mayor precisión en zonas rurales.</span>
            </div>
          </form>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {loading && (
                <div className="flex flex-col items-center justify-center py-12 space-y-3 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                    <p>Consultando datos de Google Maps...</p>
                </div>
            )}
            
            {!loading && results.length === 0 && input && (
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
                    Sin resultados. Intenta buscar una ubicación.
                </div>
            )}

            {results.map((res, idx) => (
              <div key={idx} className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 hover:border-cyan-500/50 transition-colors">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 mb-2">
                        <MapPin className="h-5 w-5 text-cyan-400" />
                        <span className="font-semibold text-white">Resultado #{idx + 1}</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        res.confidence.includes('High') || res.confidence.includes('Alta') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                        Confianza: {res.confidence}
                    </div>
                </div>
                
                <p className="text-slate-300 text-sm mb-3">{res.address}</p>
                
                <div className="bg-slate-950 rounded p-2 font-mono text-xs text-cyan-300 mb-3 flex justify-between items-center">
                    <span>{res.latitude.toFixed(6)}, {res.longitude.toFixed(6)}</span>
                </div>

                {res.plusCode && (
                    <div className="bg-slate-950 rounded p-2 font-mono text-xs text-purple-300 mb-3 flex items-center gap-2">
                        <Crosshair className="h-3 w-3" />
                        <span>{res.plusCode}</span>
                    </div>
                )}

                {res.notes && (
                    <div className="text-xs text-slate-400 italic border-l-2 border-slate-600 pl-2 mb-2">
                        "{res.notes}"
                    </div>
                )}

                <div className="flex justify-end mt-2">
                     <button 
                        onClick={() => handleSpeak(res.notes || `Ubicado en ${res.address}`)}
                        className="flex items-center space-x-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                        disabled={audioPlaying}
                    >
                        <Volume2 className="h-4 w-4" />
                        <span>{audioPlaying ? 'Reproduciendo...' : 'Escuchar'}</span>
                    </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Map */}
        <div className="lg:col-span-2 h-[400px] lg:h-auto bg-slate-900 rounded-xl border border-slate-800 p-1 relative">
             <MapVisualizer 
                locations={results.map(r => ({ lat: r.latitude, lng: r.longitude, label: r.address }))} 
                center={results.length > 0 ? [results[0].latitude, results[0].longitude] : undefined}
                onMarkerDragEnd={handleMarkerDrag}
             />
             {results.length > 0 && (
                <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/80 backdrop-blur border border-slate-700 px-3 py-2 rounded-lg text-xs text-cyan-300 shadow-lg pointer-events-none">
                    <p>💡 Tip: Arrastra el marcador para corregir la ubicación exacta.</p>
                </div>
             )}
        </div>
      </div>
    </div>
  );
};