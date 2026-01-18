import { GoogleGenAI, Type, Schema } from "@google/genai";
import { KycResult, RiskLevel } from "../types";

// Schema definition for structured output
const kycResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
    riskScore: { type: Type.NUMBER, description: "A score from 0 to 100. 100 = Fraud/Invalid ID." },
    faceMatchScore: { type: Type.NUMBER, description: "Similarity score (0-100). Tolerant of age/style changes." },
    extractedData: {
      type: Type.OBJECT,
      properties: {
        fullName: { type: Type.STRING },
        documentNumber: { type: Type.STRING },
        dateOfBirth: { type: Type.STRING },
        expiryDate: { type: Type.STRING },
        issuingCountry: { type: Type.STRING },
        documentType: { type: Type.STRING, description: "Detected type: Aadhaar, PAN, Voter ID, Passport, DL, or 'Unknown'" },
      },
      required: ["fullName", "documentNumber", "documentType"]
    },
    fraudChecks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          check: { type: Type.STRING, description: "e.g., 'Document Structure Validity', 'Hologram Check'" },
          passed: { type: Type.BOOLEAN },
          details: { type: Type.STRING }
        }
      }
    },
    reasoning: { type: Type.STRING, description: "Detailed forensic summary of document validity and biometric match." }
  },
  required: ["riskLevel", "riskScore", "faceMatchScore", "extractedData", "fraudChecks", "reasoning"]
};

// Helper to extract mime type from base64 data URL
const getMimeType = (base64: string): string => {
  const match = base64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  return match ? match[1] : 'image/jpeg';
};

// Helper to remove data URL prefix
const getBase64Data = (base64: string): string => {
  return base64.split(',')[1] || base64;
};

export const analyzeKycDocuments = async (
  idImageBase64: string,
  selfieImageBase64: string
): Promise<KycResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const idMimeType = getMimeType(idImageBase64);
  const selfieMimeType = getMimeType(selfieImageBase64);
  
  const cleanId = getBase64Data(idImageBase64);
  const cleanSelfie = getBase64Data(selfieImageBase64);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Upgraded to Pro for advanced reasoning
      contents: {
        parts: [
          {
            text: `You are an expert Forensic Document Examiner and Biometric AI.

            **TASK**: Validate the Identity Document (Input 1) and compare it with the Selfie (Input 2).

            **STEP 1: STRICT DOCUMENT STRUCTURE VALIDATION**
            Analyze Input 1. It MUST be a valid Government ID. 
            Check against strict layout rules for these supported types:
            
            1. **Aadhaar Card (India)**:
               - Must show "Government of India" (भारत सरकार).
               - Look for the National Emblem (Ashoka Pillar).
               - Format: 12-digit number (XXXX XXXX XXXX).
               - Check for "Aadhaar" logo.
            
            2. **PAN Card (India)**:
               - Header: "INCOME TAX DEPARTMENT" (आयकर विभाग).
               - Look for the ITD Hologram/Logo.
               - Format: 10-character alphanumeric (e.g., ABCDE1234F).
            
            3. **Voter ID (India - EPIC)**:
               - Header: "ELECTION COMMISSION OF INDIA".
               - Look for the 10-digit alphanumeric EPIC number.
            
            4. **Passport / Driving License**:
               - Must follow standard International (ICAO) or State layouts.
               - Look for State Emblems and official seals.

            **CRITICAL FAILURE CONDITIONS (Score = 100, Risk = HIGH)**:
            - **Invalid Type**: If the image is a Credit Card, Student ID, Gym Card, or random photo -> **REJECT IMMEDIATELY**.
            - **Bad Structure**: Missing headers, wrong fonts, alignment errors (e.g., name floating outside text fields).
            - **Tampering**: Text looks "pasted on" (digital artifacts), mismatched background noise.

            **STEP 2: BIOMETRIC MATCHING (If Document is Valid)**
            - Compare facial landmarks (eyes, nose, jaw) between ID and Selfie.
            - **Tolerance**: Ignore hair, glasses, makeup, and aging. Focus on bone structure.
            - **Liveness**: Ensure Selfie is NOT a photo of a screen (Moiré patterns) or a printout.

            **OUTPUT INSTRUCTIONS**:
            - If Document is invalid, set 'documentType' to 'Unknown' or 'Invalid', riskLevel to 'High', and riskScore to 100.
            - In 'fraudChecks', explicitly include: "Document Type Validation", "Structure & Layout Check", "Hologram/Emblem Detection".
            
            Return strict JSON.`
          },
          {
            inlineData: {
              mimeType: idMimeType,
              data: cleanId
            }
          },
          {
            inlineData: {
              mimeType: selfieMimeType,
              data: cleanSelfie
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: kycResponseSchema,
        thinkingConfig: {
            thinkingBudget: 2048 // Enable thinking for deeper forensic analysis
        }
      }
    });

    let text = response.text;
    if (!text) throw new Error("No response from AI");

    if (text.startsWith("```")) {
      text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    }

    const rawResult = JSON.parse(text);
    
    // Add client-side metadata
    const result: KycResult = {
        ...rawResult,
        id: crypto.randomUUID(),
        timestamp: Date.now()
    };
    
    return result;

  } catch (error) {
    console.error("KYC Analysis Error:", error);
    throw error;
  }
};