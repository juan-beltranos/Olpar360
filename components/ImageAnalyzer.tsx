import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, X, Loader2, ScanEye } from 'lucide-react';
import { analyzeLocationImage } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

export const ImageAnalyzer: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    // Extract base64 data (remove data:image/xxx;base64, prefix)
    const base64Data = image.split(',')[1];
    const result = await analyzeLocationImage(base64Data, "Analiza esta imagen en busca de pistas de geolocalización. ¿Dónde podría ser esto?");
    setAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 h-full flex flex-col">
        <div>
            <h2 className="text-2xl font-bold text-white mb-2">Análisis Visual de Geolocalización</h2>
            <p className="text-slate-400">Sube una foto de una calle, edificio o paisaje. Gemini Pro Vision analizará estilos arquitectónicos, vegetación, señales y terreno para estimar la ubicación.</p>
        </div>

        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col md:flex-row">
            <div className="md:w-1/2 bg-slate-950 relative flex flex-col">
                {image ? (
                    <div className="relative flex-1 flex items-center justify-center bg-black">
                        <img src={image} alt="Upload" className="max-h-full max-w-full object-contain" />
                        <button 
                            onClick={() => { setImage(null); setAnalysis(null); }}
                            className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500/80 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                ) : (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900 transition-colors border-b md:border-b-0 md:border-r border-slate-800"
                    >
                        <div className="p-4 rounded-full bg-slate-800/50 mb-4">
                            <Upload className="h-8 w-8 text-cyan-500" />
                        </div>
                        <p className="font-medium text-slate-300">Clic para subir imagen</p>
                        <p className="text-xs text-slate-500 mt-2">Soporta JPG, PNG</p>
                    </div>
                )}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                />
                
                {image && (
                    <div className="p-4 border-t border-slate-800">
                        <button 
                            onClick={handleAnalyze}
                            disabled={loading}
                            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <ScanEye className="h-5 w-5" />}
                            <span>{loading ? 'Analizando Visuales...' : 'Iniciar Análisis'}</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="md:w-1/2 flex flex-col h-[300px] md:h-auto">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-slate-400" />
                        Hallazgos Visuales
                    </h3>
                </div>
                <div className="p-6 flex-1 overflow-y-auto text-sm text-slate-300 prose prose-invert">
                    {loading ? (
                        <div className="space-y-3 animate-pulse">
                            <div className="h-2 bg-slate-800 rounded w-3/4"></div>
                            <div className="h-2 bg-slate-800 rounded w-1/2"></div>
                            <div className="h-2 bg-slate-800 rounded w-5/6"></div>
                        </div>
                    ) : analysis ? (
                        <ReactMarkdown>{analysis}</ReactMarkdown>
                    ) : (
                        <p className="text-slate-500 italic">Los resultados del análisis aparecerán aquí...</p>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};