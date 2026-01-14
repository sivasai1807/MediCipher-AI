
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

export interface PrescriptionResponse {
  clean_prescription_text: string;
  medicines: Medicine[];
  doctor_notes: string;
  nearby_pharmacies: string[];
  nearby_hospitals: string[];
  expiry_alerts: string[];
  warnings: string[];
  overall_confidence: string;
}

export interface LocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
}

export interface ExpiryInput {
  medicineName: string;
  expiryDate: string;
}
