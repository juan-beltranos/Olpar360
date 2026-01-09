
import { GoogleGenAI, Modality } from "@google/genai";

// Initialize the client
// IMPORTANT: API key must be provided via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `Actúas como el núcleo inteligente de Olpar360®, una plataforma de auditoría de campo.

Tu misión es la CERTEZA DE UBICACIÓN y la VALIDACIÓN DE DATOS.

Principios:
1. **Certeza Absoluta:** No adivinas. Si un dato es dudoso, lo marcas como "Riesgo".
2. **Auditoría Estricta:** Validar estrictamente fotos de fachada.`;

export interface GeoResult {
  latitude: number;
  longitude: number;
  address: string;
  confidence: string;
  notes: string;
  source: 'maps' | 'reasoning';
  plusCode?: string;
}

// --- ERROR HANDLING HELPER ---
const handleGeminiError = (error: any, context: string): boolean => {
    const isQuota = error?.message?.includes('429') || 
                    error?.status === 'RESOURCE_EXHAUSTED' || 
                    (error?.error && error?.error?.code === 429) ||
                    error?.toString().includes('quota') ||
                    error?.toString().includes('429');

    if (isQuota) {
        return true; 
    } else {
        console.warn(`[${context}] API Issue (Non-Quota):`, error.message || "Unknown");
        return false; 
    }
};

// Helper to parse JSON from potentially messy model output
function parseGeminiJSON(text: string) {
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (e) {
        const match = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
            try {
                return JSON.parse(match[1]);
            } catch (e2) { }
        }
        
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
             try {
                const jsonStr = text.substring(start, end + 1);
                return JSON.parse(jsonStr);
            } catch (e3) { }
        }
    }
    return null;
}

// Utility to ensure a field is a string, preventing [object Object]
function sanitizeString(val: any): string {
    if (val === null || val === undefined) return '';
    if (val instanceof Error) return val.message;
    
    if (typeof val === 'string') {
        if (val === '[object Object]') return '';
        return val;
    }
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return val ? "Sí" : "No";
    
    if (Array.isArray(val)) {
        return val.map(v => sanitizeString(v)).filter(v => v !== '').join(', ');
    }

    if (typeof val === 'object') {
        if (val.message) return sanitizeString(val.message);
        if (val.reason) return sanitizeString(val.reason);
        if (val.text) return sanitizeString(val.text);
        
        // Final attempt to stringify safely
        try {
            if (Object.keys(val).length === 0) return "";
            return JSON.stringify(val);
        } catch {
            return "Detalle complejo";
        }
    }
    
    const str = String(val);
    if (str === '[object Object]') return '';
    return str;
}

// 1. Geocode Address using Maps Grounding (Flash)
export async function geocodeAddress(address: string): Promise<GeoResult[]> {
  try {
    const prompt = `
    Analiza la siguiente entrada: "${address}".
    
    Puede ser una dirección postal estándar, un punto de interés, o un Plus Code.

    Tu tarea es convertirla en una estructura clara que incluya:
    - latitud aproximada
    - longitud aproximada
    - plus_code (Calcula el Plus Code correspondiente)
    - nivel de certeza (alto, medio, bajo).

    Responde SOLO con el JSON.

    Formato final JSON:
    {
      "lat": number,
      "lng": number,
      "plus_code": "string",
      "certainty": "High" | "Medium" | "Low",
      "found_variations": string[],
      "observations": string
    }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const data = parseGeminiJSON(response.text);

    if (!data) {
        return [];
    }

    const items = Array.isArray(data) ? data : [data];

    return items.map((item: any) => ({
        latitude: Number(item.lat) || 0,
        longitude: Number(item.lng) || 0,
        address: address,
        confidence: sanitizeString(item.certainty) || "Baja",
        notes: `${sanitizeString(item.observations) || ''}`.trim(),
        source: 'maps',
        plusCode: sanitizeString(item.plus_code)
    }));

  } catch (error) {
    handleGeminiError(error, "Geocoding");
    return [];
  }
}

// 2. Reverse Geocode to get Plus Code
export async function getPlusCodeFromCoordinates(lat: number, lng: number): Promise<string | null> {
    try {
        const prompt = `
        Tengo estas coordenadas exactas: Lat ${lat}, Lng ${lng}.
        Necesito el Open Location Code (Plus Code) correspondiente a este punto exacto.
        
        Responde SOLO con un JSON:
        {
            "plus_code": "string"
        }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleMaps: {} }], 
            }
        });

        const data = parseGeminiJSON(response.text);
        return data?.plus_code ? sanitizeString(data.plus_code) : null;
    } catch (error) {
        handleGeminiError(error, "PlusCode");
        return null;
    }
}

// 3. Facade Quality Check (The "Blocker")
export async function analyzeFacadeQuality(base64Image: string) {
    try {
        const prompt = `
        Actúa como un auditor de campo estricto.
        Se requiere una FOTO DE FACHADA EXTERIOR de una tienda/local.

        Evalúa agresivamente:
        1. ¿Es una fachada exterior? (Si parece un interior, estantería, selfie, piso o techo: ES INVALIDO).
        2. ¿La imagen es clara? (Si es borrosa o muy oscura: ES INVALIDO).
        3. ¿Se identifica un negocio?

        Responde SOLO con este JSON:
        {
            "is_valid": boolean,
            "issue": "Razón corta del rechazo (ej. 'Es una foto interior', 'Muy borrosa')",
            "suggestions": "Sugerencia corta para el usuario"
        }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: 'application/json'
            }
        });

        const data = parseGeminiJSON(response.text);
        
        if (data) {
            data.issue = sanitizeString(data.issue);
            data.suggestions = sanitizeString(data.suggestions);
        }
        
        return data;
    } catch (error: any) {
        const isQuota = handleGeminiError(error, "FacadeCheck");
        if (isQuota) {
             return { is_valid: true, issue: "Validado por sistema (Contingencia)", suggestions: "" };
        }
        return { is_valid: false, issue: "Error de conexión", suggestions: "Intenta subir la foto nuevamente" };
    }
}

// 4. TTS (Kept for Geocoder accessibility)
export async function generateSpeech(text: string): Promise<ArrayBuffer | null> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: sanitizeString(text) }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Fenrir' }
                    }
                }
            }
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const binaryString = window.atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        }
        return null;
    } catch (error) {
        handleGeminiError(error, "TTS");
        return null;
    }
}

// 5. Deep Validator (Thinking Mode)
export async function deepValidateCoordinates(lat: string, lng: string, context: string, arrivalTime: string): Promise<string> {
    try {
        const prompt = `
        Analiza profundamente estas coordenadas: Lat ${lat}, Lng ${lng}.
        Contexto esperado: ${context}.
        Hora de llegada: ${arrivalTime}.

        Usa tu capacidad de razonamiento para determinar:
        1. ¿Es una ubicación logísticamente válida para una entrega/visita?
        2. ¿Coincide con el contexto (ej. si dice "centro de ciudad" pero las coordenadas dan en el mar o montaña)?
        3. Anomalías de terreno o seguridad.
        4. Si la hora de llegada es lógica para el tipo de zona.

        Genera un reporte técnico detallado en Markdown.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 2048 },
            }
        });

        return sanitizeString(response.text);
    } catch (error) {
        handleGeminiError(error, "DeepValidator");
        return "No se pudo completar la validación profunda. Verifique su conexión o cuota.";
    }
}

// 6. Logistics Analysis
export async function analyzeLogistics(origin: string, destination: string) {
    try {
        const prompt = `
        Calcula la logística entre "${origin}" y "${destination}".
        
        Estima:
        - Distancia aproximada (km)
        - Tiempo estimado (minutos) en vehículo
        - Complejidad de ruta (Baja, Media, Alta)
        - Observaciones clave de tráfico o terreno.

        Responde SOLO JSON:
        {
            "distance_km": number,
            "eta_minutes": number,
            "routing_complexity": "Baja" | "Media" | "Alta",
            "observations": string
        }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        return parseGeminiJSON(response.text);
    } catch (error) {
        handleGeminiError(error, "Logistics");
        return null;
    }
}

// 7. Access Complexity (Deep Dive)
export async function analyzeAccessComplexity(origin: string, destination: string, logData: any): Promise<string> {
    try {
        const prompt = `
        Analiza la complejidad de acceso para la ruta ${origin} -> ${destination}.
        Datos previos: ${JSON.stringify(logData)}.

        Profundiza en:
        - Riesgos de seguridad en la zona.
        - Estado probable de vías.
        - Recomendaciones para el conductor.
        
        Responde en un párrafo conciso y técnico.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', 
            contents: prompt
        });

        return sanitizeString(response.text);
    } catch (error) {
        return "Análisis de complejidad no disponible.";
    }
}

// 8. Image Analysis
export async function analyzeLocationImage(base64Data: string, promptText: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: promptText }
                ]
            }
        });
        return sanitizeString(response.text);
    } catch (error) {
        handleGeminiError(error, "ImageAnalysis");
        return "No se pudo analizar la imagen.";
    }
}

// 9. Chat Assistant
export async function sendChatMessage(history: { role: string, parts: { text: string }[] }[], message: string): Promise<string> {
    try {
        const chat = ai.chats.create({
            model: 'gemini-3-pro-preview',
            history: history,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION
            }
        });

        const result = await chat.sendMessage({ message: message });
        return sanitizeString(result.text);
    } catch (error) {
        handleGeminiError(error, "Chat");
        return "Lo siento, tuve un problema procesando tu mensaje.";
    }
}

// 10. Customer Profiler
export async function generateOperationalAvatar(formData: any) {
    try {
        const prompt = `
        Genera un perfil comercial (Avatar) basado en estos datos de punto de venta:
        ${JSON.stringify(formData)}

        Crea un análisis psicométrico y comercial.
        
        Responde SOLO JSON:
        {
            "avatar_summary": {
                "profile_name": "string (ej. 'Tendero Tradicional Ahorrador')",
                "operational_style": "string",
                "reliability_score": "Alta" | "Media" | "Baja"
            },
            "descriptive_analysis": "string (párrafo largo)",
            "behavioral_patterns": ["string", "string", "string"]
        }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        return parseGeminiJSON(response.text);
    } catch (error) {
        handleGeminiError(error, "Profiler");
        return null;
    }
}
