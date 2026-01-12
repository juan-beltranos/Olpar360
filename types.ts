
export const IBAGUE_DATA: Record<string, string[]> = {
    "Comuna 1": ["Centro", "La Pola", "Belén", "Interlaken", "San Pedro Alejandrino", "El Libertador", "La Vega", "Pueblo Nuevo", "San Diego", "Santa Cruz", "Augusto E. Medina"],
    "Comuna 2": ["Ancón", "20 de Julio", "Belencito", "Siete de Agosto", "Alaska", "Santa Bárbara", "Malabar", "Clarita Botero", "La Paz", "San Diego", "Trinidad"],
    "Comuna 3": ["San Simón", "La Esperanza", "Viveros", "Antonio Nariño", "Carmenza Rocha", "Belalcázar", "Fenalco", "Inem", "Las Viudas", "Linares"],
    "Comuna 4": ["Piedra Pintada", "Calarcá", "Restrepo", "Gaitán", "El Triunfo", "Pijao", "San Carlos", "Versalles", "Villa Marlen", "Limonar"],
    "Comuna 5": [
        "Jordán 1 Etapa",
        "Jordán 2 Etapa",
        "Jordán 3 Etapa",
        "Jordán 4 Etapa",
        "Jordán 6 Etapa",
        "Jordán 7 Etapa",
        "Jordán 8 Etapa",
        "Jordán 9 Etapa",
        "La Campiña",
        "Prados del Norte",
        "Rincón de Piedra Pintada",
        "Arkacentro",
        "Sorrento",
        "Versalles",
        "Hacienda Piedra Pintada"
    ],
    "Comuna 6": ["Vergel", "Cañaveral", "Entre Ríos", "San Antonio", "Ambalá", "La Gaviota", "Arkambalá", "Ibagué 2000", "Pedregal", "Esperanza", "Delicias"],
    "Comuna 7": ["Salado", "Modelia", "Protecho", "Álamos", "Chicó", "Comfatolima", "Cantabria", "Montecarlo", "Pacandé", "San Sebastián", "Villa Cindy"],
    "Comuna 8": ["Jardín", "Musicalia", "Ciudadela Simón Bolívar", "Nuevo Combeima", "Villa del Sol", "Tulio Varón", "Jardín Santander", "Palermo", "Bochica", "Topacio"],
    "Comuna 9": ["Picaleña", "Mirolindo", "Arboleda del Campestre", "Las Américas", "Villa Café", "San Remo", "Versalles Real", "Pencos", "Santa Rita"],
    "Comuna 10": ["Estadio", "Cádiz", "Montealegre", "La Francia", "Naciones Unidas", "América", "Claret", "Hipódromo", "San Cayetano", "Castilla"],
    "Comuna 11": ["Ferias", "Las Brisas", "Popular", "Independiente", "Refugio", "San Pedro", "Bosque", "Galarza", "Industrial", "Villa María"],
    "Comuna 12": ["Kennedy", "Ricaurte", "Galán", "Yuldaima", "Galarza", "Matallana", "Murillo Toro", "Santander", "Venecia", "Villa Claudia"],
    "Comuna 13": ["Boquerón", "Miramar", "La Isla", "Tejar", "Jazmín", "Dario Echandía", "Granada", "Ricaurte Parte Alta", "Unión"]
};

export interface Coords {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
    isManual?: boolean;
}

export interface FacadeCheck {
    is_valid: boolean;
    issue?: string;
    suggestions?: string;
}

export interface Geo360Record {
    id: string;
    timestamp: string;
    client: {
        clientType: string;
        contactName: string;
        city: string;
        comuna: string;
        neighborhood: string;
        address: string;
        phone: string;
        email: string;
        openTime: string;
        closeTime: string;
        observations: string;
    };
    gps_outside: Coords | null;
    gps_inside: Coords | null;
    drift_meters: number;
    plus_code: string | null;
    ai_validation: {
        facade: boolean;
    };
    images?: {
        facade: string | null;
        interior: string | null;
    };
    auditorId?: string;
    client_validation_status?: 'pending' | 'verified' | 'reported';
}
