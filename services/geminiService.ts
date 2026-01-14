
import { GoogleGenAI, Type } from "@google/genai";
import { PrescriptionResponse, LanguageCode } from "../types";

const getLanguageName = (code: LanguageCode) => {
  const map: Record<LanguageCode, string> = {
    en: 'English',
    es: 'Spanish',
    hi: 'Hindi',
    fr: 'French',
    ar: 'Arabic',
    de: 'German',
    te: 'Telugu',
    zh: 'Chinese',
    ja: 'Japanese',
    pt: 'Portuguese',
    it: 'Italian'
  };
  return map[code];
};

const SYSTEM_INSTRUCTION = `You are an elite Medical AI specialist. Your objective is 100% transcription accuracy.
Decipher doctor handwriting with extreme care.

OPERATIONAL PROTOCOLS:
1. PRECISION: If a dosage or name is ambiguous, mark as "Unclear". Do not guess.
2. NATIVE TRANSLATION: Translate every field (purpose, timing, how_to_use, doctor_notes, clean_prescription_text) into the user's chosen language.
3. EMERGENCY PROTOCOL: Warnings array is strictly for severe risks (lethal dosage, harmful drug combinations, or critical missing info).
4. GROUNDING: Identify REAL nearby pharmacies and hospitals using Google Maps tools.
5. FORMAT: Strictly return JSON inside markdown code blocks.`;

export const analyzePrescription = async (
  base64Image: string,
  location: { lat: number | null; lng: number | null },
  language: LanguageCode
): Promise<PrescriptionResponse> => {
  // Fix: Initializing GoogleGenAI with process.env.API_KEY directly according to documentation.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const langName = getLanguageName(language);

  const prompt = `Task: Analyze this medical prescription image.
  TARGET LANGUAGE: ${langName}.
  USER LOCATION: ${location.lat}, ${location.lng}.

  Return a JSON object with:
  {
    "clean_prescription_text": "Detailed transcription in ${langName}",
    "medicines": [{
      "name": "Corrected Med Name",
      "purpose": "Translated purpose",
      "dosage": "Translated dosage",
      "timing": "Translated timing",
      "food_relation": "Translated food relation",
      "duration": "Translated duration",
      "how_to_use": "Simplified usage instructions in ${langName}",
      "confidence": "High|Medium|Low"
    }],
    "doctor_notes": "Professional summary in ${langName}",
    "nearby_pharmacies": [{"name": "Store Name", "lat": number, "lng": number}],
    "nearby_hospitals": [{"name": "Facility Name", "lat": number, "lng": number}],
    "expiry_alerts": [],
    "warnings": [],
    "overall_confidence": "e.g., 100%"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        { text: prompt }
      ]}],
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleMaps: {} }]
      },
    });

    const text = response.text || '';
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : '{}';
    
    return JSON.parse(jsonStr) as PrescriptionResponse;
  } catch (error) {
    console.error("Analysis Failure:", error);
    throw new Error("Unable to read image. Please retake with better lighting and focus.");
  }
};

export const fetchNearbyHealthCenters = async (
  location: { lat: number; lng: number },
  language: LanguageCode
): Promise<{ pharmacies: any[], hospitals: any[] }> => {
  // Fix: Initializing GoogleGenAI with process.env.API_KEY directly according to documentation.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const langName = getLanguageName(language);
  
  const prompt = `Identify real medical facilities (Pharmacies and Hospitals) within 5km of Lat: ${location.lat}, Lng: ${location.lng}. 
  Provide labels in ${langName}. 
  JSON Output: { "pharmacies": [{"name", "lat", "lng"}], "hospitals": [{"name", "lat", "lng"}] }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ text: prompt }],
      config: { tools: [{ googleMaps: {} }] }
    });
    
    const text = response.text || '';
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : '{"pharmacies":[], "hospitals":[]}';
    
    return JSON.parse(jsonStr);
  } catch (e) {
    return { pharmacies: [], hospitals: [] };
  }
};
