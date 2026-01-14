
import { GoogleGenAI, Type } from "@google/genai";
import { PrescriptionResponse } from "../types";

const SYSTEM_INSTRUCTION = `You are an advanced medical AI assistant specializing in handwritten prescription recognition and patient safety.
Your primary goal is to convert messy handwriting into a clean, digital, and patient-friendly format.

RULES:
1. Convert handwriting into neat text.
2. Correct medical spelling errors.
3. Expand abbreviations: OD -> Once a day, BD -> Twice a day, TID -> Three times a day, QID -> Four times a day, HS -> At night, SOS -> Only if needed, AC -> Before food, PC -> After food.
4. Identify medicine, dosage, timing, duration, and purpose.
5. Provide safety warnings for high-risk medications or unclear writing.
6. If handwriting is unreadable, state "Unclear" and set confidence to "Low". Never guess dosage.
7. Use the user's location to suggest real-world nearby hospitals/pharmacies if possible, otherwise list generic well-known types.
8. Check any provided user medicine data for expiry.

OUTPUT JSON FORMAT:
{
  "clean_prescription_text": "string",
  "medicines": [
    {
      "name": "string (Capitalized)",
      "purpose": "string",
      "dosage": "string",
      "timing": "string",
      "food_relation": "string",
      "duration": "string",
      "how_to_use": "string (patient-friendly)",
      "confidence": "High|Medium|Low"
    }
  ],
  "doctor_notes": "string",
  "nearby_pharmacies": ["string"],
  "nearby_hospitals": ["string"],
  "expiry_alerts": ["string"],
  "warnings": ["string"],
  "overall_confidence": "string"
}`;

export const analyzePrescription = async (
  base64Image: string,
  location: { lat: number | null; lng: number | null },
  expiryData: { name: string; date: string }[]
): Promise<PrescriptionResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const expiryContext = expiryData.length > 0 
    ? `The user has provided the following medicine expiry data: ${JSON.stringify(expiryData)}. Current date is ${new Date().toISOString()}.` 
    : "No manual expiry data provided.";

  const locationContext = location.lat 
    ? `User current location: Latitude ${location.lat}, Longitude ${location.lng}.`
    : "Location not available.";

  const prompt = `Analyze this handwritten prescription image. 
  ${locationContext}
  ${expiryContext}
  Please provide a detailed medical analysis in the specified JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: prompt }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clean_prescription_text: { type: Type.STRING },
            medicines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  purpose: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                  timing: { type: Type.STRING },
                  food_relation: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  how_to_use: { type: Type.STRING },
                  confidence: { type: Type.STRING }
                },
                required: ["name", "purpose", "dosage", "timing", "food_relation", "duration", "how_to_use", "confidence"]
              }
            },
            doctor_notes: { type: Type.STRING },
            nearby_pharmacies: { type: Type.ARRAY, items: { type: Type.STRING } },
            nearby_hospitals: { type: Type.ARRAY, items: { type: Type.STRING } },
            expiry_alerts: { type: Type.ARRAY, items: { type: Type.STRING } },
            warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
            overall_confidence: { type: Type.STRING }
          },
          required: ["clean_prescription_text", "medicines", "doctor_notes", "nearby_pharmacies", "nearby_hospitals", "expiry_alerts", "warnings", "overall_confidence"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as PrescriptionResponse;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to analyze the prescription. Please ensure the image is clear.");
  }
};
