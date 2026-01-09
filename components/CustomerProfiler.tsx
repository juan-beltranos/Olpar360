import React, { useState } from 'react';
import { UserCheck, TrendingUp, Clock, MapPin, Loader2, Briefcase, ShoppingBag, ShieldCheck, AlertTriangle, LineChart } from 'lucide-react';
import { generateOperationalAvatar } from '../services/geminiService';

export const CustomerProfiler: React.FC = () => {
  const [formData, setFormData] = useState({
    frequency: '',
    averageAmount: '',
    distance: '',
    category: '',
    purchaseTime: '',
    reliability: '',
    storeHours: ''
  });
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setProfile(null);
    const result = await generateOperationalAvatar(formData);
    setProfile(result);
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center space-x-3 shrink-0">
        <div className="p-2 bg-purple-100 rounded-lg">
          <LineChart className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inteligencia Comercial Olpar360</h2>
          <p className="text-gray-500 text-sm">Algoritmo predictivo para caracterización de puntos de venta.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Input Form */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-gray-200 h-fit overflow-y-auto shadow-sm">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Variables de Entrada</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Frecuencia y Monto</label>
                    <div className="flex gap-2">
                         <input
                            type="text"
                            name="frequency"
                            value={formData.frequency}
                            onChange={handleChange}
                            placeholder="Frecuencia (ej. Semanal)"
                            className="w-1/2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        />
                        <input
                            type="text"
                            name="averageAmount"
                            value={formData.averageAmount}
                            onChange={handleChange}
                            placeholder="Ticket Prom. ($)"
                            className="w-1/2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Categoría Principal</label>
                    <div className="relative">
                        <ShoppingBag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            placeholder="ej. Bebidas, Abarrotes"
                            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-gray-900 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                         <label className="block text-xs font-semibold text-gray-600 mb-1.5">Distancia</label>
                         <input
                            type="text"
                            name="distance"
                            value={formData.distance}
                            onChange={handleChange}
                            placeholder="ej. 5 km"
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm"
                        />
                    </div>
                    <div>
                         <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hora Pref.</label>
                         <input
                            type="text"
                            name="purchaseTime"
                            value={formData.purchaseTime}
                            onChange={handleChange}
                            placeholder="ej. AM"
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Calidad de Ubicación (GPS)</label>
                    <select
                        name="reliability"
                        value={formData.reliability}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    >
                        <option value="">Seleccionar nivel...</option>
                        <option value="High">Alta (GPS Validado)</option>
                        <option value="Medium">Media (Dirección Aprox)</option>
                        <option value="Low">Baja (Zona Rural/Sin Datos)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ventana Operativa</label>
                    <input
                        type="text"
                        name="storeHours"
                        value={formData.storeHours}
                        onChange={handleChange}
                        placeholder="Horario (ej. 8am - 8pm)"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm"
                    />
                </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-all shadow-md shadow-purple-100 flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Ejecutar Perfilado IA'}
            </button>
          </form>
        </div>

        {/* Results Display */}
        <div className="lg:col-span-8 space-y-6 overflow-y-auto">
            {loading ? (
                 <div className="h-full rounded-xl border border-gray-200 bg-white flex items-center justify-center flex-col space-y-6 min-h-[400px]">
                    <div className="relative">
                        <div className="absolute inset-0 bg-purple-500 blur-xl opacity-10 animate-pulse rounded-full"></div>
                        <UserCheck className="relative h-16 w-16 text-purple-500 animate-bounce" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-xl font-bold text-gray-900">Procesando Identidad...</p>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto">El motor Olpar360 está cruzando variables logísticas y comerciales.</p>
                    </div>
                </div>
            ) : !profile ? (
                <div className="h-full rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center min-h-[400px] p-8">
                    <div className="text-center space-y-4 max-w-sm">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
                            <Briefcase className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-600">Esperando Datos</h3>
                        <p className="text-gray-400 text-sm">Ingresa las métricas operativas a la izquierda para generar un "Avatar de Cliente" estratégico.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* ID CARD Header */}
                    <div className="bg-gradient-to-br from-blue-900 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg relative overflow-hidden group text-white">
                        {/* Background Effects */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="bg-white/10 p-2 rounded-lg">
                                        <UserCheck className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-3xl font-bold tracking-tight">{String(profile.avatar_summary?.profile_name || "Cliente Estándar")}</h3>
                                </div>
                                <p className="text-blue-200 font-medium text-lg">{String(profile.avatar_summary?.operational_style || '')}</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-blue-100">
                                        {formData.category || "General"}
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-blue-100">
                                        Ticket: {formData.averageAmount || "N/A"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col items-end">
                                <div className={`px-4 py-2 rounded-xl font-bold uppercase tracking-wide border flex items-center gap-2 ${
                                    String(profile.avatar_summary?.reliability_score || '').includes('Alta') || String(profile.avatar_summary?.reliability_score || '').includes('High')
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                }`}>
                                    {String(profile.avatar_summary?.reliability_score || '').includes('Alta') ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                    Score: {String(profile.avatar_summary?.reliability_score || 'N/A')}
                                </div>
                                <span className="text-[10px] text-blue-300 mt-2 uppercase tracking-widest">Indice de Confianza Olpar</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Analysis Text */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                Análisis Psicométrico
                            </h4>
                            <p className="text-gray-700 leading-relaxed text-sm text-justify">
                                {String(profile.descriptive_analysis || '')}
                            </p>
                        </div>

                        {/* Behavioral Patterns */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-purple-600" />
                                Patrones Detectados
                            </h4>
                            <div className="space-y-3">
                                {profile.behavioral_patterns?.map((pattern: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 transition-colors">
                                        <div className="mt-1.5 w-2 h-2 rounded-full bg-purple-500"></div>
                                        <span className="text-sm text-gray-700 font-medium">{String(pattern)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};