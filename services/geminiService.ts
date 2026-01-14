
import { GoogleGenAI, Type } from "@google/genai";
import { PrescriptionResponse, LanguageCode } from "../types";

const getLanguageName = (code: LanguageCode) => {
  const map: Record<LanguageCode, string> = {
    en: 'English',
    es: 'Spanish',
    hi: 'Hindi',
    fr: 'French',
    ar: 'Arabic',
    de: 'German'
  };
  return map[code];
};

const SYSTEM_INSTRUCTION = `You are a world-class medical deciphering expert. 
Your task is to analyze handwritten prescriptions with 100% precision.

CRITICAL RULES:
1. DETECT CLEARLY: You must be extremely careful with dosages. If something is illegible, mark it as "Unclear".
2. LANGUAGE: You must translate ALL medical fields (purpose, timing, how_to_use, doctor_notes) into the user's requested language.
3. EMERGENCY ONLY WARNINGS: Only populate the 'warnings' array if there is a severe risk (e.g., extremely high dosage, drug interaction, or complete illegibility of a critical field). Otherwise, keep it empty.
4. Correct all spelling errors and expand medical abbreviations (e.g., OD -> Once Daily) into the target language.
5. Use Google Maps grounding to find REAL pharmacies and hospitals nearby.
6. FORMAT: Always respond with a raw JSON object within markdown code blocks (e.g., \`\`\`json ... \`\`\`).`;

export const analyzePrescription = async (
  base64Image: string,
  location: { lat: number | null; lng: number | null },
  language: LanguageCode
): Promise<PrescriptionResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const langName = getLanguageName(language);

  const prompt = `Analyze this prescription.
  TARGET LANGUAGE: ${langName} (Translate all descriptions and notes).
  User Location: ${location.lat}, ${location.lng}.

  Provide a detailed JSON response following this structure:
  {
    "clean_prescription_text": "Full transcribed text in ${langName}",
    "medicines": [{
      "name": "Corrected Med Name",
      "purpose": "Translated purpose",
      "dosage": "Translated dosage",
      "timing": "Translated timing",
      "food_relation": "Translated food relation",
      "duration": "Translated duration",
      "how_to_use": "Simple patient instructions in ${langName}",
      "confidence": "High|Medium|Low"
    }],
    "doctor_notes": "Advice in ${langName}",
    "nearby_pharmacies": [{"name": "Name", "lat": number, "lng": number}],
    "nearby_hospitals": [{"name": "Name", "lat": number, "lng": number}],
    "expiry_alerts": [],
    "warnings": ["ONLY include if emergency risk"],
    "overall_confidence": "e.g. 95%"
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
        // responseMimeType: "application/json" is NOT allowed when using googleMaps tool
        tools: [{ googleMaps: {} }]
      },
    });

    const text = response.text || '';
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : '{}';
    
    return JSON.parse(jsonStr) as PrescriptionResponse;
  } catch (error) {
    console.error("Analysis Error:", error);
    throw new Error("Handwriting analysis failed. Please ensure the image is bright and clear.");
  }
};

export const fetchNearbyHealthCenters = async (
  location: { lat: number; lng: number },
  language: LanguageCode
): Promise<{ pharmacies: any[], hospitals: any[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const langName = getLanguageName(language);
  
  const prompt = `Find all pharmacies and hospitals within 5km of Lat: ${location.lat}, Lng: ${location.lng}. 
  Provide results in ${langName}. 
  Return a JSON object: { "pharmacies": [{"name", "lat", "lng", "distance"}], "hospitals": [{"name", "lat", "lng", "distance"}] }
  Wrap the JSON in \`\`\`json code blocks.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ text: prompt }],
      config: { 
        // responseMimeType: "application/json" is NOT allowed when using googleMaps tool
        tools: [{ googleMaps: {} }]
      }
    });
    
    const text = response.text || '';
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : '{"pharmacies":[], "hospitals":[]}';
    
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Fetch Health Centers Error:", e);
    return { pharmacies: [], hospitals: [] };
  }
};
