
export type AppView = 'prescriptions' | 'expiry' | 'map';

export type LanguageCode = 'en' | 'es' | 'hi' | 'fr' | 'ar' | 'de';

export interface Medicine {
  name: string;
  purpose: string;
  dosage: string;
  timing: string;
  food_relation: string;
  duration: string;
  how_to_use: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface NearbyPlace {
  name: string;
  distance?: string;
  uri?: string;
  lat?: number;
  lng?: number;
}

export interface PrescriptionResponse {
  clean_prescription_text: string;
  medicines: Medicine[];
  doctor_notes: string;
  nearby_pharmacies: NearbyPlace[];
  nearby_hospitals: NearbyPlace[];
  expiry_alerts: string[];
  warnings: string[];
  overall_confidence: string;
}

export interface LocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
}

export interface ExpiryItem {
  id: string;
  name: string;
  date: string;
  status: 'safe' | 'warning' | 'expired';
}
